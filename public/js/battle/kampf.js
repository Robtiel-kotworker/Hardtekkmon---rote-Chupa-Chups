// ============================================================================
// Kampfablauf
// ----------------------------------------------------------------------------
// Der Kampf rechnet eine komplette Runde am Stück durch und liefert das
// Ergebnis als Liste von Ereignissen zurück. Die Darstellung (Texte,
// Animationen, Wartezeiten) liegt allein bei der Kampfansicht – dadurch ist der
// Ablauf ohne Grafik prüfbar und die Anzeige bleibt flüssig.
// ============================================================================

import { findeAttacke, STATUS, LETZTE_KRAFT } from '../data/attacken.js';
import { wirksamkeitText, wirksamkeitGegen } from '../data/typen.js';
import {
  anzeigename, artVon, fuegeSchadenZu, heile, maxKp, gibErfahrung,
  entwicklungFaellig, istUmgekippt,
} from '../game/hardtekkmon.js';
import { gegenstandInfo } from '../data/gegenstaende.js';
import {
  berechneSchaden, trifft, istSchneller, erfahrungFuerSieg, fangversuch,
  fluchtGelingt, zustandsschaden, STUFEN_GRENZE,
} from './formeln.js';
import { waehleGegnerAttacke } from './gegner.js';
import { zahl, trifft as zufallTrifft } from '../engine/rng.js';

const WERTNAMEN = {
  ang: 'Angriff', ver: 'Verteidigung', spa: 'Spezial-Angriff',
  spv: 'Spezial-Verteidigung', ini: 'Initiative', gen: 'Genauigkeit',
};

/** Ein Kämpfer im Ring: das Hardtekkmon plus alles, was nur im Kampf gilt. */
function alsKaempfer(mon) {
  return {
    mon,
    stufen: { ang: 0, ver: 0, spa: 0, spv: 0, ini: 0, gen: 0 },
    verwirrt: 0,
    zuckt: false,
  };
}

/**
 * Startet einen Kampf.
 * @param {{ art: 'wild'|'trainer', wildesMon?: object, trainer?: object, team: object[] }} vorgabe
 */
export function starteKampf(vorgabe) {
  const gegnerTeam = vorgabe.art === 'wild' ? [vorgabe.wildesMon] : vorgabe.gegnerTeam;
  const eigenesIndex = vorgabe.team.findIndex((mon) => mon.kp > 0);

  return {
    art: vorgabe.art,
    trainer: vorgabe.trainer ?? null,
    team: vorgabe.team,
    eigenesIndex,
    gegnerTeam,
    gegnerIndex: 0,
    eigene: alsKaempfer(vorgabe.team[eigenesIndex]),
    gegner: alsKaempfer(gegnerTeam[0]),
    fluchtversuche: 0,
    vorbei: false,
    ergebnis: null,
    wechselNoetig: false,
    gefangen: null,
  };
}

const ereignis = (typ, daten = {}) => ({ typ, ...daten });
const text = (inhalt) => ereignis('text', { text: inhalt });

/** Wertestufe ändern und passenden Text liefern. */
function aendereStufe(kaempfer, schluessel, stufen, ereignisse, seite) {
  const alt = kaempfer.stufen[schluessel] ?? 0;
  const neu = Math.max(-STUFEN_GRENZE, Math.min(STUFEN_GRENZE, alt + stufen));
  kaempfer.stufen[schluessel] = neu;

  const name = anzeigename(kaempfer.mon);
  const wert = WERTNAMEN[schluessel] ?? schluessel;

  if (neu === alt) {
    ereignisse.push(text(stufen > 0
      ? `${wert} von ${name} geht nicht weiter hoch.`
      : `${wert} von ${name} geht nicht weiter runter.`));
    return;
  }

  ereignisse.push(ereignis('werte', { seite, schluessel, stufen }));
  ereignisse.push(text(stufen > 0
    ? `${wert} von ${name} steigt${Math.abs(stufen) > 1 ? ' deutlich' : ''}!`
    : `${wert} von ${name} sinkt${Math.abs(stufen) > 1 ? ' deutlich' : ''}!`));
}

