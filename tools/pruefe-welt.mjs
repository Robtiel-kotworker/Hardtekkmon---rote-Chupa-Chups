// ============================================================================
// Weltprüfung (Entwicklungswerkzeug)
// ----------------------------------------------------------------------------
// Prüft alle Karten auf die Fehler, die man beim Kartenbau leicht macht:
// Übergänge ins Leere, Türen auf festen Kacheln, Figuren in der Wand,
// unerreichbare Türen und einseitige Kartenverbindungen.
//
// Aufruf:  node tools/pruefe-welt.mjs
// ============================================================================

// Die Grafikmodule erwarten ein Dokument. Für die reine Datenprüfung genügt
// eine Attrappe – gezeichnet wird hier nichts.
const flaeche = () => ({
  width: 0,
  height: 0,
  getContext: () => new Proxy({}, { get: () => () => undefined, set: () => true }),
});
globalThis.document = { getElementById: flaeche, createElement: flaeche };

const { KARTEN } = await import('../public/js/data/world/karten.js');
const { KACHELN } = await import('../public/js/gfx/tiles.js');
const { TRAINER } = await import('../public/js/data/trainer.js');
const { GEGENSTAENDE } = await import('../public/js/data/gegenstaende.js');
const { BEGEGNUNGEN } = await import('../public/js/data/world/begegnungen.js');

const fehler = [];
const melde = (text) => fehler.push(text);

const kachelAn = (k, x, y) => (
  x >= 0 && y >= 0 && x < k.breite && y < k.hoehe ? k.kacheln[y * k.breite + x] : null
);
const fest = (name) => Boolean(KACHELN[name]?.fest);

for (const k of Object.values(KARTEN)) {
  if (k.kacheln.length !== k.breite * k.hoehe) melde(`${k.id}: Kachelzahl passt nicht`);

  for (const kachel of k.kacheln) {
    if (!KACHELN[kachel]) melde(`${k.id}: unbekannte Kachel "${kachel}"`);
  }

  if (k.begegnungen && !BEGEGNUNGEN[k.begegnungen]) {
    melde(`${k.id}: unbekannte Begegnungstabelle "${k.begegnungen}"`);
  }

  for (const w of k.warps) {
    const ziel = KARTEN[w.ziel];
    if (!ziel) { melde(`${k.id}: Übergang nach "${w.ziel}" – Karte fehlt`); continue; }
    if (fest(kachelAn(k, w.x, w.y))) melde(`${k.id}: Übergang bei ${w.x},${w.y} liegt auf fester Kachel`);
    const zielKachel = kachelAn(ziel, w.zx, w.zy);
    if (zielKachel === null) melde(`${k.id}: Ziel ${w.zx},${w.zy} liegt außerhalb von ${ziel.id}`);
    else if (fest(zielKachel)) melde(`${k.id}: Ziel ${w.zx},${w.zy} in ${ziel.id} ist fest (${zielKachel})`);
  }

  for (const n of k.npcs ?? []) {
    const kachel = kachelAn(k, n.x, n.y);
    if (kachel === null) melde(`${k.id}: Figur außerhalb der Karte bei ${n.x},${n.y}`);
    else if (fest(kachel)) melde(`${k.id}: Figur steht in "${kachel}" bei ${n.x},${n.y}`);
    if (n.trainer && !TRAINER[n.trainer]) melde(`${k.id}: unbekannter Trainer "${n.trainer}"`);
  }

  for (const g of k.gegenstaende ?? []) {
    if (g.gegenstand && !GEGENSTAENDE[g.gegenstand]) {
      melde(`${k.id}: unbekannter Gegenstand "${g.gegenstand}"`);
    }
  }

  for (const s of k.schilder ?? []) {
    if (kachelAn(k, s.x, s.y) !== 'schild') melde(`${k.id}: Schild bei ${s.x},${s.y} ohne Schildkachel`);
  }

  const gegenrichtung = { norden: 'sueden', sueden: 'norden', westen: 'osten', osten: 'westen' };
  for (const [seite, zielId] of Object.entries(k.verbindungen ?? {})) {
    const ziel = KARTEN[zielId];
    if (!ziel) { melde(`${k.id}: Verbindung ${seite} -> "${zielId}" fehlt`); continue; }
    if (ziel.verbindungen?.[gegenrichtung[seite]] !== k.id) {
      melde(`${k.id}: Verbindung ${seite} -> ${zielId} ist nicht beidseitig`);
    }
  }
}

/** Erreichbarkeit: Flutfüllung vom Startpunkt jeder Karte über begehbare Kacheln. */
function erreichbar(k, start) {
  const gesehen = new Set();
  const stapel = [start];
  while (stapel.length) {
    const { x, y } = stapel.pop();
    const schluessel = `${x},${y}`;
    if (gesehen.has(schluessel)) continue;
    const kachel = kachelAn(k, x, y);
    if (kachel === null || fest(kachel)) continue;
    gesehen.add(schluessel);
    stapel.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
  }
  return gesehen;
}

for (const k of Object.values(KARTEN)) {
  const eingang = (k.warps ?? []).find((w) => !fest(kachelAn(k, w.x, w.y)));
  if (!eingang) continue;
  const felder = erreichbar(k, { x: eingang.x, y: eingang.y });
  for (const w of k.warps ?? []) {
    if (!felder.has(`${w.x},${w.y}`)) {
      melde(`${k.id}: Übergang bei ${w.x},${w.y} ist vom Rest der Karte abgeschnitten`);
    }
  }
}

console.log(`Karten geprüft: ${Object.keys(KARTEN).length}`);
if (fehler.length === 0) {
  console.log('Keine Fehler gefunden.');
} else {
  console.log(`${fehler.length} Fehler:`);
  for (const f of fehler) console.log(' -', f);
  process.exitCode = 1;
}
