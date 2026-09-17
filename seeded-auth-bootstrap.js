/* Tribeca Aula v226 · activación de cuentas preautorizadas */
(() => {
  'use strict';

  const supabaseGlobal = window.supabase;
  if (!supabaseGlobal || typeof supabaseGlobal.createClient !== 'function') return;
  if (supabaseGlobal.__tribecaSeededBootstrapV226) return;
  supabaseGlobal.__tribecaSeededBootstrapV226 = true;

  const originalCreateClient = supabaseGlobal.createClient.bind(supabaseGlobal);

  function storedPassword(username, password) {
    const raw = String(password || '');
    if (raw.length >= 6) return raw;
    return `Tribeca-${String(username || '').trim().toLowerCase()}-${raw}`;
  }

  supabaseGlobal.createClient = function tribecaCreateClientV226(...args) {
    const client = originalCreateClient(...args);
    const originalSignIn = client?.auth?.signInWithPassword?.bind(client.auth);
    if (!originalSignIn) return client;

    client.auth.signInWithPassword = async function tribecaSignInV226(credentials = {}) {
      const first = await originalSignIn(credentials);
      if (!first?.error) return first;

      const email = String(credentials?.email || '').trim().toLowerCase();
      const password = String(credentials?.password || '');
      if (password.length < 4 || !email.endsWith('@tribecaaula.test')) return first;

      const username = email.slice(0, -'@tribecaaula.test'.length);
      if (!username) return first;

      let infoResult;
      try {
        infoResult = await client.rpc('tribeca_seeded_signup_info_v226', { p_username: username });
      } catch (_error) {
        return first;
      }

      const info = infoResult?.data || null;
      if (infoResult?.error || !info?.allowed || String(info?.email || '').trim().toLowerCase() !== email) {
        return first;
      }

      const internalPassword = storedPassword(username, password);
      try {
        const signup = await client.auth.signUp({
          email,
          password: internalPassword,
          options: {
            data: {
              username: String(info.username || username),
              full_name: String(info.full_name || username)
            }
          }
        });

        if (signup?.error) {
          const retry = await originalSignIn({ email, password: internalPassword });
          return retry?.error ? first : retry;
        }

        const activated = await originalSignIn({ email, password: internalPassword });
        return activated?.error ? first : activated;
      } catch (_error) {
        return first;
      }
    };

    return client;
  };
})();
