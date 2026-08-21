// ============================================================================
// Konto-Oberfläche
// ----------------------------------------------------------------------------
// Das Login-/Registrierungsfenster ist bewusst echtes HTML (nicht der Canvas)
// – für Passwörter braucht es freie Zeicheneingabe, Autofill des Browsers und
// vernünftige Zugänglichkeit, wofür sich eine Bildschirmtastatur im Spielstil
// nicht eignet. starteKonto() blockiert den Spielstart, bis eine Sitzung
// steht, und gleicht danach lokalen und Cloud-Spielstand einmal ab.
// ============================================================================

import { laden as ladeLokal, speichern as schreibeLokal, gibtStand } from './storage.js';
import { sitzungPruefen, registriere, meldeAn, ladeCloudStand, schreibeCloudStand } from './konto.js';

function element(id) {
  return document.getElementById(id);
}

function zeigeFehler(feld, text) {
  feld.textContent = text;
  feld.hidden = !text;
}

function sperreFormular(form, gesperrt) {
  for (const feld of form.elements) feld.disabled = gesperrt;
}

/** Gleicht lokalen und Cloud-Spielstand einmal ab: Cloud gilt als führend. */
async function synchronisiereSpielstand() {
  const cloud = await ladeCloudStand();
  if (cloud) {
    schreibeLokal(cloud);
  } else if (gibtStand()) {
    await schreibeCloudStand(ladeLokal());
  }
}

/**
 * Zeigt bei Bedarf das Login-Fenster und löst erst auf, sobald eine Sitzung
 * steht (bestehend oder frisch angemeldet). Muss vor dem ersten Aufbau der
 * Spielszenen abgewartet werden.
 * @returns {Promise<void>}
 */
export async function starteKonto() {
  const bestehend = await sitzungPruefen();
  if (bestehend.eingeloggt) {
    await synchronisiereSpielstand();
    return;
  }

  const tor = element('konto-tor');
  tor.hidden = false;

  await new Promise((loese) => {
    const loginFenster = element('konto-login-fenster');
    const registrierenFenster = element('konto-registrieren-fenster');
    const loginForm = /** @type {HTMLFormElement} */ (element('konto-login-form'));
    const registrierenForm = /** @type {HTMLFormElement} */ (element('konto-registrieren-form'));
    const loginFehler = element('konto-login-fehler');
    const registrierenFehler = element('konto-registrieren-fehler');

    element('konto-registrieren-link').addEventListener('click', () => {
      loginFenster.hidden = true;
      registrierenFenster.hidden = false;
      zeigeFehler(registrierenFehler, '');
      registrierenForm.elements.namedItem('nutzername').focus();
    });

    element('konto-registrieren-abbrechen').addEventListener('click', () => {
      registrierenFenster.hidden = true;
      loginFenster.hidden = false;
      zeigeFehler(loginFehler, '');
      loginForm.elements.namedItem('nutzername').focus();
    });

    loginForm.addEventListener('submit', async (ereignis) => {
      ereignis.preventDefault();
      const daten = new FormData(loginForm);
      zeigeFehler(loginFehler, '');
      sperreFormular(loginForm, true);

      const antwort = await meldeAn(String(daten.get('nutzername')), String(daten.get('passwort')));
      sperreFormular(loginForm, false);

      if (!antwort.erfolg) {
        zeigeFehler(loginFehler, antwort.fehler);
        return;
      }

      await synchronisiereSpielstand();
      tor.hidden = true;
      loese(undefined);
    });

    registrierenForm.addEventListener('submit', async (ereignis) => {
      ereignis.preventDefault();
      const daten = new FormData(registrierenForm);
      zeigeFehler(registrierenFehler, '');
      sperreFormular(registrierenForm, true);

      const antwort = await registriere(String(daten.get('nutzername')), String(daten.get('passwort')));
      sperreFormular(registrierenForm, false);

      if (!antwort.erfolg) {
        zeigeFehler(registrierenFehler, antwort.fehler);
        return;
      }

      // Frisch registriert und bereits angemeldet (signUp liefert direkt
      // eine Sitzung, solange "Confirm email" im Projekt deaktiviert ist).
      await synchronisiereSpielstand();
      tor.hidden = true;
      loese(undefined);
    });
  });
}
