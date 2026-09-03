// ============================================================================
// Regionskarte
// ----------------------------------------------------------------------------
// Reine Layout-Daten für die interaktive Übersichtskarte (scenes/karte.js):
// eine Perlenkette aus Stationen in genau der Reihenfolge, in der man ihnen
// auf der Reise begegnet, mit handgesetzten Koordinaten auf einer hohen,
// senkrecht scrollenden Karte. Namen, Gig-Leiter, Encounter-Tabellen usw.
// werden dort erst zur Laufzeit aus den echten Weltdaten geholt – hier steht
// nur, WO eine Station sitzt und WAS für eine sie ist.
//
// `art: 'stadt'` – Städte/Orte mit Amenities; `gig` verweist auf die
//   Trainer-Kennung des zuständigen Gig-Leiters (oder 'champion' für die
//   Halle der Gigs), fehlt bei Orten ohne Gig-Halle (Bassdorf, Hardtekk City).
// `art: 'route'` – Routen und Wildgebiete; `begegnung` ist die Kennung in
//   data/world/begegnungen.js.
// ============================================================================

/**
 * @typedef {{
 *   id: string, art: 'stadt'|'route', x: number, y: number, gig?: string,
 *   begegnung?: string, telefon?: string,
 * }} Station
 */
/**
 * `telefon` – dreistellige Nummer der Teleportationskapsel (siehe
 * scenes/telefonzelle.js), nur für Städte mit Boxenstopp, durchnummeriert in
 * Reisereihenfolge.
 */

/** @type {Station[]} */
export const STATIONEN = [
  { id: 'bassdorf', art: 'stadt', x: 120, y: 26 },
  { id: 'route1', art: 'route', x: 96, y: 58, begegnung: 'route1' },
  { id: 'schotterhausen', art: 'stadt', x: 130, y: 90, gig: 'gig8', telefon: '001' },
  { id: 'route2', art: 'route', x: 92, y: 122, begegnung: 'route2' },
  { id: 'plattenwald', art: 'route', x: 58, y: 152, begegnung: 'plattenwald' },
  { id: 'kellerstadt', art: 'stadt', x: 84, y: 184, gig: 'gig1', telefon: '002' },
  { id: 'hardtekk_city', art: 'stadt', x: 138, y: 202, telefon: '003' },
  { id: 'route3', art: 'route', x: 190, y: 222, begegnung: 'route3' },
  { id: 'boxenberg', art: 'route', x: 212, y: 254, begegnung: 'boxenberg' },
  { id: 'route4', art: 'route', x: 182, y: 284, begegnung: 'route4' },
  { id: 'subwoofer_city', art: 'stadt', x: 140, y: 306, gig: 'gig2', telefon: '004' },
  { id: 'route5', art: 'route', x: 140, y: 338, begegnung: 'route5' },
  { id: 'vinylhafen', art: 'stadt', x: 140, y: 370, gig: 'gig3', telefon: '005' },
  { id: 'route7', art: 'route', x: 176, y: 400, begegnung: 'route7' },
  { id: 'schranzheim', art: 'stadt', x: 208, y: 428, gig: 'gig4', telefon: '006' },
  { id: 'route9', art: 'route', x: 182, y: 458, begegnung: 'route9' },
  { id: 'nebelmoor', art: 'stadt', x: 144, y: 484, gig: 'gig5', telefon: '007' },
  { id: 'route10', art: 'route', x: 104, y: 510, begegnung: 'route10' },
  { id: 'donkhausen', art: 'stadt', x: 76, y: 540, gig: 'gig6', telefon: '008' },
  { id: 'route11', art: 'route', x: 92, y: 570, begegnung: 'route11' },
  { id: 'glitchstadt', art: 'stadt', x: 128, y: 598, gig: 'gig7', telefon: '009' },
  { id: 'siegesweg', art: 'route', x: 152, y: 628, begegnung: 'siegesweg' },
  { id: 'halle_der_gigs', art: 'stadt', x: 152, y: 660, gig: 'champion' },
];

/** Gesamthöhe der Karte in Pixeln (für Scroll-Grenzen). */
export const KARTE_HOEHE = 690;
export const KARTE_BREITE = 240;
