(function () {
  "use strict";

  var STORAGE_KEY = "nextwave-theme";
  var TRANSITION_MS = 350;
  var button = document.getElementById("theme-toggle");
  var systemDark = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
  var giscusObserver = null;
  var currentTheme = null; // 记录当前主题，供 giscus 发送时实时读取

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

  // giscus 评论主题是各自独立的 CSS 文件，按当前主题返回对应的 URL
  function getThemeUrl(dark) {
    return window.location.origin + (dark ? "/css/giscus-theme-dark.css" : "/css/giscus-theme.css");
  }

  // 把主题同步给 giscus 的 iframe（若尚未创建则返回 false）
  // 发送时实时读取 currentTheme，确保永远是用户此刻选中的主题
  function sendGiscusTheme() {
    var iframe = document.querySelector("iframe.giscus-frame");
    if (!iframe || !iframe.contentWindow) return false;
    iframe.contentWindow.postMessage(
      { giscus: { setConfig: { theme: getThemeUrl(currentTheme === "dark") } } },
      "https://giscus.app"
    );
    return true;
  }

  // giscus 懒加载，等 iframe 出现并完成 load 后再发送主题设置。
  // 注意：不在创建观察器时捕获主题值，而是等真正发送（load 之后）时
  // 再读取 currentTheme——这样即使先切换主题、后加载评论区，发给 giscus
  // 的也一定是用户此刻选中的最新主题（修复"后加载仍是浅色"的问题）。
  function watchGiscusFrame() {
    var container = document.querySelector(".giscus-section");
    if (!container || giscusObserver) return;
    giscusObserver = new MutationObserver(function () {
      var iframe = document.querySelector("iframe.giscus-frame");
      if (!iframe) return;
      giscusObserver.disconnect();
      giscusObserver = null;
      iframe.addEventListener("load", function () {
        sendGiscusTheme();
      });
    });
    giscusObserver.observe(container, { childList: true, subtree: true });
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

    if (!sendGiscusTheme()) {
      watchGiscusFrame();
    }
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
