// ============================================================================
// Speicherstand
// ----------------------------------------------------------------------------
// Ein einzelner Spielstand im localStorage. Jeder Zugriff ist abgesichert:
// im privaten Modus mancher Browser wirft bereits das Lesen eine Ausnahme,
// das Spiel muss davon aber unbeeindruckt weiterlaufen.
// ============================================================================

const SCHLUESSEL = 'hardtekkmon-rote-chupa-chups';

/** @returns {object|null} */
export function laden() {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    return roh ? JSON.parse(roh) : null;
  } catch {
    return null;
  }
}

/**
 * @param {object} stand
 * @returns {boolean} ob das Schreiben geklappt hat
 */
export function speichern(stand) {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(stand));
    return true;
  } catch {
    return false;
  }
}

export function loeschen() {
  try {
    localStorage.removeItem(SCHLUESSEL);
  } catch {
    /* Ohne Speicher läuft das Spiel eben ohne Spielstand weiter. */
  }
}

export function gibtStand() {
  return laden() !== null;
}
