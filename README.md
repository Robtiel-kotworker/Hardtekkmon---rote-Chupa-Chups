# Hardtekkmon – Rote Chupa Chups

Ein Rollenspiel im Stil der klassischen Handheld-Ära: 240×160  Pixel,
Kachelwelt, rundenbasierte Kämpfe, acht Bühnen und 151 Hardtekkmon.  Statt
Fangbällen fliegen **Samplepacks**, statt Orden sammelt man **Gig-Marken**,
und die Trainer heißen wie Leute, denen man um vier Uhr morgens vor einer
Halle begegnet.

Reine Client-Anwendung ohne Build-Schritt für die Web-Version: Alle
Grafiken und alle Klänge entstehen zur Laufzeit im Browser – im Repository
liegt keine einzige Bild- oder Audiodatei. Für geräteübergreifende
Spielstände gibt es ein optionales Konto (Supabase, siehe „Spielstand“
unten); npm/Capacitor kommen ausschließlich für die eigenständige iOS-App
hinzu (siehe „iOS App“) und haben mit der Web-Version nichts zu tun.

## Spielen

Das Spiel läuft im Vollbild, quer oder hoch. Über dem Bild liegen
halbtransparente Tasten wie an einem Handheld:

| Taste | Touch | Tastatur |
| --- | --- | --- |
| Laufen | Steuerkreuz | Pfeiltasten / WASD |
| Bestätigen, Ansprechen | A | X oder Leertaste |
| Abbrechen, **Rennen** | B | Y, Z oder Rücktaste |
| Hauptmenü | START | Enter |
| – | SELECT | Umschalt |

Oben rechts schalten zwei kleine Knöpfe Vollbild und Ton um. Der Ton startet
aus technischen Gründen erst nach der ersten Eingabe.

## Spielinhalt

- **151 Hardtekkmon** in 30 dreistufigen, 15 zweistufigen Reihen, 25
  Einzelgängern und 6 legendären Arten – von *Kickolaus* über *Cracky
  Koksberg* und *Jesus 2.0* bis zum *Roten Chupa Chups*.
- **111 Attacken** wie *Schrubber Kick*, *Druckgeber*, *Vollgas*,
  *7 Tage Wach* oder *Fliesentisch*.
- **12 Typen** (KICK, BASS, ACID, SCHRANZ, RAVE, KELLER, CHEMIE, VINYL,
  GLITCH, DONK, NEBEL, STROM) in einem Wirksamkeitskreis: Jeder Typ ist stark
  gegen die beiden folgenden und schwach gegen die beiden vorangehenden.
- **58 Karten**: neun Orte, neun Routen, dazu Plattenwald, Boxenberg,
  Nebelmoor, Siegesweg, Backstage-Bereich sowie Boxenstopps, Kioske,
  Wohnhäuser und die acht Gig-Bühnen.
- **66 Trainer**, darunter acht Gig-Leiter (*Fliesentisch Kalle*,
  *Zwei-Zahn Gerald*, *Augenringe Hugo*, *Pillen-Petra*, *Nebel-Norbert*,
  *Donk-Detlef*, *Glitch-Gudrun*, *Laborkittel-Ludwig*), die Vier Verstärker
  und der Chef der Szene.
- **Fangen mit Samplepacks** in vier Stufen, Kämpfe mit Zuständen
  (verkatert, weggeratzt, zugedröhnt, ausgebrannt, tiefgekühlt), Wertestufen,
  Volltreffern, Erfahrung, Entwicklungen und Tekkdex.

## Projektstruktur

```
public/                  ← einziges auf Cloudflare veröffentlichtes Verzeichnis,
│                          zugleich Capacitor-"webDir" für die iOS-App
├── index.html           Spielfläche und Tastenebene
├── manifest.webmanifest Installierbarkeit auf Mobilgeräten
├── icon.svg             App-Symbol
├── css/styles.css       Layout für Hoch- und Querformat
└── js/
    ├── main.js          Einstiegspunkt und Spielschleife
    ├── engine/          Bildschirm, Eingabe, Schleife, Zufall, Speicher, Klang, Konto
    ├── gfx/             Schrift, Kacheln, Figuren, Hardtekkmon-Sprites, Fenster
    ├── ui/              Textfenster und Auswahllisten
    ├── data/            Typen, Attacken, Arten, Gegenstände, Trainer
    │   └── world/       Kartenbaukasten, Innenräume, beide Regionen
    ├── world/           Karte zur Laufzeit, Kamera, Figurenbewegung
    ├── battle/          Formeln, Gegnerauswahl, Kampfablauf
    ├── game/            Hardtekkmon-Datensatz und Spielstand
    ├── scenes/          Titel, Welt, Kampf, Menü, Beutel, Team, Tekkdex,
    │                    Kiosk, Abspann, Beenden
    └── vendor/          lokal gebündeltes Supabase-JS-SDK (kein CDN-Zugriff
                         nötig, siehe tools/aktualisiere-supabase-js.mjs)
tools/                   Prüfwerkzeuge (laufen in Node, werden nicht ausgeliefert)
wrangler.jsonc           Cloudflare-Konfiguration (Assets-only Worker)
package.json             npm-Skripte für die iOS-App (kein Build für die Web-Version)
capacitor.config.json    App-ID, App-Name, webDir für Capacitor
ios/                     natives Xcode-Projekt (App-Name, Icon, Splash, Signing)
.github/workflows/       GitHub-Actions-Workflow für den iOS-Build (Cloud-macOS)
```

