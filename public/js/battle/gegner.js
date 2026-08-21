// ============================================================================
// Gegnerische Auswahl
// ----------------------------------------------------------------------------
// Der Gegner sucht die Attacke mit dem höchsten zu erwartenden Schaden, wählt
// aber nicht immer die beste – sonst wirken Kämpfe mechanisch. Statusattacken
// kommen vor allem dann zum Zug, wenn sie noch etwas bewirken können.
// ============================================================================

import { findeAttacke } from '../data/attacken.js';
import { wirksamkeitGegen } from '../data/typen.js';
import { artVon, maxKp } from '../game/hardtekkmon.js';
import { kampfwert } from './formeln.js';

/**
 * Statusattacken sind nur so viel wert, wie sie noch bewirken können: ein
 * zweiter Zustand haftet nicht, und Werte lassen sich nicht endlos steigern.
 */
function bewerteStatus(attacke, angreifer, verteidiger) {
  const effekt = attacke.effekt;
  if (!effekt) return 4;

  switch (effekt.art) {
    case 'status':
      return verteidiger.mon.status ? 1 : 30;
    case 'verwirren':
      return verteidiger.verwirrt > 0 ? 1 : 26;
    case 'heilung':
      return angreifer.mon.kp < maxKp(angreifer.mon) * 0.55 ? 44 : 1;
    case 'werte': {
      const ziel = effekt.ziel === 'selbst' ? angreifer : verteidiger;
      const nochLuft = Object.entries(effekt.aenderungen).some(([schluessel, stufen]) => {
        const jetzt = ziel.stufen[schluessel] ?? 0;
        return stufen > 0 ? jetzt < 4 : jetzt > -4;
      });
      return nochLuft ? 26 : 1;
    }
    default:
      return 8;
  }
}

/**
 * Bewertet eine Attacke grob – ohne Zufall, damit die Auswahl nachvollziehbar
 * bleibt.
 */
function bewerte(attacke, angreifer, verteidiger) {
  const wirkung = wirksamkeitGegen(attacke.typ, artVon(verteidiger.mon).typen);

  if (attacke.kategorie === 'status') {
    return bewerteStatus(attacke, angreifer, verteidiger);
  }

  const spezial = attacke.kategorie === 'spezial';
  const angriff = kampfwert(angreifer, spezial ? 'spa' : 'ang');
  const verteidigung = kampfwert(verteidiger, spezial ? 'spv' : 'ver');
  const eigene = artVon(angreifer.mon).typen;
  const stab = eigene.includes(attacke.typ) ? 1.5 : 1;

  return (attacke.staerke * (angriff / verteidigung) * wirkung * stab * (attacke.genauigkeit / 100));
}

/**
 * Wählt den Zug des Gegners.
 * @returns {number} Index der Attacke
 */
export function waehleGegnerAttacke(angreifer, verteidiger) {
  const moeglich = angreifer.mon.attacken
    .map((eintrag, index) => ({ index, daten: findeAttacke(eintrag.name), ap: eintrag.ap }))
    .filter((eintrag) => eintrag.daten && eintrag.ap > 0);

  if (moeglich.length === 0) return -1;

  const bewertet = moeglich
    .map((eintrag) => ({ ...eintrag, wert: bewerte(eintrag.daten, angreifer, verteidiger) }))
    .sort((a, b) => b.wert - a.wert);

  // In vier von fünf Fällen die beste Wahl, sonst die zweitbeste.
  if (bewertet.length > 1 && Math.random() < 0.2) return bewertet[1].index;
  return bewertet[0].index;
}
