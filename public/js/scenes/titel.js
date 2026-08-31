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
// nicht. Alle 20 Sekunden läuft außerdem der Rote Chupa Chups durchs Bild –
// jedes Mal mit einer anderen Nummer (siehe GAST_AUFTRITTE).
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { BILDER_PRO_SEKUNDE } from '../engine/loop.js';
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
 * Höhe, auf der der Gast läuft (Unterkante des Sprites), und seine Größe.
 */
const GAST_BODEN = 104;
const GAST_GROESSE = 44;
/** Sekunden zwischen zwei Auftritten. */
const GAST_ABSTAND = 20;

/** Auf- und Abwippen im Takt der Musik. */
function wippen(viertel, staerke) {
  return Math.abs(Math.sin(Math.PI * viertel)) * staerke;
}

/**
 * Die Nummern des Gastes. Jede bekommt die Sekunden seit ihrem Beginn und die
 * laufende Viertelzählung der Musik und liefert zurück, wo und wie er gerade
 * steht – oder null, wenn die Nummer vorbei ist.
 *
 * Rückgabe: { x, hebe, drehung, skala, alpha, frage }
 */

/** Lustig: läuft rein, stutzt, guckt verdutzt, wippt weiter. */
function gastVerdutzt(t, viertel) {
  if (t > 9) return null;
  const halt = BREITE * 0.2;
  if (t < 2.4) {
    return { x: -GAST_GROESSE + (halt + GAST_GROESSE) * (t / 2.4), hebe: wippen(viertel, 3) };
  }
  if (t < 3.6) return { x: halt, hebe: wippen(viertel, 0.8) };
  if (t < 5.8) {
    // Schreckmoment, danach steht er da und guckt.
    const seit = t - 3.6;
    const zucken = seit < 0.5 ? Math.sin(Math.PI * seit * 2) : 0;
    return { x: halt, hebe: zucken * 5, drehung: zucken * 0.18 + 0.1, frage: Math.min(1, seit / 0.4) };
  }
  const anteil = (t - 5.8) / 3.2;
  return {
    x: halt + (BREITE + 4 - halt) * anteil,
    hebe: wippen(viertel, 5),
    drehung: Math.sin(Math.PI * viertel) * 0.09,
  };
}

/**
 * Verstörend: gleitet herein, ohne einen Schritt zu machen, bleibt stehen,
 * legt den Kopf immer weiter zur Seite und kommt dabei unmerklich näher.
 * Kein Wippen – genau das macht es unangenehm.
 */
function gastStarren(t) {
  if (t > 10) return null;
  const halt = BREITE * 0.42;
  if (t < 2.5) return { x: -GAST_GROESSE + (halt + GAST_GROESSE) * (t / 2.5) };
  if (t < 8) {
    const seit = t - 2.5;
    return { x: halt, drehung: Math.min(0.55, seit * 0.1), skala: 1 + Math.min(0.35, seit * 0.06) };
  }
  return { x: halt + (BREITE + 4 - halt) * ((t - 8) / 2), drehung: 0.55, skala: 1.35 };
}

/** Ehm, okay: kommt herein, steht da, passiert nichts, geht wieder zurück. */
function gastNichts(t, viertel) {
  if (t > 8) return null;
  const halt = BREITE * 0.26;
  if (t < 2.2) {
    return { x: -GAST_GROESSE + (halt + GAST_GROESSE) * (t / 2.2), hebe: wippen(viertel, 3) };
  }
  if (t < 5.4) return { x: halt, hebe: wippen(viertel, 1.2) };
  return { x: halt - (halt + GAST_GROESSE) * ((t - 5.4) / 2.6), hebe: wippen(viertel, 3) };
}

/** Lustig: schießt viel zu schnell durchs Bild, rutscht zurück, stutzt, weg. */
function gastSprint(t, viertel) {
  if (t > 4.2) return null;
  const mitte = BREITE * 0.36;
  if (t < 0.7) {
    return {
      x: -GAST_GROESSE + (BREITE + GAST_GROESSE * 2) * (t / 0.7),
      hebe: wippen(viertel * 2, 4),
      drehung: 0.12,
    };
  }
  if (t < 1.2) {
    // Bremst draußen und rutscht rückwärts wieder ins Bild.
    return { x: BREITE + 4 - (BREITE + 4 - mitte) * ((t - 0.7) / 0.5), drehung: -0.1 };
  }
  if (t < 2.6) {
    return { x: mitte, hebe: wippen(viertel, 1.5), frage: Math.min(1, (t - 1.2) / 0.3) };
  }
  return {
    x: mitte + (BREITE + 4 - mitte) * ((t - 2.6) / 1.6),
    hebe: wippen(viertel * 2, 4),
    drehung: 0.12,
  };
}

