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
    ['Schimmi', 6, 9], ['Muffel', 6, 9], ['Nebelnils', 7, 10, 7], ['Dunsti', 7, 10, 5],
    ['Glitchi', 6, 9, 6], ['Nadel-Nadine', 8, 10, 3],
  ),
  route3: tabelle(
    ['Fliesi', 10, 13], ['Kellerkind', 10, 13], ['Ratzomat', 11, 14, 6], ['Stampfi', 11, 14, 6],
    ['Schrubbomat', 12, 14, 4],
  ),
  boxenberg: tabelle(
    ['Schimmi', 12, 15], ['Muffel', 12, 16], ['Kellerkind', 13, 16, 8], ['Fliesi', 13, 16, 6],
    ['Bierbankbernd', 14, 17, 3], ['Gullideckel-Gustav', 15, 17, 2],
  ),
  route4: tabelle(
    ['Stromer Sven', 14, 18], ['Kabelkurt', 14, 18], ['Blitzbirne', 15, 18, 6],
    ['Mate-Mandy', 15, 19, 5], ['Aggi', 16, 19, 4],
  ),
  route5: tabelle(
    ['Wummi', 18, 22], ['Boxi', 18, 22], ['Säuresusi', 19, 22, 6], ['Filterfritzi', 19, 23, 5],
    ['Subwoofer-Sepp', 20, 23, 4], ['Plong', 19, 22, 6],
  ),
  route7: tabelle(
    ['Plattenpaule', 24, 28], ['Scratchi', 24, 28], ['Bitbert', 25, 29, 6],
    ['Nadel-Nadine', 25, 29, 6], ['Kippen-Kevin', 26, 29, 3], ['Hüpfi', 25, 28, 5],
  ),
  route9: tabelle(
    ['Schranzi', 30, 34], ['Sägeseppel', 30, 34], ['Kreissägi', 31, 35, 7],
    ['Hallenhalunke', 32, 35, 3], ['Schranzomat', 32, 35, 4], ['Trittbrett-Timo', 31, 34, 5],
  ),
  nebelmoor: tabelle(
    ['Dunsti', 36, 40], ['Trockeneis-Toni', 36, 40], ['Tröpfi', 37, 40, 7],
    ['Nebelniklas', 38, 41, 5], ['Augenring-Otto', 38, 41, 3], ['Absacker-Anton', 37, 40, 5],
  ),
  route10: tabelle(
    ['Hüpfi', 40, 44], ['Federfritz', 40, 44], ['Plong', 41, 44, 7],
    ['Donkomat', 42, 45, 5], ['Kaugummi-Kai', 42, 45, 3], ['Presslufthannes', 43, 45, 2],
  ),
  route11: tabelle(
    ['Glitchmeister', 44, 48], ['Bytebert', 44, 48], ['Pillenpaul', 45, 48, 6],
    ['Laserpointer-Lars', 45, 49, 4], ['Plongomat', 45, 48, 6], ['Kabelkorbinian', 46, 49, 5],
  ),
  siegesweg: tabelle(
    ['Afterhour-Achim', 48, 52], ['Tanzbär Tommy', 48, 52], ['Frühschicht-Fritz', 49, 53, 6],
    ['Muffelmann', 49, 52, 6], ['Der Verklatschte', 50, 54, 2], ['Feierabend-Fabian', 50, 53, 4],
  ),
};

/** @param {string} name */
export function begegnungstabelle(name) {
  return BEGEGNUNGEN[name] ?? null;
}
