// ============================================================================
// Titelbild
// ----------------------------------------------------------------------------
// Erster Bildschirm: Schriftzug, ein roter Chupa Chups als Logo und die
// Auswahl zwischen Weiterspielen und Neuanfang. Hier wird auch der Ton
// gestartet – Browser erlauben Klang erst nach einer Eingabe.
//
// Sobald die Titelmusik läuft, hängt die Lichtanlage an ihr: Moving Heads,
// Blinder und Stroboskop richten sich nach der Abspielposition des Stücks
// (trackZeit), nicht nach dem Bildzähler. Der Bildzähler driftet gegenüber
// der Audio-Uhr weg, sobald einmal ein Bild ausfällt; die Abspielposition
// nicht. Nach dem ersten Drop läuft einmal ein Roter Chupa Chups durchs Bild.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { irgendeineGedrueckt } from '../engine/input.js';
import {
  starteAudio, spieleTrack, effekt, aktuellerTrack,
  schlagDauer, beatPhase, vorlauf, trackZeit,
} from '../engine/audio.js';
import { zeichneText, textBreite } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { monSprite } from '../gfx/monsprites.js';
import { artNachName } from '../data/arten.js';
import { gibtStand } from '../engine/storage.js';
import { Auswahl } from '../ui/auswahl.js';
import { ladeSpiel } from '../game/spielstand.js';
import { ersetze } from './stapel.js';
import { Weltszene } from './welt.js';
import { Namensszene } from './namenswahl.js';

/**
 * Der Gastauftritt nach dem ersten Drop, gerechnet in Vierteln ab dem Drop.
 * Bei 168 BPM ist ein Viertel 0,357 s und ein Takt 1,43 s lang.
 *
 *   ab  2 – kommt von links ins Bild gelaufen (2 Takte)
 *   ab 10 – bleibt stehen (1 Takt)
 *   ab 14 – dreht sich um und guckt verdutzt in die Kamera (1,5 Takte)
 *   ab 20 – wippt zum Beat nach rechts aus dem Bild (3 Takte)
 */
const GAST = { start: 2, stehen: 10, gucken: 14, weiter: 20, ende: 32 };
/** Höhe, auf der der Gast läuft (Unterkante des Sprites). */
const GAST_BODEN = 104;
const GAST_GROESSE = 44;

/** Farben der Moving Heads, die pro Takt weitergeschaltet werden. */
const KOPF_FARBEN = ['64, 208, 240', '224, 64, 88', '240, 192, 64', '160, 96, 240'];

export class Titelszene {
  constructor() {
    this.bildzaehler = 0;
    this.zustand = 'warten';
    this.auswahl = null;
    /** Sprite-Art des Gastes, beim ersten Auftritt einmal geholt. */
    this.gastArt = null;
  }

  betreten() {
    this.zustand = 'warten';
  }

  aktualisieren() {
    this.bildzaehler += 1;

    if (this.zustand === 'warten') {
      if (irgendeineGedrueckt()) {
        starteAudio();
        spieleTrack('titel');
        effekt('bestaetigen');
        const eintraege = gibtStand() ? ['WEITER', 'NEUES SPIEL'] : ['NEUES SPIEL'];
        this.auswahl = new Auswahl({ eintraege });
        this.zustand = 'auswahl';
      }
      return;
    }

    const antwort = this.auswahl.aktualisieren();
    if (antwort !== 'bestaetigt') return;

    const gewaehlt = this.auswahl.eintraege[this.auswahl.index];
    if (gewaehlt === 'WEITER' && ladeSpiel()) {
      ersetze(new Weltszene());
      return;
    }

    ersetze(new Namensszene());
  }

  // --- Taktgeber --------------------------------------------------------------

