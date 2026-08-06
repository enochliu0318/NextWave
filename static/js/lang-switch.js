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

  if (button) {
    button.addEventListener("click", function () {
      var nextLang = button.getAttribute("data-target-lang") === "en" ? "en" : "zh";
      applyLang(nextLang);
      saveLang(nextLang);
    });
  }
})();