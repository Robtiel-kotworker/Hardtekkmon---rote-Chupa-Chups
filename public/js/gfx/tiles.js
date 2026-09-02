// ============================================================================
// Kacheln
// ----------------------------------------------------------------------------
// Der komplette Kachelsatz wird beim Start gezeichnet statt geladen: jede
// Kachel ist eine kleine Zeichenfunktion auf 16x16 Pixeln. Von Kacheln mit
// `varianten` entstehen mehrere Fassungen, die anhand der Kartenposition
// ausgewählt werden – so wirkt eine große Wiesenfläche nicht gestempelt.
// ============================================================================

import { neueFlaeche } from '../engine/screen.js';
import { generator } from '../engine/rng.js';
import { WELT } from './palette.js';
import { heller } from './farbwerkzeug.js';

export const KACHEL = 16;

/** @typedef {CanvasRenderingContext2D} Ctx */

/** Kleine Zeichenhilfen, damit die Kacheldefinitionen kurz bleiben. */
function flaeche(ctx, farbe) {
  ctx.fillStyle = farbe;
  ctx.fillRect(0, 0, KACHEL, KACHEL);
}

function kasten(ctx, farbe, x, y, breite, hoehe) {
  ctx.fillStyle = farbe;
  ctx.fillRect(x, y, breite, hoehe);
}

/** Streut `anzahl` Pixel gleichmäßig über die Kachel. */
function sprenkeln(ctx, rnd, farbe, anzahl, groesse = 1) {
  ctx.fillStyle = farbe;
  for (let i = 0; i < anzahl; i += 1) {
    const x = Math.floor(rnd() * KACHEL);
    const y = Math.floor(rnd() * KACHEL);
    ctx.fillRect(x, y, groesse, groesse);
  }
}

/** Ein Grasbüschel als Dreieck aus drei Strichen. */
function bueschel(ctx, farbe, x, y, hoehe) {
  ctx.fillStyle = farbe;
  ctx.fillRect(x, y - hoehe, 1, hoehe);
  ctx.fillRect(x - 1, y - hoehe + 2, 1, hoehe - 2);
  ctx.fillRect(x + 1, y - hoehe + 2, 1, hoehe - 2);
}

function baumKrone(ctx, rnd, hell, mittel, dunkel) {
  kasten(ctx, mittel, 1, 0, 14, 12);
  kasten(ctx, dunkel, 0, 2, 16, 8);
  kasten(ctx, mittel, 2, 1, 12, 10);
  kasten(ctx, hell, 3, 1, 6, 4);
  sprenkeln(ctx, rnd, dunkel, 10);
  sprenkeln(ctx, rnd, hell, 6);
  kasten(ctx, WELT.stamm, 6, 11, 4, 5);
  kasten(ctx, '#4a3018', 9, 11, 1, 5);
}

/**
 * Kacheldefinitionen.
 * `fest`      – blockiert Bewegung
 * `begegnung` – Kennung der Begegnungsgruppe (Gras, Höhle, Moor …)
 * `wasser`    – für die Wellenanimation zur Laufzeit
 * `varianten` – Anzahl der zufälligen Fassungen
 */
