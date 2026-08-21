// ============================================================================
// Eingabe
// ----------------------------------------------------------------------------
// Tastatur und Bildschirmtasten münden in denselben Zustand: acht Tasten, die
// entweder gehalten oder in genau diesem Logikschritt neu gedrückt wurden.
// Die Spiellogik fragt nur `gehalten()` und `gedrueckt()` ab und muss weder
// Geräte noch Ereignisse kennen.
// ============================================================================

export const TASTEN = /** @type {const} */ ([
  'UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'START', 'SELECT',
]);

/** Zuordnung Tastatur -> Spieltaste (mehrere Tasten pro Funktion erlaubt). */
const TASTATUR = {
  ArrowUp: 'UP', KeyW: 'UP',
  ArrowDown: 'DOWN', KeyS: 'DOWN',
  ArrowLeft: 'LEFT', KeyA: 'LEFT',
  ArrowRight: 'RIGHT', KeyD: 'RIGHT',
  KeyX: 'A', Space: 'A',
  KeyY: 'B', KeyZ: 'B', Backspace: 'B',
  Enter: 'START', ShiftLeft: 'SELECT', ShiftRight: 'SELECT',
};

const roh = new Set();
const gehaltenJetzt = new Set();
const neuGedrueckt = new Set();
/**
 * Merkt jeden Tastendruck bis zum nächsten Logikschritt. Ohne diese
 * Verriegelung gehen sehr kurze Antipper verloren, wenn sie komplett zwischen
 * zwei Schritte fallen – auf Touchgeräten passiert genau das.
 */
const seitLetztemSchritt = new Set();
/** @type {Map<string, HTMLElement[]>} */
const tastenFlaechen = new Map();

/**
 * @param {string} taste
 * @param {boolean} an
 */
function setze(taste, an) {
  if (an) {
    roh.add(taste);
    seitLetztemSchritt.add(taste);
  } else {
    roh.delete(taste);
  }

  const flaechen = tastenFlaechen.get(taste);
  if (flaechen) {
    for (const flaeche of flaechen) flaeche.classList.toggle('is-pressed', an);
  }
}

function bindeTastatur() {
  window.addEventListener('keydown', (ereignis) => {
    const taste = TASTATUR[ereignis.code];
    if (!taste) return;
    ereignis.preventDefault();
    if (!ereignis.repeat) setze(taste, true);
  });

  window.addEventListener('keyup', (ereignis) => {
    const taste = TASTATUR[ereignis.code];
    if (!taste) return;
    ereignis.preventDefault();
    setze(taste, false);
  });

  // Beim Verlassen des Fensters bleibt sonst eine Taste hängen.
  window.addEventListener('blur', () => {
    for (const taste of TASTEN) setze(taste, false);
  });
}

function bindeBildschirmtasten() {
  const flaechen = document.querySelectorAll('[data-button]');

  for (const flaeche of flaechen) {
    const taste = /** @type {HTMLElement} */ (flaeche).dataset.button;
    if (!taste || !TASTEN.includes(/** @type {any} */ (taste))) continue;

    const liste = tastenFlaechen.get(taste) ?? [];
    liste.push(/** @type {HTMLElement} */ (flaeche));
    tastenFlaechen.set(taste, liste);

    flaeche.addEventListener('pointerdown', (ereignis) => {
      ereignis.preventDefault();
      // Der Zeiger bleibt der Taste zugeordnet, auch wenn der Finger
      // während des Drückens verrutscht.
      /** @type {HTMLElement} */ (flaeche).setPointerCapture(
        /** @type {PointerEvent} */ (ereignis).pointerId,
      );
      setze(taste, true);
    });

    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      flaeche.addEventListener(name, (ereignis) => {
        ereignis.preventDefault();
        setze(taste, false);
      });
    }

    flaeche.addEventListener('contextmenu', (ereignis) => ereignis.preventDefault());
  }
}

/** Einmalig beim Start aufrufen. */
export function starteEingabe() {
  bindeTastatur();
  bindeBildschirmtasten();
}

/**
 * Übernimmt den Rohzustand in den Zustand dieses Logikschritts. Muss genau
 * einmal pro Aktualisierung ganz am Anfang laufen.
 */
export function eingabeSchritt() {
  neuGedrueckt.clear();
  for (const taste of seitLetztemSchritt) {
    if (!gehaltenJetzt.has(taste)) neuGedrueckt.add(taste);
  }
  for (const taste of roh) {
    if (!gehaltenJetzt.has(taste)) neuGedrueckt.add(taste);
  }

  seitLetztemSchritt.clear();
  gehaltenJetzt.clear();
  for (const taste of roh) gehaltenJetzt.add(taste);
}

/** Taste ist gerade gedrückt. */
export function gehalten(taste) {
  return gehaltenJetzt.has(taste);
}

/** Taste wurde in diesem Schritt neu gedrückt (Flankenerkennung). */
export function gedrueckt(taste) {
  return neuGedrueckt.has(taste);
}

/** Irgendeine Taste wurde neu gedrückt. */
export function irgendeineGedrueckt() {
  return neuGedrueckt.size > 0;
}

/**
 * Aktuelle Richtung des Steuerkreuzes. Gegenüberliegende Richtungen heben
 * sich auf, damit keine Diagonalen entstehen.
 * @returns {{ x: -1|0|1, y: -1|0|1 }}
 */
export function richtung() {
  const x = (gehalten('RIGHT') ? 1 : 0) - (gehalten('LEFT') ? 1 : 0);
  const y = (gehalten('DOWN') ? 1 : 0) - (gehalten('UP') ? 1 : 0);
  return { x: /** @type {-1|0|1} */ (x), y: /** @type {-1|0|1} */ (y) };
}

/** Setzt alle Tasten zurück (z. B. nach einem Szenenwechsel). */
export function eingabeZuruecksetzen() {
  for (const taste of TASTEN) setze(taste, false);
  gehaltenJetzt.clear();
  neuGedrueckt.clear();
  seitLetztemSchritt.clear();
}
