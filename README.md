# Hardtekkmon – Rote Chupa Chups

Ein Rollenspiel im Stil der klassischen Handheld-Ära: 240×160 Pixel,
Kachelwelt, rundenbasierte Kämpfe, acht Bühnen und 151 Hardtekkmon. Statt
Fangbällen fliegen **Samplepacks**, statt Orden sammelt man **Gig-Marken**,
und die Trainer heißen wie Leute, denen man um vier Uhr morgens vor einer
Halle begegnet.

Reine Client-Anwendung: kein Build-Schritt, kein Backend, keine
Abhängigkeiten. Alle Grafiken und alle Klänge entstehen zur Laufzeit im
Browser – im Repository liegt keine einzige Bild- oder Audiodatei.

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
public/                  ← einziges veröffentlichtes Verzeichnis
├── index.html           Spielfläche und Tastenebene
├── manifest.webmanifest Installierbarkeit auf Mobilgeräten
├── icon.svg             App-Symbol
├── css/styles.css       Layout für Hoch- und Querformat
└── js/
    ├── main.js          Einstiegspunkt und Spielschleife
    ├── engine/          Bildschirm, Eingabe, Schleife, Zufall, Speicher, Klang
    ├── gfx/             Schrift, Kacheln, Figuren, Hardtekkmon-Sprites, Fenster
    ├── ui/              Textfenster und Auswahllisten
    ├── data/            Typen, Attacken, Arten, Gegenstände, Trainer
    │   └── world/       Kartenbaukasten, Innenräume, beide Regionen
    ├── world/           Karte zur Laufzeit, Kamera, Figurenbewegung
    ├── battle/          Formeln, Gegnerauswahl, Kampfablauf
    ├── game/            Hardtekkmon-Datensatz und Spielstand
    └── scenes/          Titel, Welt, Kampf, Menü, Beutel, Team, Tekkdex,
                         Kiosk, Abspann
tools/                   Prüfwerkzeuge (laufen in Node, werden nicht ausgeliefert)
wrangler.jsonc           Cloudflare-Konfiguration (Assets-only Worker)
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
  "name": "hardtekkmon-rote-chupa-chups",
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
