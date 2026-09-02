// ============================================================================
// Fahrstuhl
// ----------------------------------------------------------------------------
// Die Fahrt zwischen Boxenstopp und Klonlabor. Drei Abschnitte, die ineinander
// übergehen: die Türen schließen, die Kabine fährt (Ruckeln, Stockwerksanzeige
// und der Schacht, der durch die Seitenfenster vorbeizieht), die Türen öffnen
// sich wieder. Danach meldet sich die Szene mit `danach` zurück – den
// Kartenwechsel macht die Weltszene (siehe starteFahrstuhl in scenes/welt.js).
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import {
  effekt, spieleTrack, starteZusatzschleife, stoppeZusatzschleife,
} from '../engine/audio.js';
import { zeichneText, textBreite } from '../gfx/font.js';
import { poppe } from './stapel.js';

const SCHLIESSEN = 34;
const FAHRT = 104;
const OEFFNEN = 34;
const GESAMT = SCHLIESSEN + FAHRT + OEFFNEN;

/** Türöffnung in der Kabinenmitte. */
const TUER = { x: 76, y: 34, breite: 88, hoehe: 104 };
/** Die beiden Schachtfenster links und rechts. */
const FENSTER = [{ x: 14, y: 44, breite: 40, hoehe: 84 }, { x: 186, y: 44, breite: 40, hoehe: 84 }];

/** Stockwerke, die während der Fahrt durchlaufen werden. */
const STOCKWERKE = ['EG', '-1', '-2', '-3', 'UG'];

export class Fahrstuhlszene {
  /** @param {{ richtung?: 'runter'|'hoch', danach?: () => void }} vorgabe */
  constructor({ richtung = 'runter', danach = null } = {}) {
    this.richtung = richtung;
    this.danach = danach;
    this.zeit = 0;
    this.geklingelt = false;
  }

  betreten() {
    effekt('zurueck');
    // Die Fahrstuhlmusik ist exakt auf die Dauer der Fahrt gekürzt (siehe
    // 'fahrstuhl' in engine/audio.js) und läuft einmal glatt durch. Das
    // Quietschen liegt als eigene Schleife gleichzeitig obendrauf.
    spieleTrack('fahrstuhl');
    starteZusatzschleife('quietsch');
  }

  /** Die Zusatzschleife läuft nur während der Fahrt – sie stoppt selbst dann, wenn die Szene je vorzeitig verlassen würde. */
  verlassen() {
    stoppeZusatzschleife();
  }

  aktualisieren() {
    this.zeit += 1;

    // Ein Gong, sobald die Kabine steht und die Türen aufgehen.
    if (!this.geklingelt && this.zeit >= SCHLIESSEN + FAHRT) {
      this.geklingelt = true;
      effekt('fahrstuhl');
    }

    if (this.zeit >= GESAMT) {
      poppe();
      this.danach?.();
    }
  }

  /** 1 = ganz offen, 0 = geschlossen. */
  tuerOeffnung() {
    if (this.zeit < SCHLIESSEN) return 1 - this.zeit / SCHLIESSEN;
    if (this.zeit < SCHLIESSEN + FAHRT) return 0;
    return (this.zeit - SCHLIESSEN - FAHRT) / OEFFNEN;
  }

  /** Fährt die Kabine gerade? */
  faehrt() {
    return this.zeit >= SCHLIESSEN && this.zeit < SCHLIESSEN + FAHRT;
  }

  /** Aktuelles Stockwerk, abhängig von Fahrtrichtung und Fortschritt. */
  stockwerk() {
    const anteil = Math.min(1, Math.max(0, (this.zeit - SCHLIESSEN) / FAHRT));
    const stufe = Math.min(STOCKWERKE.length - 1, Math.floor(anteil * STOCKWERKE.length));
    return this.richtung === 'runter'
      ? STOCKWERKE[stufe]
      : STOCKWERKE[STOCKWERKE.length - 1 - stufe];
  }

  zeichnen(ctx) {
    // Während der Fahrt ruckelt die ganze Kabine leicht.
    const ruckeln = this.faehrt() && Math.floor(this.zeit / 3) % 2 === 0 ? 1 : 0;
    ctx.save();
    ctx.translate(0, ruckeln);

    this.zeichneKabine(ctx);
    for (const fenster of FENSTER) this.zeichneSchachtfenster(ctx, fenster);
    this.zeichneTuer(ctx);
    this.zeichneAnzeige(ctx);

    ctx.restore();
  }

