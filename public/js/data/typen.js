// ============================================================================
// Typen
// ----------------------------------------------------------------------------
// Zwölf Typen, benannt nach den Bausteinen des Genres. Die Wirksamkeit ergibt
// sich aus einem Kreis: Jeder Typ ist stark gegen die beiden folgenden und
// schwach gegen die beiden vorangehenden. Das ist auf einen Blick verständlich
// und lässt sich ohne 144 Einzelwerte pflegen. Nur eine Handvoll thematischer
// Ausnahmen steht zusätzlich in `AUSNAHMEN`.
// ============================================================================

export const TYPEN = [
  'KICK', 'SCHRANZ', 'ACID', 'RAVE', 'GLITCH', 'STROM',
  'CHEMIE', 'NEBEL', 'KELLER', 'BASS', 'DONK', 'VINYL',
];

const ANZAHL = TYPEN.length;

/**
 * Thematische Sonderfälle, die den Kreis überschreiben.
 * Schlüssel: "ANGRIFF>ZIEL".
 */
const AUSNAHMEN = {
  'STROM>KELLER': 0, // Im Keller fliegt zuerst die Sicherung.
  'VINYL>GLITCH': 0, // Analoges bekommt einen Digitalfehler nicht zu fassen.
  'NEBEL>NEBEL': 0.5,
  'KICK>KELLER': 2, // Kickdrum im Kellerclub – da wackeln die Wände.
  'BASS>NEBEL': 2, // Tiefton schiebt jede Nebelwand weg.
  'CHEMIE>CHEMIE': 0.5,
  'GLITCH>VINYL': 2,
};

/**
 * Wirksamkeit eines Angriffstyps gegen einen Zieltyp.
 * @param {string} angriff
 * @param {string} ziel
 * @returns {0|0.5|1|2}
 */
export function wirksamkeit(angriff, ziel) {
  const ausnahme = AUSNAHMEN[`${angriff}>${ziel}`];
  if (ausnahme !== undefined) return ausnahme;

  const von = TYPEN.indexOf(angriff);
  const nach = TYPEN.indexOf(ziel);
  if (von < 0 || nach < 0) return 1;

  const abstand = (nach - von + ANZAHL) % ANZAHL;
  if (abstand === 1 || abstand === 2) return 2;
  if (abstand === ANZAHL - 1 || abstand === ANZAHL - 2) return 0.5;
  return 1;
}

/**
 * Gesamtwirksamkeit gegen ein Hardtekkmon mit einem oder zwei Typen.
 * @param {string} angriff
 * @param {string[]} zieltypen
 */
export function wirksamkeitGegen(angriff, zieltypen) {
  return zieltypen.reduce((wert, typ) => wert * wirksamkeit(angriff, typ), 1);
}

/** Meldungstext zur Wirksamkeit – leer, wenn normal. */
export function wirksamkeitText(faktor) {
  if (faktor === 0) return 'Das lief komplett ins Leere!';
  if (faktor >= 2) return 'Das ist ein Brett!';
  if (faktor < 1) return 'Das war eher lauwarm …';
  return '';
}
