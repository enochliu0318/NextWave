(function () {
  "use strict";

  var STORAGE_KEY = "nextwave-lang";
  var button = document.getElementById("lang-switch");

  function getSavedLang() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "zh";
    } catch (e) {
      // 隐私模式等场景下 localStorage 可能不可用，退回中文默认状态，
      // 不影响页面其余功能
      return "zh";
    }
  }

  function saveLang(lang) {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* 忽略写入失败 */
    }
  }

  function applyLang(lang) {
    var isEn = lang === "en";

    // 普通文本内容切换：首次切到英文时，把原始中文缓存到
    // data-i18n-zh 上，之后切回中文时直接读回，不依赖重新渲染
    document.querySelectorAll("[data-i18n-en]").forEach(function (el) {
      if (isEn) {
        if (!el.hasAttribute("data-i18n-zh")) {
          el.setAttribute("data-i18n-zh", el.textContent);
        }
        el.textContent = el.getAttribute("data-i18n-en");
      } else if (el.hasAttribute("data-i18n-zh")) {
        el.textContent = el.getAttribute("data-i18n-zh");
      }
    });

    // 富文本内容切换（如首页/板块简介，可能包含加粗、链接等格式）。
    // 中英文各自是预渲染好的正常 HTML 节点，这里只是切换 hidden
    // 属性显示哪一个，不做任何字符串拼接/转义，最不容易出错
    document.querySelectorAll("[data-i18n-html-container]").forEach(function (container) {
      var zhEl = container.querySelector('[data-i18n-lang="zh"]');
      var enEl = container.querySelector('[data-i18n-lang="en"]');
      if (!enEl) return; // 该内容没有提供英文版本，始终显示中文
      if (zhEl) zhEl.hidden = isEn;
      enEl.hidden = !isEn;
    });

    // aria-label 等属性型文案切换（如汉堡菜单按钮的无障碍标签）
    document.querySelectorAll("[data-i18n-en-label]").forEach(function (el) {
      if (isEn) {
        if (!el.hasAttribute("data-i18n-zh-label")) {
          el.setAttribute("data-i18n-zh-label", el.getAttribute("aria-label") || "");
        }
        el.setAttribute("aria-label", el.getAttribute("data-i18n-en-label"));
      } else if (el.hasAttribute("data-i18n-zh-label")) {
        el.setAttribute("aria-label", el.getAttribute("data-i18n-zh-label"));
      }
    });

    document.documentElement.setAttribute("lang", isEn ? "en" : "zh-CN");

    if (button) {
      button.textContent = isEn ? "中" : "EN";
      button.setAttribute("data-target-lang", isEn ? "zh" : "en");
      button.setAttribute("aria-label", isEn ? "切换到中文" : "切换到英文");
    }
  }

  // 页面加载时按已保存的偏好应用一次
  applyLang(getSavedLang());

  // 应用完成后立即撤销 head.html 中同步脚本加的防闪烁隐藏
  // （若当前偏好是中文，head 脚本本就没有隐藏过页面，这里是无害的空操作）
  document.documentElement.style.visibility = "";
  document.documentElement.removeAttribute("data-lang-init");

  if (button) {
    button.addEventListener("click", function () {
      var nextLang = button.getAttribute("data-target-lang") === "en" ? "en" : "zh";
      applyLang(nextLang);
      saveLang(nextLang);
    });
  }
})();