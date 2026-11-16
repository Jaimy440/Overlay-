// =====================================================================
//  OVERLAY-KONFIGURATION – nur diese Datei musst du anpassen
// =====================================================================
window.OVERLAY_CONFIG = {
  // Dein Twitch-Kanalname (klein geschrieben, ohne #)
  channel: "dein_kanalname",

  // OAuth-Token für Follow-Alerts (ohne "oauth:" Präfix).
  // Benötigter Scope: moderator:read:followers
  // Anleitung siehe README.md. Ohne Token funktioniert nur der Chat.
  accessToken: "",

  // Client-ID der Twitch-App, mit der das Token erstellt wurde.
  // Leer lassen = wird automatisch aus dem Token ausgelesen.
  clientId: "",

  // ---- Handcam ----
  handcam: {
    enabled: true,
    x: 40,          // Abstand von links (px)
    y: 40,          // Abstand von oben (px)
    width: 480,     // Breite (px)
    height: 270,    // Höhe (px) – 16:9
    label: "HANDCAM",
  },

  // ---- Chat ----
  chat: {
    enabled: true,
    width: 420,               // Breite des Chat-Panels (px)
    maxMessages: 25,          // max. sichtbare Nachrichten
    messageLifetime: 0,       // Sekunden bis Nachricht ausblendet (0 = nie)
    hideCommands: true,       // Nachrichten mit "!" am Anfang ausblenden
    hideUsers: ["streamelements", "nightbot", "moobot"], // Bots ausblenden
  },

  // ---- Follow-Alert ----
  alert: {
    duration: 6,              // Sekunden, die der Alert sichtbar ist
    sound: true,              // eingebauter Sound
    soundFile: "",            // optional eigener Sound, z.B. "sounds/follow.mp3"
    volume: 0.5,              // 0.0 – 1.0
    text: "Danke fürs Folgen!",
  },

  // ---- Farben ----
  theme: {
    accent: "#9146ff",        // Twitch-Lila
    accent2: "#00e5ff",       // Cyan
  },
};
