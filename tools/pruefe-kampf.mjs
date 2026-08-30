// ============================================================================
// Kampfprüfung (Entwicklungswerkzeug)
// ----------------------------------------------------------------------------
// Spielt sehr viele Zufallskämpfe durch und prüft dabei die Zusicherungen des
// Kampfsystems: Jeder Kampf endet, Kraftpunkte bleiben im gültigen Bereich,
// jedes Ereignis ist bekannt, und es fliegt keine Ausnahme.
//
// Aufruf:  node tools/pruefe-kampf.mjs [Anzahl]
// ============================================================================

import { ARTEN } from '../public/js/data/arten.js';
import { erstelleHardtekkmon, maxKp } from '../public/js/game/hardtekkmon.js';
import { starteKampf, fuehreRunde, wechsleEigenes } from '../public/js/battle/kampf.js';

const ANZAHL = Number(process.argv[2] ?? 400);
const MAX_RUNDEN = 300;

const BEKANNTE_EREIGNISSE = new Set([
  'text', 'angriff', 'schaden', 'heilung', 'status', 'werte', 'umkippen',
  'erfahrung', 'aufstieg', 'lernen', 'entwicklung', 'wurf', 'ende',
  'gegnerWechsel', 'eigenerWechsel',
]);

const zufallsArt = () => ARTEN[Math.floor(Math.random() * ARTEN.length)].name;
const zufallsTeam = (groesse, stufe) => Array.from(
  { length: groesse },
  () => erstelleHardtekkmon(zufallsArt(), stufe),
);

const fehler = [];
let runden = 0;
let ergebnisse = { sieg: 0, niederlage: 0, gefangen: 0, geflohen: 0, abbruch: 0 };

for (let i = 0; i < ANZAHL; i += 1) {
  const stufe = 5 + Math.floor(Math.random() * 55);
  const team = zufallsTeam(1 + Math.floor(Math.random() * 6), stufe);
  const istTrainer = Math.random() < 0.5;

  // Gelegentlich trägt ein Bank-Mon den EP-Teiler – prüft den Erfahrungssplit mit.
  if (team.length > 1 && Math.random() < 0.2) {
    team[1 + Math.floor(Math.random() * (team.length - 1))].item = 'EP-Teiler';
  }
  // Und das kämpfende Mon selbst trägt gelegentlich ein Heil- oder
  // Statusmittel – prüft den automatischen Einsatz unter 20 KP mit.
  if (Math.random() < 0.3) {
    team[0].item = Math.random() < 0.5 ? 'Mate' : 'Kaugummi';
  }

  const kampf = istTrainer
    ? starteKampf({ art: 'trainer', team, gegnerTeam: zufallsTeam(1 + Math.floor(Math.random() * 4), stufe), trainer: { name: 'Prüfer' } })
    : starteKampf({ art: 'wild', team, wildesMon: erstelleHardtekkmon(zufallsArt(), stufe) });

  let schutz = 0;
  while (!kampf.vorbei && schutz < MAX_RUNDEN) {
    schutz += 1;
    runden += 1;

    if (kampf.wechselNoetig) {
      const index = kampf.team.findIndex((mon) => mon.kp > 0);
      if (index < 0) { fehler.push('Wechsel nötig, aber kein Team mehr übrig'); break; }
      wechsleEigenes(kampf, index);
      continue;
    }

    const wurf = Math.random();
    let aktion = { art: 'attacke', index: Math.floor(Math.random() * kampf.eigene.mon.attacken.length) };
    if (wurf < 0.06) aktion = { art: 'gegenstand', gegenstand: 'Samplepack' };
    else if (wurf < 0.1) aktion = { art: 'gegenstand', gegenstand: 'Super-Mate', zielIndex: kampf.eigenesIndex };
    else if (wurf < 0.12) aktion = { art: 'gegenstand', gegenstand: 'Roter Lolli', zielIndex: kampf.eigenesIndex };
    else if (wurf < 0.15) aktion = { art: 'flucht' };
    else if (wurf < 0.19) {
      const ersatz = kampf.team.findIndex((mon, index) => mon.kp > 0 && index !== kampf.eigenesIndex);
      if (ersatz >= 0) aktion = { art: 'wechsel', index: ersatz };
    }

    let ereignisse;
    try {
      ereignisse = fuehreRunde(kampf, aktion);
    } catch (ausnahme) {
      fehler.push(`Ausnahme in Runde ${schutz}: ${ausnahme.message}`);
      break;
    }

    for (const e of ereignisse) {
      if (!BEKANNTE_EREIGNISSE.has(e.typ)) fehler.push(`Unbekanntes Ereignis "${e.typ}"`);
      if (e.typ === 'text' && typeof e.text !== 'string') fehler.push('Textereignis ohne Text');
    }

    for (const mon of [...kampf.team, ...kampf.gegnerTeam]) {
      if (mon.kp < 0) fehler.push('Kraftpunkte unter null');
      if (mon.kp > maxKp(mon)) fehler.push('Kraftpunkte über dem Höchstwert');
      if (!Number.isFinite(mon.kp)) fehler.push('Kraftpunkte sind keine Zahl');
    }
  }

  if (kampf.vorbei) ergebnisse[kampf.ergebnis] += 1;
  else { ergebnisse.abbruch += 1; fehler.push(`Kampf ${i} wurde nach ${MAX_RUNDEN} Runden nicht fertig`); }
}

console.log(`Kämpfe: ${ANZAHL}, Runden gesamt: ${runden}`);
console.log('Ergebnisse:', ergebnisse);
if (fehler.length === 0) {
  console.log('Keine Fehler gefunden.');
} else {
  console.log(`${fehler.length} Fehler:`);
  for (const f of [...new Set(fehler)].slice(0, 20)) console.log(' -', f);
  process.exitCode = 1;
}