### Zwei Entscheidungen, die alles andere tragen

**Alles wird erzeugt, nichts geladen.** Kacheln, Figuren und die 151
Hardtekkmon-Sprites entstehen beim Start aus Zeichenfunktionen. Jedes
Hardtekkmon leitet Bauart, Farben, Gesicht und Zubehör aus seinem Namen ab
(`gfx/monsprites.js`); zwei automatische Durchgänge legen Schattierung und
Umriss darüber. Deshalb kommt das Spiel ohne Bilddateien aus und lädt sofort.

**Karten werden gebaut, nicht gezeichnet.** Statt Kachellisten stehen in den
Kartendateien Bauanweisungen: Fläche anlegen, Wege ziehen, Häuser setzen,
Bewuchs streuen (`data/world/bauplan.js`). Eine Karte mit 1000 Kacheln passt
so in 20 Zeilen, und die Welt bleibt trotzdem groß.

## Prüfwerkzeuge

Alle drei laufen ohne Installation, direkt mit Node:

```bash
node tools/pruefe-welt.mjs      # Karten: Übergänge, Erreichbarkeit, Figuren, Verweise
node tools/pruefe-kampf.mjs 400 # 400 Zufallskämpfe: Abbrüche, Ausnahmen, Wertebereiche
node tools/pruefe-quellen.mjs   # ungenutzte und ins Leere zeigende Importe
```

`pruefe-welt.mjs` prüft unter anderem, dass jeder Übergang auf einer
begehbaren Kachel landet, dass Türen vom Rest der Karte aus erreichbar sind
und dass jede Kartenverbindung beidseitig eingetragen ist.

## Deployment auf Cloudflare Workers

Kein Build-Prozess nötig, da reines HTML/CSS/JS. Das Projekt läuft als
**Worker mit statischen Assets** (kein Worker-Skript, daher kein `main` in
der Konfiguration).

`wrangler.jsonc` im Repo-Root:

```jsonc
{
  "name": "hardtekkmon---rote-chupa-chups",
  "compatibility_date": "2026-08-21",
  "assets": {
    "directory": "./public",
    "not_found_handling": "single-page-application"
  }
}
```

> **Wichtig:** `name` muss exakt dem Worker im Cloudflare-Dashboard
> entsprechen. Stimmt der Name nicht, lädt `wrangler versions upload` in
> einen anderen (ggf. neu angelegten) Worker hoch.

Cloudflare-Einstellungen (Workers & Pages → Worker → Settings → Build):

- **Build command:** *(leer lassen)*
- **Deploy command:** `npx wrangler versions upload`

Alternativ von Hand: `npx wrangler deploy`.

Lokal genügt ein beliebiger statischer Server, weil das Spiel ES-Module
nutzt und deshalb nicht über `file://` läuft:

```bash
cd public && python3 -m http.server 8099
# danach http://127.0.0.1:8099 öffnen
```

## Spielstand

Der Fortschritt liegt im `localStorage` des Browsers unter dem Schlüssel
`hardtekkmon-rote-chupa-chups`. Gespeichert wird über das Hauptmenü, beim
Boxenstopp und nach jedem gewonnenen Gig. Verweigert der Browser den
Speicher (privates Fenster), läuft das Spiel trotzdem – dann eben ohne
Spielstand.

Zusätzlich gibt es ein Konto (Nutzername/Passwort, ohne Verifizierung, über
Supabase) für einen Spielstand, der geräteübergreifend erreichbar ist –
Anmeldefenster beim Start, Cloud-Abgleich beim Einloggen und nach jedem
Speichern. Das Anmelden selbst braucht eine Internetverbindung; das Spiel
danach nicht mehr (siehe unten).

## iOS App

