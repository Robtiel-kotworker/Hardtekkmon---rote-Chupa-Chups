// ============================================================================
// Casino-Regeln
// ----------------------------------------------------------------------------
// Roulette, Blackjack, einarmiger Bandit und der Risikotisch – nur Regeln und
// Quoten, kein Zeichnen und keine Eingabe. Dadurch lassen sich die
// Auszahlungsquoten nachrechnen (siehe tools/pruefe-casino.mjs).
//
// Die Quoten sind an echte Spiele angelehnt und liegen alle knapp unter 100 %,
// so wie im echten Haus: Auf Dauer gewinnt die Bank, kurzfristig kann es in
// beide Richtungen kräftig ausschlagen.
// ============================================================================

import { zahl, eines } from '../engine/rng.js';

// --- Roulette ---------------------------------------------------------------
// Französisches Rad mit einer einzigen Null: 37 Fächer. Alle drei Einsatzarten
// zahlen dieselbe Quote von 36/37 = 97,3 %, genau wie am echten Tisch.

/** Die roten Zahlen des französischen Rads. */
const ROT = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

/**
 * Einsatzarten am Roulettetisch. `faktor` ist die Auszahlung inklusive
 * Einsatz: Wer 100 auf Rot setzt und trifft, bekommt 200 zurück.
 */
export const ROULETTE_EINSAETZE = {
  rot: { name: 'ROT', faktor: 2, trifft: (z) => z !== 0 && ROT.has(z) },
  schwarz: { name: 'SCHWARZ', faktor: 2, trifft: (z) => z !== 0 && !ROT.has(z) },
  gerade: { name: 'GERADE', faktor: 2, trifft: (z) => z !== 0 && z % 2 === 0 },
  ungerade: { name: 'UNGERADE', faktor: 2, trifft: (z) => z % 2 === 1 },
  ersteReihe: { name: '1-12', faktor: 3, trifft: (z) => z >= 1 && z <= 12 },
  zweiteReihe: { name: '13-24', faktor: 3, trifft: (z) => z >= 13 && z <= 24 },
  dritteReihe: { name: '25-36', faktor: 3, trifft: (z) => z >= 25 && z <= 36 },
  /** Volle Zahl: 35:1, also das 36-Fache des Einsatzes zurück. */
  zahl: { name: 'ZAHL', faktor: 36, trifft: (z, gewaehlt) => z === gewaehlt },
};

/** Dreht das Rad und liefert das Ergebnis samt Auszahlung. */
export function dreheRoulette(einsatzArt, betrag, gewaehlteZahl = 0) {
  const art = ROULETTE_EINSAETZE[einsatzArt];
  const gefallen = zahl(0, 36);
  const gewonnen = Boolean(art && art.trifft(gefallen, gewaehlteZahl));
  return {
    zahl: gefallen,
    rot: gefallen !== 0 && ROT.has(gefallen),
    gewonnen,
    auszahlung: gewonnen ? betrag * art.faktor : 0,
  };
}

// --- Einarmiger Bandit ------------------------------------------------------
// Drei Walzen mit derselben Symbolverteilung. Die Gewichte und die
// Auszahlungstabelle ergeben zusammen eine Ausschüttung von rund 91 % – der
// übliche Bereich echter Automaten liegt zwischen 88 und 96 %.

/** Symbole der Walze samt Häufigkeit. Zusammen 22 Felder je Walze. */
export const WALZE = [
  { symbol: 'Mate', gewicht: 8 },
  { symbol: 'Platte', gewicht: 6 },
  { symbol: 'Box', gewicht: 4 },
  { symbol: 'Kick', gewicht: 3 },
  { symbol: 'Lolli', gewicht: 1 },
];

/** Auszahlung als Vielfaches des Einsatzes. */
export const BANDIT_QUOTEN = {
  drei: { Lolli: 300, Kick: 50, Box: 20, Platte: 10, Mate: 5 },
  zwei: { Lolli: 8, Kick: 3 },
};

/** Die Walze als flache Liste, damit ein einfacher Griff daraus zieht. */
const WALZENFELDER = WALZE.flatMap((eintrag) => Array(eintrag.gewicht).fill(eintrag.symbol));

