(() => {
  "use strict";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const one = (value, digits = 0) => Number(value).toFixed(digits);
  const svgEsc = value => String(value).replace(/[&<>"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[char]));
  const option = (id, label) => ({ id, label });

  function mountInstant(root, { core, host, manifest, create }) {
    const view = core.shell(root, manifest, { onHome: () => host.routeTo("lab") });
    view.note.textContent = manifest.modelNote || "";
    const model = create(view, core);
    core.action(view.actions, "リセット", () => model.reset());
    core.action(view.actions, "1つ進める", () => model.step());
    model.render();
    return () => {
      model.destroy && model.destroy();
      view.destroy();
    };
  }

  function seasons(view, core) {
    const state = { temp: 18, target: "plant" };
    const section = core.section(view.panel, "気温を変える", "季節の変化を想像して動かそう。");
    const temp = core.range(section, { label: "気温", min: 5, max: 30, value: state.temp, format: value => value + "℃", onInput: value => { state.temp = value; draw(); } });
    const target = core.options(section, { label: "見る生き物", values: [option("plant", "植物"), option("animal", "動物")], value: state.target, format: item => item.label, onChange: value => { state.target = value; draw(); } });
    core.presets(view.panel, [
      { id: "spring", label: "春 15℃" },
      { id: "summer", label: "夏 28℃" },
      { id: "autumn", label: "秋 18℃" },
      { id: "winter", label: "冬 7℃" }
    ], id => {
      state.temp = { spring:15, summer:28, autumn:18, winter:7 }[id];
      temp.set(state.temp);
      draw();
    });
    function draw() {
      const growth = clamp((state.temp - 5) / 25, 0, 1);
      const leaves = Math.round(2 + growth * 10);
      const activity = Math.round(1 + growth * 9);
      const leafMarks = Array.from({ length: leaves }, (_, i) => {
        const x = 306 + (i % 2) * 52 + Math.floor(i / 2) * 3;
        const y = 265 - Math.floor(i / 2) * 23 - (i % 2) * 5;
        return '<ellipse cx="' + x + '" cy="' + y + '" rx="28" ry="14" transform="rotate(' + (i % 2 ? 25 : -25) + ' ' + x + ' ' + y + ')" fill="' + (state.temp > 10 ? "#65a865" : "#9baf70") + '"/>';
      }).join("");
      const bugs = state.target === "animal" ? Array.from({ length: Math.max(1, Math.round(activity / 2)) }, (_, i) =>
        '<circle cx="' + (170 + i * 54) + '" cy="' + (280 - (i % 2) * 30) + '" r="8" fill="#df8c3e"/><circle cx="' + (164 + i * 54) + '" cy="' + (275 - (i % 2) * 30) + '" r="5" fill="#855b51"/><circle cx="' + (176 + i * 54) + '" cy="' + (275 - (i % 2) * 30) + '" r="5" fill="#855b51"/>'
      ).join("") : "";
      const flower = growth > .45 ? '<circle cx="360" cy="205" r="12" fill="#e993a5"/><circle cx="380" cy="210" r="10" fill="#e993a5"/><circle cx="370" cy="198" r="10" fill="#e993a5"/><circle cx="370" cy="210" r="5" fill="#f2c34f"/>' : "";
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="気温と生き物のようすのシミュレーション">' +
          '<rect width="640" height="360" fill="#eaf6ee"/><circle cx="540" cy="70" r="' + (24 + growth * 9) + '" fill="#f5c94e"/>' +
          '<path d="M0 295 Q160 260 320 292 T640 280 V360 H0Z" fill="#b9d994"/>' +
          '<text x="28" y="42" class="scene-title">気温が変わると、ようすは？</text>' +
          '<text x="30" y="82" class="scene-caption">気温 ' + state.temp + '℃</text>' +
          '<rect x="120" y="235" width="22" height="70" rx="11" fill="#8f6948"/><path d="M131 240 Q180 165 245 225 Q275 150 330 225 Q390 155 420 230" fill="none" stroke="#4e8d58" stroke-width="12" stroke-linecap="round"/>' +
          leafMarks + flower + bugs +
          '<text x="105" y="333" class="scene-caption">' + (state.target === "plant" ? "葉・花の成長" : "動物の活動") + '</text>' +
          '<rect x="470" y="250" width="115" height="18" rx="9" fill="#d6e5dc"/><rect x="470" y="250" width="' + (115 * growth) + '" height="18" rx="9" fill="#4b8f57"/><text x="470" y="292" class="component-label">ようすの変化</text>' +
        '</svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "気温", value: state.temp + "℃", detail: state.temp < 10 ? "寒い時期" : state.temp > 23 ? "暖かい時期" : "中間の時期" },
          { label: state.target === "plant" ? "葉・花" : "活動", value: (state.target === "plant" ? leaves + "枚ほど" : activity + " / 10"), detail: "モデルの目安" }
        ],
        message: state.temp > 20 ? "気温が高くなると、成長や活動がさかんになるようすが見えるね。" : "気温を上げたとき、どの変化が大きくなったか比べてみよう。"
      });
    }
    return {
      render: draw,
      reset: () => { state.temp = 18; state.target = "plant"; temp.set(state.temp); target.set(state.target); draw(); },
      step: () => { state.temp = state.temp >= 28 ? 7 : state.temp + 5; temp.set(state.temp); draw(); }
    };
  }

  function body(view, core) {
    const state = { angle: 75 };
    const section = core.section(view.panel, "腕の角度を変える", "ゆっくり曲げ伸ばしして、筋肉の変化を見よう。");
    const angle = core.range(section, { label: "ひじの角度", min: 0, max: 120, value: state.angle, format: value => value + "°", onInput: value => { state.angle = value; draw(); } });
    function draw() {
      const upper = clamp((state.angle + 10) / 130, 0, 1);
      const lower = 1 - upper;
      const rad = (Math.PI / 180) * (180 - state.angle);
      const elbowX = 360, elbowY = 210;
      const handX = elbowX + Math.cos(rad) * 112;
      const handY = elbowY + Math.sin(rad) * 112;
      const upperWidth = 8 + upper * 12;
      const lowerWidth = 8 + lower * 12;
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="腕の角度と筋肉の変化のシミュレーション">' +
          '<rect width="640" height="360" fill="#fbf0f1"/><text x="28" y="42" class="scene-title">曲げると、筋肉はどうなる？</text>' +
          '<circle cx="245" cy="100" r="38" fill="#f0c2ac" stroke="#ae7370" stroke-width="4"/><path d="M245 140 L245 240 M245 165 L185 220 M245 165 L300 220 M245 240 L205 315 M245 240 L290 315" fill="none" stroke="#ad6b72" stroke-width="17" stroke-linecap="round"/>' +
          '<path d="M245 160 L360 210" fill="none" stroke="#f0c2ac" stroke-width="' + (28 + upperWidth) + '" stroke-linecap="round"/><path d="M360 210 L' + handX + ' ' + handY + '" fill="none" stroke="#f0c2ac" stroke-width="' + (24 + lowerWidth) + '" stroke-linecap="round"/>' +
          '<path d="M250 160 L360 210" fill="none" stroke="#bd5e6b" stroke-width="' + upperWidth + '" stroke-linecap="round"/><path d="M360 210 L' + handX + ' ' + handY + '" fill="none" stroke="#6e94af" stroke-width="' + lowerWidth + '" stroke-linecap="round"/>' +
          '<circle cx="360" cy="210" r="13" fill="#e6b95b" stroke="#7b6540" stroke-width="3"/><circle cx="' + handX + '" cy="' + handY + '" r="10" fill="#f0c2ac" stroke="#ae7370" stroke-width="3"/>' +
          '<text x="113" y="337" class="scene-caption">上側の筋肉 ' + Math.round(upper * 100) + '%</text><text x="402" y="337" class="scene-caption">下側の筋肉 ' + Math.round(lower * 100) + '%</text>' +
          '<path d="M360 185 A27 27 0 0 1 ' + (360 + Math.cos(rad) * 30) + ' ' + (210 + Math.sin(rad) * 30) + '" fill="none" stroke="#7d7270" stroke-width="2"/>' +
        '</svg>';
      const upperText = upper > lower ? "縮んでかたくなりやすい" : "ゆるみやすい";
      const lowerText = lower > upper ? "縮んでかたくなりやすい" : "ゆるみやすい";
      core.renderReadout(view.readout, {
        metrics: [
          { label: "上側の筋肉", value: upperText, detail: Math.round(upper * 100) + " / 100" },
          { label: "下側の筋肉", value: lowerText, detail: Math.round(lower * 100) + " / 100" }
        ],
        message: "一方の筋肉が縮むと、反対側はゆるみ、骨を引いて腕を動かします。"
      });
    }
    return {
      render: draw,
      reset: () => { state.angle = 75; angle.set(state.angle); draw(); },
      step: () => { state.angle = state.angle >= 120 ? 0 : state.angle + 30; angle.set(state.angle); draw(); }
    };
  }

  function weather(view, core) {
    const state = { weather: "sunny", time: 12 };
    const section = core.section(view.panel, "天気と時刻を変える", "同じ時刻でも天気で気温の変化が違うね。");
    const weatherControl = core.options(section, { label: "天気", values: [option("sunny", "晴れ"), option("cloudy", "くもり"), option("rain", "雨")], value: state.weather, format: item => item.label, onChange: value => { state.weather = value; draw(); } });
    const time = core.range(section, { label: "時刻", min: 6, max: 18, value: state.time, format: value => value + "時", onInput: value => { state.time = value; draw(); } });
    function draw() {
      const ratio = (state.time - 6) / 12;
      const base = { sunny: 13, cloudy: 14, rain: 13 }[state.weather];
      const amplitude = { sunny: 12, cloudy: 6, rain: 3 }[state.weather];
      const temperature = Math.round((base + Math.sin(Math.PI * ratio) * amplitude) * 10) / 10;
      const sky = state.weather === "sunny" ? '<circle cx="520" cy="88" r="37" fill="#f4c94d"/>' :
        state.weather === "cloudy" ? '<g fill="#b5c7ce"><circle cx="500" cy="100" r="30"/><circle cx="540" cy="92" r="38"/><circle cx="580" cy="105" r="27"/></g>' :
        '<g fill="#8ba9bd"><circle cx="500" cy="95" r="29"/><circle cx="540" cy="88" r="37"/><circle cx="580" cy="100" r="25"/></g><g stroke="#4b89a4" stroke-width="4">' + [0,1,2,3,4].map(i => '<line x1="' + (495 + i * 21) + '" y1="135" x2="' + (485 + i * 21) + '" y2="162"/>').join("") + '</g>';
      const curveHeight = (temperature - 10) * 5;
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="天気と気温のシミュレーション">' +
          '<rect width="640" height="360" fill="#edf7fb"/><rect y="245" width="640" height="115" fill="#c5dfb0"/><text x="28" y="42" class="scene-title">天気と気温の変化</text>' + sky +
          '<text x="30" y="82" class="scene-caption">' + state.time + '時ごろのようす</text><path d="M95 275 C180 ' + (275 - curveHeight) + ' 300 ' + (275 - curveHeight * 1.5) + ' 385 ' + (275 - curveHeight * 1.2) + ' S520 235 590 260" fill="none" stroke="#d28a25" stroke-width="5"/>' +
          '<circle cx="385" cy="' + (275 - curveHeight * 1.2) + '" r="8" fill="#d28a25"/><line x1="95" y1="290" x2="590" y2="290" stroke="#9ab3b0" stroke-width="2"/><text x="95" y="320" class="component-label">朝</text><text x="365" y="320" class="component-label">昼すぎ</text><text x="550" y="320" class="component-label">夕方</text>' +
          '<rect x="475" y="185" width="110" height="23" rx="11" fill="#e0eaec"/><rect x="475" y="185" width="' + clamp((temperature - 10) * 6, 4, 110) + '" height="23" rx="11" fill="#d28a25"/><text x="476" y="175" class="component-label">気温 ' + temperature + '℃</text>' +
        '</svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "天気", value: { sunny:"晴れ", cloudy:"くもり", rain:"雨" }[state.weather], detail: "条件" },
          { label: "気温", value: temperature + "℃", detail: state.weather === "sunny" ? "変化が大きめ" : "変化が小さめ" }
        ],
        message: state.weather === "sunny" ? "晴れの日は、昼すぎまで気温が上がり、その後下がる変化が見えやすいね。" : "雲や雨の日は、晴れの日より1日の気温変化が小さくなりやすいね。"
      });
    }
    return {
      render: draw,
      reset: () => { state.weather = "sunny"; state.time = 12; weatherControl.set(state.weather); time.set(state.time); draw(); },
      step: () => { state.time = state.time >= 18 ? 6 : state.time + 2; time.set(state.time); draw(); }
    };
  }

  function rainwater(view, core) {
    const state = { slope: 55, ground: "sand" };
    const section = core.section(view.panel, "地面の条件を変える", "高低と土の種類を変えて、水のゆくえを見よう。");
    const slope = core.range(section, { label: "地面の傾き", min: 0, max: 100, value: state.slope, format: value => value + "%", onInput: value => { state.slope = value; draw(); } });
    const ground = core.options(section, { label: "地面", values: [option("sand", "砂"), option("soil", "細かい土"), option("concrete", "コンクリート")], value: state.ground, format: item => item.label, onChange: value => { state.ground = value; draw(); } });
    function draw() {
      const infiltration = { sand: 88, soil: 54, concrete: 6 }[state.ground];
      const speed = Math.round(10 + state.slope * .65);
      const waterWidth = 70 + state.slope * 2.5;
      const dots = Array.from({ length: Math.max(2, Math.round(infiltration / 15)) }, (_, i) => '<circle cx="' + (205 + i * 30) + '" cy="' + (294 + (i % 2) * 17) + '" r="5" fill="#4b94ae" opacity="' + (infiltration / 100) + '"/>').join("");
      const arrows = state.slope > 10 ? '<path d="M165 170 Q300 ' + (210 - state.slope * .35) + ' 495 250" fill="none" stroke="#4b94ae" stroke-width="8" stroke-linecap="round" stroke-dasharray="13 12"/><path d="M480 238 l25 12 -23 14" fill="none" stroke="#4b94ae" stroke-width="7"/>' : '<circle cx="365" cy="235" r="17" fill="#7db6c0"/>';
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="雨水の流れとしみこみのシミュレーション">' +
          '<rect width="640" height="360" fill="#edf6fa"/><text x="28" y="42" class="scene-title">雨水はどこへ行く？</text><text x="30" y="78" class="scene-caption">傾き ' + state.slope + '%　' + ({sand:"砂",soil:"細かい土",concrete:"コンクリート"}[state.ground]) + '</text>' +
          '<path d="M70 280 Q260 ' + (260 - state.slope * .35) + ' 550 ' + (280 - state.slope * .7) + ' L640 360 H0Z" fill="' + ({sand:"#d7c08c",soil:"#a98d72",concrete:"#aeb9bc"}[state.ground]) + '"/>' +
          '<path d="M105 281 Q260 ' + (261 - state.slope * .35) + ' 550 ' + (281 - state.slope * .7) + '" fill="none" stroke="#75624e" stroke-width="3"/>' + arrows + dots +
          '<path d="M520 297 Q570 286 610 300 Q578 339 530 322Z" fill="#80bfd1" opacity="' + (state.slope > 30 ? .95 : .35) + '"/><text x="486" y="343" class="component-label">低い場所に集まる</text>' +
          '<text x="95" y="145" class="component-label">雨</text><path d="M105 155 l-8 24 M125 155 l-8 24 M145 155 l-8 24" stroke="#4b94ae" stroke-width="4"/>' +
        '</svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "流れる速さ", value: speed + " / 75", detail: state.slope < 10 ? "ほぼ流れない" : "傾きで変化" },
          { label: "しみこみ", value: infiltration + "%", detail: state.ground === "sand" ? "すき間が大きい" : state.ground === "concrete" ? "ほぼ通さない" : "土のすき間" }
        ],
        message: state.ground === "concrete" ? "水はしみこみにくく、低い場所へ流れて水たまりになりやすいね。" : "地面の傾きで水が流れ、土のすき間からもしみこんでいくね。"
      });
    }
    return {
      render: draw,
      reset: () => { state.slope = 55; state.ground = "sand"; slope.set(state.slope); ground.set(state.ground); draw(); },
      step: () => { state.slope = state.slope >= 100 ? 0 : state.slope + 20; slope.set(state.slope); draw(); }
    };
  }

  function moonstars(view, core) {
    const state = { time: 20, day: 15, target: "moon" };
    const section = core.section(view.panel, "時刻・日にちを変える", "同じ夜の動きと、日にちによる月の形を比べよう。");
    const target = core.options(section, { label: "見るもの", values: [option("moon", "月"), option("stars", "星")], value: state.target, format: item => item.label, onChange: value => { state.target = value; draw(); } });
    const time = core.range(section, { label: "時刻", min: 18, max: 24, value: state.time, format: value => value + "時", onInput: value => { state.time = value; draw(); } });
    const day = core.range(section, { label: "日にち", min: 1, max: 30, value: state.day, format: value => value + "日", onInput: value => { state.day = value; draw(); } });
    function draw() {
      const phaseIndex = Math.round((state.day % 30) / 30 * 8) % 8;
      const phaseNames = ["新月", "細い月", "上弦の月", "ふくらむ月", "満月", "欠ける月", "下弦の月", "細い月"];
      const phase = phaseNames[phaseIndex];
      const x = 150 + ((state.time - 18) / 6) * 330;
      const y = 225 - Math.sin(((state.time - 18) / 6) * Math.PI) * 95;
      const stars = Array.from({ length: 18 }, (_, i) => '<circle cx="' + (55 + (i * 83) % 530) + '" cy="' + (100 + (i * 47) % 130) + '" r="' + (i % 3 + 2) + '" fill="#dce8ff" opacity="' + (.35 + (i % 4) * .12) + '"/>').join("");
      const moon = '<circle cx="' + x + '" cy="' + y + '" r="35" fill="#f2e8b2"/><circle cx="' + (x + (phaseIndex - 4) * 10) + '" cy="' + y + '" r="35" fill="#16264d"/>';
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="月と星の見え方のシミュレーション">' +
          '<rect width="640" height="360" fill="#17264c"/>' + stars + '<circle cx="545" cy="66" r="28" fill="#f5cb57"/><text x="28" y="42" fill="#eef4ff" class="scene-title">空の見え方を動かそう</text>' +
          '<path d="M90 280 Q320 90 570 280" fill="none" stroke="#6677a8" stroke-width="2" stroke-dasharray="7 8"/>' +
          (state.target === "moon" ? moon + '<text x="28" y="82" fill="#dce8ff" class="scene-caption">月の形：' + phase + '</text>' : '<text x="28" y="82" fill="#dce8ff" class="scene-caption">星座は並び方を保って動いて見える</text>') +
          '<text x="255" y="328" fill="#dce8ff" class="component-label">東</text><text x="480" y="328" fill="#dce8ff" class="component-label">西</text>' +
        '</svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "見える位置", value: Math.round(x) < 320 ? "東より" : "西より", detail: state.time + "時" },
          { label: state.target === "moon" ? "月の形" : "星の見え方", value: state.target === "moon" ? phase : "並び方はほぼ同じ", detail: state.target === "moon" ? state.day + "日のモデル" : "時間で位置が変化" }
        ],
        message: state.target === "moon" ? "同じ夜は位置が変わり、日にちを変えると見える形が変わるね。" : "星は時間とともに動いて見えるけれど、星の並び方はほぼ変わらないね。"
      });
    }
    return {
      render: draw,
      reset: () => { state.time = 20; state.day = 15; state.target = "moon"; time.set(state.time); day.set(state.day); target.set(state.target); draw(); },
      step: () => { state.time = state.time >= 24 ? 18 : state.time + 1; time.set(state.time); draw(); }
    };
  }

  function electricity(view, core) {
    const state = { batteries: 1, direction: "normal" };
    const section = core.section(view.panel, "回路の条件を変える", "乾電池の数と向きを変えて、モーターを見よう。");
    const batteries = core.range(section, { label: "乾電池の数", min: 1, max: 3, value: state.batteries, format: value => value + "個", onInput: value => { state.batteries = value; draw(); } });
    const direction = core.options(section, { label: "つなぐ向き", values: [option("normal", "同じ向き"), option("reverse", "1個を逆向き")], value: state.direction, format: item => item.label, onChange: value => { state.direction = value; draw(); } });
    function draw() {
      const effective = state.direction === "reverse" && state.batteries > 1 ? state.batteries - 2 : state.batteries;
      const speed = Math.max(0, effective) * 35;
      const cells = Array.from({ length: state.batteries }, (_, i) => '<g transform="translate(' + (90 + i * 90) + ' 210)"><rect x="0" y="0" width="58" height="82" rx="8" fill="#f5d979" stroke="#9a7726" stroke-width="3"/><line x1="29" y1="-9" x2="29" y2="0" stroke="#9a7726" stroke-width="4"/><line x1="29" y1="82" x2="29" y2="91" stroke="#9a7726" stroke-width="4"/><text x="20" y="32" class="component-label">+</text><text x="22" y="65" class="component-label">−</text></g>').join("");
      const dots = Array.from({ length: Math.max(2, Math.round(effective * 2 + 1)) }, (_, i) => '<circle cx="' + (300 + i * 23) + '" cy="92" r="6" fill="#f3bf46"/><circle cx="' + (300 + i * 23) + '" cy="92" r="2" fill="#fff7c8"/>').join("");
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="乾電池とモーターのシミュレーション">' +
          '<rect width="640" height="360" fill="#f7f5e9"/><text x="28" y="42" class="scene-title">乾電池でモーターを動かそう</text><path d="M70 90 H570 V200 H70 Z" fill="none" stroke="#5f807b" stroke-width="5" stroke-linejoin="round"/>' + dots + cells +
          '<circle cx="510" cy="145" r="48" fill="#e7ece6" stroke="#6c837d" stroke-width="5"/><path d="M510 145 l35 -15 l-20 25 l20 18 l-35 -10" fill="#bd8a12"/><text x="470" y="225" class="component-label">モーター</text>' +
          '<text x="75" y="185" class="component-label">乾電池</text><text x="75" y="315" class="scene-caption">電流の強さ：' + speed + ' / 105</text>' +
        '</svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "乾電池", value: state.batteries + "個", detail: state.direction === "reverse" ? "逆向きを含む" : "同じ向き" },
          { label: "モーター", value: effective <= 0 ? "止まる" : speed + " / 105", detail: effective <= 0 ? "電流の向きが打ち消し合う" : "回転の強さの目安" }
        ],
        message: effective <= 0 ? "乾電池の向きが逆になると、電流の働きが弱くなったり打ち消し合ったりするね。" : "乾電池の数を増やすと、モーターの回り方が強くなるモデルだね。"
      });
    }
    return {
      render: draw,
      reset: () => { state.batteries = 1; state.direction = "normal"; batteries.set(state.batteries); direction.set(state.direction); draw(); },
      step: () => { state.batteries = state.batteries >= 3 ? 1 : state.batteries + 1; batteries.set(state.batteries); draw(); }
    };
  }

  function airwater(view, core) {
    const state = { material: "air", pressure: 55 };
    const section = core.section(view.panel, "中身と押す強さを変える", "空気と水の縮み方を比べよう。");
    const material = core.options(section, { label: "注射器の中身", values: [option("air", "空気"), option("water", "水")], value: state.material, format: item => item.label, onChange: value => { state.material = value; draw(); } });
    const pressure = core.range(section, { label: "押す強さ", min: 0, max: 100, value: state.pressure, format: value => value + "%", onInput: value => { state.pressure = value; draw(); } });
    function draw() {
      const volume = state.material === "air" ? 100 - state.pressure * .72 : 100 - state.pressure * .035;
      const pistonX = 160 + volume * 2.7;
      const dots = Array.from({ length: state.material === "air" ? 16 : 12 }, (_, i) => '<circle cx="' + (185 + (i * 47) % 230) + '" cy="' + (150 + (i * 37) % 70) + '" r="' + (state.material === "air" ? 5 : 8) + '" fill="' + (state.material === "air" ? "#78b9cf" : "#4b94ae") + '" opacity=".72"/>').join("");
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="とじこめた空気と水のシミュレーション">' +
          '<rect width="640" height="360" fill="#eef8fa"/><text x="28" y="42" class="scene-title">押すと、どれくらい縮む？</text><text x="30" y="82" class="scene-caption">' + (state.material === "air" ? "空気" : "水") + '　押す強さ ' + state.pressure + '%</text>' +
          '<rect x="150" y="125" width="315" height="130" rx="10" fill="#f8ffff" stroke="#688d99" stroke-width="5"/><rect x="160" y="135" width="' + Math.max(8, volume * 2.7) + '" height="110" fill="' + (state.material === "air" ? "#c9edf3" : "#73b9c7") + '" opacity=".55"/><rect x="' + pistonX + '" y="125" width="13" height="130" fill="#8a6f61"/><path d="M' + pistonX + ' 125 V80" stroke="#8a6f61" stroke-width="10"/>' + dots +
          '<text x="176" y="295" class="component-label">体積 ' + Math.round(volume) + ' / 100</text><text x="385" y="295" class="component-label">手ごたえ ' + Math.round(state.material === "air" ? state.pressure : state.pressure * .15) + '</text>' +
        '</svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "体積", value: Math.round(volume) + " / 100", detail: state.material === "air" ? "縮みやすい" : "ほぼ変わらない" },
          { label: "手ごたえ", value: Math.round(state.material === "air" ? state.pressure : state.pressure * .15), detail: "押し返す感じ" }
        ],
        message: state.material === "air" ? "空気は押すほど体積が小さくなり、元にもどろうとする力が強くなるね。" : "水は押しても体積がほとんど変わらないね。空気と比べてみよう。"
      });
    }
    return {
      render: draw,
      reset: () => { state.material = "air"; state.pressure = 55; material.set(state.material); pressure.set(state.pressure); draw(); },
      step: () => { state.pressure = state.pressure >= 100 ? 0 : state.pressure + 20; pressure.set(state.pressure); draw(); }
    };
  }

  function volume(view, core) {
    const state = { material: "air", temperature: 20 };
    const section = core.section(view.panel, "物の種類と温度を変える", "同じ温度変化で、体積の変わり方を比べよう。");
    const material = core.options(section, { label: "物", values: [option("air", "空気"), option("water", "水"), option("metal", "金属")], value: state.material, format: item => item.label, onChange: value => { state.material = value; draw(); } });
    const temperature = core.range(section, { label: "温度", min: 0, max: 80, value: state.temperature, format: value => value + "℃", onInput: value => { state.temperature = value; draw(); } });
    function draw() {
      const delta = state.temperature - 20;
      const coefficient = { air: .012, water: .00025, metal: .00004 }[state.material];
      const percent = delta * coefficient * 100;
      const radius = 43 * (1 + percent);
      const labels = { air:"空気", water:"水", metal:"金属" };
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="物の温度と体積のシミュレーション">' +
          '<rect width="640" height="360" fill="#fff3ef"/><text x="28" y="42" class="scene-title">温度を変えると、体積は？</text><text x="30" y="80" class="scene-caption">' + labels[state.material] + '　' + state.temperature + '℃</text>' +
          '<rect x="140" y="120" width="360" height="130" rx="15" fill="#fff" stroke="#bf8b78" stroke-width="4"/><circle cx="320" cy="185" r="' + radius + '" fill="' + ({air:"#b6ddec",water:"#64b3c4",metal:"#a9abb0"}[state.material]) + '" stroke="#6f7d82" stroke-width="4"/><line x1="320" y1="125" x2="320" y2="245" stroke="#fff" stroke-width="3" opacity=".55"/>' +
          '<text x="245" y="300" class="component-label">体積の変化 ' + (percent >= 0 ? "+" : "") + one(percent, 2) + '%</text><text x="165" y="330" class="component-label">空気 ＞ 水 ＞ 金属（変化の大きさ）</text>' +
        '</svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "温度", value: state.temperature + "℃", detail: delta >= 0 ? "基準より暖かい" : "基準より冷たい" },
          { label: "体積", value: (percent >= 0 ? "+" : "") + one(percent, 2) + "%", detail: labels[state.material] }
        ],
        message: state.material === "air" ? "空気は温度による体積変化が大きく見えるね。" : "水や金属も変化するけれど、空気より小さいね。"
      });
    }
    return {
      render: draw,
      reset: () => { state.material = "air"; state.temperature = 20; material.set(state.material); temperature.set(state.temperature); draw(); },
      step: () => { state.temperature = state.temperature >= 80 ? 0 : state.temperature + 20; temperature.set(state.temperature); draw(); }
    };
  }

  function heating(view, core) {
    const state = { material: "metal", heat: 55 };
    const section = core.section(view.panel, "物の種類と熱する強さを変える", "温まり方の違いを、動きとして見てみよう。");
    const material = core.options(section, { label: "物", values: [option("metal", "金属"), option("water", "水"), option("air", "空気")], value: state.material, format: item => item.label, onChange: value => { state.material = value; draw(); } });
    const heat = core.range(section, { label: "熱する強さ", min: 0, max: 100, value: state.heat, format: value => value + "%", onInput: value => { state.heat = value; draw(); } });
    function draw() {
      const warm = Math.round(state.heat * (state.material === "metal" ? .95 : .72));
      const isFlow = state.material !== "metal";
      const particles = Array.from({ length: 8 }, (_, i) => {
        const x = 180 + (i % 4) * 72, y = 155 + Math.floor(i / 4) * 75;
        return '<circle cx="' + x + '" cy="' + y + '" r="10" fill="' + (isFlow ? "#83bcc0" : "#db7a55") + '" opacity="' + (.5 + state.heat / 200) + '"/>';
      }).join("");
      const arrows = isFlow ? '<path d="M470 270 C530 230 530 145 470 115" fill="none" stroke="#4b94ae" stroke-width="7" stroke-dasharray="12 10"/><path d="M465 120 l5 -22 17 15" fill="none" stroke="#4b94ae" stroke-width="6"/>' : '<path d="M160 220 H500" stroke="#d27b58" stroke-width="7" stroke-dasharray="12 10"/>';
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="物のあたたまり方のシミュレーション">' +
          '<rect width="640" height="360" fill="#fff3ed"/><text x="28" y="42" class="scene-title">熱はどのように伝わる？</text><text x="30" y="80" class="scene-caption">' + ({metal:"金属",water:"水",air:"空気"}[state.material]) + '　熱する強さ ' + state.heat + '%</text>' +
          '<rect x="125" y="120" width="390" height="150" rx="20" fill="' + (isFlow ? "#e4f4f4" : "#f8e2d7") + '" stroke="#a67767" stroke-width="4"/>' + particles + arrows +
          '<path d="M165 290 h110 l-25 38 h-60z" fill="#da6f43"/><path d="M183 308 Q220 275 257 308 Q220 345 183 308" fill="#f4bd42"/><text x="175" y="350" class="component-label">熱する</text>' +
          '<text x="345" y="310" class="component-label">' + (isFlow ? "温まった物が動く" : "熱した所から順に伝わる") + '</text>' +
        '</svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "温まり", value: warm + " / 95", detail: state.heat === 0 ? "まだ熱していない" : "熱の広がり" },
          { label: "しくみ", value: isFlow ? "動きながら" : "順に伝わる", detail: { metal:"金属",water:"水",air:"空気" }[state.material] }
        ],
        message: isFlow ? "水や空気は、温まった部分が動いて全体へ熱を伝えるね。" : "金属は、熱した部分から近いところへ順に熱が伝わるね。"
      });
    }
    return {
      render: draw,
      reset: () => { state.material = "metal"; state.heat = 55; material.set(state.material); heat.set(state.heat); draw(); },
      step: () => { state.heat = state.heat >= 100 ? 0 : state.heat + 20; heat.set(state.heat); draw(); }
    };
  }

  function waterstate(view, core) {
    const state = { temperature: 20 };
    const section = core.section(view.panel, "温度を変える", "氷・水・水蒸気の姿を見比べよう。");
    const temperature = core.range(section, { label: "温度", min: -20, max: 120, value: state.temperature, format: value => value + "℃", onInput: value => { state.temperature = value; draw(); } });
    function draw() {
      const isIce = state.temperature <= 0;
      const isSteam = state.temperature >= 100;
      const stateName = isIce ? "氷（固体）" : isSteam ? "水蒸気（気体）" : "水（液体）";
      const phaseColor = isIce ? "#a9d9e8" : isSteam ? "#d6e3e5" : "#5aaabd";
      const particles = isSteam ? Array.from({ length: 12 }, (_, i) => '<circle cx="' + (160 + (i * 47) % 330) + '" cy="' + (155 + (i * 31) % 90) + '" r="6" fill="#a1c2cb" opacity=".7"/>').join("") : "";
      const ice = isIce ? '<g fill="#b8e2ee" stroke="#5798aa" stroke-width="3"><path d="M260 205 l35 -35 55 12 19 53 -37 39 -57 -12z"/><path d="M295 170 l15 50 59 15"/><path d="M260 205 l50 15"/></g>' : "";
      const water = !isIce && !isSteam ? '<path d="M180 220 Q320 190 460 220 V285 H180Z" fill="#62b4c4" opacity=".85"/><path d="M180 220 Q320 190 460 220" fill="none" stroke="#327c91" stroke-width="4"/>' : "";
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="水のすがたと温度のシミュレーション">' +
          '<rect width="640" height="360" fill="#eef7fb"/><text x="28" y="42" class="scene-title">温度で水のすがたが変わる</text><text x="30" y="80" class="scene-caption">温度 ' + state.temperature + '℃　→　' + stateName + '</text>' +
          '<rect x="170" y="135" width="300" height="155" rx="18" fill="#fff" stroke="#6d9aa7" stroke-width="5"/>' + water + ice + particles +
          '<line x1="500" y1="125" x2="500" y2="285" stroke="#8c6f62" stroke-width="7"/><circle cx="500" cy="' + (285 - clamp((state.temperature + 20) / 140, 0, 1) * 160) + '" r="12" fill="#d65d55"/><text x="520" y="205" class="component-label">温度計</text>' +
          '<text x="178" y="325" class="scene-caption">0℃付近：氷　　100℃付近：水蒸気</text>' +
        '</svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "温度", value: state.temperature + "℃", detail: isIce ? "0℃以下" : isSteam ? "100℃以上" : "0〜100℃" },
          { label: "すがた", value: stateName, detail: isIce ? "固体" : isSteam ? "気体" : "液体" }
        ],
        message: isIce ? "水を冷やすと氷に、温めると水蒸気に変わるね。" : isSteam ? "水蒸気そのものは目に見えない気体だよ。冷えると水滴になるね。" : "温度を上げ下げして、姿が変わる境目を探してみよう。"
      });
    }
    return {
      render: draw,
      reset: () => { state.temperature = 20; temperature.set(state.temperature); draw(); },
      step: () => { state.temperature = state.temperature >= 120 ? -20 : state.temperature + 20; temperature.set(state.temperature); draw(); }
    };
  }

  window.RikaFourSimulations = {
    seasons: { mount: (root, options) => mountInstant(root, Object.assign({}, options, { create: seasons })) },
    body: { mount: (root, options) => mountInstant(root, Object.assign({}, options, { create: body })) },
    weather: { mount: (root, options) => mountInstant(root, Object.assign({}, options, { create: weather })) },
    rainwater: { mount: (root, options) => mountInstant(root, Object.assign({}, options, { create: rainwater })) },
    moonstars: { mount: (root, options) => mountInstant(root, Object.assign({}, options, { create: moonstars })) },
    electricity: { mount: (root, options) => mountInstant(root, Object.assign({}, options, { create: electricity })) },
    airwater: { mount: (root, options) => mountInstant(root, Object.assign({}, options, { create: airwater })) },
    volume: { mount: (root, options) => mountInstant(root, Object.assign({}, options, { create: volume })) },
    heating: { mount: (root, options) => mountInstant(root, Object.assign({}, options, { create: heating })) },
    waterstate: { mount: (root, options) => mountInstant(root, Object.assign({}, options, { create: waterstate })) }
  };
})();