export const KACHELN = {
  gras: {
    varianten: 4,
    zeichne(ctx, rnd) {
      flaeche(ctx, WELT.gras);
      sprenkeln(ctx, rnd, WELT.grasDunkel, 22);
      sprenkeln(ctx, rnd, WELT.grasHell, 14);
    },
  },
  grasHoch: {
    begegnung: 'wiese',
    varianten: 3,
    zeichne(ctx, rnd) {
      flaeche(ctx, WELT.grasDunkel);
      sprenkeln(ctx, rnd, WELT.gras, 20);
      for (let i = 0; i < 5; i += 1) {
        bueschel(ctx, WELT.grasHell, 2 + Math.floor(rnd() * 12), 4 + Math.floor(rnd() * 11), 4);
      }
    },
  },
  blume: {
    varianten: 3,
    zeichne(ctx, rnd) {
      flaeche(ctx, WELT.gras);
      sprenkeln(ctx, rnd, WELT.grasDunkel, 16);
      for (const farbe of ['#f8d040', '#f06098', '#f8f8f8']) {
        const x = 2 + Math.floor(rnd() * 12);
        const y = 2 + Math.floor(rnd() * 12);
        kasten(ctx, farbe, x, y, 2, 2);
      }
    },
  },
  weg: {
    varianten: 4,
    zeichne(ctx, rnd) {
      flaeche(ctx, WELT.weg);
      sprenkeln(ctx, rnd, WELT.wegDunkel, 18);
      sprenkeln(ctx, rnd, '#f0d8a8', 8);
    },
  },
  sand: {
    varianten: 3,
    zeichne(ctx, rnd) {
      flaeche(ctx, WELT.sand);
      sprenkeln(ctx, rnd, '#d0bc80', 14);
    },
  },
  beton: {
    varianten: 2,
    zeichne(ctx, rnd) {
      flaeche(ctx, WELT.beton);
      sprenkeln(ctx, rnd, WELT.betonDunkel, 10);
      kasten(ctx, WELT.betonDunkel, 0, 15, 16, 1);
      kasten(ctx, WELT.betonDunkel, 15, 0, 1, 16);
    },
  },
  asphalt: {
    varianten: 3,
    zeichne(ctx, rnd) {
      flaeche(ctx, WELT.asphalt);
      sprenkeln(ctx, rnd, WELT.asphaltHell, 12);
    },
  },
  streifen: {
    zeichne(ctx) {
      flaeche(ctx, WELT.asphalt);
      kasten(ctx, '#e8e8d0', 7, 2, 2, 12);
    },
  },
  holz: {
    varianten: 2,
    zeichne(ctx, rnd) {
      flaeche(ctx, '#a87848');
      kasten(ctx, '#8a5c34', 0, 7, 16, 1);
      kasten(ctx, '#8a5c34', 0, 15, 16, 1);
      sprenkeln(ctx, rnd, '#c08c58', 10);
    },
  },
  pfuetze: {
    zeichne(ctx) {
      flaeche(ctx, WELT.asphalt);
      kasten(ctx, '#3a4a68', 3, 5, 10, 6);
      kasten(ctx, '#5a7098', 4, 6, 8, 3);
    },
  },
  kabel: {
    zeichne(ctx) {
      flaeche(ctx, WELT.beton);
      kasten(ctx, '#282830', 0, 5, 16, 2);
      kasten(ctx, '#404050', 0, 10, 16, 2);
      kasten(ctx, '#c04040', 6, 5, 2, 2);
    },
  },
  gully: {
    zeichne(ctx) {
      flaeche(ctx, WELT.beton);
      kasten(ctx, '#585850', 3, 3, 10, 10);
      kasten(ctx, '#303030', 4, 5, 8, 1);
      kasten(ctx, '#303030', 4, 8, 8, 1);
      kasten(ctx, '#303030', 4, 11, 8, 1);
    },
  },
  hoehleBoden: {
    varianten: 3,
    zeichne(ctx, rnd) {
      flaeche(ctx, WELT.hoehleBoden);
      sprenkeln(ctx, rnd, '#6a5c4c', 16);
      sprenkeln(ctx, rnd, '#a08c76', 8);
    },
  },
  hoehleSchotter: {
    begegnung: 'hoehle',
    varianten: 3,
    zeichne(ctx, rnd) {
      flaeche(ctx, '#7a6a5a');
      sprenkeln(ctx, rnd, '#584c40', 20, 2);
      sprenkeln(ctx, rnd, '#9a8a76', 10);
    },
  },
  hoehleWand: {
    fest: true,
    varianten: 3,
    zeichne(ctx, rnd) {
      flaeche(ctx, WELT.hoehleWand);
      sprenkeln(ctx, rnd, '#5c5048', 18, 2);
      kasten(ctx, '#2a2420', 0, 14, 16, 2);
    },
  },
  moor: {
    varianten: 3,
    zeichne(ctx, rnd) {
      flaeche(ctx, WELT.moor);
      sprenkeln(ctx, rnd, WELT.moorHell, 14);
      sprenkeln(ctx, rnd, '#38402e', 10);
    },
  },
  moorGras: {
    begegnung: 'moor',
    varianten: 3,
    zeichne(ctx, rnd) {
      flaeche(ctx, '#3c4834');
      for (let i = 0; i < 6; i += 1) {
        bueschel(ctx, WELT.moorHell, 2 + Math.floor(rnd() * 12), 5 + Math.floor(rnd() * 10), 5);
      }
      sprenkeln(ctx, rnd, '#26301f', 10);
    },
  },
  buehne: {
    zeichne(ctx) {
      flaeche(ctx, '#303038');
      kasten(ctx, '#42424e', 1, 1, 14, 14);
      kasten(ctx, '#282830', 1, 7, 14, 1);
      kasten(ctx, '#282830', 7, 1, 1, 14);
    },
  },
  wasser: {
    fest: true,
    wasser: true,
    varianten: 2,
    zeichne(ctx, rnd) {
      flaeche(ctx, WELT.wasser);
      sprenkeln(ctx, rnd, WELT.wasserHell, 10, 2);
    },
  },
  baum: {
    fest: true,
    varianten: 3,
    zeichne(ctx, rnd) {
      flaeche(ctx, WELT.gras);
      sprenkeln(ctx, rnd, WELT.grasDunkel, 10);
      baumKrone(ctx, rnd, WELT.baumHell, WELT.baum, WELT.baumDunkel);
    },
  },
  baumDunkel: {
    fest: true,
    varianten: 3,
    zeichne(ctx, rnd) {
      flaeche(ctx, WELT.grasDunkel);
      baumKrone(ctx, rnd, '#3a8a48', '#1f5c2c', '#12401e');
    },
  },
  fels: {
    fest: true,
    varianten: 2,
    zeichne(ctx, rnd) {
      flaeche(ctx, WELT.gras);
      kasten(ctx, WELT.felsDunkel, 2, 4, 12, 10);
      kasten(ctx, WELT.fels, 3, 3, 10, 9);
      sprenkeln(ctx, rnd, WELT.felsDunkel, 8);
    },
  },
  klippe: {
    fest: true,
    varianten: 2,
    zeichne(ctx, rnd) {
      flaeche(ctx, '#8a7a5a');
      kasten(ctx, '#6a5c40', 0, 0, 16, 4);
      sprenkeln(ctx, rnd, '#a89878', 14, 2);
      kasten(ctx, '#584c34', 0, 13, 16, 3);
    },
  },
  zaun: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.gras);
      kasten(ctx, '#907050', 2, 4, 2, 11);
      kasten(ctx, '#907050', 12, 4, 2, 11);
      kasten(ctx, '#b08c60', 0, 6, 16, 2);
      kasten(ctx, '#b08c60', 0, 11, 16, 2);
    },
  },
  box: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.beton);
      kasten(ctx, '#1c1c22', 1, 0, 14, 16);
      kasten(ctx, '#2e2e38', 2, 1, 12, 14);
      kasten(ctx, '#101014', 4, 3, 8, 6);
      kasten(ctx, '#4a4a58', 5, 4, 6, 4);
      kasten(ctx, '#101014', 5, 11, 6, 3);
    },
  },
  verstaerker: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.beton);
      kasten(ctx, '#3a2a1a', 1, 4, 14, 11);
      kasten(ctx, '#584028', 2, 5, 12, 9);
      kasten(ctx, '#c8b070', 3, 6, 10, 3);
      kasten(ctx, '#e04058', 12, 11, 2, 2);
    },
  },
  tonne: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.beton);
      kasten(ctx, '#2c5c3c', 3, 3, 10, 12);
      kasten(ctx, '#3e7a50', 4, 4, 8, 10);
      kasten(ctx, '#1e4028', 2, 2, 12, 2);
    },
  },
  /**
   * `istSchild` markiert Kacheln, die einen `schilder`-Eintrag tragen dürfen
   * (siehe die Prüfung in tools/pruefe-welt.mjs) – ein Schild-Text ohne eine
   * dieser Kacheln darunter fällt beim Build als Fehler auf.
   */
  schild: {
    fest: true,
    istSchild: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.gras);
      kasten(ctx, '#6a4828', 7, 9, 2, 6);
      kasten(ctx, '#8a6038', 1, 2, 14, 8);
      kasten(ctx, '#c8a068', 2, 3, 12, 6);
      kasten(ctx, '#6a4828', 4, 5, 8, 1);
      kasten(ctx, '#6a4828', 4, 7, 6, 1);
    },
  },
  /**
   * Dieselbe Rolle wie `schild`, aber als kleine Plakette statt als Pfosten –
   * für Hinweise an einer Innenwand, wo ein Schildpfosten auf grünem Grund
   * (wie bei `schild`) nicht passt. Bewusst neutral gehalten (dunkler Rahmen,
   * helle Fläche), damit sie auf jeder Wandfarbe funktioniert.
   */
  wandschild: {
    fest: true,
    istSchild: true,
    zeichne(ctx) {
      flaeche(ctx, '#282018');
      kasten(ctx, '#4a3828', 1, 4, 14, 8);
      kasten(ctx, '#d8c8a0', 2, 5, 12, 6);
      kasten(ctx, '#282018', 4, 7, 8, 1);
      kasten(ctx, '#282018', 4, 9, 6, 1);
    },
  },
  laterne: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.beton);
      kasten(ctx, '#404048', 7, 4, 2, 12);
      kasten(ctx, '#f0d868', 5, 1, 6, 4);
      kasten(ctx, '#fff8c0', 6, 2, 4, 2);
    },
  },
  hauswand: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.hauswand);
      kasten(ctx, WELT.hauswandDunkel, 0, 0, 16, 1);
      kasten(ctx, WELT.hauswandDunkel, 0, 8, 16, 1);
      kasten(ctx, WELT.hauswandDunkel, 15, 0, 1, 16);
    },
  },
  fenster: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.hauswand);
      kasten(ctx, '#405878', 2, 3, 12, 9);
      kasten(ctx, '#68a8d8', 3, 4, 10, 7);
      kasten(ctx, '#a8d8f0', 4, 5, 4, 3);
      kasten(ctx, '#405878', 8, 3, 1, 9);
    },
  },
  tuer: {
    tuer: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.hauswand);
      kasten(ctx, '#5a3c20', 2, 1, 12, 15);
      kasten(ctx, '#7a5430', 3, 2, 10, 14);
      kasten(ctx, '#f0c040', 11, 8, 2, 2);
    },
  },
  tuerGig: {
    tuer: true,
    zeichne(ctx) {
      flaeche(ctx, '#282830');
      kasten(ctx, '#101018', 1, 1, 14, 15);
      kasten(ctx, WELT.neon, 1, 1, 14, 2);
      kasten(ctx, WELT.neonBlau, 3, 5, 10, 1);
      kasten(ctx, '#3a3a48', 3, 7, 10, 9);
    },
  },
  treppeHoch: {
    tuer: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.bodenInnen);
      kasten(ctx, '#9a8a70', 2, 2, 12, 12);
      kasten(ctx, '#c8b898', 2, 2, 12, 4);
      kasten(ctx, '#c8b898', 2, 8, 12, 3);
    },
  },
  treppeRunter: {
    tuer: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.bodenInnen);
      kasten(ctx, '#6a5c48', 2, 2, 12, 12);
      kasten(ctx, '#4a4030', 4, 4, 8, 8);
      kasten(ctx, '#2a2418', 6, 6, 4, 4);
    },
  },
  hoehleAusgang: {
    tuer: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.hoehleWand);
      kasten(ctx, '#1a1614', 2, 2, 12, 14);
      kasten(ctx, '#0a0908', 4, 5, 8, 11);
    },
  },
  dachRot: { fest: true, zeichne: (ctx) => dach(ctx, WELT.dachRot, WELT.dachRotDunkel) },
  dachBlau: { fest: true, zeichne: (ctx) => dach(ctx, WELT.dachBlau, WELT.dachBlauDunkel) },
  dachGruen: { fest: true, zeichne: (ctx) => dach(ctx, WELT.dachGruen, WELT.dachGruenDunkel) },
  dachGrau: { fest: true, zeichne: (ctx) => dach(ctx, WELT.dachGrau, WELT.dachGrauDunkel) },
  wandInnen: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.wandInnen);
      kasten(ctx, WELT.wandInnenDunkel, 0, 12, 16, 4);
      kasten(ctx, '#e0c898', 0, 0, 16, 2);
    },
  },
  bodenInnen: {
    varianten: 2,
    zeichne(ctx, rnd) {
      flaeche(ctx, WELT.bodenInnen);
      kasten(ctx, WELT.bodenInnenDunkel, 0, 15, 16, 1);
      kasten(ctx, WELT.bodenInnenDunkel, 15, 0, 1, 16);
      sprenkeln(ctx, rnd, '#f0e4cc', 6);
    },
  },
  teppich: {
    zeichne(ctx) {
      flaeche(ctx, '#b03040');
      kasten(ctx, '#c85060', 1, 1, 14, 14);
      kasten(ctx, '#902838', 4, 4, 8, 8);
    },
  },

  // --- Casino ---------------------------------------------------------------
  // Der Saal unter der Bruchbude: tiefroter Teppich, Gold, Samt. Bewusst
  // satter als alles andere im Spiel – der Kontrast zum Treppenschacht
  // darüber ist der ganze Witz.
  teppichRot: {
    varianten: 2,
    zeichne(ctx, rnd) {
      flaeche(ctx, '#8c1526');
      kasten(ctx, '#a81c30', 1, 1, 14, 14);
      // Eingewebtes Rautenmuster, damit die Fläche nicht tot wirkt.
      kasten(ctx, '#7a1020', 7, 3, 2, 2);
      kasten(ctx, '#7a1020', 3, 7, 2, 2);
      kasten(ctx, '#7a1020', 11, 7, 2, 2);
      kasten(ctx, '#7a1020', 7, 11, 2, 2);
      sprenkeln(ctx, rnd, '#c02840', 4);
    },
  },
  /** Goldener Läufer: die Bahn vom Treppenfuß bis zu den Tischen. */
  teppichGold: {
    zeichne(ctx) {
      flaeche(ctx, '#8c1526');
      kasten(ctx, '#c8a032', 0, 2, 16, 12);
      kasten(ctx, '#e8c860', 0, 3, 16, 9);
      kasten(ctx, '#a8842a', 0, 12, 16, 2);
    },
  },
  goldwand: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, '#3a2018');
      kasten(ctx, '#5a3020', 0, 0, 16, 14);
      kasten(ctx, '#c8a032', 0, 14, 16, 2);
      kasten(ctx, '#7a4428', 2, 2, 12, 10);
      kasten(ctx, '#e8c860', 3, 3, 10, 1);
    },
  },
  /** Goldene Lampe an der Wand – der Casino-Saal ist voll davon. */
  goldlampe: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, '#3a2018');
      kasten(ctx, '#5a3020', 0, 0, 16, 14);
      kasten(ctx, '#c8a032', 0, 14, 16, 2);
      kasten(ctx, '#8a6420', 6, 2, 4, 3);
      kasten(ctx, '#e8c860', 4, 5, 8, 5);
      kasten(ctx, '#fff0b0', 5, 6, 6, 3);
      kasten(ctx, '#fffce0', 6, 7, 4, 1);
    },
  },
  goldsaeule: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, '#8c1526');
      kasten(ctx, '#a8842a', 3, 0, 10, 16);
      kasten(ctx, '#e8c860', 4, 0, 7, 16);
      kasten(ctx, '#fff0b0', 5, 0, 2, 16);
      kasten(ctx, '#a8842a', 2, 0, 12, 2);
      kasten(ctx, '#a8842a', 2, 14, 12, 2);
    },
  },
  /**
   * Dieselbe Säule, nur mit einem Nagel auf halber Höhe – die in der Ecke,
   * an der der blaue Brief hängt. Der Brief selbst steckt bewusst nicht in
   * der Kachel: Er wird abgenommen und taucht eine halbe Stunde später wieder
   * auf, das gerenderte Kartenbild steht dagegen fest (siehe
   * Weltkarte.rendere). Er kommt deshalb zur Laufzeit obendrauf – siehe
   * zeichneBrief unten und zeichneSaeulenbrief in scenes/welt.js.
   */
  briefsaeule: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, '#8c1526');
      kasten(ctx, '#a8842a', 3, 0, 10, 16);
      kasten(ctx, '#e8c860', 4, 0, 7, 16);
      kasten(ctx, '#fff0b0', 5, 0, 2, 16);
      kasten(ctx, '#a8842a', 2, 0, 12, 2);
      kasten(ctx, '#a8842a', 2, 14, 12, 2);
      kasten(ctx, '#6a4a18', 7, 4, 2, 1);
    },
  },
  /** Einarmiger Bandit. Hier hängen die Zocker. */
  automat: {
    fest: true,
    reichweite: true,
    zeichne(ctx) {
      flaeche(ctx, '#8c1526');
      kasten(ctx, '#2a2a34', 1, 1, 14, 14);
      kasten(ctx, '#c02038', 2, 2, 12, 4);
      kasten(ctx, '#f0f0f8', 3, 7, 10, 4);
      kasten(ctx, '#e8c860', 4, 8, 2, 2);
      kasten(ctx, '#40c058', 7, 8, 2, 2);
      kasten(ctx, '#4098e0', 10, 8, 2, 2);
      kasten(ctx, '#8a8a98', 14, 6, 2, 5);
      kasten(ctx, '#e04058', 14, 5, 2, 2);
    },
  },
  roulettetisch: {
    fest: true,
    reichweite: true,
    zeichne(ctx) {
      flaeche(ctx, '#8c1526');
      kasten(ctx, '#5a3020', 0, 1, 16, 14);
      kasten(ctx, '#1e6a34', 1, 2, 14, 12);
      // Kessel mit rotem und schwarzem Fach.
      kasten(ctx, '#2a2a34', 4, 4, 8, 8);
      kasten(ctx, '#c02038', 6, 6, 4, 4);
      kasten(ctx, '#e8c860', 7, 7, 2, 2);
    },
  },
  kartentisch: {
    fest: true,
    reichweite: true,
    zeichne(ctx) {
      flaeche(ctx, '#8c1526');
      kasten(ctx, '#5a3020', 0, 1, 16, 14);
      kasten(ctx, '#1e6a34', 1, 2, 14, 12);
      // Zwei ausgelegte Karten.
      kasten(ctx, '#f0f0f8', 3, 5, 4, 6);
      kasten(ctx, '#f0f0f8', 9, 5, 4, 6);
      kasten(ctx, '#c02038', 4, 6, 2, 2);
      kasten(ctx, '#2a2a34', 10, 6, 2, 2);
    },
  },
  /** Der Extra-Tisch: alles oder nichts. Schwarz und Gold, keine Deko. */
  risikotisch: {
    fest: true,
    reichweite: true,
    zeichne(ctx) {
      flaeche(ctx, '#8c1526');
      kasten(ctx, '#c8a032', 0, 1, 16, 14);
      kasten(ctx, '#12121a', 1, 2, 14, 12);
      kasten(ctx, '#e8c860', 3, 6, 4, 4);
      kasten(ctx, '#12121a', 4, 7, 2, 2);
      kasten(ctx, '#c02038', 9, 6, 4, 4);
    },
  },

  // --- Klonlabor unter dem Boxenstopp ----------------------------------------
  // Der Gegenentwurf zum warmen Heilungscenter darüber: kalter Beton, Stahl,
  // Neonlicht – und überall die Spuren dessen, was hier wirklich passiert
  // (siehe data/world/klonlabor.js).

  /**
   * Das Tastenfeld an der Wand des Boxenstopps: unscheinbarer grauer Kasten
   * mit Ziffernblock. Ansprechen öffnet die Codeeingabe (siehe
   * scenes/tastenfeld.js), die richtige Kombination lässt die Fahrstuhltür
   * daneben erscheinen.
   */
  tastenfeld: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.wandInnen);
      kasten(ctx, WELT.wandInnenDunkel, 0, 12, 16, 4);
      kasten(ctx, '#e0c898', 0, 0, 16, 2);
      // Gehäuse
      kasten(ctx, '#20242e', 3, 2, 10, 12);
      kasten(ctx, '#4a5060', 4, 3, 8, 10);
      // Display mit drei Stellen
      kasten(ctx, '#0c2412', 5, 4, 6, 3);
      kasten(ctx, '#48f078', 6, 5, 1, 1);
      kasten(ctx, '#48f078', 8, 5, 1, 1);
      kasten(ctx, '#48f078', 10, 5, 1, 1);
      // Ziffernblock
      for (let ky = 0; ky < 3; ky += 1) {
        for (let kx = 0; kx < 3; kx += 1) {
          kasten(ctx, '#c8ccd8', 5 + kx * 2, 8 + ky * 2, 1, 1);
        }
      }
      kasten(ctx, '#e04058', 11, 12, 1, 1);
    },
  },
  /**
   * Die Fahrstuhltür. Sie ist begehbar: Wer darauftritt, löst die Fahrt aus
   * (siehe FAHRSTUHL_ZIEL und nachSchritt() in scenes/welt.js). Im Boxenstopp
   * liegt an ihrer Stelle zunächst eine Wand – die Kachel wird erst nach der
   * richtigen Codeeingabe gesetzt.
   */
  fahrstuhltuer: {
    zeichne(ctx) {
      flaeche(ctx, '#20242e');
      kasten(ctx, '#8a8a98', 0, 0, 16, 3);
      kasten(ctx, '#48f078', 7, 1, 2, 1);
      kasten(ctx, '#484c58', 0, 3, 16, 13);
      kasten(ctx, '#9098a8', 1, 4, 6, 12);
      kasten(ctx, '#9098a8', 9, 4, 6, 12);
      kasten(ctx, '#c8ccd8', 1, 4, 6, 1);
      kasten(ctx, '#c8ccd8', 9, 4, 6, 1);
      kasten(ctx, '#12121a', 7, 4, 2, 12);
      kasten(ctx, '#6a7280', 5, 9, 1, 3);
      kasten(ctx, '#6a7280', 10, 9, 1, 3);
    },
  },
  /** Betonwand des Labors – kälter und schmutziger als jede Zimmerwand. */
  laborwand: {
    fest: true,
    varianten: 2,
    zeichne(ctx, rnd) {
      flaeche(ctx, '#4a5058');
      kasten(ctx, '#5a6068', 0, 0, 16, 12);
      kasten(ctx, '#6a7078', 0, 0, 16, 1);
      kasten(ctx, '#3a4048', 0, 12, 16, 4);
      sprenkeln(ctx, rnd, '#525860', 10);
      sprenkeln(ctx, rnd, '#6a7078', 5);
    },
  },
  /** Fliesenboden des Labors: klinisch, aber längst nicht mehr sauber. */
  laborboden: {
    varianten: 3,
    zeichne(ctx, rnd) {
      flaeche(ctx, '#98a0a8');
      kasten(ctx, '#a8b0b8', 1, 1, 14, 14);
      kasten(ctx, '#7a828a', 0, 15, 16, 1);
      kasten(ctx, '#7a828a', 15, 0, 1, 16);
      sprenkeln(ctx, rnd, '#8a929a', 6);
    },
  },
  /** Derselbe Boden, nur mit einer eingetrockneten Lache darauf. */
  blutfleck: {
    varianten: 3,
    zeichne(ctx, rnd) {
      flaeche(ctx, '#98a0a8');
      kasten(ctx, '#a8b0b8', 1, 1, 14, 14);
      kasten(ctx, '#7a828a', 0, 15, 16, 1);
      kasten(ctx, '#7a828a', 15, 0, 1, 16);
      kasten(ctx, '#6a0c18', 4, 6, 8, 5);
      kasten(ctx, '#8c1020', 3, 5, 9, 6);
      kasten(ctx, '#b01828', 5, 6, 4, 3);
      sprenkeln(ctx, rnd, '#8c1020', 10);
    },
  },
  /**
   * Klonkapsel: Glasröhre mit Nährlösung. Was darin schwimmt, kommt erst zur
   * Laufzeit dazu – jede Kapsel bekommt ein anderes Hardtekkmon (siehe
   * zeichneKlonkapseln in scenes/welt.js).
   */
  klonkapsel: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, '#98a0a8');
      kasten(ctx, '#2a3038', 1, 0, 14, 16);
      kasten(ctx, '#5a6470', 2, 1, 12, 14);
      kasten(ctx, '#1e4a56', 2, 2, 12, 11);
      kasten(ctx, '#2a3038', 2, 13, 12, 3);
      kasten(ctx, '#48f078', 12, 14, 1, 1);
      kasten(ctx, '#e8c860', 3, 14, 1, 1);
    },
  },
  /** Der Haufen: übereinandergestapelte Hardtekkmon, die es nicht überstanden haben. */
  leichenhaufen: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, '#98a0a8');
      kasten(ctx, '#8c1020', 0, 11, 16, 5);
      kasten(ctx, '#6a7050', 1, 9, 6, 5);
      kasten(ctx, '#7a6a80', 8, 9, 7, 5);
      kasten(ctx, '#8a7a58', 3, 5, 6, 5);
      kasten(ctx, '#5a7a70', 9, 6, 5, 4);
      kasten(ctx, '#7a5a68', 5, 2, 6, 4);
      // X-Augen, wo eben noch Augen waren.
      for (const [ax, ay] of [[6, 3], [8, 3], [2, 10], [4, 10], [10, 10], [12, 10]]) {
        kasten(ctx, '#20242e', ax, ay, 1, 1);
      }
    },
  },
  /** Ein einzelnes, danebenliegendes Exemplar. */
  totesMon: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, '#98a0a8');
      kasten(ctx, '#8c1020', 1, 10, 13, 3);
      kasten(ctx, '#6a7a58', 2, 6, 11, 5);
      kasten(ctx, '#7a8a68', 3, 5, 8, 5);
      kasten(ctx, '#5a6a50', 12, 7, 3, 3);
      kasten(ctx, '#20242e', 4, 7, 1, 1);
      kasten(ctx, '#20242e', 6, 7, 1, 1);
    },
  },
  /** Edelstahltisch mit Kolben und Papierkram. */
  labortisch: {
    fest: true,
    // Wie Tresen und Tisch: der Professor dahinter bleibt ansprechbar.
    reichweite: true,
    zeichne(ctx) {
      flaeche(ctx, '#98a0a8');
      kasten(ctx, '#98a0ac', 0, 3, 16, 10);
      kasten(ctx, '#e8ecf4', 0, 4, 16, 5);
      kasten(ctx, '#c8ccd8', 0, 9, 16, 3);
      kasten(ctx, '#48f078', 3, 3, 3, 5);
      kasten(ctx, '#a8e8f8', 9, 4, 2, 4);
      kasten(ctx, '#f0e4cc', 12, 5, 3, 3);
    },
  },
  /**
   * Die Tötungsmaschine: Trichter oben, Behälter unten, ein roter Knopf. Der
   * Professor erklärt bei genügend Schweigegeld, wofür sie gebraucht wird.
   */
  toetungsmaschine: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, '#98a0a8');
      kasten(ctx, '#2a3038', 0, 0, 16, 15);
      kasten(ctx, '#586470', 1, 1, 14, 12);
      for (let i = 0; i < 4; i += 1) kasten(ctx, '#f0c040', 1 + i * 4, 1, 2, 2);
      kasten(ctx, '#12121a', 3, 5, 10, 6);
      kasten(ctx, '#8c1020', 4, 9, 8, 2);
      kasten(ctx, '#e04058', 12, 11, 2, 2);
      kasten(ctx, '#8c1020', 0, 15, 16, 1);
    },
  },

  // --- Bruchbude und Treppenschacht ------------------------------------------
  /** Begehbare Stufe im Schacht: von oben gesehen eine Kante nach der anderen. */
  stufen: {
    zeichne(ctx) {
      flaeche(ctx, '#3a3742');
      kasten(ctx, '#4a4756', 0, 0, 16, 5);
      kasten(ctx, '#2a2833', 0, 5, 16, 2);
      kasten(ctx, '#454252', 0, 7, 16, 5);
      kasten(ctx, '#232029', 0, 12, 16, 2);
      kasten(ctx, '#403d4c', 0, 14, 16, 2);
    },
  },
  schachtwand: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, '#221f28');
      kasten(ctx, '#2c2934', 1, 1, 14, 14);
      kasten(ctx, '#1a1820', 3, 4, 4, 1);
      kasten(ctx, '#1a1820', 9, 10, 5, 1);
    },
  },
  /** Nackte Funzel im Schacht – alle paar Meter eine, mehr Licht gibt es nicht. */
  schachtlampe: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, '#221f28');
      kasten(ctx, '#2c2934', 1, 1, 14, 14);
      kasten(ctx, '#4a4756', 7, 0, 2, 5);
      kasten(ctx, '#8a7a40', 5, 5, 6, 3);
      kasten(ctx, '#ffe89a', 6, 6, 4, 2);
      kasten(ctx, '#fffbe0', 7, 6, 2, 1);
    },
  },
  /** Gerümpel im Keller der Bruchbude. */
  geruempel: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.bodenInnen);
      kasten(ctx, '#6a5a48', 1, 6, 7, 8);
      kasten(ctx, '#8a7a60', 2, 7, 5, 3);
      kasten(ctx, '#4a4a58', 8, 3, 7, 11);
      kasten(ctx, '#5e5e70', 9, 4, 5, 4);
      kasten(ctx, '#c02038', 10, 9, 3, 2);
    },
  },
  tresen: {
    fest: true,
    // Reicht über den Tresen hinweg: Wer davorsteht, kann die Person direkt
    // dahinter trotzdem ansprechen (siehe interagiere() in welt.js).
    reichweite: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.bodenInnen);
      kasten(ctx, '#8a6038', 0, 2, 16, 12);
      kasten(ctx, '#b0844c', 0, 3, 16, 9);
      kasten(ctx, '#6a4828', 0, 12, 16, 2);
    },
  },
  regal: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.wandInnen);
      kasten(ctx, '#6a4828', 0, 0, 16, 16);
      kasten(ctx, '#8a6038', 1, 1, 14, 14);
      for (const y of [2, 7, 12]) {
        kasten(ctx, '#d8c8a0', 2, y, 12, 3);
        kasten(ctx, '#c04058', 3, y, 2, 3);
        kasten(ctx, '#4058c0', 7, y, 2, 3);
      }
    },
  },
  /**
   * Die unauffällige Tür zum Proberaum, mitten in der Goldwand des Casinos.
   * Bleibt IMMER fest – anders als eine normale Tür öffnet sie sich nie durch
   * bloßes Anlaufen, sondern nur über den Klopf-Mechanismus in welt.js
   * (dreimal hintereinander interagieren). Deshalb steht ihr Ziel auch nicht
   * in den regulären Warps der Karte (das würde die Weltprüfung als "Übergang
   * auf fester Kachel" melden), sondern in KLOPFTUER_ZIEL in
   * data/world/casino.js.
   */
  klopftuer: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, '#3a2018');
      kasten(ctx, '#585858', 1, 1, 14, 15);
      kasten(ctx, '#404048', 2, 2, 12, 13);
      kasten(ctx, '#282828', 11, 8, 2, 2);
    },
  },
  /**
   * Das DJ-Pult im Proberaum: Interagieren öffnet den 16-Step-Sequenzer
   * (siehe scenes/sequenzer.js).
   */
  djpult: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.bodenInnen);
      kasten(ctx, '#1c1c24', 1, 5, 14, 10);
      kasten(ctx, '#2e2e3a', 2, 6, 12, 8);
      // Bunte Pads, wie an einem echten Step-Sequenzer.
      kasten(ctx, '#e04058', 3, 8, 2, 2);
      kasten(ctx, '#e8c860', 6, 8, 2, 2);
      kasten(ctx, '#58d0e0', 9, 8, 2, 2);
      kasten(ctx, '#58c868', 12, 8, 1, 2);
      // Regler-Leiste darunter.
      kasten(ctx, '#101014', 2, 11, 12, 2);
      kasten(ctx, '#c8c8d0', 4, 11, 1, 2);
      kasten(ctx, '#c8c8d0', 8, 11, 1, 2);
      kasten(ctx, '#c8c8d0', 12, 11, 1, 2);
    },
  },
  tisch: {
    fest: true,
    // Wie der Tresen: blockiert das Laufen, aber nicht das Ansprechen einer
    // Person direkt auf der anderen Seite.
    reichweite: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.bodenInnen);
      kasten(ctx, '#8a6038', 1, 3, 14, 10);
      kasten(ctx, '#b0844c', 2, 4, 12, 7);
    },
  },
  bett: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.bodenInnen);
      kasten(ctx, '#c03050', 1, 0, 14, 16);
      kasten(ctx, '#f0f0f0', 2, 1, 12, 5);
      kasten(ctx, '#e04868', 2, 7, 12, 8);
    },
  },
  pflanze: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.bodenInnen);
      kasten(ctx, '#8a5030', 5, 10, 6, 5);
      kasten(ctx, '#2c7038', 3, 3, 10, 7);
      kasten(ctx, '#48a048', 5, 2, 6, 5);
    },
  },
  heilgeraet: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.bodenInnen);
      kasten(ctx, '#d8d8e0', 1, 2, 14, 12);
      kasten(ctx, '#9098a8', 1, 12, 14, 2);
      kasten(ctx, '#303040', 3, 4, 10, 5);
      kasten(ctx, '#40e0a0', 4, 5, 3, 3);
      kasten(ctx, '#e04058', 9, 5, 3, 3);
    },
  },
  plattenspieler: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.bodenInnen);
      kasten(ctx, '#2a2a32', 1, 2, 14, 12);
      kasten(ctx, '#101014', 3, 4, 9, 9);
      kasten(ctx, '#c8c8d0', 7, 8, 1, 1);
      kasten(ctx, '#e04058', 12, 4, 2, 6);
    },
  },
  computer: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.bodenInnen);
      kasten(ctx, '#d8d8e0', 3, 10, 10, 3);
      kasten(ctx, '#9098a8', 3, 12, 10, 1);
      kasten(ctx, '#282838', 2, 2, 12, 9);
      kasten(ctx, '#4098e0', 3, 3, 10, 7);
      kasten(ctx, '#a8e0f8', 4, 4, 6, 2);
      kasten(ctx, '#282838', 4, 7, 8, 1);
    },
  },
  /**
   * Silberner Plattenspieler neben der Schwester: sechs leere Mulden für die
   * Mini-Schallplatten. Gefüllt wird er erst zur Laufzeit – während der
   * Heilsequenz legt die Weltszene Platte für Platte eine goldene hinein
   * (siehe TELLER_PLAETZE und zeichneHeilteller in scenes/welt.js).
   */
  heilteller: {
    fest: true,
    zeichne(ctx) {
      flaeche(ctx, WELT.bodenInnen);
      kasten(ctx, '#7a8090', 0, 1, 16, 14);
      kasten(ctx, '#dce0ec', 1, 2, 14, 12);
      kasten(ctx, '#aab0c0', 1, 12, 14, 2);
      for (const [x, y] of TELLER_PLAETZE) {
        kasten(ctx, '#6a7080', x, y, 4, 4);
        kasten(ctx, '#31363f', x + 1, y + 1, 2, 2);
      }
    },
  },
};