/**
 * Bewertet drei Symbole. Zuerst zählt der Dreier, sonst der beste Zweier.
 * @param {string[]} symbole
 * @returns {{ gewinn: number, symbol: string|null, anzahl: number }}
 */
export function bewerteWalzen(symbole) {
  const zaehler = {};
  for (const s of symbole) zaehler[s] = (zaehler[s] ?? 0) + 1;

  for (const [symbol, anzahl] of Object.entries(zaehler)) {
    if (anzahl === 3) return { gewinn: BANDIT_QUOTEN.drei[symbol] ?? 0, symbol, anzahl: 3 };
  }
  let bester = { gewinn: 0, symbol: null, anzahl: 0 };
  for (const [symbol, anzahl] of Object.entries(zaehler)) {
    if (anzahl !== 2) continue;
    const gewinn = BANDIT_QUOTEN.zwei[symbol] ?? 0;
    if (gewinn > bester.gewinn) bester = { gewinn, symbol, anzahl: 2 };
  }
  return bester;
}

/** Ein Zug am einarmigen Banditen. */
export function ziehBandit(betrag) {
  const symbole = [eines(WALZENFELDER), eines(WALZENFELDER), eines(WALZENFELDER)];
  const treffer = bewerteWalzen(symbole);
  return { symbole, ...treffer, auszahlung: betrag * treffer.gewinn };
}

// --- Blackjack --------------------------------------------------------------
// Klassische Regeln: Der Geber zieht bis 17, ein Blackjack zahlt 3:2. Gespielt
// wird aus einem frischen Deck je Runde.

const KARTENWERTE = [
  ['A', 11], ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['7', 7],
  ['8', 8], ['9', 9], ['10', 10], ['B', 10], ['D', 10], ['K', 10],
];

/** Frisches, gemischtes Deck aus 52 Karten. */
export function neuesDeck() {
  const deck = [];
  for (let farbe = 0; farbe < 4; farbe += 1) {
    for (const [name, wert] of KARTENWERTE) deck.push({ name, wert });
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = zahl(0, i);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Punkte einer Hand. Asse zählen 11, werden aber einzeln auf 1 abgewertet,
 * solange die Hand sonst über 21 läge.
 */
export function handwert(hand) {
  let summe = hand.reduce((s, k) => s + k.wert, 0);
  let asse = hand.filter((k) => k.name === 'A').length;
  while (summe > 21 && asse > 0) {
    summe -= 10;
    asse -= 1;
  }
  return summe;
}

/** Blackjack: genau zwei Karten mit zusammen 21. */
export function istBlackjack(hand) {
  return hand.length === 2 && handwert(hand) === 21;
}

/**
 * Wertet eine fertige Blackjack-Runde aus.
 * @returns {{ ergebnis: 'blackjack'|'gewonnen'|'unentschieden'|'verloren', auszahlung: number }}
 */
export function werteBlackjack(spielerHand, geberHand, betrag) {
  const spieler = handwert(spielerHand);
  const geber = handwert(geberHand);

  if (spieler > 21) return { ergebnis: 'verloren', auszahlung: 0 };
  if (istBlackjack(spielerHand) && !istBlackjack(geberHand)) {
    // 3:2 – Einsatz plus das Anderthalbfache zurück.
    return { ergebnis: 'blackjack', auszahlung: Math.floor(betrag * 2.5) };
  }
  if (geber > 21 || spieler > geber) return { ergebnis: 'gewonnen', auszahlung: betrag * 2 };
  if (spieler === geber) return { ergebnis: 'unentschieden', auszahlung: betrag };
  return { ergebnis: 'verloren', auszahlung: 0 };
}

// --- Alles oder Nichts ------------------------------------------------------
// Der Risikotisch: Der Einsatz verdoppelt sich oder ist weg. Die Gewinnchance
// liegt mit 48 % knapp unter der Hälfte – dieselbe Größenordnung wie Rot oder
// Schwarz am Roulettetisch (48,6 %), nur ohne Zwischenstufen.

export const RISIKO_CHANCE = 0.48;

/** Ein Wurf am Risikotisch. */
export function wirfRisiko(betrag) {
  const gewonnen = zahl(1, 10000) <= RISIKO_CHANCE * 10000;
  return { gewonnen, auszahlung: gewonnen ? betrag * 2 : 0 };
}