/** Dauerzustand setzen, sofern noch keiner aktiv ist. */
function setzeStatus(ziel, status, ereignisse, seite) {
  if (ziel.mon.status) return false;

  const typen = artVon(ziel.mon).typen;
  // Wer den passenden Typ hat, ist gegen den Zustand unempfindlich.
  const immun = (status === STATUS.zugedroehnt && typen.includes('STROM'))
    || (status === STATUS.verkatert && typen.includes('CHEMIE'))
    || (status === STATUS.ausgebrannt && typen.includes('KICK'));
  if (immun) return false;

  ziel.mon.status = status;
  if (status === STATUS.weggeratzt) ziel.mon.schlafRunden = zahl(1, 3);

  const name = anzeigename(ziel.mon);
  const meldungen = {
    [STATUS.verkatert]: `${name} ist jetzt verkatert!`,
    [STATUS.weggeratzt]: `${name} ist weggeratzt!`,
    [STATUS.zugedroehnt]: `${name} ist zugedröhnt und wird langsamer!`,
    [STATUS.ausgebrannt]: `${name} ist ausgebrannt!`,
    [STATUS.tiefgekuehlt]: `${name} ist tiefgekühlt!`,
  };
  ereignisse.push(ereignis('status', { seite, status }));
  ereignisse.push(text(meldungen[status] ?? `${name} geht es plötzlich anders.`));
  return true;
}

/** Zusatzeffekt einer Attacke auswerten. */
function wendeEffektAn(effekt, angreifer, verteidiger, seiteAngreifer, schaden, ereignisse) {
  if (!effekt) return;
  const seiteZiel = seiteAngreifer === 'spieler' ? 'gegner' : 'spieler';
  const chance = effekt.chance ?? 1;

  switch (effekt.art) {
    case 'status':
      if (zufallTrifft(chance)) setzeStatus(verteidiger, effekt.status, ereignisse, seiteZiel);
      break;

    case 'werte': {
      if (!zufallTrifft(chance)) break;
      const ziel = effekt.ziel === 'selbst' ? angreifer : verteidiger;
      const seite = effekt.ziel === 'selbst' ? seiteAngreifer : seiteZiel;
      for (const [schluessel, stufen] of Object.entries(effekt.aenderungen)) {
        aendereStufe(ziel, schluessel, stufen, ereignisse, seite);
      }
      break;
    }

    case 'verwirren':
      if (zufallTrifft(chance) && verteidiger.verwirrt === 0) {
        verteidiger.verwirrt = zahl(2, 4);
        ereignisse.push(text(`${anzeigename(verteidiger.mon)} ist völlig neben der Spur!`));
      }
      break;

    case 'zucken':
      if (zufallTrifft(chance)) verteidiger.zuckt = true;
      break;

    case 'rueckstoss': {
      const rueck = Math.max(1, Math.floor(schaden * effekt.anteil));
      fuegeSchadenZu(angreifer.mon, rueck);
      ereignisse.push(ereignis('schaden', { seite: seiteAngreifer, menge: rueck }));
      ereignisse.push(text(`${anzeigename(angreifer.mon)} nimmt den Rückstoß mit.`));
      break;
    }

    case 'saugen': {
      const geheilt = heile(angreifer.mon, Math.max(1, Math.floor(schaden * effekt.anteil)));
      if (geheilt > 0) {
        ereignisse.push(ereignis('heilung', { seite: seiteAngreifer, menge: geheilt }));
        ereignisse.push(text(`${anzeigename(angreifer.mon)} saugt Kraft ab.`));
      }
      break;
    }

    case 'heilung': {
      const geheilt = heile(angreifer.mon, Math.floor(maxKp(angreifer.mon) * effekt.anteil));
      ereignisse.push(ereignis('heilung', { seite: seiteAngreifer, menge: geheilt }));
      ereignisse.push(text(geheilt > 0
        ? `${anzeigename(angreifer.mon)} sammelt sich wieder.`
        : `${anzeigename(angreifer.mon)} ist schon voll da.`));
      break;
    }

    default:
      break;
  }
}

