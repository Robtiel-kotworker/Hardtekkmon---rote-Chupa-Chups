// ============================================================================
// Oberflächen-Bausteine
// ----------------------------------------------------------------------------
// Fensterrahmen, Balken, Auswahlzeiger und Symbole – alles, was Menüs, Dialoge
// und der Kampfbildschirm gemeinsam nutzen.
// ============================================================================

import { UI, TYP_FARBEN } from './palette.js';
import { zeichneText, textBreite } from './font.js';

/**
 * Fenster im Stil der Vorlage: heller Grund, dunkler Außen- und heller
 * Innenrahmen.
 * @param {CanvasRenderingContext2D} ctx
 */
export function fenster(ctx, x, y, breite, hoehe, hervorgehoben = false) {
  ctx.fillStyle = UI.fensterRand;
  ctx.fillRect(x, y, breite, hoehe);
  ctx.fillStyle = hervorgehoben ? UI.gold : UI.fensterRandHell;
  ctx.fillRect(x + 1, y + 1, breite - 2, hoehe - 2);
  ctx.fillStyle = UI.fenster;
  ctx.fillRect(x + 2, y + 2, breite - 4, hoehe - 4);
}

/** Dunkles Fenster für Kampfmeldungen und Zustandsanzeigen. */
export function dunklesFenster(ctx, x, y, breite, hoehe) {
  ctx.fillStyle = '#101018';
  ctx.fillRect(x, y, breite, hoehe);
  ctx.fillStyle = '#585878';
  ctx.fillRect(x + 1, y + 1, breite - 2, hoehe - 2);
  ctx.fillStyle = '#282838';
  ctx.fillRect(x + 2, y + 2, breite - 4, hoehe - 4);
}

/** Auswahlzeiger; blinkt anhand des übergebenen Bildzählers. */
export function zeiger(ctx, x, y, bildzaehler = 0) {
  if (Math.floor(bildzaehler / 20) % 2 === 1) return;
  ctx.fillStyle = UI.auswahl;
  ctx.fillRect(x, y, 2, 5);
  ctx.fillRect(x + 2, y + 1, 2, 3);
  ctx.fillRect(x + 4, y + 2, 1, 1);
}

/**
 * Balken mit Rahmen (Kraftpunkte, Erfahrung …).
 * @param {number} anteil 0..1
 */
export function balken(ctx, x, y, breite, anteil, farbe, hoehe = 3) {
  ctx.fillStyle = UI.balkenRahmen;
  ctx.fillRect(x - 1, y - 1, breite + 2, hoehe + 2);
  ctx.fillStyle = '#606078';
  ctx.fillRect(x, y, breite, hoehe);

  // Ein Rest über null bekommt immer mindestens einen sichtbaren Pixel:
  // Bei hohen Höchstwerten (ab etwa 160 KP auf 76 Pixeln) rundet ein
  // einzelner verbleibender Kraftpunkt sonst auf null Pixel ab. Der Balken
  // sieht dann leer aus, obwohl das Hardtekkmon noch steht – es wirkt wie
  // ein ausgebliebener K.o. Nur ein echter Nullwert lässt den Balken leer.
  const roh = breite * anteil;
  const gefuellt = anteil > 0
    ? Math.max(1, Math.min(breite, Math.round(roh)))
    : 0;
  ctx.fillStyle = farbe;
  ctx.fillRect(x, y, gefuellt, hoehe);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x, y, gefuellt, 1);
}

/** Farbe des Kraftpunkte-Balkens abhängig vom Füllstand. */
export function kpFarbe(anteil) {
  if (anteil > 0.5) return UI.kpGut;
  if (anteil > 0.2) return UI.kpMittel;
  return UI.kpWenig;
}

/** Kleines farbiges Typ-Schildchen. */
export function typSchild(ctx, typ, x, y) {
  const beschriftung = typ.slice(0, 6);
  const breite = textBreite(beschriftung) + 6;
  ctx.fillStyle = '#181820';
  ctx.fillRect(x, y, breite, 9);
  ctx.fillStyle = TYP_FARBEN[typ] ?? '#888888';
  ctx.fillRect(x + 1, y + 1, breite - 2, 7);
  zeichneText(ctx, beschriftung, x + 3, y + 1, { farbe: '#101018' });
  return breite;
}

/**
 * Symbol eines Gegenstands (16x16). Samplepacks sind kleine Datenträger,
 * Heilmittel Dosen, Schlüsselgegenstände Karten.
 */