/**
 * Lage der sechs Mulden im Plattenspieler, als Pixelversatz innerhalb der
 * Kachel. Kachelbild und die zur Laufzeit eingelegten goldenen Platten teilen
 * sich diese eine Liste, damit beides zwangsläufig deckungsgleich sitzt.
 */
export const TELLER_PLAETZE = [
  [1, 3], [6, 3], [11, 3],
  [1, 8], [6, 8], [11, 8],
];

/**
 * Zeichnet eine eingelegte goldene Mini-Schallplatte an einer Mulde.
 * @param {Ctx} ctx
 * @param {number} x Pixelposition der Kachel-Ecke auf dem Bildschirm
 */
export function zeichneGoldPlatte(ctx, x, y, platz) {
  const [versatzX, versatzY] = TELLER_PLAETZE[platz];
  const px = x + versatzX;
  const py = y + versatzY;
  ctx.fillStyle = '#f0c040';
  ctx.fillRect(px, py, 4, 4);
  ctx.fillStyle = '#fff0a8';
  ctx.fillRect(px, py, 3, 1);
  ctx.fillStyle = '#8a6018';
  ctx.fillRect(px + 1, py + 1, 2, 2);
  ctx.fillStyle = '#fff8d8';
  ctx.fillRect(px + 1, py + 1, 1, 1);
}

