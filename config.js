// =====================================================================
//  OVERLAY-KONFIGURATION
//  Am einfachsten bearbeitest du sie mit dem Editor: overlay.html?edit=1
//  (oder hier direkt die Werte ändern). Danach in OBS die Browserquelle
//  aktualisieren. Fehlende Werte werden mit Standardwerten ergänzt.
// =====================================================================
window.OVERLAY_CONFIG = {
  // Dein Twitch-Kanalname (ohne #)
  channel: "dein_kanalname",

  // OAuth-Token für Follow-Alerts (Scope: moderator:read:followers), siehe README.
  // Ohne Token funktioniert nur der Chat.
  accessToken: "",
  clientId: "", // leer = wird aus dem Token gelesen

  theme: {
    accent: "#9146ff",          // Akzentfarbe 1 (Twitch-Lila)
    accent2: "#00e5ff",         // Akzentfarbe 2 (Cyan)
    text: "#f4f2ff",
    font: "Rubik",              // Rubik | Poppins | Montserrat | Orbitron | Bebas Neue | Press Start 2P
  },

  handcam: {
    enabled: true,
    x: 40, y: 40, width: 480, height: 270,   // Position & Größe in px
    opacity: 1,                 // Deckkraft des gesamten Elements (0–1)
    background: "#000000",      // Hintergrundfarbe im Rahmen
    backgroundOpacity: 0.2,     // leicht transparent (0 = durchsichtig, 1 = deckend)
    blur: 0,                    // Weichzeichner hinter dem Hintergrund (px)
    radius: 18,                 // Eckenrundung (px)
    borderWidth: 4,             // Rahmenstärke (px)
    borderAnimation: "flow",    // flow | pulse | rainbow | none
    animationSpeed: 6,          // Sekunden pro Durchlauf
    glow: 0.5,                  // Leuchten 0–1
    corners: true,              // Eck-Akzente
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
    hideCommands: true,         // Nachrichten mit "!" ausblenden
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
    soundFile: "",              // z. B. "sounds/follow.mp3"
    volume: 0.5,
  },
};
