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
    if (!picker.contains(event.relatedTarget)) {
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