/**
 * Der blaue Brief am Nagel der Briefsäule. Liegt als Auflage über der Kachel,
 * weil er kommt und geht (siehe die Kachel `briefsaeule` oben).
 * @param {Ctx} ctx
 * @param {number} x Pixelposition der Kachel-Ecke auf dem Bildschirm
 * @param {number} y
 */
export function zeichneBrief(ctx, x, y) {
  kasten(ctx, '#141c3c', x + 4, y + 3, 9, 8);
  kasten(ctx, '#3858b8', x + 5, y + 4, 7, 6);
  kasten(ctx, '#6a8ce8', x + 5, y + 4, 7, 1);
  // Die beiden Falze des Umschlags treffen sich in der Mitte.
  kasten(ctx, '#243a80', x + 6, y + 5, 5, 1);
  kasten(ctx, '#243a80', x + 7, y + 6, 3, 1);
  kasten(ctx, '#c02038', x + 8, y + 8, 2, 2);
}

/** Dachkachel: versetzte Schindelreihen mit heller Oberkante. */
function dach(ctx, hell, dunkel) {
  flaeche(ctx, hell);
  const licht = heller(hell, 0.28);

  for (const y of [0, 8]) {
    kasten(ctx, licht, 0, y, 16, 1);
    kasten(ctx, dunkel, 0, y + 6, 16, 2);
  }
  for (let x = 0; x < 16; x += 8) {
    kasten(ctx, dunkel, x, 1, 1, 5);
    kasten(ctx, dunkel, (x + 4) % 16, 9, 1, 5);
  }
}

