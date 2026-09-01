// ============================================================================
// Casino-Grafik
// ----------------------------------------------------------------------------
// Alle Zeichenroutinen für die vier Casinospiele: Spielkarten, Walzensymbole,
// das Roulette-Rad samt Kugel und der Setztisch. Reine Zeichenfunktionen ohne
// eigenen Zustand – die Animation (welcher Frame, welcher Fortschritt) steuert
// die Szene in scenes/casino.js, hier steht nur, wie ein einzelnes Bild dazu
// aussieht.
// ============================================================================

import { zeichneText, textBreite } from './font.js';
import { ROT } from '../game/casino.js';

// --- Farbhilfen ---------------------------------------------------------------

/** Rot, Schwarz oder Grün (nur die Null) einer Roulettezahl. */
export function feldfarbe(zahl) {
  if (zahl === 0) return '#1e8a44';
  return ROT.has(zahl) ? '#c8203c' : '#20242e';
}

const FARBE_ROT = new Set(['♥', '♦']);

/** @param {string} farbe Eine der vier Kartenfarben (♠♥♦♣). */
function istRoteKartenfarbe(farbe) {
  return FARBE_ROT.has(farbe);
}

// --- Spielkarten ----------------------------------------------------------------

export const KARTE_BREITE = 20;
export const KARTE_HOEHE = 28;

/** Kleines Pik-/Herz-/Karo-/Kreuz-Symbol als gefüllter Pfad. */
function pfadFarbsymbol(ctx, farbe, cx, cy, r) {
  ctx.beginPath();
  switch (farbe) {
    case '♥':
      ctx.moveTo(cx, cy + r);
      ctx.bezierCurveTo(cx - r * 1.4, cy - r * 0.2, cx - r * 0.5, cy - r * 1.3, cx, cy - r * 0.35);
      ctx.bezierCurveTo(cx + r * 0.5, cy - r * 1.3, cx + r * 1.4, cy - r * 0.2, cx, cy + r);
      break;
    case '♠':
      ctx.moveTo(cx, cy - r);
      ctx.bezierCurveTo(cx - r * 1.4, cy + r * 0.2, cx - r * 0.5, cy + r * 1.3, cx, cy + r * 0.35);
      ctx.bezierCurveTo(cx + r * 0.5, cy + r * 1.3, cx + r * 1.4, cy + r * 0.2, cx, cy - r);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(cx - 1, cy + r * 0.25, 2, Math.max(1, r * 0.75));
      return;
    case '♦':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.75, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.75, cy);
      break;
    case '♣':
    default:
      ctx.arc(cx, cy - r * 0.45, r * 0.55, 0, Math.PI * 2);
      ctx.moveTo(cx - r * 0.55 + r * 0.55, cy + r * 0.15);
      ctx.arc(cx - r * 0.55, cy + r * 0.15, r * 0.55, 0, Math.PI * 2);
      ctx.moveTo(cx + r * 0.55 + r * 0.55, cy + r * 0.15);
      ctx.arc(cx + r * 0.55, cy + r * 0.15, r * 0.55, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(cx - 1, cy + r * 0.35, 2, Math.max(1, r * 0.65));
      return;
  }
  ctx.closePath();
  ctx.fill();
}

