// ============================================================================
// Supabase-JS aktualisieren (Entwicklungswerkzeug)
// ----------------------------------------------------------------------------
// Lädt das Supabase-JS-SDK samt aller transitiven esm.sh-Abhängigkeiten
// (Node-Polyfills wie process/buffer/events) rekursiv herunter, schreibt sie
// als eigenständige Dateien nach public/js/vendor/ und verweist ihre Imports
// aufeinander um. Danach läuft engine/konto.js komplett ohne CDN-Zugriff –
// wichtig, weil ein CDN-Import als statischer ES-Modul-Import sonst offline
// (z. B. in der iOS-App ohne Netz) das Laden des kompletten main.js-Moduls
// verhindern würde, nicht nur das Login.
//
// Aufruf:  node tools/aktualisiere-supabase-js.mjs [version]
//          node tools/aktualisiere-supabase-js.mjs 2.112.3
// Ohne Version wird die aktuell in konto.js/vendor verwendete beibehalten;
// eine neue Version zu ziehen heißt: hier die Versionsnummer angeben, danach
// den Import in engine/konto.js unverändert lassen (Dateiname bleibt gleich).
// ============================================================================

import { writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = process.argv[2] ?? '2.112.3';
const BASE = 'https://esm.sh';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/js/vendor');

const localFor = new Map();
const written = new Set();
const queue = [];

function enqueue(remote, local) {
  if (localFor.has(remote)) return localFor.get(remote);
  localFor.set(remote, local);
  queue.push(remote);
  return local;
}

enqueue(`/@supabase/supabase-js@${VERSION}/es2022/supabase-js.bundle.mjs`, 'supabase-js.mjs');

await rm(OUT, { recursive: true, force: true });

while (queue.length) {
  const remote = queue.shift();
  if (written.has(remote)) continue;
  written.add(remote);
  const local = localFor.get(remote);

  const antwort = await fetch(BASE + remote);
  if (!antwort.ok) throw new Error(`Download fehlgeschlagen ${remote}: ${antwort.status}`);
  let quelle = await antwort.text();
  quelle = quelle.replace(/\/\/# sourceMappingURL=.*$/m, ''); // .map wird nicht mitgeliefert

  const importMuster = /(?:from|import)\s*["'](\/[^"']+)["']/g;
  const abhaengigkeiten = new Set();
  let treffer;
  while ((treffer = importMuster.exec(quelle))) abhaengigkeiten.add(treffer[1]);

  for (const depRemote of abhaengigkeiten) {
    const depLocal = enqueue(depRemote, localFor.get(depRemote) ?? depRemote.replace(/^\//, ''));
    const vonVerzeichnis = path.dirname(local);
    let relativ = path.relative(vonVerzeichnis === '.' ? '' : vonVerzeichnis, depLocal);
    if (!relativ.startsWith('.')) relativ = './' + relativ;
    const escaped = depRemote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    quelle = quelle.replace(new RegExp(`(["'])${escaped}\\1`, 'g'), `$1${relativ}$1`);
  }

  const zielPfad = path.join(OUT, local);
  await mkdir(path.dirname(zielPfad), { recursive: true });
  await writeFile(zielPfad, quelle, 'utf8');
  console.log(`geschrieben: ${local} (${quelle.length} Bytes, ${abhaengigkeiten.size} Abhängigkeiten)`);
}

console.log(`Fertig. ${written.size} Dateien in public/js/vendor/ (Supabase-JS ${VERSION}).`);
