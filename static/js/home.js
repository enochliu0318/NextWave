(function () {
  "use strict";
  var picker = document.getElementById("reading-picker");
  if (!picker) return;
  var trigger = picker.querySelector("summary");
  var openedByHover = false;

  picker.addEventListener("pointerenter", function (event) {
    if (event.pointerType !== "mouse") return;
    if (!picker.open) {
      picker.open = true;
      openedByHover = true;
    }
  });
  picker.addEventListener("pointerleave", function () {
    if (openedByHover && !picker.contains(document.activeElement)) {
      picker.open = false;
      openedByHover = false;
    }
  });
  trigger.addEventListener("click", function (event) {
    // 鼠标悬停已展开时，第一次点击固定展开，避免点击反而收起。
    if (openedByHover) {
      event.preventDefault();
      openedByHover = false;
    }
  });
  picker.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && picker.open) {
      event.preventDefault();
      picker.open = false;
      openedByHover = false;
      trigger.focus();
    }
  });
  picker.addEventListener("focusout", function (event) {
    // iOS WebKit 点击链接时可能不转移焦点，relatedTarget 为 null。
    // 此时不能提前隐藏链接，否则随后的原生 click/跳转可能被取消。
    // 只有焦点明确移到菜单外才收起；未知目标由外部 click 处理。
    if (event.relatedTarget && !picker.contains(event.relatedTarget)) {
      picker.open = false;
      openedByHover = false;
    }
  });
  document.addEventListener("click", function (event) {
    if (!picker.contains(event.target)) {
      picker.open = false;
      openedByHover = false;
    }
  });
})();