  /**
   * Stand der Musik, oder null solange sie nicht läuft (vor der ersten
   * Eingabe gibt es noch keinen Audiokontext). Alle Lichteffekte fragen das
   * ab und halten still, wenn nichts läuft.
   * @returns {{ zeit: number, schlag: number, viertel: number, imDrop: boolean }|null}
   */
  takt() {
    if (aktuellerTrack() !== 'titel') return null;
    const zeit = trackZeit();
    if (zeit === null) return null;
    const schlag = schlagDauer('titel');
    return {
      zeit,
      schlag,
      viertel: (zeit - beatPhase('titel')) / schlag,
      imDrop: zeit >= vorlauf('titel'),
    };
  }

  /**
   * Abklingender Puls: 1 direkt auf dem Raster, dann linear auf 0 über
   * `laenge` Viertel. `teiler` bestimmt das Raster (1 = jedes Viertel,
   * 0.5 = Achtel, 4 = jeder Takt).
   */
  static puls(viertel, teiler, laenge) {
    if (viertel < 0) return 0;
    const seit = viertel % teiler;
    return Math.max(0, 1 - seit / laenge);
  }

  // --- Zeichnen ---------------------------------------------------------------

  zeichnen(ctx) {
    const takt = this.takt();

    ctx.fillStyle = '#12111c';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    // Grundstimmung: ohne Musik das ruhige Pulsieren wie bisher, mit Musik
    // atmet der Hintergrund im Takt.
    const puls = takt
      ? Math.max(0, 1 - (takt.viertel % 4) / 4)
      : 0.5 + 0.5 * Math.sin(this.bildzaehler / 26);
    ctx.fillStyle = `rgba(224, 64, 88, ${0.06 + puls * 0.1})`;
    ctx.fillRect(0, 0, BREITE, HOEHE);

    for (let i = 0; i < 8; i += 1) {
      const x = ((this.bildzaehler * 1.2) + i * 34) % (BREITE + 40) - 20;
      ctx.fillStyle = 'rgba(64, 208, 240, 0.07)';
      ctx.fillRect(x, 0, 10, HOEHE);
    }

    if (takt) this.zeichneMovingHeads(ctx, takt);
    this.zeichneLutscher(ctx, BREITE / 2, 62, puls);
    if (takt) this.zeichneGast(ctx, takt);
    if (takt) this.zeichneBlinder(ctx, takt);

    const titel = 'HARDTEKKMON';
    zeichneText(ctx, titel, (BREITE - textBreite(titel) * 2) / 2, 14,
      { farbe: UI.gold, schatten: '#802020' });
    // Doppelte Größe durch zweifaches Zeichnen mit Versatz wäre unscharf –
    // stattdessen steht der Untertitel klein darunter.
    const unter = 'ROTE CHUPA CHUPS';
    zeichneText(ctx, unter, (BREITE - textBreite(unter)) / 2, 26, { farbe: '#f8f8f0', schatten: '#403050' });

    // Das Stroboskop liegt über der Szene, aber unter der Schrift – sonst
    // flackert die Menüführung mit und wird unlesbar.
    if (takt) this.zeichneStroboskop(ctx, takt);

    if (this.zustand === 'warten') {
      if (Math.floor(this.bildzaehler / 26) % 2 === 0) {
        const hinweis = 'IRGENDEINE TASTE DRÜCKEN';
        zeichneText(ctx, hinweis, (BREITE - textBreite(hinweis)) / 2, HOEHE - 34, { farbe: '#f8f8f0' });
      }
    } else {
      const breite = 92;
      this.auswahl.zeichnen(ctx, (BREITE - breite) / 2, HOEHE - 52, breite,
        this.auswahl.eintraege.length * 12 + 8);
    }

    zeichneText(ctx, 'Steuerkreuz  A  B  START', 6, HOEHE - 12, { farbe: '#7a7a98' });
  }

