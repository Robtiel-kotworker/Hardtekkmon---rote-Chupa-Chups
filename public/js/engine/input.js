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

const RICHTUNGSTASTEN = new Set(['UP', 'DOWN', 'LEFT', 'RIGHT']);
/**
 * Zeiger, die gerade auf dem Steuerkreuz aufliegen (pointerId -> true).
 * Getrennt von dpadZeiger, weil der Finger beim Gleiten von einem Arm zum
 * anderen kurz über die Mitte oder die Lücke zwischen zwei Armen wandert –
 * dort liegt gar keine Taste, aber der Zeiger ist trotzdem noch unten. Ohne
 * diese getrennte Verfolgung würde genau dieser kurze Zwischenschritt die
 * Zeigerzuordnung komplett verwerfen und ein Wechsel zur Nachbarrichtung
 * bliebe wirkungslos.
 */
const dpadAktiv = new Set();
/**
 * Aktuell gehaltene Richtungstaste je Zeiger (pointerId -> Tastenname),
 * solange er über einer liegt – siehe bindeSteuerkreuzGleiten.
 */
const dpadZeiger = new Map();

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

    // Die vier Richtungstasten laufen über bindeSteuerkreuzGleiten() weiter
    // unten – dort darf der Zeiger beim Gleiten die Taste wechseln. Bei
    // A/B/START/SELECT bleibt der Zeiger dagegen an der ursprünglichen
    // Taste "eingefangen", damit kleines Verrutschen den Druck nicht verliert.
    if (RICHTUNGSTASTEN.has(taste)) continue;

    flaeche.addEventListener('pointerdown', (ereignis) => {
      ereignis.preventDefault();
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

  bindeSteuerkreuzGleiten();
}

/**
 * Ermittelt anhand einer Zeigerposition, über welcher Richtungstaste der
 * Finger gerade steht, und schaltet die gehaltene Richtung bei Bedarf um.
 * @param {number} pointerId
 * @param {number} x
 * @param {number} y
 */
function aktualisiereSteuerkreuzZeiger(pointerId, x, y) {
  const ziel = /** @type {HTMLElement|null} */ (document.elementFromPoint(x, y));
  const taste = ziel?.dataset.button;
  const neu = taste && RICHTUNGSTASTEN.has(taste) ? taste : null;
  const alt = dpadZeiger.get(pointerId) ?? null;
  if (neu === alt) return;

  if (alt) setze(alt, false);
  if (neu) setze(neu, true);
  if (neu) dpadZeiger.set(pointerId, neu);
  else dpadZeiger.delete(pointerId);
}

/**
 * Steuerkreuz-Sonderfall: Anders als bei den übrigen Tasten wird der Zeiger
 * hier bewusst NICHT eingefangen (kein setPointerCapture). Dadurch bleibt er
 * beim Gleiten an der jeweils darunterliegenden Fläche "dran" – ein
 * Fingerwisch von z. B. OBEN zu RECHTS wechselt live die Richtung, ohne dass
 * der Finger zwischendurch abgehoben werden muss. Bewegung und Loslassen
 * laufen am Fenster statt am Steuerkreuz selbst, damit die Zuordnung nicht
 * verloren geht, sobald der Finger den Kreuzbereich verlässt (dort käme
 * sonst kein pointerup mehr an).
 */
function bindeSteuerkreuzGleiten() {
  const dpad = document.querySelector('.pad__dpad');
  if (!dpad) return;

  dpad.addEventListener('pointerdown', (ereignis) => {
    const zeiger = /** @type {PointerEvent} */ (ereignis);
    ereignis.preventDefault();
    dpadAktiv.add(zeiger.pointerId);
    aktualisiereSteuerkreuzZeiger(zeiger.pointerId, zeiger.clientX, zeiger.clientY);
  });

  dpad.addEventListener('contextmenu', (ereignis) => ereignis.preventDefault());

  window.addEventListener('pointermove', (ereignis) => {
    const zeiger = /** @type {PointerEvent} */ (ereignis);
    if (!dpadAktiv.has(zeiger.pointerId)) return;
    aktualisiereSteuerkreuzZeiger(zeiger.pointerId, zeiger.clientX, zeiger.clientY);
  });

  for (const name of ['pointerup', 'pointercancel']) {
    window.addEventListener(name, (ereignis) => {
      const zeiger = /** @type {PointerEvent} */ (ereignis);
      if (!dpadAktiv.has(zeiger.pointerId)) return;
      const alt = dpadZeiger.get(zeiger.pointerId);
      if (alt) setze(alt, false);
      dpadZeiger.delete(zeiger.pointerId);
      dpadAktiv.delete(zeiger.pointerId);
    });
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
  dpadZeiger.clear();
  dpadAktiv.clear();
}