/** Prüft Zustände, die eine Aktion ganz verhindern. */
function kannHandeln(kaempfer, seite, ereignisse) {
  const name = anzeigename(kaempfer.mon);

  if (kaempfer.mon.status === STATUS.weggeratzt) {
    if (kaempfer.mon.schlafRunden > 0) {
      kaempfer.mon.schlafRunden -= 1;
      ereignisse.push(text(`${name} ist weggeratzt und rührt sich nicht.`));
      return false;
    }
    kaempfer.mon.status = null;
    ereignisse.push(text(`${name} ist wieder wach!`));
  }

  if (kaempfer.mon.status === STATUS.tiefgekuehlt) {
    if (zufallTrifft(0.25)) {
      kaempfer.mon.status = null;
      ereignisse.push(text(`${name} ist wieder aufgetaut!`));
    } else {
      ereignisse.push(text(`${name} ist tiefgekühlt und kommt nicht hoch.`));
      return false;
    }
  }

  if (kaempfer.zuckt) {
    kaempfer.zuckt = false;
    ereignisse.push(text(`${name} zuckt zusammen und verpasst den Einsatz!`));
    return false;
  }

  if (kaempfer.mon.status === STATUS.zugedroehnt && zufallTrifft(0.25)) {
    ereignisse.push(text(`${name} ist zugedröhnt und kommt nicht in die Gänge.`));
    return false;
  }

  if (kaempfer.verwirrt > 0) {
    kaempfer.verwirrt -= 1;
    if (zufallTrifft(0.33)) {
      const eigen = Math.max(1, Math.floor(maxKp(kaempfer.mon) / 8));
      fuegeSchadenZu(kaempfer.mon, eigen);
      ereignisse.push(ereignis('schaden', { seite, menge: eigen }));
      ereignisse.push(text(`${name} ist neben der Spur und trifft sich selbst!`));
      return false;
    }
    ereignisse.push(text(`${name} ist noch immer neben der Spur …`));
  }

  return true;
}

