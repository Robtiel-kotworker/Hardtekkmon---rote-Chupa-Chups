// ============================================================================
// Quelltextprüfung (Entwicklungswerkzeug)
// ----------------------------------------------------------------------------
// Sucht nach den Kleinigkeiten, die beim Aufräumen liegen bleiben: ungenutzte
// Importe, Importe auf nicht vorhandene Dateien und Exporte, die es im Ziel
// gar nicht gibt.
//
// Aufruf:  node tools/pruefe-quellen.mjs
// ============================================================================

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const WURZEL = new URL('../public/js/', import.meta.url).pathname;

async function alleDateien(verzeichnis) {
  const eintraege = await readdir(verzeichnis, { withFileTypes: true });
  const dateien = [];
  for (const eintrag of eintraege) {
    const voll = path.join(verzeichnis, eintrag.name);
    if (eintrag.isDirectory()) dateien.push(...await alleDateien(voll));
    else if (eintrag.name.endsWith('.js')) dateien.push(voll);
  }
  return dateien;
}

const fehler = [];
const dateien = await alleDateien(WURZEL);

for (const datei of dateien) {
  const quelle = await readFile(datei, 'utf8');
  const kurz = path.relative(WURZEL, datei);

  const importe = [...quelle.matchAll(/import\s+(?:([\w*\s{},]+)\s+from\s+)?'([^']+)'/g)];

  for (const [, namen, pfad] of importe) {
    if (pfad.startsWith('.')) {
      const ziel = path.resolve(path.dirname(datei), pfad);
      if (!existsSync(ziel)) fehler.push(`${kurz}: Import "${pfad}" zeigt ins Leere`);
    }
    if (!namen) continue;

    const bezeichner = namen
      .replace(/[{}]/g, ' ')
      .split(',')
      .map((teil) => teil.trim().split(/\s+as\s+/).pop().trim())
      .filter((teil) => teil && teil !== '*');

    const rumpf = quelle.slice(quelle.indexOf(`'${pfad}'`) + pfad.length + 2);
    for (const name of bezeichner) {
      const treffer = rumpf.match(new RegExp(`\\b${name.replace(/[$]/g, '\\$')}\\b`, 'g'));
      if (!treffer) fehler.push(`${kurz}: "${name}" wird importiert, aber nicht benutzt`);
    }
  }
}

console.log(`Dateien geprüft: ${dateien.length}`);
if (fehler.length === 0) {
  console.log('Keine Fehler gefunden.');
} else {
  console.log(`${fehler.length} Hinweise:`);
  for (const f of fehler) console.log(' -', f);
  process.exitCode = 1;
}
