// ============================================================================
// Wilde Begegnungen
// ----------------------------------------------------------------------------
// Je Gebiet eine Tabelle mit Art, Stufenbereich und Gewicht. Das Gewicht
// steuert, wie häufig eine Art auftaucht – seltene Hardtekkmon bekommen ein
// niedriges. Die Kachel entscheidet, welche Gruppe gezogen wird (hohes Gras,
// Höhlenschotter, Moor).
// ============================================================================

/**
 * @typedef {{ art: string, min: number, max: number, gewicht: number }} Begegnung
 */

const tabelle = (...eintraege) => eintraege.map(([art, min, max, gewicht = 10]) => ({ art, min, max, gewicht }));

/** @type {Record<string, Begegnung[]>} */
export const BEGEGNUNGEN = {
  route1: tabelle(
    ['Ratz-Ronny', 2, 4], ['Tröti', 2, 4], ['Schrubbi', 3, 5, 6], ['Donkelchen', 3, 4, 6],
  ),
  route2: tabelle(
    ['Ratz-Ronny', 4, 6], ['Tröti', 4, 6], ['Glitchi', 4, 7, 6], ['Kellerkind', 5, 7, 5], ['Nebelnils', 5, 7, 4],
  ),
  plattenwald: tabelle(
    ['Schimmi', 6, 8], ['Muffel', 6, 8], ['Nebelnils', 7, 8, 7], ['Dunsti', 7, 8, 5],
    ['Glitchi', 6, 8, 6], ['Nadel-Nadine', 7, 8, 3],
  ),
  route3: tabelle(
    ['Fliesi', 8, 11], ['Kellerkind', 8, 11], ['Ratzomat', 9, 12, 6], ['Stampfi', 9, 12, 6],
    ['Schrubbomat', 10, 12, 4],
  ),
  boxenberg: tabelle(
    ['Schimmi', 10, 13], ['Muffel', 10, 13], ['Kellerkind', 11, 13, 8], ['Fliesi', 11, 13, 6],
    ['Bierbankbernd', 12, 14, 3], ['Gullideckel-Gustav', 13, 14, 2],
  ),
  route4: tabelle(
    ['Stromer Sven', 12, 14], ['Kabelkurt', 12, 14], ['Blitzbirne', 13, 14, 6],
    ['Mate-Mandy', 13, 14, 5], ['Aggi', 13, 14, 4],
  ),
  route5: tabelle(
    ['Wummi', 14, 15], ['Boxi', 14, 15], ['Säuresusi', 14, 15, 6], ['Filterfritzi', 14, 16, 5],
    ['Subwoofer-Sepp', 15, 16, 4], ['Plong', 14, 15, 6],
  ),
  route7: tabelle(
    ['Plattenpaule', 16, 17], ['Scratchi', 16, 17], ['Bitbert', 16, 18, 6],
    ['Nadel-Nadine', 16, 18, 6], ['Kippen-Kevin', 17, 18, 3], ['Hüpfi', 16, 17, 5],
  ),
  route9: tabelle(
    ['Schranzi', 18, 19], ['Sägeseppel', 18, 19], ['Kreissägi', 18, 20, 7],
    ['Hallenhalunke', 19, 20, 3], ['Schranzomat', 19, 20, 4], ['Trittbrett-Timo', 18, 19, 5],
  ),
  nebelmoor: tabelle(
    ['Dunsti', 20, 22], ['Trockeneis-Toni', 20, 22], ['Tröpfi', 21, 22, 7],
    ['Nebelniklas', 21, 23, 5], ['Augenring-Otto', 21, 23, 3], ['Absacker-Anton', 21, 22, 5],
  ),
  route10: tabelle(
    ['Hüpfi', 22, 24], ['Federfritz', 22, 24], ['Plong', 23, 24, 7],
    ['Donkomat', 23, 25, 5], ['Kaugummi-Kai', 23, 25, 3], ['Presslufthannes', 24, 25, 2],
  ),
  route11: tabelle(
    ['Glitchmeister', 24, 26], ['Bytebert', 24, 26], ['Pillenpaul', 25, 26, 6],
    ['Laserpointer-Lars', 25, 26, 4], ['Plongomat', 25, 26, 6], ['Kabelkorbinian', 25, 26, 5],
  ),
  siegesweg: tabelle(
    ['Afterhour-Achim', 26, 28], ['Tanzbär Tommy', 26, 28], ['Frühschicht-Fritz', 26, 28, 6],
    ['Muffelmann', 26, 28, 6], ['Der Verklatschte', 27, 29, 2], ['Feierabend-Fabian', 27, 28, 4],
  ),
};

/** @param {string} name */
export function begegnungstabelle(name) {
  return BEGEGNUNGEN[name] ?? null;
}