export function gegenstandSymbol(ctx, symbol, x, y) {
  switch (symbol) {
    case 'samplepack':
      ctx.fillStyle = '#282838';
      ctx.fillRect(x + 2, y + 2, 12, 12);
      ctx.fillStyle = '#e04058';
      ctx.fillRect(x + 3, y + 3, 10, 5);
      ctx.fillStyle = '#f8f8f0';
      ctx.fillRect(x + 4, y + 9, 8, 4);
      ctx.fillStyle = '#282838';
      ctx.fillRect(x + 6, y + 10, 4, 3);
      break;
    case 'samplepackGross':
      ctx.fillStyle = '#282838';
      ctx.fillRect(x + 1, y + 1, 14, 14);
      ctx.fillStyle = '#4878c8';
      ctx.fillRect(x + 2, y + 2, 12, 6);
      ctx.fillStyle = '#f0c040';
      ctx.fillRect(x + 3, y + 9, 10, 5);
      ctx.fillStyle = '#282838';
      ctx.fillRect(x + 6, y + 10, 4, 4);
      break;
    case 'trank':
      ctx.fillStyle = '#c8c8d8';
      ctx.fillRect(x + 5, y + 2, 6, 3);
      ctx.fillStyle = '#f8f8f0';
      ctx.fillRect(x + 3, y + 5, 10, 9);
      ctx.fillStyle = '#40c0e0';
      ctx.fillRect(x + 4, y + 8, 8, 5);
      break;
    case 'pille':
      ctx.fillStyle = '#f0f0f8';
      ctx.fillRect(x + 3, y + 6, 10, 5);
      ctx.fillStyle = '#e04058';
      ctx.fillRect(x + 3, y + 6, 5, 5);
      break;
    case 'karte':
      ctx.fillStyle = '#f0c040';
      ctx.fillRect(x + 2, y + 4, 12, 8);
      ctx.fillStyle = '#282838';
      ctx.fillRect(x + 3, y + 6, 6, 1);
      ctx.fillRect(x + 3, y + 8, 8, 1);
      break;
    case 'platte':
      ctx.fillStyle = '#181820';
      ctx.fillRect(x + 2, y + 2, 12, 12);
      ctx.fillStyle = '#e04058';
      ctx.fillRect(x + 6, y + 6, 4, 4);
      ctx.fillStyle = '#585868';
      ctx.fillRect(x + 7, y + 7, 2, 2);
      break;
    default:
      ctx.fillStyle = '#98a0b8';
      ctx.fillRect(x + 3, y + 3, 10, 10);
      break;
  }
}

/**
 * Kleine Diskette als Fang-Symbol: markiert im Kampf ein wildes Hardtekkmon,
 * das schon einmal gefangen wurde (Tekkdex-Eintrag vorhanden).
 */
export function fangSymbol(ctx, x, y) {
  ctx.fillStyle = '#3858a8';
  ctx.fillRect(x, y, 8, 8);
  ctx.fillStyle = '#182848';
  ctx.fillRect(x + 2, y + 1, 3, 3);
  ctx.fillStyle = '#e8f0ff';
  ctx.fillRect(x + 1, y + 5, 6, 2);
}

/**
 * Eine Schallplatte der Gegnerübersicht im Trainerkampf. Belegte Plätze
 * bekommen eine silberne Platte, freie bleiben nur schwach angedeutet – so
 * ist auf einen Blick zu sehen, wie viele Hardtekkmon der Trainer hat.
 * @param {boolean} belegt
 */
export function teamPlatte(ctx, x, y, belegt) {
  ctx.save();
  if (!belegt) ctx.globalAlpha = 0.25;

  ctx.fillStyle = belegt ? '#20242e' : '#5a6070';
  ctx.fillRect(x + 1, y, 6, 8);
  ctx.fillRect(x, y + 1, 8, 6);

  ctx.fillStyle = belegt ? '#c8ccd8' : '#7a8090';
  ctx.fillRect(x + 2, y + 1, 4, 6);
  ctx.fillRect(x + 1, y + 2, 6, 4);

  if (belegt) {
    // Glanzkante und Mittelloch, damit die Platte als Platte lesbar bleibt.
    ctx.fillStyle = '#f0f4ff';
    ctx.fillRect(x + 2, y + 1, 2, 1);
    ctx.fillStyle = '#20242e';
    ctx.fillRect(x + 3, y + 3, 2, 2);
  }
  ctx.restore();
}

/**
 * Gig-Anstecker (die "Orden" dieses Spiels): eine kleine Backstage-Marke.
 * @param {number} nummer 0..7
 */
export function gigMarke(ctx, nummer, x, y, erhalten) {
  const farben = ['#8a7050', '#7048c8', '#404058', '#c03050', '#a0a8c0', '#f09030', '#30c0d0', '#50c8a0'];
  if (!erhalten) {
    ctx.fillStyle = '#9098a8';
    ctx.fillRect(x + 3, y + 3, 8, 8);
    return;
  }
  ctx.fillStyle = '#181820';
  ctx.fillRect(x + 1, y + 2, 12, 10);
  ctx.fillStyle = farben[nummer % farben.length];
  ctx.fillRect(x + 2, y + 3, 10, 8);
  ctx.fillStyle = '#f8f8f0';
  ctx.fillRect(x + 4, y + 5, 2, 2);
  ctx.fillRect(x + 8, y + 7, 2, 2);
}

/** Vollflächige Abdunklung, z. B. für Überblendungen. */
export function blende(ctx, breite, hoehe, staerke, farbe = '#000000') {
  if (staerke <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, staerke);
  ctx.fillStyle = farbe;
  ctx.fillRect(0, 0, breite, hoehe);
  ctx.restore();
}

/**
 * Zeichnet eine Liste als Menü in einem Fenster.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string[]} eintraege
 * @param {number} auswahl
 */
export function listenMenue(ctx, eintraege, auswahl, x, y, breite, bildzaehler, zeilenHoehe = 12) {
  const hoehe = eintraege.length * zeilenHoehe + 8;
  fenster(ctx, x, y, breite, hoehe);
  eintraege.forEach((eintrag, i) => {
    const zeileY = y + 5 + i * zeilenHoehe;
    if (i === auswahl) zeiger(ctx, x + 4, zeileY + 1, bildzaehler);
    zeichneText(ctx, eintrag, x + 11, zeileY, { farbe: UI.text });
  });
  return hoehe;
}
