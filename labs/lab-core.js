(() => {
  "use strict";

  const esc = value => String(value ?? "").replace(/[&<>\"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;"
  }[char]));

  function shell(root, manifest, { onHome } = {}) {
    root.innerHTML =
      '<section class="lab-screen instant-lab" style="--lab-accent:' + esc(manifest.accent || "#2a8068") + '">' +
        '<nav class="breadcrumbs" aria-label="現在位置"><button class="text-button" type="button" data-lab-home>シミュレーション一覧</button><span>›</span><span>' + esc(manifest.title) + '</span></nav>' +
        '<header class="lab-titlebar"><div><p class="eyebrow">SIMULATION LAB / ' + esc(manifest.unit) + '</p><h1>' + esc(manifest.title) + '</h1><p>' + esc(manifest.summary) + '</p></div><button class="secondary-button lab-back" type="button" data-lab-home>一覧へ戻る</button></header>' +
        '<div class="lab-workspace"><section class="simulation-column" aria-label="シミュレーション"><div class="sim-stage" data-sim-stage></div><div class="sim-readout" data-sim-readout aria-live="polite"></div><div class="sim-actions" data-sim-actions></div></section><aside class="control-panel instant-panel" aria-label="条件操作"><div class="control-heading"><p class="eyebrow">TRY IT</p><h2>条件を変えてみよう</h2><p>動かすと、図と結果がすぐ変わります。</p></div><div data-control-panel></div><section class="trial-panel" aria-labelledby="trialTitle"><div class="trial-heading"><h3 id="trialTitle">くらべた結果</h3><button type="button" data-clear-trials>消す</button></div><div class="trial-list" data-trial-list><p>「この結果をくらべる」で3回分を並べられます。</p></div></section></aside></div>' +
        '<p class="model-note" data-model-note></p></section>';
    const view = root.querySelector(".lab-screen");
    const stage = view.querySelector("[data-sim-stage]");
    const cleanups = [];
    let sceneTimer = 0;
    const sceneObserver = new MutationObserver(() => {
      stage.classList.remove("is-changing");
      void stage.offsetWidth;
      stage.classList.add("is-changing");
      window.clearTimeout(sceneTimer);
      sceneTimer = window.setTimeout(() => stage.classList.remove("is-changing"), 360);
    });
    sceneObserver.observe(stage, { childList: true });
    cleanups.push(() => { sceneObserver.disconnect(); window.clearTimeout(sceneTimer); });
    const on = (target, event, handler, options) => {
      if (!target) return handler;
      target.addEventListener(event, handler, options);
      cleanups.push(() => target.removeEventListener(event, handler, options));
      return handler;
    };
    view.querySelectorAll("[data-lab-home]").forEach(button => on(button, "click", () => onHome && onHome()));
    const challenges = Array.isArray(manifest.challenges) ? manifest.challenges : [];
    if (challenges.length) {
      const mission = document.createElement("section");
      mission.className = "discovery-mission";
      mission.innerHTML = '<div class="mission-heading"><span aria-hidden="true">🔎</span><div><small>はっけんミッション</small><b data-mission-text>' + esc(challenges[0]) + '</b></div></div><div class="mission-dots" role="group" aria-label="ミッションを選ぶ">' +
        challenges.map((item, index) => '<button type="button" aria-pressed="' + (index === 0) + '" data-mission-index="' + index + '">' + (index + 1) + '</button>').join("") + '</div>';
      randomButton.insertAdjacentElement("afterend", mission);
      mission.querySelectorAll("[data-mission-index]").forEach(button => on(button, "click", () => {
        mission.querySelectorAll("[data-mission-index]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
        mission.querySelector("[data-mission-text]").textContent = challenges[Number(button.dataset.missionIndex)];
      }));
    }
    const controlArea = view.querySelector("[data-control-panel]");
    const randomizeRow = row => {
      const range = row.querySelector('input[type="range"]');
      if (range) {
        const min = Number(range.min), max = Number(range.max), step = Number(range.step) || 1;
        const count = Math.floor((max - min) / step) + 1;
        const current = Number(range.value);
        let next = current;
        if (count > 1) {
          for (let attempt = 0; attempt < 5 && next === current; attempt++) {
            next = min + Math.floor(Math.random() * count) * step;
          }
        }
        range.value = String(next);
        range.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }
      const buttons = Array.from(row.querySelectorAll(".instant-options button"));
      if (buttons.length > 1) {
        const current = buttons.find(button => button.getAttribute("aria-pressed") === "true");
        const choices = buttons.filter(button => button !== current);
        choices[Math.floor(Math.random() * choices.length)].click();
        return true;
      }
      return false;
    };
    const randomizeOne = () => {
      const rows = Array.from(controlArea.querySelectorAll(".instant-range, .instant-control"))
        .filter(row => row.querySelector('input[type="range"]') || row.querySelector(".instant-options button"));
      if (rows.length) randomizeRow(rows[Math.floor(Math.random() * rows.length)]);
    };
    const randomizeAll = () => {
      controlArea.querySelectorAll(".instant-range, .instant-control").forEach(randomizeRow);
    };
    const randomButton = document.createElement("button");
    randomButton.type = "button";
    randomButton.className = "random-experiment-button";
    randomButton.textContent = "🎲 条件をシャッフル";
    randomButton.setAttribute("aria-label", "実験の条件をランダムに変える");
    on(randomButton, "click", randomizeAll);
    controlArea.insertAdjacentElement("afterend", randomButton);
    on(stage, "pointerdown", event => {
      const rect = stage.getBoundingClientRect();
      const spark = document.createElement("span");
      spark.className = "stage-touch-spark";
      spark.style.left = (event.clientX - rect.left) + "px";
      spark.style.top = (event.clientY - rect.top) + "px";
      stage.append(spark);
      window.setTimeout(() => spark.remove(), 520);
      randomizeOne();
    });
    const trialList = view.querySelector("[data-trial-list]");
    let trialDraft = null;
    let trials = [];
    const renderTrials = () => {
      trialList.innerHTML = trials.length ? trials.map((trial, index) =>
        '<article><span>' + (trials.length - index) + '</span><div><b>' + esc(trial.condition) + '</b><small>' + esc(trial.result) + '</small></div></article>'
      ).join("") : '<p>「この結果をくらべる」で3回分を並べられます。</p>';
    };
    const makeSnapshot = () => {
      const conditions = [];
      view.querySelectorAll(".range-control").forEach(row => {
        const label = row.querySelector("span");
        const output = row.querySelector("output");
        if (label && output) conditions.push(label.childNodes[0].textContent.trim() + " " + output.textContent.trim());
      });
      view.querySelectorAll(".segmented-control").forEach(row => {
        const label = row.querySelector(":scope > span");
        const selected = row.querySelector('button[aria-pressed="true"]');
        if (label && selected) conditions.push(label.textContent.trim() + " " + selected.textContent.trim());
      });
      const results = Array.from(view.querySelectorAll(".instant-metric")).map(metric => {
        const label = metric.querySelector("span");
        const value = metric.querySelector("b");
        return label && value ? label.textContent.trim() + " " + value.textContent.trim() : "";
      }).filter(Boolean);
      return { condition: conditions.join("・") || "いまの条件", result: results.join("・") || "図の変化を観察" };
    };
    on(view.querySelector("[data-clear-trials]"), "click", () => { trials = []; renderTrials(); });
    return {
      root: view,
      stage,
      readout: view.querySelector("[data-sim-readout]"),
      actions: view.querySelector("[data-sim-actions]"),
      panel: view.querySelector("[data-control-panel]"),
      note: view.querySelector("[data-model-note]"),
      setTrial: trial => { trialDraft = trial; },
      saveTrial: () => {
        const trial = trialDraft || makeSnapshot();
        trials = [trial, ...trials].slice(0, 3);
        renderTrials();
        trialDraft = null;
        return true;
      },
      on: on,
      destroy: () => {
        cleanups.splice(0).forEach(cleanup => cleanup());
        view.remove();
      }
    };
  }

  function section(parent, title, hint) {
    const element = document.createElement("section");
    element.className = "control-section";
    element.innerHTML = "<h3>" + esc(title) + "</h3>" + (hint ? "<p>" + esc(hint) + "</p>" : "");
    parent.append(element);
    return element;
  }

  function range(parent, config) {
    const label = config.label, min = config.min, max = config.max, step = config.step || 1;
    const value = config.value, format = config.format || (value => value), onInput = config.onInput;
    const id = "lab-range-" + Math.random().toString(36).slice(2);
    const row = document.createElement("label");
    row.className = "range-control instant-range";
    row.innerHTML = '<span>' + esc(label) + '<output for="' + id + '">' + esc(format(value)) + '</output></span><input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '">';
    const input = row.querySelector("input");
    const output = row.querySelector("output");
    const update = next => { input.value = next; output.textContent = format(Number(next)); };
    input.addEventListener("input", () => { output.textContent = format(Number(input.value)); if (onInput) onInput(Number(input.value)); });
    parent.append(row);
    return { input, output, set: update, element: row };
  }

  function options(parent, config) {
    const label = config.label, values = config.values, value = config.value;
    const format = config.format || (item => item.label), onChange = config.onChange;
    const wrap = document.createElement("div");
    wrap.className = "segmented-control instant-control";
    wrap.innerHTML = '<span>' + esc(label) + '</span><div>' + values.map(item => {
      const id = item.id !== undefined ? item.id : item;
      return '<button type="button" data-option-value="' + esc(id) + '" aria-pressed="' + (String(id) === String(value)) + '">' + esc(format(item)) + '</button>';
    }).join("") + '</div>';
    wrap.querySelector("div").classList.add("instant-options");
    const buttons = Array.from(wrap.querySelectorAll("button"));
    const set = next => buttons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.optionValue) === String(next)));
    buttons.forEach(button => button.addEventListener("click", () => { set(button.dataset.optionValue); if (onChange) onChange(button.dataset.optionValue); }));
    parent.append(wrap);
    return { set, element: wrap };
  }

  function action(parent, label, onClick, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className || "secondary-button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    parent.append(button);
    return button;
  }

  function presets(parent, items, onSelect) {
    const wrap = section(parent, "プリセット", "まずはここから試してもOK");
    wrap.classList.add("preset-section", "instant-presets");
    const row = document.createElement("div");
    row.className = "preset-buttons";
    items.forEach(item => action(row, item.label, () => onSelect(item.id), "preset-button"));
    wrap.append(row);
    return wrap;
  }

  function renderReadout(target, config) {
    const metrics = config.metrics || [];
    target.innerHTML = '<div class="instant-readout-grid extra-readout-grid">' + metrics.map(metric =>
      '<div class="instant-metric"><span>' + esc(metric.label) + '</span><b>' + esc(metric.value) + '</b>' + (metric.detail ? '<small>' + esc(metric.detail) + '</small>' : '') + '</div>'
    ).join("") + '</div><div class="instant-result"><strong>結果</strong><p>' + esc(config.message || "") + '</p></div>' + (config.note ? '<p class="instant-note">' + esc(config.note) + '</p>' : "");
  }

  function renderError(root, message) {
    root.innerHTML = '<section class="empty-state lab-error"><h1>LABを読み込めませんでした</h1><p>' + esc(message || "画面を更新して、もう一度試してください。") + '</p><button class="primary-button" type="button" data-lab-home>シミュレーション一覧へ</button></section>';
  }

  window.RikaFourLabCore = { esc, shell, section, range, options, action, presets, renderReadout, renderError };
})();
