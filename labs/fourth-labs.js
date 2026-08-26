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
    core.action(view.actions, model.stepLabel || "条件を1つ進める", () => model.step());
    core.action(view.actions, "この結果をくらべる", () => {
      if (view.saveTrial()) host.showToast && host.showToast("結果を右側にのこしました");
    }, "primary-button");
    model.render();
    return () => {
      model.destroy && model.destroy();
      view.destroy();
    };
  }

  function seasons(view, core) {
    const state = { temp: 18, daylight: 12, target: "plant" };
    const section = core.section(view.panel, "気温と昼の長さを変える", "季節は気温だけでなく、昼の長さも変わります。");
    const temp = core.range(section, { label: "気温", min: 5, max: 30, value: state.temp, format: value => value + "℃", onInput: value => { state.temp = value; draw(); } });
    const daylight = core.range(section, { label: "昼の長さ", min: 8, max: 16, value: state.daylight, format: value => value + "時間", onInput: value => { state.daylight = value; draw(); } });
    const target = core.options(section, { label: "見る生き物", values: [option("plant", "植物"), option("animal", "動物")], value: state.target, format: item => item.label, onChange: value => { state.target = value; draw(); } });
    core.presets(view.panel, [
      { id: "spring", label: "春" }, { id: "summer", label: "夏" },
      { id: "autumn", label: "秋" }, { id: "winter", label: "冬" }
    ], id => {
      const preset = { spring:[15,13], summer:[28,15], autumn:[18,11], winter:[7,9] }[id];
      state.temp = preset[0]; state.daylight = preset[1];
      temp.set(state.temp); daylight.set(state.daylight); draw();
    });
    function draw() {
      const warmth = clamp((state.temp - 5) / 25, 0, 1);
      const light = clamp((state.daylight - 8) / 8, 0, 1);
      const growth = clamp(warmth * .65 + light * .35, 0, 1);
      const leaves = Math.round(2 + growth * 10);
      const activity = Math.round(1 + warmth * 9);
      const leafMarks = Array.from({ length: leaves }, (_, i) => {
        const x = 306 + (i % 2) * 52 + Math.floor(i / 2) * 3;
        const y = 265 - Math.floor(i / 2) * 23 - (i % 2) * 5;
        return '<ellipse cx="' + x + '" cy="' + y + '" rx="28" ry="14" transform="rotate(' + (i % 2 ? 25 : -25) + ' ' + x + ' ' + y + ')" fill="' + (state.temp > 10 ? "#65a865" : "#9baf70") + '"/>';
      }).join("");
      const bugs = state.target === "animal" ? Array.from({ length: Math.max(1, Math.round(activity / 2)) }, (_, i) =>
        '<circle cx="' + (170 + i * 54) + '" cy="' + (280 - (i % 2) * 30) + '" r="8" fill="#df8c3e"/><circle cx="' + (164 + i * 54) + '" cy="' + (275 - (i % 2) * 30) + '" r="5" fill="#855b51"/><circle cx="' + (176 + i * 54) + '" cy="' + (275 - (i % 2) * 30) + '" r="5" fill="#855b51"/>'
      ).join("") : "";
      const flower = growth > .5 ? '<circle cx="360" cy="205" r="12" fill="#e993a5"/><circle cx="380" cy="210" r="10" fill="#e993a5"/><circle cx="370" cy="198" r="10" fill="#e993a5"/><circle cx="370" cy="210" r="5" fill="#f2c34f"/>' : "";
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="気温と昼の長さによる生き物の変化">' +
          '<rect width="640" height="360" fill="#eaf6ee"/><circle cx="540" cy="70" r="' + (22 + light * 12) + '" fill="#f5c94e"/>' +
          '<path d="M0 295 Q160 260 320 292 T640 280 V360 H0Z" fill="#b9d994"/>' +
          '<text x="28" y="42" class="scene-title">季節の条件が変わると？</text><text x="30" y="82" class="scene-caption">気温 ' + state.temp + '℃　昼 ' + state.daylight + '時間</text>' +
          '<rect x="120" y="235" width="22" height="70" rx="11" fill="#8f6948"/><path d="M131 240 Q180 165 245 225 Q275 150 330 225 Q390 155 420 230" fill="none" stroke="#4e8d58" stroke-width="12" stroke-linecap="round"/>' +
          leafMarks + flower + bugs + '<text x="105" y="333" class="scene-caption">' + (state.target === "plant" ? "葉・花の成長" : "動物の活動") + '</text>' +
          '<rect x="470" y="250" width="115" height="18" rx="9" fill="#d6e5dc"/><rect x="470" y="250" width="' + (115 * (state.target === "plant" ? growth : warmth)) + '" height="18" rx="9" fill="#4b8f57"/><text x="470" y="292" class="component-label">ようすの変化</text></svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "気温・昼", value: state.temp + "℃・" + state.daylight + "時間", detail: "季節の条件" },
          { label: state.target === "plant" ? "葉・花" : "活動", value: state.target === "plant" ? leaves + "枚ほど" : activity + " / 10", detail: "モデルの目安" }
        ],
        message: state.target === "plant" ? "植物の変化には、気温と昼の長さの両方が関係するモデルです。" : "動物の活動は気温だけで決まらず、食べ物やすみかにも関係します。"
      });
    }
    return {
      render: draw,
      reset: () => { state.temp = 18; state.daylight = 12; state.target = "plant"; temp.set(state.temp); daylight.set(state.daylight); target.set(state.target); draw(); },
      step: () => { state.temp = state.temp >= 28 ? 7 : state.temp + 5; state.daylight = state.temp < 10 ? 9 : state.temp > 23 ? 15 : 12; temp.set(state.temp); daylight.set(state.daylight); draw(); }
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
          '<text x="113" y="337" class="scene-caption">曲げる筋肉（上側） ' + Math.round(upper * 100) + '%</text><text x="402" y="337" class="scene-caption">伸ばす筋肉（下側） ' + Math.round(lower * 100) + '%</text>' +
          '<path d="M360 185 A27 27 0 0 1 ' + (360 + Math.cos(rad) * 30) + ' ' + (210 + Math.sin(rad) * 30) + '" fill="none" stroke="#7d7270" stroke-width="2"/>' +
        '</svg>';
      const upperText = upper > lower ? "縮んでかたくなりやすい" : "ゆるみやすい";
      const lowerText = lower > upper ? "縮んでかたくなりやすい" : "ゆるみやすい";
      core.renderReadout(view.readout, {
        metrics: [
          { label: "曲げる筋肉（上側）", value: upperText, detail: Math.round(upper * 100) + " / 100" },
          { label: "伸ばす筋肉（下側）", value: lowerText, detail: Math.round(lower * 100) + " / 100" }
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
    const section = core.section(view.panel, "天気と時刻を変える", "点が動いて、選んだ時刻の気温を示します。");
    const weatherControl = core.options(section, { label: "天気", values: [option("sunny", "晴れ"), option("cloudy", "くもり"), option("rain", "雨")], value: state.weather, format: item => item.label, onChange: value => { state.weather = value; draw(); } });
    const time = core.range(section, { label: "時刻", min: 6, max: 20, value: state.time, format: value => value + "時", onInput: value => { state.time = value; draw(); } });
    function tempAt(hour) {
      const base = { sunny: 12, cloudy: 13, rain: 12 }[state.weather];
      const amplitude = { sunny: 12, cloudy: 6, rain: 3 }[state.weather];
      return Math.round((base + Math.sin(Math.PI * clamp((hour - 6) / 16, 0, 1)) * amplitude) * 10) / 10;
    }
    function draw() {
      const temperature = tempAt(state.time);
      const sky = state.weather === "sunny" ? '<circle cx="520" cy="88" r="37" fill="#f4c94d"/>' :
        state.weather === "cloudy" ? '<g fill="#b5c7ce"><circle cx="500" cy="100" r="30"/><circle cx="540" cy="92" r="38"/><circle cx="580" cy="105" r="27"/></g>' :
        '<g fill="#8ba9bd"><circle cx="500" cy="95" r="29"/><circle cx="540" cy="88" r="37"/><circle cx="580" cy="100" r="25"/></g><g stroke="#4b89a4" stroke-width="4">' + [0,1,2,3,4].map(i => '<line x1="' + (495 + i * 21) + '" y1="135" x2="' + (485 + i * 21) + '" y2="162"/>').join("") + '</g>';
      const points = Array.from({length:15}, (_, i) => {
        const hour = 6 + i;
        return (90 + i / 14 * 500) + "," + (285 - (tempAt(hour) - 10) * 7);
      }).join(" ");
      const pointX = 90 + (state.time - 6) / 14 * 500;
      const pointY = 285 - (temperature - 10) * 7;
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="天気と1日の気温変化">' +
          '<rect width="640" height="360" fill="#edf7fb"/><rect y="300" width="640" height="60" fill="#c5dfb0"/><text x="28" y="42" class="scene-title">天気と気温の変化</text>' + sky +
          '<text x="30" y="82" class="scene-caption">' + state.time + '時　' + temperature + '℃</text><line x1="90" y1="290" x2="590" y2="290" stroke="#9ab3b0" stroke-width="2"/>' +
          '<polyline points="' + points + '" fill="none" stroke="#d28a25" stroke-width="5"/><line x1="' + pointX + '" y1="' + pointY + '" x2="' + pointX + '" y2="290" stroke="#d28a25" stroke-width="2" stroke-dasharray="5 5"/><circle cx="' + pointX + '" cy="' + pointY + '" r="9" fill="#d28a25"/>' +
          '<text x="82" y="320" class="component-label">6時</text><text x="350" y="320" class="component-label">14時ごろ</text><text x="555" y="320" class="component-label">20時</text></svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "天気", value: { sunny:"晴れ", cloudy:"くもり", rain:"雨" }[state.weather], detail: "条件" },
          { label: "気温", value: temperature + "℃", detail: state.time < 14 ? "上がる時間帯" : state.time === 14 ? "最も高いころ" : "下がる時間帯" }
        ],
        message: state.weather === "sunny" ? "晴れの日は14時ごろまで上がり、その後下がるモデルです。" : "くもりや雨の日は、晴れの日より気温変化が小さいモデルです。"
      });
    }
    return {
      render: draw,
      reset: () => { state.weather = "sunny"; state.time = 12; weatherControl.set(state.weather); time.set(state.time); draw(); },
      step: () => { state.time = state.time >= 20 ? 6 : state.time + 2; time.set(state.time); draw(); }
    };
  }

  function rainwater(view, core) {
    const state = { slope: 55, ground: "sand" };
    const section = core.section(view.panel, "地面の条件を変える", "地面の高い所・低い所と、水のしみこむ向きを線で確かめよう。");
    const slope = core.range(section, { label: "地面の傾き", min: 0, max: 100, value: state.slope, format: value => value + "%", onInput: value => { state.slope = value; draw(); } });
    const ground = core.options(section, { label: "地面", values: [option("sand", "砂"), option("soil", "細かい土"), option("concrete", "コンクリート")], value: state.ground, format: item => item.label, onChange: value => { state.ground = value; draw(); } });
    function draw() {
      const infiltration = { sand: 88, soil: 54, concrete: 6 }[state.ground];
      const speed = Math.round(state.slope * .75);
      const runoff = Math.round((100 - infiltration) * (.25 + state.slope * .0075));
      const groundName = {sand:"砂",soil:"細かい土",concrete:"コンクリート"}[state.ground];
      const groundColor = {sand:"#d7c08c",soil:"#a98d72",concrete:"#aeb9bc"}[state.ground];
      const leftY = Math.round(270 - state.slope * .72), rightY = 270;
      const surface = 'M85 ' + leftY + ' Q320 ' + ((leftY + rightY) / 2 + 5) + ' 555 ' + rightY;
      const drops = [155,220,285,350].map((x,i) => '<path d="M' + x + ' 105 v42" stroke="#4b94ae" stroke-width="4" marker-end="url(#waterArrow)" opacity="' + (.65 + i*.08) + '"/>').join("");
      const soakCount = Math.max(1, Math.round(infiltration / 18));
      const soak = Array.from({ length: soakCount }, (_, i) => {
        const x = 175 + i * 48;
        const t = (x - 85) / 470;
        const y = leftY + (rightY - leftY) * t + 4;
        return '<path class="soak-arrow" d="M' + x + ' ' + y + ' v' + (22 + infiltration * .28) + '" stroke="#3d8fa9" stroke-width="4" marker-end="url(#waterArrow)" opacity="' + (.35 + infiltration/180) + '"/>';
      }).join("");
      const flow = state.slope > 0 ? '<path class="runoff-arrow" d="' + surface + '" fill="none" stroke="#398da9" stroke-width="' + (5 + runoff*.05) + '" stroke-linecap="round" marker-end="url(#waterArrow)"/>' : '<ellipse cx="350" cy="260" rx="68" ry="12" fill="#74b9cc"/>';
      view.stage.innerHTML =
        '<svg class="extra-svg rainwater-diagram" viewBox="0 0 640 360" role="img" aria-label="雨水が高い場所から低い場所へ流れ、一部は地面の下へしみこむ様子">' +
          '<defs><marker id="waterArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="#398da9"/></marker></defs><rect width="640" height="360" fill="#edf6fa"/>' +
          '<text x="28" y="38" class="scene-title">雨水の2つの行き先</text><text x="30" y="74" class="scene-caption">①低い方へ流れる　②地面の中へしみこむ</text>' + drops +
          '<path d="' + surface + ' L640 360 H0Z" fill="' + groundColor + '"/><path d="' + surface + '" fill="none" stroke="#75624e" stroke-width="4"/>' + flow + soak +
          '<text x="70" y="' + Math.max(105,leftY-16) + '" class="component-label">高い</text><text x="528" y="252" class="component-label">低い</text><path d="M555 282 Q592 270 622 286 Q596 331 548 316Z" fill="#6db4ca" opacity="' + clamp(runoff / 65, .18, .95) + '"/>' +
          '<g transform="translate(35 300)"><rect width="465" height="38" rx="11" fill="#fff" opacity=".92"/><text x="16" y="25" class="component-label">青い横矢印＝流れる　　青い下矢印＝しみこむ　　地面：' + groundName + '</text></g>' +
        '</svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "表面を流れる速さ", value: speed + " / 75", detail: state.slope === 0 ? "くぼみにたまる" : "高い所から低い所へ" },
          { label: "地面へのしみこみ", value: infiltration + "%", detail: state.ground === "sand" ? "すき間が大きい" : state.ground === "concrete" ? "ほとんど通さない" : "土のすき間" }
        ],
        message: "雨水は高い所から低い所へ流れます。地面の種類によって、下へしみこむ量が変わります。"
      });
    }
    return {
      render: draw,
      reset: () => { state.slope = 55; state.ground = "sand"; slope.set(state.slope); ground.set(state.ground); draw(); },
      step: () => { state.slope = state.slope >= 100 ? 0 : state.slope + 20; slope.set(state.slope); draw(); }
    };
  }

  function moonstars(view, core) {
    const state = { time: 20, day: 15, target: "position" };
    const section = core.section(view.panel, "観察することを選ぶ", "同じ夜の動きと、日ごとの月の形を分けて確かめます。");
    let time, day;
    const target = core.options(section, { label: "見ること", values: [option("position", "月の位置"), option("phase", "月の形"), option("stars", "星の動き")], value: state.target, format: item => item.label, onChange: value => { state.target = value; toggleControls(); draw(); } });
    time = core.range(section, { label: "同じ夜の時刻", min: 18, max: 24, value: state.time, format: value => value + "時", onInput: value => { state.time = value; draw(); } });
    day = core.range(section, { label: "観察を始めてから", min: 1, max: 30, value: state.day, format: value => value + "日目", onInput: value => { state.day = value; draw(); } });
    function toggleControls() {
      time.element.hidden = state.target === "phase";
      day.element.hidden = state.target !== "phase";
    }
    function draw() {
      const phaseIndex = Math.round((state.day % 30) / 30 * 8) % 8;
      const phaseNames = ["新月", "三日月ごろ", "上弦の月", "満月に近づく月", "満月", "欠け始めた月", "下弦の月", "明け方の細い月"];
      const phase = phaseNames[phaseIndex];
      const ratio = (state.time - 18) / 6;
      const x = 115 + ratio * 410;
      const y = 265 - Math.sin(ratio * Math.PI) * 145;
      const baseStars = [[75,115,3],[135,155,2],[205,103,3],[275,178,2],[355,112,2],[440,164,3],[525,105,2],[575,205,2]].map(item => '<circle cx="' + item[0] + '" cy="' + item[1] + '" r="' + item[2] + '" fill="#dce8ff" opacity=".62"/>').join("");
      const constellation = [[0,15],[38,0],[76,18],[112,5],[145,35],[180,22],[212,48]];
      const constellationShift = 65 + ratio * 240;
      const constellationSvg = '<g transform="translate(' + constellationShift + ' 115)"><polyline points="' + constellation.map(p => p[0] + "," + p[1]).join(" ") + '" fill="none" stroke="#8da7d9" stroke-width="2"/>' + constellation.map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="#f1f5ff"/>').join("") + '</g>';
      let phaseArt = '<circle cx="320" cy="185" r="58" fill="#17264c" stroke="#d2c77e" stroke-width="3"/>';
      if (phaseIndex === 1) phaseArt = '<circle cx="320" cy="185" r="58" fill="#f2e8b2"/><circle cx="292" cy="185" r="58" fill="#17264c" clip-path="url(#moonClip)"/>';
      if (phaseIndex === 2) phaseArt = '<circle cx="320" cy="185" r="58" fill="#17264c"/><path d="M320 127 A58 58 0 0 1 320 243 L320 127Z" fill="#f2e8b2"/>';
      if (phaseIndex === 3) phaseArt = '<circle cx="320" cy="185" r="58" fill="#f2e8b2"/><ellipse cx="286" cy="185" rx="28" ry="58" fill="#17264c" clip-path="url(#moonClip)"/>';
      if (phaseIndex === 4) phaseArt = '<circle cx="320" cy="185" r="58" fill="#f2e8b2" stroke="#d2c77e" stroke-width="3"/>';
      if (phaseIndex === 5) phaseArt = '<circle cx="320" cy="185" r="58" fill="#f2e8b2"/><ellipse cx="354" cy="185" rx="28" ry="58" fill="#17264c" clip-path="url(#moonClip)"/>';
      if (phaseIndex === 6) phaseArt = '<circle cx="320" cy="185" r="58" fill="#17264c"/><path d="M320 127 A58 58 0 0 0 320 243 L320 127Z" fill="#f2e8b2"/>';
      if (phaseIndex === 7) phaseArt = '<circle cx="320" cy="185" r="58" fill="#f2e8b2"/><circle cx="348" cy="185" r="58" fill="#17264c" clip-path="url(#moonClip)"/>';
      const moonPosition = '<path d="M95 272 Q320 70 545 272" fill="none" stroke="#7186bb" stroke-width="3" stroke-dasharray="8 8"/><circle class="moving-moon" cx="' + x + '" cy="' + y + '" r="32" fill="#f2e8b2" stroke="#d2c77e" stroke-width="3"/><path d="M' + (x - 34) + ' ' + (y + 44) + ' h68" stroke="#f2e8b2" stroke-width="2"/><text x="' + (x - 30) + '" y="' + (y + 62) + '" fill="#eef4ff" class="tiny-label">いまの月</text>';
      const visual = state.target === "phase" ? '<defs><clipPath id="moonClip"><circle cx="320" cy="185" r="58"/></clipPath></defs>' + baseStars + phaseArt : state.target === "stars" ? baseStars + constellationSvg + '<path d="M100 250 H535" stroke="#7186bb" stroke-width="3" marker-end="url(#skyArrow)"/>' : baseStars + moonPosition;
      const guide = state.target === "phase" ? '<text x="167" y="286" fill="#dce8ff" class="scene-caption">日にちを進める → 明るい部分の形が変わる</text>' : '<text x="92" y="314" fill="#dce8ff" class="component-label">東（のぼる）</text><text x="451" y="314" fill="#dce8ff" class="component-label">西（しずむ）</text>';
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="月の形と、月や星が東から西へ動いて見える様子">' +
          '<defs><marker id="skyArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="#8da7d9"/></marker></defs><rect width="640" height="360" fill="#17264c"/>' + visual +
          '<text x="28" y="38" fill="#eef4ff" class="scene-title">' + (state.target === "phase" ? "月の明るい形を見る" : state.target === "stars" ? "星の並びを追う" : "同じ夜の月を追う") + '</text><text x="30" y="75" fill="#dce8ff" class="scene-caption">' + (state.target === "phase" ? state.day + "日目　" + phase : state.time + "時") + '</text>' + guide + '</svg>';
      core.renderReadout(view.readout, {
        metrics: state.target === "phase" ? [
          { label: "観察日", value: state.day + "日目", detail: "日を変えて比べる" },
          { label: "月の形", value: phase, detail: "黄色が明るく見える部分" }
        ] : [
          { label: "時刻", value: state.time + "時", detail: "同じ夜" },
          { label: state.target === "stars" ? "星の並び" : "月の位置", value: state.target === "stars" ? "形を保って西へ" : x < 280 ? "東より" : x > 410 ? "西より" : "南の空の高い所", detail: "東から西へ動いて見える" }
        ],
        message: state.target === "phase" ? "黄色い部分が、太陽の光を受けて明るく見える部分です。日にちを変えると形が変わります。" : state.target === "stars" ? "星は並び方をほぼ保ったまま、時間とともに東から西へ動いて見えます。" : "同じ夜に時間がたつと、月は東から西の方へ動いて見えます。"
      });
    }
    toggleControls();
    return {
      render: draw,
      reset: () => { state.time = 20; state.day = 15; state.target = "position"; time.set(state.time); day.set(state.day); target.set(state.target); toggleControls(); draw(); },
      step: () => { if (state.target === "phase") { state.day = state.day >= 30 ? 1 : state.day + 3; day.set(state.day); } else { state.time = state.time >= 24 ? 18 : state.time + 1; time.set(state.time); } draw(); }
    };
  }

  function electricity(view, core) {
    const state = { batteries: 1, direction: "normal" };
    const section = core.section(view.panel, "乾電池の数と向きを変える", "回路の中の乾電池と、モーターの矢印をつなげて見よう。");
    const batteries = core.range(section, { label: "乾電池の数", min: 1, max: 2, value: state.batteries, format: value => value + "個", onInput: value => { state.batteries = value; draw(); } });
    const direction = core.options(section, { label: "乾電池の向き", values: [option("normal", "同じ向き"), option("reverse", "1個を反対")], value: state.direction, format: item => item.label, onChange: value => { state.direction = value; draw(); } });
    function draw() {
      const effective = state.direction === "reverse" ? (state.batteries === 1 ? -1 : state.batteries - 2) : state.batteries;
      const speed = Math.abs(effective) * 35;
      const rotation = effective > 0 ? "右回り" : effective < 0 ? "左回り" : "停止";
      const cellX = state.batteries === 1 ? [175] : [135,245];
      const cells = cellX.map((x, i) => {
        const reversed = state.direction === "reverse" && (state.batteries === 1 || i === state.batteries - 1);
        return '<g transform="translate(' + x + ' 246)"><rect width="74" height="46" rx="8" fill="#f5d979" stroke="#9a7726" stroke-width="3"/><line x1="' + (reversed ? 55 : 14) + '" y1="8" x2="' + (reversed ? 55 : 14) + '" y2="38" stroke="#725715" stroke-width="6"/><line x1="' + (reversed ? 17 : 54) + '" y1="14" x2="' + (reversed ? 17 : 54) + '" y2="32" stroke="#725715" stroke-width="3"/><text x="' + (reversed ? 48 : 5) + '" y="4" class="tiny-label">＋</text><text x="' + (reversed ? 8 : 48) + '" y="4" class="tiny-label">−</text></g>';
      }).join("");
      const arrow = effective === 0 ? '<line x1="488" y1="165" x2="548" y2="165" stroke="#8b9694" stroke-width="8"/><text x="488" y="114" class="component-label">打ち消し合って停止</text>' : '<path d="' + (effective > 0 ? "M480 157 A38 38 0 1 1 540 132" : "M548 157 A38 38 0 1 0 488 132") + '" fill="none" stroke="#bd8a12" stroke-width="7" marker-end="url(#motorArrow)"/>';
      const circuitColor = effective === 0 ? "#7e918d" : "#bd8a12";
      view.stage.innerHTML =
        '<svg class="extra-svg motor-circuit-diagram" viewBox="0 0 640 360" role="img" aria-label="乾電池の数と向きによってモーターの速さや回る向きが変わる回路">' +
          '<defs><marker id="motorArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="#bd8a12"/></marker></defs><rect width="640" height="360" fill="#f7f5e9"/><text x="28" y="38" class="scene-title">乾電池の向き → モーターの回り方</text><text x="30" y="74" class="scene-caption">回路を一周たどり、＋と−の向きを見よう</text>' +
          '<path d="M90 220 V115 H470 M550 205 V315 H90 V220" fill="none" stroke="' + circuitColor + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M470 115 V125 M550 205 V205" stroke="' + circuitColor + '" stroke-width="7"/>' +
          cells + '<g><circle cx="510" cy="165" r="48" fill="#e7ece6" stroke="#6c837d" stroke-width="5"/><circle cx="510" cy="165" r="11" fill="#6c837d"/><path d="M510 154 l-17 -25 M510 154 l17 -25 M510 176 l-17 25 M510 176 l17 25" stroke="#8ca09b" stroke-width="8" stroke-linecap="round"/>' + arrow + '<text x="474" y="236" class="component-label">モーター</text></g>' +
          '<g transform="translate(55 326)"><text class="component-label">乾電池 ' + state.batteries + '個・' + (state.direction === "normal" ? "同じ向き" : "1個を反対") + '　→　' + rotation + '　速さ ' + speed + ' / 70</text></g>' +
        '</svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "乾電池", value: state.batteries + "個", detail: state.direction === "reverse" ? "1個を反対向き" : "＋と−を同じ向きにそろえる" },
          { label: "モーター", value: rotation, detail: "速さ " + speed + " / 70" }
        ],
        message: state.batteries === 1 && state.direction === "reverse" ? "乾電池1個の向きを反対にすると、モーターの回る向きも反対になります。" : effective === 0 ? "2個の乾電池を反対向きにつなぐと、はたらきが打ち消し合うモデルです。" : "同じ向きの乾電池を増やすと、モーターは同じ向きに速く回ります。"
      });
    }
    return {
      render: draw,
      reset: () => { state.batteries = 1; state.direction = "normal"; batteries.set(state.batteries); direction.set(state.direction); draw(); },
      step: () => { state.batteries = state.batteries >= 2 ? 1 : state.batteries + 1; batteries.set(state.batteries); draw(); }
    };
  }

  function airwater(view, core) {
    const state = { material: "air", pressure: 55 };
    const section = core.section(view.panel, "中身と押す強さを変える", "体積と押し返す手ごたえを比べよう。");
    const material = core.options(section, { label: "注射器の中身", values: [option("air", "空気"), option("water", "水")], value: state.material, format: item => item.label, onChange: value => { state.material = value; draw(); } });
    const pressure = core.range(section, { label: "押す強さ", min: 0, max: 100, value: state.pressure, format: value => value + "%", onInput: value => { state.pressure = value; draw(); } });
    function draw() {
      const volume = state.material === "air" ? 100 - state.pressure * .62 : 100 - state.pressure * .03;
      const resistance = Math.round(state.material === "air" ? state.pressure * (.35 + state.pressure * .0045) : state.pressure);
      const innerWidth = volume * 2.7;
      const pistonX = 160 + innerWidth;
      const particleWidth = Math.max(18, innerWidth - 34);
      const dots = Array.from({ length: state.material === "air" ? 16 : 18 }, (_, i) => '<circle cx="' + (177 + (i * 37) % particleWidth) + '" cy="' + (150 + (i * 31) % 75) + '" r="' + (state.material === "air" ? 5 : 7) + '" fill="' + (state.material === "air" ? "#78b9cf" : "#4b94ae") + '" opacity=".72"/>').join("");
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="閉じ込めた空気と水の縮み方">' +
          '<rect width="640" height="360" fill="#eef8fa"/><text x="28" y="42" class="scene-title">押すと、どれくらい縮む？</text><text x="30" y="82" class="scene-caption">' + (state.material === "air" ? "空気" : "水") + '　押す強さ ' + state.pressure + '%</text>' +
          '<defs><clipPath id="syringeClip"><rect x="160" y="135" width="' + innerWidth + '" height="110"/></clipPath></defs><rect x="150" y="125" width="315" height="130" rx="10" fill="#f8ffff" stroke="#688d99" stroke-width="5"/><rect x="160" y="135" width="' + innerWidth + '" height="110" fill="' + (state.material === "air" ? "#c9edf3" : "#73b9c7") + '" opacity=".55"/><g clip-path="url(#syringeClip)">' + dots + '</g><rect x="' + pistonX + '" y="125" width="13" height="130" fill="#8a6f61"/><path d="M' + pistonX + ' 125 V80" stroke="#8a6f61" stroke-width="10"/>' +
          '<text x="176" y="295" class="component-label">体積 ' + Math.round(volume) + ' / 100</text><text x="385" y="295" class="component-label">手ごたえ ' + resistance + '</text></svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "体積", value: Math.round(volume) + " / 100", detail: state.material === "air" ? "押すと小さくなる" : "ほぼ変わらない" },
          { label: "手ごたえ", value: resistance + " / 100", detail: state.material === "water" ? "水は強く押し返す" : "押すほど強くなる" }
        ],
        message: state.material === "air" ? "空気は押し縮められ、押すほど元にもどろうとする力が強くなります。" : "水はほとんど縮まないため、強く押し返します。"
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
    const section = core.section(view.panel, "物の種類と温度を変える", "温めたときと冷やしたときの体積を比べよう。");
    const material = core.options(section, { label: "物", values: [option("air", "空気"), option("water", "水"), option("metal", "金属")], value: state.material, format: item => item.label, onChange: value => { state.material = value; draw(); } });
    const temperature = core.range(section, { label: "温度", min: -20, max: 80, value: state.temperature, format: value => value + "℃", onInput: value => { state.temperature = value; draw(); } });
    function draw() {
      const delta = state.temperature - 20;
      const coefficient = { air: .0034, water: .00021, metal: .00005 }[state.material];
      const percent = delta * coefficient * 100;
      const radius = 43 * clamp(1 + percent / 100, .72, 1.35);
      const labels = { air:"空気", water:"水", metal:"金属" };
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="物の温度と体積の変化">' +
          '<rect width="640" height="360" fill="#fff3ef"/><text x="28" y="42" class="scene-title">温度を変えると、体積は？</text><text x="30" y="80" class="scene-caption">' + labels[state.material] + '　' + state.temperature + '℃</text>' +
          '<rect x="140" y="120" width="360" height="130" rx="15" fill="#fff" stroke="#bf8b78" stroke-width="4"/><circle cx="320" cy="185" r="43" fill="none" stroke="#9eaaa9" stroke-width="3" stroke-dasharray="7 6"/><circle cx="320" cy="185" r="' + radius + '" fill="' + ({air:"#b6ddec",water:"#64b3c4",metal:"#a9abb0"}[state.material]) + '" stroke="#6f7d82" stroke-width="4" opacity=".9"/>' +
          '<text x="220" y="300" class="component-label">20℃を基準：' + (percent >= 0 ? "+" : "") + one(percent, 2) + '%</text><text x="180" y="330" class="scene-caption">図の変化は見やすく拡大しています</text></svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "温度", value: state.temperature + "℃", detail: delta > 0 ? "温めた" : delta < 0 ? "冷やした" : "基準" },
          { label: "体積", value: (percent >= 0 ? "+" : "") + one(percent, 2) + "%", detail: labels[state.material] }
        ],
        message: delta === 0 ? "20℃を基準に、温めたり冷やしたりして比べよう。" : delta > 0 ? "温めると体積は大きくなります。空気・水・金属で変化の大きさが違います。" : "冷やすと体積は小さくなります。空気の変化が最も大きいモデルです。",
        note: "円の大きさは、小さな違いを見つけやすいように拡大して表示しています。"
      });
    }
    return {
      render: draw,
      reset: () => { state.material = "air"; state.temperature = 20; material.set(state.material); temperature.set(state.temperature); draw(); },
      step: () => { state.temperature = state.temperature >= 80 ? -20 : state.temperature + 20; temperature.set(state.temperature); draw(); }
    };
  }

  function heating(view, core) {
    const state = { material: "metal", time: 4 };
    const section = core.section(view.panel, "物と熱してからの時間を変える", "時間を進めて、温まりが広がる順を見よう。");
    const material = core.options(section, { label: "物", values: [option("metal", "金属"), option("water", "水"), option("air", "空気")], value: state.material, format: item => item.label, onChange: value => { state.material = value; draw(); } });
    const time = core.range(section, { label: "熱してからの時間", min: 0, max: 10, value: state.time, format: value => value, onInput: value => { state.time = value; draw(); } });
    function draw() {
      const warm = state.time * 10;
      const isFlow = state.material !== "metal";
      const metalCells = Array.from({length:10}, (_, i) => {
        const reached = i <= state.time - 1;
        return '<rect x="' + (125 + i * 39) + '" y="145" width="39" height="95" fill="' + (reached ? "#dc7655" : "#c8d0ce") + '" opacity="' + (reached ? 1 - i * .045 : .65) + '"/>';
      }).join("");
      const loops = '<path d="M210 245 C150 185 185 125 270 145 C350 165 355 235 285 250" fill="none" stroke="#4b94ae" stroke-width="8" stroke-dasharray="12 9" opacity="' + (state.time / 10) + '"/><path d="M430 245 C370 185 405 125 490 145 C550 165 555 225 500 250" fill="none" stroke="#d27b58" stroke-width="8" stroke-dasharray="12 9" opacity="' + (state.time / 10) + '"/>';
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="物の温まり方">' +
          '<rect width="640" height="360" fill="#fff3ed"/><text x="28" y="42" class="scene-title">熱はどのように広がる？</text><text x="30" y="80" class="scene-caption">' + ({metal:"金属",water:"水",air:"空気"}[state.material]) + '　時間 ' + state.time + '</text>' +
          '<rect x="125" y="120" width="390" height="150" rx="20" fill="' + (isFlow ? "#e4f4f4" : "#eef1ef") + '" stroke="#a67767" stroke-width="4"/>' + (isFlow ? loops : metalCells) +
          '<path d="M145 285 h110 l-25 38 h-60z" fill="#da6f43"/><path d="M163 305 Q200 272 237 305 Q200 342 163 305" fill="#f4bd42"/><text x="280" y="315" class="component-label">' + (isFlow ? "温まった部分が動いて全体へ" : "熱した所から近い順に") + '</text></svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "時間", value: state.time + " / 10", detail: state.time === 0 ? "まだ熱していない" : "熱している" },
          { label: "温まり方", value: isFlow ? "動きながら" : "近い順", detail: { metal:"金属",water:"水",air:"空気" }[state.material] }
        ],
        message: state.time === 0 ? "時間を進めて、どこから温まり始めるか見よう。" : isFlow ? "水や空気は、温まった部分が動くことで全体へ熱を伝えます。" : "金属は、熱した部分から近い所へ順に熱が伝わります。"
      });
    }
    return {
      render: draw,
      reset: () => { state.material = "metal"; state.time = 4; material.set(state.material); time.set(state.time); draw(); },
      step: () => { state.time = state.time >= 10 ? 0 : state.time + 2; time.set(state.time); draw(); }
    };
  }

  function waterstate(view, core) {
    const state = { temperature: 20 };
    const section = core.section(view.panel, "温度を変える", "境目では二つの姿がいっしょにあることも確かめよう。");
    const temperature = core.range(section, { label: "温度", min: -20, max: 120, step: 10, value: state.temperature, format: value => value + "℃", onInput: value => { state.temperature = value; draw(); } });
    function draw() {
      const t = state.temperature;
      const isIce = t < 0, freezing = t === 0, boiling = t === 100, isSteam = t > 100;
      const stateName = isIce ? "氷（固体）" : freezing ? "氷と水" : boiling ? "水と水蒸気" : isSteam ? "水蒸気（気体）" : "水（液体）";
      const showIce = isIce || freezing, showWater = (!isIce && !isSteam), showSteam = boiling || isSteam;
      const particles = showSteam ? Array.from({ length: 12 }, (_, i) => '<circle cx="' + (160 + (i * 47) % 330) + '" cy="' + (125 + (i * 31) % 105) + '" r="6" fill="#a1c2cb" opacity=".55"/>').join("") : "";
      const ice = showIce ? '<g fill="#b8e2ee" stroke="#5798aa" stroke-width="3"><path d="M235 215 l35 -35 55 12 19 53 -37 39 -57 -12z"/><path d="M270 180 l15 50 59 15"/></g>' : "";
      const water = showWater ? '<path d="M180 ' + (freezing ? 235 : 220) + ' Q320 ' + (freezing ? 220 : 190) + ' 460 ' + (freezing ? 235 : 220) + ' V285 H180Z" fill="#62b4c4" opacity=".78"/>' : "";
      view.stage.innerHTML =
        '<svg class="extra-svg" viewBox="0 0 640 360" role="img" aria-label="水の姿と温度">' +
          '<rect width="640" height="360" fill="#eef7fb"/><text x="28" y="42" class="scene-title">温度で水の姿が変わる</text><text x="30" y="80" class="scene-caption">' + t + '℃　→　' + stateName + '</text>' +
          '<rect x="170" y="115" width="300" height="175" rx="18" fill="#fff" stroke="#6d9aa7" stroke-width="5"/>' + water + ice + particles +
          '<line x1="500" y1="115" x2="500" y2="285" stroke="#8c6f62" stroke-width="7"/><circle cx="500" cy="' + (285 - clamp((t + 20) / 140, 0, 1) * 170) + '" r="12" fill="#d65d55"/><text x="520" y="205" class="component-label">温度計</text>' +
          '<text x="155" y="328" class="scene-caption">粒は、見えない水蒸気を表すモデルです</text></svg>';
      core.renderReadout(view.readout, {
        metrics: [
          { label: "温度", value: t + "℃", detail: freezing ? "こおり始める境目" : boiling ? "沸騰する境目" : isIce ? "0℃より低い" : isSteam ? "100℃より高い" : "0〜100℃" },
          { label: "すがた", value: stateName, detail: freezing || boiling ? "変化の途中" : isIce ? "固体" : isSteam ? "気体" : "液体" }
        ],
        message: freezing ? "0℃付近では、水と氷がいっしょにある変化の途中を表しています。" : boiling ? "100℃付近では、水が沸騰して水蒸気へ変わる途中です。" : isSteam ? "水蒸気そのものは目に見えません。図の粒はモデルです。" : isIce ? "水を冷やすと、0℃付近で氷へ変わります。" : "水の温度を上げ下げして、姿が変わる境目を探そう。"
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
