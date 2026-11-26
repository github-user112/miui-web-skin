/* 网页 MIUI 化 · 内容脚本：读取本机设置，给当前网页套上 MIUI 风格 */
(function () {
  "use strict";

  if (window.__miuiSkinInjected) return;
  window.__miuiSkinInjected = true;

  if (!window.chrome || !chrome.storage || !chrome.storage.local) return;

  var DEFAULTS = {
    skin: "off",
    accent: null,
    radius: null,
    features: { accent: true, radius: true, icons: false, statusbar: true, floating: true }
  };
  var FEATURES = ["accent", "radius", "icons", "statusbar", "floating"];
  var RADIUS_PX = [8, 12, 20, 28];
  var OVERLAY_ID = "miui-web-skin-overlay";
  var timer = null;
  var current = normalize(DEFAULTS);

  function normalize(saved) {
    saved = saved || {};
    var skin = saved.skin;
    var features = saved.features || {};
    var accent = saved.accent;
    var radius = saved.radius;
    var state = {
      skin: skin === "retro" || skin === "flat" || skin === "hyper" ? skin : "off",
      accent: typeof accent === "string" && /^#[0-9a-f]{6}$/i.test(accent) ? accent : null,
      radius: typeof radius === "number" && radius >= 0 && radius < RADIUS_PX.length ? radius : null,
      features: {}
    };
    // 缺失的开关必须回落 DEFAULTS（如 icons 默认关闭），不能一律当 true：
    // 否则旧版/部分写入的 features 对象会把图标贴纸意外打开，破坏站点按钮图标
    FEATURES.forEach(function (k) {
      state.features[k] = features[k] === undefined ? DEFAULTS.features[k] !== false : features[k] !== false;
    });
    return state;
  }

  function clockText() {
    var d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function buildOverlay() {
    var box = document.createElement("div");
    box.id = OVERLAY_ID;
    var bar = document.createElement("div");
    bar.className = "miui-bar__status";
    var time = document.createElement("span");
    time.className = "miui-bar__time";
    time.textContent = clockText();
    var mark = document.createElement("span");
    mark.className = "miui-bar__mark";
    mark.textContent = "MIUI";
    var signal = document.createElement("span");
    signal.className = "miui-bar__signal";
    signal.textContent = "●●● ▰";
    bar.appendChild(time); bar.appendChild(mark); bar.appendChild(signal);

    var badge = document.createElement("div");
    badge.className = "miui-float";
    var b1 = document.createElement("strong");
    b1.textContent = "MIUI 化 ✓";
    var b2 = document.createElement("small");
    b2.textContent = "粉丝自制 · 非官方";
    badge.appendChild(b1); badge.appendChild(b2);

    box.appendChild(bar); box.appendChild(badge);
    (document.body || document.documentElement).appendChild(box);
    return box;
  }

  function ensureOverlay(state) {
    var box = document.getElementById(OVERLAY_ID);
    var enabled = state.skin !== "off";
    if (!enabled) {
      if (box && box.parentNode) box.parentNode.removeChild(box);
      return;
    }
    if (!box) box = buildOverlay();

    var root = document.documentElement;
    root.setAttribute("data-miui-bar", state.features.statusbar ? "on" : "off");
    root.setAttribute("data-miui-float", state.features.floating ? "on" : "off");
    var time = box.querySelector(".miui-bar__time");
    if (time) time.textContent = clockText();
  }

  function apply(state) {
    current = state;
    var root = document.documentElement;
    var style = root.style;

    if (state.skin === "off") {
      root.removeAttribute("data-miui-skin");
      root.removeAttribute("data-miui-bar");
      root.removeAttribute("data-miui-float");
      FEATURES.forEach(function (k) { root.removeAttribute("data-miui-feature-" + k); });
      style.removeProperty("--miui-accent");
      style.removeProperty("--miui-accent-2");
      style.removeProperty("--miui-radius");
    } else {
      root.setAttribute("data-miui-skin", state.skin);
      FEATURES.forEach(function (k) {
        root.setAttribute("data-miui-feature-" + k, state.features[k] ? "on" : "off");
      });
      if (state.accent) {
        style.setProperty("--miui-accent", state.accent);
        style.setProperty("--miui-accent-2", state.accent);
      } else {
        style.removeProperty("--miui-accent");
        style.removeProperty("--miui-accent-2");
      }
      if (state.radius !== null) style.setProperty("--miui-radius", RADIUS_PX[state.radius] + "px");
      else style.removeProperty("--miui-radius");
    }
    ensureOverlay(state);
  }

  chrome.storage.local.get(DEFAULTS, function (saved) { apply(normalize(saved)); });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== "local") return;
    if (!changes.skin && !changes.features && !changes.accent && !changes.radius) return;
    chrome.storage.local.get(DEFAULTS, function (saved) { apply(normalize(saved)); });
  });

  // 站点脚本可能重建 body；定时检查角标是否还在，顺带更新时间
  timer = window.setInterval(function () {
    if (current.skin === "off") return;
    var box = document.getElementById(OVERLAY_ID);
    if (!box || !box.parentNode) ensureOverlay(current);
    else {
      var time = box.querySelector(".miui-bar__time");
      if (time) time.textContent = clockText();
    }
  }, 30000);
})();
