// ============================================================================
// Farben
// ----------------------------------------------------------------------------
// Eine zentrale Farbtafel, angelehnt an die begrenzte Palette der
// Handheld-Vorlage: wenige, klar getrennte Farbtöne statt weicher Verläufe.
// ============================================================================

/** Oberflächenfarben für Fenster, Balken und Menüs. */
export const UI = {
  fenster: '#f8f8f0',
  fensterRand: '#404060',
  fensterRandHell: '#a8b0d8',
  fensterSchatten: '#c8c8d8',
  text: '#303040',
  textHell: '#f8f8f0',
  textSchatten: '#a0a0b0',
  auswahl: '#e04058',
  gold: '#f0c040',
  balkenRahmen: '#303040',
  kpGut: '#48c058',
  kpMittel: '#f0c040',
  kpWenig: '#e04058',
  erfahrung: '#48a8e0',
  dunkel: '#181820',
  halbdunkel: '#282838',
  // Schriftfarben der Typenhilfe im Kampf. Dunkler als kpGut/kpWenig,
  // damit sie auf dem hellen Fenstergrund gut lesbar bleiben.
  wirksamGut: '#1f8a34',
  wirksamSchlecht: '#b8203c',
};

/** Farben der Hardtekkmon-Typen (Sprites, Kampf-Anzeigen, Tekkdex). */
export const TYP_FARBEN = {
  KICK: '#d85030',
  BASS: '#7048c8',
  ACID: '#98d030',
  SCHRANZ: '#c03050',
  RAVE: '#f050a0',
  KELLER: '#8a7050',
  CHEMIE: '#50c8a0',
  VINYL: '#404058',
  GLITCH: '#30c0d0',
  DONK: '#f09030',
  NEBEL: '#a0a8c0',
  STROM: '#f0d030',
};

/** Geländefarben – auch von der Karte im Menü genutzt. */
export const WELT = {
  gras: '#58a048',
  grasDunkel: '#3c8038',
  grasHell: '#78c060',
  weg: '#d8b878',
  wegDunkel: '#c0a060',
  sand: '#e8d8a0',
  wasser: '#4878c8',
  wasserHell: '#7098e0',
  wasserSchaum: '#b8d8f8',
  baumDunkel: '#1c5028',
  baum: '#2c7038',
  baumHell: '#48a048',
  stamm: '#6a4828',
  fels: '#909088',
  felsDunkel: '#606058',
  hoehleBoden: '#8a7a6a',
  hoehleWand: '#453c34',
  beton: '#b0b0a8',
  betonDunkel: '#8a8a84',
  asphalt: '#585868',
  asphaltHell: '#6a6a7a',
  moor: '#4a5840',
  moorHell: '#657548',
  wandInnen: '#c8a878',
  wandInnenDunkel: '#9a7c50',
  bodenInnen: '#e8d8b8',
  bodenInnenDunkel: '#d0bc98',
  dachRot: '#c04038',
  dachRotDunkel: '#902828',
  dachBlau: '#4058b8',
  dachBlauDunkel: '#2c3c88',
  dachGruen: '#38885c',
  dachGruenDunkel: '#256040',
  dachGrau: '#787888',
  dachGrauDunkel: '#555568',
  hauswand: '#e8dcc0',
  hauswandDunkel: '#c0b090',
  neon: '#f050a0',
  neonBlau: '#40d0f0',
};
