# Twitch Stream Overlay für OBS

Ein Overlay (1920×1080) mit:

- **Handcam-Rahmen oben links**: animierter Neon-Rahmen mit leicht transparentem Hintergrund
- **Live-Chat** mit Twitch-, **7TV-, BTTV- und FFZ-Emotes** (inkl. Zero-Width-Emotes), Badges, Namensfarben; gelöschte Nachrichten verschwinden automatisch
- **Follow-Alert** mit Animation, Konfetti und Sound (Warteschlange bei mehreren Follows)
- **Live-Steuerung vom Handy**: Position, Größe, Transparenz, Farben, Animationen. Jede Änderung ist sofort im Stream zu sehen.

## Dateien

| Datei | Zweck |
|---|---|
| `server.js` / `start.bat` | Kleiner Server für die Live-Steuerung (nur Node.js nötig, keine Pakete) |
| `overlay.html` | Das Overlay für OBS |
| `overlay.html?edit=1` bzw. `/control` | Der Editor (PC & Handy) |
| `connect.html` | QR-Code zum Verbinden des Handys |
| `config.js` | Startwerte / Einstellungen ohne Server |
| `settings.json` | Wird vom Server angelegt: deine aktuellen Einstellungen (nicht teilen, enthält das Token) |

---

## 1. Einrichten (mit Handy-Steuerung, empfohlen)

1. **Node.js** installieren (LTS-Version): <https://nodejs.org>
2. Repo herunterladen (Code → Download ZIP) und entpacken, z. B. nach `C:\Overlay`.
3. **`start.bat` doppelklicken** (Mac/Linux: `node server.js` im Ordner ausführen).
   Es öffnet sich ein Fenster mit den Adressen und deinem Passwort. **Das Fenster offen lassen, solange du streamst.**
   Beim ersten Start fragt Windows evtl. nach der Firewall: **„Private Netzwerke“ erlauben**, sonst kann das Handy nicht verbinden.
4. **OBS:** Quellen → + → **Browser**
   - „Lokale Datei“ **nicht** anhaken
   - URL: `http://localhost:8080/overlay.html`
   - Breite **1920**, Höhe **1080**
   - „Audio über OBS steuern“ anhaken (für den Alert-Sound)
5. **Handy verbinden:** Am PC im Browser `http://localhost:8080` öffnen und den **QR-Code** mit dem Handy scannen.
   Handy und PC müssen im **gleichen WLAN** sein. Tipp: Den Link am Handy als Lesezeichen oder auf dem Homescreen speichern.
6. Im Tab **„Twitch“** deinen Kanalnamen (und das Token, siehe unten) eintragen. Das Overlay in OBS startet dann automatisch neu.

### Handy-Steuerung im Editor

- **Elemente in der Vorschau ziehen** = verschieben, **gelber Punkt** = Größe ändern
- Unten alle Einstellungen per Regler: Handcam, Chat, Alert, Design, Twitch
- **▶ Alert testen** / **💬 Chat-Nachricht**: wird direkt im OBS-Overlay abgespielt
- **🔄 OBS-Overlay neu laden**: falls mal etwas hängt
- Alles wird **automatisch gespeichert** (in `settings.json`). Ein Speichern-Button ist nicht nötig.
- Mehrere Geräte gleichzeitig (Handy + PC) bleiben synchron.

### Von unterwegs steuern (mobile Daten, anderes WLAN)

Standardmäßig ist die Steuerung nur im eigenen WLAN erreichbar. Für den Zugriff von überall:

- **Tailscale** (am einfachsten und sicher): <https://tailscale.com> auf PC und Handy installieren und mit demselben Konto anmelden.
  Dann am Handy `http://<Tailscale-IP-des-PCs>:8080/control?key=DEINPASSWORT` öffnen.
- **Cloudflare Tunnel**: `cloudflared tunnel --url http://localhost:8080` gibt dir eine öffentliche `https://….trycloudflare.com`-Adresse.
  Dort `/control?key=DEINPASSWORT` anhängen.

Über einen Tunnel braucht **jeder Zugriff das Passwort**. Ohne Passwort sind nur die Overlay-Dateien selbst erreichbar, keine Einstellungen und kein Token.

### Passwort

Wird beim ersten Start zufällig erzeugt und in `.control-password` gespeichert.
Neues Passwort: die Datei löschen und den Server neu starten. Oder ein eigenes Passwort festlegen: `set CONTROL_PASSWORD=meinpasswort` vor `node server.js`.
Anderer Port: `set PORT=9000`.

---

## 2. Token für Follow-Alerts

Twitch gibt Follows nur mit einem Token heraus (Scope `moderator:read:followers`). Chat und Emotes funktionieren auch ohne.

**Variante A (schnell):**
1. Auf <https://twitchtokengenerator.com> gehen → „Custom Scope Token“.
2. Nur **`moderator:read:followers`** auf „Yes“ → „Generate Token“ → mit deinem Streamer-Account einloggen.
3. Den **Access Token** im Editor im Tab „Twitch“ eintragen.

**Variante B (eigene Twitch-App):**
1. Auf <https://dev.twitch.tv/console/apps> eine App anlegen (OAuth Redirect URL: `http://localhost`).
2. Im Browser aufrufen (CLIENT_ID ersetzen):
   ```
   https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=CLIENT_ID&redirect_uri=http://localhost&scope=moderator:read:followers
   ```
3. Den Wert hinter `#access_token=` aus der Adresszeile im Editor eintragen.

> ⚠️ Das Token ist wie ein Passwort. `settings.json` / `config.js` mit Token nicht öffentlich hochladen.
> Läuft es ab, erscheint im Overlay unten links ein Hinweis. Dann einfach ein neues erzeugen.

---

## 3. Handcam

1. Deine Kamera als **Videoaufnahmegerät** hinzufügen.
2. In der Quellenliste **unter** die Overlay-Quelle ziehen.
3. In den Rahmen setzen. Die Position siehst du im Editor (Tab „Handcam“, X/Y/Breite/Höhe).

Der leicht transparente Hintergrund liegt als Tönung über der Kamera. Wenn du das nicht willst: „Hintergrund-Deckkraft“ auf 0.

## 4. Emotes (7TV, BTTV, FFZ)

Werden automatisch für deinen Kanal geladen, sobald der Chat verbunden ist. Globale Emotes kommen sofort, Kanal-Emotes werden alle 10 Minuten aktualisiert.
Im Editor (Tab „Chat“ → „Emotes“) kannst du jeden Anbieter einzeln abschalten und die Emote-Größe einstellen.
Zero-Width-Emotes (z. B. 7TV-Overlays) werden über das vorherige Emote gelegt.

## Testen

- Editor: **▶ Alert testen** / **💬 Chat-Nachricht**
- Im Chat als Streamer oder Mod: `!testfollow` oder `!testfollow Name`
- Demo ohne Twitch: `overlay.html?test=1`

## Ohne Server (nur lokale Datei)

Das Overlay funktioniert auch weiterhin als **lokale Datei** in OBS („Lokale Datei“ → `overlay.html`).
Die Einstellungen kommen dann aus `config.js`. Bearbeiten kannst du sie mit `overlay.html?edit=1` in Chrome/Edge (Button „💾 Speichern“ überschreibt `config.js`), danach in OBS die Quelle aktualisieren.
Die Handy-Steuerung gibt es nur mit dem Server.

## Extras

- `overlay.html?chat=0` blendet den Chat aus, `?handcam=0` die Handcam. So kannst du die Teile z. B. in verschiedenen Szenen getrennt nutzen.
