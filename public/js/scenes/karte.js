// ============================================================================
// Regionskarte
// ----------------------------------------------------------------------------
// Interaktive Übersichtskarte im Stil klassischer Handheld-Stadtpläne: eine
// senkrecht scrollende Landmasse mit allen Städten und Routen als Punkte,
// ein beweglicher Auswahlrahmen (rauf/runter zur vorigen/nächsten Station)
// und ein Infofenster mit Gig-Leiter bzw. wilden Hardtekkmon, sobald man A
// drückt. Die Landmasse selbst ist kein Kachel-Abbild der echten Karten,
// sondern ein einmalig gezeichnetes Übersichtsbild – die Stationen sitzen an
// den Koordinaten aus data/world/regionskarte.js.
// ============================================================================

import { BREITE, HOEHE, neueFlaeche } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import { effekt } from '../engine/audio.js';
import { zeichneText, textBreite, umbrechen } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { fenster, typSchild } from '../gfx/ui.js';
import { generator, zahl } from '../engine/rng.js';
import { poppe } from './stapel.js';
import { STATIONEN, KARTE_HOEHE, KARTE_BREITE } from '../data/world/regionskarte.js';
import { karte as kartendaten } from '../data/world/karten.js';
import { trainerInfo } from '../data/trainer.js';
import { artNachName } from '../data/arten.js';
import { begegnungstabelle } from '../data/world/begegnungen.js';
import { hatFlagge } from '../game/spielstand.js';

/** Wie lange eine Ablehnungsmeldung im Teleport-Modus stehen bleibt. */
const MELDUNG_BILDER = 70;

/** Sichtbare Höhe des Kartenausschnitts (Rest ist Kopf-/Fußzeile). */
const ANSICHT_HOEHE = 128;
const ANSICHT_Y = 12;

/** Innenräume und Nebenkarten zeigen auf ihre Station. */
const TEILVON = {
  haus_spieler: 'bassdorf',
  labor: 'bassdorf',
  hf_eingangshalle: 'hardtekk_city',
  hf_buero: 'hardtekk_city',
  hf_vip_suite: 'hardtekk_city',
  hf_tourbus: 'hardtekk_city',
  backstage1: 'siegesweg',
  backstage2: 'siegesweg',
  backstage3: 'siegesweg',
  backstage4: 'siegesweg',
};
/** Gig-Hallen tragen als Karten-ID dieselbe Kennung wie ihr Leiter-Trainer. */
const GIG_INNENRAUM = Object.fromEntries(
  STATIONEN.filter((s) => s.gig && s.gig !== 'champion').map((s) => [s.gig, s.id]),
);
const STATIONS_IDS = new Set(STATIONEN.map((s) => s.id));

/**
 * Ordnet eine Karten-ID ihrer Station auf der Regionskarte zu – auch für
 * Innenräume und Nebenkarten (Boxenstopp, Kiosk, Klonlabor, Wohnhaus,
 * Gig-Halle, HQ-Räume). Wird auch von welt.js benutzt, um "besucht"-Flaggen
 * zu setzen: wer in einer Stadt irgendein Gebäude betritt, gilt damit auch
 * als in der Stadt gewesen, selbst wenn die Außenkarte gerade nicht geladen
 * ist (siehe ladeKarte() in scenes/welt.js).
 */
export function stationVon(karteId) {
  if (STATIONS_IDS.has(karteId)) return karteId;
  if (GIG_INNENRAUM[karteId]) return GIG_INNENRAUM[karteId];
  if (karteId.startsWith('boxenstopp_')) return karteId.slice('boxenstopp_'.length);
  if (karteId.startsWith('kiosk_')) return karteId.slice('kiosk_'.length);
  if (karteId.startsWith('klonlabor_')) return karteId.slice('klonlabor_'.length);
  if (karteId.startsWith('haus_')) return karteId.slice('haus_'.length).replace(/_\d+$/, '');
  return TEILVON[karteId] ?? karteId;
}

/** Der Typ, der über das ganze Team eines Trainers hinweg am häufigsten vorkommt. */
function dominanterTyp(team) {
  const zaehler = new Map();
  for (const [name] of team) {
    const art = artNachName(name);
    for (const typ of art?.typen ?? []) zaehler.set(typ, (zaehler.get(typ) ?? 0) + 1);
  }
  let bester = null;
  let bestwert = -1;
  for (const [typ, wert] of zaehler) {
    if (wert > bestwert) { bester = typ; bestwert = wert; }
  }
  return bester;
}

