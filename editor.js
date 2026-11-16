// =====================================================================
//  VISUELLER EDITOR – wird mit overlay.html?edit=1 geladen
//  Elemente per Maus verschieben/skalieren, alles über das Panel ändern,
//  am Ende "Speichern" -> config.js überschreiben.
// =====================================================================
(() => {
  "use strict";
  const O = window.Overlay;
  const cfg = O.cfg;
  const stage = document.getElementById("stage");
  document.documentElement.classList.add("edit-mode");

  // ---------------------------------------------------------------
  // Felder-Definition: [Pfad, Beschriftung, Typ, ...Optionen]
  // ---------------------------------------------------------------
  const ANIM_BORDER = { flow: "Fließender Verlauf", pulse: "Pulsieren", rainbow: "Regenbogen", none: "Keine" };
  const ANIM_CHAT = { slide: "Reinrutschen", fade: "Einblenden", pop: "Aufploppen", up: "Von unten", none: "Keine" };
  const ANIM_ALERT = {
    bounce: "Bounce", drop: "Von oben fallen", left: "Von links", right: "Von rechts",
    zoom: "Zoom", flip: "Umklappen", fade: "Einblenden", none: "Keine",
  };
  const FONTS = { Rubik: "Rubik", Poppins: "Poppins", Montserrat: "Montserrat", Orbitron: "Orbitron", "Bebas Neue": "Bebas Neue", "Press Start 2P": "Press Start 2P (Pixel)" };

  const TABS = [
    { id: "handcam", label: "Handcam", groups: [
      ["Position & Größe", [
        ["handcam.enabled", "Anzeigen", "bool"],
        ["handcam.x", "X", "num"], ["handcam.y", "Y", "num"],
        ["handcam.width", "Breite", "num"], ["handcam.height", "Höhe", "num"],
      ]],
      ["Transparenz & Hintergrund", [
        ["handcam.opacity", "Deckkraft gesamt", "range", 0, 1, 0.05],
        ["handcam.background", "Hintergrundfarbe", "color"],
        ["handcam.backgroundOpacity", "Hintergrund-Deckkraft", "range", 0, 1, 0.05],
        ["handcam.blur", "Weichzeichner (px)", "range", 0, 30, 1],
      ]],
      ["Rahmen", [
        ["handcam.borderWidth", "Rahmenstärke", "range", 0, 20, 1],
        ["handcam.radius", "Eckenrundung", "range", 0, 80, 1],
        ["handcam.glow", "Leuchten", "range", 0, 1, 0.05],
        ["handcam.corners", "Eck-Akzente", "bool"],
      ]],
      ["Animation", [
        ["handcam.borderAnimation", "Rahmen-Animation", "select", ANIM_BORDER],
        ["handcam.animationSpeed", "Dauer pro Durchlauf (s)", "range", 0.5, 20, 0.5],
      ]],
      ["Beschriftung", [
        ["handcam.label", "Text", "text"],
        ["handcam.labelPosition", "Position", "select", { bottom: "Unten", top: "Oben", none: "Ausblenden" }],
      ]],
    ]},
    { id: "chat", label: "Chat", groups: [
      ["Position & Größe", [
        ["chat.enabled", "Anzeigen", "bool"],
        ["chat.x", "X", "num"], ["chat.y", "Y", "num"],
        ["chat.width", "Breite", "num"], ["chat.height", "Höhe", "num"],
      ]],
      ["Transparenz & Hintergrund", [
        ["chat.opacity", "Deckkraft gesamt", "range", 0, 1, 0.05],
        ["chat.background", "Hintergrundfarbe", "color"],
        ["chat.backgroundOpacity", "Hintergrund-Deckkraft", "range", 0, 1, 0.05],
        ["chat.blur", "Weichzeichner (px)", "range", 0, 30, 1],
        ["chat.messageBackground", "Nachricht-Hintergrund", "color"],
        ["chat.messageOpacity", "Nachricht-Deckkraft", "range", 0, 1, 0.05],
        ["chat.radius", "Eckenrundung", "range", 0, 60, 1],
        ["chat.border", "Rand", "bool"],
        ["chat.shadow", "Schatten", "bool"],
      ]],
      ["Inhalt", [
        ["chat.showHeader", "Kopfzeile zeigen", "bool"],
        ["chat.headerText", "Kopfzeilen-Text", "text"],
        ["chat.fontSize", "Schriftgröße", "range", 10, 40, 1],
        ["chat.showBadges", "Abzeichen zeigen", "bool"],
        ["chat.maxMessages", "Max. Nachrichten", "range", 1, 60, 1],
        ["chat.hideCommands", "!Befehle ausblenden", "bool"],
        ["chat.hideUsers", "Ausgeblendete Nutzer (Komma)", "list"],
      ]],
      ["Animation", [
        ["chat.animation", "Nachricht erscheint", "select", ANIM_CHAT],
        ["chat.messageLifetime", "Ausblenden nach (s, 0 = nie)", "range", 0, 120, 1],
      ]],
    ]},
    { id: "alert", label: "Alert", groups: [
      ["Position & Größe", [
        ["alert.x", "X", "num"], ["alert.y", "Y", "num"],
        ["alert.width", "Breite", "num"],
        ["alert.scale", "Skalierung", "range", 0.3, 2.5, 0.05],
      ]],
      ["Transparenz & Hintergrund", [
        ["alert.opacity", "Deckkraft gesamt", "range", 0, 1, 0.05],
        ["alert.background", "Hintergrundfarbe", "color"],
        ["alert.backgroundOpacity", "Hintergrund-Deckkraft", "range", 0, 1, 0.05],
        ["alert.glow", "Leuchten", "bool"],
      ]],
      ["Animation", [
        ["alert.animation", "Einblend-Animation", "select", ANIM_ALERT],
        ["alert.animationSpeed", "Animations-Dauer (s)", "range", 0.1, 3, 0.05],
        ["alert.duration", "Anzeigedauer (s)", "range", 1, 30, 0.5],
        ["alert.confetti", "Konfetti", "bool"],
        ["alert.showIcon", "Herz-Icon", "bool"],
        ["alert.iconAnimation", "Herz schlägt", "bool"],
      ]],
      ["Text", [
        ["alert.title", "Überschrift", "text"],
        ["alert.text", "Untertitel ({name} = Name)", "text"],
      ]],
      ["Sound", [
        ["alert.sound", "Sound an", "bool"],
        ["alert.soundFile", "Eigene Datei (z. B. sounds/follow.mp3)", "text"],
        ["alert.volume", "Lautstärke", "range", 0, 1, 0.05],
      ]],
    ]},
    { id: "theme", label: "Design", groups: [
      ["Farben & Schrift", [
        ["theme.accent", "Akzentfarbe 1", "color"],
        ["theme.accent2", "Akzentfarbe 2", "color"],
        ["theme.text", "Textfarbe", "color"],
        ["theme.font", "Schriftart", "select", FONTS],
      ]],
    ]},
    { id: "twitch", label: "Twitch", groups: [
      ["Verbindung", [
        ["channel", "Kanalname", "text"],
        ["accessToken", "Access Token (für Follows)", "password"],
        ["clientId", "Client-ID (optional)", "text"],
      ]],
    ]},
  ];

  // ---------------------------------------------------------------
  // Hilfen
  // ---------------------------------------------------------------
  const get = (path) => path.split(".").reduce((o, k) => o[k], cfg);
  const set = (path, val) => {
    const keys = path.split(".");
    const last = keys.pop();
    keys.reduce((o, k) => o[k], cfg)[last] = val;
  };
  const getDefault = (path) => path.split(".").reduce((o, k) => o[k], O.DEFAULTS);
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "class") el.className = v;
      else el.setAttribute(k, v);
    }
    for (const kid of kids) el.append(kid);
    return el;
  };

  let dirty = false;
  const markDirty = () => {
    dirty = true;
    saveBtn.classList.add("dirty");
  };
  window.addEventListener("beforeunload", (e) => {
    if (dirty) { e.preventDefault(); e.returnValue = ""; }
  });

  function toast(msg) {
    const t = h("div", { class: "ed-toast" }, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), 2600);
  }

  // ---------------------------------------------------------------
  // Panel aufbauen
  // ---------------------------------------------------------------
  const inputs = new Map(); // Pfad -> Update-Funktion

  function buildField([path, label, type, a, b, c]) {
    const row = h("label", { class: "ed-row" }, h("span", { class: "ed-label" }, label));
    const onChange = (val) => { set(path, val); O.render(); markDirty(); };
    let input, sync;

    if (type === "bool") {
      input = h("input", { type: "checkbox", class: "ed-switch" });
      input.addEventListener("change", () => onChange(input.checked));
      sync = () => { input.checked = !!get(path); };
    } else if (type === "range") {
      const num = h("input", { type: "number", min: a, max: b, step: c, class: "ed-num small" });
      input = h("input", { type: "range", min: a, max: b, step: c });
      input.addEventListener("input", () => { num.value = input.value; onChange(+input.value); });
      num.addEventListener("input", () => { if (num.value !== "") { input.value = num.value; onChange(+num.value); } });
      row.classList.add("wide");
      sync = () => { input.value = get(path); num.value = get(path); };
      row.append(h("div", { class: "ed-range" }, input, num));
      sync();
      inputs.set(path, sync);
      return row;
    } else if (type === "num") {
      input = h("input", { type: "number", step: 1, class: "ed-num" });
      input.addEventListener("input", () => { if (input.value !== "") onChange(Math.round(+input.value)); });
      sync = () => { input.value = Math.round(get(path)); };
    } else if (type === "color") {
      input = h("input", { type: "color" });
      input.addEventListener("input", () => onChange(input.value));
      sync = () => { input.value = get(path); };
    } else if (type === "select") {
      input = h("select");
      for (const [v, l] of Object.entries(a)) input.append(h("option", { value: v }, l));
      input.addEventListener("change", () => onChange(input.value));
      sync = () => { input.value = get(path); };
    } else if (type === "list") {
      input = h("input", { type: "text" });
      input.addEventListener("input", () =>
        onChange(input.value.split(",").map((s) => s.trim()).filter(Boolean)));
      sync = () => { const v = get(path); input.value = Array.isArray(v) ? v.join(", ") : v; };
      row.classList.add("wide");
    } else {
      input = h("input", { type: type === "password" ? "password" : "text", spellcheck: "false" });
      input.addEventListener("input", () => onChange(input.value));
      sync = () => { input.value = get(path) ?? ""; };
      row.classList.add("wide");
    }
    row.append(input);
    sync();
    inputs.set(path, sync);
    return row;
  }

  const syncAll = () => inputs.forEach((fn) => fn());

  const panel = h("aside", { id: "ed-panel" });
  const tabBar = h("nav", { class: "ed-tabs" });
  const body = h("div", { class: "ed-body" });
  const tabEls = {};

  for (const tab of TABS) {
    const btn = h("button", { type: "button", onclick: () => showTab(tab.id) }, tab.label);
    btn.dataset.tab = tab.id;
    tabBar.append(btn);
    const pane = h("section", { class: "ed-pane" });
    for (const [title, fields] of tab.groups) {
      const grp = h("fieldset", { class: "ed-group" }, h("legend", {}, title));
      fields.forEach((f) => grp.append(buildField(f)));
      pane.append(grp);
    }
    if (tab.id === "twitch") {
      pane.append(h("p", { class: "ed-hint" },
        "Achtung: Das Token wird mit in config.js gespeichert. Datei nicht öffentlich teilen. " +
        "Im Editor wird kein Live-Chat verbunden, hier siehst du nur Beispielnachrichten."));
    }
    pane.append(h("button", { type: "button", class: "ed-btn ghost", onclick: () => resetSection(tab) },
      "↺ „" + tab.label + "“ auf Standard zurücksetzen"));
    tabEls[tab.id] = { btn, pane };
    body.append(pane);
  }

  function resetSection(tab) {
    if (!confirm(`„${tab.label}“ auf Standardwerte zurücksetzen?`)) return;
    for (const [, fields] of tab.groups) {
      for (const [path] of fields) {
        const d = getDefault(path);
        set(path, Array.isArray(d) ? [...d] : d);
      }
    }
    O.render(); syncAll(); markDirty();
  }

  function showTab(id) {
    for (const [k, { btn, pane }] of Object.entries(tabEls)) {
      btn.classList.toggle("active", k === id);
      pane.classList.toggle("active", k === id);
    }
    select(["handcam", "chat", "alert"].includes(id) ? id : null);
  }

  // Werkzeugleiste
  const saveBtn = h("button", { type: "button", class: "ed-btn primary", onclick: save }, "💾 Speichern");
  const pinBox = h("input", { type: "checkbox", class: "ed-switch" });
  pinBox.checked = true;
  pinBox.addEventListener("change", () => O.setAlertPinned(pinBox.checked));
  const gridBox = h("input", { type: "checkbox", class: "ed-switch" });
  gridBox.checked = true;
  const bgInput = h("input", { type: "file", accept: "image/*", hidden: "" });
  bgInput.addEventListener("change", () => {
    const f = bgInput.files[0];
    if (f) document.body.style.setProperty("--preview-bg", `url("${URL.createObjectURL(f)}")`);
  });

  const tools = h("div", { class: "ed-tools" },
    h("div", { class: "ed-title" }, "Overlay-Editor"),
    h("div", { class: "ed-btns" },
      saveBtn,
      h("button", { type: "button", class: "ed-btn", onclick: copyConfig }, "📋 Kopieren"),
    ),
    h("div", { class: "ed-btns" },
      h("button", { type: "button", class: "ed-btn", onclick: () => O.queueAlert("TestFollower" + Math.floor(Math.random() * 1000)) }, "▶ Alert testen"),
      h("button", { type: "button", class: "ed-btn", onclick: O.demoMessage }, "💬 Chat-Nachricht"),
    ),
    h("div", { class: "ed-btns" },
      h("button", { type: "button", class: "ed-btn ghost", onclick: () => bgInput.click() }, "🖼 Vorschau-Hintergrund"),
      h("button", { type: "button", class: "ed-btn ghost", onclick: O.clearChat }, "🧹 Chat leeren"),
    ),
    h("label", { class: "ed-row" }, h("span", { class: "ed-label" }, "Alert-Position immer zeigen"), pinBox),
    h("label", { class: "ed-row" }, h("span", { class: "ed-label" }, "Am 10px-Raster einrasten"), gridBox),
    bgInput,
  );

  panel.append(tools, tabBar, body,
    h("p", { class: "ed-hint" },
      "Tipp: Elemente in der Vorschau ziehen = verschieben, Ecke unten rechts = Größe ändern " +
      "(Shift = Seitenverhältnis halten). Pfeiltasten verschieben das ausgewählte Element um 1px, mit Shift um 10px."));
  document.body.append(panel);

  // ---------------------------------------------------------------
  // Vorschau skalieren
  // ---------------------------------------------------------------
  let scale = 1;
  const PAD = 24;
  function fit() {
    const narrow = window.innerWidth <= 800;
    const availW = (narrow ? window.innerWidth : window.innerWidth - panel.offsetWidth) - PAD * 2;
    const availH = (narrow ? window.innerHeight * 0.45 : window.innerHeight) - PAD * 2;
    scale = Math.max(0.1, Math.min(availW / 1920, availH / 1080));
    stage.style.transform = `translate(${PAD}px, ${PAD}px) scale(${scale})`;
  }
  window.addEventListener("resize", fit);

  // ---------------------------------------------------------------
  // Ziehen & Größe ändern
  // ---------------------------------------------------------------
  const ELS = ["handcam", "chat", "alert"];
  const NAMES = { handcam: "Handcam", chat: "Chat", alert: "Follow-Alert" };
  let selected = null;

  function select(key) {
    selected = key;
    for (const k of ELS) document.getElementById(k).classList.toggle("ed-selected", k === key);
  }

  const snap = (v, e) => (gridBox.checked && !e.altKey ? Math.round(v / 10) * 10 : Math.round(v));

  for (const key of ELS) {
    const el = document.getElementById(key);
    el.append(h("div", { class: "ed-tag" }, NAMES[key]));
    const handle = h("div", { class: "ed-handle", title: "Größe ändern" });
    el.append(handle);

    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const c = cfg[key];
      const isResize = e.target === handle;
      const start = { mx: e.clientX, my: e.clientY, x: c.x, y: c.y, w: c.width, h: c.height };
      const ratio = start.w / (start.h || 1);
      showTab(key);
      el.setPointerCapture(e.pointerId);

      const move = (ev) => {
        const k = key === "alert" && isResize ? scale * c.scale : scale;
        const dx = (ev.clientX - start.mx) / k;
        const dy = (ev.clientY - start.my) / k;
        if (isResize) {
          c.width = Math.max(80, snap(start.w + dx, ev));
          if (c.height !== undefined) {
            c.height = ev.shiftKey ? Math.round(c.width / ratio) : Math.max(60, snap(start.h + dy, ev));
          }
        } else {
          c.x = snap(start.x + dx, ev);
          c.y = snap(start.y + dy, ev);
        }
        O.render(); syncAll(); markDirty();
      };
      const up = () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (!selected || e.target.closest("input, select, textarea")) return;
    const step = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    cfg[selected].x += d[0];
    cfg[selected].y += d[1];
    O.render(); syncAll(); markDirty();
  });

  // ---------------------------------------------------------------
  // Speichern
  // ---------------------------------------------------------------
  function configText() {
    return "// =====================================================================\n" +
      "//  OVERLAY-KONFIGURATION\n" +
      "//  Am einfachsten bearbeitest du sie mit dem Editor: overlay.html?edit=1\n" +
      "//  (oder hier direkt die Werte ändern). Danach in OBS die Browserquelle\n" +
      "//  aktualisieren.\n" +
      "// =====================================================================\n" +
      "window.OVERLAY_CONFIG = " + JSON.stringify(cfg, null, 2) + ";\n";
  }

  let fileHandle = null;
  async function save() {
    const text = configText();
    if (window.showSaveFilePicker) {
      try {
        if (!fileHandle) {
          toast("Wähle die config.js in deinem Overlay-Ordner zum Überschreiben aus");
          fileHandle = await window.showSaveFilePicker({
            suggestedName: "config.js",
            types: [{ description: "JavaScript", accept: { "text/javascript": [".js"] } }],
          });
        }
        const w = await fileHandle.createWritable();
        await w.write(text);
        await w.close();
        dirty = false;
        saveBtn.classList.remove("dirty");
        toast("✔ Gespeichert. Jetzt in OBS die Browserquelle aktualisieren.");
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
        console.warn(err);
      }
    }
    // Fallback: Datei herunterladen
    const a = h("a", { href: URL.createObjectURL(new Blob([text], { type: "text/javascript" })), download: "config.js" });
    a.click();
    dirty = false;
    saveBtn.classList.remove("dirty");
    toast("config.js heruntergeladen. Ersetze damit die Datei im Overlay-Ordner.");
  }

  async function copyConfig() {
    try {
      await navigator.clipboard.writeText(configText());
      toast("✔ Inhalt kopiert. In config.js einfügen und speichern.");
    } catch {
      toast("Kopieren nicht möglich, nutze „Speichern“.");
    }
  }

  // ---------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------
  for (let i = 0; i < 5; i++) O.demoMessage();
  O.setAlertPinned(true);
  showTab("handcam");
  fit();
  requestAnimationFrame(fit);
})();
