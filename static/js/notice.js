(function () {
  "use strict";

  var STORAGE_KEY = "nextwave-notice-dismissed-version";
  var SHOW_DELAY = 500; // 页面加载后延迟弹出，避免与首屏渲染抢注意力

  var overlay = document.getElementById("notice-overlay");
  if (!overlay) return;

  var confirmBtn = document.getElementById("notice-confirm");
  var version = overlay.getAttribute("data-notice-version") || "";

  function hasBeenDismissed() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === version;
    } catch (e) {
      // 隐私模式等场景下 localStorage 可能不可用，此时每次都弹出，
      // 不影响页面其余功能
      return false;
    }
  }

  function markDismissed() {
    try {
      window.localStorage.setItem(STORAGE_KEY, version);
    } catch (e) {
      /* 忽略写入失败 */
    }
  }

  function openNotice() {
    overlay.classList.add("is-visible");
    overlay.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("notice-open");
    if (confirmBtn) {
      confirmBtn.focus({ preventScroll: true });
    }
  }

  function closeNotice() {
    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("notice-open");
    markDismissed();
  }

  if (!hasBeenDismissed()) {
    window.setTimeout(openNotice, SHOW_DELAY);
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", closeNotice);
  }

  // 点击卡片外的半透明背景区域也可关闭
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      closeNotice();
    }
  });

  // 支持按 Esc 关闭（桌面端）
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && overlay.classList.contains("is-visible")) {
      closeNotice();
    }
  });
})();