/** Führt eine Attacke aus. */
function fuehreAttacke(kampf, seite, attackenIndex, ereignisse) {
  const angreifer = seite === 'spieler' ? kampf.eigene : kampf.gegner;
  const verteidiger = seite === 'spieler' ? kampf.gegner : kampf.eigene;
  const seiteZiel = seite === 'spieler' ? 'gegner' : 'spieler';

  if (!kannHandeln(angreifer, seite, ereignisse)) return;

  let eintrag = angreifer.mon.attacken[attackenIndex];
  let attacke = eintrag && eintrag.ap > 0 ? findeAttacke(eintrag.name) : null;

  if (!attacke) {
    // Gewählte Attacke nicht verfügbar: erst eine andere versuchen, sonst
    // bleibt nur die letzte Kraft.
    const ersatz = angreifer.mon.attacken.findIndex((a) => a.ap > 0 && findeAttacke(a.name));
    if (ersatz >= 0) {
      eintrag = angreifer.mon.attacken[ersatz];
      attacke = findeAttacke(eintrag.name);
    } else {
      eintrag = null;
      attacke = LETZTE_KRAFT;
      ereignisse.push(text(`${anzeigename(angreifer.mon)} hat nichts mehr in der Kiste!`));
    }
  }

  if (eintrag) eintrag.ap -= 1;
  ereignisse.push(ereignis('angriff', { seite, attacke: attacke.name }));
  ereignisse.push(text(`${anzeigename(angreifer.mon)} setzt ${attacke.name} ein!`));

  if (!trifft(attacke, angreifer, verteidiger)) {
    ereignisse.push(text('Daneben. Komplett daneben.'));
    return;
  }

  let gesamtschaden = 0;

  if (attacke.staerke > 0) {
    const treffer = attacke.effekt?.art === 'mehrfach'
      ? zahl(attacke.effekt.min, attacke.effekt.max)
      : 1;
    let letzteWirkung = 1;

    for (let i = 0; i < treffer; i += 1) {
      if (istUmgekippt(verteidiger.mon)) break;
      const { schaden, wirkung } = berechneSchaden(attacke, angreifer, verteidiger);
      letzteWirkung = wirkung;

      if (wirkung === 0) {
        ereignisse.push(text(wirksamkeitText(0)));
        return;
      }

      const wirklich = fuegeSchadenZu(verteidiger.mon, schaden);
      gesamtschaden += wirklich;
      ereignisse.push(ereignis('schaden', { seite: seiteZiel, menge: wirklich, wirkung }));
    }

    if (treffer > 1) ereignisse.push(text(`Volltreffer – ${treffer} Mal hintereinander!`));
    const hinweis = wirksamkeitText(letzteWirkung);
    if (hinweis) ereignisse.push(text(hinweis));
  } else if (attacke.effekt?.ziel !== 'selbst'
      && attacke.effekt?.art !== 'heilung'
      && wirksamkeitGegen(attacke.typ, artVon(verteidiger.mon).typen) === 0) {
    // Auch Statusattacken prallen an unempfindlichen Typen ab.
    ereignisse.push(text(wirksamkeitText(0)));
    return;
  }

  if (!istUmgekippt(verteidiger.mon) || attacke.effekt?.ziel === 'selbst') {
    wendeEffektAn(attacke.effekt, angreifer, verteidiger, seite, gesamtschaden, ereignisse);
  }
}

/** Zustandsschaden und Ablauf am Rundenende. */
function rundenEnde(kampf, ereignisse) {
  for (const [seite, kaempfer] of [['spieler', kampf.eigene], ['gegner', kampf.gegner]]) {
    if (istUmgekippt(kaempfer.mon)) continue;
    const schaden = zustandsschaden(kaempfer.mon);
    if (schaden <= 0) continue;

    fuegeSchadenZu(kaempfer.mon, schaden);
    ereignisse.push(ereignis('schaden', { seite, menge: schaden }));
    ereignisse.push(text(kaempfer.mon.status === 'verkatert'
      ? `${anzeigename(kaempfer.mon)} leidet unter dem Kater.`
      : `${anzeigename(kaempfer.mon)} ist völlig ausgebrannt.`));
  }
}

/** Erfahrung nach einem Sieg verteilen. */
function verteileErfahrung(kampf, besiegt, ereignisse) {
  const menge = erfahrungFuerSieg(besiegt, kampf.art === 'trainer');
  const eigenes = kampf.eigene.mon;
  if (istUmgekippt(eigenes)) return;

  const { neueStufen, neueAttacken } = gibErfahrung(eigenes, menge);
  ereignisse.push(ereignis('erfahrung', { menge }));
  ereignisse.push(text(`${anzeigename(eigenes)} bekommt ${menge} Erfahrung.`));

  for (const stufe of neueStufen) {
    ereignisse.push(ereignis('aufstieg', { stufe }));
    ereignisse.push(text(`${anzeigename(eigenes)} ist jetzt auf Stufe ${stufe}!`));
  }
  for (const attacke of neueAttacken) {
    ereignisse.push(ereignis('lernen', { attacke }));
  }

  const ziel = entwicklungFaellig(eigenes);
  if (ziel) ereignisse.push(ereignis('entwicklung', { zielId: ziel.id }));
}

