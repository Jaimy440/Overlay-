(() => {
  "use strict";

  // -------------------------------------------------------------------
  // Konfiguration (config.js) + optionale URL-Parameter
  //   overlay.html?channel=xyz&token=abc&test=1
  // -------------------------------------------------------------------
  const defaults = {
    channel: "", accessToken: "", clientId: "",
    handcam: { enabled: true, x: 40, y: 40, width: 480, height: 270, label: "HANDCAM" },
    chat: { enabled: true, width: 420, maxMessages: 25, messageLifetime: 0, hideCommands: true, hideUsers: [] },
    alert: { duration: 6, sound: true, soundFile: "", volume: 0.5, text: "Danke fürs Folgen!" },
    theme: { accent: "#9146ff", accent2: "#00e5ff" },
  };
  const user = window.OVERLAY_CONFIG || {};
  const cfg = {
    ...defaults, ...user,
    handcam: { ...defaults.handcam, ...user.handcam },
    chat: { ...defaults.chat, ...user.chat },
    alert: { ...defaults.alert, ...user.alert },
    theme: { ...defaults.theme, ...user.theme },
  };
  const params = new URLSearchParams(location.search);
  if (params.get("channel")) cfg.channel = params.get("channel");
  if (params.get("token")) cfg.accessToken = params.get("token");
  if (params.get("clientId")) cfg.clientId = params.get("clientId");
  if (params.get("handcam") === "0") cfg.handcam.enabled = false;
  if (params.get("chat") === "0") cfg.chat.enabled = false;
  cfg.channel = (cfg.channel || "").trim().toLowerCase().replace(/^#/, "");
  cfg.accessToken = (cfg.accessToken || "").trim().replace(/^oauth:/i, "");

  const $ = (id) => document.getElementById(id);

  // -------------------------------------------------------------------
  // Layout anwenden
  // -------------------------------------------------------------------
  const root = document.documentElement.style;
  root.setProperty("--accent", cfg.theme.accent);
  root.setProperty("--accent2", cfg.theme.accent2);

  const cam = $("handcam");
  if (cfg.handcam.enabled) {
    Object.assign(cam.style, {
      left: cfg.handcam.x + "px", top: cfg.handcam.y + "px",
      width: cfg.handcam.width + "px", height: cfg.handcam.height + "px",
    });
    $("handcam-label-text").textContent = cfg.handcam.label;
    if (!cfg.handcam.label) cam.querySelector(".handcam-label").remove();
  } else cam.remove();

  const chatEl = $("chat");
  if (cfg.chat.enabled) chatEl.style.width = cfg.chat.width + "px";
  else chatEl.remove();

  // -------------------------------------------------------------------
  // Hilfsfunktionen
  // -------------------------------------------------------------------
  let debugTimer;
  function showError(msg) {
    console.warn("[Overlay]", msg);
    const d = $("debug");
    d.textContent = "⚠ " + msg;
    d.classList.add("visible");
    clearTimeout(debugTimer);
    debugTimer = setTimeout(() => d.classList.remove("visible"), 15000);
  }

  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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

  // -------------------------------------------------------------------
  // CHAT (Twitch IRC über WebSocket, anonym)
  // -------------------------------------------------------------------
  const chatBox = $("chat-messages");
  const hideUsers = new Set((cfg.chat.hideUsers || []).map((u) => u.toLowerCase()));

  function parseTags(raw) {
    const tags = {};
    for (const part of raw.split(";")) {
      const i = part.indexOf("=");
      const k = part.slice(0, i);
      const v = part.slice(i + 1).replace(/\\s/g, " ").replace(/\\:/g, ";").replace(/\\\\/g, "\\");
      tags[k] = v;
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
    const trailingIdx = rest.indexOf(" :");
    let trailing = null;
    if (trailingIdx !== -1) {
      trailing = rest.slice(trailingIdx + 2);
      rest = rest.slice(0, trailingIdx);
    }
    const parts = rest.split(" ").filter(Boolean);
    msg.command = parts.shift() || "";
    msg.params = parts;
    if (trailing !== null) msg.params.push(trailing);
    return msg;
  }

  // Text + Emotes -> HTML
  function renderText(text, emotesTag) {
    const chars = Array.from(text); // Twitch-Indizes zählen Unicode-Codepoints
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
      ranges.sort((a, b) => a.s - b.s);
    }
    let html = "", i = 0;
    for (const r of ranges) {
      if (r.s < i) continue;
      html += escapeHtml(chars.slice(i, r.s).join(""));
      const name = escapeHtml(chars.slice(r.s, r.e + 1).join(""));
      html += `<img class="emote" alt="${name}" src="https://static-cdn.jtvnw.net/emoticons/v2/${encodeURIComponent(r.id)}/default/dark/2.0">`;
      i = r.e + 1;
    }
    html += escapeHtml(chars.slice(i).join(""));
    return html;
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
    if (!cfg.chat.enabled) return;
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
    if (!cfg.chat.enabled) return;
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

    // Test-Befehle für Streamer/Mods
    if (isMod && /^!testfollow\b/i.test(text)) {
      const who = text.split(/\s+/)[1] || "TestFollower" + Math.floor(Math.random() * 1000);
      queueAlert(who);
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
    if (!cfg.channel || cfg.channel === "dein_kanalname") {
      showError("Kein Kanal gesetzt – trage deinen Kanalnamen in config.js ein.");
      return;
    }
    const status = $("chat-status");
    const ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
    let pingTimer;

    ws.onopen = () => {
      ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      ws.send("PASS SCHMOOPIIE");
      ws.send("NICK justinfan" + Math.floor(10000 + Math.random() * 80000));
      ws.send("JOIN #" + cfg.channel);
      pingTimer = setInterval(() => ws.readyState === 1 && ws.send("PING :tmi.twitch.tv"), 240000);
    };

    ws.onmessage = (ev) => {
      for (const line of ev.data.split("\r\n")) {
        if (!line) continue;
        const m = parseIrc(line);
        switch (m.command) {
          case "PING": ws.send("PONG :" + (m.params[0] || "tmi.twitch.tv")); break;
          case "JOIN": status && status.classList.add("online"); break;
          case "ROOMSTATE": status && status.classList.add("online"); break;
          case "PRIVMSG": handlePrivmsg(m); break;
          case "USERNOTICE": {
            const sys = m.tags["system-msg"];
            if (sys) addSystemMessage(sys);
            if (m.params[1]) handlePrivmsg({ ...m, prefix: (m.tags.login || "") + "!" });
            break;
          }
          case "CLEARCHAT": {
            const target = m.tags["target-user-id"];
            for (const el of [...chatBox.children]) {
              if (!target || el.dataset.user === target) el.remove();
            }
            break;
          }
          case "CLEARMSG": {
            const id = m.tags["target-msg-id"];
            for (const el of chatBox.querySelectorAll(".msg")) if (el.dataset.id === id) el.remove();
            break;
          }
          case "RECONNECT": ws.close(); break;
        }
      }
    };

    ws.onclose = () => {
      clearInterval(pingTimer);
      status && status.classList.remove("online");
      setTimeout(connectChat, 3000);
    };
  }

  // -------------------------------------------------------------------
  // FOLLOW-ALERT
  // -------------------------------------------------------------------
  const alertQueue = [];
  let alertBusy = false;
  const alertEl = $("alert");

  function queueAlert(name) {
    alertQueue.push(name);
    if (!alertBusy) nextAlert();
  }

  function nextAlert() {
    const name = alertQueue.shift();
    if (!name) { alertBusy = false; return; }
    alertBusy = true;
    $("alert-name").textContent = name;
    $("alert-sub").textContent = cfg.alert.text;
    alertEl.classList.remove("hide");
    // Animation neu starten
    void alertEl.offsetWidth;
    alertEl.classList.add("show");
    confetti();
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
      const angle = Math.random() * Math.PI * 2;
      const dist = 220 + Math.random() * 380;
      p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      p.style.setProperty("--dy", Math.sin(angle) * dist * 0.6 + 120 + "px");
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
        const a = new Audio(cfg.alert.soundFile);
        a.volume = cfg.alert.volume;
        a.play().catch(() => {});
        return;
      }
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      const notes = [659.25, 783.99, 987.77, 1318.51]; // E5 G5 B5 E6
      notes.forEach((f, i) => {
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

  // -------------------------------------------------------------------
  // FOLLOWS über Twitch EventSub (WebSocket)
  // -------------------------------------------------------------------
  const seenFollowers = new Set();
  const seenMessages = new Set();

  async function helix(path, opts = {}) {
    const res = await fetch("https://api.twitch.tv/helix/" + path, {
      ...opts,
      headers: {
        "Authorization": "Bearer " + cfg.accessToken,
        "Client-Id": cfg.clientId,
        "Content-Type": "application/json",
        ...(opts.headers || {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${res.status} ${body.message || res.statusText}`);
    return body;
  }

  async function startFollowAlerts() {
    if (!cfg.accessToken) {
      console.info("[Overlay] Kein accessToken gesetzt – Follow-Alerts deaktiviert (nur Test-Alerts).");
      return;
    }
    let me;
    try {
      const res = await fetch("https://id.twitch.tv/oauth2/validate", {
        headers: { Authorization: "OAuth " + cfg.accessToken },
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

    let broadcasterId = me.user_id;
    if (cfg.channel && cfg.channel !== me.login) {
      try {
        const u = await helix("users?login=" + encodeURIComponent(cfg.channel));
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
      watchdog = setTimeout(() => {
        console.warn("[Overlay] EventSub keepalive verpasst – verbinde neu");
        ws.close();
      }, keepaliveMs + 5000);
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
          if (oldSocket) {
            // Reconnect: Abos werden übernommen, alte Verbindung schließen
            oldSocket.__replaced = true;
            oldSocket.close();
            return;
          }
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
        case "session_keepalive":
          break;
        case "notification": {
          if (msg.payload.subscription.type === "channel.follow") {
            const e = msg.payload.event;
            if (seenFollowers.has(e.user_id)) return; // Follow/Unfollow-Spam ignorieren
            seenFollowers.add(e.user_id);
            queueAlert(e.user_name || e.user_login);
          }
          break;
        }
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
      // Verbindung verloren -> komplett neu verbinden & neu abonnieren
      setTimeout(() => connectEventSub("wss://eventsub.wss.twitch.tv/ws", ids), 5000);
    };
  }

  // -------------------------------------------------------------------
  // Test-Möglichkeiten
  //   - URL-Parameter ?test=1  -> Demo-Chat + Test-Follow
  //   - Taste "F" (OBS: Rechtsklick > Interagieren) -> Test-Follow
  //   - Chat-Befehl "!testfollow [name]" (Streamer/Mods)
  // -------------------------------------------------------------------
  window.testFollow = (name = "TestFollower") => queueAlert(name);
  document.addEventListener("keydown", (e) => {
    if (e.key === "f" || e.key === "F") queueAlert("TestFollower" + Math.floor(Math.random() * 1000));
  });

  function runDemo() {
    const demo = [
      { name: cfg.channel || "Streamer", color: "#9146FF", badges: "broadcaster/1", text: "Willkommen im Stream! 👋" },
      { name: "PixelPanda", color: "#00C8FF", badges: "subscriber/12", text: "Hype! Endlich wieder live 🔥" },
      { name: "ModMaxi", color: "#3DDC84", badges: "moderator/1", text: "Denkt an die Chatregeln, viel Spaß!" },
      { name: "nightowl_99", color: "", badges: "", text: "Die Handcam ist richtig nice 😄" },
      { name: "VIPVanessa", color: "#FF5CF4", badges: "vip/1", text: "GG! Kappa", emotes: "25:4-8" },
    ];
    demo.forEach((d, i) => setTimeout(() => addChatMessage(d), 400 + i * 700));
    setTimeout(() => queueAlert("NeuerFollower"), 2500);
  }

  // -------------------------------------------------------------------
  // Start
  // -------------------------------------------------------------------
  if (params.has("test")) {
    runDemo();
  } else {
    connectChat();
    startFollowAlerts();
  }
})();
