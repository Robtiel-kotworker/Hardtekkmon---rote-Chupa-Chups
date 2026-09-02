// ============================================================================
// Stadtplan
// ----------------------------------------------------------------------------
// Grafische Übersichtskarte von ganz Hardtekkmon: kein Kachel-für-Kachel-Abbild
// der echten Karten, sondern eine schematische Reiseroute wie ein klassischer
// Faltplan – Stationen als Punkte, verbunden durch die tatsächliche
// Reihenfolge der Reise (siehe data/world/region_west.js und region_ost.js).
// Zwei Seiten (West/Ost), LINKS/RECHTS blättert um, B schließt.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import { effekt } from '../engine/audio.js';
import { zeichneText, textBreite } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { poppe } from './stapel.js';

/**
 * Eine Station der Reise. `karte` ist die Haupt-Kennung der Karte (für den
 * "Du bist hier"-Marker); `art` bestimmt die Punktfarbe.
 * @typedef {{ karte: string, name: string, art: 'stadt'|'hauptstadt'|'wild'|'ziel' }} Station
 */

/** @type {Station[]} */
const WEST = [
  { karte: 'bassdorf', name: 'Bassdorf', art: 'stadt' },
  { karte: 'schotterhausen', name: 'Schotterhausen', art: 'stadt' },
  { karte: 'plattenwald', name: 'Plattenwald', art: 'wild' },
  { karte: 'kellerstadt', name: 'Kellerstadt', art: 'stadt' },
  { karte: 'hardtekk_city', name: 'Hardtekk City', art: 'hauptstadt' },
  { karte: 'boxenberg', name: 'Boxenberg', art: 'wild' },
  { karte: 'subwoofer_city', name: 'Subwoofer City', art: 'stadt' },
  { karte: 'vinylhafen', name: 'Vinylhafen', art: 'stadt' },
];

/** @type {Station[]} */
const OST = [
  { karte: 'schranzheim', name: 'Schranzheim', art: 'stadt' },
  { karte: 'nebelmoor', name: 'Nebelmoor', art: 'wild' },
  { karte: 'donkhausen', name: 'Donkhausen', art: 'stadt' },
  { karte: 'glitchstadt', name: 'Glitchstadt', art: 'stadt' },
  { karte: 'siegesweg', name: 'Siegesweg', art: 'wild' },
  { karte: 'halle_der_gigs', name: 'Halle der Gigs', art: 'ziel' },
];

const SEITEN = [
  { titel: 'REGION WEST', stationen: WEST },
  { titel: 'REGION OST', stationen: OST },
];

/**
 * Innenräume und Nebenkarten zeigen auf ihre Stadt, damit der "Du bist
 * hier"-Marker auch im Boxenstopp, Kiosk oder Hauptquartier funktioniert und
 * nicht nur auf der Außenkarte selbst.
 */
const TEILVON = {
  haus_spieler: 'bassdorf', labor: 'bassdorf',
  hf_eingangshalle: 'hardtekk_city', hf_buero: 'hardtekk_city',
  hf_vip_suite: 'hardtekk_city', hf_tourbus: 'hardtekk_city',
  backstage1: 'siegesweg', backstage2: 'siegesweg', backstage3: 'siegesweg', backstage4: 'siegesweg',
};

/** Leitet aus einer beliebigen Kartenkennung die zugehörige Station ab. */
function stationsKarte(karteId) {
  if (karteId.startsWith('boxenstopp_')) return karteId.slice('boxenstopp_'.length);
  if (karteId.startsWith('kiosk_')) return karteId.slice('kiosk_'.length);
  if (karteId.startsWith('klonlabor_')) return karteId.slice('klonlabor_'.length);
  if (karteId.startsWith('haus_')) {
    const rest = karteId.slice('haus_'.length).replace(/_\d+$/, '');
    return rest;
  }
  return TEILVON[karteId] ?? karteId;
}

const FARBE = {
  stadt: '#f8f8f0',
  hauptstadt: '#f0c040',
  wild: '#48c058',
  ziel: '#e04058',
};

export class Kartenszene {
  /** @param {string} [aktuelleKarte] Kennung der Karte, auf der die Weltszene gerade steht. */
  constructor(aktuelleKarte = '') {
    this.bildzaehler = 0;
    this.hierId = stationsKarte(aktuelleKarte);
    const westIndex = WEST.findIndex((s) => s.karte === this.hierId);
    const ostIndex = OST.findIndex((s) => s.karte === this.hierId);
    this.seite = ostIndex >= 0 && westIndex < 0 ? 1 : 0;
  }

  aktualisieren() {
    this.bildzaehler += 1;
    if (gedrueckt('LEFT') || gedrueckt('RIGHT')) {
      this.seite = (this.seite + 1) % SEITEN.length;
      effekt('auswahl');
    }
    if (gedrueckt('B') || gedrueckt('A')) {
      effekt('zurueck');
      poppe();
    }
  }

  zeichnen(ctx) {
    ctx.fillStyle = '#181c2c';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    const seite = SEITEN[this.seite];
    const titel = `HARDTEKKMON – ${seite.titel}`;
    zeichneText(ctx, titel, (BREITE - textBreite(titel)) / 2, 5, { farbe: UI.gold });

    this.zeichneRoute(ctx, seite.stationen);

    const puls = Math.floor(this.bildzaehler / 20) % 2 === 0;
    if (puls) {
      const hinweis = '← → Seite   B Zurück';
      zeichneText(ctx, hinweis, (BREITE - textBreite(hinweis)) / 2, HOEHE - 12, { farbe: '#a0a0c0' });
    }
  }

  /**
   * Eine einzelne Reiseroute von oben nach unten: eine Perlenkette aus
   * Stationen, verbunden in genau der Reihenfolge, in der man ihnen im
   * Spiel begegnet. Kein Kartenausschnitt, sondern ein Faltplan – Abstand
   * und Richtung sind Layout, keine echte Geografie.
   */
  zeichneRoute(ctx, stationen) {
    const oben = 20;
    const unten = HOEHE - 22;
    const schritt = stationen.length > 1 ? (unten - oben) / (stationen.length - 1) : 0;
    const punktX = 28;
    const textX = 40;

    const punkte = stationen.map((station, i) => ({ station, x: punktX, y: oben + schritt * i }));

    ctx.strokeStyle = '#484c68';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(punktX, punkte[0].y);
    ctx.lineTo(punktX, punkte[punkte.length - 1].y);
    ctx.stroke();

    for (const { station, y } of punkte) {
      const hier = station.karte === this.hierId;
      const radius = station.art === 'hauptstadt' ? 5 : 3.5;

      if (hier) {
        const ringGroesse = radius + 3 + Math.sin(this.bildzaehler / 8) * 1.5;
        ctx.strokeStyle = UI.auswahl;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(punktX, y, ringGroesse, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = FARBE[station.art];
      ctx.beginPath();
      ctx.arc(punktX, y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (station.art === 'hauptstadt') {
        // Kleiner dunkler Kern: die Hauptstadt sticht schon farblich heraus,
        // damit ist auf einen Blick klar, warum.
        ctx.fillStyle = '#181c2c';
        ctx.fillRect(punktX - 2, y - 1, 4, 2);
      }

      zeichneText(ctx, station.name, textX, y - 3, { farbe: hier ? UI.auswahl : '#d0d0e0' });
      if (hier) {
        const markierung = 'DU BIST HIER';
        zeichneText(ctx, markierung, BREITE - textBreite(markierung) - 4, y - 3, { farbe: UI.auswahl });
      }
    }
  }
}
