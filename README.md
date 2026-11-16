# Twitch Stream Overlay für OBS

Ein Overlay (1920×1080) mit:

- **Handcam-Rahmen oben links** – animierter Neon-Rahmen, die Mitte ist durchsichtig
- **Live-Chat** rechts – mit Emotes, Badges (Streamer/Mod/VIP/Sub), Namensfarben, gelöschte Nachrichten verschwinden automatisch
- **Follow-Alert** – Animation, Konfetti und Sound, sobald jemand folgt (mit Warteschlange bei mehreren Follows)

Kein Server und keine Installation nötig – nur HTML/CSS/JS.

## Dateien

| Datei | Zweck |
|---|---|
| `overlay.html` | Die Seite, die in OBS als Browserquelle eingebunden wird |
| `config.js` | **Deine Einstellungen** (Kanal, Token, Positionen, Farben, Sound) |
| `overlay.css` / `overlay.js` | Design und Logik |

## 1. Einrichten

1. Repo herunterladen (Code → Download ZIP) und entpacken, z. B. nach `C:\Overlay`.
2. `config.js` mit einem Texteditor öffnen und `channel` auf deinen Twitch-Namen setzen:
   ```js
   channel: "deinname",
   ```
   Damit läuft der Chat schon.

## 2. Token für Follow-Alerts

Twitch gibt Follows nur mit einem Token heraus (Scope `moderator:read:followers`).

**Variante A – schnell:**
1. Auf <https://twitchtokengenerator.com> gehen → „Custom Scope Token“.
2. Nur den Scope **`moderator:read:followers`** auf „Yes“ setzen → „Generate Token“ → mit deinem Streamer-Account einloggen.
3. Den **Access Token** in `config.js` bei `accessToken` eintragen.

**Variante B – eigene Twitch-App:**
1. Auf <https://dev.twitch.tv/console/apps> eine App anlegen (OAuth Redirect URL: `http://localhost`).
2. Im Browser aufrufen (CLIENT_ID ersetzen):
   ```
   https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=CLIENT_ID&redirect_uri=http://localhost&scope=moderator:read:followers
   ```
3. Nach dem Login steht in der Adresszeile `#access_token=...` – diesen Wert in `config.js` eintragen.

> ⚠️ Das Token ist wie ein Passwort: `config.js` mit Token nicht öffentlich hochladen oder zeigen.
> Tokens laufen nach einiger Zeit ab – dann erscheint unten links im Overlay ein Hinweis und du erzeugst einfach ein neues.

## 3. In OBS einbinden

1. **Quellen → + → Browser** → Name „Overlay“.
2. Haken bei **„Lokale Datei“** setzen und `overlay.html` auswählen.
3. **Breite 1920, Höhe 1080**.
4. Haken bei **„Audio über OBS steuern“** setzen, damit der Alert-Sound im Stream zu hören ist.
5. OK.

### Handcam
1. Füge deine Handcam als **Videoaufnahmegerät** hinzu.
2. Ziehe sie in der Quellenliste **unter** die Overlay-Quelle.
3. Positioniere sie im Rahmen oben links (Standard: x=40, y=40, 480×270).
   Tipp: Rechtsklick auf die Kamera → Transformieren → Transformation bearbeiten → Position/Größe genau eintragen.

Position und Größe des Rahmens änderst du in `config.js` unter `handcam`.

## Testen

- **Demo-Modus:** `overlay.html?test=1` im Browser öffnen – zeigt Beispiel-Chat und einen Test-Alert.
- **Im Chat:** Als Streamer oder Mod `!testfollow` oder `!testfollow Name` schreiben.
- **In OBS:** Rechtsklick auf die Browserquelle → **Interagieren** → Taste **F** drücken.

Nach Änderungen an `config.js`: in OBS bei der Browserquelle „Aktualisieren“ klicken.

## Anpassen (`config.js`)

| Einstellung | Bedeutung |
|---|---|
| `handcam.x / y / width / height` | Position & Größe des Handcam-Rahmens |
| `handcam.label` | Text unter dem Rahmen (`""` = ausblenden) |
| `chat.width` | Breite des Chats |
| `chat.messageLifetime` | Sekunden, bis Nachrichten verschwinden (`0` = nie) |
| `chat.hideCommands` | `!befehle` ausblenden |
| `chat.hideUsers` | Bots ausblenden |
| `alert.duration` | Anzeigedauer des Alerts in Sekunden |
| `alert.soundFile` | eigener Sound, z. B. `"sounds/follow.mp3"` (Datei in den Ordner legen) |
| `alert.volume` | Lautstärke 0.0–1.0 |
| `theme.accent / accent2` | Farben |

Einzelne Teile kannst du auch per URL abschalten, z. B. `overlay.html?chat=0` (nur Handcam + Alerts) oder `?handcam=0`.
So kannst du das Overlay z. B. mehrfach mit verschiedenen Teilen in unterschiedlichen Szenen nutzen.