  zeichneKabine(ctx) {
    ctx.fillStyle = '#20242e';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    // Wandpaneele mit senkrechten Fugen.
    ctx.fillStyle = '#586470';
    ctx.fillRect(0, 12, BREITE, HOEHE - 30);
    ctx.fillStyle = '#68737f';
    for (let x = 4; x < BREITE; x += 24) ctx.fillRect(x, 14, 20, HOEHE - 34);

    // Handlauf
    ctx.fillStyle = '#c8ccd8';
    ctx.fillRect(0, 96, BREITE, 3);
    ctx.fillStyle = '#98a0ac';
    ctx.fillRect(0, 99, BREITE, 2);

    // Boden und Decke
    ctx.fillStyle = '#3a4450';
    ctx.fillRect(0, HOEHE - 18, BREITE, 18);
    ctx.fillStyle = '#2a3038';
    ctx.fillRect(0, HOEHE - 18, BREITE, 2);
    ctx.fillStyle = '#2a3038';
    ctx.fillRect(0, 0, BREITE, 12);

    // Deckenleuchte samt Lichtkegel
    ctx.fillStyle = '#fff0b0';
    ctx.fillRect(BREITE / 2 - 26, 4, 52, 5);
    ctx.fillStyle = 'rgba(255, 240, 176, 0.12)';
    ctx.beginPath();
    ctx.moveTo(BREITE / 2 - 26, 9);
    ctx.lineTo(BREITE / 2 + 26, 9);
    ctx.lineTo(BREITE / 2 + 70, HOEHE - 18);
    ctx.lineTo(BREITE / 2 - 70, HOEHE - 18);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Durch die Seitenfenster zieht der Schacht vorbei: helle Streifen, die sich
   * beim Herunterfahren nach oben schieben und beim Hochfahren nach unten.
   */
  zeichneSchachtfenster(ctx, fenster) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(fenster.x, fenster.y, fenster.breite, fenster.hoehe);
    ctx.clip();

    ctx.fillStyle = '#12141a';
    ctx.fillRect(fenster.x, fenster.y, fenster.breite, fenster.hoehe);

    if (this.faehrt()) {
      const tempo = 6;
      const versatz = (this.zeit - SCHLIESSEN) * tempo;
      const abstand = 26;
      const laufweite = this.richtung === 'runter' ? -versatz : versatz;
      for (let i = -1; i < fenster.hoehe / abstand + 2; i += 1) {
        const y = fenster.y + ((i * abstand + (laufweite % abstand) + abstand * 4) % (fenster.hoehe + abstand * 2)) - abstand;
        ctx.fillStyle = '#6a7280';
        ctx.fillRect(fenster.x, y, fenster.breite, 3);
        ctx.fillStyle = '#f0d878';
        ctx.fillRect(fenster.x + fenster.breite / 2 - 3, y - 1, 6, 5);
      }
    } else {
      // Steht die Kabine, sieht man nur die Schachtwand.
      ctx.fillStyle = '#2a3038';
      for (let y = fenster.y + 6; y < fenster.y + fenster.hoehe; y += 22) {
        ctx.fillRect(fenster.x, y, fenster.breite, 2);
      }
    }

    ctx.restore();

    // Rahmen
    ctx.strokeStyle = '#98a0ac';
    ctx.lineWidth = 2;
    ctx.strokeRect(fenster.x - 1, fenster.y - 1, fenster.breite + 2, fenster.hoehe + 2);
  }

  zeichneTuer(ctx) {
    const offen = this.tuerOeffnung();

    // Türöffnung: dahinter der dunkle Schacht bzw. das Stockwerk.
    ctx.fillStyle = '#0c0e12';
    ctx.fillRect(TUER.x, TUER.y, TUER.breite, TUER.hoehe);
    if (offen > 0.05) {
      // Ein Streifen Licht von draußen, sobald die Türen aufgehen.
      ctx.fillStyle = 'rgba(240, 216, 120, 0.18)';
      ctx.fillRect(TUER.x, TUER.y, TUER.breite, TUER.hoehe);
    }

    const fluegel = TUER.breite / 2;
    const versatz = Math.round(offen * fluegel);

    ctx.fillStyle = '#9098a8';
    ctx.fillRect(TUER.x - versatz, TUER.y, fluegel, TUER.hoehe);
    ctx.fillRect(TUER.x + fluegel + versatz, TUER.y, fluegel, TUER.hoehe);

    // Kanten und Griffe, damit die Flügel als Flügel lesbar bleiben.
    ctx.fillStyle = '#c8ccd8';
    ctx.fillRect(TUER.x - versatz, TUER.y, fluegel, 2);
    ctx.fillRect(TUER.x + fluegel + versatz, TUER.y, fluegel, 2);
    ctx.fillStyle = '#6a7280';
    ctx.fillRect(TUER.x - versatz + fluegel - 6, TUER.y + 46, 3, 14);
    ctx.fillRect(TUER.x + fluegel + versatz + 3, TUER.y + 46, 3, 14);

    // Türrahmen
    ctx.strokeStyle = '#c8ccd8';
    ctx.lineWidth = 2;
    ctx.strokeRect(TUER.x - 1, TUER.y - 1, TUER.breite + 2, TUER.hoehe + 2);
  }

  /** Stockwerksanzeige über der Tür, mit Pfeil in Fahrtrichtung. */
  zeichneAnzeige(ctx) {
    const breite = 60;
    const x = BREITE / 2 - breite / 2;
    const y = 14;

    ctx.fillStyle = '#12161a';
    ctx.fillRect(x, y, breite, 16);
    ctx.fillStyle = '#0c2412';
    ctx.fillRect(x + 2, y + 2, breite - 4, 12);

    const pfeil = this.richtung === 'runter' ? '▼' : '▲';
    const text = `${pfeil} ${this.stockwerk()}`;
    zeichneText(ctx, text, x + (breite - textBreite(text)) / 2, y + 5, { farbe: '#48f078' });
  }
}
