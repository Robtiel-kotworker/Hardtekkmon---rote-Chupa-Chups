// ============================================================================
// Laborfilm
// ----------------------------------------------------------------------------
// Die Erklärung des Professors läuft nicht als Textwand, sondern als kleiner
// Film: Zu jedem Textfeld gehört eine eigene Animation, und weitergeschaltet
// wird von selbst. Wer will, kann mit START abbrechen – klicken muss aber
// niemand, die Lesezeit je Abschnitt ist reichlich bemessen.
//
// Was gezeigt wird, steht in KLONFILM (siehe data/world/klonlabor.js), wie es
// gezeichnet wird in gfx/laborfilm.js. Hier läuft nur die Uhr.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import { spieleTrack, effekt } from '../engine/audio.js';
import { fenster } from '../gfx/ui.js';
import { zeichneText, umbrechen } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { monSprite } from '../gfx/monsprites.js';
import { zeichneFilmbild, eingefaerbt, BUEHNE_HOEHE } from '../gfx/laborfilm.js';
import { KLONFILM, filmdauer } from '../data/world/klonlabor.js';
import { artNachName, ARTEN } from '../data/arten.js';
import { artVon } from '../game/hardtekkmon.js';
import { spiel } from '../game/spielstand.js';
import { poppe } from './stapel.js';

const RAND = 6;
const ZEILENHOEHE = 11;
const ZEILEN = 4;
const FENSTER_HOEHE = ZEILEN * ZEILENHOEHE + 10;
const FENSTER_Y = HOEHE - FENSTER_HOEHE - 2;

/** Wie schnell sich der Text schreibt (Zeichen je Bild). */
const SCHREIBTEMPO = 1;
/** Schwarzblende zu Beginn jedes Abschnitts – der Schnitt zwischen zwei Bildern. */
const SCHNITT_BILDER = 10;

/**
 * Wessen Hardtekkmon im Film durch die Maschine geht: das erste im Team. Wer
 * noch keins hat, sieht ein beliebiges – der Ablauf bleibt derselbe.
 */
function opfer() {
  const eigenes = spiel?.team?.[0];
  if (eigenes) return artVon(eigenes);
  return artNachName('Ratz-Ronny') ?? ARTEN[0];
}

export class Laborfilmszene {
  /** @param {{ danach?: () => void }} vorgabe */
  constructor({ danach = null } = {}) {
    this.danach = danach;
    this.index = 0;
    this.zeit = 0;
    this.bildzaehler = 0;

    const art = opfer();
    const sprite = monSprite(art, 'klein');
    // Vier Fassungen desselben Hardtekkmon: das Original, das erschöpfte
    // Original, der leere Klonrohling, der grüne Scan und die Leiche.
    this.mon = {
      mon: sprite,
      monMatt: eingefaerbt(sprite, 'rgba(40, 46, 58, 0.45)', `${art.id}:matt`),
      monBlank: eingefaerbt(sprite, '#dfe6ee', `${art.id}:blank`),
      monDaten: eingefaerbt(monSprite(art, 'front'), '#48f078', `${art.id}:daten`),
      monTot: eingefaerbt(sprite, '#6a7266', `${art.id}:tot`),
      bildzaehler: 0,
    };

    this.abschnitte = KLONFILM.map((eintrag) => ({
      ...eintrag,
      zeilen: umbrechen(eintrag.text, BREITE - 2 * RAND - 8).slice(0, ZEILEN),
      dauer: filmdauer(eintrag.text),
    }));
  }

  betreten() {
    spieleTrack('laborfilm');
  }

  get abschnitt() {
    return this.abschnitte[this.index];
  }

  aktualisieren() {
    this.bildzaehler += 1;
    this.zeit += 1;
    this.mon.bildzaehler = this.bildzaehler;

    // Abbruch bleibt möglich, ist aber nirgends nötig.
    if (gedrueckt('START')) {
      this.beende();
      return;
    }

    if (this.zeit < this.abschnitt.dauer) return;

    this.index += 1;
    this.zeit = 0;
    if (this.index >= this.abschnitte.length) {
      this.beende();
      return;
    }
    effekt('auswahl');
  }

  beende() {
    poppe();
    this.danach?.();
  }

  zeichnen(ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    const laufend = this.abschnitt;
    if (!laufend) return;

    zeichneFilmbild(ctx, laufend.bild, this.zeit / laufend.dauer, this.mon);

    // Kurze Schwarzblende am Anfang jedes Abschnitts: der Schnitt.
    if (this.zeit < SCHNITT_BILDER) {
      ctx.save();
      ctx.globalAlpha = 1 - this.zeit / SCHNITT_BILDER;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, BREITE, BUEHNE_HOEHE);
      ctx.restore();
    }

    this.zeichneText(ctx, laufend);
  }

  /** Das Textfeld unten – es schreibt sich wie jeder Dialog Zeichen für Zeichen. */
  zeichneText(ctx, laufend) {
    fenster(ctx, 4, FENSTER_Y, BREITE - 8, FENSTER_HOEHE);

    let uebrig = Math.floor(Math.max(0, this.zeit - SCHNITT_BILDER) * SCHREIBTEMPO);
    laufend.zeilen.forEach((zeile, i) => {
      const sichtbar = zeile.slice(0, Math.max(0, uebrig));
      uebrig -= zeile.length;
      zeichneText(ctx, sichtbar, 4 + RAND, FENSTER_Y + 5 + i * ZEILENHOEHE, { farbe: UI.text });
    });

    // Fortschritt des Films als schmaler Streifen am unteren Rand.
    const anteil = (this.index + this.zeit / laufend.dauer) / this.abschnitte.length;
    ctx.fillStyle = UI.fensterRand;
    ctx.fillRect(4, HOEHE - 3, BREITE - 8, 2);
    ctx.fillStyle = UI.auswahl;
    ctx.fillRect(4, HOEHE - 3, Math.round((BREITE - 8) * anteil), 2);
  }
}
