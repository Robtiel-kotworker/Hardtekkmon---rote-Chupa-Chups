// ============================================================================
// Spielschleife
// ----------------------------------------------------------------------------
// Fester Zeitschritt mit 60 Aktualisierungen pro Sekunde. Der Aufsammler
// (Akkumulator) gleicht schwankende Bildwiederholraten aus, ohne dass die
// Spiellogik je mit Bruchteilen von Bildern rechnen muss – Laufanimationen und
// Kampfabläufe bleiben dadurch auf jedem Gerät exakt gleich schnell.
// ============================================================================

export const BILDER_PRO_SEKUNDE = 60;
const SCHRITT_MS = 1000 / BILDER_PRO_SEKUNDE;
const MAX_NACHHOLSCHRITTE = 5;

/**
 * @param {() => void} aktualisieren Ein Logikschritt (1/60 s)
 * @param {() => void} zeichnen Ein Bild
 * @returns {{ start: () => void, stop: () => void }}
 */
export function schleife(aktualisieren, zeichnen) {
  let laeuft = false;
  let letzteZeit = 0;
  let aufsammler = 0;
  let anforderung = 0;

  function bild(zeit) {
    if (!laeuft) return;
    anforderung = requestAnimationFrame(bild);

    aufsammler += Math.min(zeit - letzteZeit, SCHRITT_MS * MAX_NACHHOLSCHRITTE);
    letzteZeit = zeit;

    let schritte = 0;
    while (aufsammler >= SCHRITT_MS && schritte < MAX_NACHHOLSCHRITTE) {
      aufsammler -= SCHRITT_MS;
      schritte += 1;
      aktualisieren();
    }

    if (schritte > 0) zeichnen();
  }

  return {
    start() {
      if (laeuft) return;
      laeuft = true;
      letzteZeit = performance.now();
      aufsammler = 0;
      anforderung = requestAnimationFrame(bild);
    },
    stop() {
      laeuft = false;
      cancelAnimationFrame(anforderung);
    },
  };
}