/** Kleines Plattensymbol für den Kartenrücken – passt zum Rest des Spiels. */
function zeichneRueckenmuster(ctx, x, y, groesse) {
  const r = groesse / 2;
  ctx.fillStyle = '#12121a';
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c8203c';
  ctx.beginPath();
  ctx.arc(x + r, y + r, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8c1526';
  ctx.beginPath();
  ctx.arc(x + r, y + r, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Eine einzelne Spielkarte: aufgedeckt mit Rang, Farbsymbol oben links und
 * groß in der Mitte – oder verdeckt als Rücken, wenn der Geber seine zweite
 * Karte noch versteckt hält.
 * @param {{ name: string, farbe: string }} [karte]
 */
export function zeichneKarte(ctx, karte, x, y, { verdeckt = false } = {}) {
  ctx.fillStyle = 'rgba(8,4,4,0.35)';
  ctx.fillRect(x + 2, y + 2, KARTE_BREITE, KARTE_HOEHE);

  if (verdeckt || !karte) {
    ctx.fillStyle = '#181820';
    ctx.fillRect(x, y, KARTE_BREITE, KARTE_HOEHE);
    ctx.fillStyle = '#7a1424';
    ctx.fillRect(x + 1, y + 1, KARTE_BREITE - 2, KARTE_HOEHE - 2);
    ctx.fillStyle = '#902838';
    ctx.fillRect(x + 3, y + 3, KARTE_BREITE - 6, KARTE_HOEHE - 6);
    zeichneRueckenmuster(ctx, x + KARTE_BREITE / 2 - 5, y + KARTE_HOEHE / 2 - 5, 10);
    return;
  }

  const farbeText = istRoteKartenfarbe(karte.farbe) ? '#c8203c' : '#20242e';

  ctx.fillStyle = '#181820';
  ctx.fillRect(x, y, KARTE_BREITE, KARTE_HOEHE);
  ctx.fillStyle = '#f8f8f0';
  ctx.fillRect(x + 1, y + 1, KARTE_BREITE - 2, KARTE_HOEHE - 2);

  zeichneText(ctx, karte.name, x + 3, y + 3, { farbe: farbeText });
  ctx.fillStyle = farbeText;
  pfadFarbsymbol(ctx, karte.farbe, x + 6, y + 15, 3.4);

  ctx.fillStyle = farbeText;
  pfadFarbsymbol(ctx, karte.farbe, x + KARTE_BREITE / 2, y + KARTE_HOEHE / 2 + 3, 7);
}

/** Handbreite für eine Reihe Karten samt Überlappung, für die Positionierung. */
export function handBreite(anzahl, ueberlappung = 12) {
  if (anzahl <= 0) return 0;
  return KARTE_BREITE + (anzahl - 1) * ueberlappung;
}

// --- Einarmiger Bandit ------------------------------------------------------

export const REEL_SYMBOL_HOEHE = 22;
const REEL_BREITE = 24;

/** Eines der fünf Walzensymbole, mittig in ein Feld von `groesse` Pixeln. */
export function zeichneWalzensymbol(ctx, symbol, x, y, groesse = REEL_SYMBOL_HOEHE) {
  const cx = x + REEL_BREITE / 2;
  const cy = y + groesse / 2;

  switch (symbol) {
    case 'Mate':
      ctx.fillStyle = '#c8c8d8';
      ctx.fillRect(cx - 4, cy - 9, 8, 3);
      ctx.fillStyle = '#f8f8f0';
      ctx.fillRect(cx - 6, cy - 6, 12, 13);
      ctx.fillStyle = '#40c0e0';
      ctx.fillRect(cx - 5, cy - 1, 10, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(cx - 5, cy - 1, 2, 7);
      break;
    case 'Platte':
      ctx.fillStyle = '#12121a';
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#383846';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#c8203c';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#12121a';
      ctx.beginPath();
      ctx.arc(cx, cy, 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'Box':
      ctx.fillStyle = '#20242e';
      ctx.fillRect(cx - 8, cy - 9, 16, 18);
      ctx.fillStyle = '#3a4050';
      ctx.fillRect(cx - 7, cy - 8, 14, 16);
      ctx.fillStyle = '#12121a';
      ctx.beginPath();
      ctx.arc(cx, cy - 1, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#585868';
      ctx.beginPath();
      ctx.arc(cx, cy - 1, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8c860';
      ctx.fillRect(cx - 6, cy + 6, 3, 2);
      break;
    case 'Kick':
      ctx.fillStyle = '#e87838';
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a84c1c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#20242e';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'Lolli':
    default:
      ctx.strokeStyle = '#e8d8b0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 3);
      ctx.lineTo(cx, cy + 11);
      ctx.stroke();
      ctx.fillStyle = '#c8203c';
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f8f0d8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 4.5, 0.3, Math.PI * 1.4);
      ctx.stroke();
      break;
  }
}

/**
 * Eine Walze im Automatenfenster: Spinnt sie noch, läuft der Streifen mit
 * `fortschritt` (0 = ganz am Anfang, 1 = genau ausgerichtet) durch; steht sie,
 * zeigt sie nur noch das Ergebnis-Symbol mittig.
 * @param {string[]} streifen Symbolfolge, deren letztes Element das Ergebnis ist.
 */
export function zeichneWalze(ctx, x, y, hoehe, streifen, fortschritt) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, REEL_BREITE, hoehe);
  ctx.clip();

  ctx.fillStyle = '#0c0c12';
  ctx.fillRect(x, y, REEL_BREITE, hoehe);

  const position = (streifen.length - 1) * fortschritt;
  const basis = Math.floor(position);
  const rest = position - basis;
  const mitteY = y + hoehe / 2 - REEL_SYMBOL_HOEHE / 2 - rest * REEL_SYMBOL_HOEHE;

  for (let i = -1; i <= 2; i += 1) {
    const index = basis + i;
    if (index < 0 || index >= streifen.length) continue;
    zeichneWalzensymbol(ctx, streifen[index], x, mitteY + i * REEL_SYMBOL_HOEHE);
  }

  // Leichte Abdunklung oben und unten – macht die Fensteröffnung deutlich.
  const blende = ctx.createLinearGradient(0, y, 0, y + hoehe);
  blende.addColorStop(0, 'rgba(0,0,0,0.55)');
  blende.addColorStop(0.25, 'rgba(0,0,0,0)');
  blende.addColorStop(0.75, 'rgba(0,0,0,0)');
  blende.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = blende;
  ctx.fillRect(x, y, REEL_BREITE, hoehe);
  ctx.restore();
}

/** Rahmen und Gehäuse rund um die drei Walzenfenster. */
export function zeichneAutomatGehaeuse(ctx, x, y, breite, hoehe) {
  ctx.fillStyle = '#5a3020';
  ctx.fillRect(x, y, breite, hoehe);
  ctx.fillStyle = '#c8a032';
  ctx.fillRect(x + 3, y + 3, breite - 6, hoehe - 6);
  ctx.fillStyle = '#1c1c24';
  ctx.fillRect(x + 6, y + 6, breite - 12, hoehe - 12);
}

/** Baut für eine Walze einen zufälligen Streifen, der mit dem Ergebnis endet. */
export function baueWalzenstreifen(zufallsfeld, ziel, laenge = 18) {
  const streifen = [];
  for (let i = 0; i < laenge - 1; i += 1) {
    streifen.push(zufallsfeld[Math.floor(Math.random() * zufallsfeld.length)]);
  }
  streifen.push(ziel);
  return streifen;
}

// --- Roulette ----------------------------------------------------------------

/** Physische Reihenfolge der Fächer auf einem europäischen Rad. */
export const RAD_REIHENFOLGE = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

/** Winkel eines Fachs (0 oben, im Uhrzeigersinn), Fach-Index in RAD_REIHENFOLGE. */
export function radWinkel(fachIndex) {
  return (fachIndex / RAD_REIHENFOLGE.length) * Math.PI * 2 - Math.PI / 2;
}

/**
 * Zeichnet das Rad: 37 farbige Fächer mit Zahl, die goldene Nabe in der Mitte
 * und die weiße Kugel. `blinkFach` lässt das Zielfach gelb aufblitzen, sobald
 * die Kugel liegen geblieben ist.
 */
export function zeichneRouletteRad(ctx, optionen) {
  const {
    mitteX, mitteY, radiusAussen, radiusInnen, kugelWinkel, kugelRadius,
    blinkFach = null, blinkAn = false, alpha = 1,
  } = optionen;

  ctx.save();
  ctx.globalAlpha = alpha;

  const anzahl = RAD_REIHENFOLGE.length;
  const schritt = (Math.PI * 2) / anzahl;

  ctx.fillStyle = '#2a1810';
  ctx.beginPath();
  ctx.arc(mitteX, mitteY, radiusAussen + 4, 0, Math.PI * 2);
  ctx.fill();

  RAD_REIHENFOLGE.forEach((zahl, i) => {
    const start = radWinkel(i) - schritt / 2;
    const ende = start + schritt;
    const istBlink = blinkFach === i && blinkAn;

    ctx.fillStyle = istBlink ? '#f0c040' : feldfarbe(zahl);
    ctx.beginPath();
    ctx.moveTo(mitteX, mitteY);
    ctx.arc(mitteX, mitteY, radiusAussen, start, ende);
    ctx.closePath();
    ctx.fill();
  });

  // Innere Nabe deckt die Spitzen der Fächer ab, damit nur ein Ring bleibt.
  ctx.fillStyle = '#3a2018';
  ctx.beginPath();
  ctx.arc(mitteX, mitteY, radiusInnen, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c8a032';
  ctx.beginPath();
  ctx.arc(mitteX, mitteY, radiusInnen, 0, Math.PI * 2);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#e8c860';
  ctx.stroke();

  // Zahlen aufrecht auf mittlerer Fachhöhe, wie auf einer Uhr angeordnet.
  const textRadius = (radiusAussen + radiusInnen) / 2 + 2;
  RAD_REIHENFOLGE.forEach((zahl, i) => {
    const winkel = radWinkel(i);
    const text = `${zahl}`;
    const tx = mitteX + Math.cos(winkel) * textRadius - textBreite(text) / 2;
    const ty = mitteY + Math.sin(winkel) * textRadius - 3;
    zeichneText(ctx, text, tx, ty, { farbe: '#f8f4e8' });
  });

  // Goldener Außenring.
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#e8c860';
  ctx.beginPath();
  ctx.arc(mitteX, mitteY, radiusAussen, 0, Math.PI * 2);
  ctx.stroke();

  // Die Kugel.
  const bx = mitteX + Math.cos(kugelWinkel) * kugelRadius;
  const by = mitteY + Math.sin(kugelWinkel) * kugelRadius;
  ctx.fillStyle = '#181820';
  ctx.beginPath();
  ctx.arc(bx + 0.6, by + 0.6, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8f8f0';
  ctx.beginPath();
  ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Layout-Maße des Setztischs – auch von der Szene für Klicks/Hervorhebung genutzt. */
export const TISCH = {
  breite: 158,
  // Zahlenraster (30) + Dutzende (11) + Rot/Schwarz (11) + Gerade/Ungerade (11).
  hoehe: 63,
  nullBreite: 14,
  spalten: 12,
  zeilen: 3,
  zellenBreite: 12,
  zellenHoehe: 10,
};

/** Nummer einer Rasterzelle: Spalte c (0..11), Zeile r (0 oben .. 2 unten). */
function tischZahl(c, r) {
  // Unterste Zeile 1,4,7..; mittlere 2,5,8..; oberste 3,6,9..
  return c * 3 + (3 - r);
}

/**
 * Der Setztisch: Null links, dahinter das 3x12-Zahlenraster in echten Reihen
 * und Farben, darunter die Dutzend- und Außenfelder. `hervorZahl` lässt das
 * Feld der gefallenen Zahl golden aufleuchten.
 */
export function zeichneRouletteTisch(ctx, x, y, { hervorZahl = null, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = '#1e6a34';
  ctx.fillRect(x - 2, y - 2, TISCH.breite + 4, TISCH.hoehe + 4);
  ctx.fillStyle = '#155029';
  ctx.fillRect(x, y, TISCH.breite, TISCH.hoehe);

  const gitterHoehe = TISCH.zeilen * TISCH.zellenHoehe;
  const gitterBreite = TISCH.spalten * TISCH.zellenBreite;

  // Null, über die volle Rasterhöhe.
  zeichneTischzelle(ctx, x, y, TISCH.nullBreite, gitterHoehe, '0', feldfarbe(0), hervorZahl === 0);

  for (let c = 0; c < TISCH.spalten; c += 1) {
    for (let r = 0; r < TISCH.zeilen; r += 1) {
      const zahl = tischZahl(c, r);
      const zx = x + TISCH.nullBreite + c * TISCH.zellenBreite;
      const zy = y + r * TISCH.zellenHoehe;
      zeichneTischzelle(
        ctx, zx, zy, TISCH.zellenBreite, TISCH.zellenHoehe, `${zahl}`,
        feldfarbe(zahl), hervorZahl === zahl,
      );
    }
  }

  // Dutzende darunter.
  const dutzendY = y + gitterHoehe + 1;
  const dutzendBreite = gitterBreite / 3;
  ['1-12', '13-24', '25-36'].forEach((text, i) => {
    zeichneAussenfeld(ctx, x + TISCH.nullBreite + i * dutzendBreite, dutzendY, dutzendBreite, 10, text);
  });

  // Rot/Schwarz darunter, je über die halbe Breite.
  const farbY = dutzendY + 11;
  const farbBreite = gitterBreite / 2;
  [{ text: 'ROT', farbe: '#c8203c' }, { text: 'SCHWARZ', farbe: '#20242e' }].forEach((feld, i) => {
    zeichneAussenfeld(ctx, x + TISCH.nullBreite + i * farbBreite, farbY, farbBreite, 10, feld.text, feld.farbe);
  });

  // Gerade/Ungerade ganz unten, ebenfalls halbe Breite.
  const paritaetY = farbY + 11;
  ['GERADE', 'UNGERADE'].forEach((text, i) => {
    zeichneAussenfeld(ctx, x + TISCH.nullBreite + i * farbBreite, paritaetY, farbBreite, 10, text);
  });

  ctx.restore();
}

function zeichneTischzelle(ctx, x, y, breite, hoehe, text, farbe, hervor) {
  ctx.fillStyle = '#0c3018';
  ctx.fillRect(x, y, breite, hoehe);
  ctx.fillStyle = hervor ? '#f0c040' : farbe;
  ctx.fillRect(x + 0.5, y + 0.5, breite - 1, hoehe - 1);
  const textFarbe = hervor ? '#20242e' : '#f0ece0';
  zeichneText(ctx, text, x + (breite - textBreite(text)) / 2, y + (hoehe - 7) / 2, { farbe: textFarbe });
}

function zeichneAussenfeld(ctx, x, y, breite, hoehe, text, farbe = null) {
  ctx.fillStyle = '#0c3018';
  ctx.fillRect(x, y, breite, hoehe);
  ctx.fillStyle = farbe ?? '#1e6a34';
  ctx.fillRect(x + 0.5, y + 0.5, breite - 1, hoehe - 1);
  zeichneText(ctx, text, x + (breite - textBreite(text)) / 2, y + (hoehe - 7) / 2, { farbe: '#f0ece0' });
}

// --- Zeiteinteilung -------------------------------------------------------------

/** Kubisches Ease-Out: schnell am Anfang, sanft am Ende. */
export function easeOutKubisch(t) {
  const u = Math.min(1, Math.max(0, t));
  return 1 - (1 - u) ** 3;
}
