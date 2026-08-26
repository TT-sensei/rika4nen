(() => {
  "use strict";

  const MANIFESTS = {
    seasons: { id:"seasons", title:"季節と生き物LAB", unit:"季節と生き物", icon:"🌸", summary:"気温を変えて、生き物の成長や活動の変化を見ます。", accent:"#4b8f57", modelNote:"気温と生き物の変化の関係が見えやすいように、季節の変化を単純なモデルで表しています。" },
    body: { id:"body", title:"人の体LAB", unit:"ヒトの体と運動", icon:"💪", summary:"腕の角度を変えて、筋肉と関節の動きを比べます。", accent:"#b45f62", modelNote:"筋肉が縮んだりゆるんだりして骨を引く関係を、腕の模型として表しています。" },
    weather: { id:"weather", title:"天気と気温LAB", unit:"天気と気温", icon:"🌤️", summary:"天気と時刻を変えて、1日の気温の変化を見ます。", accent:"#d28a25", modelNote:"実際の天気は場所や季節でも変わります。ここでは天気と時刻の関係に注目します。" },
    rainwater: { id:"rainwater", title:"雨水LAB", unit:"雨水のゆくえ", icon:"🌧️", summary:"地面の傾きと種類を変えて、水の流れ方を比べます。", accent:"#367ba1", modelNote:"地面の傾き、水の通りやすさ、低い場所への集まり方を単純化しています。" },
    moonstars: { id:"moonstars", title:"月と星LAB", unit:"月と星", icon:"🌙", summary:"時刻や日にちを変えて、月と星の見え方を比べます。", accent:"#665ba7", modelNote:"空の見え方を学ぶため、月や星の位置・形を観察しやすく表しています。" },
    electricity: { id:"electricity", title:"電気LAB", unit:"電気のはたらき", icon:"⚡", summary:"乾電池の数と向きを変えて、モーターの変化を見ます。", accent:"#bd8a12", modelNote:"乾電池の数や向きと、電流・モーターの回り方の関係を単純化しています。" },
    airwater: { id:"airwater", title:"空気と水LAB", unit:"とじこめた空気と水", icon:"💨", summary:"中身と押す強さを変えて、縮み方と手ごたえを比べます。", accent:"#4a91a0", modelNote:"注射器の中身を空気と水に分け、押したときの体積変化を見やすく表しています。" },
    volume: { id:"volume", title:"体積LAB", unit:"ものの温度と体積", icon:"🌡️", summary:"物の種類と温度を変えて、体積の変化を比べます。", accent:"#cf6445", modelNote:"空気・水・金属の温度による体積変化の大きさを、比べやすくしたモデルです。" },
    heating: { id:"heating", title:"あたたまりLAB", unit:"もののあたたまり方", icon:"🔥", summary:"物の種類と熱する強さを変えて、熱の伝わり方を見ます。", accent:"#c94e3c", modelNote:"金属は熱が伝わり、水や空気は動きながら温まる特徴を単純化しています。" },
    waterstate: { id:"waterstate", title:"水のすがたLAB", unit:"水のすがたと温度", icon:"🧊", summary:"温度を変えて、氷・水・水蒸気の変化を見ます。", accent:"#2f78ae", modelNote:"気圧などの条件をそろえたときの、水の状態変化を観察するモデルです。" }
  };
  const UNIT_ORDER = ["seasons","body","weather","rainwater","moonstars","electricity","airwater","volume","heating","waterstate"];
  const loaded = new Map();
  let activeCleanup = null;

  function loadScript(src) {
    if (loaded.has(src)) return loaded.get(src);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
    promise.catch(() => loaded.delete(src));
    loaded.set(src, promise);
    return promise;
  }

  function catalog() {
    const units = window.SCIENCE_UNITS || [];
    const cards = UNIT_ORDER.map(id => {
      const manifest = MANIFESTS[id];
      const unit = units.find(item => item.id === id);
      if (!manifest || !unit) return "";
      return '<button class="lab-card" type="button" data-lab-id="' + manifest.id + '" style="--lab-accent:' + manifest.accent + '">' +
        '<span class="lab-card-icon" aria-hidden="true">' + unit.icon + '</span>' +
        '<span class="lab-card-tag">' + unit.title + '</span>' +
        '<h2>' + manifest.title + '</h2><p>' + manifest.summary + '</p><b>実験を始める →</b></button>';
    }).join("");
    return '<nav class="breadcrumbs" aria-label="現在位置"><button class="text-button" type="button" data-home>単元一覧</button><span>›</span><span>LAB</span></nav>' +
      '<section class="lab-library-hero"><div><p class="eyebrow">SCIENCE LAB</p><h1>条件を変えると、何が変わる？</h1><p>答えを当てる場所ではありません。条件を動かして、現象の変化を見つける実験室です。</p></div></section>' +
      '<section class="lab-library" aria-labelledby="readyLabs"><div class="section-heading"><h2 id="readyLabs">10単元のシミュレーション</h2><p>好きな単元から試そう</p></div><div class="lab-card-grid">' + cards + '</div></section>';
  }

  async function render(route, root, host) {
    if (activeCleanup) { activeCleanup(); activeCleanup = null; }
    if (!route.labId) { root.innerHTML = catalog(); return null; }
    const manifest = MANIFESTS[route.labId];
    if (!manifest) {
      root.innerHTML = '<section class="empty-state"><h1>このLABはまだありません</h1><button class="primary-button" type="button" data-lab-home>一覧へ戻る</button></section>';
      return null;
    }
    root.innerHTML = '<section class="lab-loading"><span class="lab-loading-mark" aria-hidden="true">' + manifest.icon + '</span><h1>' + manifest.title + 'を準備しています</h1><p>このLABに必要な実験道具だけを読み込んでいます。</p></section>';
    if (!window.RikaFourLabCore) await loadScript("labs/lab-core.js");
    if (!window.RikaFourSimulations) await loadScript("labs/fourth-labs.js");
    const factory = window.RikaFourSimulations && window.RikaFourSimulations[manifest.id];
    if (!factory) throw new Error("Simulation factory missing");
    activeCleanup = factory.mount(root, { core: window.RikaFourLabCore, host, manifest }) || null;
    return activeCleanup;
  }

  function leave() {
    if (activeCleanup) { activeCleanup(); activeCleanup = null; }
  }

  window.SCIENCE_UNIT_ORDER = UNIT_ORDER;
  window.RikaLabRouter = { render, catalog, leave, manifests: MANIFESTS };
})();