/** Prüft, ob eine Seite umgekippt ist, und schließt den Kampf gegebenenfalls ab. */
function pruefeUmgekippt(kampf, ereignisse) {
  if (istUmgekippt(kampf.gegner.mon)) {
    ereignisse.push(ereignis('umkippen', { seite: 'gegner' }));
    ereignisse.push(text(`${anzeigename(kampf.gegner.mon)} kippt um!`));
    verteileErfahrung(kampf, kampf.gegner.mon, ereignisse);

    const naechster = kampf.gegnerTeam.findIndex((mon, i) => i > kampf.gegnerIndex && mon.kp > 0);
    if (kampf.art === 'trainer' && naechster >= 0) {
      kampf.gegnerIndex = naechster;
      kampf.gegner = alsKaempfer(kampf.gegnerTeam[naechster]);
      ereignisse.push(ereignis('gegnerWechsel', { index: naechster }));
      ereignisse.push(text(`${kampf.trainer.name} schickt ${anzeigename(kampf.gegner.mon)} in den Ring!`));
    } else {
      kampf.vorbei = true;
      kampf.ergebnis = 'sieg';
      ereignisse.push(ereignis('ende', { ergebnis: 'sieg' }));
    }
    return;
  }

  if (istUmgekippt(kampf.eigene.mon)) {
    ereignisse.push(ereignis('umkippen', { seite: 'spieler' }));
    ereignisse.push(text(`${anzeigename(kampf.eigene.mon)} kippt um!`));

    const ersatz = kampf.team.some((mon) => mon.kp > 0);
    if (ersatz) {
      kampf.wechselNoetig = true;
    } else {
      kampf.vorbei = true;
      kampf.ergebnis = 'niederlage';
      ereignisse.push(ereignis('ende', { ergebnis: 'niederlage' }));
    }
  }
}

/**
 * Rechnet eine komplette Runde.
 * @param {object} kampf
 * @param {{ art: 'attacke'|'gegenstand'|'wechsel'|'flucht', index?: number, gegenstand?: string, zielIndex?: number }} aktion
 * @returns {object[]} Ereignisse
 */
export function fuehreRunde(kampf, aktion) {
  const ereignisse = [];
  if (kampf.vorbei) return ereignisse;

  let spielerZugOffen = true;

  // Gegenstand, Wechsel und Flucht laufen vor allen Attacken.
  if (aktion.art === 'gegenstand') {
    spielerZugOffen = false;
    benutzeGegenstand(kampf, aktion, ereignisse);
    if (kampf.vorbei) return ereignisse;
  } else if (aktion.art === 'wechsel') {
    spielerZugOffen = false;
    wechsleEigenes(kampf, aktion.index, ereignisse);
  } else if (aktion.art === 'flucht') {
    spielerZugOffen = false;
    kampf.fluchtversuche += 1;
    if (kampf.art === 'trainer') {
      ereignisse.push(text('Vor einem Trainer kneift man nicht!'));
    } else if (fluchtGelingt(kampf.eigene, kampf.gegner, kampf.fluchtversuche)) {
      kampf.vorbei = true;
      kampf.ergebnis = 'geflohen';
      ereignisse.push(text('Nichts wie weg hier!'));
      ereignisse.push(ereignis('ende', { ergebnis: 'geflohen' }));
      return ereignisse;
    } else {
      ereignisse.push(text('Kein Durchkommen!'));
    }
  }

  const gegnerIndex = waehleGegnerAttacke(kampf.gegner, kampf.eigene);
  const spielerFaengtAn = spielerZugOffen
    ? istSchneller(kampf.eigene, kampf.gegner)
    : false;

  const zuege = [];
  if (spielerZugOffen) zuege.push({ seite: 'spieler', index: aktion.index });
  zuege.push({ seite: 'gegner', index: gegnerIndex });
  // Beide greifen an: Der Schnellere kommt zuerst.
  if (zuege.length === 2 && !spielerFaengtAn) zuege.reverse();

  for (const zug of zuege) {
    if (kampf.vorbei) break;
    const handelnd = zug.seite === 'spieler' ? kampf.eigene : kampf.gegner;
    if (istUmgekippt(handelnd.mon)) continue;

    fuehreAttacke(kampf, zug.seite, zug.index, ereignisse);
    pruefeUmgekippt(kampf, ereignisse);
    if (kampf.wechselNoetig || kampf.vorbei) return ereignisse;
  }

  rundenEnde(kampf, ereignisse);
  pruefeUmgekippt(kampf, ereignisse);
  return ereignisse;
}

