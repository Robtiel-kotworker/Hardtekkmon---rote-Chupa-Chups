// ============================================================================
// Casino-Quotenprüfung (Entwicklungswerkzeug)
// ----------------------------------------------------------------------------
// Rechnet die Ausschüttung jedes Spiels exakt aus (Roulette, Bandit,
// Risikotisch) und simuliert Blackjack, für das sich die Quote nicht in
// geschlossener Form angeben lässt. Alle Spiele müssen unter 100 % liegen –
// sonst wäre das Casino eine Gelddruckmaschine – und über 85 %, sonst ist es
// nur frustrierend.
//
// Aufruf:  node tools/pruefe-casino.mjs
// ============================================================================

import {
  ROULETTE_EINSAETZE, WALZE, BANDIT_QUOTEN, bewerteWalzen, RISIKO_CHANCE,
  neuesDeck, handwert, istBlackjack, werteBlackjack,
} from '../public/js/game/casino.js';

const fehler = [];
const UNTERGRENZE = 0.85;
const OBERGRENZE = 1.0;

function pruefe(name, quote) {
  const prozent = (quote * 100).toFixed(2);
  const ok = quote >= UNTERGRENZE && quote < OBERGRENZE;
  console.log(`  ${name.padEnd(22)} ${prozent.padStart(6)} %  ${ok ? '' : '<-- ausserhalb 85..100 %'}`);
  if (!ok) fehler.push(`${name}: ${prozent} %`);
}

// --- Roulette: exakt, über alle 37 Fächer -----------------------------------
console.log('Roulette (37 Fächer, eine Null):');
for (const [schluessel, art] of Object.entries(ROULETTE_EINSAETZE)) {
  let treffer = 0;
  for (let z = 0; z <= 36; z += 1) if (art.trifft(z, 17)) treffer += 1;
  pruefe(art.name, (treffer / 37) * art.faktor);
  if (schluessel === 'zahl' && treffer !== 1) fehler.push('Volle Zahl trifft nicht genau einmal');
}

// --- Einarmiger Bandit: exakt, über alle Symbolkombinationen ----------------
console.log('\nEinarmiger Bandit (3 Walzen):');
const gesamtFelder = WALZE.reduce((s, e) => s + e.gewicht, 0);
let banditQuote = 0;
for (const a of WALZE) {
  for (const b of WALZE) {
    for (const c of WALZE) {
      const p = (a.gewicht / gesamtFelder) * (b.gewicht / gesamtFelder) * (c.gewicht / gesamtFelder);
      banditQuote += p * bewerteWalzen([a.symbol, b.symbol, c.symbol]).gewinn;
    }
  }
}
console.log(`  Felder je Walze: ${gesamtFelder}`);
for (const [symbol, faktor] of Object.entries(BANDIT_QUOTEN.drei)) {
  const g = WALZE.find((e) => e.symbol === symbol).gewicht;
  const p = (g / gesamtFelder) ** 3;
  console.log(`  3x ${symbol.padEnd(8)} x${String(faktor).padStart(3)}   Chance 1 zu ${Math.round(1 / p)}`);
}
pruefe('Bandit gesamt', banditQuote);

// --- Risikotisch ------------------------------------------------------------
console.log('\nAlles oder Nichts:');
pruefe('Risikotisch', RISIKO_CHANCE * 2);

// --- Blackjack: simuliert ---------------------------------------------------
// Der Spieler zieht nach einfacher Faustregel bis 17 – so spielt auch der
// Geber, und so spielt ein Gelegenheitsspieler ungefähr.
console.log('\nBlackjack (simuliert, Spieler zieht bis 17):');
function spieleBlackjack() {
  const deck = neuesDeck();
  const zieh = () => deck.pop();
  const spieler = [zieh(), zieh()];
  const geber = [zieh(), zieh()];

  if (istBlackjack(spieler) || istBlackjack(geber)) return werteBlackjack(spieler, geber, 1);
  while (handwert(spieler) < 17) spieler.push(zieh());
  if (handwert(spieler) <= 21) while (handwert(geber) < 17) geber.push(zieh());
  return werteBlackjack(spieler, geber, 1);
}

const runden = 400000;
let ausgezahlt = 0;
const zaehler = { blackjack: 0, gewonnen: 0, unentschieden: 0, verloren: 0 };
for (let i = 0; i < runden; i += 1) {
  const r = spieleBlackjack();
  ausgezahlt += r.auszahlung;
  zaehler[r.ergebnis] += 1;
}
for (const [k, v] of Object.entries(zaehler)) {
  console.log(`  ${k.padEnd(16)} ${((v / runden) * 100).toFixed(2)} %`);
}
pruefe('Blackjack gesamt', ausgezahlt / runden);

console.log('');
if (fehler.length === 0) {
  console.log('Keine Fehler gefunden.');
} else {
  console.log(`${fehler.length} Hinweise:`);
  for (const f of fehler) console.log(' -', f);
  process.exitCode = 1;
}
