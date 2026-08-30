// ============================================================================
// Konto
// ----------------------------------------------------------------------------
// Anmeldung über Supabase, damit derselbe Spielstand auf jedem Gerät
// erreichbar ist. Supabase kennt nur E-Mail-Konten – der gewünschte reine
// Nutzername/Passwort-Login läuft darum über eine unsichtbare Kunst-E-Mail
// aus dem (kleingeschriebenen) Nutzernamen. Verifiziert wird dabei nichts.
// Die Sitzung bleibt per localStorage über Neustarts hinweg erhalten
// (Standardverhalten des Supabase-Clients), sodass dasselbe Gerät nicht bei
// jedem Aufruf neu einloggen muss.
// ============================================================================

// Lokal gebündelt statt von der CDN geladen (public/js/vendor/, siehe
// tools/aktualisiere-supabase-js.mjs) – ein CDN-Import wäre ein statischer
// Modul-Import und würde beim Fehlen von Internet (z. B. iOS-App offline)
// das Laden des gesamten main.js-Modulgraphen verhindern, nicht nur das
// Login. Betrifft nur das Laden des SDK selbst; echte Netzwerkrufe
// (Anmeldung, Cloud-Speicherstand) brauchen weiterhin eine Verbindung.
import { createClient } from '../vendor/supabase-js.mjs';

const SUPABASE_URL = 'https://smumsrwmaghmjwhcrmpq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ASHiL5qAlHYWsioDV2Ymog_-b44GAXQ';

/** Muss zur Datenbank-Prüfung in profiles_username_check passen. */
export const NUTZERNAME_MUSTER = /^[A-Za-z0-9_-]{3,20}$/;
const MIN_PASSWORTLAENGE = 6;

const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

/**
 * Supabase validiert das Adressformat serverseitig und lehnt Domains ohne
 * echten MX-Eintrag ab (z. B. .local oder frei erfundene Domains) – die
 * Kunst-E-Mail läuft darum bewusst auf die eigene Projekt-Domain, an der
 * ohnehin niemand ein echtes Postfach hat.
 */
function kunstEmail(nutzername) {
  return `${nutzername.trim().toLowerCase()}@smumsrwmaghmjwhcrmpq.supabase.co`;
}

/** Prüft Nutzername und Passwort clientseitig, bevor überhaupt ein Netzwerkruf startet. */
function pruefeEingabe(nutzername, passwort) {
  if (!NUTZERNAME_MUSTER.test(nutzername.trim())) {
    return 'Nutzername: 3–20 Zeichen, nur Buchstaben, Ziffern, _ oder -.';
  }
  if (!passwort || passwort.length < MIN_PASSWORTLAENGE) {
    return `Passwort braucht mindestens ${MIN_PASSWORTLAENGE} Zeichen.`;
  }
  return null;
}

/** @returns {Promise<{eingeloggt: boolean, nutzername: string|null}>} */
export async function sitzungPruefen() {
  const { data } = await client.auth.getSession();
  const sitzung = data?.session ?? null;
  if (!sitzung) return { eingeloggt: false, nutzername: null };
  return { eingeloggt: true, nutzername: sitzung.user.user_metadata?.username ?? null };
}

/**
 * Bester Versuch einer Vorabprüfung, ob ein Nutzername noch frei ist – nur
 * für sofortiges Feedback in der Registrierungsmaske. Verbindlich bleibt
 * allein registriere(): profiles_username_check und der eindeutige Index
 * in der Datenbank entscheiden am Ende, egal was diese Funktion liefert.
 */
export async function nutzernameVerfuegbar(nutzername) {
  const name = nutzername.trim();
  if (!NUTZERNAME_MUSTER.test(name)) return false;
  const { data, error } = await client
    .from('profiles')
    .select('id')
    .ilike('username', name)
    .maybeSingle();
  if (error) return true;
  return !data;
}

/** @returns {Promise<{erfolg: boolean, nutzername?: string, fehler?: string}>} */
export async function registriere(nutzername, passwort) {
  const name = nutzername.trim();
  const problem = pruefeEingabe(name, passwort);
  if (problem) return { erfolg: false, fehler: problem };

  const { data, error } = await client.auth.signUp({
    email: kunstEmail(name),
    password: passwort,
    options: { data: { username: name } },
  });

  if (error) {
    if (/registered|exists/i.test(error.message)) {
      return { erfolg: false, fehler: 'Dieser Nutzername ist bereits vergeben.' };
    }
    return { erfolg: false, fehler: error.message };
  }

  if (!data.session) {
    // Ohne aktive Sitzung nach signUp verlangt das Supabase-Projekt noch eine
    // E-Mail-Bestätigung – für einen reinen Nutzername/Passwort-Login
    // unpassend, da niemand eine echte Adresse hinterlegt. Das lässt sich nur
    // im Supabase-Dashboard abschalten (Authentication → Sign In / Providers
    // → Email → "Confirm email"), nicht per Code.
    return {
      erfolg: false,
      fehler: 'Registrierung angelegt, aber noch nicht aktiv. Der Betreiber muss "Confirm email" im Supabase-Dashboard ausschalten.',
    };
  }

  return { erfolg: true, nutzername: name };
}

/** @returns {Promise<{erfolg: boolean, nutzername?: string, fehler?: string}>} */
export async function meldeAn(nutzername, passwort) {
  const name = nutzername.trim();
  if (!name || !passwort) return { erfolg: false, fehler: 'Nutzername und Passwort eingeben.' };

  const { data, error } = await client.auth.signInWithPassword({
    email: kunstEmail(name),
    password: passwort,
  });

  if (error) return { erfolg: false, fehler: 'Nutzername oder Passwort falsch.' };
  return { erfolg: true, nutzername: data.user?.user_metadata?.username ?? name };
}

export async function meldeAb() {
  await client.auth.signOut();
}

// --- Spielstand in der Cloud -------------------------------------------------

/** @returns {Promise<object|null>} */
export async function ladeCloudStand() {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const { data, error } = await client
    .from('saves')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data.data;
}

/** Nicht-blockierend gedacht: Fehler dürfen das Spiel nie unterbrechen. */
export async function schreibeCloudStand(stand) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return false;

  const { error } = await client
    .from('saves')
    .upsert({ user_id: user.id, data: stand, updated_at: new Date().toISOString() });
  return !error;
}
