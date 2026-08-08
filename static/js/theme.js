(function () {
  "use strict";

  var STORAGE_KEY = "nextwave-theme";
  var TRANSITION_MS = 350;
  var button = document.getElementById("theme-toggle");
  var systemDark = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
  var currentTheme = null; // 记录当前主题，供 giscus 同步时实时读取
  var giscusTimer = null; // 有界轮询：负责把主题同步给懒加载的 giscus iframe

  function getSaved() {
    try {
      var v = window.localStorage.getItem(STORAGE_KEY);
      return v === "dark" || v === "light" ? v : null;
    } catch (e) {
      // localStorage 不可用（隐私模式等）时退回系统/默认
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* 忽略写入失败 */
    }
  }

  // giscus 评论主题是各自独立的 CSS 文件。
  // 浅色地址直接读 comments 脚本上的 data-theme —— 那是 Hugo 用 absURL 写定的
  // 绝对地址，无论站点部署在哪个域名/路径都能保证正确；深色地址在其基础上
  // 替换文件名即可，不依赖 window.location.origin（后者在本地/子路径访问时不可靠）。
  function getThemeUrl(dark) {
    var el = document.querySelector("script[data-theme]");
    var base = el ? el.getAttribute("data-theme") : null;
    if (base && !dark) return base;
    if (base) return base.replace(/giscus-theme\.css$/, "giscus-theme-dark.css");
    return window.location.origin + (dark ? "/css/giscus-theme-dark.css" : "/css/giscus-theme.css");
  }

  // 把当前主题推送给 giscus 的 iframe（若 iframe 尚不存在则返回 false）
  function pushGiscusTheme() {
    var iframe = document.querySelector("iframe.giscus-frame");
    if (!iframe || !iframe.contentWindow) return false;
    iframe.contentWindow.postMessage(
      { giscus: { setConfig: { theme: getThemeUrl(currentTheme === "dark") } } },
      "https://giscus.app"
    );
    return true;
  }

  // 评论区是懒加载的（data-loading="lazy"），iframe 要等访客滚动到附近才会被
  // giscus 注入；而且 giscus 内部的消息监听也要等它自己初始化完成后才就绪。
  // 为了彻底消除时序问题（尤其"先切到深色、再让评论区加载"的场景），这里用
  // 一个"有界轮询"持续推送当前主题：发送时实时读取 currentTheme，保证无论
  // iframe 何时出现、用户切换过几次，最终同步的永远是用户此刻选中的主题。
  // giscus 对 setConfig 是幂等的：iframe 出现后连发几次相同的主题不会出错，
  // 只会确保它确实被接收并应用，因此可安全地重复发送。
  function startGiscusSync() {
    if (!document.querySelector(".giscus-section")) return; // 本页没有评论区
    if (giscusTimer) return; // 已有轮询在跑，避免叠加；正在进行中的轮询读取的就是
                             // 最新的 currentTheme，无需重启
    var polls = 0; // 空转次数
    var hits = 0;  // 成功推送到 iframe 的次数
    giscusTimer = window.setInterval(function () {
      polls++;
      if (pushGiscusTheme()) {
        hits++;
        // iframe 已出现并连发数次，认为 giscus 已接收，停止本轮
        if (hits >= 6) {
          window.clearInterval(giscusTimer);
          giscusTimer = null;
        }
      } else if (polls > 20) {
        // iframe 一直未出现（例如评论区确实没被触发），结束本轮；
        // 下次 applyTheme（用户再次切换）会重新开启
        window.clearInterval(giscusTimer);
        giscusTimer = null;
      }
    }, 400);
  }

  function applyTheme(theme, animate) {
    var dark = theme === "dark";
    currentTheme = theme;

    if (animate) {
      document.documentElement.classList.add("theme-transition");
      window.setTimeout(function () {
        document.documentElement.classList.remove("theme-transition");
      }, TRANSITION_MS);
    }

    document.documentElement.setAttribute("data-theme", theme);
    if (button) {
      button.setAttribute("aria-label", dark ? "切换到浅色模式" : "切换到深色模式");
    }

    // 立即推一次（若 iframe 已在），并启动有界轮询兜底（若尚未加载/未就绪）
    pushGiscusTheme();
    startGiscusSync();
  }

  // 初始化：优先用已保存的偏好，否则跟随系统，最后回退浅色
  var saved = getSaved();
  var initial = saved || (systemDark && systemDark.matches ? "dark" : "light");
  applyTheme(initial, false);

  if (button) {
    button.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
      var next = current === "dark" ? "light" : "dark";
      applyTheme(next, true);
      saveTheme(next);
    });
  }

  // 用户从未手动保存过偏好时，跟随系统深浅色变化
  if (!saved && systemDark && systemDark.addEventListener) {
    systemDark.addEventListener("change", function (e) {
      applyTheme(e.matches ? "dark" : "light", true);
    });
  }
})();