/**
 * Verstörend: steht ohne Vorwarnung mitten im Bild, zuckt, flackert – und ist
 * genauso unvermittelt wieder weg. Das Zittern kommt aus Sinuswerten der Zeit
 * statt aus Zufallszahlen, damit es bei jeder Bildrate gleich aussieht.
 */
function gastZucken(t) {
  if (t > 5) return null;
  const zittern = Math.sin(t * 47) * Math.sin(t * 13.3);
  return {
    x: BREITE * 0.5 - GAST_GROESSE / 2 + zittern * 3 + (Math.sin(t * 91) > 0.86 ? 6 : 0),
    hebe: Math.sin(t * 61) * 2,
    drehung: zittern * 0.09,
    alpha: Math.sin(t * 23) > 0.93 ? 0.25 : 1,
  };
}

/** Ehm, okay: läuft kopfüber durchs Bild, als wäre das völlig normal. */
function gastKopfueber(t, viertel) {
  if (t > 7) return null;
  return {
    x: -GAST_GROESSE + (BREITE + GAST_GROESSE * 2) * (t / 7),
    hebe: wippen(viertel, 3),
    drehung: Math.PI,
  };
}

/**
 * Der Reihe nach, danach wieder von vorn. Bewusst gemischt: etwas Albernes,
 * etwas Unheimliches und etwas, bei dem schlicht nichts passiert – damit der
 * Titelbildschirm nicht in eine Masche verfällt.
 */
const GAST_AUFTRITTE = [
  gastVerdutzt,   // lustig
  gastStarren,    // verstörend
  gastNichts,     // ehm, okay
  gastSprint,     // lustig
  gastZucken,     // verstörend
  gastKopfueber,  // ehm, okay
];

/** Farben der Moving Heads, die pro Takt weitergeschaltet werden. */
const KOPF_FARBEN = ['64, 208, 240', '224, 64, 88', '240, 192, 64', '160, 96, 240'];

export class Titelszene {
  constructor() {
    this.bildzaehler = 0;
    this.zustand = 'warten';
    this.auswahl = null;
    /** Sprite-Art des Gastes, beim ersten Auftritt einmal geholt. */
    this.gastArt = null;
    /**
     * Sekunden, seit die Titelmusik läuft. Läuft im Gegensatz zur
     * Abspielposition durch, statt bei jeder Schleife des Stücks wieder von
     * vorn zu beginnen – daran hängt der Takt der Gastauftritte.
     */
    this.musikZeit = 0;
  }

  betreten() {
    this.zustand = 'warten';
  }

  aktualisieren() {
    this.bildzaehler += 1;
    if (this.zustand !== 'warten') this.musikZeit += 1 / BILDER_PRO_SEKUNDE;

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
   * Der Gastauftritt: Alle 20 Sekunden läuft der Rote Chupa Chups – das
   * legendäre Haupt-Hardtekkmon – einmal durchs Bild, jedes Mal mit einer
   * anderen Nummer aus GAST_AUFTRITTE. Der erste Auftritt fällt auf den
   * ersten Drop, danach geht es im festen Abstand weiter.
   *
   * Gezählt wird in musikZeit, nicht in der Abspielposition: Die läuft bei
   * 110 s wieder von vorn los, und dann käme in jeder Schleife dieselbe
   * Nummer an derselben Stelle. Das Wippen hängt dagegen weiter am Takt.
   *
   * Es wird durchweg die Frontansicht gezeichnet – das feste Bild dieser Art
   * zeigt ohnehin nur einen Blickwinkel (siehe gfx/monsprites.js).
   */
  zeichneGast(ctx, takt) {
    const seit = this.musikZeit - vorlauf('titel');
    if (seit < 0) return;

    if (!this.gastArt) this.gastArt = artNachName('Roter Chupa Chups');
    if (!this.gastArt) return;

    const nummer = Math.floor(seit / GAST_ABSTAND);
    const auftritt = GAST_AUFTRITTE[nummer % GAST_AUFTRITTE.length];
    const stand = auftritt(seit - nummer * GAST_ABSTAND, takt.viertel);
    if (!stand) return;

    const groesse = GAST_GROESSE * (stand.skala ?? 1);
    // Der Boden bleibt der Boden, auch wenn die Nummer den Gast größer macht.
    const y = GAST_BODEN - groesse - (stand.hebe ?? 0);

    ctx.save();
    ctx.globalAlpha = stand.alpha ?? 1;
    ctx.translate(stand.x + groesse / 2, y + groesse / 2);
    if (stand.drehung) ctx.rotate(stand.drehung);
    ctx.drawImage(monSprite(this.gastArt, 'front'), -groesse / 2, -groesse / 2, groesse, groesse);
    ctx.restore();

    if (stand.frage) {
      // Fragezeichen über dem Kopf, damit das Stutzen auch auf 240x160
      // Pixeln ankommt.
      const fx = stand.x + groesse - 6;
      const fy = y - 10 + (1 - stand.frage) * 6;
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