Aus demselben `public/`-Ordner entsteht über [Capacitor](https://capacitorjs.com/)
zusätzlich eine eigenständige iOS-App – kein Browser-Tab, kein Link zur
Website, sondern ein echtes, offline-fähiges App-Bundle mit eigenem Icon.
Web-Version und iOS-App laufen unabhängig nebeneinander; an Spiel,
Cloudflare-Deployment oder Gameplay ändert das nichts.

- **App-Name:** Hardtekkmon
- **Bundle-ID:** `de.robtiel.hardtekkmon`
- **Plattform:** nur iOS (Android ist nicht eingerichtet)
- **Capacitor-Version:** 8.5.0 (`@capacitor/core`, `@capacitor/ios`, `@capacitor/cli`)
- **Plugins:** keine. Das Spiel braucht keine native Funktionalität, die
  über eine WKWebView hinausgeht – zusätzliche Plugins (Splash Screen,
  Status Bar, Keyboard, App) hätten hier nichts zu tun. Splash Screen und
  Statusleistenfarbe sind rein nativ über `Info.plist`/`Assets.xcassets`
  gelöst.

### Offline-Fähigkeit

Das eigentliche Spiel – Grafik, Sound, Kämpfe, Karten, Steuerung,
lokaler Spielstand – ist zu 100 % Code, es gibt keine Bild- oder
Audiodateien im Repo. Alles davon liegt vollständig im App-Bundle und läuft
ohne Internet.

Eine Ausnahme betraf ursprünglich auch den *Start* der App: Das
Supabase-JS-SDK wurde bislang zur Laufzeit per `import` von einer CDN
(`esm.sh`) geladen. Ein CDN-Import ist ein *statischer* ES-Modul-Import –
schlägt er offline fehl, startet nicht nur das Login nicht, sondern das
komplette `main.js`-Modul gar nicht erst. Für die App wurde das SDK deshalb
lokal gebündelt (`public/js/vendor/`, per `tools/aktualisiere-supabase-js.mjs`
aktualisierbar) statt von der CDN geladen. Das Spiel selbst startet damit
in jedem Fall offline.

| Funktion | Internet nötig? | Grund |
| --- | --- | --- |
| Start, Karten, Kämpfe, Sound, Steuerung, lokaler Spielstand | Nein | vollständig im App-Bundle, keine externen Assets |
| Login/Registrierung | Ja | muss gegen Supabase Auth geprüft werden |
| Cloud-Spielstand (geräteübergreifend) | Ja | muss die Supabase-Datenbank erreichen |

Das Anmeldefenster kommt weiterhin zuerst (wie ursprünglich für die
Web-Version festgelegt) – die App braucht also beim allerersten Start
einmalig Internet, um sich anzumelden oder zu registrieren. Danach hält
Supabase die Sitzung lokal, ein erneuter Start braucht kein Internet mehr,
solange nicht abgemeldet wurde.

### Entwicklung/Installation (npm)

```bash
npm install          # Capacitor-Abhängigkeiten
npm run build         # Prüfwerkzeuge (Karten, Kämpfe, Quellen) – kein Bundling nötig
npm run ios:sync      # public/ in das iOS-Projekt übernehmen
npm run ios:open       # Xcode öffnen (braucht einen Mac – siehe unten)
```

`ios/` enthält das vollständige, native Xcode-Projekt (`ios/App`) und ist
Teil des Repos – bis auf die von `cap sync` erzeugten Kopien
(`ios/App/App/public`, `ios/App/App/capacitor.config.json`), die `ios/.gitignore`
bewusst ausschließt, weil sie bei jedem Sync neu entstehen.

### GitHub Actions (Cloud-macOS-Build)

`.github/workflows/ios-build.yml` baut die App auf einem von GitHub
gehosteten **macOS-Runner** – kein lokaler Mac nötig. Auslösbar per Push,
Pull Request oder manuell über *Actions → iOS Build → Run workflow* (auch
vom iPhone-Browser bzw. der GitHub-App aus).

Der Workflow hat zwei Stufen, je nachdem was an Secrets hinterlegt ist:

1. **Ohne Apple-Signing-Secrets:** kompiliert unsigniert, nur zur Kontrolle,
   dass das iOS-Projekt baubar bleibt. Kein installierbares Artefakt.
2. **Mit Apple-Signing-Secrets:** signiert, archiviert und exportiert eine
   `.ipa`, die als Workflow-Artefakt bereitsteht. Sind zusätzlich die
   App-Store-Connect-API-Secrets gesetzt, lädt der Workflow die `.ipa`
   danach automatisch zu **TestFlight** hoch.

Schritte im Detail: Repository auschecken → Node.js einrichten →
`npm ci` → Prüfwerkzeuge → `cap sync ios` → Swift-Package-Abhängigkeiten
auflösen (kein CocoaPods nötig – Capacitor 8 nutzt Swift Package Manager) →
(mit Secrets) signieren, archivieren, exportieren → Artefakt hochladen →
(optional) zu TestFlight hochladen.

### Voraussetzungen für signierte Builds (Apple)

Für einen echten, installierbaren Build braucht es:

- ein **Apple-Developer-Program-Konto** (99 $/Jahr) – für Signing,
  TestFlight und App Store zwingend erforderlich
- eine **App-ID** `de.robtiel.hardtekkmon`, angelegt im Apple Developer
  Portal
- ein **Distribution-Zertifikat** (.p12, mit Passwort exportiert)
- ein **Provisioning Profile** für diese App-ID (für TestFlight/App Store:
  *App Store*-Profil, kein Ad-Hoc-Profil nötig)
- die **Team-ID** (10-stellig, im Apple Developer Portal sichtbar)
- optional, für automatischen TestFlight-Upload: ein **App-Store-Connect-API-Key**
  (Key-ID, Issuer-ID, `.p8`-Datei) aus App Store Connect → Zugriff → Schlüssel

#### Benötigte GitHub Secrets

In *Settings → Secrets and variables → Actions* des Repositorys:

| Secret | Inhalt |
| --- | --- |
| `APPLE_BUILD_CERTIFICATE_BASE64` | Distribution-`.p12`, `base64 -i cert.p12 \| pbcopy` |
| `APPLE_BUILD_CERTIFICATE_PASSWORD` | Passwort des `.p12` |
| `APPLE_PROVISIONING_PROFILE_BASE64` | `.mobileprovision`, `base64 -i profile.mobileprovision \| pbcopy` |
| `APPLE_TEAM_ID` | 10-stellige Team-ID |
| `APP_STORE_CONNECT_KEY_ID` *(optional, für TestFlight-Auto-Upload)* | Key-ID des API-Keys |
| `APP_STORE_CONNECT_ISSUER_ID` *(optional)* | Issuer-ID |
| `APP_STORE_CONNECT_API_KEY_BASE64` *(optional)* | `.p8`-Datei, base64-kodiert |

Keine dieser Dateien/Werte gehört ins Repository – nur als GitHub Secret.
Der Workflow entschlüsselt sie zur Laufzeit in eine temporäre, nach dem
Lauf wieder gelöschte Keychain.

> Diese vier Basis-Secrets lassen sich vollständig über die GitHub-Web­oberfläche
> hinterlegen (auch vom iPhone-Browser aus) – das Erzeugen von Zertifikat,
> Profil und API-Key selbst braucht allerdings das Apple Developer Portal /
> App Store Connect im Browser, keinen Mac.

### .ipa, Signing und Installationswege – keine falschen Versprechen

Eine `.ipa` lässt sich **nicht** wie eine normale Datei auf ein beliebiges
iPhone kopieren und installieren – Apple verlangt in jedem Fall eine
gültige Signatur und ein passendes Provisioning. Realistische Wege ab
einer fertigen, signierten `.ipa`:

| Weg | Vom iPhone allein möglich? | Eignung |
| --- | --- | --- |
| **TestFlight** | ✅ Ja – Upload läuft in GitHub Actions, Installation über die TestFlight-App auf dem iPhone | Empfohlener Weg ohne Mac |
| Ad-Hoc-Verteilung | Nur mit zusätzlichem Hosting (Manifest-`.plist` + `itms-services://`-Link) und vorab registrierten Geräte-UDIDs | Umständlicher, kein Vorteil gegenüber TestFlight hier |
| App Store (Veröffentlichung) | ✅ Ja, nach Apple-Review | Erst sinnvoll, wenn das Spiel öffentlich erscheinen soll |

**Empfehlung:** App-Store-Connect-API-Secrets hinterlegen, Workflow einmal
laufen lassen, die App danach über die TestFlight-App auf dem eigenen
iPhone installieren. Das ist der einzige der drei Wege, der sich
vollständig ohne Mac und ohne zusätzliches Hosting durchziehen lässt.

### iPhone-only-Workflow – was geht ohne Mac

| Schritt | Status |
| --- | --- |
| Code ändern (Claude Code, GitHub-Weboberfläche/App) | 🟢 iPhone-only |
| Änderungen committen/pushen | 🟢 iPhone-only |
| Workflow auslösen (Push, PR oder manuell) | 🟢 iPhone-only |
| Node/npm-Installation, Prüfwerkzeuge, `cap sync` | ☁️ Cloud-Mac (automatisch) |
| Xcode-Build, Signing, `.ipa`-Export | ☁️ Cloud-Mac (automatisch) |
| Apple-Zertifikat/Profil/API-Key erzeugen (Apple Developer Portal / App Store Connect, im Browser) | 🟢 iPhone-only |
| Secrets in GitHub hinterlegen | 🟢 iPhone-only |
| `.ipa` über TestFlight installieren | 🟢 iPhone-only |

Kein Schritt im normalen Ablauf braucht zwingend einen lokalen Mac. Ein
Mac wäre nur nötig, falls direkt am generierten Xcode-Projekt gearbeitet
werden soll (`npm run ios:open`) – für den beschriebenen Workflow ist das
nicht erforderlich.
