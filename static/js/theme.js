(function () {
  "use strict";

  var STORAGE_KEY = "nextwave-theme";
  var TRANSITION_MS = 350;
  var button = document.getElementById("theme-toggle");
  var systemDark = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
  var giscusObserver = null;

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
  function sendGiscusTheme(dark) {
    var iframe = document.querySelector("iframe.giscus-frame");
    if (!iframe || !iframe.contentWindow) return false;
    iframe.contentWindow.postMessage(
      { giscus: { setConfig: { theme: getThemeUrl(dark) } } },
      "https://giscus.app"
    );
    return true;
  }

  // giscus 懒加载，等 iframe 出现并完成 load 后再发送主题设置
  function watchGiscusFrame(dark) {
    var container = document.querySelector(".giscus-section");
    if (!container || giscusObserver) return;
    giscusObserver = new MutationObserver(function () {
      var iframe = document.querySelector("iframe.giscus-frame");
      if (!iframe) return;
      giscusObserver.disconnect();
      giscusObserver = null;
      iframe.addEventListener("load", function () {
        sendGiscusTheme(dark);
      });
    });
    giscusObserver.observe(container, { childList: true, subtree: true });
  }

  function applyTheme(theme, animate) {
    var dark = theme === "dark";

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

    if (!sendGiscusTheme(dark)) {
      watchGiscusFrame(dark);
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
