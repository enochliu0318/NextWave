(function () {
  "use strict";

  /* ===== 前端静态搜索 =====
     数据源：构建时由 layouts/index.json 生成的 /index.json，
     包含全部文章的标题、作者、栏目、日期、摘要与纯文本正文。

     两处界面共用同一份索引与匹配逻辑：
       1) 头部搜索框触发的弹层（任意页面可用，↑↓ 选择 + Enter 打开）
       2) /search/ 独立搜索页（带栏目筛选，支持 ?q= 关键词 直达）

     无任何后端与第三方依赖：匹配、排序、高亮全部在浏览器完成。 */

  var INDEX_URL = "/index.json";
  var DEBOUNCE_MS = 180;
  var OVERLAY_LIMIT = 8;   // 弹层最多展示条数，超出时提示“查看全部”
  var PAGE_LIMIT = 30;     // 独立搜索页最多展示条数

  // 动态文案（静态文案由模板 + data/i18n.yaml 负责，这里只处理 JS 生成的文本）
  var I18N = {
    zh: {
      placeholder: "输入关键词搜索文章…",
      overlayPlaceholder: "搜索文章、作者或正文…",
      hint: "输入关键词开始搜索",
      searching: "搜索中…",
      loadFailed: "搜索索引加载失败，请刷新页面重试。",
      noResults: "没有找到与“{q}”相关的内容",
      emptyAfterFilter: "该栏目下没有与“{q}”相关的结果",
      foundMany: "找到 {n} 条与“{q}”相关的结果",
      foundOne: "找到 1 条与“{q}”相关的结果",
      viewAll: "查看全部结果 →",
      openPage: "前往搜索页 →"
    },
    en: {
      placeholder: "Search articles…",
      overlayPlaceholder: "Search titles, authors or full text…",
      hint: "Type keywords to start searching",
      searching: "Searching…",
      loadFailed: "Failed to load the search index. Please refresh.",
      noResults: "No results for “{q}”",
      emptyAfterFilter: "No results in this section for “{q}”",
      foundMany: "{n} results for “{q}”",
      foundOne: "1 result for “{q}”",
      viewAll: "View all results →",
      openPage: "Go to search page →"
    }
  };

  var currentLang = document.documentElement.lang === "en" ? "en" : "zh";
  var indexPromise = null;  // /index.json 只请求一次，弹层与搜索页共用

  /* ---------- 小工具 ---------- */

  function t(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) || I18N.zh[key] || "";
  }

  function format(template, data) {
    return template.replace(/\{(q|n)\}/g, function (_, key) {
      return data[key] != null ? data[key] : "";
    });
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function buildKeywords(query) {
    return String(query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  }

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(INDEX_URL, { credentials: "same-origin" })
        .then(function (res) {
          if (!res.ok) throw new Error("index " + res.status);
          return res.json();
        })
        .catch(function (err) {
          indexPromise = null; // 失败后允许再次尝试
          throw err;
        });
    }
    return indexPromise;
  }

  /* ---------- 匹配与排序 ---------- */

  // 多关键词之间是“与”的关系：每个词都必须命中才算匹配。
  // 命中位置加权排序：标题 > 作者/栏目 > 摘要 > 正文。
  function matchDoc(doc, keywords) {
    var title = (doc.title || "").toLowerCase();
    var author = (doc.author || "").toLowerCase();
    var section = (doc.section || "").toLowerCase();
    var description = (doc.description || "").toLowerCase();
    var text = (doc.text || "").toLowerCase();

    var score = 0;
    for (var i = 0; i < keywords.length; i++) {
      var kw = keywords[i];
      var inTitle = title.indexOf(kw) !== -1;
      var inAuthor = author.indexOf(kw) !== -1;
      var inSection = section.indexOf(kw) !== -1;
      var inDesc = description.indexOf(kw) !== -1;
      // 正文中出现次数也计分（封顶，避免长文刷分）
      var hits = text.split(kw).length - 1;

      if (!inTitle && !inAuthor && !inSection && !inDesc && hits === 0) {
        return null; // 有一个关键词完全未命中，直接淘汰
      }
      if (inTitle) score += 100;
      if (inAuthor) score += 30;
      if (inSection) score += 30;
      if (inDesc) score += 20;
      score += Math.min(hits, 10);
    }
    return score;
  }

  function searchDocs(docs, query) {
    var keywords = buildKeywords(query);
    if (!keywords.length) return [];
    var matched = [];
    for (var i = 0; i < docs.length; i++) {
      var score = matchDoc(docs[i], keywords);
      if (score !== null) matched.push({ doc: docs[i], score: score });
    }
    matched.sort(function (a, b) {
      return b.score - a.score ||
        (b.doc.dateSort || "").localeCompare(a.doc.dateSort || "");
    });
    return matched.map(function (m) { return m.doc; });
  }

  /* ---------- 高亮与摘要 ---------- */

  // 把文本按关键词切分并包上 <mark>，用 DOM API 构建，天然防 XSS
  function highlight(text, keywords) {
    var fragment = document.createDocumentFragment();
    if (!text) return fragment;
    if (!keywords.length) {
      fragment.appendChild(document.createTextNode(text));
      return fragment;
    }
    var re = new RegExp("(" + keywords.map(escapeRegExp).join("|") + ")", "gi");
    var parts = text.split(re);
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      if (i % 2 === 1) {
        var mark = document.createElement("mark");
        mark.textContent = parts[i];
        fragment.appendChild(mark);
      } else {
        fragment.appendChild(document.createTextNode(parts[i]));
      }
    }
    return fragment;
  }

  // 取正文中第一次命中关键词附近的片段做摘要，前后加省略号
  function snippet(text, keywords) {
    if (!text) return "";
    var lower = text.toLowerCase();
    var pos = -1;
    for (var i = 0; i < keywords.length; i++) {
      var at = lower.indexOf(keywords[i]);
      if (at !== -1 && (pos === -1 || at < pos)) pos = at;
    }
    if (pos === -1) pos = 0;
    var start = Math.max(0, pos - 40);
    var end = Math.min(text.length, pos + 120);
    var out = text.slice(start, end);
    if (start > 0) out = "…" + out;
    if (end < text.length) out = out + "…";
    return out;
  }

  // 一条搜索结果：栏目标签 + 标题 + 正文摘要 + 作者/日期
  function createResultItem(doc, keywords) {
    var li = document.createElement("li");
    li.className = "search-result-item";

    var link = document.createElement("a");
    link.className = "search-result-link";
    link.href = doc.url;

    if (doc.section) {
      var badge = document.createElement("span");
      badge.className = "search-result-section";
      badge.textContent = doc.section;
      link.appendChild(badge);
    }

    var title = document.createElement("h3");
    title.className = "search-result-title";
    title.appendChild(highlight(doc.title, keywords));
    link.appendChild(title);

    var body = snippet(doc.text, keywords) || doc.description || "";
    if (body) {
      var para = document.createElement("p");
      para.className = "search-result-snippet";
      para.appendChild(highlight(body, keywords));
      link.appendChild(para);
    }

    var metaParts = [];
    if (doc.author) metaParts.push(doc.author);
    if (doc.date) metaParts.push(doc.date);
    if (metaParts.length) {
      var meta = document.createElement("p");
      meta.className = "search-result-meta";
      meta.textContent = metaParts.join(" · ");
      link.appendChild(meta);
    }

    li.appendChild(link);
    return li;
  }


  /* ---------- 结果列表控制器（弹层与独立页共用） ---------- */

  function createList(opts) {
    var input = opts.input;
    var statusEl = opts.status;
    var resultsEl = opts.results;
    var limit = opts.limit || PAGE_LIMIT;
    var filter = opts.filter || function () { return true; };
    var allLink = opts.allLink || null;
    var allHref = opts.allHref || "";
    var clearBtn = opts.clear || null;
    var placeholderKey = opts.placeholderKey || "placeholder";

    var state = { query: "", matched: [], hits: [], active: -1 };
    var debounceTimer = null;

    function setStatus(text) {
      statusEl.textContent = text || "";
    }

    // 清空按钮只在输入框有内容时出现，避免空着的时候也堆一个无意义的图标
    function syncClear() {
      if (clearBtn) clearBtn.hidden = input.value.length === 0;
    }

    // ↑↓ 移动高亮：越界时循环，便于键盘快速浏览
    function setActive(index) {
      var items = resultsEl.children;
      if (!items.length) { state.active = -1; return; }
      if (index < 0) index = items.length - 1;
      if (index >= items.length) index = 0;
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle("is-active", i === index);
      }
      state.active = index;
      if (items[index].scrollIntoView) {
        items[index].scrollIntoView({ block: "nearest" });
      }
    }

    function clearActive() {
      var items = resultsEl.children;
      for (var i = 0; i < items.length; i++) items[i].classList.remove("is-active");
      state.active = -1;
    }

    // Enter 打开：优先当前高亮项，否则第一条结果
    function activeUrl() {
      if (state.active >= 0 && state.hits[state.active]) return state.hits[state.active].url;
      return state.hits.length ? state.hits[0].url : null;
    }

    // 用当前关键词重画结果（不发请求，语言切换与筛选变化都走这里）
    function paint() {
      var keywords = buildKeywords(state.query);
      var query = state.query.trim();
      resultsEl.textContent = "";
      state.hits = [];
      state.active = -1;

      // 底部「去搜索页」入口常驻（不再只在结果被截断时出现），
      // 有关键词时顺带带上关键词，方便在搜索页看全部结果
      if (allLink) {
        allLink.textContent = query ? t("viewAll") : t("openPage");
        allLink.href = query ? allHref + "?q=" + encodeURIComponent(query) : allHref;
      }

      if (!keywords.length) {
        setStatus(t("hint"));
        return;
      }

      var visible = state.matched.filter(filter).slice(0, limit);
      if (!visible.length) {
        setStatus(format(
          state.matched.length ? t("emptyAfterFilter") : t("noResults"),
          { q: state.query.trim() }
        ));
        return;
      }

      setStatus(format(
        visible.length === 1 ? t("foundOne") : t("foundMany"),
        { q: state.query.trim(), n: visible.length }
      ));

      var fragment = document.createDocumentFragment();
      visible.forEach(function (doc) {
        fragment.appendChild(createResultItem(doc, keywords));
      });
      resultsEl.appendChild(fragment);
      state.hits = visible;
    }

    function run(query) {
      state.query = typeof query === "string" ? query : input.value;
      state.active = -1;
      syncClear();

      if (!buildKeywords(state.query).length) {
        state.matched = [];
        paint();
        return;
      }

      setStatus(t("searching"));
      loadIndex().then(function (docs) {
        state.matched = searchDocs(docs, state.query);
        paint();
      }).catch(function () {
        state.matched = [];
        resultsEl.textContent = "";
        setStatus(t("loadFailed"));
      });
    }

    function setPlaceholder() {
      input.placeholder = t(placeholderKey);
    }

    // 输入防抖 + 键盘导航
    input.addEventListener("input", function () {
      syncClear();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () { run(input.value); }, DEBOUNCE_MS);
    });

    // 清空：一个按钮把输入框与结果重置回初始状态，不用手动删字
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (!input.value) return;
        input.value = "";
        clearTimeout(debounceTimer);
        syncClear();
        input.focus();
        run(""); // 立刻回到引导状态，不等防抖
      });
    }

    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive(state.active + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive(state.active <= 0 ? -1 : state.active - 1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (input.value !== state.query) {
          // 结果还没跟上最新输入：先按当前输入搜索
          clearTimeout(debounceTimer);
          run(input.value);
          return;
        }
        var url = activeUrl();
        if (url) window.location.href = url;
      }
    });

    return {
      input: input,
      state: state,
      run: run,
      paint: paint,
      setActive: setActive,
      clearActive: clearActive,
      setPlaceholder: setPlaceholder,
      syncClear: syncClear
    };
  }

  /* ---------- 弹层（头部搜索框触发） ---------- */

  function initOverlay() {
    var root = document.getElementById("search-overlay");
    if (!root) return null;
    var input = document.getElementById("search-overlay-input");
    var statusEl = document.getElementById("search-overlay-status");
    var resultsEl = document.getElementById("search-overlay-results");
    var allLink = document.getElementById("search-overlay-all");
    if (!input || !statusEl || !resultsEl) return null;

    var list = createList({
      input: input,
      status: statusEl,
      results: resultsEl,
      limit: OVERLAY_LIMIT,
      allLink: allLink,
      allHref: root.getAttribute("data-search-url") || "/search/",
      clear: root.querySelector("[data-search-clear]"),
      placeholderKey: "overlayPlaceholder"
    });

    var lastFocused = null;

    function open(seed) {
      lastFocused = document.activeElement;
      root.hidden = false;
      document.documentElement.classList.add("search-overlay-open");
      if (typeof seed === "string") input.value = seed;
      input.focus();
      if (input.select) input.select();
      list.run(input.value);
    }

    function close() {
      if (root.hidden) return;
      root.hidden = true;
      document.documentElement.classList.remove("search-overlay-open");
      list.clearActive();
      // 关闭后把焦点还给触发它的按钮，键盘用户不会迷失位置
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    // 头部搜索框（桌面、移动端共用同一个按钮）
    document.querySelectorAll("[data-search-open]").forEach(function (btn) {
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        if (root.hidden) open(); else close();
      });
    });

    var closeBtn = root.querySelector("[data-search-close]");
    if (closeBtn) closeBtn.addEventListener("click", close);

    // 点击遮罩空白处关闭
    root.addEventListener("mousedown", function (event) {
      if (event.target === root) close();
    });

    // 全局快捷键：Esc 关闭；未打开时 / 或 Cmd/Ctrl+K 打开
    document.addEventListener("keydown", function (event) {
      if (!root.hidden) {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
        return;
      }
      var target = event.target;
      var typing = target && (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typing) return;

      var key = (event.key || "").toLowerCase();
      var isSlash = key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
      var isCmdK = (event.metaKey || event.ctrlKey) && key === "k";
      if (isSlash || isCmdK) {
        // 首页通知弹窗等其他遮罩层打开时不抢快捷键，避免两层遮罩叠在一起
        if (document.querySelector(".notice-overlay.is-visible")) return;
        event.preventDefault();
        open();
      }
    });

    return { list: list, open: open, close: close };
  }

  /* ---------- /search/ 独立搜索页 ---------- */

  function initPage() {
    var input = document.getElementById("search-input");
    var statusEl = document.getElementById("search-status");
    var resultsEl = document.getElementById("search-results");
    if (!input || !statusEl || !resultsEl) return null;

    var activeSection = "";
    var list = createList({
      input: input,
      status: statusEl,
      results: resultsEl,
      limit: PAGE_LIMIT,
      clear: document.querySelector(".search-page-box [data-search-clear]"),
      filter: function (doc) { return !activeSection || doc.section === activeSection; }
    });

    // 栏目筛选：切换后按当前关键词重新过滤，不再请求索引
    document.querySelectorAll(".search-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        document.querySelectorAll(".search-chip").forEach(function (c) {
          c.classList.toggle("active", c === chip);
        });
        activeSection = chip.getAttribute("data-section") || "";
        list.paint();
      });
    });

    // 支持 /search/?q=关键词 直达（弹层的“查看全部结果”也指向这里）
    var initial = new URLSearchParams(window.location.search).get("q");
    if (initial) {
      input.value = initial;
      list.run(initial);
    } else {
      list.run("");
    }
    return list;
  }

  /* ---------- 启动 ---------- */

  var lists = [];
  var overlay = initOverlay();
  var pageList = initPage();
  if (overlay) lists.push(overlay.list);
  if (pageList) lists.push(pageList);
  if (!lists.length) return; // 页面没有搜索界面（例如关闭了 enableSearch）

  lists.forEach(function (l) { l.setPlaceholder(); });

  // 导航栏 EN/中 按钮会更新 <html lang>，这里监听并同步搜索文案
  new MutationObserver(function () {
    var lang = document.documentElement.lang === "en" ? "en" : "zh";
    if (lang === currentLang) return;
    currentLang = lang;
    lists.forEach(function (l) {
      l.setPlaceholder();
      l.paint(); // 用同一批匹配结果重画，只更新文案
    });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
})();