function durchschnittsstufe(team) {
  const summe = team.reduce((acc, [, stufe]) => acc + stufe, 0);
  return Math.round(summe / team.length);
}

// --- Landmasse: einmal gezeichnet, dann als Bild wiederverwendet -------------

/** @type {HTMLCanvasElement|null} */
let landmasseCache = null;

function zeichneWegSegment(ctx, a, b, breite, farbe) {
  ctx.strokeStyle = farbe;
  ctx.lineWidth = breite;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function baueLandmasse() {
  const { canvas, ctx } = neueFlaeche(KARTE_BREITE, KARTE_HOEHE);
  const rnd = generator(20260903);

  // Wasser als Grund, mit ein paar helleren/dunkleren Streifen für Struktur.
  ctx.fillStyle = '#3868c0';
  ctx.fillRect(0, 0, KARTE_BREITE, KARTE_HOEHE);
  for (let i = 0; i < 90; i += 1) {
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,40,0.06)';
    const y = rnd() * KARTE_HOEHE;
    ctx.fillRect(0, y, KARTE_BREITE, 1 + rnd() * 2);
  }

  // Land: ein durchgehendes, unregelmäßig breites Band entlang der Reiseroute
  // – Schattenlage zuerst (Relief-Effekt), dann die helle Deckschicht, dazu
  // an jeder Station eine Rundung, damit Städte sichtbar auf festem Grund
  // liegen statt nur auf dem schmalen Band.
  for (const [dy, dx, farbe, aufschlag] of [[3, 2, '#2c6e38', 18], [0, 0, '#3c8f48', 12]]) {
    for (let i = 1; i < STATIONEN.length; i += 1) {
      const a = STATIONEN[i - 1];
      const b = STATIONEN[i];
      const breite = aufschlag + rnd() * 14;
      zeichneWegSegment(ctx, { x: a.x + dx, y: a.y + dy }, { x: b.x + dx, y: b.y + dy }, breite, farbe);
    }
    for (const s of STATIONEN) {
      ctx.fillStyle = farbe;
      ctx.beginPath();
      ctx.arc(s.x + dx, s.y + dy, (s.art === 'stadt' ? 20 : 15) + rnd() * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Deko: vereinzelte dunklere Flecken (Wald) und helle Flecken (Lichtung)
  // ausschließlich auf bereits grünen Pixeln, damit nichts ins Wasser rutscht.
  const bild = ctx.getImageData(0, 0, KARTE_BREITE, KARTE_HOEHE);
  const istLand = (x, y) => {
    if (x < 0 || y < 0 || x >= KARTE_BREITE || y >= KARTE_HOEHE) return false;
    const i = (y * KARTE_BREITE + x) * 4;
    return bild.data[i + 1] > 100 && bild.data[i] < 100; // grünlastig, wenig rot
  };
  for (let i = 0; i < 260; i += 1) {
    const x = zahl(0, KARTE_BREITE - 1, rnd);
    const y = zahl(0, KARTE_HOEHE - 1, rnd);
    if (!istLand(x, y)) continue;
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(20,60,20,0.35)' : 'rgba(140,200,110,0.3)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Die Straße selbst: verbindet die Stationen exakt, damit klar ist, wo es
  // langgeht.
  for (let i = 1; i < STATIONEN.length; i += 1) {
    zeichneWegSegment(ctx, STATIONEN[i - 1], STATIONEN[i], 3, '#d8b878');
  }

  // Stationssymbole: rote Kreise für Städte/Orte, blaue Quadrate für Routen –
  // angelehnt an die Symbolik klassischer Handheld-Stadtpläne.
  for (const s of STATIONEN) {
    if (s.art === 'stadt') {
      ctx.fillStyle = '#181820';
      ctx.beginPath(); ctx.arc(s.x, s.y, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s.gig === 'champion' ? UI.gold : '#e04058';
      ctx.beginPath(); ctx.arc(s.x, s.y, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f8f8f0';
      ctx.beginPath(); ctx.arc(s.x, s.y, 1.2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#181820';
      ctx.fillRect(s.x - 4, s.y - 4, 8, 8);
      ctx.fillStyle = '#4878c8';
      ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
    }
  }

  return canvas;
}

export class Kartenszene {
  /**
   * @param {string} [aktuelleKarte] Kennung der Karte, auf der die Weltszene gerade steht.
   * @param {{ modus?: 'ansicht'|'teleport', beiTeleport?: (zielStadtId: string) => void }} [optionen]
   *   `modus: 'teleport'` – für "Göttliche Dosis" (siehe scenes/team.js): A
   *   wählt keine Detailansicht, sondern versucht direkt zu teleportieren;
   *   nur besuchte Städte mit Boxenstopp sind gültige Ziele.
   */
  constructor(aktuelleKarte = '', optionen = {}) {
    this.bildzaehler = 0;
    this.hierId = stationVon(aktuelleKarte);
    this.index = Math.max(0, STATIONEN.findIndex((s) => s.id === this.hierId));
    this.detail = false;
    this.scrollY = this.zielScroll(this.index);
    this.modus = optionen.modus ?? 'ansicht';
    this.beiTeleport = optionen.beiTeleport ?? null;
    this.meldung = null;
    this.meldungRest = 0;

    if (!landmasseCache) landmasseCache = baueLandmasse();
    this.landmasse = landmasseCache;
  }

  zielScroll(index) {
    const y = STATIONEN[index].y;
    const roh = y - ANSICHT_HOEHE / 2;
    return Math.max(0, Math.min(KARTE_HOEHE - ANSICHT_HOEHE, roh));
  }

  aktualisieren() {
    this.bildzaehler += 1;

    if (this.meldungRest > 0) this.meldungRest -= 1;
    else if (this.meldung) this.meldung = null;

    if (this.detail) {
      if (gedrueckt('A') || gedrueckt('B')) {
        effekt('zurueck');
        this.detail = false;
      }
      return;
    }

    if (gedrueckt('UP') && this.index > 0) {
      this.index -= 1;
      effekt('auswahl');
    }
    if (gedrueckt('DOWN') && this.index < STATIONEN.length - 1) {
      this.index += 1;
      effekt('auswahl');
    }
    // Sanftes Nachziehen des Ausschnitts statt hartem Sprung.
    const ziel = this.zielScroll(this.index);
    this.scrollY += (ziel - this.scrollY) * 0.3;

    if (gedrueckt('A')) {
      if (this.modus === 'teleport') this.versucheTeleport();
      else {
        effekt('bestaetigen');
        this.detail = true;
      }
    }
    if (gedrueckt('B')) {
      effekt('zurueck');
      poppe();
    }
  }

  /** Nur besuchte Städte mit Boxenstopp (Telefon-Nummer) sind gültige Ziele. */
  versucheTeleport() {
    const station = STATIONEN[this.index];
    if (station.id === this.hierId) {
      this.zeigeMeldung('Du bist schon hier.');
      return;
    }
    if (!station.telefon || !hatFlagge(`besucht:${station.id}`)) {
      this.zeigeMeldung('Daran hat es keine Erinnerung.');
      return;
    }
    effekt('bestaetigen');
    poppe();
    this.beiTeleport?.(station.id);
  }

  zeigeMeldung(text) {
    this.meldung = text;
    this.meldungRest = MELDUNG_BILDER;
    effekt('zurueck');
  }

  // --- Zeichnen ----------------------------------------------------------------

  zeichnen(ctx) {
    ctx.fillStyle = '#12111c';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    const titel = 'REGIONSKARTE';
    zeichneText(ctx, titel, (BREITE - textBreite(titel)) / 2, 3, { farbe: UI.gold });

    const scroll = Math.round(this.scrollY);
    ctx.save();
    ctx.beginPath();
    ctx.rect((BREITE - KARTE_BREITE) / 2, ANSICHT_Y, KARTE_BREITE, ANSICHT_HOEHE);
    ctx.clip();
    ctx.drawImage(
      this.landmasse,
      0, scroll, KARTE_BREITE, ANSICHT_HOEHE,
      (BREITE - KARTE_BREITE) / 2, ANSICHT_Y, KARTE_BREITE, ANSICHT_HOEHE,
    );

    const kartenX = (BREITE - KARTE_BREITE) / 2;
    // "Du bist hier": ruhig pulsierender goldener Ring an der echten Position.
    const hier = STATIONEN.find((s) => s.id === this.hierId);
    if (hier) {
      const ringGroesse = 6 + Math.sin(this.bildzaehler / 10) * 1.5;
      ctx.strokeStyle = UI.gold;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(kartenX + hier.x, ANSICHT_Y + hier.y - scroll, ringGroesse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Auswahlrahmen: vier blinkende Eckklammern um die angewählte Station.
    const aktiv = STATIONEN[this.index];
    this.zeichneAuswahlrahmen(ctx, kartenX + aktiv.x, ANSICHT_Y + aktiv.y - scroll);

    ctx.restore();

    // Namensleiste unter der Karte, live zur Auswahl. Städte mit Boxenstopp
    // tragen ihre Telefonnummer direkt hinter dem Namen (siehe
    // scenes/telefonzelle.js).
    const rohname = kartendaten(aktiv.id)?.name ?? aktiv.id;
    const name = aktiv.telefon ? `${rohname} (${aktiv.telefon})` : rohname;
    fenster(ctx, kartenX, ANSICHT_Y + ANSICHT_HOEHE + 4, KARTE_BREITE, 12);
    zeichneText(ctx, name, kartenX + 4, ANSICHT_Y + ANSICHT_HOEHE + 7, { farbe: UI.text });
    if (aktiv.id === this.hierId) {
      const hinweis = 'HIER';
      zeichneText(ctx, hinweis, kartenX + KARTE_BREITE - textBreite(hinweis) - 4,
        ANSICHT_Y + ANSICHT_HOEHE + 7, { farbe: UI.auswahl });
    }

    if (this.meldung) {
      const breite = textBreite(this.meldung) + 8;
      const mx = (BREITE - breite) / 2;
      const my = ANSICHT_Y + ANSICHT_HOEHE - 20;
      fenster(ctx, mx, my, breite, 12, true);
      zeichneText(ctx, this.meldung, mx + 4, my + 3, { farbe: UI.auswahl });
    }

    if (this.detail) this.zeichneDetail(ctx, aktiv);
  }

  zeichneAuswahlrahmen(ctx, x, y) {
    if (Math.floor(this.bildzaehler / 15) % 2 === 1) return;
    const r = 8;
    ctx.strokeStyle = '#f8f8f0';
    ctx.lineWidth = 1.5;
    const ecke = (dx, dy) => {
      ctx.beginPath();
      ctx.moveTo(x + dx * r, y + dy * (r - 3));
      ctx.lineTo(x + dx * r, y + dy * r);
      ctx.lineTo(x + dx * (r - 3), y + dy * r);
      ctx.stroke();
    };
    ecke(-1, -1); ecke(1, -1); ecke(-1, 1); ecke(1, 1);
  }

  /** Infofenster: Gig-Leiter/Champion samt Typ und Stufe, oder Route samt Encounter-Liste. */
  zeichneDetail(ctx, station) {
    const breite = 200;
    const hoehe = 96;
    const x = (BREITE - breite) / 2;
    const y = (HOEHE - hoehe) / 2;
    fenster(ctx, x, y, breite, hoehe, true);

    const name = kartendaten(station.id)?.name ?? station.id;
    zeichneText(ctx, name, x + 6, y + 6, { farbe: UI.text });
    ctx.fillStyle = UI.fensterRandHell;
    ctx.fillRect(x + 6, y + 15, breite - 12, 1);

    const zeilen = [];
    let typ = null;
    let stufe = null;
    let rollentext = '';

    if (station.art === 'stadt') {
      if (station.gig) {
        const trainer = trainerInfo(station.gig);
        typ = dominanterTyp(trainer.team);
        stufe = durchschnittsstufe(trainer.team);
        rollentext = station.gig === 'champion' ? 'Champion' : 'Gig-Leiter';
        zeilen.push(`${rollentext}: ${trainer.name}`);
      } else {
        zeilen.push(station.id === 'bassdorf' ? 'Heimatdorf – kein Gig hier.' : 'Hauptstadt – kein Gig hier.');
      }
    } else {
      const tabelle = begegnungstabelle(station.begegnung) ?? [];
      const arten = [...new Set(tabelle.map((e) => e.art))];
      const alleStufen = tabelle.flatMap((e) => [e.min, e.max]);
      stufe = alleStufen.length
        ? Math.round(alleStufen.reduce((a, b) => a + b, 0) / alleStufen.length)
        : null;
      zeilen.push(arten.length ? `Hardtekkmon: ${arten.join(', ')}` : 'Keine wilden Begegnungen hier.');
    }

    let ty = y + 20;
    for (const zeile of umbrechen(zeilen.join(' '), breite - 12)) {
      zeichneText(ctx, zeile, x + 6, ty, { farbe: UI.text });
      ty += 10;
    }

    if (stufe !== null) {
      zeichneText(ctx, `Ø Stufe ${stufe}`, x + 6, ty + 4, { farbe: UI.textSchatten });
      ty += 14;
    }
    if (typ) {
      zeichneText(ctx, 'Typ:', x + 6, ty + 4, { farbe: UI.textSchatten });
      typSchild(ctx, typ, x + 32, ty + 3);
    }

    const hinweis = 'A/B Zurück';
    zeichneText(ctx, hinweis, x + breite - textBreite(hinweis) - 6, y + hoehe - 10, { farbe: UI.textSchatten });
  }
}
