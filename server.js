// =====================================================================
//  Overlay-Server – Live-Steuerung vom Handy / aus dem Browser
//
//  Start:   node server.js            (oder start.bat doppelklicken)
//  OBS:     Browserquelle mit URL  http://localhost:8080/overlay.html
//  Handy:   QR-Code auf http://localhost:8080 scannen
//
//  Keine zusätzlichen Pakete nötig – nur Node.js (Version 18 oder neuer).
// =====================================================================
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const vm = require("vm");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 8080;
const ROOT = __dirname;
const SETTINGS_FILE = path.join(ROOT, "settings.json");
const PASS_FILE = path.join(ROOT, ".control-password");

// ---------------------------------------------------------------------
// Einstellungen laden (settings.json, beim ersten Start aus config.js)
// ---------------------------------------------------------------------
function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
  } catch {}
  try {
    const ctx = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, "config.js"), "utf8"), ctx, { timeout: 500 });
    console.log("  settings.json angelegt (Werte aus config.js übernommen)");
    return ctx.window.OVERLAY_CONFIG || {};
  } catch {
    return {};
  }
}
let settings = loadSettings();

let saveTimer;
function saveSettings() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = SETTINGS_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(settings, null, 2));
    fs.renameSync(tmp, SETTINGS_FILE);
  }, 400);
}
if (!fs.existsSync(SETTINGS_FILE)) saveSettings();

// ---------------------------------------------------------------------
// Passwort für die Steuerung
// ---------------------------------------------------------------------
let password = process.env.CONTROL_PASSWORD;
if (!password) {
  try { password = fs.readFileSync(PASS_FILE, "utf8").trim(); } catch {}
}
if (!password) {
  password = crypto.randomBytes(6).toString("base64url");
  fs.writeFileSync(PASS_FILE, password);
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Anfragen direkt vom PC (OBS, Browser am PC) brauchen kein Passwort.
// Über einen Tunnel weitergeleitete Anfragen zählen NICHT als lokal.
function isLocal(req) {
  const ip = req.socket.remoteAddress || "";
  const proxied = req.headers["x-forwarded-for"] || req.headers["cf-connecting-ip"] || req.headers["forwarded"];
  return !proxied && (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1");
}
function isAuthed(req, url) {
  if (isLocal(req)) return true;
  const key = req.headers["x-control-key"] || url.searchParams.get("key") || "";
  return key !== "" && safeEqual(key, password);
}

// ---------------------------------------------------------------------
// Live-Verbindungen (Server-Sent Events)
// ---------------------------------------------------------------------
const clients = new Set();
function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(msg);
}
setInterval(() => { for (const res of clients) res.write(": ping\n\n"); }, 25000);

// ---------------------------------------------------------------------
// Hilfen
// ---------------------------------------------------------------------
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".webm": "video/webm", ".mp4": "video/mp4",
};
const BLOCKED = new Set(["settings.json", "settings.json.tmp", ".control-password", "server.js"]);

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1e6) { reject(new Error("too large")); req.destroy(); }
    });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch (e) { reject(e); } });
  });
}

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === "IPv4" && !a.internal) out.push(a.address);
  }
  return out;
}

// ---------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;

  // ---------- API ----------
  if (p.startsWith("/api/")) {
    if (!isAuthed(req, url)) return send(res, 401, { error: "Passwort falsch oder fehlt" });

    if (p === "/api/config" && req.method === "GET") return send(res, 200, settings);

    if (p === "/api/config" && req.method === "POST") {
      try {
        const body = await readBody(req);
        if (!body.config || typeof body.config !== "object") throw new Error("config fehlt");
        settings = body.config;
        saveSettings();
        broadcast("config", { config: settings, source: body.source || null });
        return send(res, 200, { ok: true });
      } catch (e) {
        return send(res, 400, { error: e.message });
      }
    }

    if (p === "/api/action" && req.method === "POST") {
      try {
        const body = await readBody(req);
        const allowed = ["testFollow", "demoMessage", "clearChat", "reload"];
        if (!allowed.includes(body.type)) throw new Error("unbekannte Aktion");
        broadcast("action", { type: body.type, name: String(body.name || "").slice(0, 40) });
        return send(res, 200, { ok: true });
      } catch (e) {
        return send(res, 400, { error: e.message });
      }
    }

    if (p === "/api/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write("retry: 2000\n\n");
      res.write(`event: config\ndata: ${JSON.stringify({ config: settings, source: null })}\n\n`);
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    if (p === "/api/info" && isLocal(req)) {
      return send(res, 200, { port: PORT, password, lan: lanAddresses() });
    }

    return send(res, 404, { error: "not found" });
  }

  // ---------- Seiten ----------
  if (p === "/control") {
    res.writeHead(302, { Location: "/overlay.html?edit=1" + (url.search ? "&" + url.search.slice(1) : "") });
    return res.end();
  }
  if (p === "/") {
    res.writeHead(302, { Location: isLocal(req) ? "/connect.html" : "/control" });
    return res.end();
  }
  if (p === "/connect.html" && !isLocal(req)) return send(res, 403, "Nur am PC verfügbar", "text/plain");

  // config.js kann ein Token enthalten -> nur lokal ausliefern
  if (p === "/config.js" && !isLocal(req)) {
    return send(res, 200, "window.OVERLAY_CONFIG = {};", MIME[".js"]);
  }

  // ---------- statische Dateien ----------
  let rel;
  try { rel = decodeURIComponent(p).replace(/^\/+/, ""); } catch { return send(res, 400, "bad", "text/plain"); }
  const file = path.normalize(path.join(ROOT, rel));
  const base = path.basename(file);
  if (!file.startsWith(ROOT + path.sep) || base.startsWith(".") || BLOCKED.has(base) || rel.split(/[\\/]/).includes("node_modules")) {
    return send(res, 404, "Not found", "text/plain");
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, "Not found", "text/plain");
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(PORT, () => {
  const lan = lanAddresses();
  console.log("\n  ✔ Overlay-Server läuft\n");
  console.log(`  OBS-Browserquelle:   http://localhost:${PORT}/overlay.html`);
  console.log(`  Editor am PC:        http://localhost:${PORT}/control`);
  for (const ip of lan) console.log(`  Editor am Handy:     http://${ip}:${PORT}/control?key=${password}`);
  console.log(`\n  QR-Code fürs Handy:  http://localhost:${PORT}  (im PC-Browser öffnen)`);
  console.log(`  Passwort:            ${password}\n`);
  console.log("  Fenster offen lassen, solange du streamst. Beenden mit Strg+C.\n");
});
