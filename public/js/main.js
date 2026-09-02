// ============================================================================
// Hardtekkmon – Rote Chupa Chups
// ----------------------------------------------------------------------------
// Einstiegspunkt: Eingabe anmelden, Grafiken vorbereiten, Titelbild zeigen und
// die Spielschleife starten. Alles Weitere übernehmen die Szenen.
// ============================================================================

import { ctx, loesche, HOEHE } from './engine/screen.js';
import { starteEingabe, eingabeSchritt } from './engine/input.js';
import { schleife } from './engine/loop.js';
import {
  starteAudio, spieleTrack, audioSchritt, tonUmschalten,
} from './engine/audio.js';
import { starteKonto } from './engine/kontoUi.js';
import { baueKacheln } from './gfx/tiles.js';
import { zeichneText } from './gfx/font.js';
import { schiebe, aktuelleSzene, aktualisiereStapel, zeichneStapel } from './scenes/stapel.js';
import { Titelszene } from './scenes/titel.js';
import { Beendenszene } from './scenes/beenden.js';
import { spiel, zaehleZeit } from './game/spielstand.js';

/** Vollbild und Ton lassen sich über zwei kleine Schalter umstellen. */
function verbindeSchalter() {
  const vollbild = document.getElementById('fullscreen');
  const ton = document.getElementById('sound');

  vollbild?.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* Manche Browser verweigern Vollbild – das Spiel läuft trotzdem. */
    }
  });

  ton?.addEventListener('click', () => {
    starteAudio();
    ton.classList.toggle('is-off', !tonUmschalten());
  });

  // Der Ton darf erst nach einer echten Eingabe starten – dafür reicht aber
  // jede Berührung der Seite, nicht erst eine der acht Spieltasten. So läuft
  // das Titellied schon auf dem "IRGENDEINE TASTE DRÜCKEN"-Bildschirm, statt
  // erst mit dem Tastendruck, der gleichzeitig das Menü öffnet.
  const wecken = () => {
    starteAudio();
    spieleTrack('titel');
  };
  window.addEventListener('pointerdown', wecken, { once: true });
  window.addEventListener('keydown', wecken, { once: true });
}

/** Das rote Power-Kreuz im Gehäuse: öffnet die Beenden-Abfrage. */
function verbindePowerknopf() {
  const power = document.getElementById('power');
  power?.addEventListener('click', () => {
    if (aktuelleSzene() instanceof Beendenszene) return;
    schiebe(new Beendenszene());
  });
}

/** Zeigt einen Fehler auf dem Spielbildschirm statt in der Konsole. */
function zeigeFehler(fehler) {
  loesche('#181020');
  zeichneText(ctx, 'Da ist was schiefgelaufen:', 8, 20, { farbe: '#f0c040' });
  const meldung = String(fehler?.message ?? fehler);
  meldung.match(/.{1,44}/g)?.slice(0, 8).forEach((zeile, i) => {
    zeichneText(ctx, zeile, 8, 36 + i * 10, { farbe: '#f8f8f0' });
  });
  zeichneText(ctx, 'Seite neu laden hilft meistens.', 8, HOEHE - 16, { farbe: '#a0a0b8' });
}

async function start() {
  starteEingabe();
  verbindeSchalter();
  verbindePowerknopf();
  baueKacheln();

  // Blockiert, bis eine Sitzung steht (bestehend oder frisch angemeldet) –
  // erst danach ergibt ein Spielstand überhaupt einen Sinn.
  await starteKonto();

  schiebe(new Titelszene());

  const spielschleife = schleife(
    () => {
      eingabeSchritt();
      aktualisiereStapel();
      if (spiel) zaehleZeit();
      audioSchritt();
    },
    () => {
      loesche('#000000');
      zeichneStapel(ctx);
    },
  );

  spielschleife.start();
}

start().catch((fehler) => {
  zeigeFehler(fehler);
  throw fehler;
});