  /**
   * Moving Heads: vier Scheinwerfer an der Oberkante, deren Lichtkegel im
   * Takt schwenken. Jeder Takt schaltet Farbe und Schwenkziel weiter, wie
   * eine laufende Lichtszene auf einer echten Anlage. Vor dem Drop stehen
   * sie ruhig und dunkel, danach fahren sie auf.
   */
  zeichneMovingHeads(ctx, takt) {
    const anzahl = 4;
    const takte = Math.floor(takt.viertel / 4);
    const imTakt = (takt.viertel % 4) / 4;
    const helligkeit = takt.imDrop ? 0.22 : 0.08;

    ctx.save();
    for (let i = 0; i < anzahl; i += 1) {
      const x = (BREITE / (anzahl + 1)) * (i + 1);
      const y = 6;

      // Schwenk: Ziel wechselt je Takt, dazwischen wird weich gefahren.
      const ziel = Math.sin((takte + i) * 2.4) * 0.7;
      const vorher = Math.sin((takte - 1 + i) * 2.4) * 0.7;
      const winkel = vorher + (ziel - vorher) * Math.min(1, imTakt * 2);

      const farbe = KOPF_FARBEN[(takte + i) % KOPF_FARBEN.length];
      // Der Kegel wird auf dem Taktschlag kurz heller.
      const stoss = Titelszene.puls(takt.viertel, 4, 1.5);
      const alpha = helligkeit * (0.55 + stoss * 0.45);

      const laenge = HOEHE + 20;
      const oeffnung = 0.17;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(winkel - oeffnung) * laenge, y + Math.cos(winkel - oeffnung) * laenge);
      ctx.lineTo(x + Math.sin(winkel + oeffnung) * laenge, y + Math.cos(winkel + oeffnung) * laenge);
      ctx.closePath();
      ctx.fillStyle = `rgba(${farbe}, ${alpha})`;
      ctx.fill();

      // Gehäuse des Scheinwerfers
      ctx.fillStyle = '#282838';
      ctx.fillRect(x - 4, 0, 8, 6);
      ctx.fillStyle = `rgba(${farbe}, ${0.5 + stoss * 0.5})`;
      ctx.fillRect(x - 3, 4, 6, 2);
    }
    ctx.restore();
  }

  /**
   * Blinder: die Reihe warmweißer Flächen an der Oberkante, die auf dem
   * Taktschlag aufblitzt. Nach dem Drop kommt die Zählzeit drei dazu, damit
   * die Reihe doppelt so oft anspringt.
   */
  zeichneBlinder(ctx, takt) {
    const aufTakt = Titelszene.puls(takt.viertel, 4, 1.1);
    const aufDrei = takt.imDrop ? Titelszene.puls(takt.viertel - 2, 4, 0.9) * 0.6 : 0;
    const staerke = Math.max(aufTakt, aufDrei);
    if (staerke <= 0.01) return;

    const lampen = 6;
    const breite = BREITE / lampen;
    ctx.save();
    for (let i = 0; i < lampen; i += 1) {
      ctx.fillStyle = `rgba(255, 240, 200, ${staerke * 0.5})`;
      ctx.fillRect(i * breite + 1, 0, breite - 2, 7);
      // Abstrahlung nach unten
      ctx.fillStyle = `rgba(255, 236, 190, ${staerke * 0.13})`;
      ctx.fillRect(i * breite + 1, 7, breite - 2, 16);
    }
    ctx.restore();
  }

  /**
   * Stroboskop: erst nach dem Drop, dann auf jedem Achtel. Bewusst nicht bis
   * zur vollen Deckkraft – das Titelbild soll blitzen, aber lesbar bleiben.
   */
  zeichneStroboskop(ctx, takt) {
    if (!takt.imDrop) return;
    const blitz = Titelszene.puls(takt.viertel, 0.5, 0.16);
    if (blitz <= 0.01) return;
    ctx.fillStyle = `rgba(248, 248, 255, ${blitz * 0.3})`;
    ctx.fillRect(0, 0, BREITE, HOEHE);
  }

  /**
   * Der Gastauftritt: Nach dem ersten Drop läuft ein Roter Chupa Chups –
   * das legendäre Hardtekkmon – von links ins Bild, bleibt stehen, guckt
   * verdutzt in die Kamera und wippt dann zum Beat weiter nach rechts.
   *
   * Beim Laufen zeigt er die Rückansicht (er zieht an uns vorbei), zum
   * Gucken dreht er sich in die Frontansicht. Der Auftritt hängt allein an
   * der Abspielposition, läuft mit jeder Schleife des Stücks also erneut.
   */
  zeichneGast(ctx, takt) {
    const seitDrop = (takt.zeit - vorlauf('titel')) / takt.schlag;
    if (seitDrop < GAST.start || seitDrop > GAST.ende) return;

    if (!this.gastArt) this.gastArt = artNachName('Roter Chupa Chups');
    if (!this.gastArt) return;

    const t = seitDrop;
    const vonLinks = -GAST_GROESSE;
    const nachRechts = BREITE + 4;
    // Weit genug links, dass der Lolli beim Stehenbleiben frei bleibt – dort
    // guckt der Gast in die Kamera, da soll das Logo lesbar bleiben.
    const halt = BREITE * 0.2;

    let x;
    let blick = 'rueck';
    let wippe = 0;
    let neigung = 0;
    let frage = 0;

    if (t < GAST.stehen) {
      // Hereinlaufen, im Takt wippend.
      const anteil = (t - GAST.start) / (GAST.stehen - GAST.start);
      x = vonLinks + (halt - vonLinks) * anteil;
      wippe = Math.abs(Math.sin(Math.PI * t)) * 3;
    } else if (t < GAST.gucken) {
      // Kurz stehen bleiben.
      x = halt;
      wippe = Math.abs(Math.sin(Math.PI * t)) * 0.8;
    } else if (t < GAST.weiter) {
      // Umdrehen und verdutzt gucken: ein kleiner Schreckmoment auf dem
      // ersten Viertel, danach steht er da und schaut.
      x = halt;
      blick = 'front';
      const seit = t - GAST.gucken;
      wippe = seit < 1 ? Math.sin(Math.PI * seit) * 5 : 0;
      neigung = seit < 1 ? Math.sin(Math.PI * seit) * 0.18 : 0.1;
      frage = Math.min(1, seit / 0.5);
    } else {
      // Wippend weiterlaufen.
      const anteil = (t - GAST.weiter) / (GAST.ende - GAST.weiter);
      x = halt + (nachRechts - halt) * anteil;
      wippe = Math.abs(Math.sin(Math.PI * t)) * 5;
      neigung = Math.sin(Math.PI * t) * 0.09;
    }

    const y = GAST_BODEN - GAST_GROESSE - wippe;
    const sprite = monSprite(this.gastArt, blick);

    ctx.save();
    ctx.translate(x + GAST_GROESSE / 2, y + GAST_GROESSE / 2);
    ctx.rotate(neigung);
    ctx.drawImage(sprite, -GAST_GROESSE / 2, -GAST_GROESSE / 2, GAST_GROESSE, GAST_GROESSE);
    ctx.restore();

    if (frage > 0) {
      // Fragezeichen über dem Kopf, damit das Verdutztsein auch auf
      // 240x160 Pixeln ankommt.
      const fx = x + GAST_GROESSE - 6;
      const fy = y - 10 + (1 - frage) * 6;
      ctx.fillStyle = '#181820';
      ctx.fillRect(fx - 2, fy - 2, 11, 14);
      ctx.fillStyle = UI.gold;
      ctx.fillRect(fx - 1, fy - 1, 9, 12);
      zeichneText(ctx, '?', fx + 1, fy + 1, { farbe: '#282838' });
    }
  }

  /** Das Wahrzeichen des Spiels: ein roter Lolli. */
  zeichneLutscher(ctx, x, y, puls) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(this.bildzaehler / 40) * 0.12);

    ctx.fillStyle = '#c8c8d8';
    ctx.fillRect(-2, 0, 4, 44);

    ctx.fillStyle = '#e8e8f0';
    ctx.beginPath();
    ctx.arc(0, -4, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgb(${210 + puls * 40}, 40, 70)`;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, -4);
      const a = (i / 5) * Math.PI * 2 + this.bildzaehler / 60;
      ctx.arc(0, -4, 24, a, a + 0.62);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-8, -14, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