/** Benutzt einen Gegenstand im Kampf. */
function benutzeGegenstand(kampf, aktion, ereignisse) {
  const daten = gegenstandInfo(aktion.gegenstand);
  if (!daten) return;

  if (daten.art === 'fang') {
    if (kampf.art === 'trainer') {
      ereignisse.push(text('Fremde Hardtekkmon fängt man nicht. So viel Anstand muss sein.'));
      return;
    }
    ereignisse.push(text(`Du wirfst ein ${daten.name}!`));
    const versuch = fangversuch(kampf.gegner.mon, daten.wirkung.fangbonus);
    ereignisse.push(ereignis('wurf', { wackler: versuch.wackler, erfolg: versuch.erfolg }));

    if (versuch.erfolg) {
      kampf.vorbei = true;
      kampf.ergebnis = 'gefangen';
      kampf.gefangen = kampf.gegner.mon;
      ereignisse.push(text(`${anzeigename(kampf.gegner.mon)} ist im Pack!`));
      ereignisse.push(ereignis('ende', { ergebnis: 'gefangen' }));
    } else {
      ereignisse.push(text('Mist – wieder raus!'));
    }
    return;
  }

  const ziel = kampf.team[aktion.zielIndex ?? kampf.eigenesIndex];
  if (!ziel) return;

  if (daten.art === 'heilung') {
    const geheilt = heile(ziel, daten.wirkung.kp);
    ereignisse.push(ereignis('heilung', { seite: 'spieler', menge: geheilt }));
    ereignisse.push(text(`${anzeigename(ziel)} bekommt ${geheilt} Kraftpunkte zurück.`));
  } else if (daten.art === 'status') {
    if (ziel.status && daten.wirkung.heiltStatus.includes(ziel.status)) {
      ziel.status = null;
      ereignisse.push(text(`${anzeigename(ziel)} geht es wieder gut.`));
    } else {
      ereignisse.push(text('Das bringt gerade gar nichts.'));
    }
  } else if (daten.art === 'beleben') {
    if (istUmgekippt(ziel)) {
      ziel.kp = Math.max(1, Math.floor(maxKp(ziel) * daten.wirkung.beleben));
      ereignisse.push(text(`${anzeigename(ziel)} ist wieder auf den Beinen!`));
    } else {
      ereignisse.push(text('Das steht doch noch.'));
    }
  } else if (daten.art === 'kampfhilfe') {
    for (const [schluessel, stufen] of Object.entries(daten.wirkung.werte)) {
      aendereStufe(kampf.eigene, schluessel, stufen, ereignisse, 'spieler');
    }
  }
}

/** Wechselt das eigene Hardtekkmon. */
export function wechsleEigenes(kampf, index, ereignisse = []) {
  const neues = kampf.team[index];
  if (!neues || neues.kp <= 0 || index === kampf.eigenesIndex) return ereignisse;

  ereignisse.push(text(`${anzeigename(kampf.eigene.mon)}, komm zurück!`));
  kampf.eigenesIndex = index;
  kampf.eigene = alsKaempfer(neues);
  kampf.wechselNoetig = false;
  ereignisse.push(ereignis('eigenerWechsel', { index }));
  ereignisse.push(text(`Los, ${anzeigename(neues)}!`));
  return ereignisse;
}
