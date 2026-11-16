(() => {
  "use strict";

  // ===================================================================
  // STANDARDWERTE – alles hier ist über config.js / den Editor änderbar
  // ===================================================================
  const DEFAULTS = {
    channel: "",
    accessToken: "",
    clientId: "",

    theme: {
      accent: "#9146ff",
      accent2: "#00e5ff",
      text: "#f4f2ff",
      font: "Rubik",
    },

    handcam: {
      enabled: true,
      x: 40, y: 40, width: 480, height: 270,
      opacity: 1,                 // Deckkraft des ganzen Elements
      background: "#000000",      // Hintergrundfarbe im Rahmen
      backgroundOpacity: 0.2,     // leicht transparent
      blur: 0,                    // Weichzeichner hinter dem Hintergrund (px)
      radius: 18,
      borderWidth: 4,
      borderAnimation: "flow",    // flow | pulse | rainbow | none
      animationSpeed: 6,          // Sekunden pro Durchlauf
      glow: 0.5,                  // 0 – 1
      corners: true,
      label: "HANDCAM",
      labelPosition: "bottom",    // bottom | top | none
    },

    chat: {
      enabled: true,
      x: 1460, y: 40, width: 420, height: 1000,
      opacity: 1,
      background: "#0e0c18",
      backgroundOpacity: 0.72,
      blur: 6,
      radius: 18,
      shadow: true,
      border: true,
      showHeader: true,
      headerText: "CHAT",
      fontSize: 19,
      messageBackground: "#ffffff",
      messageOpacity: 0.05,
      animation: "slide",         // slide | fade | pop | up | none
      showBadges: true,
      maxMessages: 25,
      messageLifetime: 0,         // Sekunden bis Nachricht verschwindet (0 = nie)
      hideCommands: true,
      hideUsers: ["streamelements", "nightbot", "moobot"],
    },

    alert: {
      x: 660, y: 120, width: 600,
      scale: 1,
      opacity: 1,
      background: "#181030",
      backgroundOpacity: 0.95,
      glow: true,
      animation: "bounce",        // bounce | drop | left | right | zoom | flip | fade | none
      animationSpeed: 0.7,        // Sekunden
      duration: 6,                // Sekunden sichtbar
      confetti: true,
      showIcon: true,
      iconAnimation: true,
      title: "NEUER FOLLOWER",
      text: "Danke fürs Folgen!", // {name} wird durch den Namen ersetzt
      sound: true,
      soundFile: "",
      volume: 0.5,
    },
  };

  // ===================================================================
  // Konfiguration zusammenführen
  // ===================================================================
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  function merge(base, over) {
    const out = Array.isArray(base) ? [...base] : { ...base };
    for (const k in over) {
      out[k] = isObj(base[k]) && isObj(over[k]) ? merge(base[k], over[k]) : over[k];
    }
    return out;
  }

  const cfg = merge(DEFAULTS, window.OVERLAY_CONFIG || {});
  const params = new URLSearchParams(location.search);
  if (params.get("channel")) cfg.channel = params.get("channel");
  if (params.get("token")) cfg.accessToken = params.get("token");
  if (params.get("clientId")) cfg.clientId = params.get("clientId");
  if (params.get("handcam") === "0") cfg.handcam.enabled = false;
  if (params.get("chat") === "0") cfg.chat.enabled = false;
  const EDIT = params.has("edit");
  const TEST = params.has("test");

  const $ = (id) => document.getElementById(id);
  const chatBox = $("chat-messages");
  const alertEl = $("alert");

  function rgba(hex, a) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    const n = m ? parseInt(m[1], 16) : 0;
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const px = (v) => v + "px";

  // ===================================================================
  // RENDER – wendet die komplette Konfiguration auf das Overlay an.
  // Wird beim Start und bei jeder Änderung im Editor aufgerufen.
  // ===================================================================
  function render() {
    const t = cfg.theme, h = cfg.handcam, c = cfg.chat, a = cfg.alert;
    const root = document.documentElement.style;
    root.setProperty("--accent", t.accent);
    root.setProperty("--accent2", t.accent2);
    root.setProperty("--text", t.text);
    root.setProperty("--font", `"${t.font}"`);

    // ---- Handcam ----
    const cam = $("handcam");
    cam.hidden = !h.enabled;
    Object.assign(cam.style, {
      left: px(h.x), top: px(h.y), width: px(h.width), height: px(h.height), opacity: h.opacity,
    });
    cam.style.setProperty("--hc-bg", rgba(h.background, h.backgroundOpacity));
    cam.style.setProperty("--hc-blur", px(h.blur));
    cam.style.setProperty("--hc-radius", px(h.radius));
    cam.style.setProperty("--hc-border", px(h.borderWidth));
    cam.style.setProperty("--hc-speed", h.animationSpeed + "s");
    cam.style.setProperty("--hc-glow", h.glow);
    cam.className = cam.className.replace(/\banim-\S+/g, "").trim() + " anim-" + h.borderAnimation;
    cam.classList.toggle("no-corners", !h.corners);
    cam.classList.toggle("label-top", h.labelPosition === "top");
    cam.classList.toggle("no-label", !h.label || h.labelPosition === "none");
    $("handcam-label-text").textContent = h.label;

    // ---- Chat ----
    const chat = $("chat");
    chat.hidden = !c.enabled;
    Object.assign(chat.style, {
      left: px(c.x), top: px(c.y), width: px(c.width), height: px(c.height), opacity: c.opacity,
    });
    chat.style.setProperty("--chat-bg", rgba(c.background, c.backgroundOpacity));
    chat.style.setProperty("--chat-blur", px(c.blur));
    chat.style.setProperty("--chat-radius", px(c.radius));
    chat.style.setProperty("--chat-font", px(c.fontSize));
    chat.style.setProperty("--msg-bg", rgba(c.messageBackground, c.messageOpacity));
    chat.className = chat.className.replace(/\banim-\S+/g, "").trim() + " anim-" + c.animation;
    chat.classList.toggle("no-header", !c.showHeader);
    chat.classList.toggle("no-badges", !c.showBadges);
    chat.classList.toggle("has-shadow", !!c.shadow);
    chat.classList.toggle("no-border", !c.border);
    $("chat-title").textContent = c.headerText;
    while (chatBox.children.length > c.maxMessages) chatBox.firstElementChild.remove();
    hideUsers = new Set((Array.isArray(c.hideUsers) ? c.hideUsers : String(c.hideUsers).split(","))
      .map((u) => u.trim().toLowerCase()).filter(Boolean));

    // ---- Alert ----
    Object.assign(alertEl.style, {
      left: px(a.x), top: px(a.y), width: px(a.width), opacity: a.opacity, scale: String(a.scale),
    });
    alertEl.style.setProperty("--alert-bg", rgba(a.background, a.backgroundOpacity));
    alertEl.style.setProperty("--alert-speed", a.animationSpeed + "s");
    alertEl.className = alertEl.className.replace(/\banim-\S+/g, "").trim() + " anim-" + a.animation;
    alertEl.classList.toggle("no-glow", !a.glow);
    alertEl.classList.toggle("no-icon", !a.showIcon);
    alertEl.classList.toggle("icon-anim", !!a.iconAnimation);
    $("alert-title").textContent = a.title;
    if (alertEl.classList.contains("pinned")) fillAlert("BeispielName");
  }

  function fillAlert(name) {
    $("alert-name").textContent = name;
    $("alert-sub").textContent = cfg.alert.text.replace(/\{name\}/g, name);
  }

  // ===================================================================
  // Hilfsfunktionen
  // ===================================================================
  let debugTimer;
  function showError(msg) {
    console.warn("[Overlay]", msg);
    const d = $("debug");
    d.textContent = "⚠ " + msg;
    d.classList.add("visible");
    clearTimeout(debugTimer);
    debugTimer = setTimeout(() => d.classList.remove("visible"), 15000);
  }

  const escapeHtml = (s) => s.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  const fallbackColors = ["#FF4A80", "#FF7A00", "#FFD000", "#3DDC84", "#00C8FF", "#8C7CFF", "#FF5CF4", "#00E5B0"];
  function colorFor(name) {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return fallbackColors[h % fallbackColors.length];
  }

  // Sehr dunkle Namensfarben auf dunklem Hintergrund aufhellen
  function readable(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return null;
    const n = parseInt(m[1], 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum < 90) {
      const f = 90 / Math.max(lum, 1);
      r = Math.min(255, r * f + 40); g = Math.min(255, g * f + 40); b = Math.min(255, b * f + 40);
      return `rgb(${r | 0},${g | 0},${b | 0})`;
    }
    return "#" + m[1];
  }

  // ===================================================================
  // CHAT (Twitch IRC über WebSocket, anonym – kein Login nötig)
  // ===================================================================
  let hideUsers = new Set();

  function parseTags(raw) {
    const tags = {};
    for (const part of raw.split(";")) {
      const i = part.indexOf("=");
      tags[part.slice(0, i)] = part.slice(i + 1)
        .replace(/\\s/g, " ").replace(/\\:/g, ";").replace(/\\\\/g, "\\");
    }
    return tags;
  }

  function parseIrc(line) {
    const msg = { tags: {}, prefix: "", command: "", params: [] };
    let rest = line;
    if (rest.startsWith("@")) {
      const sp = rest.indexOf(" ");
      msg.tags = parseTags(rest.slice(1, sp));
      rest = rest.slice(sp + 1);
    }
    if (rest.startsWith(":")) {
      const sp = rest.indexOf(" ");
      msg.prefix = rest.slice(1, sp);
      rest = rest.slice(sp + 1);
    }
    const ti = rest.indexOf(" :");
    let trailing = null;
    if (ti !== -1) { trailing = rest.slice(ti + 2); rest = rest.slice(0, ti); }
    const parts = rest.split(" ").filter(Boolean);
    msg.command = parts.shift() || "";
    msg.params = parts;
    if (trailing !== null) msg.params.push(trailing);
    return msg;
  }

  function renderText(text, emotesTag) {
    const chars = Array.from(text); // Twitch zählt Unicode-Codepoints
    const ranges = [];
    if (emotesTag) {
      for (const e of emotesTag.split("/")) {
        const [id, pos] = e.split(":");
        if (!pos) continue;
        for (const p of pos.split(",")) {
          const [s, en] = p.split("-").map(Number);
          ranges.push({ id, s, e: en });
        }
      }
      ranges.sort((x, y) => x.s - y.s);
    }
    let html = "", i = 0;
    for (const r of ranges) {
      if (r.s < i) continue;
      html += escapeHtml(chars.slice(i, r.s).join(""));
      const name = escapeHtml(chars.slice(r.s, r.e + 1).join(""));
      html += `<img class="emote" alt="${name}" src="https://static-cdn.jtvnw.net/emoticons/v2/${encodeURIComponent(r.id)}/default/dark/2.0">`;
      i = r.e + 1;
    }
    return html + escapeHtml(chars.slice(i).join(""));
  }

  const badgeLabels = { broadcaster: "★", moderator: "MOD", vip: "VIP", subscriber: "SUB" };
  function renderBadges(tag) {
    if (!tag) return "";
    return tag.split(",").map((b) => b.split("/")[0])
      .filter((b) => badgeLabels[b])
      .map((b) => `<span class="badge ${b}">${badgeLabels[b]}</span>`).join("");
  }

  function addChatNode(node) {
    chatBox.appendChild(node);
    while (chatBox.children.length > cfg.chat.maxMessages) chatBox.firstElementChild.remove();
    if (cfg.chat.messageLifetime > 0) {
      setTimeout(() => {
        node.classList.add("out");
        setTimeout(() => node.remove(), 450);
      }, cfg.chat.messageLifetime * 1000);
    }
  }

  function addChatMessage({ name, color, badges, text, emotes, userId, msgId, action, highlight }) {
    const el = document.createElement("div");
    el.className = "msg" + (action ? " action" : "") + (highlight ? " highlight" : "");
    el.dataset.user = userId || "";
    el.dataset.id = msgId || "";
    el.style.setProperty("--user-color", readable(color) || colorFor(name));
    el.innerHTML =
      `<span class="meta">${renderBadges(badges)}<span class="name">${escapeHtml(name)}</span></span>` +
      `<span class="text">${renderText(text, emotes)}</span>`;
    addChatNode(el);
  }

  function addSystemMessage(text) {
    const el = document.createElement("div");
    el.className = "msg system";
    el.textContent = text;
    addChatNode(el);
  }

  function handlePrivmsg(m) {
    const t = m.tags;
    let text = m.params[1] || "";
    const login = m.prefix.split("!")[0];
    const name = t["display-name"] || login;
    let action = false;
    const am = /^\u0001ACTION (.*)\u0001$/.exec(text);
    if (am) { text = am[1]; action = true; }

    const badges = t.badges || "";
    const isMod = /(^|,)(broadcaster|moderator)\//.test(badges);

    if (isMod && /^!testfollow\b/i.test(text)) {
      queueAlert(text.split(/\s+/)[1] || "TestFollower" + Math.floor(Math.random() * 1000));
      return;
    }
    if (hideUsers.has(login.toLowerCase())) return;
    if (cfg.chat.hideCommands && text.startsWith("!")) return;

    addChatMessage({
      name, color: t.color, badges, text, emotes: t.emotes,
      userId: t["user-id"], msgId: t.id, action,
      highlight: t["msg-id"] === "highlighted-message",
    });
  }

  function connectChat() {
    const channel = (cfg.channel || "").trim().toLowerCase().replace(/^#/, "");
    if (!channel || channel === "dein_kanalname") {
      showError("Kein Kanal gesetzt – trage deinen Kanalnamen in config.js ein (oder im Editor).");
      return;
    }
    const status = $("chat-status");
    const ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
    let pingTimer;

    ws.onopen = () => {
      ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      ws.send("PASS SCHMOOPIIE");
      ws.send("NICK justinfan" + Math.floor(10000 + Math.random() * 80000));
      ws.send("JOIN #" + channel);
      pingTimer = setInterval(() => ws.readyState === 1 && ws.send("PING :tmi.twitch.tv"), 240000);
    };

    ws.onmessage = (ev) => {
      for (const line of ev.data.split("\r\n")) {
        if (!line) continue;
        const m = parseIrc(line);
        switch (m.command) {
          case "PING": ws.send("PONG :" + (m.params[0] || "tmi.twitch.tv")); break;
          case "JOIN":
          case "ROOMSTATE": status.classList.add("online"); break;
          case "PRIVMSG": handlePrivmsg(m); break;
          case "USERNOTICE": {
            const sys = m.tags["system-msg"];
            if (sys) addSystemMessage(sys);
            if (m.params[1]) handlePrivmsg({ ...m, prefix: (m.tags.login || "") + "!" });
            break;
          }
          case "CLEARCHAT": {
            const target = m.tags["target-user-id"];
            for (const el of [...chatBox.children]) if (!target || el.dataset.user === target) el.remove();
            break;
          }
          case "CLEARMSG": {
            const id = m.tags["target-msg-id"];
            for (const el of [...chatBox.children]) if (el.dataset.id === id) el.remove();
            break;
          }
          case "RECONNECT": ws.close(); break;
        }
      }
    };

    ws.onclose = () => {
      clearInterval(pingTimer);
      status.classList.remove("online");
      setTimeout(connectChat, 3000);
    };
  }

  // ===================================================================
  // FOLLOW-ALERT
  // ===================================================================
  const alertQueue = [];
  let alertBusy = false;
  let alertPinned = false; // Editor: Alert dauerhaft zeigen

  function setAlertPinned(on) {
    alertPinned = on;
    if (!alertBusy) {
      alertEl.classList.toggle("pinned", on);
      if (on) fillAlert("BeispielName");
    }
  }

  function queueAlert(name) {
    alertQueue.push(name);
    if (!alertBusy) nextAlert();
  }

  function nextAlert() {
    const name = alertQueue.shift();
    if (!name) {
      alertBusy = false;
      if (alertPinned) setAlertPinned(true);
      return;
    }
    alertBusy = true;
    alertEl.classList.remove("pinned", "hide", "show");
    fillAlert(name);
    void alertEl.offsetWidth; // Animation neu starten
    alertEl.classList.add("show");
    if (cfg.alert.confetti) confetti();
    playSound();
    setTimeout(() => {
      alertEl.classList.add("hide");
      setTimeout(() => {
        alertEl.classList.remove("show", "hide");
        setTimeout(nextAlert, 600);
      }, 550);
    }, cfg.alert.duration * 1000);
  }

  function confetti() {
    const burst = alertEl.querySelector(".alert-burst");
    burst.innerHTML = "";
    const colors = [cfg.theme.accent, cfg.theme.accent2, "#ffffff", "#ffd000", "#ff4a80"];
    for (let i = 0; i < 60; i++) {
      const p = document.createElement("i");
      const ang = Math.random() * Math.PI * 2;
      const dist = 220 + Math.random() * 380;
      p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      p.style.setProperty("--dy", Math.sin(ang) * dist * 0.6 + 120 + "px");
      p.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = Math.random() * 0.2 + "s";
      p.style.width = p.style.height = 6 + Math.random() * 8 + "px";
      burst.appendChild(p);
    }
  }

  let audioCtx;
  function playSound() {
    if (!cfg.alert.sound) return;
    try {
      if (cfg.alert.soundFile) {
        const au = new Audio(cfg.alert.soundFile);
        au.volume = cfg.alert.volume;
        au.play().catch(() => {});
        return;
      }
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      [659.25, 783.99, 987.77, 1318.51].forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = "triangle";
        o.frequency.value = f;
        const t = now + i * 0.11;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(cfg.alert.volume * 0.4, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        o.connect(g).connect(audioCtx.destination);
        o.start(t);
        o.stop(t + 0.65);
      });
    } catch (e) { /* Sound ist optional */ }
  }

  // ===================================================================
  // FOLLOWS über Twitch EventSub (WebSocket)
  // ===================================================================
  const seenFollowers = new Set();
  const seenMessages = new Set();
  const token = () => (cfg.accessToken || "").trim().replace(/^oauth:/i, "");

  async function helix(path, opts = {}) {
    const res = await fetch("https://api.twitch.tv/helix/" + path, {
      ...opts,
      headers: {
        "Authorization": "Bearer " + token(),
        "Client-Id": cfg.clientId,
        "Content-Type": "application/json",
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${res.status} ${body.message || res.statusText}`);
    return body;
  }

  async function startFollowAlerts() {
    if (!token()) {
      console.info("[Overlay] Kein accessToken – Follow-Alerts aus (nur Test-Alerts).");
      return;
    }
    let me;
    try {
      const res = await fetch("https://id.twitch.tv/oauth2/validate", {
        headers: { Authorization: "OAuth " + token() },
      });
      if (!res.ok) throw new Error("Token ungültig oder abgelaufen");
      me = await res.json();
    } catch (e) {
      showError("Follow-Alerts: " + e.message + ". Bitte neues Token erzeugen (siehe README).");
      return;
    }
    if (!cfg.clientId) cfg.clientId = me.client_id;
    if (!(me.scopes || []).includes("moderator:read:followers")) {
      showError("Token fehlt der Scope 'moderator:read:followers' – Follow-Alerts gehen nicht.");
      return;
    }
    const channel = (cfg.channel || "").trim().toLowerCase().replace(/^#/, "");
    let broadcasterId = me.user_id;
    if (channel && channel !== me.login) {
      try {
        const u = await helix("users?login=" + encodeURIComponent(channel));
        if (u.data && u.data[0]) broadcasterId = u.data[0].id;
      } catch (e) { showError("Kanal nicht gefunden: " + e.message); return; }
    }
    connectEventSub("wss://eventsub.wss.twitch.tv/ws", { broadcasterId, moderatorId: me.user_id });
  }

  function connectEventSub(url, ids, oldSocket) {
    const ws = new WebSocket(url);
    let keepaliveMs = 15000;
    let watchdog;
    let replaced = false;

    const armWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => ws.close(), keepaliveMs + 5000);
    };

    ws.onmessage = async (ev) => {
      armWatchdog();
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      const meta = msg.metadata || {};
      if (seenMessages.has(meta.message_id)) return;
      seenMessages.add(meta.message_id);
      if (seenMessages.size > 500) seenMessages.clear();

      switch (meta.message_type) {
        case "session_welcome": {
          const session = msg.payload.session;
          keepaliveMs = (session.keepalive_timeout_seconds || 10) * 1000;
          armWatchdog();
          if (oldSocket) { oldSocket.__replaced = true; oldSocket.close(); return; }
          try {
            await helix("eventsub/subscriptions", {
              method: "POST",
              body: JSON.stringify({
                type: "channel.follow",
                version: "2",
                condition: { broadcaster_user_id: ids.broadcasterId, moderator_user_id: ids.moderatorId },
                transport: { method: "websocket", session_id: session.id },
              }),
            });
            console.info("[Overlay] Follow-Alerts aktiv");
          } catch (e) {
            showError("Follow-Abo fehlgeschlagen: " + e.message +
              " (Token muss vom Streamer oder einem Mod des Kanals stammen)");
          }
          break;
        }
        case "notification":
          if (msg.payload.subscription.type === "channel.follow") {
            const e = msg.payload.event;
            if (seenFollowers.has(e.user_id)) return; // Follow/Unfollow-Spam ignorieren
            seenFollowers.add(e.user_id);
            queueAlert(e.user_name || e.user_login);
          }
          break;
        case "session_reconnect":
          replaced = true;
          connectEventSub(msg.payload.session.reconnect_url, ids, ws);
          break;
        case "revocation":
          showError("Follow-Abo wurde von Twitch widerrufen: " + msg.payload.subscription.status);
          break;
      }
    };

    ws.onclose = () => {
      clearTimeout(watchdog);
      if (ws.__replaced || replaced) return;
      setTimeout(() => connectEventSub("wss://eventsub.wss.twitch.tv/ws", ids), 5000);
    };
  }

  // ===================================================================
  // Demo-Nachrichten (Test- und Editor-Modus)
  // ===================================================================
  const DEMO = [
    { name: "Streamer", color: "#9146FF", badges: "broadcaster/1", text: "Willkommen im Stream! 👋" },
    { name: "PixelPanda", color: "#00C8FF", badges: "subscriber/12", text: "Hype! Endlich wieder live 🔥" },
    { name: "ModMaxi", color: "#3DDC84", badges: "moderator/1", text: "Denkt an die Chatregeln, viel Spaß!" },
    { name: "nightowl_99", color: "", badges: "", text: "Die Handcam ist richtig nice 😄" },
    { name: "VIPVanessa", color: "#FF5CF4", badges: "vip/1", text: "GG! Kappa", emotes: "25:4-8" },
    { name: "LaraLurkt", color: "#FFD000", badges: "subscriber/3", text: "Wie heißt der Song gerade?" },
  ];
  let demoIdx = 0;
  const demoMessage = () => addChatMessage(DEMO[demoIdx++ % DEMO.length]);

  // ===================================================================
  // Tests
  //   ?test=1                 -> Demo-Chat + Test-Follow
  //   Taste "F"               -> Test-Follow (OBS: Rechtsklick > Interagieren)
  //   !testfollow [name]      -> im Chat (Streamer/Mods)
  // ===================================================================
  window.testFollow = (name = "TestFollower") => queueAlert(name);
  document.addEventListener("keydown", (e) => {
    if (EDIT && e.target.closest && e.target.closest("input, select, textarea")) return;
    if (e.key === "f" || e.key === "F") queueAlert("TestFollower" + Math.floor(Math.random() * 1000));
  });

  // API für den Editor
  window.Overlay = {
    cfg, DEFAULTS, merge, render, queueAlert, demoMessage, setAlertPinned,
    clearChat: () => { chatBox.innerHTML = ""; },
  };

  render();

  if (EDIT) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "editor.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "editor.js";
    document.body.appendChild(js);
  } else if (TEST) {
    DEMO.forEach((_, i) => setTimeout(demoMessage, 400 + i * 700));
    setTimeout(() => queueAlert("NeuerFollower"), 2500);
  } else {
    if (cfg.chat.enabled) connectChat();
    startFollowAlerts();
  }
})();
