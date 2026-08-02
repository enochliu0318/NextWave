(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var toggleBtn = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");
  if (!header || !toggleBtn || !nav) return;

  var COMPACT_THRESHOLD = 24; // 滚动超过该像素值后进入紧凑态 / 触发自动收起
  var mobileQuery = window.matchMedia("(max-width: 640px)");
  var ticking = false;

  // 标记是否已发生过真实滚动。页面首次加载时即便处于顶部，
  // 也不应被判定为"回到顶部"而自动展开导航——默认必须是收起状态。
  var hasScrolled = false;

  function isMobile() {
    return mobileQuery.matches;
  }

  function setNavOpen(open) {
    header.classList.toggle("is-nav-open", open);
    toggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function applyScrollState() {
    ticking = false;

    if (!isMobile()) {
      header.classList.remove("is-compact");
      return;
    }

    var isPastThreshold = window.scrollY > COMPACT_THRESHOLD;
    header.classList.toggle("is-compact", isPastThreshold);

    // 滚动逻辑：下滑自动收起导航，回到顶部自动展开；
    // 仅在发生过真实滚动后才生效，避免覆盖默认收起状态。
    if (hasScrolled) {
      setNavOpen(!isPastThreshold);
    }
  }

  function requestTick() {
    if (!ticking) {
      window.requestAnimationFrame(applyScrollState);
      ticking = true;
    }
  }

  function onScroll() {
    hasScrolled = true;
    requestTick();
  }

  function onResize() {
    if (!isMobile()) {
      // 切回桌面视口时重置导航开关状态，避免影响移动端下次展示
      setNavOpen(false);
    }
    requestTick();
  }

  function onToggleClick() {
    var willOpen = !header.classList.contains("is-nav-open");
    setNavOpen(willOpen);
  }

  // 点击导航链接后自动收起菜单，避免遮挡下方内容
  function onNavLinkClick(event) {
    if (event.target.closest(".nav-link") && isMobile()) {
      setNavOpen(false);
    }
  }

  toggleBtn.addEventListener("click", onToggleClick);
  nav.addEventListener("click", onNavLinkClick);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);

  // 初始化：仅同步紧凑态（例如页面刷新时滚动位置非顶部），导航保持默认收起
  applyScrollState();
})();