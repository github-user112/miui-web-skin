/* 网页 MIUI 化 · popup 逻辑：只写 storage.local，内容脚本负责同步到页面 */
(function () {
  "use strict";

  var DEFAULTS = {
    skin: "off",
    accent: null,
    radius: null,
    features: { accent: true, radius: true, icons: false, statusbar: true, floating: true }
  };
  var FEATURES = Object.keys(DEFAULTS.features);
  var RADIUS = [8, 12, 20, 28];
  var statusEl = document.getElementById("status");
  var customColorEl = document.getElementById("customColor");
  var colorTimer = null;
  var state = normalize(DEFAULTS);

  function normalize(saved) {
    saved = saved || {};
    var features = saved.features || {};
    var out = {
      skin: ["retro", "flat", "hyper"].indexOf(saved.skin) >= 0 ? saved.skin : "off",
      accent: typeof saved.accent === "string" && /^#[0-9a-f]{6}$/i.test(saved.accent) ? saved.accent : null,
      radius: typeof saved.radius === "number" && saved.radius >= 0 && saved.radius < RADIUS.length ? saved.radius : null,
      features: {}
    };
    // 同 content.js：缺失的开关回落 DEFAULTS，避免旧版数据把图标贴纸意外打开
    FEATURES.forEach(function (k) {
      out.features[k] = features[k] === undefined ? DEFAULTS.features[k] !== false : features[k] !== false;
    });
    return out;
  }

  function say(text, ok) {
    statusEl.textContent = text;
    statusEl.classList.toggle("ok", !!ok);
  }

  function render() {
    document.querySelectorAll(".theme").forEach(function (btn) {
      var on = btn.dataset.skin === state.skin;
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll(".color:not(.custom)").forEach(function (btn) {
      btn.classList.toggle("on", (btn.dataset.color || "").toLowerCase() === (state.accent || "").toLowerCase());
    });
    document.querySelectorAll(".radius-row button").forEach(function (btn) {
      var v = btn.dataset.radius;
      var on = v === "auto" ? state.radius === null : Number(v) === state.radius;
      btn.classList.toggle("on", on);
    });
    FEATURES.forEach(function (k) {
      var input = document.querySelector('[data-feature="' + k + '"]');
      if (input) input.checked = state.features[k] !== false;
    });
    customColorEl.value = state.accent || "#ff7a2f"; // 与状态同步（含恢复默认后）
  }

  function persist(message) {
    chrome.storage.local.set(state, function () {
      if (chrome.runtime.lastError) {
        say("保存失败：" + chrome.runtime.lastError.message, false);
        return;
      }
      render();
      say(message || "已保存，所有授权网页同步生效。", true);
    });
  }

  function readState() {
    chrome.storage.local.get(DEFAULTS, function (saved) {
      if (chrome.runtime.lastError) {
        say("读取设置失败：" + chrome.runtime.lastError.message, false);
        return;
      }
      state = normalize(saved);
      render();
    });
  }

  document.getElementById("themes").addEventListener("click", function (e) {
    var btn = e.target.closest(".theme");
    if (!btn) return;
    state.skin = btn.dataset.skin;
    persist("已切换到「" + btn.querySelector(".theme-name").textContent + "」，所有授权网页同步生效。");
  });

  document.getElementById("colors").addEventListener("click", function (e) {
    var btn = e.target.closest(".color[data-color]");
    if (!btn) return;
    state.accent = btn.dataset.color;
    persist("强调色已更新：" + state.accent);
  });

  /* 取色器拖动时 input 事件高频触发；每次都落盘会让所有已打开网页反复重建样式。
     改为 150ms 防抖合并写入，change（选择器关闭/确认）时立即落盘。 */
  customColorEl.addEventListener("input", function (e) {
    var v = e.target.value;
    if (!/^#[0-9a-f]{6}$/i.test(v)) return;
    state.accent = v;
    window.clearTimeout(colorTimer);
    colorTimer = window.setTimeout(function () {
      persist("自定义强调色已应用：" + state.accent);
    }, 150);
  });
  customColorEl.addEventListener("change", function (e) {
    var v = e.target.value;
    if (!/^#[0-9a-f]{6}$/i.test(v)) return;
    window.clearTimeout(colorTimer);
    state.accent = v;
    persist("自定义强调色已应用：" + v);
  });

  document.getElementById("radiusRow").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-radius]");
    if (!btn) return;
    state.radius = btn.dataset.radius === "auto" ? null : Number(btn.dataset.radius);
    persist(state.radius === null ? "圆角已恢复为当前主题默认值。" : "圆角已设为 " + RADIUS[state.radius] + "px。");
  });

  document.querySelectorAll("[data-feature]").forEach(function (input) {
    input.addEventListener("change", function () {
      state.features[input.dataset.feature] = input.checked;
      persist("细节设置已保存，授权网页会立即同步。");
    });
  });

  document.getElementById("reset").addEventListener("click", function () {
    state = normalize(DEFAULTS);
    chrome.storage.local.set(state, function () {
      render();
      say("已恢复网页原样。", false);
    });
  });

  chrome.storage.onChanged.addListener(function () { readState(); });
  readState();
})();