const NAMEN = Object.keys(KACHELN);
const MAX_VARIANTEN = 4;

/** @type {{canvas: HTMLCanvasElement}|null} */
let atlas = null;

/** Rendert den kompletten Kachelsatz einmalig in eine Bildfläche. */
function baueAtlas() {
  const { canvas, ctx } = neueFlaeche(KACHEL * MAX_VARIANTEN, KACHEL * NAMEN.length);

  NAMEN.forEach((name, zeile) => {
    const kachel = KACHELN[name];
    const varianten = kachel.varianten ?? 1;
    for (let v = 0; v < MAX_VARIANTEN; v += 1) {
      const quelle = Math.min(v, varianten - 1);
      ctx.save();
      ctx.translate(KACHEL * v, KACHEL * zeile);
      ctx.beginPath();
      ctx.rect(0, 0, KACHEL, KACHEL);
      ctx.clip();
      kachel.zeichne(ctx, generator(zeile * 977 + quelle * 31 + 7));
      ctx.restore();
    }
  });

  return { canvas };
}

/** Muss einmal vor dem ersten Zeichnen laufen. */
export function baueKacheln() {
  if (!atlas) atlas = baueAtlas();
}

/**
 * Zeichnet eine Kachel.
 * @param {Ctx} ctx
 * @param {string} name
 * @param {number} x
 * @param {number} y
 * @param {number} [variante]
 */
export function zeichneKachel(ctx, name, x, y, variante = 0) {
  if (!atlas) baueKacheln();
  const zeile = NAMEN.indexOf(name);
  if (zeile < 0) return;
  const spalte = ((variante % MAX_VARIANTEN) + MAX_VARIANTEN) % MAX_VARIANTEN;
  ctx.drawImage(
    atlas.canvas,
    spalte * KACHEL, zeile * KACHEL, KACHEL, KACHEL,
    x, y, KACHEL, KACHEL,
  );
}

/** Eigenschaften einer Kachel (fest, Begegnungsgruppe, Wasser …). */
export function kachelInfo(name) {
  return KACHELN[name] ?? KACHELN.gras;
}

export function kachelExistiert(name) {
  return Object.prototype.hasOwnProperty.call(KACHELN, name);
}
