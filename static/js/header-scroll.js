(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  if (!header) return;

  var COMPACT_THRESHOLD = 48; // 滚动超过该像素值后进入紧凑态
  var mobileQuery = window.matchMedia("(max-width: 640px)");
  var ticking = false;

  function isMobile() {
    return mobileQuery.matches;
  }

  function applyState() {
    ticking = false;

    // 仅移动端生效，桌面端始终保持展开态
    if (!isMobile()) {
      header.classList.remove("is-compact");
      return;
    }

    if (window.scrollY > COMPACT_THRESHOLD) {
      header.classList.add("is-compact");
    } else {
      header.classList.remove("is-compact");
    }
  }

  function requestTick() {
    if (!ticking) {
      window.requestAnimationFrame(applyState);
      ticking = true;
    }
  }

  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", requestTick);

  // 初始化状态（例如页面刷新时滚动位置非顶部的情况）
  applyState();
})();