/* Tribeca Aula · Versión 175 · sin modo verano, videoclases visibles para alumnado y horarios activos por perfil.
   Base: notificaciones push v164 funcionales, alumnado sin depuración visible. */
(() => {
  'use strict';
  if (location.search && /(firstName|lastName|fullName|username|eventDate|monthlyFee|subject)=/.test(location.search)) {
    history.replaceState(null, '', location.pathname + location.hash);
  }

  const cfg = window.TRIBECA_SUPABASE || {};
  const configured = /^https:\/\/.+\.supabase\.co$/.test(String(cfg.url || '')) && String(cfg.anonKey || '').length > 30;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const safe = (value) => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const uid = () => (crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const todayIso = () => new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
  const parseIso = iso => { const [y,m,d] = String(iso || todayIso()).slice(0,10).split('-').map(Number); return new Date(y || 2026, (m || 1)-1, d || 1); };
  const toIso = d => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);
  const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate()+n); return d; };
  const startMonth = d => new Date(d.getFullYear(), d.getMonth(), 1);
  const fmtDate = iso => parseIso(iso).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
  const fmtLongDate = iso => parseIso(iso).toLocaleDateString('es-ES', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
  const fmtDT = iso => iso ? new Date(iso).toLocaleString('es-ES', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
  const toast = (msg) => typeof window.showToast === 'function' ? window.showToast(msg) : alert(msg);
  const TRIBECA_QUERY_TIMEOUT_MS = 9000;
  function tribecaTimeoutPromise(ms=TRIBECA_QUERY_TIMEOUT_MS, label='operación') {
    return new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} ha tardado demasiado. Se continúa con la carga básica.`)), ms));
  }
  function tribecaWithTimeout(promise, ms=TRIBECA_QUERY_TIMEOUT_MS, label='operación') {
    return Promise.race([promise, tribecaTimeoutPromise(ms, label)]);
  }
  function deferTribecaBackgroundTask(task, delay=900) {
    const runner = () => {
      try {
        const result = task?.();
        if(result && typeof result.catch === 'function') result.catch(error => console.warn('[Tribeca Aula] Tarea en segundo plano:', error?.message || error));
      } catch(error) {
        console.warn('[Tribeca Aula] Tarea en segundo plano:', error?.message || error);
      }
    };
    if('requestIdleCallback' in window) window.requestIdleCallback(runner, { timeout: Math.max(1200, delay + 700) });
    else setTimeout(runner, delay);
  }

  const TRIBECA_THEME_KEY = 'tribeca-theme';
  function tribecaPreferredTheme(){
    const saved = localStorage.getItem(TRIBECA_THEME_KEY) || localStorage.getItem('theme') || '';
    if(saved === 'dark' || saved === 'light') return saved;
    try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
    catch(_error){ return 'light'; }
  }
  function applyTribecaTheme(theme = tribecaPreferredTheme()){
    const dark = theme === 'dark';
    document.body.classList.toggle('is-dark', dark);
    document.body.classList.toggle('dark-mode', dark);
    document.body.classList.toggle('theme-dark', dark);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.body.dataset.theme = dark ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', dark ? '#070805' : '#064b35');
    const txt = document.getElementById('themeText');
    if(txt) txt.textContent = dark ? 'Oscuro' : 'Claro';
    const toggle = document.getElementById('themeToggle');
    if(toggle){
      toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
      toggle.setAttribute('title', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    }
  }
  function setTribecaTheme(theme){
    const clean = theme === 'dark' ? 'dark' : 'light';
    localStorage.setItem(TRIBECA_THEME_KEY, clean);
    applyTribecaTheme(clean);
  }
  function bindTribecaThemeControls(){
    applyTribecaTheme();
    const toggle = document.getElementById('themeToggle');
    if(toggle && !toggle.dataset.t166ThemeBound){
      toggle.dataset.t166ThemeBound = '1';
      toggle.addEventListener('click', ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        setTribecaTheme(document.body.classList.contains('is-dark') ? 'light' : 'dark');
      }, true);
    }
  }
  function syncTribecaStandaloneClass(){
    try{
      const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone === true;
      document.body.classList.toggle('is-pwa-standalone', !!standalone);
    }catch(_error){ document.body.classList.remove('is-pwa-standalone'); }
  }

  const State = {
    client: null,
    session: null,
    user: null,
    profile: null,
    data: {},
    windows: new Map(),
    z: 5000,
    selectedDate: todayIso(),
    calendarMonth: startMonth(new Date()),
    selectedStudentId: null,
    selectedEventId: null,
    selectedGuidanceId: null,
    selectedSubjectStage: localStorage.getItem('tribeca-teacher-subject-stage') || 'ESO',
    selectedSubjectCourse: localStorage.getItem('tribeca-teacher-subject-course') || '1.º ESO',
    loadedAt: 0,
    activitySince: null,
    selfPause: null,
    profilePanel: 'profile',
    prefillPublicationClassId: null,
    prefillPublicationClassSubjectId: null,
    prefillPublicationClassUnitId: null,
    prefillPublicationKind: null,
    teacherTasksOpen: false,
    pendingTeacherTaskEdit: null,
    scheduleSeason: 'school',
    historyNavigating: false,
    suppressHistoryPush: false
  };
  window.TribecaAuth = State;
  const TRIBECA_TEACHER_PROFILE_IMAGE = 'assets/patricia-trillo-perfil.webp';
  const TRIBECA_LOGO_DEFAULT = 'assets/logo-tribeca.png';
  const TRIBECA_SEASONAL_LOGOS = { default: TRIBECA_LOGO_DEFAULT };
  function seasonalLogoVariant(_date = new Date()){ return 'default'; }
  function seasonalLogoPath(){ return TRIBECA_LOGO_DEFAULT; }
  function applyTribecaSeasonMode(){
    document.body.classList.remove('is-summer-mode');
    document.documentElement.classList.remove('is-summer-mode');
    State.scheduleSeason = 'school';
    try{ localStorage.removeItem('tribeca-schedule-season-v144'); }catch(_error){}
    const meta = document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', document.body.classList.contains('is-dark') ? '#070805' : '#064b35');
    applySeasonalLogos(document);
  }
  function applySeasonalLogos(root = document){
    const desired = TRIBECA_LOGO_DEFAULT;
    const nodes = [];
    const pushNode = node => { if(node && node.nodeType === 1 && node.tagName === 'IMG') nodes.push(node); };
    if(root?.nodeType === 1) pushNode(root);
    (root?.querySelectorAll ? root.querySelectorAll('img') : document.querySelectorAll('img')).forEach(pushNode);
    nodes.forEach(img => {
      const current = String(img.getAttribute('src') || '');
      if(!/assets\/logo-tribeca(?:-(?:verano|halloween|navidad))?\.png(?:[?#].*)?$/i.test(current)) return;
      if(current !== desired) img.setAttribute('src', desired);
      img.dataset.tribecaSeasonalLogo = 'default';
    });
  }
  function teacherProfileImageUrl(profile = State.profile) {
    if(!profile) return '';
    const isTeacher = profile.role === 'teacher' || String(profile.username || '').toLowerCase().includes('profesora');
    return profile.avatar_image_url || (isTeacher ? TRIBECA_TEACHER_PROFILE_IMAGE : '');
  }
  const UndoStack = [];
  const UNDO_TTL_MS = 15 * 60 * 1000;
  function pushUndo(label, fn){ if(typeof fn==='function') { UndoStack.push({label, fn, at: Date.now()}); toast(`Cambio realizado. Puedes deshacerlo durante 15 minutos: ${label}`); } }
  async function undoLast(){ const item = UndoStack.pop(); if(!item) return toast('No hay cambios recientes para deshacer.'); if(Date.now() - item.at > UNDO_TTL_MS) return toast('El plazo para deshacer este cambio ha caducado.'); try{ await item.fn(); await loadData(true); renderApp(); rerender(); toast(`Cambio deshecho: ${item.label}`); }catch(e){ console.error(e); toast(e.message || 'No se pudo deshacer el último cambio.'); } }
  window.TribecaUndoLastAction = undoLast;


  const TRIBECA_PUSH_FUNCTION = 'tribeca-push-v164';
  const TRIBECA_PUSH_DEVICE_KEY = 'tribeca-push-device-id-v151';
  const TRIBECA_PUSH_ENABLED_KEY = 'tribeca-push-enabled-v151';
  const TRIBECA_PUSH_LAST_ERROR_KEY = 'tribeca-push-last-error-v164';
  const TRIBECA_PUSH_LAST_OK_KEY = 'tribeca-push-last-ok-v164';
  const TRIBECA_PUSH_DEFAULT_PREFS = Object.freeze({ messages:true, calendar:true, announcements:true, materials:true });

  function tribecaDeviceId(){
    let id = localStorage.getItem(TRIBECA_PUSH_DEVICE_KEY);
    if(!id){ id = uid(); localStorage.setItem(TRIBECA_PUSH_DEVICE_KEY, id); }
    return id;
  }
  function tribecaNotificationPrefs(profile=State.profile){
    const raw = profile?.notification_preferences || {};
    return {
      messages: raw.messages !== false,
      calendar: raw.calendar !== false,
      announcements: raw.announcements !== false,
      materials: raw.materials !== false
    };
  }
  function tribecaAllAppNotificationPrefs(){
    return { ...TRIBECA_PUSH_DEFAULT_PREFS };
  }
  function tribecaPushSupported(){
    return !!(configured && cfg.url && cfg.anonKey && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext !== false);
  }
  function tribecaBadgeSupported(){ return !!(navigator?.setAppBadge || navigator?.clearAppBadge); }
  function urlBase64ToUint8Array(base64String=''){
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
  }
  function uint8ArrayToUrlBase64(bytes){
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    let raw = '';
    arr.forEach(b => { raw += String.fromCharCode(b); });
    return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function tribecaSubscriptionMatchesVapid(subscription, publicKey){
    try{
      const current = subscription?.options?.applicationServerKey;
      if(!current) return true;
      return uint8ArrayToUrlBase64(current) === String(publicKey || '').trim();
    }catch(_error){
      return true;
    }
  }
  async function tribecaPushInvoke(body={}){
    if(!configured || !cfg.url || !cfg.anonKey) throw new Error('Supabase no está configurado para notificaciones.');
    let session = State.session || null;
    try{
      if(!session && State.client?.auth?.getSession){
        const res = await State.client.auth.getSession();
        session = res?.data?.session || null;
        if(session) State.session = session;
      }
    }catch(_error){}
    const endpoint = `${String(cfg.url).replace(/\/$/, '')}/functions/v1/${TRIBECA_PUSH_FUNCTION}`;
    const payload = { ...(body || {}) };
    if(session?.access_token) payload.accessToken = session.access_token;
    /*
      v161: llamada sin cabeceras personalizadas y sin Content-Type explícito.
      La función nueva tribeca-push-v164 debe tener Verify JWT desactivado
      y valida la sesión dentro de la propia función.
    */
    let response;
    try{
      response = await fetch(endpoint, {
        method:'POST',
        body: JSON.stringify(payload),
        cache:'no-store'
      });
    }catch(error){
      throw new Error(`No se pudo conectar con la Edge Function ${TRIBECA_PUSH_FUNCTION}: ${error?.message || error}`);
    }
    const text = await response.text().catch(()=> '');
    let data = null;
    try{ data = text ? JSON.parse(text) : null; }catch(_error){ data = text ? { error:text } : null; }
    if(!response.ok){
      const msg = data?.error || data?.message || data?.details || text || `HTTP ${response.status}`;
      throw new Error(`Edge Function ${TRIBECA_PUSH_FUNCTION}: ${msg}`);
    }
    return data || {};
  }
  async function fetchTribecaVapidPublicKey(){
    const direct = String(cfg.vapidPublicKey || cfg.webPushPublicKey || '').trim();
    if(direct) return direct;
    const data = await tribecaPushInvoke({ action:'publicKey' });
    const key = String(data?.publicKey || '').trim();
    if(!key) throw new Error('Falta la clave pública VAPID de Tribeca Aula.');
    return key;
  }
  function tribecaPushUserStorageKey(base){
    const id = String(State.profile?.id || 'anonymous').trim();
    return `${base}-${id || 'anonymous'}`;
  }
  function tribecaPushEnabled(){
    const key = tribecaPushUserStorageKey(TRIBECA_PUSH_ENABLED_KEY);
    if(localStorage.getItem(key) === '1') return true;
    if(roleTeacher() && localStorage.getItem(TRIBECA_PUSH_ENABLED_KEY) === '1'){
      localStorage.setItem(key, '1');
      return true;
    }
    return false;
  }
  function tribecaSetPushEnabled(value){
    const key = tribecaPushUserStorageKey(TRIBECA_PUSH_ENABLED_KEY);
    if(value){
      localStorage.setItem(key, '1');
      // Marca heredada solo para compatibilidad con instalaciones anteriores.
      // No debe llamarse recursivamente: eso bloqueaba la activación push en móvil.
      localStorage.setItem(TRIBECA_PUSH_ENABLED_KEY, '1');
    } else {
      localStorage.removeItem(key);
      localStorage.removeItem(TRIBECA_PUSH_ENABLED_KEY);
    }
  }
  function tribecaPushStatusText(){
    if(!tribecaPushSupported()) return roleTeacher() ? 'No disponible en este navegador o falta configurar Supabase.' : 'No disponible en este dispositivo.';
    if(Notification.permission === 'granted') return tribecaPushEnabled() ? 'Activadas en este dispositivo.' : 'Permiso del móvil concedido. Falta pulsar el botón de activación.';
    if(Notification.permission === 'denied') return 'Bloqueadas por el navegador. Debes permitirlas desde los ajustes del sitio.';
    return 'Pendientes de activar en este dispositivo.';
  }
  function tribecaPushLastError(){ return String(localStorage.getItem(tribecaPushUserStorageKey(TRIBECA_PUSH_LAST_ERROR_KEY)) || '').trim(); }
  function tribecaPushLastOk(){ return String(localStorage.getItem(tribecaPushUserStorageKey(TRIBECA_PUSH_LAST_OK_KEY)) || '').trim(); }
  function tribecaSetPushLastError(error){
    const message = tribecaPushHumanError(error);
    localStorage.setItem(tribecaPushUserStorageKey(TRIBECA_PUSH_LAST_ERROR_KEY), message);
    localStorage.removeItem(tribecaPushUserStorageKey(TRIBECA_PUSH_LAST_OK_KEY));
    localStorage.removeItem(TRIBECA_PUSH_LAST_ERROR_KEY);
    localStorage.removeItem(TRIBECA_PUSH_LAST_OK_KEY);
    return message;
  }
  function tribecaSetPushLastOk(message){
    localStorage.setItem(tribecaPushUserStorageKey(TRIBECA_PUSH_LAST_OK_KEY), message);
    localStorage.removeItem(tribecaPushUserStorageKey(TRIBECA_PUSH_LAST_ERROR_KEY));
    localStorage.removeItem(TRIBECA_PUSH_LAST_ERROR_KEY);
    localStorage.removeItem(TRIBECA_PUSH_LAST_OK_KEY);
  }
  function tribecaClearPushFeedback(){
    localStorage.removeItem(tribecaPushUserStorageKey(TRIBECA_PUSH_LAST_ERROR_KEY));
    localStorage.removeItem(tribecaPushUserStorageKey(TRIBECA_PUSH_LAST_OK_KEY));
    localStorage.removeItem(TRIBECA_PUSH_LAST_ERROR_KEY);
    localStorage.removeItem(TRIBECA_PUSH_LAST_OK_KEY);
  }
  function tribecaWithTimeout(promise, ms=12000, label='La operación de notificaciones tardó demasiado.'){
    return Promise.race([promise, new Promise((_, reject)=>setTimeout(()=>reject(new Error(label)), ms))]);
  }
  async function tribecaServiceWorkerReady(){
    await registerTribecaPwa({ immediate:true });
    return await tribecaWithTimeout(navigator.serviceWorker.ready, 12000, 'El service worker de la app no terminó de activarse. Cierra y vuelve a abrir Tribeca Aula.');
  }
  async function enableTribecaPushNotifications(options={}){
    const silent = !!options.silent;
    if(!tribecaPushSupported()) {
      const msg = roleTeacher() ? 'Este navegador o esta instalación de la app no permite notificaciones push web. Prueba desde la PWA instalada o revisa los permisos del sitio.' : 'Este dispositivo no permite activar las notificaciones de la app.';
      tribecaSetPushLastError(msg);
      refreshProfileNotificationsPanel();
      if(!silent) toast(msg);
      throw new Error(msg);
    }
    try{
      tribecaClearPushFeedback();
      ['tribeca-push-last-error-v159','tribeca-push-last-ok-v159','tribeca-push-last-error-v160','tribeca-push-last-ok-v160','tribeca-push-last-error-v161','tribeca-push-last-ok-v161','tribeca-push-last-error-v163','tribeca-push-last-ok-v163'].forEach(k=>localStorage.removeItem(k));
      refreshProfileNotificationsPanel();
      const permission = await Notification.requestPermission();
      if(permission !== 'granted') throw new Error('No se han activado las notificaciones porque el permiso no fue concedido.');
      const reg = await tribecaServiceWorkerReady();
      const publicKey = await tribecaWithTimeout(fetchTribecaVapidPublicKey(), 12000, 'No se pudo obtener la clave pública VAPID desde Supabase. Revisa la función tribeca-push-v164 y los secretos VAPID.');
      let subscription = await tribecaWithTimeout(reg.pushManager.getSubscription(), 8000, 'No se pudo leer la suscripción push del navegador.');
      if(subscription && !tribecaSubscriptionMatchesVapid(subscription, publicKey)){
        try{ await subscription.unsubscribe(); }catch(_error){}
        subscription = null;
      }
      if(!subscription){
        subscription = await tribecaWithTimeout(reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:urlBase64ToUint8Array(publicKey) }), 15000, 'El navegador no terminó de crear la suscripción push.');
      }
      const preferences = tribecaAllAppNotificationPrefs();
      await tribecaWithTimeout(tribecaPushInvoke({
        action:'subscribe',
        deviceId: tribecaDeviceId(),
        subscription: subscription.toJSON(),
        preferences,
        userAgent: navigator.userAgent || ''
      }), 15000, 'La suscripción se creó en el móvil, pero no se pudo guardar en Supabase. Revisa la Edge Function tribeca-push-v164.');
      if(State.profile?.id){
        const patch = { notification_preferences: preferences };
        try{
          await maybe(table('profiles').update(patch).eq('id', State.profile.id));
          Object.assign(State.profile, patch);
        }catch(prefError){
          console.warn('[Tribeca Aula] La suscripción push quedó activa, pero no se pudieron guardar las preferencias generales:', prefError);
        }
      }
      tribecaSetPushEnabled(true);
      tribecaSetPushLastOk('Notificaciones activadas en este dispositivo.');
      await syncTribecaAppBadge();
      if(!silent) toast('Notificaciones de la app activadas.');
      return true;
    } catch(error) {
      console.warn('[Tribeca Aula] Activación push fallida:', error);
      tribecaSetPushEnabled(false);
      const msg = tribecaSetPushLastError(error);
      if(!silent) toast(msg);
      throw error;
    } finally {
      refreshProfileNotificationsPanel();
    }
  }
  async function disableTribecaPushNotifications(){
    try{
      const reg = await tribecaWithTimeout(navigator.serviceWorker?.ready, 8000, 'No se pudo acceder al service worker para desactivar.');
      const subscription = await reg?.pushManager?.getSubscription?.();
      const endpoint = subscription?.endpoint || '';
      if(endpoint) await tribecaPushInvoke({ action:'unsubscribe', endpoint, deviceId:tribecaDeviceId() }).catch(()=>{});
      await subscription?.unsubscribe?.();
    } catch(error) {
      console.warn('[Tribeca Aula] No se pudo desactivar completamente la suscripción push:', error);
    }
    tribecaSetPushEnabled(false);
    tribecaClearPushFeedback();
    await syncTribecaAppBadge(0);
    toast('Notificaciones push desactivadas en este dispositivo.');
    refreshProfileNotificationsPanel();
  }
  function tribecaPushHumanError(error){
    const raw = error?.message || error?.error || error?.details || error;
    const message = String(raw || '').trim();
    const teacher = State.profile?.role === 'teacher';
    const generic = 'No se pudo completar la activación de notificaciones en este momento. Inténtalo más tarde o avisa a la profesora.';
    if(!teacher){
      if(/permiso no fue concedido|bloqueadas|Permission|denied/i.test(message)) return 'Las notificaciones están bloqueadas en este dispositivo. Revisa los permisos del sitio o de la app.';
      if(/no permite notificaciones|PushManager|service worker|secure/i.test(message)) return 'Este dispositivo no permite activar notificaciones de la app.';
      if(/sesión|autenticada|session/i.test(message)) return 'No hay una sesión válida. Cierra sesión y vuelve a entrar.';
      return generic;
    }
    if(/Verify JWT|JWT Verification|publishable|sb_publishable|preflight|CORS|Failed to fetch|NetworkError|No se pudo conectar/i.test(message)) return 'La función de notificaciones existe, pero el navegador no puede llamarla. En Supabase debes entrar en Edge Functions > tribeca-push-v164 > Settings y desactivar Verify JWT / JWT Verification. La v164 verifica la sesión dentro de la función.';
    if(/invalid b64 coordinate|base64url coordinate|Invalid JWK|JWK EC key|VAPID|clave pública|clave privada|public key|private key/i.test(message)) return 'Las claves VAPID existen, pero una estaba guardada en un formato que Supabase no podía firmar. Sustituye la Edge Function por tribeca-push-v164. Si persiste, revisa que VAPID_PRIVATE_KEY contenga solo la clave privada, no la clave pública ni texto añadido.';
    if(/Sesión|autenticada|session|jwt|JWT|Authorization/i.test(message)) return 'No hay una sesión válida. Cierra sesión y vuelve a entrar.';
    if(/tribeca_web_push_subscriptions|relation.*does not exist|no existe/i.test(message)) return 'Falta ejecutar el SQL de la v151 en Supabase para crear las tablas de notificaciones.';
    if(/web-push|esm\.sh|module|Import|dependency|Cannot find module|Relative import path|dinamicamente|dinámico/i.test(message)) return 'Está contestando una función antigua o distinta. Crea una Edge Function nueva llamada tribeca-push-v164, pega el index_ts_para_copiar_en_supabase.txt de la v164 y pulsa Deploy. No edites las funciones antiguas.';
    if(/HTTP 404|not found|Function not found/i.test(message)) return 'Supabase no encuentra la función tribeca-push-v164. Crea esa Edge Function nueva con ese nombre exacto en el mismo proyecto conectado a la web.';
    if(/Push service HTTP 401|Push service HTTP 403|vapid|aud|signature/i.test(message)) return 'La suscripción del móvil no coincide con las claves VAPID actuales. Pulsa “Desactivar o reiniciar este dispositivo” y después “Activar notificaciones de la app”.';
    if(/Edge Function/i.test(message)) return message;
    return message || 'No se pudo completar la comprobación de notificaciones.';
  }

  async function tribecaEnsurePushReadyBeforeTest(){
    if(Notification.permission !== 'granted' || !tribecaPushEnabled()) {
      await enableTribecaPushNotifications({ silent:true });
      return;
    }
    await refreshTribecaPushSubscriptionIfEnabled();
  }

  async function tribecaSendPushTestToCurrentUser(){
    if(!roleTeacher()) return toast('Las notificaciones de la app están activas si este dispositivo quedó registrado.');
    if(!State.profile) return toast('Inicia sesión antes de probar las notificaciones.');
    if(!tribecaPushSupported()) return toast('Este navegador o esta instalación de la app no permite notificaciones push web.');
    try{
      await tribecaEnsurePushReadyBeforeTest();
      const result = await tribecaPushInvoke({
        action:'dispatch',
        type:'test',
        preferenceKey:'',
        title:'Prueba de Tribeca Aula',
        body:'Si ves este aviso, las notificaciones de la app funcionan en este dispositivo.',
        recipientIds:[State.profile.id],
        includeActor:true,
        targetScope:'user',
        url: tribecaHistoryUrl('profile', { panel:'notifications' }),
        icon:'assets/tribeca-pwa-icon-192.png',
        badge:'assets/tribeca-pwa-icon-192.png',
        badgeCount:1,
        tag:`tribeca-test-${Date.now()}`
      });
      const sent = Number(result?.sent || 0);
      const subscriptions = Number(result?.subscriptions || 0);
      if(sent > 0){
        tribecaSetPushLastOk('Prueba enviada correctamente con payload cifrado. Debería aparecer como aviso de Tribeca Aula en la cortina del móvil en unos segundos.');
        refreshProfileNotificationsPanel();
        return toast('Prueba enviada. Debería aparecer como aviso de Tribeca Aula en la cortina del móvil en unos segundos.');
      }
      const detail = Array.isArray(result?.errors) && result.errors.length ? ` Detalle técnico: ${result.errors.map(e=>e.message||e.status).filter(Boolean).join(' · ')}` : '';
      const msg = subscriptions <= 0 ? 'No hay ningún dispositivo activo registrado para esta cuenta. Pulsa “Activar notificaciones de la app”.' : 'La prueba se ha intentado enviar, pero el servicio push no la ha aceptado para ningún dispositivo.' + (roleTeacher()?detail:'');
      tribecaSetPushLastError(msg);
      refreshProfileNotificationsPanel();
      return toast(msg);
    }catch(error){
      console.warn('[Tribeca Aula] Prueba push fallida:', error);
      toast(tribecaSetPushLastError(error));
      refreshProfileNotificationsPanel();
    }
  }

  async function tribecaResetPushFeedback(){
    if(!roleTeacher()) return;
    tribecaClearPushFeedback();
    refreshProfileNotificationsPanel();
  }

  async function refreshTribecaPushSubscriptionIfEnabled(options={}){
    const force = !!options.force;
    if(!force && !tribecaPushEnabled()) return;
    if(!tribecaPushSupported() || Notification.permission !== 'granted') return;
    try{
      const reg = await tribecaServiceWorkerReady();
      const subscription = await reg.pushManager.getSubscription();
      if(subscription){
        await tribecaPushInvoke({ action:'subscribe', deviceId:tribecaDeviceId(), subscription:subscription.toJSON(), preferences:tribecaAllAppNotificationPrefs(), userAgent:navigator.userAgent || '' });
        tribecaSetPushEnabled(true);
        if(State.profile?.id){ try{ const patch={notification_preferences:tribecaAllAppNotificationPrefs()}; await maybe(table('profiles').update(patch).eq('id', State.profile.id)); Object.assign(State.profile, patch); }catch(_prefError){} }
      }
    } catch(error){
      console.warn('[Tribeca Aula] No se pudo sincronizar la suscripción push:', error);
    }
  }
  let tribecaAutoPushRegistering = false;
  async function tribecaAutoRegisterPushIfPermissionGranted(){
    if(tribecaAutoPushRegistering) return;
    if(!State.profile || !tribecaPushSupported() || Notification.permission !== 'granted') return;
    tribecaAutoPushRegistering = true;
    try{
      if(tribecaPushEnabled()) await refreshTribecaPushSubscriptionIfEnabled({ force:true });
      else await enableTribecaPushNotifications({ silent:true });
      console.info('[Tribeca Aula] Dispositivo registrado para push tras permiso concedido.');
    }catch(error){
      if(roleTeacher()) console.warn('[Tribeca Aula] No se pudo registrar automáticamente push:', error?.message || error);
    }finally{
      tribecaAutoPushRegistering = false;
    }
  }
  function refreshProfileNotificationsPanel(){
    if(State.activeInlineSection === 'profile') renderInlineSection('profile', State.activeInlineOptions || {});
  }
  function tribecaNotificationSection(type=''){
    if(type === 'message') return 'messages';
    if(type === 'announcement') return 'announcements';
    if(type === 'calendar') return 'calendar';
    if(type === 'material') return State.currentClassSubjectId ? 'classSubjectDetail' : 'subjects';
    return 'home';
  }
  function tribecaAppBadgeCount(){
    if(!State.profile) return 0;
    const unreadMessages = (State.data.messages||[]).filter(m=>m.recipient_id===State.profile?.id && !m.read_at && !m.archived && !m.deleted_by_recipient).length;
    const unreadAnnouncements = (typeof visibleAnnouncements === 'function') ? visibleAnnouncements().filter(a=>!announcementIsRead(a)).length : 0;
    const teacherAlerts = roleTeacher() ? Math.max(0, teacherAlertCount() - Number(localStorage.getItem(`tribeca-alerts-seen-${State.profile.id}`)||0)) : 0;
    return Math.max(0, unreadMessages + unreadAnnouncements + teacherAlerts);
  }
  async function syncTribecaAppBadge(forcedCount=null){
    const count = forcedCount === null ? tribecaAppBadgeCount() : Number(forcedCount||0);
    try{
      if(navigator?.setAppBadge && navigator?.clearAppBadge){
        if(count > 0) await navigator.setAppBadge(Math.min(count, 99));
        else await navigator.clearAppBadge();
      }
      navigator.serviceWorker?.controller?.postMessage?.({ type:'TRIBECA_BADGE_COUNT', count:Math.max(0, Math.min(count, 99)) });
    } catch(error){
      console.warn('[Tribeca Aula] No se pudo actualizar el distintivo del icono:', error);
    }
  }
  let tribecaBadgeSyncTimer = null;
  function scheduleTribecaAppBadgeSync(forcedCount=null){
    if(tribecaBadgeSyncTimer) clearTimeout(tribecaBadgeSyncTimer);
    tribecaBadgeSyncTimer = setTimeout(() => {
      tribecaBadgeSyncTimer = null;
      syncTribecaAppBadge(forcedCount).catch(()=>{});
    }, 650);
  }
  async function tribecaDispatchPushNotification(type, options={}){
    if(!State.profile) return null;
    const prefKey = Object.prototype.hasOwnProperty.call(options,'preferenceKey') ? options.preferenceKey : ({message:'messages', announcement:'announcements', calendar:'calendar', material:'materials'}[type] || 'messages');
    const section = options.section || tribecaNotificationSection(type);
    const url = options.url || tribecaHistoryUrl(section, options.opts || {});
    const body = {
      action:'dispatch',
      type,
      preferenceKey: prefKey,
      title: options.title || 'Tribeca Aula',
      body: options.body || '',
      url,
      icon: 'assets/tribeca-pwa-icon-192.png',
      badge: 'assets/tribeca-pwa-icon-192.png',
      badgeCount: Math.max(1, tribecaAppBadgeCount() + 1),
      targetRole: options.targetRole || null,
      recipientIds: options.recipientIds || options.targetUserIds || [],
      targetScope: options.targetScope || options.scope || 'all',
      center: options.center || null,
      stage: options.stage || null,
      course: options.course || null,
      classId: options.classId || null,
      classIds: options.classIds || options.targetClassIds || [],
      targetClassIds: options.targetClassIds || options.classIds || [],
      materialId: options.materialId || null,
      announcementId: options.announcementId || null,
      actorName: displayName(State.profile),
      actorId: State.profile.id,
      includeActor: !!options.includeActor
    };
    try { return await tribecaPushInvoke(body); }
    catch(error){ console.warn('[Tribeca Aula] No se pudo enviar la notificación push:', error); return null; }
  }
  window.TribecaEnablePushNotifications = enableTribecaPushNotifications;
  window.TribecaDisablePushNotifications = disableTribecaPushNotifications;
  window.TribecaSendPushTestToCurrentUser = tribecaSendPushTestToCurrentUser;
  window.TribecaSyncAppBadge = syncTribecaAppBadge;
  window.TribecaResetPushFeedback = tribecaResetPushFeedback;

  function bindTribecaServiceWorkerMessages(){
    if(!navigator.serviceWorker || window.__tribecaPushMessageBound) return;
    window.__tribecaPushMessageBound = true;
    navigator.serviceWorker.addEventListener('message', ev=>{
      const data = ev.data || {};
      if(data.type === 'TRIBECA_NOTIFICATION_OPEN' && data.url){
        try { location.href = data.url; } catch(_e) { location.href = './'; }
        return;
      }
      if(data.type === 'TRIBECA_PUSH_RECEIVED'){
        loadData(true).then(()=>{ updateBadges(); if(State.activeInlineSection) rerender(); }).catch(()=>{});
      }
    });
  }

  const TRIBECA_PWA_DISMISSED_KEY = 'tribeca-pwa-install-dismissed-v150';
  let tribecaDeferredInstallPrompt = null;
  function isTribecaStandalone(){
    return window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone === true;
  }
  function pwaText(key){
    const dict={
      install:{es:'Instalar Tribeca Aula',gl:'Instalar Tribeca Aula',en:'Install Tribeca Aula',fr:'Installer Tribeca Aula',pl:'Zainstaluj Tribeca Aula',de:'Tribeca Aula installieren',pt:'Instalar Tribeca Aula'},
      installShort:{es:'Instalar app',gl:'Instalar app',en:'Install app',fr:'Installer l’app',pl:'Zainstaluj aplikację',de:'App installieren',pt:'Instalar app'},
      ready:{es:'Abre Tribeca Aula como una app, con icono propio y sin la barra normal del navegador.',gl:'Abre Tribeca Aula como unha app, con icona propia e sen a barra normal do navegador.',en:'Open Tribeca Aula as an app, with its own icon and without the normal browser bar.',fr:'Ouvre Tribeca Aula comme une app, avec sa propre icône et sans la barre normale du navigateur.',pl:'Otwórz Tribeca Aula jak aplikację, z własną ikoną i bez zwykłego paska przeglądarki.',de:'Öffne Tribeca Aula als App, mit eigenem Symbol und ohne normale Browserleiste.',pt:'Abre a Tribeca Aula como uma app, com ícone próprio e sem a barra normal do navegador.'},
      later:{es:'Ahora no',gl:'Agora non',en:'Not now',fr:'Pas maintenant',pl:'Nie teraz',de:'Jetzt nicht',pt:'Agora não'},
      installed:{es:'Tribeca Aula ya está instalada en este dispositivo.',gl:'Tribeca Aula xa está instalada neste dispositivo.',en:'Tribeca Aula is already installed on this device.',fr:'Tribeca Aula est déjà installée sur cet appareil.',pl:'Tribeca Aula jest już zainstalowana na tym urządzeniu.',de:'Tribeca Aula ist auf diesem Gerät bereits installiert.',pt:'Tribeca Aula já está instalada neste dispositivo.'},
      unavailableTitle:{es:'Instalación manual',gl:'Instalación manual',en:'Manual installation',fr:'Installation manuelle',pl:'Instalacja ręczna',de:'Manuelle Installation',pt:'Instalação manual'},
      unavailableBody:{es:'Si no aparece el cuadro automático, abre el menú del navegador y elige “Instalar aplicación” o “Añadir a pantalla de inicio”. En iPhone o iPad, pulsa Compartir y después “Añadir a pantalla de inicio”.',gl:'Se non aparece o cadro automático, abre o menú do navegador e escolle “Instalar aplicación” ou “Engadir á pantalla de inicio”. En iPhone ou iPad, pulsa Compartir e despois “Engadir á pantalla de inicio”.',en:'If the automatic prompt does not appear, open the browser menu and choose “Install app” or “Add to Home screen”. On iPhone or iPad, tap Share and then “Add to Home Screen”.',fr:'Si la fenêtre automatique n’apparaît pas, ouvre le menu du navigateur et choisis “Installer l’application” ou “Ajouter à l’écran d’accueil”. Sur iPhone ou iPad, touche Partager puis “Ajouter à l’écran d’accueil”.',pl:'Jeśli automatyczny komunikat się nie pojawi, otwórz menu przeglądarki i wybierz „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”. Na iPhonie lub iPadzie stuknij Udostępnij, a potem „Dodaj do ekranu początkowego”.',de:'Wenn der automatische Dialog nicht erscheint, öffne das Browsermenü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“. Auf iPhone oder iPad: Teilen antippen und dann „Zum Home-Bildschirm“.',pt:'Se a janela automática não aparecer, abre o menu do navegador e escolhe “Instalar aplicação” ou “Adicionar ao ecrã inicial”. No iPhone ou iPad, toca em Partilhar e depois em “Adicionar ao ecrã principal”.'},
      close:{es:'Cerrar',gl:'Pechar',en:'Close',fr:'Fermer',pl:'Zamknij',de:'Schließen',pt:'Fechar'},
      offlineReady:{es:'Tribeca Aula queda preparada para abrir más rápido en este dispositivo.',gl:'Tribeca Aula queda preparada para abrir máis rápido neste dispositivo.',en:'Tribeca Aula is ready to open faster on this device.',fr:'Tribeca Aula est prête à s’ouvrir plus vite sur cet appareil.',pl:'Tribeca Aula jest gotowa do szybszego otwierania na tym urządzeniu.',de:'Tribeca Aula kann auf diesem Gerät nun schneller geöffnet werden.',pt:'Tribeca Aula está pronta para abrir mais depressa neste dispositivo.'}
    };
    let code='gl';
    try{ code = typeof currentLangCode === 'function' ? currentLangCode() : (localStorage.getItem('tribeca-language') || 'gl'); }catch(_e){ code='gl'; }
    return dict[key]?.[code] || dict[key]?.gl || dict[key]?.es || key;
  }
  let tribecaPwaRegistrationPromise = null;
  function registerTribecaPwa(options={}){
    if(!('serviceWorker' in navigator)) return Promise.resolve(null);
    const run = () => {
      if(!tribecaPwaRegistrationPromise){
        tribecaPwaRegistrationPromise = navigator.serviceWorker.register('./service-worker.js', { scope:'./' })
          .then(reg=>{ try{ reg.update?.(); }catch(_e){} return reg; })
          .catch(err=>{ console.warn('[Tribeca Aula] Service worker no registrado:', err); return null; });
      }
      return tribecaPwaRegistrationPromise;
    };
    if(options.immediate) return run();
    if(window.__tribecaPwaRegistrationScheduled) return tribecaPwaRegistrationPromise || Promise.resolve(null);
    window.__tribecaPwaRegistrationScheduled = true;
    deferTribecaBackgroundTask(run, 1100);
    return Promise.resolve(null);
  }
  function ensurePwaInstallCta(){
    if(!document.body || document.getElementById('tribecaPwaInstallCta')) return;
    const node=document.createElement('aside');
    node.id='tribecaPwaInstallCta';
    node.className='tribeca-pwa-install-cta';
    node.setAttribute('aria-live','polite');
    node.hidden=true;
    node.innerHTML=`<div><strong>${safe(pwaText('install'))}</strong><span>${safe(pwaText('ready'))}</span></div><button type="button" class="primary-btn" data-pwa-install>${safe(pwaText('installShort'))}</button><button type="button" class="ghost-btn" data-pwa-install-dismiss aria-label="${safe(pwaText('later'))}">×</button>`;
    document.body.appendChild(node);
  }
  function updatePwaInstallCta(){
    if(!document.body) return;
    ensurePwaInstallCta();
    const node=document.getElementById('tribecaPwaInstallCta');
    if(!node) return;
    node.hidden = isTribecaStandalone() || !tribecaDeferredInstallPrompt || localStorage.getItem(TRIBECA_PWA_DISMISSED_KEY)==='1';
    if(!node.hidden){
      const strong=node.querySelector('strong'); if(strong) strong.textContent=pwaText('install');
      const span=node.querySelector('span'); if(span) span.textContent=pwaText('ready');
      const btn=node.querySelector('[data-pwa-install]'); if(btn) btn.textContent=pwaText('installShort');
    }
  }
  async function handleTribecaPwaInstall(){
    if(isTribecaStandalone()) return toast(pwaText('installed'));
    if(tribecaDeferredInstallPrompt){
      const promptEvent = tribecaDeferredInstallPrompt;
      tribecaDeferredInstallPrompt = null;
      updatePwaInstallCta();
      try{
        await promptEvent.prompt();
        await promptEvent.userChoice;
      }catch(err){
        console.warn('[Tribeca Aula] Instalación PWA cancelada o no disponible:', err);
      }
      return;
    }
    showTribecaPwaInstructions();
  }
  function showTribecaPwaInstructions(){
    document.getElementById('tribecaPwaHelp')?.remove();
    const node=document.createElement('section');
    node.id='tribecaPwaHelp';
    node.className='tribeca-pwa-help';
    node.setAttribute('role','dialog');
    node.setAttribute('aria-modal','true');
    node.innerHTML=`<div class="tribeca-pwa-help-card"><button type="button" class="tribeca-pwa-help-close" data-pwa-help-close aria-label="${safe(pwaText('close'))}">×</button><p class="eyebrow">Tribeca Aula</p><h2>${safe(pwaText('unavailableTitle'))}</h2><p>${safe(pwaText('unavailableBody'))}</p><button type="button" class="primary-btn" data-pwa-help-close>${safe(pwaText('close'))}</button></div>`;
    document.body.appendChild(node);
  }
  window.addEventListener('beforeinstallprompt', ev=>{
    ev.preventDefault();
    tribecaDeferredInstallPrompt = ev;
    localStorage.removeItem(TRIBECA_PWA_DISMISSED_KEY);
    updatePwaInstallCta();
  });
  window.addEventListener('appinstalled', ()=>{
    tribecaDeferredInstallPrompt = null;
    localStorage.setItem(TRIBECA_PWA_DISMISSED_KEY, '1');
    updatePwaInstallCta();
    toast(pwaText('offlineReady'));
  });

  const A11Y_STORAGE_KEY = 'tribeca-accessibility-settings-v115';
  const A11Y_DEFAULTS = {
    background:'#f8f7f2',
    text:'#172018',
    fontFace:'reset',
    kerning:false,
    fontSize:1,
    hideImages:false,
    letterSpacing:0,
    lineHeight:1.2,
    linkHighlight:false,
    language:'',
    readingMode:'default'
  };
  function a11yDefaults(){ return {...A11Y_DEFAULTS}; }
  function loadAccessibilitySettings(){
    try {
      return {...a11yDefaults(), ...(JSON.parse(localStorage.getItem(A11Y_STORAGE_KEY) || '{}') || {})};
    } catch(_e) {
      return a11yDefaults();
    }
  }
  function saveAccessibilitySettings(settings={}){
    const next={...a11yDefaults(), ...settings};
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(next));
    return next;
  }
  function a11yDict(){
    return {
      es:{accessibility:'Accesibilidad', open:'Abrir opciones de accesibilidad', close:'Cerrar', background:'Color de fondo', text:'Color del texto', fontFace:'Tipo de letra', reset:'Restablecer', serif:'Serif', sans:'Sans Serif', dyslexic:'Disléxica', kerning:'Interletraje', turnOn:'Activar', turnOff:'Desactivar', fontSize:'Tamaño de letra', imageVisibility:'Visibilidad de imágenes', hideImages:'Ocultar imágenes', showImages:'Mostrar imágenes', letterSpacing:'Espaciado entre letras', lineHeight:'Altura de línea', linkHighlight:'Resaltar enlaces', disabled:'Desactivado', enabled:'Activado', language:'Idioma', readingMode:'Tipo de lectura', defaultMode:'Por defecto', comfortableMode:'Lectura cómoda', focusMode:'Lectura enfocada'},
      gl:{accessibility:'Accesibilidade', open:'Abrir opcións de accesibilidade', close:'Pechar', background:'Cor de fondo', text:'Cor do texto', fontFace:'Tipo de letra', reset:'Restablecer', serif:'Serif', sans:'Sans Serif', dyslexic:'Disléxica', kerning:'Interletraxe', turnOn:'Activar', turnOff:'Desactivar', fontSize:'Tamaño de letra', imageVisibility:'Visibilidade das imaxes', hideImages:'Ocultar imaxes', showImages:'Mostrar imaxes', letterSpacing:'Espazado entre letras', lineHeight:'Altura de liña', linkHighlight:'Resaltar ligazóns', disabled:'Desactivado', enabled:'Activado', language:'Idioma', readingMode:'Tipo de lectura', defaultMode:'Por defecto', comfortableMode:'Lectura cómoda', focusMode:'Lectura enfocada'},
      en:{accessibility:'Accessibility', open:'Open accessibility options', close:'Close', background:'Background Colour', text:'Text Colour', fontFace:'Font Face', reset:'Reset', serif:'Serif', sans:'Sans Serif', dyslexic:'Dyslexic', kerning:'Font Kerning', turnOn:'Turn on', turnOff:'Turn off', fontSize:'Font Size', imageVisibility:'Image Visibility', hideImages:'Hide Images', showImages:'Show Images', letterSpacing:'Letter Spacing', lineHeight:'Line Height', linkHighlight:'Link Highlight', disabled:'Disabled', enabled:'Enabled', language:'Language', readingMode:'Reading mode', defaultMode:'Default', comfortableMode:'Comfortable reading', focusMode:'Focused reading'},
      fr:{accessibility:'Accessibilité', open:'Ouvrir les options d’accessibilité', close:'Fermer', background:'Couleur de fond', text:'Couleur du texte', fontFace:'Police', reset:'Réinitialiser', serif:'Serif', sans:'Sans Serif', dyslexic:'Dyslexique', kerning:'Crénage', turnOn:'Activer', turnOff:'Désactiver', fontSize:'Taille du texte', imageVisibility:'Visibilité des images', hideImages:'Masquer les images', showImages:'Afficher les images', letterSpacing:'Espacement des lettres', lineHeight:'Hauteur de ligne', linkHighlight:'Surbrillance des liens', disabled:'Désactivé', enabled:'Activé', language:'Langue', readingMode:'Mode de lecture', defaultMode:'Par défaut', comfortableMode:'Lecture confortable', focusMode:'Lecture focalisée'},
      pl:{accessibility:'Dostępność', open:'Otwórz opcje dostępności', close:'Zamknij', background:'Kolor tła', text:'Kolor tekstu', fontFace:'Krój pisma', reset:'Reset', serif:'Serif', sans:'Sans Serif', dyslexic:'Dyslektyczna', kerning:'Kerning czcionki', turnOn:'Włącz', turnOff:'Wyłącz', fontSize:'Rozmiar tekstu', imageVisibility:'Widoczność obrazów', hideImages:'Ukryj obrazy', showImages:'Pokaż obrazy', letterSpacing:'Odstępy między literami', lineHeight:'Wysokość linii', linkHighlight:'Podświetlanie linków', disabled:'Wyłączone', enabled:'Włączone', language:'Język', readingMode:'Tryb czytania', defaultMode:'Domyślne', comfortableMode:'Wygodne czytanie', focusMode:'Czytanie skupione'},
      de:{accessibility:'Barrierefreiheit', open:'Optionen für Barrierefreiheit öffnen', close:'Schließen', background:'Hintergrundfarbe', text:'Textfarbe', fontFace:'Schriftart', reset:'Zurücksetzen', serif:'Serif', sans:'Sans Serif', dyslexic:'Dyslexic', kerning:'Schrift-Kerning', turnOn:'Einschalten', turnOff:'Ausschalten', fontSize:'Schriftgröße', imageVisibility:'Bildsichtbarkeit', hideImages:'Bilder ausblenden', showImages:'Bilder anzeigen', letterSpacing:'Buchstabenabstand', lineHeight:'Zeilenhöhe', linkHighlight:'Links hervorheben', disabled:'Deaktiviert', enabled:'Aktiviert', language:'Sprache', readingMode:'Lesemodus', defaultMode:'Standard', comfortableMode:'Komfortables Lesen', focusMode:'Fokussiertes Lesen'},
      pt:{accessibility:'Acessibilidade', open:'Abrir opções de acessibilidade', close:'Fechar', background:'Cor de fundo', text:'Cor do texto', fontFace:'Tipo de letra', reset:'Repor', serif:'Serif', sans:'Sans Serif', dyslexic:'Disléxica', kerning:'Kerning da fonte', turnOn:'Ativar', turnOff:'Desativar', fontSize:'Tamanho da letra', imageVisibility:'Visibilidade das imagens', hideImages:'Ocultar imagens', showImages:'Mostrar imagens', letterSpacing:'Espaçamento entre letras', lineHeight:'Altura da linha', linkHighlight:'Realce de links', disabled:'Desativado', enabled:'Ativado', language:'Idioma', readingMode:'Tipo de leitura', defaultMode:'Predefinido', comfortableMode:'Leitura confortável', focusMode:'Leitura focada'}
    };
  }
  function a11yText(key){
    const code = (typeof currentLangCode === 'function' ? currentLangCode() : (localStorage.getItem('tribeca-language') || 'gl'));
    const dict=a11yDict();
    return (dict[code] && dict[code][key]) || dict.gl[key] || dict.es[key] || key;
  }
  function clampA11y(value, min, max, fallback){
    const n=Number(value);
    if(!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }
  function applyAccessibilitySettings(){
    const s=loadAccessibilitySettings();
    const root=document.documentElement;
    document.body.classList.toggle('a11y-font-serif', s.fontFace==='serif');
    document.body.classList.toggle('a11y-font-sans', s.fontFace==='sans');
    document.body.classList.toggle('a11y-font-dyslexic', s.fontFace==='dyslexic');
    document.body.classList.toggle('font-opendyslexic', s.fontFace==='dyslexic');
    document.body.classList.toggle('a11y-kerning', !!s.kerning);
    document.body.classList.toggle('a11y-hide-images', !!s.hideImages);
    document.body.classList.toggle('a11y-link-highlight', !!s.linkHighlight);
    document.body.classList.toggle('a11y-reading-comfortable', s.readingMode==='comfortable');
    document.body.classList.toggle('a11y-reading-focus', s.readingMode==='focus');
    document.body.classList.toggle('a11y-custom-bg', s.background && s.background!==A11Y_DEFAULTS.background);
    document.body.classList.toggle('a11y-custom-text', s.text && s.text!==A11Y_DEFAULTS.text);
    root.style.setProperty('--a11y-bg', s.background || A11Y_DEFAULTS.background);
    root.style.setProperty('--a11y-text', s.text || A11Y_DEFAULTS.text);
    root.style.setProperty('--a11y-font-scale', String(clampA11y(s.fontSize, .75, 1.8, 1)));
    root.style.setProperty('--a11y-letter-spacing', `${clampA11y(s.letterSpacing, 0, .18, 0).toFixed(3)}em`);
    root.style.setProperty('--a11y-line-height', String(clampA11y(s.lineHeight, 1, 2.2, 1.2)));
  }
  function accessibilityWidgetMarkup(){
    const s=loadAccessibilitySettings();
    const activeFont=s.fontFace||'reset';
    const button=(value,label)=>`<button type="button" class="${activeFont===value?'is-active':''}" data-a11y-font="${value}">${safe(label)}</button>`;
    return `<button type="button" class="tribeca-a11y-button" data-a11y-toggle aria-label="${safe(a11yText('open'))}" title="${safe(a11yText('accessibility'))}">♿</button>
      <section class="tribeca-a11y-panel" data-a11y-panel hidden aria-label="${safe(a11yText('accessibility'))}">
        <header><strong>♿ ${safe(a11yText('accessibility'))}</strong><button type="button" data-a11y-close aria-label="${safe(a11yText('close'))}">×</button></header>
        <div class="tribeca-a11y-grid">
          <article><h3>⌁ ${safe(a11yText('background'))}</h3><div class="a11y-control-row"><input type="color" value="${safe(s.background||A11Y_DEFAULTS.background)}" data-a11y-field="background"><button type="button" data-a11y-reset="background">${safe(a11yText('reset'))}</button></div></article>
          <article><h3>🌐 ${safe(a11yText('language') || 'Idioma')}</h3><select data-a11y-language>${Object.entries(LANG_META).map(([code,meta])=>`<option value="${safe(code)}" ${(currentLangCode()===code)?'selected':''}>${safe(meta.label)}</option>`).join('')}</select></article>
          <article><h3>A ${safe(a11yText('fontFace'))}</h3><div class="a11y-button-stack">${button('reset',a11yText('reset'))}${button('serif',a11yText('serif'))}${button('sans',a11yText('sans'))}${button('dyslexic',a11yText('dyslexic'))}</div></article>
          <article><h3>👁 ${safe(a11yText('readingMode') || 'Tipo de lectura')}</h3><select data-a11y-reading-mode><option value="default" ${(s.readingMode||'default')==='default'?'selected':''}>${safe(a11yText('defaultMode') || 'Por defecto')}</option><option value="comfortable" ${s.readingMode==='comfortable'?'selected':''}>${safe(a11yText('comfortableMode') || 'Lectura cómoda')}</option><option value="focus" ${s.readingMode==='focus'?'selected':''}>${safe(a11yText('focusMode') || 'Lectura enfocada')}</option></select></article>
          <article><h3>V/A ${safe(a11yText('kerning'))}</h3><button type="button" data-a11y-toggle-setting="kerning">${safe(s.kerning?a11yText('turnOff'):a11yText('turnOn'))}</button></article>
          <article><h3>Aa ${safe(a11yText('fontSize'))} / Zoom</h3><div class="a11y-slider-row"><button type="button" data-a11y-step="fontSize" data-step="-0.1">−</button><input type="range" min=".75" max="1.8" step=".05" value="${safe(s.fontSize||1)}" data-a11y-range="fontSize"><output>${safe(Number(s.fontSize||1).toFixed(2).replace(/\.00$/,''))}</output><button type="button" data-a11y-step="fontSize" data-step="0.1">+</button></div><button type="button" data-a11y-reset="fontSize">${safe(a11yText('reset'))}</button></article>
          <article><h3>▧ ${safe(a11yText('imageVisibility'))}</h3><button type="button" data-a11y-toggle-setting="hideImages">${safe(s.hideImages?a11yText('showImages'):a11yText('hideImages'))}</button></article>
          <article><h3>↔ ${safe(a11yText('letterSpacing'))}</h3><div class="a11y-slider-row"><button type="button" data-a11y-step="letterSpacing" data-step="-0.01">−</button><input type="range" min="0" max=".18" step=".01" value="${safe(s.letterSpacing||0)}" data-a11y-range="letterSpacing"><output>${safe(Number(s.letterSpacing||0).toFixed(2))}</output><button type="button" data-a11y-step="letterSpacing" data-step="0.01">+</button></div><button type="button" data-a11y-reset="letterSpacing">${safe(a11yText('reset'))}</button></article>
          <article><h3>↕ ${safe(a11yText('lineHeight'))}</h3><div class="a11y-slider-row"><button type="button" data-a11y-step="lineHeight" data-step="-0.1">−</button><input type="range" min="1" max="2.2" step=".05" value="${safe(s.lineHeight||1.2)}" data-a11y-range="lineHeight"><output>${safe(Number(s.lineHeight||1.2).toFixed(2).replace(/\.00$/,''))}</output><button type="button" data-a11y-step="lineHeight" data-step="0.1">+</button></div><button type="button" data-a11y-reset="lineHeight">${safe(a11yText('reset'))}</button></article>
          <article><h3>🔗 ${safe(a11yText('linkHighlight'))}</h3><button type="button" data-a11y-toggle-setting="linkHighlight">${safe(s.linkHighlight?a11yText('enabled'):a11yText('disabled'))}</button></article>
          <article><h3>A ${safe(a11yText('text'))}</h3><div class="a11y-control-row"><input type="color" value="${safe(s.text||A11Y_DEFAULTS.text)}" data-a11y-field="text"><button type="button" data-a11y-reset="text">${safe(a11yText('reset'))}</button></div></article>
        </div>
      </section>`;
  }
  function updateAccessibilityWidgetText(){
    const root=document.getElementById('tribecaAccessibilityWidget');
    if(!root) return;
    const panel=root.querySelector('[data-a11y-panel]');
    const wasOpen=panel && !panel.hidden;
    root.innerHTML=accessibilityWidgetMarkup();
    const next=root.querySelector('[data-a11y-panel]');
    if(wasOpen && next) next.hidden=false;
  }
  function ensureAccessibilityWidget(){
    if(!document.body) return;
    if(studentFocusModeEnabled(State.profile)) { document.getElementById('tribecaAccessibilityWidget')?.remove?.(); return; }
    let root=document.getElementById('tribecaAccessibilityWidget');
    if(!root){
      root=document.createElement('div');
      root.id='tribecaAccessibilityWidget';
      root.className='tribeca-a11y-widget';
      document.body.appendChild(root);
    }
    if(!root.innerHTML.trim()) root.innerHTML=accessibilityWidgetMarkup();
    applyAccessibilitySettings();
    if(document.body.dataset.tribecaA11yBound==='1') return;
    document.body.dataset.tribecaA11yBound='1';
    document.addEventListener('click', ev=>{
      const toggle=ev.target.closest?.('[data-a11y-toggle]');
      if(toggle){ ev.preventDefault(); ev.stopPropagation(); const panel=document.querySelector('[data-a11y-panel]'); if(panel) panel.hidden=!panel.hidden; return; }
      const close=ev.target.closest?.('[data-a11y-close]');
      if(close){ ev.preventDefault(); ev.stopPropagation(); const panel=document.querySelector('[data-a11y-panel]'); if(panel) panel.hidden=true; return; }
      const font=ev.target.closest?.('[data-a11y-font]');
      if(font){ ev.preventDefault(); const s=saveAccessibilitySettings({...loadAccessibilitySettings(), fontFace:font.dataset.a11yFont||'reset'}); applyAccessibilitySettings(s); updateAccessibilityWidgetText(); return; }
      const reset=ev.target.closest?.('[data-a11y-reset]');
      if(reset){ ev.preventDefault(); const key=reset.dataset.a11yReset; const s=loadAccessibilitySettings(); if(key==='fontSize') s.fontSize=A11Y_DEFAULTS.fontSize; else if(key==='letterSpacing') s.letterSpacing=A11Y_DEFAULTS.letterSpacing; else if(key==='lineHeight') s.lineHeight=A11Y_DEFAULTS.lineHeight; else if(key==='background') s.background=A11Y_DEFAULTS.background; else if(key==='text') s.text=A11Y_DEFAULTS.text; saveAccessibilitySettings(s); applyAccessibilitySettings(); updateAccessibilityWidgetText(); return; }
      const toggleSetting=ev.target.closest?.('[data-a11y-toggle-setting]');
      if(toggleSetting){ ev.preventDefault(); const key=toggleSetting.dataset.a11yToggleSetting; const s=loadAccessibilitySettings(); s[key]=!s[key]; saveAccessibilitySettings(s); applyAccessibilitySettings(); updateAccessibilityWidgetText(); return; }
      const step=ev.target.closest?.('[data-a11y-step]');
      if(step){ ev.preventDefault(); const key=step.dataset.a11yStep; const inc=Number(step.dataset.step||0); const s=loadAccessibilitySettings(); const ranges={fontSize:[.75,1.8,1],letterSpacing:[0,.18,0],lineHeight:[1,2.2,1.2]}; const r=ranges[key]||[0,1,0]; s[key]=Number(clampA11y((Number(s[key]??r[2])+inc), r[0], r[1], r[2]).toFixed(3)); saveAccessibilitySettings(s); applyAccessibilitySettings(); updateAccessibilityWidgetText(); return; }
    }, true);
    document.addEventListener('input', ev=>{
      const field=ev.target.closest?.('[data-a11y-field]');
      const range=ev.target.closest?.('[data-a11y-range]');
      if(!field && !range) return;
      const s=loadAccessibilitySettings();
      if(field) s[field.dataset.a11yField]=field.value;
      if(range) s[range.dataset.a11yRange]=Number(range.value);
      saveAccessibilitySettings(s);
      applyAccessibilitySettings();
      const out=range?.closest('.a11y-slider-row')?.querySelector('output');
      if(out) out.value=String(Number(range.value).toFixed(2).replace(/\.00$/,''));
    }, true);
    document.addEventListener('change', ev=>{
      if(ev.target?.dataset?.a11yLanguage!==undefined){ const value=ev.target.value || (roleTeacher()?'es':'gl'); localStorage.setItem('tribeca-language-user-set','1'); localStorage.setItem('tribeca-language', value); const topSel=document.querySelector('#languageSelect'); if(topSel) topSel.value=value; ensureLanguageDefault(); applyTranslations(document); updateAccessibilityWidgetText(); return; }
      if(ev.target?.dataset?.a11yReadingMode!==undefined){ const s=saveAccessibilitySettings({...loadAccessibilitySettings(), readingMode:ev.target.value || 'default'}); applyAccessibilitySettings(s); updateAccessibilityWidgetText(); return; }
    }, true);
  }
  window.TribecaApplyAccessibilitySettings = applyAccessibilitySettings;
  window.TribecaEnsureAccessibilityWidget = ensureAccessibilityWidget;

  const icon100 = ['😀', '😃', '😄', '😁', '😊', '🙂', '😉', '😎', '🤓', '🥳', '😇', '😋', '😍', '😌', '🤔', '🤠', '😺', '😸', '😻', '🙌', '💡', '📚', '🧠', '⭐', '🌟', '✨', '🔥', '🌈', '☀️', '🌙', '⚡', '🎯', '🏆', '🥇', '🎓', '🖊️', '✏️', '📝', '📐', '🔬', '🧪', '🧬', '🌍', '🗺️', '🏛️', '🎨', '🎭', '🎵', '🎧', '🎮', '🧩', '♟️', '📣', '🔔', '🧭', '🛡️', '💎', '🔖', '📖', '📌', '📎', '🗂️', '🧮', '🦉', '🐝', '🦋', '🐢', '🐬', '🦊', '🐱', '🐶', '🐼', '🐧', '🐸', '🦁', '🐯', '🐴', '🐳', '🦄', '🐵', '🐻', '🐨', '🐰', '🐹', '🐭', '🐮', '🐷', '🐙', '🦀', '🐠', '🐟', '🐞', '🐌', '🐥', '🦆', '🐔', '🦅', '🍀', '🌻', '🌸', '🌿', '🍄', '🍎', '🍓', '🍉', '🍍', '🍕', '🥐', '🍔', '🍟', '🌮', '🍪', '🍫', '🍯', '🥕', '🌽', '🍒', '🍋', '🍊', '🍌', '🍇', '⚽', '🏀', '🏐', '🎾', '🏓', '🏸', '🥊', '🥋', '🎿', '⛸️', '🚀', '✈️', '🚗', '🚂', '🚌', '🚢', '🏖️', '🏔️', '🏰', '🌊', '⛰️', '🌅', '🌌', '🏡', '🌉', '🏕️', '⛺', '🎁', '🧸'];  const centers = ['CEIP Praia de Quenxe','IES Fernando Blanco','IES Agra de Raíces','CPR Plurilingüe Manuela Rial Mouzo','CPR Ntra. Sra. del Carmen','CEIP Plurilingüe de Ponte do Porto','CEIP O Areal','CEIP de Camelle','IES Pedra da Aguia','CEIP do Pindo','CEIP Plurilingüe de Carnota','IES Lamas de Castelo','EEI da Pereiriña','CEIP de Brens','CEIP Plurilingüe Vila de Cee','CEIP Plurilingüe Santa Eulalia de Dumbría','CEIP Mar de Fóra','CEIP Areouta','IES Fin do Camiño','Tribeca Academia','Centro pendiente de asignar'];
  const stages = ['Infantil','Primaria','ESO','Bachillerato','FP','Adultos','Profesorado','Otros'];
  const courses = ['1.º Primaria','2.º Primaria','3.º Primaria','4.º Primaria','5.º Primaria','6.º Primaria','1.º ESO','2.º ESO','3.º ESO','3.º ESO PDC','4.º ESO','1.º Bachillerato','1.º Bachillerato Sociales','1.º Bachillerato Humanidades','2.º Bachillerato','Profesora','Otros'];
  const neeTypes = ['Discapacidad intelectual','Discapacidad auditiva','Discapacidad visual','Discapacidad motora o física','Pluridiscapacidad','Trastorno grave de conducta','Trastorno grave de la comunicación y del lenguaje','TEA / trastorno generalizado del desarrollo con necesidad de apoyos específicos','Otra NEE acreditada'];
  const neaeTypes = ['Necesidades educativas especiales','Retraso madurativo','Trastornos del desarrollo del lenguaje y la comunicación','Trastornos de atención o de aprendizaje','TDAH / TDA','Dislexia','Disortografía','Discalculia','Dificultades específicas de aprendizaje','Desconocimiento grave de la lengua de aprendizaje','Vulnerabilidad socioeducativa','Altas capacidades intelectuales','Incorporación tardía al sistema educativo','Condiciones personales o de historia escolar','Desfase curricular significativo','Necesidad de apoyo educativo temporal','Otra NEAE acreditada'];
  const healthConditions = ['Diabetes','Asma','Epilepsia','Celiaquía','Alergias','Migrañas','Enfermedad inflamatoria intestinal','Enfermedad aguda o transitoria','Recuperación posquirúrgica breve','Problema sensorial corregido','Dolor, fatiga o sueño insuficiente sin necesidad educativa acreditada','Dificultad emocional leve o reactiva','Factor familiar u organizativo no acreditado como vulnerabilidad','Otra condición que conviene conocer'];
  const badges = [
    ['sixseven','😎','67 sixseven'],['effort','💪','Esfuerzo sostenido'],['autonomy','🧭','Autonomía'],['kindness','🤝','Buen trato'],['perseverance','🌱','Constancia'],['focus','🎯','Concentración'],['careful_reading','📚','Lectura cuidadosa'],['improvement','📈','Mejora notable'],['responsibility','✅','Responsabilidad'],['curiosity','🔎','Curiosidad'],['creativity','🎨','Creatividad'],['teamwork','👥','Trabajo cooperativo'],['punctuality','⏰','Puntualidad'],['resilience','🛡️','Resiliencia'],['math_power','π','Razonamiento matemático'],['language_care','✍️','Cuidado lingüístico'],['science_mind','🔬','Mentalidad científica'],['history_eye','🏛️','Mirada histórica'],['english_star','GB','English star'],['galician_voice','🌿','Voz galega'],['exam_ready','📝','Preparación de examen'],['challenge','🧩','Desafío superado'],['golden_bulb','💡','Idea brillante'],['study_week','📆','Semana de estudio completa'],['oral_expression','🎙️','Expresión oral'],['writing_care','🖋️','Escritura cuidada'],['homework_done','📌','Tareas al día'],['good_questions','❓','Buenas preguntas'],['first_eval_passed','1️⃣','Primera evaluación superada'],['second_eval_passed','2️⃣','Segunda evaluación superada'],['course_passed','🎓','Curso superado'],['summer_study','☀️','Estudiando en verano'],['punctual_person','⏱️','Puntual']
  ].map(([code,icon,name]) => ({code,icon,name}));

  const TOOL_ICON = {
    guidance:'orientacion', badges:'badges', difficulties:'dificultades', grades:'calificaciones', subjects:'materias', calendar:'calendario', messages:'mensajes', announcements:'anuncios',
    newPublication:'nueva_publicacion', activityLog:'actividad', teacherAlerts:'alertas', classOverview:'vista_general', assignBadge:'asignar_insignias', passwordRequests:'recuperacion',
    studentProfiles:'perfiles', teacherSubjects:'materias_materiales', payments:'pagos', attendance:'asistencia'
  };
  function toolIcon(key, fallback=''){
    const file = TOOL_ICON[key];
    if(!file) return `<span class="tribeca-tool-icon-fallback">${safe(fallback||'')}</span>`;
    return `<img class="tribeca-tool-icon-img" src="assets/icons/${file}.png" alt="" aria-hidden="true">`;
  }
  const SUBJECT_PALETTE = ['#2f7d68','#b57a2a','#5b6fa9','#c65f4a','#6b5a8f','#4f8c8a','#8a6f2a','#7b5b92','#487aa3','#9a5b45','#59723c','#356f5b','#a86f38','#536f9d'];
  const SUBJECT_COLOR_OVERRIDES = [
    [/lingua\s+castela|lengua\s+castell|castela\s+e\s+literatura|castellana\s+y\s+literatura/, '#c65f4a'],
    [/lingua\s+galeg|lengua\s+galleg|galega\s+e\s+literatura|gallega\s+y\s+literatura/, '#2f7d68'],
    [/matematic|matematicas|matemáticas/, '#b57a2a'],
    [/english|ingles|inglés|anglais|francais|francés|français/, '#6b5a8f'],
    [/biolox|biolog|xeolox|geolog|ciencias\s+da\s+natureza|ciencias\s+de\s+la\s+naturaleza/, '#4f8c8a'],
    [/xeografia|geografia|historia|ciencias\s+sociais|ciencias\s+sociales/, '#8a6f2a'],
    [/fisica|física|quimica|química/, '#487aa3'],
    [/educacion\s+fisica|educación\s+física/, '#59723c'],
    [/plastica|plástica|visual|artistica|artística|musica|música/, '#9a5b45'],
    [/tecnolox|tecnolog|digital/, '#536f9d'],
    [/econom|empresa|emprend/, '#a86f38'],
    [/filosof|latin|latín|griego|cultura\s+clasica|clásica/, '#7b5b92']
  ];
  const SUBJECT_GLYPHS = {
    'Matemáticas':'π','Matemáticas A':'π','Matemáticas B':'π','Matemáticas I':'π','Matemáticas II':'π','Matemáticas Aplicadas a las Ciencias Sociales':'∑','Métodos Estadísticos y Numéricos':'∑',
    'Biología y Geología':'BG','Ciencias de la Naturaleza':'CN','Ciencias Sociales':'CS','Física y Química':'FQ','Física':'F','Química':'Q','Geología y Ciencias Ambientales':'GA','Ciencias Generales':'CG',
    'Lengua Castellana y Literatura':'LC','Lengua Gallega y Literatura':'LG','English':'EN','English I':'EN','English II':'EN','Français':'FR','Français I':'FR','Français II':'FR',
    'Geografía e Historia':'GH','Historia de España':'HE','Historia de la Filosofía':'HF','Historia del Mundo Contemporáneo':'HM','Historia del Arte':'HA','Filosofía':'Φ','Latín':'LA','Griego':'GR','Cultura Clásica':'CC','Oratoria':'OR',
    'Educación Física':'EF','Educación Plástica y Visual':'EP','Educación Plástica, Visual y Audiovisual':'EP','Música':'MU','Música y Danza':'MD','Dibujo Artístico I':'DA','Dibujo Artístico II':'DA','Dibujo Técnico I':'DT','Dibujo Técnico II':'DT','Diseño':'DI','Volumen':'VO',
    'Tecnología y Digitalización':'TD','Tecnología':'TE','Digitalización':'DG','Tecnología e Ingeniería I':'TI','Tecnología e Ingeniería II':'TI','Educación Digital':'ED','Tecnologías de la Información y de la Comunicación I':'TIC','Tecnologías de la Información y de la Comunicación II':'TIC',
    'Economía':'€','Economía y Emprendimiento':'€','Empresa y Diseño de Modelos de Negocio':'€','Formación y Orientación Personal y Profesional':'FO','Psicología':'Ψ','Tutoría':'TU','Orientación académica':'OA','Apoyo personalizado':'AP','Ámbito Científico-Tecnológico':'CT','Ámbito Lingüístico y Social':'LS','Ámbito Práctico':'PR','Higiene Bucodental':'HB','FP Sanitaria':'FP'
  };
  function hashText(str='') { let h=0; for(const ch of String(str)) h=(h*31+ch.charCodeAt(0))>>>0; return h; }
  function normalizeLooseText(value=''){
    return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
  }
  function isStudySkillsSubject(subject=''){
    const s=normalizeLooseText(subject);
    return /tecnicas\s+de\s+estud/.test(s) || /aprender\s+a\s+estudiar/.test(s) || /study\s+skills/.test(s);
  }
  function studySkillsBannerMarkup(){
    return `<div class="study-subject-banner"><span>Plan de estudio guiado</span><strong>Aprender a estudiar paso a paso</strong></div>`;
  }
  function subjectVisual(subject=''){
    if(isStudySkillsSubject(subject)) return { color:'#2f7d68', glyph:'📚' };
    const loose = normalizeLooseText(subject);
    const override = SUBJECT_COLOR_OVERRIDES.find(([rx]) => rx.test(loose));
    const key = Object.keys(SUBJECT_GLYPHS).find(k => String(subject).toLowerCase().includes(k.toLowerCase())) || subject;
    const idx = hashText(subject) % SUBJECT_PALETTE.length;
    return { color: override?.[1] || SUBJECT_PALETTE[idx], glyph: SUBJECT_GLYPHS[key] || String(subject||'?').split(/\s+/).map(w=>w[0]||'').join('').slice(0,3).toUpperCase() };
  }
  const subjectCatalog = {
    'Primaria-1.º Primaria':['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Música y Danza'],
    'Primaria-2.º Primaria':['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Música y Danza'],
    'Primaria-3.º Primaria':['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Música y Danza'],
    'Primaria-4.º Primaria':['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Música y Danza'],
    'Primaria-5.º Primaria':['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Música y Danza'],
    'Primaria-6.º Primaria':['Ciencias de la Naturaleza','Ciencias Sociales','Educación Física','Educación Plástica y Visual','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Música y Danza','Educación en Valores Cívicos y Éticos'],
    'ESO-1.º ESO':['Biología y Geología','Educación Física','Educación Plástica, Visual y Audiovisual','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Français','Tecnología y Digitalización','Geografía e Historia'],
    'ESO-2.º ESO':['Educación Física','Física y Química','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Música','Français','Tecnología y Digitalización','Geografía e Historia'],
    'ESO-3.º ESO':['Biología y Geología','Educación en Valores Cívicos y Éticos','Educación Física','Educación Plástica, Visual y Audiovisual','Física y Química','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas','Música','Geografía e Historia'],
    'ESO-3.º ESO PDC':['Ámbito Científico-Tecnológico','Ámbito Lingüístico y Social','English','Educación Física','Tecnología y Digitalización','Tutoría'],
    'ESO-4.º ESO':['Educación Física','Lengua Castellana y Literatura','English','Lengua Gallega y Literatura','Matemáticas A / Matemáticas B','Geografía e Historia','Biología y Geología','Digitalización','Economía y Emprendimiento','Física y Química','Latín','Tecnología'],
    'Bachillerato-1.º Bachillerato':['Educación Física','Filosofía','Lengua Castellana y Literatura I','English I','Lengua Gallega y Literatura I'],
    'Bachillerato-1.º Bachillerato Sociales':['Educación Física','Filosofía','Lengua Castellana y Literatura I','English I','Lengua Gallega y Literatura I','Matemáticas Aplicadas a las Ciencias Sociales I','Economía','Historia del Mundo Contemporáneo','Literatura Universal'],
    'Bachillerato-1.º Bachillerato Humanidades':['Educación Física','Filosofía','Lengua Castellana y Literatura I','English I','Lengua Gallega y Literatura I','Latín I','Griego I','Historia del Mundo Contemporáneo','Literatura Universal'],
    'Bachillerato-2.º Bachillerato':['Lengua Castellana y Literatura II','English II','Lengua Gallega y Literatura II','Historia de España','Historia de la Filosofía']
  };

  function dynamicCourses(){
    const set = new Set(courses);
    (State.data.subjects||[]).forEach(s => { if(s.course) set.add(s.course); });
    (State.data.students||[]).forEach(s => { if(s.course) set.add(s.course); });
    (State.data.materialRepository||[]).forEach(s => { if(s.course) set.add(s.course); });
    if(State.profile?.course) set.add(State.profile.course);
    return [...set].filter(Boolean).sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));
  }
  function stageCoursePairs(){
    const pairs=[];
    Object.keys(subjectCatalog||{}).forEach(key=>{
      const [stage,...courseParts]=String(key).split('-');
      const course=courseParts.join('-');
      if(stage && course) pairs.push({stage,course});
    });
    (State.data.subjects||[]).forEach(x=>{ if(x?.stage&&x?.course) pairs.push({stage:x.stage,course:x.course}); });
    (State.data.students||[]).forEach(x=>{ if(x?.stage&&x?.course) pairs.push({stage:x.stage,course:x.course}); });
    (State.data.materialRepository||[]).forEach(x=>{ if(x?.stage&&x?.course) pairs.push({stage:x.stage,course:x.course}); });
    if(State.profile?.stage && State.profile?.course) pairs.push({stage:State.profile.stage,course:State.profile.course});
    const seen=new Set();
    return pairs.filter(p=>{ const k=`${p.stage}::${p.course}`; if(seen.has(k)) return false; seen.add(k); return true; });
  }
  function inferredStageForCourse(course=''){
    const c=String(course||'').toLowerCase();
    if(!c) return '';
    if(c.includes('primaria')) return 'Primaria';
    if(c.includes('eso') || c.includes('pdc')) return 'ESO';
    if(c.includes('bachiller')) return 'Bachillerato';
    if(c.includes('fp') || c.includes('ciclo')) return 'FP';
    if(c.includes('infantil')) return 'Infantil';
    if(c.includes('adult')) return 'Adultos';
    if(c.includes('profesora') || c.includes('profesor')) return 'Profesorado';
    const pair=stageCoursePairs().find(p=>p.course===course);
    return pair?.stage || '';
  }
  function coursesForStage(stage=''){
    const all=dynamicCourses();
    if(!stage) return all;
    const pairCourses=stageCoursePairs().filter(p=>p.stage===stage).map(p=>p.course);
    return [...new Set([...pairCourses, ...all.filter(c=>inferredStageForCourse(c)===stage)])].filter(Boolean).sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));
  }
  function stagesForCourse(course=''){
    if(!course) return stages;
    const pairStages=stageCoursePairs().filter(p=>p.course===course).map(p=>p.stage);
    const inferred=inferredStageForCourse(course);
    const values=[...new Set([...(inferred?[inferred]:[]), ...pairStages])].filter(Boolean);
    return values.length ? values : stages;
  }
  function courseOptionsForStage(stage='', selected=''){
    const values=coursesForStage(stage);
    const arr=selected && !values.includes(selected) ? [selected, ...values] : values;
    return options(arr, selected);
  }
  function stageOptionsForCourse(course='', selected=''){
    const values=stagesForCourse(course);
    const arr=selected && !values.includes(selected) ? [selected, ...values] : values;
    return options(arr, selected);
  }
  function subjectListFor(stage,course){
    const overrides = (State.data.subjects||[]).filter(x=>x.stage===stage && x.course===course);
    const hidden = new Set([...overrides.filter(x=>x.active===false).map(x=>x.subject), ...hiddenSubjectSet(stage, course)]);
    const base = (subjectCatalog[`${stage}-${course}`] || []).filter(x=>!hidden.has(x));
    const custom = overrides.filter(x=>x.active!==false && !hidden.has(x.subject)).map(x=>x.subject);
    return [...new Set([...base, ...custom])];
  }
  const officialEvents = [
    ['2025-09-08','Inicio de actividades lectivas 2025/26','school','Inicio general de actividades lectivas en Galicia.'],
    ['2026-06-19','Fin de actividades lectivas 2025/26','school','Finalización general de actividades lectivas en Galicia.'],
    ['2026-09-09','Inicio de actividades lectivas 2026/27','school-proposal','Fecha propuesta de inicio del curso 2026/27.'],
    ['2027-06-21','Fin de actividades lectivas 2026/27','school-proposal','Fecha propuesta de finalización del curso 2026/27.'],
    ['2026-01-01','Año Nuevo','national','Tribeca Academia no abre este día.'],['2026-01-06','Epifanía del Señor, Reyes','national','Tribeca Academia no abre este día.'],['2026-03-19','San José','galicia','Tribeca Academia no abre este día.'],['2026-04-02','Jueves Santo','galicia','Tribeca Academia no abre este día.'],['2026-04-03','Viernes Santo','national','Tribeca Academia no abre este día.'],['2026-05-01','Fiesta del Trabajo','national','Tribeca Academia no abre este día.'],['2026-06-24','San Juan','galicia','Tribeca Academia no abre este día.'],['2026-07-25','Día Nacional de Galicia','galicia','Tribeca Academia no abre este día.'],['2026-08-15','Asunción de la Virgen','national','Tribeca Academia no abre este día.'],['2026-10-12','Fiesta Nacional de España','national','Tribeca Academia no abre este día.'],['2026-12-08','Inmaculada Concepción','national','Tribeca Academia no abre este día.'],['2026-12-25','Natividad del Señor','national','Tribeca Academia no abre este día.'],
    ['2026-06-29','San Pedro, Corcubión','local','Tribeca Academia no abre este día.'],['2026-07-16','Fiesta del Carmen, Corcubión','local','Tribeca Academia no abre este día.'],
    ['2026-04-06','Lunes de Pascua, Cee','local-cee','Festivo local del centro educativo.'],['2026-06-16','San Adrián, Cee','local-cee','Festivo local del centro educativo.'],['2026-09-08','Fiesta local de Fisterra','local-fisterra','Festivo local del centro educativo.'],
    ['2025-10-31','Día de la Enseñanza','school','Día no lectivo.'],['2025-11-03','Día no lectivo','school','Día no lectivo.'],
    ['2025-12-22','Vacaciones de Navidad, inicio','school','Período no lectivo.'],['2026-01-07','Vacaciones de Navidad, fin','school','Período no lectivo.'],
    ['2026-02-16','Entroido/Carnaval, inicio','school','Período no lectivo.'],['2026-02-17','Entroido/Carnaval','school','Período no lectivo.'],['2026-02-18','Entroido/Carnaval, fin','school','Período no lectivo.'],
    ['2026-03-30','Semana Santa, inicio','school','Período no lectivo.'],['2026-03-31','Semana Santa','school','Período no lectivo.'],['2026-04-01','Semana Santa','school','Período no lectivo.'],['2026-04-02','Semana Santa','school','Período no lectivo.'],['2026-04-03','Semana Santa','school','Período no lectivo.'],['2026-04-06','Semana Santa, fin','school','Período no lectivo.'],
    ['2026-06-08','Evaluación final ordinaria 1.º Bachillerato y 1.º FP básica, inicio','school','Fecha relevante del calendario escolar.'],['2026-06-10','Evaluación final extraordinaria 2.º Bachillerato, inicio','school','Fecha relevante del calendario escolar.'],['2026-06-15','Evaluación final 2.º FP básica, media y superior','school','Fecha relevante del calendario escolar.'],['2026-06-16','Evaluación final 2.º FP básica, media y superior','school','Fecha relevante del calendario escolar.'],['2026-06-17','Pruebas extraordinarias 1.º Bachillerato y 1.º FP básica, inicio','school','Fecha relevante del calendario escolar.'],['2026-06-18','Pruebas extraordinarias 1.º Bachillerato y 1.º FP básica','school','Fecha relevante del calendario escolar.'],['2026-06-19','Pruebas extraordinarias 1.º Bachillerato y 1.º FP básica, fin','school','Fecha relevante del calendario escolar.'],
    ['2026-12-21','Vacaciones de Navidad 2026/27, inicio','school-proposal','Período no lectivo propuesto.'],['2027-01-06','Vacaciones de Navidad 2026/27, fin','school-proposal','Período no lectivo propuesto.'],['2027-02-08','Entroido/Carnaval 2026/27, inicio','school-proposal','Período no lectivo propuesto.'],['2027-02-09','Entroido/Carnaval 2026/27','school-proposal','Período no lectivo propuesto.'],['2027-02-10','Entroido/Carnaval 2026/27, fin','school-proposal','Período no lectivo propuesto.'],['2027-03-22','Semana Santa 2026/27, inicio','school-proposal','Período no lectivo propuesto.'],['2027-03-29','Semana Santa 2026/27, fin','school-proposal','Período no lectivo propuesto.']
  ].map(([date,title,type,body]) => ({id:`official-${date}-${type}-${title}`, date, event_date:date, title, type, event_type:type, body, official:true, hidden:false}));

  const roleTeacher = () => State.profile?.role === 'teacher';
  const knownStudentNames = {
    profesora:'Patri', naiara_marti:'Naiara Martí Domínguez', paula_allo:'Paula Allo', natalia_macias:'Natalia Macías', ana_sambade:'Ana Sambade', marco_calvo:'Marco Calvo', carla_fiuza:'Carla Fiuza', lucia_pose:'Lucía Pose', celia_trillo:'Celia Trillo', carlota_trillo:'Carlota Trillo', carla_caamano:'Carla Caamaño', susana_haymanot:'Susana Haymanot', sabela_paz:'Sabela Paz', gorka_montero:'Gorka Montero Ríos', sandra_casais:'Sandra Casais', eloy_casais:'Eloy Casais', antonia_wrona:'Antonia Wrona', filip_wrona:'Filip Wrona', ana_valino:'Ana Valiño', sofia_wrona:'Sofía Wrona'
  };
  const displayName = p => {
    const username = String(p?.username || '').toLowerCase();
    const full = String(p?.full_name || '').trim();
    const composed = [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim();
    if(full && !/^demo\b/i.test(full)) return full;
    if(composed && !/^demo\b/i.test(composed)) return composed;
    return knownStudentNames[username] || p?.preferred_name || p?.username || 'Usuario';
  };
  const academicLine = p => [p?.center || 'Centro sin asignar', p?.stage || '', p?.course || ''].filter(Boolean).join(' · ');
  const options = (arr, val='') => arr.map(x => `<option value="${safe(x)}" ${x===val?'selected':''}>${safe(x)}</option>`).join('');
  const groups = arr => {
    const map = new Map();
    [...(arr||[])].sort((a,b)=>`${a.center||''} ${a.stage||''} ${a.course||''} ${a.full_name||''}`.localeCompare(`${b.center||''} ${b.stage||''} ${b.course||''} ${b.full_name||''}`,'es')).forEach(s=>{
      const k = [s.center||'Sin centro', s.stage||'Sin etapa', s.course||'Sin curso'].join(' · ');
      if(!map.has(k)) map.set(k, []); map.get(k).push(s);
    });
    return [...map.entries()].map(([label,items])=>({label,items}));
  };
  const builtinSubjectList = (p=State.profile) => subjectCatalog[`${p?.stage}-${p?.course}`] || subjectCatalog['ESO-1.º ESO'] || [];
  const subjectList = (p=State.profile) => {
    if(!p) return [];
    if(p.role !== 'teacher') {
      const assignments = (State.data.classStudents||[]).filter(a=>String(a.user_id)===String(p.id) && a.active!==false);
      const classIds = new Set(assignments.map(a=>String(a.class_id)));
      const classSubjects = (State.data.classSubjects||[])
        .filter(s=>classIds.has(String(s.class_id)) && s.active!==false && !s.hidden)
        .sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0) || String(a.subject||'').localeCompare(String(b.subject||''),'es'))
        .map(s=>s.subject)
        .filter(Boolean);
      if(classSubjects.length) return [...new Set(classSubjects)];
    }
    return subjectListFor(p.stage, p.course);
  };
  function teacherSubjectList(stage, course){
    const overrides = (State.data.subjects||[]).filter(x=>x.stage===stage && x.course===course);
    const names = [...new Set([...(subjectCatalog[`${stage}-${course}`] || []), ...overrides.map(x=>x.subject).filter(Boolean)])];
    return names;
  }
  function subjectOverride(stage, course, subject){
    return (State.data.subjects||[]).find(x=>x.stage===stage && x.course===course && x.subject===subject) || null;
  }
  function hiddenSubjectKey(stage, course){
    return `tribeca-hidden-subjects-${String(stage||'').trim()}-${String(course||'').trim()}`;
  }
  function hiddenSubjectSet(stage, course){
    try {
      const raw = localStorage.getItem(hiddenSubjectKey(stage, course));
      const arr = JSON.parse(raw || '[]');
      return new Set(Array.isArray(arr) ? arr : []);
    } catch(_e) {
      return new Set();
    }
  }
  function setLocalSubjectHidden(stage, course, subject, hidden){
    const set = hiddenSubjectSet(stage, course);
    if(hidden) set.add(subject); else set.delete(subject);
    localStorage.setItem(hiddenSubjectKey(stage, course), JSON.stringify([...set]));
  }
  function isSubjectHidden(stage, course, subject){
    const db = subjectOverride(stage, course, subject);
    return db?.active === false || hiddenSubjectSet(stage, course).has(subject);
  }
  function subjectIsHidden(stage, course, subject){
    return subjectOverride(stage, course, subject)?.active === false;
  }
  const table = name => State.client.from(name);
  async function maybe(promise, fallback=null) {
    try {
      const {data,error} = await tribecaWithTimeout(promise, TRIBECA_QUERY_TIMEOUT_MS, 'Consulta de Supabase');
      if(error) throw error;
      return data ?? fallback;
    } catch(e) {
      console.warn('[Tribeca Aula]', e.message || e);
      return fallback;
    }
  }
  function beep(kind='message') {
    if(!State.sound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const map = {message:660,touch:880,join:520,leave:330};
      osc.frequency.value = map[kind] || 660;
      gain.gain.value = 0.055;
      osc.connect(gain); gain.connect(ctx.destination); osc.start();
      setTimeout(()=>{osc.stop(); ctx.close();}, kind==='touch'?180:110);
    } catch(_) {}
  }

  function publicToolLinksMarkup(){
    return '';
  }

  function loginMarkup() {
    return `<div class="auth-card t16-auth"><div class="auth-brand"><img src="assets/logo-tribeca.png" alt=""><div><strong>Tribeca Aula</strong><span>Acceso seguro</span></div></div>${publicToolLinksMarkup()}${!configured?`<div class="auth-warning">Supabase aún no está configurado. Revisa supabase-config.js.</div>`:''}<form id="t16LoginForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="auth-form"><h1>Acceso a Tribeca Aula</h1><p>Introduce tu nombre de usuario y contraseña.</p><label><span>Usuario</span><input name="username" placeholder="nombre_apellido" autocomplete="username" required ${configured?'':'disabled'}></label><label><span>Contraseña</span><input name="password" type="password" autocomplete="current-password" required ${configured?'':'disabled'}></label><button class="primary-btn" type="submit" ${configured?'':'disabled'}>Entrar</button><div class="form-status auth-login-status" id="loginStatus" aria-live="polite"></div><button class="link-button" type="button" data-t16-forgot>No recuerdo mi contraseña</button></form><form id="t16ResetForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="auth-form is-secondary" hidden><h2>Recuperar contraseña</h2><p>La profesora recibirá la solicitud y restablecerá la contraseña manualmente.</p><label><span>Usuario</span><input name="username" placeholder="nombre_apellido" required></label><label><span>Nombre y apellidos</span><input name="displayName" maxlength="120"></label><button class="secondary-btn" type="submit">Solicitar recuperación</button><button class="link-button" type="button" data-t16-login>Volver al inicio de sesión</button></form></div>`;
  }
  function showLogin() {
    let overlay = $('#tribecaAuthOverlay');
    if(!overlay) { overlay = document.createElement('div'); overlay.id='tribecaAuthOverlay'; overlay.className='auth-overlay'; document.body.appendChild(overlay); }
    overlay.innerHTML = loginMarkup(); overlay.hidden = false; document.body.classList.add('auth-locked');
  }
  function hideLogin() { const o=$('#tribecaAuthOverlay'); if(o) o.hidden=true; document.body.classList.remove('auth-locked'); }
  async function resolveEmail(username) {
    const u = String(username||'').trim().toLowerCase();
    const rpc = await maybe(State.client.rpc('resolve_login_email', { p_username:u }), null);
    return rpc || `${u}@tribecaaula.test`;
  }
  async function signIn(username, password) {
    const box = document.getElementById('loginStatus');
    if(box){ box.textContent='Comprobando acceso…'; box.className='form-status auth-login-status is-info'; }
    try {
      const email = await resolveEmail(username);
      const { data, error } = await State.client.auth.signInWithPassword({ email, password });
      if(error) throw error;
      State.session = data.session; State.user = data.user;
      await hydrate();
      await log('login','Inicio de sesión', {user:displayName(State.profile)});
      hideLogin(); renderApp(); toast('Sesión iniciada.');
    } catch(error) {
      const msg = /invalid|credentials|login/i.test(String(error?.message||'')) ? 'Nombre de usuario o contraseña incorrectos.' : (error?.message || 'No se pudo iniciar sesión.');
      if(box){ box.textContent=msg; box.className='form-status auth-login-status is-error'; }
      throw new Error(msg);
    }
  }
  async function signOut() {
    try { await State.client?.auth?.signOut({scope:'global'}); } catch(_) {}
    try { await State.client?.auth?.signOut({scope:'local'}); } catch(_) {}
    Object.keys(localStorage).filter(k=>k.includes('supabase') || k.includes('tribeca')).forEach(k=>{ if(!['tribeca-zoom','tribeca-theme','tribeca-font'].includes(k)) localStorage.removeItem(k); });
    Object.keys(sessionStorage).forEach(k=>{ if(k.includes('supabase') || k.includes('tribeca')) sessionStorage.removeItem(k); });
    location.replace(location.href.split('?')[0].split('#')[0] + '?logout=' + Date.now());
  }
  async function requestReset(form) {
    const fd = new FormData(form); const username = String(fd.get('username')||'').trim().toLowerCase();
    if(!username) return;
    await maybe(table('password_reset_requests').insert({ username, display_name: fd.get('displayName') || username, status:'pending' }));
    await maybe(table('notifications').insert({target_role:'teacher', tool:'passwordRequests', title:'Solicitud de recuperación', body:`Solicitud de recuperación para ${username}`}));
    toast('Solicitud enviada a la profesora.'); form.reset();
  }

  async function refreshSelfPause() {
    State.selfPause = null;
    if(!State.profile || roleTeacher()) return null;
    const today = todayIso();
    let pause = null;
    try {
      const rpc = await maybe(State.client.rpc('tribeca_current_student_pause'), null);
      pause = Array.isArray(rpc) ? (rpc[0] || null) : (rpc || null);
    } catch(_e) { pause = null; }
    if(!pause) {
      const direct = await maybe(
        table('student_pauses')
          .select('*')
          .eq('user_id', State.profile.id)
          .eq('active', true)
          .lte('start_date', today)
          .or(`end_date.is.null,end_date.gte.${today}`)
          .order('start_date', {ascending:false})
          .limit(1),
        []
      );
      pause = Array.isArray(direct) ? (direct[0] || null) : (direct || null);
    }
    State.selfPause = pause || null;
    if(pause) {
      State.data.studentPauses = [pause, ...((State.data.studentPauses||[]).filter(p => p.id !== pause.id))];
    }
    return State.selfPause;
  }

  async function hydrate(force=false) {
    if(!State.client) return;
    if(!State.user) {
      const res = await State.client.auth.getSession();
      State.session = res.data?.session || null; State.user = State.session?.user || null;
    }
    if(!State.user) return;
    State.profile = await maybe(table('profiles').select('*').eq('id', State.user.id).single(), null);
    if(!State.profile) throw new Error('No se encontró perfil vinculado a este usuario.');
    if(!State.activitySince){
      const key = `tribeca-last-session-${State.user.id}`;
      State.activitySince = localStorage.getItem(key) || new Date(0).toISOString();
      localStorage.setItem(key, new Date().toISOString());
    }
    await loadData(force);
    await refreshSelfPause();
    if(!State.selfPause) updatePresence().catch(()=>{});
  }
  async function loadData(force=false) {
    if(!State.profile || (!force && Date.now() - State.loadedAt < 1200)) return;
    State.loadedAt = Date.now(); const p=State.profile;
    const common = [
      maybe(table('subject_materials').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.materials=d||[]),
      maybe(table('announcements').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.announcements=d||[]),
      maybe(table('calendar_events').select('*').order('event_date',{ascending:true}), []).then(d=>State.data.events=d||[]),
      maybe(table('tribeca_video_classes').select('*').order('starts_at',{ascending:true}), []).then(d=>State.data.videoClasses=d||[]),
      maybe(table('private_messages').select('*').order('created_at',{ascending:false}).limit(500), []).then(d=>State.data.messages=d||[]),
      maybe(table('user_badges').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.userBadges=d||[]),
      maybe(table('badge_claim_requests').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.badgeClaims=d||[]),
      maybe(table('password_reset_requests').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.passwordRequests=d||[]),
      maybe(table('user_presence').select('*').order('last_seen',{ascending:false}), []).then(d=>State.data.presence=d||[]),
      maybe(table('teacher_activity_log').select('*').order('created_at',{ascending:false}).limit(300), []).then(d=>State.data.activity=d||[]),
      maybe(table('guidance_resources').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.guidance=d||[]),
      maybe(table('guidance_link_clicks').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.guidanceLinkClicks=d||[]),
      maybe(table('subject_overrides').select('*').order('stage').order('course').order('subject'), []).then(d=>State.data.subjects=d||[]),
      maybe(table('material_completions').select('*'), []).then(d=>State.data.materialCompletions=d||[]),
      maybe(table('exam_attempts').select('*').order('completed_at',{ascending:false}), []).then(d=>State.data.examAttempts=d||[]),
      maybe(table('student_pauses').select('*').order('start_date',{ascending:false}), []).then(d=>State.data.studentPauses=d||[]),
      maybe(table('tribeca_classes').select('*').order('center').order('stage').order('course').order('name'), []).then(d=>State.data.classrooms=d||[]),
      maybe(table('tribeca_class_students').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.classStudents=d||[]),
      maybe(table('tribeca_class_subjects').select('*').order('sort_order').order('subject'), []).then(d=>State.data.classSubjects=d||[]),
      maybe(table('tribeca_class_units').select('*').order('sort_order').order('title'), []).then(d=>State.data.classUnits=d||[]),
      maybe(table('teacher_tasks').select('*').order('task_date',{ascending:true}).order('created_at',{ascending:false}), []).then(d=>State.data.teacherTasks=d||[])
    ];
    if(roleTeacher()) {
      common.push(maybe(table('profiles').select('*').eq('role','student').order('center').order('stage').order('course').order('full_name'), []).then(d=>State.data.students=d||[]));
      common.push(maybe(table('grades').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.grades=d||[]));
      common.push(maybe(table('difficult_subjects').select('*').order('created_at',{ascending:false}), []).then(d=>State.data.difficulties=d||[]));
      common.push(maybe(table('student_billing').select('*'), []).then(d=>State.data.billing=d||[]));
      common.push(maybe(table('student_schedules').select('*').order('weekday').order('start_time'), []).then(d=>State.data.schedules=d||[]));
      common.push(maybe(table('attendance_records').select('*').order('class_date',{ascending:false}), []).then(d=>State.data.attendance=d||[]));
      common.push(maybe(table('payment_months').select('*').order('month',{ascending:false}), []).then(d=>State.data.paymentMonths=d||[]));
      common.push(maybe(table('teacher_material_repository').select('*').order('stage').order('course').order('subject').order('unit_title').order('created_at',{ascending:false}), []).then(d=>State.data.materialRepository=d||[]));
    } else {
      common.push(maybe(table('grades').select('*').eq('user_id',p.id).order('created_at',{ascending:false}), []).then(d=>State.data.grades=d||[]));
      common.push(maybe(table('difficult_subjects').select('*').eq('user_id',p.id).order('created_at',{ascending:false}), []).then(d=>State.data.difficulties=d||[]));
    }
    await Promise.allSettled(common);
    updateBadges();
    deferTribecaBackgroundTask(() => processDueScheduledPublications(), 1800);
  }
  async function updatePresence() {
    const p=State.profile; if(!p) return;
    await maybe(table('user_presence').upsert({ user_id:p.id, display_name:displayName(p), role:p.role, center:p.center, stage:p.stage, course:p.course, avatar_icon:p.avatar_icon || '💡', avatar_image_url:teacherProfileImageUrl(p) || null, last_seen:new Date().toISOString() }, { onConflict:'user_id' }));
  }
  async function log(action_type, title, details={}) {
    const p=State.profile; if(!p) return;
    await maybe(table('teacher_activity_log').insert({ actor_id:p.id, actor_name:displayName(p), actor_role:p.role, action_type, title, details, session_id:sessionStorage.getItem('tribeca-session-id') || (sessionStorage.setItem('tribeca-session-id', uid()), sessionStorage.getItem('tribeca-session-id')) }));
  }

  function parseArrayField(value) {
    if(Array.isArray(value)) return value.filter(v => v !== null && v !== undefined).map(String);
    if(value === null || value === undefined || value === '') return [];
    if(typeof value === 'string') {
      const trimmed = value.trim();
      if(!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.filter(v => v !== null && v !== undefined).map(String) : [];
      } catch(_e) {
        return trimmed.includes(',') ? trimmed.split(',').map(x => x.trim()).filter(Boolean) : [trimmed];
      }
    }
    return [];
  }
  function classById(id){ return (State.data.classrooms||[]).find(c=>String(c.id)===String(id)) || null; }
  function classSubjectById(id){ return (State.data.classSubjects||[]).find(s=>String(s.id)===String(id)) || null; }
  function classUnitById(id){ return (State.data.classUnits||[]).find(u=>String(u.id)===String(id)) || null; }
  function activeClassAssignmentFor(studentId, classId){
    return (State.data.classStudents||[]).find(a=>String(a.user_id)===String(studentId) && String(a.class_id)===String(classId) && a.active!==false) || null;
  }
  function activeClassIdsForStudent(studentId){
    return (State.data.classStudents||[])
      .filter(a=>String(a.user_id)===String(studentId) && a.active!==false && classById(a.class_id))
      .map(a=>String(a.class_id));
  }
  function targetClassIds(item={}){
    item = item && typeof item === 'object' ? item : {};
    return parseArrayField(item.target_class_ids || item.class_ids || item.classIds || []);
  }
  function visibleByTargetClasses(item={}, p=State.profile){
    const ids = targetClassIds(item);
    if(!ids.length) return false;
    if(roleTeacher()) return true;
    const own = new Set(activeClassIdsForStudent(p?.id));
    return ids.some(id=>own.has(String(id)));
  }
  function visibleByClassHierarchy(item={}, p=State.profile){
    if(!item?.class_id) return true;
    const c=classById(item.class_id);
    if(!c || c.active===false || c.hidden) return false;
    if(!roleTeacher() && !activeClassAssignmentFor(p?.id, c.id)) return false;
    const s=item.class_subject_id ? classSubjectById(item.class_subject_id) : null;
    if(s && (s.active===false || s.hidden)) return false;
    const u=item.class_unit_id ? classUnitById(item.class_unit_id) : null;
    if(u && (u.active===false || u.hidden)) return false;
    return true;
  }
  function isSubjectMaterialRecord(item={}){
    if(!item || typeof item !== 'object') return false;
    return !!(item.subject || item.unit_title || item.unit || item.material_type || item.class_subject_id || item.class_unit_id || item.badge_codes || item.embed_code || item.embed_url);
  }
  function studentHasNewClassModel(p=State.profile){
    if(!p) return false;
    return (State.data.classStudents||[]).some(a=>String(a.user_id)===String(p.id) && a.active!==false && classById(a.class_id));
  }
  function hideLegacyMaterialForStudent(item={}, p=State.profile){
    if(roleTeacher() || !p) return false;
    if(!isSubjectMaterialRecord(item)) return false;
    if(item.class_id) return false;
    return studentHasNewClassModel(p);
  }
  function scheduledVisibleForStudents(item={}){
    const raw = item.scheduled_at || item.publish_at || item.publication_date || '';
    if(!raw) return true;
    const t = Date.parse(raw);
    if(!Number.isFinite(t)) return true;
    return t <= Date.now();
  }
  function scheduledLabel(item={}){
    const raw = item.scheduled_at || item.publish_at || '';
    if(!raw) return '';
    const t = Date.parse(raw);
    if(!Number.isFinite(t)) return '';
    return `Programada: ${new Date(t).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}`;
  }
  function visibleForProfile(item={}, p=State.profile) {
    if(!p || !item || typeof item !== 'object') return false;
    if(roleTeacher()) return true;
    if(!scheduledVisibleForStudents(item)) return false;
    if(item.hidden) return false;
    if(hideLegacyMaterialForStudent(item,p)) return false;
    if(!visibleByClassHierarchy(item,p)) return false;
    const scope = item.target_scope || item.scope || 'all';
    const ids = parseArrayField(item.target_user_ids);
    if(item.class_id) return !!activeClassAssignmentFor(p.id, item.class_id);
    if(scope === 'all') return true;
    if(['selected','user'].includes(scope)) return ids.includes(String(p.id));
    if(scope === 'center') return item.center === p.center;
    if(['classes','class_ids','classrooms'].includes(scope)) return visibleByTargetClasses(item,p);
    if(scope === 'class') {
      const ids = targetClassIds(item);
      if(ids.length) return visibleByTargetClasses(item,p);
      return item.center === p.center && item.stage === p.stage && item.course === p.course;
    }
    return true;
  }
  function focusModeEnabledForProfile(profile = State.profile){
    if(!profile || typeof profile !== 'object') return false;
    return profile.focus_mode_enabled === true || profile.focus_mode_enabled === 'true' || profile.focus_mode === true || profile.simplified_view === true || profile.ui_mode === 'focus';
  }
  function studentFocusModeEnabled(profile = State.profile){
    return !!profile && !roleTeacher() && focusModeEnabledForProfile(profile);
  }
  function focusModeShouldHideControl(el){
    const txt=normalizeLooseText(el?.textContent || '');
    if(/texto|tamano|tamanho|lectura|leitura|reading/.test(txt)) return true;
    if(el?.classList?.contains('reading-control')) return true;
    if(el?.classList?.contains('font-control')) return true;
    const sel=el?.querySelector?.('select');
    const selId=normalizeLooseText([sel?.id, sel?.name, sel?.dataset?.setting, sel?.ariaLabel].filter(Boolean).join(' '));
    return /font|texto|text|reading|lectura|leitura/.test(selId) && !/lang|idioma|language/.test(selId);
  }
  function pruneFocusModeInterface(){
    const active=studentFocusModeEnabled(State.profile);
    try{
      document.querySelectorAll('.public-tool-lumen,.public-tool-itinera,.public-tools-strip,[data-public-tool-link]').forEach(el=>{ el.hidden=active; el.setAttribute('aria-hidden', active?'true':'false'); });
      document.querySelectorAll('.utility-bar .control-field').forEach(el=>{ if(focusModeShouldHideControl(el)) { el.hidden=active; el.setAttribute('aria-hidden', active?'true':'false'); } });
      document.querySelectorAll('.site-footer,.tribeca-footer-v41,footer.site-footer,.hero-watermark,.hero-quote-block').forEach(el=>{ el.hidden=active; el.setAttribute('aria-hidden', active?'true':'false'); });
      const a11y=document.getElementById('tribecaAccessibilityWidget');
      if(active && a11y) a11y.remove();
    }catch(_e){}
  }
  function syncFocusModeClass(){
    try { document.body.classList.toggle('is-focus-mode', studentFocusModeEnabled(State.profile)); pruneFocusModeInterface(); } catch(_e) {}
  }

  function visibleAnnouncements() { return (State.data.announcements||[]).filter(x=>visibleForProfile(x)); }
  function materialDateValue(m={}){
    const raw=m.created_at || m.createdAt || m.date || m.updated_at || '';
    const t=raw ? Date.parse(raw) : NaN;
    return Number.isFinite(t) ? t : 0;
  }
  function materialOrderAsc(a={}, b={}){
    const d=materialDateValue(a)-materialDateValue(b);
    if(d) return d;
    return String(a.title||'').localeCompare(String(b.title||''),'es',{numeric:true,sensitivity:'base'});
  }
  function unitTitleOrder(a='', b=''){
    const norm=value=>String(value||'').trim();
    return norm(a).localeCompare(norm(b),'es',{numeric:true,sensitivity:'base'});
  }
  function sortMaterialsAsc(items=[]){
    return [...items].sort(materialOrderAsc);
  }
  function visibleMaterials(subject='') { return sortMaterialsAsc((State.data.materials||[]).filter(x=>visibleForProfile(x) && (!subject || x.subject===subject))); }
  async function processDueScheduledPublications(){
    if(!roleTeacher() || !State.profile?.id) return;
    const now=Date.now();
    const dueAnnouncements=(State.data.announcements||[]).filter(a=>a?.scheduled_at && Date.parse(a.scheduled_at)<=now && !localStorage.getItem(`tribeca-scheduled-push-sent-${a.id}`));
    const dueMaterials=(State.data.materials||[]).filter(m=>m?.scheduled_at && Date.parse(m.scheduled_at)<=now && !localStorage.getItem(`tribeca-scheduled-push-sent-${m.id}`));
    for(const a of dueAnnouncements){
      try{
        await tribecaDispatchPushNotification('announcement',{title:`Nuevo anuncio: ${a.title||'Tribeca Aula'}`, body:String(a.body||a.description||'Hay un nuevo anuncio en Tribeca Aula.').slice(0,180), targetScope:a.target_scope||a.scope||'all', center:a.center||null, stage:a.stage||null, course:a.course||null, targetClassIds:targetClassIds(a), classIds:targetClassIds(a), section:'announcements'});
        localStorage.setItem(`tribeca-scheduled-push-sent-${a.id}`, new Date().toISOString());
      }catch(error){ console.warn('[Tribeca Aula] No se pudo notificar anuncio programado:', error?.message||error); }
    }
    for(const m of dueMaterials){
      try{
        await tribecaDispatchPushNotification('material',{title:`Material nuevo: ${m.title||'Tribeca Aula'}`, body:String(m.body||m.description||`${m.subject||'Materia'} · ${m.unit_title||m.unit||''}`).slice(0,180), targetScope:m.target_scope||m.scope||'class', center:m.center||null, stage:m.stage||null, course:m.course||null, targetClassIds:targetClassIds(m), classIds:m.class_id?[m.class_id]:targetClassIds(m), section:m.class_subject_id?'classSubjectDetail':'subjects', opts:m.class_subject_id?{classSubjectId:m.class_subject_id,classId:m.class_id,subject:m.subject}:{}});
        localStorage.setItem(`tribeca-scheduled-push-sent-${m.id}`, new Date().toISOString());
      }catch(error){ console.warn('[Tribeca Aula] No se pudo notificar material programado:', error?.message||error); }
    }
  }
  function relevantEvents() {
    const p=State.profile;
    const db = (State.data.events||[]).filter(Boolean).filter(e=>{
      if(roleTeacher()) return true;
      if(e.hidden && e.created_by !== p.id) return false;
      const scope=e.scope||e.target_scope||'all';
      const ids=parseArrayField(e.target_user_ids);
      if(e.created_by === p.id || e.user_id === p.id) return true;
      if(scope==='all') return true;
      if(scope==='center') return e.center===p.center;
      if(['classes','class_ids','classrooms'].includes(scope)) return visibleByTargetClasses(e,p);
      if(scope==='class') {
        const cids=targetClassIds(e);
        if(cids.length) return visibleByTargetClasses(e,p);
        return e.center===p.center && e.stage===p.stage && e.course===p.course;
      }
      if(['selected','user'].includes(scope)) return ids.includes(String(p.id));
      return true;
    }).map(e=>({...e, date:e.event_date || e.date, type:e.event_type || e.type || 'personal'}));
    const official = officialEvents.filter(Boolean).filter(e=> roleTeacher() || ['national','galicia','local','school','school-proposal'].includes(e.type) || ((p?.center||'').includes('Cee') && e.type==='local-cee') || ((p?.center||'').includes('Fisterra') && e.type==='local-fisterra'));
    return [...official, ...db].filter(e=>e && (!e.hidden || e.official || roleTeacher() || e.created_by===p?.id));
  }
  function canEditEvent(e) { const p=State.profile; if(!p || e.official) return false; if(roleTeacher()) return true; if(e.created_by === p.id) return true; const scope=e.scope||e.target_scope; if(['classes','class_ids','classrooms'].includes(scope)) return visibleByTargetClasses(e,p); if(scope==='class' && e.center===p.center && e.stage===p.stage && e.course===p.course) return true; return false; }

  function pauseRecords(userId){ return (State.data.studentPauses||[]).filter(x=>String(x.user_id)===String(userId)); }
  function pauseCoversDate(pause, iso=todayIso()){
    if(!pause) return false;
    if(pause.active === false && !pause.end_date) return false;
    const d=String(iso).slice(0,10);
    const start=String(pause.start_date || todayIso()).slice(0,10);
    const end=pause.end_date ? String(pause.end_date).slice(0,10) : '9999-12-31';
    return start <= d && d <= end;
  }
  function activePauseFor(userId, iso=todayIso()){
    if(!roleTeacher() && State.profile && String(userId) === String(State.profile.id) && State.selfPause && pauseCoversDate(State.selfPause, iso)) return State.selfPause;
    return pauseRecords(userId).find(p=>p.active !== false && pauseCoversDate(p, iso)) || null;
  }
  function pausedOnDate(userId, iso){ return pauseRecords(userId).some(p=>pauseCoversDate(p, iso)); }
  function pauseMonthOverlap(userId, month){
    const [y,m]=String(month||'').split('-').map(Number); if(!y||!m) return [];
    const monthStart=`${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-01`;
    const monthEnd=toIso(new Date(y,m,0));
    return pauseRecords(userId).filter(p=>(p.active!==false || p.end_date)).filter(p=>String(p.start_date||monthStart).slice(0,10)<=monthEnd && String(p.end_date||'9999-12-31').slice(0,10)>=monthStart);
  }
  function pauseStatusText(userId){
    const p=activePauseFor(userId);
    if(!p) return '';
    const start=p.start_date?fmtDate(p.start_date):'hoy';
    const end=p.end_date?fmtDate(p.end_date):'hasta reactivación manual';
    return `Pausa activa desde ${start} hasta ${end}${p.reason?`: ${p.reason}`:''}`;
  }
  function pauseLockContent(pause){
    const start=pause?.start_date?fmtDate(pause.start_date):'hoy';
    const end=pause?.end_date?fmtDate(pause.end_date):'la reactivación de la asistencia';
    return `<section class="pause-lock panel"><div class="pause-lock-icon">⏸</div><p class="eyebrow">Acceso pausado temporalmente</p><h1>Tu aula virtual está en pausa</h1><p>Tu asistencia está pausada desde ${safe(start)} hasta ${safe(end)}. Durante este período no podrás entrar al aula virtual.</p><p>Cuando se reactive tu asistencia, podrás acceder con el mismo usuario y la misma contraseña, y encontrarás las publicaciones realizadas durante el tiempo de pausa.</p>${pause?.reason?`<p class="pause-reason"><strong>Motivo registrado:</strong> ${safe(pause.reason)}</p>`:''}<button class="secondary-btn" type="button" data-action="logout">Cerrar sesión</button></section>`;
  }

  function renderApp() {
    bindTribecaThemeControls();
    syncTribecaStandaloneClass();
    applyTribecaSeasonMode();
    if(!State.profile) { showLogin(); return; }
    const p=State.profile;
    const main = $('#inicio');
    try {
      $$('[data-tool="chat"], #chatBadge').forEach(el=>el.closest?.('button')?.remove?.() || el.remove());
      updateTopProfile();
      simplifyTribecaNavigation();
      if(!main) return;
      document.body.classList.toggle('is-teacher', roleTeacher());
      document.body.classList.toggle('is-student', !roleTeacher());
      syncFocusModeClass();
      ensureMainNavHomeButton();
      const pause = !roleTeacher() ? activePauseFor(p.id) : null;
      document.body.classList.toggle('is-paused-student', !!pause);
      if(pause){
        document.body.classList.remove('is-inline-section','is-standalone-page');
        State.activeInlineSection = null;
        State.activeInlineOptions = {};
        State.windows.forEach(w=>w?.remove?.());
        State.windows.clear();
        main.innerHTML = pauseLockContent(pause);
        updateBadges();
        setActiveMainNav('home');
        applyTranslations();
        ensureAccessibilityWidget();
        return;
      }
      if(roleTeacher()) main.innerHTML = teacherHome(); else main.innerHTML = studentHome();
      bindSubjectCards(); updateBadges(); scrubZeroBadges(); setActiveMainNav('home'); applyTranslations(); ensureAccessibilityWidget(); ensureMathCalculatorWidget(); syncFocusModeClass();
    } catch(error) {
      console.error('[Tribeca Aula] Error al renderizar la aplicación:', error);
      if(main) main.innerHTML = `<section class="panel app-error-panel"><p class="eyebrow">Tribeca Aula</p><h1>No se pudo cargar correctamente el panel</h1><p>${safe(error?.message || 'Error de interfaz')}</p><button type="button" class="primary-btn" onclick="location.reload()">Recargar aula</button></section>`;
    }
  }
  function updateTopProfile() {
    const p=State.profile || {}; const avatar=$('#profileAvatar');
    const photo = teacherProfileImageUrl(p);
    if(avatar) {
      if(photo) {
        avatar.textContent='';
        avatar.style.backgroundImage=`url("${photo}")`;
        avatar.classList.add('profile-image-avatar');
      } else {
        avatar.style.backgroundImage='';
        avatar.classList.remove('profile-image-avatar');
        avatar.textContent=p.avatar_icon || '💡';
      }
    }
    const name=$('.profile-name'); if(name) name.textContent = 'Mi cuenta';
    simplifyTribecaNavigation();
    updatePwaInstallCta();
    const menu=$('#profileMenu');
    if(menu){
      menu.innerHTML=accountMenuMarkup();
      menu.setAttribute('hidden','');
      menu.setAttribute('aria-hidden','true');
      document.body.classList.remove('tribeca-account-menu-open');
    }
  }
  function accountMenuMarkup(){
    const personalTools = roleTeacher()
      ? `<button type="button" data-t141-account-tool="guidance">Orientación académica</button>`
      : `<button type="button" data-t141-account-tool="guidance">Orientación académica</button><button type="button" data-t141-account-tool="grades">Calificaciones</button><button type="button" data-t141-account-tool="difficulties">Materias con dificultades</button>`;
    const installTool = isTribecaStandalone() ? '' : `<button type="button" data-pwa-install>${safe(pwaText('install'))}</button>`;
    const themeLabel = document.body.classList.contains('is-dark') ? 'Modo claro' : 'Modo oscuro';
    return `<button type="button" data-t73-account-panel="profile">Mi perfil</button><button type="button" data-t73-account-panel="password">Ajustes de contraseña</button><button type="button" data-t73-account-panel="notifications">Ajustes de notificaciones</button><button type="button" data-t73-account-panel="appearance">Apariencia</button><button type="button" data-t167-toggle-theme>${safe(themeLabel)}</button>${personalTools}${installTool}`;
  }
  function accountMenuElement(){ return document.getElementById('profileMenu'); }
  function ensureAccountMenuPortal(){
    const menu=accountMenuElement();
    if(!menu) return null;
    if(menu.parentElement !== document.body){
      document.body.appendChild(menu);
      menu.classList.add('tribeca-account-menu-portal');
    }
    return menu;
  }
  function positionAccountMenu(){
    const menu=accountMenuElement();
    const btn=document.getElementById('profileButton');
    if(!menu || !btn || menu.hasAttribute('hidden')) return;
    const rect=btn.getBoundingClientRect();
    const vw=Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh=Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const mobile=window.matchMedia?.('(max-width: 720px)')?.matches || vw <= 720;
    if(mobile){
      menu.style.position='fixed';
      menu.style.left='14px';
      menu.style.right='14px';
      menu.style.top='14px';
      menu.style.bottom='14px';
      menu.style.width='auto';
      menu.style.minWidth='0';
      menu.style.maxWidth='none';
      menu.style.maxHeight='calc(100dvh - 28px)';
      menu.style.zIndex='2147483647';
      return;
    }
    menu.style.position='fixed';
    menu.style.right='auto';
    menu.style.bottom='auto';
    menu.style.maxHeight=`${Math.max(260, vh - rect.bottom - 18)}px`;
    menu.style.zIndex='2147483647';
    const width=Math.max(menu.offsetWidth || 0, 352);
    const left=Math.min(Math.max(12, rect.right - width), vw - width - 12);
    menu.style.left=`${left}px`;
    menu.style.top=`${Math.min(rect.bottom + 10, vh - 80)}px`;
  }
  function toggleAccountMenu(){
    const menu=ensureAccountMenuPortal();
    if(!menu) return;
    if(!menu.innerHTML.trim()) menu.innerHTML=accountMenuMarkup();
    const hidden=menu.hasAttribute('hidden');
    if(hidden){
      menu.removeAttribute('hidden');
      menu.setAttribute('aria-hidden','false');
      document.body.classList.add('tribeca-account-menu-open');
      requestAnimationFrame(positionAccountMenu);
      setTimeout(positionAccountMenu, 60);
    }
    else {
      menu.setAttribute('hidden','');
      menu.setAttribute('aria-hidden','true');
      document.body.classList.remove('tribeca-account-menu-open');
    }
  }
  function closeAccountMenu(){
    const menu=accountMenuElement();
    if(menu){ menu.setAttribute('hidden',''); menu.setAttribute('aria-hidden','true'); }
    document.body.classList.remove('tribeca-account-menu-open');
  }
  function simplifyTribecaNavigation(){
    document.querySelectorAll('[data-public-tool-link], .public-tool-lumen, .public-tool-itinera, .main-nav [data-tool="guidance"], .main-nav [data-tool="badges"], .main-nav [data-tool="difficulties"], .main-nav [data-tool="grades"], .main-nav [data-tool="assignBadge"], [data-t16-tool="assignBadge"], [data-tool="badges"]').forEach(el=>el.remove?.());
    document.querySelectorAll('.utility-bar .control-field, .utility-bar label, .utility-bar .select-wrap').forEach(el=>{
      const txt = normalizeLooseText(el.textContent || '');
      const sel = el.matches?.('select') ? el : el.querySelector?.('select');
      const raw = normalizeLooseText([sel?.id, sel?.name, sel?.className, sel?.dataset?.setting, sel?.getAttribute?.('aria-label'), sel?.value].filter(Boolean).join(' '));
      if(/texto|tamano|tamanho|tamaño|zoom|lectura|leitura|reading|idioma|language|lingua/.test(`${txt} ${raw}`)) el.remove?.();
    });
    document.querySelectorAll('.utility-bar select').forEach(sel=>{
      const txt = normalizeLooseText([sel.id, sel.name, sel.className, sel.dataset?.setting, sel.getAttribute('aria-label'), sel.closest('label,.control-field,.select-wrap')?.textContent].filter(Boolean).join(' '));
      if(/texto|tamano|tamanho|tamaño|zoom|lectura|leitura|reading|idioma|language|lingua/.test(txt)) (sel.closest('label,.control-field,.select-wrap')||sel).remove?.();
    });
  }
  function ensureMainNavHomeButton() {
    const nav = document.querySelector('.main-nav');
    if(!nav) return;
    if(roleTeacher()) nav.querySelector('[data-route="subjects"]')?.remove();
    if(!nav.querySelector('[data-route="home"]')) {
      const btn = document.createElement('button');
      btn.className = 'nav-btn';
      btn.dataset.route = 'home';
      btn.type = 'button';
      btn.innerHTML = '<span>Página principal</span>';
      nav.insertBefore(btn, nav.firstElementChild || null);
    }
  }
  function setActiveMainNav(id='home') {
    ensureMainNavHomeButton();
    document.querySelectorAll('.main-nav .nav-btn').forEach(b => b.classList.remove('is-active'));
    const selector = id === 'home' ? '.main-nav .nav-btn[data-route="home"]' : `.main-nav .nav-btn[data-tool="${CSS.escape(id)}"], .main-nav .nav-btn[data-route="${CSS.escape(id)}"]`;
    document.querySelector(selector)?.classList.add('is-active');
  }
  function showHomePage() {
    document.body.classList.remove('is-standalone-page','is-inline-section');
    State.activeInlineSection = null;
    State.activeInlineOptions = {};
    State.windows.forEach(win => win?.remove?.());
    State.windows.clear();
    if(openedPageTarget()) {
      history.replaceState({tribeca:true,id:'home',opts:{}}, '', baseAppUrl());
    } else {
      setTribecaHistory('home', {}, history.state?.tribeca ? 'push' : 'replace');
    }
    renderApp();
    window.scrollTo({top:0, behavior:'smooth'});
  }
  function updateBadges() {
    const now=new Date(); const seven=addDays(new Date(),7);
    const calCount=relevantEvents().filter(e=>{const d=parseIso(e.date); return d>=new Date(now.getFullYear(),now.getMonth(),now.getDate()) && d<=seven;}).length;
    setBadge('#calendarBadge', calCount);
    const unreadMsg=(State.data.messages||[]).filter(m=>m.recipient_id===State.profile?.id && !m.read_at && !m.archived && !m.deleted_by_recipient).length; setBadge('#messagesBadge', unreadMsg);
    const annUnread=visibleAnnouncements().filter(a=>!announcementIsRead(a)).length; setBadge('#announcementsBadge', annUnread);
    if(roleTeacher()){
      const alertCount = teacherAlertCount();
      const seen = Number(localStorage.getItem(`tribeca-alerts-seen-${State.profile.id}`)||0);
      setBadge('#teacherAlertsBadge', Math.max(0, alertCount-seen));
    }
    scrubZeroBadges();
    scheduleTribecaAppBadgeSync();
  }
  function teacherAlertIgnoreKey(key){ return `tribeca-teacher-alert-ignore-${State.profile?.id||'teacher'}-${key}`; }
  function teacherAlertIgnored(key){ return !!localStorage.getItem(teacherAlertIgnoreKey(key)); }
  function setTeacherAlertIgnored(key, ignored=true){
    if(!key) return;
    if(ignored) localStorage.setItem(teacherAlertIgnoreKey(key), new Date().toISOString());
    else localStorage.removeItem(teacherAlertIgnoreKey(key));
    updateBadges();
  }
  function teacherAlertItems(){
    const grades=(State.data.grades||[]).filter(g=>Number(g.grade)<5).map(g=>({
      key:`grade-low:${g.id||g.user_id||g.student_id}:${g.subject||''}:${g.evaluation||''}:${g.grade||''}`,
      group:'Calificaciones bajas',
      tone:'danger',
      title:`${g.subject||'Materia'} · ${g.grade}`,
      body:`${studentName(g.user_id||g.student_id)} · ${g.evaluation||''}`
    }));
    const diff=(State.data.difficulties||[]).map(d=>({
      key:`difficulty:${d.id||d.user_id}:${d.subject||''}:${d.level||''}`,
      group:'Dificultades declaradas',
      tone:'',
      title:d.subject||'Materia con dificultad',
      body:`${studentName(d.user_id)} · ${d.level||''}`
    }));
    const pass=(State.data.passwordRequests||[]).filter(r=>r.status==='pending').map(r=>({
      key:`password:${r.id||r.username||r.display_name}`,
      group:'Recuperación de contraseña',
      tone:'',
      title:r.display_name||r.username||'Solicitud pendiente',
      body:'Solicitud de recuperación de contraseña pendiente.'
    }));
    const unpaid=unpaidPaymentAlerts().map(a=>({
      key:`payment:${a.name}:${a.month}`,
      group:'Mensualidades pendientes',
      tone:'danger',
      title:`${a.name} · ${a.month}`,
      body:`Importe previsto: ${money(a.amount)}`
    }));
    return [...grades, ...diff, ...pass, ...unpaid];
  }
  function teacherAlertCount(){
    return teacherAlertItems().filter(a=>!teacherAlertIgnored(a.key)).length;
  }
  function setBadge(sel, n, dot=false){ const b=$(sel); if(!b) return; const count=Number(n||0); b.hidden=count<=0; b.textContent=count<=0?'':(dot?'•':String(Math.min(count,99))); b.classList.toggle('is-empty', count<=0); }
  function scrubZeroBadges(){ $$('.bubble,.badge,[id$="Badge"],.t16-tool-card em').forEach(b=>{ if((b.textContent||'').trim()==='0'){ b.textContent=''; b.hidden=true; b.classList.add('is-empty'); } }); $$('[data-section="notifications"]').forEach(btn=>btn.remove()); }
  function recent(iso){ return iso && (Date.now()-new Date(iso).getTime()) < 90_000; }

  const DAILY_QUOTES = [
    {
      author:'Nelson Mandela',
      es:'La educación es el arma más poderosa que puedes usar para cambiar el mundo.',
      gl:'A educación é a arma máis poderosa que podes usar para cambiar o mundo.',
      en:'Education is the most powerful weapon which you can use to change the world.',
      fr:'L’éducation est l’arme la plus puissante que l’on puisse utiliser pour changer le monde.',
      pl:'Edukacja jest najpotężniejszą bronią, której można użyć, aby zmienić świat.',
      de:'Bildung ist die mächtigste Waffe, mit der man die Welt verändern kann.',
      pt:'A educação é a arma mais poderosa que podes usar para mudar o mundo.'
    },
    {
      author:'Paulo Freire',
      es:'Enseñar no es transferir conocimiento, sino crear las posibilidades para su producción o construcción.',
      gl:'Ensinar non é transferir coñecemento, senón crear as posibilidades para a súa produción ou construción.',
      en:'Teaching is not transferring knowledge, but creating the possibilities for its production or construction.',
      fr:'Enseigner, ce n’est pas transférer un savoir, mais créer les possibilités de sa production ou de sa construction.',
      pl:'Nauczanie nie polega na przekazywaniu wiedzy, lecz na tworzeniu możliwości jej wytwarzania lub konstruowania.',
      de:'Lehren heißt nicht, Wissen zu übertragen, sondern Möglichkeiten für dessen Hervorbringung oder Konstruktion zu schaffen.',
      pt:'Ensinar não é transferir conhecimento, mas criar as possibilidades para a sua produção ou construção.'
    },
    {
      author:'Maria Montessori',
      es:'La mayor señal del éxito de un profesor es poder decir: ahora los niños trabajan como si yo no existiera.',
      gl:'O maior sinal do éxito dun profesor é poder dicir: agora os nenos traballan coma se eu non existise.',
      en:'The greatest sign of success for a teacher is being able to say: the children are now working as if I did not exist.',
      fr:'Le plus grand signe de réussite d’un professeur est de pouvoir dire : les enfants travaillent maintenant comme si je n’existais pas.',
      pl:'Największą oznaką sukcesu nauczyciela jest móc powiedzieć: dzieci pracują teraz tak, jakby mnie nie było.',
      de:'Das größte Zeichen des Erfolgs einer Lehrkraft ist sagen zu können: Die Kinder arbeiten jetzt, als gäbe es mich nicht.',
      pt:'O maior sinal de sucesso de um professor é poder dizer: agora as crianças trabalham como se eu não existisse.'
    },
    {
      author:'John Dewey',
      es:'La educación no es preparación para la vida; la educación es la vida misma.',
      gl:'A educación non é preparación para a vida; a educación é a vida mesma.',
      en:'Education is not preparation for life; education is life itself.',
      fr:'L’éducation n’est pas une préparation à la vie ; l’éducation est la vie elle-même.',
      pl:'Edukacja nie jest przygotowaniem do życia; edukacja jest samym życiem.',
      de:'Bildung ist nicht Vorbereitung auf das Leben; Bildung ist das Leben selbst.',
      pt:'A educação não é preparação para a vida; a educação é a própria vida.'
    },
    {
      author:'Jean Piaget',
      es:'El objetivo principal de la educación es crear personas capaces de hacer cosas nuevas.',
      gl:'O obxectivo principal da educación é crear persoas capaces de facer cousas novas.',
      en:'The principal goal of education is to create people who are capable of doing new things.',
      fr:'Le but principal de l’éducation est de former des personnes capables de faire des choses nouvelles.',
      pl:'Głównym celem edukacji jest kształtowanie ludzi zdolnych do robienia nowych rzeczy.',
      de:'Das Hauptziel der Bildung ist es, Menschen hervorzubringen, die fähig sind, Neues zu tun.',
      pt:'O principal objetivo da educação é formar pessoas capazes de fazer coisas novas.'
    },
    {
      author:'Lev Vygotsky',
      es:'Lo que un niño puede hacer hoy con ayuda, podrá hacerlo mañana por sí solo.',
      gl:'O que un neno pode facer hoxe con axuda, poderá facelo mañá por si só.',
      en:'What a child can do with assistance today, he will be able to do by himself tomorrow.',
      fr:'Ce qu’un enfant peut faire aujourd’hui avec de l’aide, il pourra le faire seul demain.',
      pl:'To, co dziecko potrafi dziś zrobić z pomocą, jutro będzie potrafiło zrobić samodzielnie.',
      de:'Was ein Kind heute mit Hilfe tun kann, wird es morgen selbstständig tun können.',
      pt:'O que uma criança consegue fazer hoje com ajuda, poderá fazer amanhã sozinha.'
    },
    {
      author:'Jerome Bruner',
      es:'Cualquier materia puede enseñarse de forma intelectualmente honesta a cualquier niño en cualquier etapa del desarrollo.',
      gl:'Calquera materia pode ensinarse de forma intelectualmente honesta a calquera neno en calquera etapa do desenvolvemento.',
      en:'Any subject can be taught in an intellectually honest form to any child at any stage of development.',
      fr:'Toute matière peut être enseignée de manière intellectuellement honnête à tout enfant, à n’importe quel stade de développement.',
      pl:'Każdego przedmiotu można nauczać w uczciwej intelektualnie formie każde dziecko na każdym etapie rozwoju.',
      de:'Jedes Fach kann jedem Kind in jeder Entwicklungsphase in intellektuell ehrlicher Form vermittelt werden.',
      pt:'Qualquer matéria pode ser ensinada de forma intelectualmente honesta a qualquer criança em qualquer etapa do desenvolvimento.'
    },
    {
      author:'Malala Yousafzai',
      es:'Un niño, un profesor, un libro y un lápiz pueden cambiar el mundo.',
      gl:'Un neno, un profesor, un libro e un lapis poden cambiar o mundo.',
      en:'One child, one teacher, one book and one pen can change the world.',
      fr:'Un enfant, un professeur, un livre et un stylo peuvent changer le monde.',
      pl:'Jedno dziecko, jeden nauczyciel, jedna książka i jeden długopis mogą zmienić świat.',
      de:'Ein Kind, eine Lehrkraft, ein Buch und ein Stift können die Welt verändern.',
      pt:'Uma criança, um professor, um livro e uma caneta podem mudar o mundo.'
    },
    {
      author:'Helen Keller',
      es:'El resultado más alto de la educación es la tolerancia.',
      gl:'O resultado máis alto da educación é a tolerancia.',
      en:'The highest result of education is tolerance.',
      fr:'Le plus haut résultat de l’éducation est la tolérance.',
      pl:'Najwyższym rezultatem edukacji jest tolerancja.',
      de:'Das höchste Ergebnis der Bildung ist Toleranz.',
      pt:'O resultado mais elevado da educação é a tolerância.'
    },
    {
      author:'Aristóteles',
      es:'Educar la mente sin educar el corazón no es educar en absoluto.',
      gl:'Educar a mente sen educar o corazón non é educar en absoluto.',
      en:'Educating the mind without educating the heart is no education at all.',
      fr:'Éduquer l’esprit sans éduquer le cœur, ce n’est pas éduquer du tout.',
      pl:'Kształcenie umysłu bez kształcenia serca nie jest prawdziwą edukacją.',
      de:'Den Verstand zu bilden, ohne das Herz zu bilden, ist keine Bildung.',
      pt:'Educar a mente sem educar o coração não é educar de modo algum.'
    }
  ];
  function dailyQuote(){
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const day = Math.floor((now - start) / 86400000);
    const q = DAILY_QUOTES[day % DAILY_QUOTES.length];
    const lang = currentLang();
    const key = lang==='Galego'?'gl':lang==='English'?'en':lang==='Français'?'fr':lang==='Polski'?'pl':lang==='Deutsch'?'de':lang==='Português'?'pt':'es';
    return { text:q[key] || q.es, author:q.author };
  }

  function teacherWeekBounds(date=new Date()){
    const d=new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diff=(d.getDay()+6)%7;
    const start=addDays(d,-diff);
    const end=addDays(start,6);
    return {start:toIso(start), end:toIso(end)};
  }
  function weekEventsForTeacher(){
    const today=todayIso();
    const end=addDays(new Date(),7).toISOString().slice(0,10);
    return relevantEvents()
      .filter(e=>String(e.date||'').slice(0,10)>=today && String(e.date||'').slice(0,10)<=end)
      .sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')) || String(a.title||'').localeCompare(String(b.title||''),'es'));
  }
  function classColorPalette(){
    return [
      {key:'forest', label:'Verde Tribeca', primary:'#103f24', secondary:'#2f6848', soft:'#eaf2e7'},
      {key:'emerald', label:'Esmeralda', primary:'#0f5a3a', secondary:'#3b8a63', soft:'#e6f3ec'},
      {key:'blue', label:'Azul académico', primary:'#1e5a8a', secondary:'#2f74b5', soft:'#e8f1f8'},
      {key:'navy', label:'Azul tinta', primary:'#143b5c', secondary:'#345f86', soft:'#e9f0f6'},
      {key:'violet', label:'Violeta sobrio', primary:'#5b3476', secondary:'#8a59a8', soft:'#f0e8f5'},
      {key:'plum', label:'Ciruela', primary:'#67385f', secondary:'#9a638d', soft:'#f5e8f1'},
      {key:'teal', label:'Verde agua', primary:'#1f6f68', secondary:'#3f978c', soft:'#e7f3f1'},
      {key:'cyan', label:'Azul verdoso', primary:'#276c78', secondary:'#5a99a5', soft:'#e6f3f5'},
      {key:'amber', label:'Dorado tierra', primary:'#7a5120', secondary:'#b9873f', soft:'#f5edde'},
      {key:'ochre', label:'Ocre académico', primary:'#8a6525', secondary:'#c39a45', soft:'#f7f0dc'},
      {key:'rose', label:'Rosa arcilla', primary:'#7b3f4a', secondary:'#b76473', soft:'#f5e9ec'},
      {key:'coral', label:'Coral suave', primary:'#8a4a35', secondary:'#c17860', soft:'#f6ece7'},
      {key:'slate', label:'Gris pizarra', primary:'#3f4b4f', secondary:'#6c7b80', soft:'#edf0f1'},
      {key:'olive', label:'Oliva clásico', primary:'#556b2f', secondary:'#7f9651', soft:'#eef2e3'},
      {key:'moss', label:'Musgo', primary:'#3f5f35', secondary:'#6f8f5d', soft:'#edf3e7'},
      {key:'burgundy', label:'Burdeos', primary:'#713747', secondary:'#a85c70', soft:'#f4e8ec'}
    ];
  }
  function stableIndexFromString(value='', len=1){
    const text=String(value||'tribeca');
    let n=0;
    for(let i=0;i<text.length;i++) n=(n*31 + text.charCodeAt(i)) >>> 0;
    return len ? n % len : 0;
  }
  function classColorFor(c={}){
    const palette=classColorPalette();
    const key=String(c.class_color || c.color || '').trim();
    return palette.find(x=>x.key===key) || palette[stableIndexFromString(c.id || c.name || classroomLabel(c), palette.length)] || palette[0];
  }
  function classroomThemeStyle(c={}){
    const p=classColorFor(c);
    return `--class-primary:${p.primary};--class-secondary:${p.secondary};--class-soft:${p.soft};`;
  }
  function classroomThemeClass(c={}){
    return `classroom-color-${safe(classColorFor(c).key)}`;
  }
  function renderTeacherHomeWithTasks(scroll=true){
    if(!roleTeacher()) return;
    State.teacherTasksOpen=true;
    State.activeInlineSection=null;
    State.activeInlineOptions={};
    State.windows.forEach(w=>w?.remove?.());
    State.windows.clear();
    renderApp();
    setTimeout(()=>{
      const target=document.getElementById('teacherTasksManager') || document.querySelector('[data-t114-open-tasks]');
      if(scroll) target?.scrollIntoView?.({behavior:'smooth', block:'start'});
      document.querySelector('#teacherTasksManager input[name="title"]')?.focus?.();
    },80);
  }
  function refreshTeacherTasksArea(scroll=false){
    if(roleTeacher() && State.teacherTasksOpen){ renderTeacherHomeWithTasks(scroll); return; }
    rerender();
  }
  function teacherTaskById(id){ return (State.data.teacherTasks||[]).find(t=>String(t.id)===String(id)); }
  function teacherTaskRows(){
    return (State.data.teacherTasks||[]).filter(t=>t && t.active!==false).sort((a,b)=>String(a.task_date||'9999-12-31').localeCompare(String(b.task_date||'9999-12-31')) || Number(a.done||0)-Number(b.done||0) || String(a.title||'').localeCompare(String(b.title||''),'es'));
  }
  function todayTeacherTasks(){
    const today=todayIso();
    return teacherTaskRows().filter(t=>String(t.task_date||today).slice(0,10)===today && !t.done);
  }
  function teacherTasksSummary(){
    const rows=todayTeacherTasks();
    if(!rows.length) return '<p class="teacher-task-empty">No tienes tareas pendientes para hoy.</p>';
    return `<ul class="teacher-task-summary-list">${rows.slice(0,4).map(t=>`<li>${safe(t.title||'Tarea sin título')}</li>`).join('')}${rows.length>4?`<li>+${rows.length-4} más</li>`:''}</ul>`;
  }
  function teacherTasksManager(){
    const rows=teacherTaskRows();
    const today=todayIso();
    const editing=State.pendingTeacherTaskEdit ? teacherTaskById(State.pendingTeacherTaskEdit) : null;
    const formTitle=editing ? (editing.title||'') : '';
    const formDate=editing ? String(editing.task_date||today).slice(0,10) : today;
    const formNotes=editing ? (editing.notes||'') : '';
    return `<section class="teacher-tasks-manager window-panel" id="teacherTasksManager"><header><div><p class="eyebrow">Tareas pendientes</p><h2>Agenda personal de Patricia</h2><p class="meta">Tareas personales y de Tribeca. Puedes añadir, editar, eliminar y marcar tareas como hechas. No se muestra en el panel del alumnado.</p></div><button type="button" class="secondary-btn" data-t114-close-tasks>Cerrar</button></header>
      <form class="teacher-task-form" data-t117-task-form onsubmit="return window.TribecaSaveTeacherTask(this,event)">
        <input type="hidden" name="id" value="${safe(editing?.id||'')}">
        <label>Tarea<input name="title" required maxlength="220" value="${safe(formTitle)}" placeholder="Ejemplo: preparar simulacro de Historia"></label>
        <label>Fecha<input name="taskDate" type="date" value="${safe(formDate)}" required></label>
        <label class="full-row">Notas<textarea name="notes" rows="2" maxlength="800" placeholder="Detalles opcionales">${safe(formNotes)}</textarea></label>
        <div class="teacher-task-form-actions"><button type="button" class="primary-btn" data-t117-save-task>${editing?'Guardar cambios':'Añadir tarea'}</button>${editing?'<button type="button" class="secondary-btn" data-t116-cancel-task-edit>Cancelar edición</button>':''}<span class="form-status teacher-task-status" data-t117-task-status></span></div>
      </form>
      <div class="teacher-task-list">${rows.length?rows.map(t=>`<article class="teacher-task-row ${t.done?'is-done':''}"><label><input type="checkbox" data-t114-toggle-task="${safe(t.id)}" ${t.done?'checked':''}><span><strong>${safe(t.title||'Tarea sin título')}</strong><small>${safe(fmtDate(t.task_date||today))}${t.notes?` · ${safe(t.notes)}`:''}</small></span></label><div class="teacher-task-row-actions"><button type="button" class="secondary-btn compact-btn" data-t116-edit-task="${safe(t.id)}">Editar</button><button type="button" class="secondary-btn compact-btn" data-t114-delete-task="${safe(t.id)}">Eliminar</button></div></article>`).join(''):'<div class="empty-state">No hay tareas pendientes anotadas.</div>'}</div>
    </section>`;
  }

  function parseStudentBirthDate(value=''){
    const raw=String(value||'').trim();
    if(!raw) return null;
    const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(!m) return null;
    return {year:Number(m[1]), month:Number(m[2]), day:Number(m[3]), iso:`${m[1]}-${m[2]}-${m[3]}`};
  }
  function birthdayMatchesDate(profile={}, date=new Date()){
    const b=parseStudentBirthDate(profile.birth_date || profile.date_of_birth);
    return !!b && b.month===date.getMonth()+1 && b.day===date.getDate();
  }
  function ageOnBirthday(profile={}, date=new Date()){
    const b=parseStudentBirthDate(profile.birth_date || profile.date_of_birth);
    if(!b?.year) return '';
    const age=date.getFullYear()-b.year;
    return age>0 ? age : '';
  }
  function studentBirthdaysToday(date=new Date()){
    return (State.data.students||[]).filter(s=>birthdayMatchesDate(s,date)).sort((a,b)=>displayName(a).localeCompare(displayName(b),'es'));
  }
  function teacherBirthdayNotice(date=new Date()){
    const rows=studentBirthdaysToday(date);
    if(!rows.length) return '';
    return `<article class="teacher-birthday-notice"><div><strong>🎂 Cumpleaños de hoy</strong><p>${rows.map(s=>{ const age=ageOnBirthday(s,date); return `${safe(displayName(s))}${age?` cumple ${age} años`:''}`; }).join(' · ')}</p></div><button type="button" class="secondary-btn compact-btn" data-t16-tool="studentProfiles">Ver perfil</button></article>`;
  }

  function scheduleRecordSeason(row={}){
    const raw=String(row.schedule_season || row.season || row.scheduleMode || row.mode || 'school').toLowerCase();
    return raw==='summer' || raw==='verano' ? 'summer' : 'school';
  }
  function activeScheduleSeason(){ return 'school'; }
  function activeScheduleSeasonForStudent(studentId){
    const rows=(State.data.schedules||[]).filter(x=>String(x.user_id)===String(studentId));
    const summerActive=rows.some(x=>scheduleRecordSeason(x)==='summer' && x.active!==false);
    const schoolActive=rows.some(x=>scheduleRecordSeason(x)==='school' && x.active!==false);
    return summerActive && !schoolActive ? 'summer' : 'school';
  }
  function scheduleSeasonLabel(season='school'){
    return season==='summer' ? 'horario de verano' : 'horario de curso escolar';
  }
  function setScheduleSeason(_season='school'){
    State.scheduleSeason='school';
    try{ localStorage.removeItem('tribeca-schedule-season-v144'); }catch(_e){}
    applyTribecaSeasonMode();
    toast('El modo verano global se ha eliminado. Activa el horario de cada alumno desde su perfil.');
    renderApp();
    rerender();
  }
  window.TribecaToggleScheduleSeason=function(input,ev){
    ev?.preventDefault?.(); ev?.stopPropagation?.();
    if(input) input.checked=false;
    setScheduleSeason('school');
    return false;
  };
  function teacherScheduleModeSwitch(){ return ''; }
  function studentScheduleRows(studentId, season=activeScheduleSeasonForStudent(studentId)){
    return (State.data.schedules||[])
      .filter(x=>String(x.user_id)===String(studentId) && x.active!==false && scheduleRecordSeason(x)===season)
      .sort((a,b)=>Number(a.weekday||0)-Number(b.weekday||0) || String(a.start_time||'').localeCompare(String(b.start_time||'')));
  }
  function buildStudentScheduleFromFormData(fd, prefix='schoolSchedule', season='school'){
    const activeSeason=String(fd.get('activeScheduleSeason')||'school')==='summer' ? 'summer' : 'school';
    const isActive=season===activeSeason;
    const weekdays=fd.getAll(`${prefix}Weekday`), starts=fd.getAll(`${prefix}Start`), ends=fd.getAll(`${prefix}End`), types=fd.getAll(`${prefix}Type`), notes=fd.getAll(`${prefix}Notes`);
    return weekdays.map((w,i)=>({
      weekday:Number(w),
      start_time:String(starts[i]||'').trim() || null,
      end_time:String(ends[i]||'').trim() || null,
      class_type:String(types[i]||'group').trim() || 'group',
      notes:String(notes[i]||'').trim(),
      schedule_season:season,
      season,
      active:isActive
    })).filter(r=>r.weekday && r.start_time && r.end_time);
  }
  function scheduleRowsEditor(rows=[], prefix='schoolSchedule'){
    const weekdayOptions = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
    return Array.from({length:12}, (_,i)=>i).map(i=>{
      const r=rows[i]||{};
      return `<div class="schedule-row t24-schedule-row" data-schedule-row="${safe(prefix)}"><label>Día<select name="${prefix}Weekday"><option value="">Sin clase</option>${weekdayOptions.map((d,idx)=>`<option value="${idx+1}" ${Number(r.weekday)===idx+1?'selected':''}>${d}</option>`).join('')}</select></label><label>Inicio<input name="${prefix}Start" type="time" value="${safe(String(r.start_time||'').slice(0,5))}"></label><label>Fin<input name="${prefix}End" type="time" value="${safe(String(r.end_time||'').slice(0,5))}"></label><label>Tipo<select name="${prefix}Type"><option value="group" ${r.class_type==='group'||!r.class_type?'selected':''}>Grupal</option><option value="individual" ${r.class_type==='individual'?'selected':''}>Individual</option></select></label><label>Notas<input name="${prefix}Notes" value="${safe(r.notes||'')}"></label></div>`;
    }).join('');
  }
  function schedulePresetToolbar(prefix='schoolSchedule', label='Horario', defaultStart='15:30', defaultEnd='16:30'){
    return `<div class="schedule-preset-toolbar" data-schedule-preset="${safe(prefix)}"><strong>Rellenado rápido</strong><label>Inicio<input type="time" value="${safe(defaultStart)}" data-schedule-preset-start="${safe(prefix)}"></label><label>Fin<input type="time" value="${safe(defaultEnd)}" data-schedule-preset-end="${safe(prefix)}"></label><label>Tipo<select data-schedule-preset-type="${safe(prefix)}"><option value="group">Grupal</option><option value="individual">Individual</option></select></label><div class="inline-actions"><button type="button" class="secondary-btn compact-btn" onclick="return window.TribecaFillScheduleWeek && window.TribecaFillScheduleWeek('${safe(prefix)}',5,event)">Lunes a viernes</button><button type="button" class="secondary-btn compact-btn" onclick="return window.TribecaFillScheduleWeek && window.TribecaFillScheduleWeek('${safe(prefix)}',3,event)">3 días</button><button type="button" class="secondary-btn compact-btn" onclick="return window.TribecaClearScheduleRows && window.TribecaClearScheduleRows('${safe(prefix)}',event)">Vaciar ${safe(label)}</button></div></div>`;
  }
  window.TribecaFillScheduleWeek=function(prefix='schoolSchedule', days=5, ev){
    ev?.preventDefault?.(); ev?.stopPropagation?.();
    const root=document.getElementById('t24StudentProfileForm') || document;
    const start=root.querySelector(`[data-schedule-preset-start="${CSS.escape(prefix)}"]`)?.value || (prefix==='summerSchedule'?'10:00':'15:30');
    const end=root.querySelector(`[data-schedule-preset-end="${CSS.escape(prefix)}"]`)?.value || (prefix==='summerSchedule'?'11:00':'16:30');
    const type=root.querySelector(`[data-schedule-preset-type="${CSS.escape(prefix)}"]`)?.value || 'group';
    const weekday=[...root.querySelectorAll(`[name="${CSS.escape(prefix)}Weekday"]`)];
    const starts=[...root.querySelectorAll(`[name="${CSS.escape(prefix)}Start"]`)];
    const ends=[...root.querySelectorAll(`[name="${CSS.escape(prefix)}End"]`)];
    const types=[...root.querySelectorAll(`[name="${CSS.escape(prefix)}Type"]`)];
    const notes=[...root.querySelectorAll(`[name="${CSS.escape(prefix)}Notes"]`)];
    const count=Math.min(Number(days)||5, weekday.length, 5);
    for(let i=0;i<count;i++){ weekday[i].value=String(i+1); starts[i].value=start; ends[i].value=end; if(types[i]) types[i].value=type; if(notes[i] && !notes[i].value) notes[i].value=''; }
    toast(`Horario aplicado a ${count} día${count===1?'':'s'}.`);
    return false;
  };
  window.TribecaClearScheduleRows=function(prefix='schoolSchedule', ev){
    ev?.preventDefault?.(); ev?.stopPropagation?.();
    const root=document.getElementById('t24StudentProfileForm') || document;
    ['Weekday','Start','End','Notes'].forEach(suffix=>root.querySelectorAll(`[name="${CSS.escape(prefix)}${suffix}"]`).forEach(el=>{ el.value=''; }));
    root.querySelectorAll(`[name="${CSS.escape(prefix)}Type"]`).forEach(el=>{ el.value='group'; });
    toast('Horario vaciado. Recuerda guardar cambios.');
    return false;
  };
  function defaultPlanningSlots(season=activeScheduleSeason()){
    return season==='summer'
      ? [['09:00','10:00'],['10:00','11:00'],['11:00','12:00'],['12:00','13:00'],['13:00','14:00']]
      : [['15:30','16:30'],['16:30','17:30'],['17:30','18:30'],['18:30','19:30'],['19:30','20:30'],['20:30','21:30']];
  }
  function scheduleSlotsForSeason(season=activeScheduleSeason(), blank=false){
    const base=defaultPlanningSlots(season);
    if(blank) return base;
    const schedules=(State.data.schedules||[]).filter(r=>r.active!==false && scheduleRecordSeason(r)===season);
    const map=new Map(base.map(([s,e])=>[`${s}-${e}`,[s,e]]));
    schedules.forEach(r=>{ const s=String(r.start_time||'').slice(0,5); const e=String(r.end_time||'').slice(0,5); if(s&&e) map.set(`${s}-${e}`,[s,e]); });
    return [...map.values()].sort((a,b)=>a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  }
  function schedulePlanningTable(season=activeScheduleSeason(), blank=false){
    const days=['LUNS','MARTES','MÉRCORES','XOVES','VENRES'];
    const rows=scheduleSlotsForSeason(season, blank);
    const schedules=blank ? [] : (State.data.schedules||[]).filter(r=>r.active!==false && scheduleRecordSeason(r)===season);
    return `<table class="planning-pdf-table ${blank?'is-blank-planning':'is-filled-planning'}"><thead><tr><th>Horario</th>${days.map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>${rows.map(([start,end])=>`<tr><th>${safe(start)}-${safe(end)}</th>${[1,2,3,4,5].map(day=>{ const items=schedules.filter(r=>Number(r.weekday)===day && String(r.start_time||'').slice(0,5)===start && String(r.end_time||'').slice(0,5)===end); return `<td>${items.length?items.map(r=>{ const st=(State.data.students||[]).find(s=>String(s.id)===String(r.user_id))||{}; return `<strong>${safe(displayName(st))}</strong><br><span>${safe(r.class_type==='individual'?'Individual':'Grupo')}</span>${r.notes?`<br><small>${safe(r.notes)}</small>`:''}`; }).join('<hr>'):'&nbsp;'}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function teacherWelcomePanel(){
    const today=new Date();
    const dateText=today.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const {start,end}=teacherWeekBounds(today);
    const events=weekEventsForTeacher();
    const byDay=new Map();
    events.forEach(e=>{ if(!byDay.has(e.date)) byDay.set(e.date, []); byDay.get(e.date).push(e); });
    const summary=events.length?Array.from(byDay.entries()).map(([date,items])=>`<article class="teacher-week-day"><strong>${safe(fmtDate(date))}</strong>${items.slice(0,4).map(e=>`<span class="event-${safe(eventColorType(e))}"><i class="day-event-dot event-${safe(eventColorType(e))}"></i>${safe(e.title)}</span>`).join('')}${items.length>4?`<em>+${items.length-4} más</em>`:''}</article>`).join(''):'<div class="empty-state teacher-week-empty">No hay eventos previstos esta semana.</div>';
    const pending=todayTeacherTasks().length;
    const birthdayNotice=teacherBirthdayNotice(today);
    return `<section class="teacher-welcome-panel window-panel teacher-welcome-panel-v114"><div class="teacher-welcome-copy"><p class="eyebrow">Tribeca Aula</p><h2>Buenos días, Patricia </h2><p>${safe(dateText.charAt(0).toUpperCase()+dateText.slice(1))}</p><span>Semana natural: ${safe(fmtDate(start))} - ${safe(fmtDate(end))}</span>${birthdayNotice}${teacherScheduleModeSwitch()}</div><div class="teacher-week-summary"><h3>Eventos de la semana</h3>${summary}</div><article class="teacher-tasks-summary" data-t114-open-tasks role="button" tabindex="0" aria-label="Abrir tareas pendientes"><div><h3>Tareas pendientes</h3><p>${pending?`${pending} tarea${pending===1?'':'s'} para hoy`:'Sin tareas para hoy'}</p></div>${teacherTasksSummary()}</article></section>`;
  }
  function activeClassroomsQuickAccess(){
    const rows=(State.data.classrooms||[]).filter(c=>c && c.active!==false && !c.hidden).sort((a,b)=>String(a.center||'').localeCompare(String(b.center||''),'es') || String(a.course||'').localeCompare(String(b.course||''),'es',{numeric:true}) || String(a.name||'').localeCompare(String(b.name||''),'es'));
    if(!rows.length) return `<section class="teacher-quick-classes window-panel"><div class="section-heading teacher-local-heading"><h2>Clases activas</h2><span>0 clases</span></div><div class="empty-state">Todavía no hay clases activas.</div></section>`;
    return `<section class="teacher-quick-classes window-panel"><div class="section-heading teacher-local-heading"><h2>Clases activas</h2><span>${rows.length} clase${rows.length===1?'':'s'}</span></div><div class="teacher-quick-class-grid">${rows.map(c=>{ const assigned=classroomStudents(c.id); const subjects=classroomSubjects(c.id); const units=(State.data.classUnits||[]).filter(u=>subjects.some(s=>String(s.id)===String(u.class_subject_id))); const mats=(State.data.materials||[]).filter(m=>String(m.class_id||'')===String(c.id)); return `<article class="teacher-quick-class-card ${classroomThemeClass(c)}" style="${safe(classroomThemeStyle(c))}" tabindex="0" role="button" data-t90-open-class="${safe(c.id)}"><div><p>${safe(c.academic_year||currentAcademicYearLabel())}</p><h3>${safe(classroomLabel(c))}</h3><small>${safe([c.center,c.stage,c.course].filter(Boolean).join(' · '))}</small></div><footer><span>${assigned.length} alumno${assigned.length===1?'':'s'}</span><span>${subjects.length} materia${subjects.length===1?'':'s'}</span><span>${units.length} unidad${units.length===1?'':'es'}</span><span>${mats.length} pub.</span></footer></article>`; }).join('')}</div></section>`;
  }
  function teacherHome() {
    const students=State.data.students||[]; const passReq=(State.data.passwordRequests||[]).filter(r=>r.status==='pending').length;
    const tools=[
      ['newPublication','✍️','Nueva publicación','Crear anuncios o materiales y vincularlos a una clase, materia y unidad.'],
      ['videoclasses','🎥','Videoclases','Programa enlaces de Google Meet para clases online y proyección de documentos.'],
      ['teacherAlerts','⚠️','Alertas docentes','Suspensos, materias con dificultades, solicitudes de contraseña y avisos pendientes.'],
      ['classOverview','📊','Vista general del aula','Cada grupo aparece en una tarjeta con alumnado, clases, asistencia y avisos básicos.'],
      ['activityAnalytics','📈','Actividad del alumnado','Intentos, puntuaciones, repeticiones y alertas de mejora en actividades autocorregibles.'],
      ['teacherDocuments','🧾','Documentos PDF','Recibís, históricos económicos, horario semanal, ficha de alumnado y documentos útiles.'],
      ['passwordRequests','🔐','Solicitudes de recuperación','Solicitudes realizadas por el alumnado para restablecer contraseña.'],
      ['studentProfiles','👤','Perfiles del alumnado','Editar nombre, apellidos, usuario, centro, etapa, curso, horario, NEE, NEAE y observaciones.'],
      ['classrooms','🏫','Clases','Crear aulas permanentes por centro y curso, al estilo Google Classroom.'],
      ['payments','💶','Pagos','Tarifas, mensualidades, meses pagados, recibís e histórico económico.'],
      ['attendance','📅','Asistencia y pausas','Registro de asistencia, faltas justificadas y pausas temporales de acceso.']
    ];
    const alertCount = teacherAlertCount();
    const unseenAlerts = Math.max(0, alertCount - Number(localStorage.getItem(`tribeca-alerts-seen-${State.profile.id}`)||0));
    return `<section class="teacher-dashboard t16-dashboard teacher-dashboard-v112">${teacherWelcomePanel()}${State.teacherTasksOpen?teacherTasksManager():''}<div class="section-heading teacher-heading-premium"><h2>Panel docente</h2><div class="teacher-stats"><span>${students.length} perfiles</span><span>${passReq} solicitudes de contraseña</span><span>${alertCount} alertas</span></div></div><div class="t16-teacher-tools">${tools.map(([id,ic,title,desc])=>`<article class="t16-tool-card" role="button" tabindex="0" data-t16-tool="${id}"><span class="t16-tool-icon teacher-legacy-icon">${safe(ic)}</span><div><h3>${safe(title)}</h3><p>${safe(desc)}</p></div>${id==='passwordRequests'&&passReq?`<em>${passReq}</em>`:''}${id==='teacherAlerts'&&unseenAlerts?`<em id="teacherAlertsBadge">${unseenAlerts}</em>`:''}</article>`).join('')}</div>${videoClassesHomePanel()}${activeClassroomsQuickAccess()}</section>`;
  }

  
  function videoClassStartsAt(v={}){ return v.starts_at || v.start_time || v.date_time || v.scheduled_at || v.event_date || ''; }
  function videoClassDateText(v={}){
    const raw=videoClassStartsAt(v);
    const t=raw ? Date.parse(raw) : NaN;
    if(!Number.isFinite(t)) return 'Fecha por confirmar';
    return new Date(t).toLocaleString('es-ES',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  }
  function visibleVideoClasses(profile=State.profile){
    const now = Date.now() - 2*60*60*1000;
    return (State.data.videoClasses||[]).filter(v=>{
      if(!v || v.hidden) return roleTeacher();
      if(!roleTeacher() && !visibleForProfile(v, profile)) return false;
      const t=Date.parse(videoClassStartsAt(v));
      return !Number.isFinite(t) || roleTeacher() || t >= now;
    }).sort((a,b)=>(Date.parse(videoClassStartsAt(a))||0)-(Date.parse(videoClassStartsAt(b))||0));
  }
  function upcomingVideoClasses(limit=3){ return visibleVideoClasses().filter(v=>{ const t=Date.parse(videoClassStartsAt(v)); return !Number.isFinite(t) || t >= Date.now()-30*60*1000; }).slice(0,limit); }
  function videoClassVisibilityLabel(v={}){ return calendarEventVisibilityLabel(v); }
  function videoClassCard(v={}, teacher=false){
    const url=v.meet_url || v.url || v.link_url || '';
    return `<article class="video-class-card-v173 ${v.hidden?'is-hidden-item':''}"><div class="video-class-icon-v173">🎥</div><div><p class="eyebrow">${safe(videoClassDateText(v))}</p><h3>${safe(v.title||'Videoclase')}</h3><p>${safe(v.description||v.body||'Videoclase por Google Meet con posibilidad de proyección de documentos.')}</p><small>${safe(videoClassVisibilityLabel(v))}${v.hidden?' · Oculta':''}</small><div class="inline-actions">${url?`<a class="primary-btn" href="${safe(url)}" target="_blank" rel="noopener">Entrar en Google Meet</a>`:''}${teacher?`<button type="button" class="secondary-btn" data-t173-toggle-video-class="${safe(v.id)}">${v.hidden?'Mostrar':'Ocultar'}</button><button type="button" class="danger-btn" data-t173-delete-video-class="${safe(v.id)}">Eliminar</button>`:''}</div></div></article>`;
  }
  function videoClassesHomePanel(){
    const rows=upcomingVideoClasses(roleTeacher()?4:2);
    const emptyText=roleTeacher() ? 'Todavía no tienes videoclases próximas programadas.' : 'Todavía no hay videoclases programadas para ti.';
    return `<section class="video-classes-home-v173 video-classes-home-v175 window-panel"><div><p class="eyebrow">Videoclases</p><h2>${roleTeacher()?'Próximas videoclases':'Tus videoclases'}</h2><p class="meta">Enlaces de Google Meet disponibles desde el aula virtual.</p></div><div class="video-class-grid-v173">${rows.length?rows.map(v=>videoClassCard(v, roleTeacher())).join(''):`<article class="video-class-card-v173 video-class-empty-card-v175"><div class="video-class-icon-v173">🎥</div><div><p class="eyebrow">Google Meet</p><h3>Sin videoclases próximas</h3><p>${safe(emptyText)}</p><small>Cuando se programe una videoclase aparecerá aquí y en el apartado Videoclases.</small></div></article>`}</div><button type="button" class="secondary-btn" data-t16-tool="videoclasses">Abrir videoclases</button></section>`;
  }
  function videoClassTargetSelector(v=null){
    const classes=(State.data.classrooms||[]).filter(c=>c && c.active!==false && !c.hidden).sort((a,b)=>classroomLabel(a).localeCompare(classroomLabel(b),'es'));
    const selected=new Set(targetClassIds(v));
    return `<div class="video-class-targets-v173"><p class="meta">Puedes hacerla visible para todo el alumnado o limitarla a clases concretas.</p><div class="calendar-class-grid-v163">${classes.map(c=>`<label><input type="checkbox" name="targetClassIds" value="${safe(c.id)}" ${selected.has(String(c.id))?'checked':''}><span><strong>${safe(classroomLabel(c))}</strong><small>${safe([c.center,c.stage,c.course].filter(Boolean).join(' · '))}</small></span></label>`).join('')}</div></div>`;
  }
  function videoclassesContent(){
    const teacher=roleTeacher();
    const rows=visibleVideoClasses();
    const next=rows.filter(v=>{ const t=Date.parse(videoClassStartsAt(v)); return !Number.isFinite(t) || t >= Date.now()-30*60*1000; });
    const past=rows.filter(v=>{ const t=Date.parse(videoClassStartsAt(v)); return Number.isFinite(t) && t < Date.now()-30*60*1000; });
    const form=teacher?`<section class="videoclass-focus-composer-v174 window-panel">
      <div class="videoclass-composer-head-v174"><span class="teacher-legacy-icon">🎥</span><div><p class="eyebrow">Google Meet</p><h3>Programar videoclase</h3><p>Enlace claro para clases online, recuperación puntual o proyección de documentos cuando un alumno no puede venir presencialmente.</p></div></div>
      <form class="video-class-form-v173 video-class-form-v174 form-grid" method="post" action="javascript:void(0)" onsubmit="return false;">
        <div class="videoclass-form-row-v174"><label>Título<input name="title" required placeholder="Ej.: Repaso de matemáticas online"></label><label>Fecha y hora<input name="startsAt" type="datetime-local" required></label></div>
        <label>Enlace de Google Meet<input name="meetUrl" type="url" required placeholder="https://meet.google.com/..."></label>
        <label>Descripción o documentos que se proyectarán<textarea name="description" rows="4" placeholder="Indica qué veremos, qué debe preparar el alumno/a o qué documento se proyectará."></textarea></label>
        <div class="videoclass-form-row-v174"><label>Visibilidad<select name="scope"><option value="all">Todo el alumnado</option><option value="classes">Por clases concretas</option><option value="user">Solo para mí</option></select></label><div class="videoclass-form-tip-v174"><strong>Consejo</strong><span>Si eliges clases concretas, marca abajo una o varias. El alumnado destinatario verá la videoclase en su pantalla principal.</span></div></div>
        ${videoClassTargetSelector()}
        <div class="videoclass-save-bar-v174"><button type="button" class="primary-btn" data-t173-save-video-class>Guardar videoclase</button><span>Se enviará notificación de la app al alumnado destinatario si tiene el dispositivo registrado.</span></div>
      </form>
    </section>`:'';
    const upcomingHtml=next.length?next.map(v=>videoClassCard(v, teacher)).join(''):'<div class="empty-state premium-empty">No hay videoclases próximas.</div>';
    const pastHtml=past.length?`<details class="teacher-option-drawer videoclass-history-v174"><summary><span>Videoclases anteriores</span><em>${past.length}</em></summary><div class="video-class-grid-v173">${past.map(v=>videoClassCard(v, teacher)).join('')}</div></details>`:'';
    return `<section class="videoclasses-panel-v173 videoclasses-focus-v174"><div class="window-panel video-class-hero-v173 video-class-hero-v174"><div><p class="eyebrow">Videoclases</p><h2>${teacher?'Videoclases con Google Meet':'Tus videoclases'}</h2><p>${teacher?'Programa, revisa y abre enlaces de Meet desde un panel limpio y rápido, con avisos visibles para el alumnado.':'Aquí verás las videoclases que la profesora haya programado para ti.'}</p></div><span class="videoclass-hero-badge-v174">${next.length} próxima${next.length===1?'':'s'}</span></div>${form}<section class="window-panel videoclass-list-panel-v174"><div class="section-heading"><h3>Próximas videoclases</h3><span>${next.length}</span></div><div class="video-class-grid-v173 video-class-grid-v174">${upcomingHtml}</div></section>${pastHtml}</section>`;
  }
  async function saveVideoClass(form){
    if(!roleTeacher()) return;
    const fd=new FormData(form);
    const classIds=[...new Set(fd.getAll('targetClassIds').map(String).map(x=>x.trim()).filter(Boolean))];
    const scope=String(fd.get('scope')||'all');
    if(scope==='classes' && !classIds.length) return toast('Selecciona al menos una clase o cambia la visibilidad.');
    const firstClass=classIds.length ? classById(classIds[0]) : null;
    const startsRaw=String(fd.get('startsAt')||'').trim();
    const startsDate=startsRaw ? new Date(startsRaw) : null;
    if(!startsDate || !Number.isFinite(startsDate.getTime())) return toast('Completa una fecha y hora válidas.');
    const rec={title:String(fd.get('title')||'').trim(), description:String(fd.get('description')||'').trim(), body:String(fd.get('description')||'').trim(), meet_url:String(fd.get('meetUrl')||'').trim(), starts_at:startsDate.toISOString(), target_scope:scope, scope, target_class_ids:classIds, center:firstClass?.center||null, stage:firstClass?.stage||null, course:firstClass?.course||null, created_by:State.profile.id, hidden:false};
    if(!rec.title || !rec.meet_url) return toast('Completa título y enlace de Meet.');
    const saved=await persistSupabaseRecord('tribeca_video_classes', rec, null);
    await log('videoclass','Videoclase programada',{title:rec.title,starts_at:rec.starts_at});
    if(scope!=='user') await tribecaDispatchPushNotification('calendar',{title:`Nueva videoclase: ${rec.title}`, body:`${videoClassDateText(rec)} · Enlace de Google Meet disponible en Tribeca Aula.`, targetScope:scope, targetClassIds:classIds, classIds, center:rec.center, stage:rec.stage, course:rec.course, section:'videoclasses'});
    await loadData(true);
    toast('Videoclase programada.');
    form.reset();
    rerender();
  }
  async function deleteVideoClass(id){
    if(!roleTeacher() || !id) return;
    if(!confirm('¿Eliminar esta videoclase?')) return;
    await maybe(table('tribeca_video_classes').delete().eq('id',id));
    await loadData(true);
    toast('Videoclase eliminada.');
    rerender();
  }
  async function toggleVideoClassHidden(id){
    if(!roleTeacher() || !id) return;
    const v=(State.data.videoClasses||[]).find(x=>String(x.id)===String(id));
    if(!v) return;
    await maybe(table('tribeca_video_classes').update({hidden:!v.hidden}).eq('id',id));
    await loadData(true);
    toast(v.hidden?'Videoclase visible.':'Videoclase oculta.');
    rerender();
  }

function studentAssignedClasses(studentId=State.profile?.id){
    const assignments=(State.data.classStudents||[]).filter(a=>String(a.user_id)===String(studentId) && a.active!==false);
    const ids=new Set(assignments.map(a=>String(a.class_id)));
    return (State.data.classrooms||[]).filter(c=>ids.has(String(c.id)) && c.active!==false && !c.hidden).sort((a,b)=>String(a.center||'').localeCompare(String(b.center||''),'es') || String(a.course||'').localeCompare(String(b.course||''),'es',{numeric:true}));
  }
  function classSubjectsForStudentClass(classId){
    return (State.data.classSubjects||[]).filter(s=>String(s.class_id)===String(classId) && s.active!==false && !s.hidden).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0) || String(a.subject||'').localeCompare(String(b.subject||''),'es'));
  }
  function visibleClassUnitsForSubject(classSubjectId){
    const teacher = roleTeacher();
    return (State.data.classUnits||[]).filter(u=>String(u.class_subject_id)===String(classSubjectId) && u.active!==false && (teacher || !u.hidden)).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0) || String(a.title||'').localeCompare(String(b.title||''),'es',{numeric:true}));
  }
  function materialsForClassSubject(classSubjectId){
    const s=classSubjectById(classSubjectId);
    if(!s) return [];
    return sortMaterialsAsc((State.data.materials||[]).filter(m=>visibleForProfile(m) && (String(m.class_subject_id||'')===String(classSubjectId) || (String(m.class_id||'')===String(s.class_id) && String(m.subject||'')===String(s.subject||'')))));
  }
  function materialsForClassUnit(classUnitId, classSubjectId=''){
    const u=classUnitById(classUnitId);
    if(!u) return [];
    const s=classSubjectById(classSubjectId || u.class_subject_id);
    return sortMaterialsAsc((State.data.materials||[]).filter(m=>visibleForProfile(m) && (String(m.class_unit_id||'')===String(classUnitId) || (s && String(m.class_subject_id||'')===String(s.id) && String(m.unit_title||m.unit||'')===String(u.title||'')))));
  }
  function classSubjectProgress(classSubjectId){
    const mats=materialsForClassSubject(classSubjectId);
    const total=mats.length;
    const done=mats.filter(m=>isMaterialCompleted(m.id)).length;
    const percent=total?Math.round((done/total)*100):0;
    return {total,done,percent};
  }
  function studentClassesMarkup(){
    const classes=studentAssignedClasses();
    if(!classes.length) return '';
    if(studentFocusModeEnabled(State.profile)) return focusStudentClassesMarkup(classes);
    return `<section class="student-classroom-area"><div class="section-heading"><h2>Mis clases</h2><span>${classes.length} clase${classes.length===1?'':'s'} activa${classes.length===1?'':'s'}</span></div>${classes.map(studentClassroomCard).join('')}</section>`;
  }
  function focusStudentClassesMarkup(classes=studentAssignedClasses()){
    const subjects=[];
    classes.forEach(c=>classSubjectsForStudentClass(c.id).forEach((s,i)=>subjects.push({s,c,i})));
    if(!subjects.length) return `<section class="focus-study-area panel"><h2>Tu materia</h2><p>Todavía no hay una materia visible asignada.</p></section>`;
    return `<section class="focus-study-area"><div class="section-heading focus-study-heading"><h2>Tu materia</h2><span>${subjects.length} materia${subjects.length===1?'':'s'} activa${subjects.length===1?'':'s'}</span></div><div class="focus-study-grid">${subjects.map(({s,c,i})=>focusStudySubjectCard(s,c,i)).join('')}</div></section>`;
  }
  function focusStudySubjectCard(s,c={},i=0){
    c = c || {};
    i = Number(i || 0);
    const vis=subjectVisual(s.subject);
    const units=visibleClassUnitsForSubject(s.id);
    const mats=materialsForClassSubject(s.id);
    const pr=classSubjectProgress(s.id);
    const firstUnit=units[0]?.title || 'Primera unidad';
    const study=isStudySkillsSubject(s.subject);
    return `<article class="subject-card class-subject-card focus-study-card ${study?'study-skills-subject-card':''} subject-${i%6}" tabindex="0" role="button" data-class-subject="${safe(s.id)}" data-class-id="${safe(c.id)}" data-subject="${safe(s.subject)}" style="--subject-color:${vis.color}">
      ${study?studySkillsBannerMarkup():''}
      <div class="focus-study-icon">${safe(vis.glyph)}</div>
      <div class="focus-study-copy">
        <p class="eyebrow">${safe(c.center || 'Tribeca Aula')}</p>
        <h3>${safe(s.subject)}</h3>
        <p>Empieza por <strong>${safe(firstUnit)}</strong>. Abre la unidad y trabaja una actividad cada vez.</p>
        <div class="focus-study-steps"><span>1. Abrir</span><span>2. Leer</span><span>3. Practicar</span><span>4. Revisar</span></div>
      </div>
      <div class="focus-study-progress"><strong>${pr.percent}%</strong><span>${pr.done}/${pr.total || mats.length} hechas</span></div>
    </article>`;
  }
  function studentClassroomCard(c){
    const subjects=classSubjectsForStudentClass(c.id);
    const totalMaterials=subjects.reduce((acc,s)=>acc+materialsForClassSubject(s.id).length,0);
    const done=subjects.reduce((acc,s)=>acc+materialsForClassSubject(s.id).filter(m=>isMaterialCompleted(m.id)).length,0);
    const percent=totalMaterials?Math.round((done/totalMaterials)*100):0;
    return `<article class="student-classroom-card panel">
      <header><div><p class="eyebrow">${safe(c.academic_year||currentAcademicYearLabel())}</p><h3>${safe(classroomLabel(c))}</h3><p>${safe([c.center,c.stage,c.course].filter(Boolean).join(' · '))}</p></div><strong>${percent}%</strong></header>
      <div class="progress"><span style="width:${percent}%"></span></div>
      <small>${done}/${totalMaterials} materiales hechos.</small>
      <div class="student-class-subject-grid">${subjects.length?subjects.map((s,i)=>classSubjectCard(s,i,c)).join(''):'<div class="empty-state">Esta clase todavía no tiene materias visibles.</div>'}</div>
    </article>`;
  }
  function classSubjectCard(s,i,c){
    if(studentFocusModeEnabled(State.profile)) return focusStudySubjectCard(s,c,i);
    const vis=subjectVisual(s.subject);
    const units=visibleClassUnitsForSubject(s.id);
    const mats=materialsForClassSubject(s.id);
    const pr=classSubjectProgress(s.id);
    const study=isStudySkillsSubject(s.subject);
    return `<article class="subject-card class-subject-card ${study?'study-skills-subject-card':''} subject-${i%6}" tabindex="0" role="button" data-class-subject="${safe(s.id)}" data-class-id="${safe(c.id)}" data-subject="${safe(s.subject)}" style="--subject-color:${vis.color}">
      ${study?studySkillsBannerMarkup():''}
      <div class="subject-top"><span>${safe(c.course||'')}</span></div>
      <div class="subject-mark">${safe(vis.glyph)}</div>
      <h3>${safe(s.subject)}</h3>
      <p>${mats.length} publicaciones · ${units.length||0} unidades</p>
      <div class="progress-row"><span>Progreso</span><strong>${pr.percent}%</strong></div>
      <div class="progress"><span style="width:${pr.percent}%"></span></div>
      <small>${pr.done}/${pr.total} publicaciones hechas.</small>
    </article>`;
  }
  function focusStudentHome(){
    const p=State.profile;
    const classes=studentAssignedClasses(p?.id);
    const legacySubjects=subjectList(p);
    const classHtml=classes.length ? studentClassesMarkup() : `<section class="section-heading focus-heading"><h2>${safe(uiLabel('yourSubject'))}</h2><span>${safe(p?.course||'')}</span></section><section class="subjects-grid focus-subjects" id="subjectsGrid">${legacySubjects.map((s,i)=>subjectCard(s,i)).join('')}</section>`;
    return `<section class="hero-card panel focus-hero-card"><div class="hero-main"><p class="eyebrow">${safe(uiLabel('focusMode'))}</p><h1><span class="hero-wave" aria-hidden="true">👋</span> ${safe(uiLabel('hello'))}, <span id="studentHeroName">${safe(displayName(p))}</span></h1><p>${safe(uiLabel('focusIntro'))}</p><p class="muted">${safe(academicLine(p))}</p></div></section><section class="focus-next-step panel"><strong>${safe(uiLabel('now'))}:</strong><span>${safe(uiLabel('focusNext'))}</span></section>${videoClassesHomePanel()}${classHtml}`;
  }

  function uiLocale(){
    const code=currentLangCode();
    return ({es:'es-ES',gl:'gl-ES',en:'en-GB',fr:'fr-FR',pl:'pl-PL',de:'de-DE',pt:'pt-PT'})[code] || (roleTeacher()?'es-ES':'gl-ES');
  }
  function uiLabel(key){
    const code=currentLangCode();
    const dict={
      personalPanel:{es:'Panel personal de aprendizaje',gl:'Panel persoal de aprendizaxe',en:'Personal learning panel',fr:'Espace personnel d’apprentissage',pl:'Osobisty panel nauki',de:'Persönlicher Lernbereich',pt:'Painel pessoal de aprendizagem'},
      hello:{es:'Hola',gl:'Ola',en:'Hello',fr:'Bonjour',pl:'Witaj',de:'Hallo',pt:'Olá'},
      mySubjects:{es:'Mis materias',gl:'As miñas materias',en:'My subjects',fr:'Mes matières',pl:'Moje przedmioty',de:'Meine Fächer',pt:'As minhas disciplinas'},
      publications:{es:'publicaciones',gl:'publicacións',en:'posts',fr:'publications',pl:'publikacje',de:'Veröffentlichungen',pt:'publicações'},
      publication:{es:'publicación',gl:'publicación',en:'post',fr:'publication',pl:'publikacja',de:'Veröffentlichung',pt:'publicação'},
      units:{es:'unidades',gl:'unidades',en:'units',fr:'unités',pl:'działy',de:'Einheiten',pt:'unidades'},
      unit:{es:'unidad',gl:'unidade',en:'unit',fr:'unité',pl:'dział',de:'Einheit',pt:'unidade'},
      progress:{es:'Progreso',gl:'Progreso',en:'Progress',fr:'Progression',pl:'Postęp',de:'Fortschritt',pt:'Progresso'},
      donePublications:{es:'publicaciones hechas',gl:'publicacións feitas',en:'posts completed',fr:'publications terminées',pl:'ukończone publikacje',de:'erledigte Veröffentlichungen',pt:'publicações concluídas'},
      focusMode:{es:'Modo concentración',gl:'Modo concentración',en:'Focus mode',fr:'Mode concentration',pl:'Tryb skupienia',de:'Konzentrationsmodus',pt:'Modo concentração'},
      focusIntro:{es:'Trabaja con calma, paso a paso. Abre tu materia, entra en una unidad y completa una actividad cada vez.',gl:'Traballa con calma, paso a paso. Abre a túa materia, entra nunha unidade e completa unha actividade cada vez.',en:'Work calmly, step by step. Open your subject, enter one unit and complete one activity at a time.',fr:'Travaille calmement, étape par étape. Ouvre ta matière, entre dans une unité et fais une activité à la fois.',pl:'Pracuj spokojnie, krok po kroku. Otwórz przedmiot, wejdź do działu i wykonuj po jednej aktywności.',de:'Arbeite ruhig, Schritt für Schritt. Öffne dein Fach, gehe in eine Einheit und bearbeite jeweils eine Aktivität.',pt:'Trabalha com calma, passo a passo. Abre a tua disciplina, entra numa unidade e completa uma atividade de cada vez.'},
      now:{es:'Ahora',gl:'Agora',en:'Now',fr:'Maintenant',pl:'Teraz',de:'Jetzt',pt:'Agora'},
      focusNext:{es:'elige tu materia y continúa con la primera unidad disponible.',gl:'escolle a túa materia e continúa coa primeira unidade dispoñible.',en:'choose your subject and continue with the first available unit.',fr:'choisis ta matière et continue avec la première unité disponible.',pl:'wybierz przedmiot i kontynuuj od pierwszego dostępnego działu.',de:'wähle dein Fach und mache mit der ersten verfügbaren Einheit weiter.',pt:'escolhe a tua disciplina e continua com a primeira unidade disponível.'},
      yourSubject:{es:'Tu materia',gl:'A túa materia',en:'Your subject',fr:'Ta matière',pl:'Twój przedmiot',de:'Dein Fach',pt:'A tua disciplina'}
    };
    return dict[key]?.[code] || dict[key]?.[roleTeacher()?'es':'gl'] || key;
  }
  function uiPlural(count, singularKey, pluralKey){
    return Number(count)===1 ? uiLabel(singularKey) : uiLabel(pluralKey);
  }

  function studentHome() {
    const p=State.profile;
    if(studentFocusModeEnabled(p)) return focusStudentHome();
    const subjects=subjectList(p);
    const dateLabel = new Intl.DateTimeFormat(uiLocale(), {weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
    return `<section class="hero-card panel hero-welcome-card"><div class="hero-main"><p class="eyebrow">${safe(uiLabel('personalPanel'))}</p><h1><span class="hero-wave" aria-hidden="true">👋</span> ${safe(uiLabel('hello'))}, <span id="studentHeroName">${safe(displayName(p))}</span></h1><p>${safe(dateLabel)}</p><p class="muted">${safe(academicLine(p))}</p></div></section>${videoClassesHomePanel()}<section class="section-heading"><h2>${safe(uiLabel('mySubjects'))}</h2><span>${safe(p.course||'')}</span></section><section class="subjects-grid" id="subjectsGrid">${subjects.map((s,i)=>subjectCard(s,i)).join('')}</section>`;
  }
  function subjectCard(subject, i) { const vis=subjectVisual(subject); const mats=visibleMaterials(subject); const units=new Set(mats.map(m=>m.unit_title||m.unit||'Unidad 1')); const pr=subjectProgress(subject); const study=isStudySkillsSubject(subject); return `<article class="subject-card ${study?'study-skills-subject-card':''} subject-${i%6}" tabindex="0" role="button" data-subject="${safe(subject)}" style="--subject-color:${vis.color}">${study?studySkillsBannerMarkup():''}<div class="subject-top"><span>${safe(State.profile.course||'')}</span></div><div class="subject-mark">${safe(vis.glyph)}</div><h3>${safe(subject)}</h3><p>${mats.length} ${safe(uiPlural(mats.length,'publication','publications'))} · ${units.size||0} ${safe(uiPlural(units.size||0,'unit','units'))}</p><div class="progress-row"><span>${safe(uiLabel('progress'))}</span><strong>${pr.percent}%</strong></div><div class="progress"><span style="width:${pr.percent}%"></span></div><small>${pr.done}/${pr.total} ${safe(uiLabel('donePublications'))}.</small></article>`; }
  function bindSubjectCards(){ 
    $$('.subject-card[data-class-subject]').forEach(card=>{card.addEventListener('click',ev=>{ev.preventDefault(); ev.stopPropagation(); openTool('classSubjectDetail', {classSubjectId:card.dataset.classSubject, classId:card.dataset.classId, subject:card.dataset.subject});});});
    $$('.subject-card[data-subject]:not([data-class-subject])').forEach(card=>{card.addEventListener('click',ev=>{ev.preventDefault(); ev.stopPropagation(); openTool('subjectDetail', {subject:card.dataset.subject});});}); 
  }
  function studentBadgeSummary(){ const earned=(State.data.userBadges||[]).filter(b=>b.user_id===State.profile?.id || b.student_id===State.profile?.id).length; if(earned) return `${earned} insignia${earned===1?'':'s'} asignada${earned===1?'':'s'} por la profesora`; return 'Sin insignias todavía.'; }

  function completionRows(){ return State.data.materialCompletions || []; }
  function completionStorageKey(materialId, userId=State.profile?.id){ return `tribeca-material-done-${userId||'anon'}-${materialId}`; }
  function isMaterialCompleted(materialId, userId=State.profile?.id){
    if(!materialId || !userId) return false;
    const row = completionRows().find(r => String(r.material_id)===String(materialId) && String(r.user_id)===String(userId));
    if(row) return row.completed !== false;
    return localStorage.getItem(completionStorageKey(materialId,userId)) === '1';
  }
  function subjectProgress(subject){
    const mats = visibleMaterials(subject).filter(m=>!m.hidden);
    const total = mats.length;
    const done = mats.filter(m=>isMaterialCompleted(m.id)).length;
    const percent = total ? Math.round((done/total)*100) : 0;
    return {total, done, percent};
  }
  async function toggleMaterialCompletion(materialId){
    if(roleTeacher()) return;
    const m=(State.data.materials||[]).find(x=>String(x.id)===String(materialId));
    if(!m) return toast('No se encontró la publicación.');
    const current = isMaterialCompleted(materialId);
    const next = !current;
    localStorage.setItem(completionStorageKey(materialId), next ? '1' : '0');
    try{
      if(next){
        await table('material_completions').upsert({user_id:State.profile.id, material_id:materialId, subject:m.subject||null, completed:true, completed_at:new Date().toISOString()}, {onConflict:'user_id,material_id'});
      } else {
        await table('material_completions').delete().eq('user_id',State.profile.id).eq('material_id',materialId);
      }
    }catch(e){
      console.warn('[Tribeca Aula] material_completions no disponible; se guarda en este navegador.', e?.message||e);
    }
    await loadData(true);
    toast(next?'Publicación marcada como hecha.':'Publicación marcada como pendiente.');
    renderApp(); rerender();
  }
  function materialCompletionButton(m){
    if(roleTeacher()) return '';
    const done = isMaterialCompleted(m.id);
    return `<button type="button" class="material-done-btn ${done?'is-done':''}" data-t33-toggle-completion="${safe(m.id)}">${done?'Hecha':'Marcar como hecha'}</button>`;
  }
  function materialOpenButton(m){
    return `<button type="button" class="secondary-btn material-open-btn" data-t33-open-mat="${safe(m.id)}">Abrir publicación</button>`;
  }

  function isMathSubjectValue(value=''){
    const v=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return /\bmatematicas\b|\bmathematics\b|\bmaths\b|\bmath\b|algebra|trigonometria|calculo|aritmetica|geometria/.test(v);
  }
  function materialIsMath(m={}){
    return isMathSubjectValue(m.subject || m.subject_name || m.area || '');
  }
  function currentMathCalculatorContext(){
    if(document.querySelector('[data-math-material="1"]')) return true;
    if(isMathSubjectValue(State.currentSubject)) return true;
    const classSubject=(State.data.classSubjects||[]).find(s=>String(s.id)===String(State.currentClassSubjectId||''));
    if(classSubject && isMathSubjectValue(classSubject.subject)) return true;
    return false;
  }
  function mathCalculatorMarkup(){
    return `<button type="button" class="math-calc-fab" data-math-calc-toggle aria-label="Abrir calculadora">∑</button>
      <section class="math-calc-panel" data-math-calc-panel hidden>
        <header data-math-calc-drag-handle title="Arrastrar calculadora"><div><strong>Calculadora</strong><span>Para materiales de Matemáticas · arrástrame desde aquí</span></div><button type="button" data-math-calc-close aria-label="Cerrar">×</button></header>
        <div class="math-calc-mode-tabs" role="tablist">
          <button type="button" class="is-active" data-math-calc-tab="algebra">Álgebra</button>
          <button type="button" data-math-calc-tab="polynomial">Polinomios</button>
          <button type="button" data-math-calc-tab="trig">Trigonometría</button>
          <button type="button" data-math-calc-tab="calculus">Cálculo</button>
        </div>
        <div class="math-calc-display-wrap">
          <input class="math-calc-display" data-math-calc-display aria-label="Expresión de la calculadora" autocomplete="off">
          <button type="button" data-math-calc-action="back">⌫</button>
        </div>
        <div class="math-calc-status" data-math-calc-status>Selecciona un cuadro de respuesta y usa “Insertar”.</div>
        <div class="math-calc-keypad">
          <div class="math-calc-special" data-math-calc-special="algebra">
            ${[
              ['√','sqrt('],['x²','^2'],['<','<'],['(', '('],[')', ')'],
              ['log','log('],['!','!'],['>','>'],['≤','<='],['≥','>='],
              ['x','x'],['y','y'],['=','=']
            ].map(([l,v])=>`<button type="button" data-math-calc-value="${safe(v)}">${safe(l)}</button>`).join('')}
          </div>
          <div class="math-calc-special" data-math-calc-special="polynomial" hidden>
            <p class="math-calc-polynomial-help">Plantillas para escribir operaciones combinadas con polinomios, fracciones, paréntesis y corchetes. Usa “Insertar expresión” para llevarlas a tu respuesta.</p>
            ${[
              ['x','x'],['x²','x^2'],['x³','x^3'],['xⁿ','x^'],['coef.','a'],
              ['( )','(|)'],['[ ]','[|]'],['{ }','{|}'],['fracción','(|)/()'],['+ fracción',' + (|)/()'],
              ['P(x)','P(x)'],['Q(x)','Q(x)'],['P+Q','P(x)+Q(x)'],['P−Q','P(x)-Q(x)'],['P·Q','(P(x))*(Q(x))'],
              ['P÷Q','(P(x))/(Q(x))'],['combinada','[(3x^2-2x+1)/(x-1)] + [2x-(x^2+1)]'],['opuesta','-('],['factor común','x('],['simplificar','simplificar: ']
            ].map(([l,v])=>`<button type="button" data-math-calc-value="${safe(v)}">${safe(l)}</button>`).join('')}
          </div>
          <div class="math-calc-special" data-math-calc-special="trig" hidden>
            ${[
              ['sin','sin('],['cos','cos('],['tan','tan('],['(', '('],[')', ')'],
              ['csc','1/sin('],['sec','1/cos('],['cot','1/tan('],
              ['arcsin','asin('],['arccos','acos('],['arctan','atan('],
              ['π','pi'],['x','x'],['y','y'],['=','=']
            ].map(([l,v])=>`<button type="button" data-math-calc-value="${safe(v)}">${safe(l)}</button>`).join('')}
          </div>
          <div class="math-calc-special" data-math-calc-special="calculus" hidden>
            ${[
              ['d/dx','d/dx '],['∞','∞'],['∛','cbrt('],['(', '('],[')', ')'],
              ['lim','lim '],['lim +','lim → +∞ '],['lim −','lim → -∞ '],
              ['log','log('],['C(n,k)','C(n,k)'],['P(n,k)','P(n,k)'],
              ['Σ','Σ('],['∫','∫('],['e','e']
            ].map(([l,v])=>`<button type="button" data-math-calc-value="${safe(v)}">${safe(l)}</button>`).join('')}
          </div>
          <div class="math-calc-numbers">
            ${['7','8','9','÷','4','5','6','×','1','2','3','−','0',',','.','+'].map(v=>`<button type="button" data-math-calc-value="${safe(v)}">${safe(v)}</button>`).join('')}
          </div>
        </div>
        <div class="math-calc-actions">
          <button type="button" data-math-calc-action="clear">AC</button>
          <button type="button" data-math-calc-action="equals">=</button>
          <button type="button" data-math-calc-action="insert-expression">Insertar expresión</button>
          <button type="button" data-math-calc-action="insert-result">Insertar resultado</button>
        </div>
      </section>`;
  }
  function enableMathCalculatorDrag(root){
    const panel=root?.querySelector?.('[data-math-calc-panel]');
    const handle=root?.querySelector?.('[data-math-calc-drag-handle]');
    if(!panel || !handle || handle.dataset.mathCalcDragReady==='1') return;
    handle.dataset.mathCalcDragReady='1';
    handle.addEventListener('pointerdown', ev=>{
      if(ev.target.closest?.('button')) return;
      ev.preventDefault();
      const rect=panel.getBoundingClientRect();
      const offsetX=ev.clientX-rect.left;
      const offsetY=ev.clientY-rect.top;
      panel.classList.add('is-dragging');
      panel.hidden=false;
      try{ handle.setPointerCapture?.(ev.pointerId); }catch(_e){}
      const move=e=>{
        const maxLeft=Math.max(8, window.innerWidth-panel.offsetWidth-8);
        const maxTop=Math.max(8, window.innerHeight-panel.offsetHeight-8);
        const left=Math.max(8, Math.min(maxLeft, e.clientX-offsetX));
        const top=Math.max(8, Math.min(maxTop, e.clientY-offsetY));
        panel.style.left=`${left}px`;
        panel.style.top=`${top}px`;
        panel.style.right='auto';
        panel.style.bottom='auto';
      };
      const up=e=>{
        panel.classList.remove('is-dragging');
        document.removeEventListener('pointermove', move, true);
        document.removeEventListener('pointerup', up, true);
        try{ handle.releasePointerCapture?.(ev.pointerId); }catch(_e){}
      };
      document.addEventListener('pointermove', move, true);
      document.addEventListener('pointerup', up, true);
    });
  }
  function ensureMathCalculatorWidget(){
    let root=document.getElementById('tribecaMathCalculator');
    if(!root){
      root=document.createElement('div');
      root.id='tribecaMathCalculator';
      root.className='math-calc-widget';
      root.innerHTML=mathCalculatorMarkup();
      document.body.appendChild(root);
    }
    enableMathCalculatorDrag(root);
    const active=currentMathCalculatorContext();
    root.hidden=!active;
    document.body.classList.toggle('has-math-calculator', active);
    if(!document.body.dataset.tribecaMathCalcBound){
      document.body.dataset.tribecaMathCalcBound='1';
      document.addEventListener('focusin', ev=>{
        const el=ev.target;
        if(!el || root.contains(el)) return;
        if(el.matches?.('input[type="text"], input:not([type]), textarea, [contenteditable="true"]')){
          window.__tribecaMathCalcTarget=el;
          const status=document.querySelector('[data-math-calc-status]');
          if(status) status.textContent='Cuadro de respuesta seleccionado. Puedes insertar expresión o resultado.';
        }
      }, true);
      document.addEventListener('mousedown', ev=>{
        if(ev.target.closest?.('#tribecaMathCalculator button')) ev.preventDefault();
      }, true);
      document.addEventListener('click', ev=>{
        const toggle=ev.target.closest?.('[data-math-calc-toggle]');
        if(toggle){ ev.preventDefault(); const panel=document.querySelector('[data-math-calc-panel]'); if(panel) panel.hidden=!panel.hidden; return; }
        const close=ev.target.closest?.('[data-math-calc-close]');
        if(close){ ev.preventDefault(); document.querySelector('[data-math-calc-panel]')?.setAttribute('hidden',''); return; }
        const tab=ev.target.closest?.('[data-math-calc-tab]');
        if(tab){ ev.preventDefault(); switchMathCalculatorTab(tab.dataset.mathCalcTab); return; }
        const valueBtn=ev.target.closest?.('[data-math-calc-value]');
        if(valueBtn){ ev.preventDefault(); appendMathCalculatorValue(valueBtn.dataset.mathCalcValue||''); return; }
        const action=ev.target.closest?.('[data-math-calc-action]');
        if(action){ ev.preventDefault(); runMathCalculatorAction(action.dataset.mathCalcAction); return; }
      }, true);
      document.addEventListener('keydown', ev=>{
        if(ev.key==='Escape') document.querySelector('[data-math-calc-panel]')?.setAttribute('hidden','');
      });
    }
  }
  function switchMathCalculatorTab(tab='algebra'){
    document.querySelectorAll('[data-math-calc-tab]').forEach(b=>b.classList.toggle('is-active', b.dataset.mathCalcTab===tab));
    document.querySelectorAll('[data-math-calc-special]').forEach(p=>p.hidden=p.dataset.mathCalcSpecial!==tab);
  }
  function mathCalcDisplay(){
    return document.querySelector('[data-math-calc-display]');
  }
  function setMathCalcStatus(message='', type=''){
    const box=document.querySelector('[data-math-calc-status]');
    if(!box) return;
    box.textContent=message;
    box.classList.remove('is-error','is-ok');
    if(type) box.classList.add(type);
  }
  function appendMathCalculatorValue(value=''){
    const d=mathCalcDisplay();
    if(!d) return;
    const map={'×':'*','÷':'/','−':'-'};
    let insert=map[value]||value;
    if(insert==='='){ runMathCalculatorAction('equals'); return; }
    const marker=insert.indexOf('|');
    if(marker>=0) insert=insert.replace('|','');
    const start=d.selectionStart ?? d.value.length;
    const end=d.selectionEnd ?? d.value.length;
    d.value=d.value.slice(0,start)+insert+d.value.slice(end);
    const pos=start+(marker>=0?marker:insert.length);
    d.focus();
    d.setSelectionRange?.(pos,pos);
  }
  function normalizeMathExpression(expr=''){
    let e=String(expr||'').trim();
    e=e.replace(/,/g,'.').replace(/π/g,'pi').replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/[\[\{]/g,'(').replace(/[\]\}]/g,')').replace(/√\s*\(/g,'sqrt(');
    e=e.replace(/\^/g,'**');
    e=e.replace(/\bpi\b/gi,'Math.PI').replace(/\be\b/g,'Math.E');
    e=e.replace(/\bsqrt\s*\(/gi,'Math.sqrt(').replace(/\bcbrt\s*\(/gi,'Math.cbrt(');
    e=e.replace(/\bsin\s*\(/gi,'Math.sin(').replace(/\bcos\s*\(/gi,'Math.cos(').replace(/\btan\s*\(/gi,'Math.tan(');
    e=e.replace(/\basin\s*\(/gi,'Math.asin(').replace(/\bacos\s*\(/gi,'Math.acos(').replace(/\batan\s*\(/gi,'Math.atan(');
    e=e.replace(/\blog\s*\(/gi,'Math.log10(').replace(/\bln\s*\(/gi,'Math.log(');
    return e;
  }
  function evaluateMathExpression(expr=''){
    const normalized=normalizeMathExpression(expr);
    if(/[A-Z_a-z]/.test(normalized.replace(/Math\.(PI|E|sqrt|cbrt|sin|cos|tan|asin|acos|atan|log10|log)/g,''))) throw new Error('La expresión contiene símbolos que no se pueden calcular automáticamente.');
    if(!/^[0-9+\-*/().,\s%MathPIEsqrtcbrtinosaglg]*$/.test(normalized)) throw new Error('Expresión no válida.');
    const result=Function(`"use strict"; return (${normalized});`)();
    if(!Number.isFinite(result)) throw new Error('El resultado no es un número finito.');
    return Number.isInteger(result) ? String(result) : String(Number(result.toPrecision(12))).replace(/\.0+$/,'');
  }
  function insertIntoMathTarget(text=''){
    const target=window.__tribecaMathCalcTarget;
    if(!target){ setMathCalcStatus('Selecciona primero un cuadro de respuesta.', 'is-error'); return false; }
    const value=String(text||'');
    if(target.isContentEditable){
      target.focus();
      document.execCommand?.('insertText', false, value);
      setMathCalcStatus('Insertado en la respuesta.', 'is-ok');
      return true;
    }
    if(!('value' in target)){ setMathCalcStatus('El campo seleccionado no admite texto.', 'is-error'); return false; }
    const start=target.selectionStart ?? target.value.length;
    const end=target.selectionEnd ?? target.value.length;
    target.value=target.value.slice(0,start)+value+target.value.slice(end);
    const pos=start+value.length;
    target.focus();
    target.setSelectionRange?.(pos,pos);
    target.dispatchEvent(new Event('input',{bubbles:true}));
    target.dispatchEvent(new Event('change',{bubbles:true}));
    setMathCalcStatus('Insertado en la respuesta.', 'is-ok');
    return true;
  }
  function runMathCalculatorAction(action=''){
    const d=mathCalcDisplay();
    if(!d) return;
    if(action==='clear'){ d.value=''; d.dataset.result=''; setMathCalcStatus('Calculadora limpia.'); d.focus(); return; }
    if(action==='back'){ const s=d.selectionStart ?? d.value.length; const e=d.selectionEnd ?? d.value.length; if(s!==e) d.value=d.value.slice(0,s)+d.value.slice(e); else if(s>0) d.value=d.value.slice(0,s-1)+d.value.slice(s); const p=Math.max(0,s-1); d.focus(); d.setSelectionRange?.(p,p); return; }
    if(action==='equals' || action==='insert-result'){
      try{
        const result=evaluateMathExpression(d.value);
        d.dataset.result=result;
        if(action==='equals'){ d.value=result; setMathCalcStatus('Resultado calculado.', 'is-ok'); d.focus(); d.select?.(); return; }
        insertIntoMathTarget(result);
      }catch(error){ setMathCalcStatus(error.message || 'No se pudo calcular la expresión.', 'is-error'); }
      return;
    }
    if(action==='insert-expression') insertIntoMathTarget(d.value);
  }
  window.TribecaEnsureMathCalculatorWidget = ensureMathCalculatorWidget;
  function materialEmbedValue(m={}, key='url'){
    if(key==='url') return String(m.embed_url || m.interactive_url || m.game_url || '').trim();
    return String(m.embed_code || m.interactive_embed || m.game_embed || '').trim();
  }
  function stripEmbedCodeFence(code=''){
    let raw=String(code||'').trim();
    raw=raw.replace(/^```(?:html|HTML|iframe|IFRAME|javascript|js|json|JSON)?\s*/,'').replace(/\s*```$/,'').trim();
    return raw;
  }
  function extractIframeSrc(code=''){
    const raw=stripEmbedCodeFence(code);
    const m=raw.match(/<iframe[^>]+src=["']([^"']+)["'][^>]*>/i);
    return m ? m[1].trim() : '';
  }
  function normalizeVideoUrl(url=''){
    const raw=String(url||'').trim();
    if(!raw) return {src:'', direct:false, provider:''};
    let parsed=null;
    try{ parsed=new URL(raw, location.href); }catch(_e){ parsed=null; }
    if(/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(raw)) return {src:raw, direct:true, provider:'video'};
    if(!parsed) return {src:raw, direct:false, provider:''};
    const host=parsed.hostname.replace(/^www\./,'').toLowerCase();
    let id='';
    if(host==='youtu.be'){
      id=parsed.pathname.split('/').filter(Boolean)[0]||'';
      return id ? {src:`https://www.youtube.com/embed/${encodeURIComponent(id)}`, direct:false, provider:'youtube'} : {src:raw,direct:false,provider:''};
    }
    if(/youtube\.com$/.test(host)){
      if(parsed.pathname.startsWith('/embed/')) return {src:parsed.href, direct:false, provider:'youtube'};
      if(parsed.pathname.startsWith('/shorts/')) id=parsed.pathname.split('/').filter(Boolean)[1]||'';
      if(!id) id=parsed.searchParams.get('v')||'';
      return id ? {src:`https://www.youtube.com/embed/${encodeURIComponent(id)}`, direct:false, provider:'youtube'} : {src:raw,direct:false,provider:'youtube'};
    }
    if(/vimeo\.com$/.test(host)){
      if(host.startsWith('player.')) return {src:parsed.href, direct:false, provider:'vimeo'};
      id=parsed.pathname.split('/').filter(Boolean).pop()||'';
      return id ? {src:`https://player.vimeo.com/video/${encodeURIComponent(id)}`, direct:false, provider:'vimeo'} : {src:raw,direct:false,provider:'vimeo'};
    }
    if(/drive\.google\.com$/.test(host)){
      const parts=parsed.pathname.split('/').filter(Boolean);
      const fileIndex=parts.indexOf('d');
      id=fileIndex>=0 ? parts[fileIndex+1] : '';
      if(id) return {src:`https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`, direct:false, provider:'drive'};
      return {src:parsed.href, direct:false, provider:'drive'};
    }
    if(/streamable\.com$/.test(host)){
      id=parsed.pathname.split('/').filter(Boolean).pop()||'';
      return id ? {src:`https://streamable.com/e/${encodeURIComponent(id)}`, direct:false, provider:'streamable'} : {src:raw,direct:false,provider:'streamable'};
    }
    return {src:raw, direct:false, provider:''};
  }
  function isVideoEmbedSource(value=''){
    const raw=String(value||'').trim();
    if(!raw) return false;
    if(/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(raw)) return true;
    return /(youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com|streamable\.com)/i.test(raw);
  }
  function isVideoMaterial(m={}){
    if(normalizeMaterialKind(m.material_type || m.type)==='video') return true;
    const url=materialEmbedValue(m,'url');
    const code=materialEmbedValue(m,'code');
    const clean=stripEmbedCodeFence(code);
    return isVideoEmbedSource(url) || isVideoEmbedSource(extractIframeSrc(clean)) || /<video[\s>]/i.test(clean);
  }

  function encodeBase64Utf8(value=''){
    try{
      const bytes = new TextEncoder().encode(String(value||''));
      let binary='';
      bytes.forEach(b=>binary+=String.fromCharCode(b));
      return btoa(binary);
    }catch(_e){
      return btoa(unescape(encodeURIComponent(String(value||''))));
    }
  }
  function decodeBase64Utf8(value=''){
    try{
      const binary=atob(String(value||''));
      const bytes=Uint8Array.from(binary, ch=>ch.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }catch(_e){
      try{return decodeURIComponent(escape(atob(String(value||''))));}
      catch(_err){return '';}
    }
  }
  function normalizeEmbeddedHtml(code=''){
    const raw=stripEmbedCodeFence(code);
    if(!raw) return '';
    if(/<!doctype|<html[\s>]/i.test(raw)) return raw;
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${raw}</body></html>`;
  }
  function extractBalancedArrayLiteral(source='', startAt=0){
    const src=String(source||'');
    const start=src.indexOf('[', Math.max(0,startAt));
    if(start<0) return '';
    let depth=0, quote='', esc=false, lineComment=false, blockComment=false;
    for(let i=start;i<src.length;i++){
      const ch=src[i], next=src[i+1];
      if(lineComment){ if(ch==='\n') lineComment=false; continue; }
      if(blockComment){ if(ch==='*' && next==='/'){ blockComment=false; i++; } continue; }
      if(quote){ if(esc){ esc=false; continue; } if(ch==='\\'){ esc=true; continue; } if(ch===quote) quote=''; continue; }
      if(ch==='/' && next==='/'){ lineComment=true; i++; continue; }
      if(ch==='/' && next==='*'){ blockComment=true; i++; continue; }
      if(ch==='"' || ch==="'" || ch==='`'){ quote=ch; continue; }
      if(ch==='[') depth++;
      if(ch===']'){
        depth--;
        if(depth===0) return src.slice(start,i+1);
      }
    }
    return '';
  }
  function extractBalancedObjectLiteral(source='', startAt=0){
    const src=String(source||'');
    const start=src.indexOf('{', Math.max(0,startAt));
    if(start<0) return '';
    let depth=0, quote='', esc=false, lineComment=false, blockComment=false;
    for(let i=start;i<src.length;i++){
      const ch=src[i], next=src[i+1];
      if(lineComment){ if(ch==='\n') lineComment=false; continue; }
      if(blockComment){ if(ch==='*' && next==='/'){ blockComment=false; i++; } continue; }
      if(quote){ if(esc){ esc=false; continue; } if(ch==='\\'){ esc=true; continue; } if(ch===quote) quote=''; continue; }
      if(ch==='/' && next==='/'){ lineComment=true; i++; continue; }
      if(ch==='/' && next==='*'){ blockComment=true; i++; continue; }
      if(ch==='"' || ch==="'" || ch==='`'){ quote=ch; continue; }
      if(ch==='{') depth++;
      if(ch==='}'){
        depth--;
        if(depth===0) return src.slice(start,i+1);
      }
    }
    return '';
  }
  function quizTruth(value){
    if(value === true) return true;
    if(value === false || value == null) return false;
    const raw=String(value).trim().toLowerCase();
    return ['true','1','yes','sí','si','correct','correcto','verdadero'].includes(raw);
  }
  function normalizeQuizPayload(payload){
    let raw=payload;
    if(Array.isArray(raw)) raw={questions:raw};
    if(raw?.quizData){
      if(Array.isArray(raw.quizData)) raw={...raw, questions:raw.quizData};
      else if(raw.quizData && typeof raw.quizData==='object') raw={...raw.quizData, ...raw, questions:raw.quizData.questions || raw.quizData.items || raw.quizData.preguntas || raw.questions};
    }
    ['questions','items','preguntas','quizQuestions','testQuestions','testData','exercises','ejercicios'].forEach(key=>{
      if(!Array.isArray(raw?.questions) && Array.isArray(raw?.[key])) raw={...raw, questions:raw[key]};
    });
    if(!raw || !Array.isArray(raw.questions)) return null;
    const indexFromAnswer=(answer, options=[])=>{
      if(answer==null || answer==='') return -1;
      if(Number.isInteger(answer) && options[answer]) return answer;
      const text=String(answer).trim();
      if(/^\d+$/.test(text) && options[Number(text)] && Number(text)>=0) return Number(text);
      const letter=text.toLowerCase().replace(/[^a-z]/g,'');
      if(letter.length===1){ const i=letter.charCodeAt(0)-97; if(options[i]) return i; }
      const norm=text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/^\s*[a-d][\).:-]\s*/,'').trim();
      return options.findIndex(o=>String(o.t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/^\s*[a-d][\).:-]\s*/,'').trim()===norm);
    };
    const normalizeOptions=(options=[])=>{
      if(!Array.isArray(options)){
        if(options && typeof options==='object') options=Object.entries(options).map(([k,v])=>({text:String(v), key:k}));
        else options=[];
      }
      return (options||[]).map(o=>{
        if(typeof o==='string') return {t:o,c:false,r:''};
        const t=String(o.t || o.text || o.label || o.answer || o.option || o.value || o.respuesta || o.opcion || o.key || '').trim();
        const c=quizTruth(o.c ?? o.correct ?? o.is_correct ?? o.isCorrect ?? o.correcta ?? o.esCorrecta ?? o.valid ?? o.right ?? o.ok);
        const r=String(o.r || o.rationale || o.reason || o.feedback || o.explanation || o.explicacion || o.retroalimentacion || '').trim();
        return {t,c,r};
      }).filter(o=>o.t);
    };
    const questions=raw.questions.map((q,idx)=>{
      const optionSource=q.opts || q.options || q.answerOptions || q.answer_options || q.answers || q.choices || q.opciones || q.respuestas || q.alternatives || [];
      const text=String(q.q || q.question || q.text || q.statement || q.prompt || q.enunciado || q.pregunta || q.title || '').trim();
      const hint=String(q.hint || q.ayuda || q.clue || '').trim();
      const normalizedOptions=normalizeOptions(optionSource);
      const correctCandidates=[q.correctIndex, q.correct_index, q.correctOption, q.correct_option, q.correctAnswer, q.correct_answer, q.answerKey, q.answer_key, q.answer, q.respuesta_correcta, q.respuestaCorrecta, q.correcta, q.correct].filter(v=>v!==undefined && v!==null && v!=='' && typeof v!=='boolean');
      correctCandidates.forEach(candidate=>{
        if(Array.isArray(candidate)) candidate.forEach(c=>{ const i=indexFromAnswer(c, normalizedOptions); if(i>=0) normalizedOptions[i].c=true; });
        else { const i=indexFromAnswer(candidate, normalizedOptions); if(i>=0) normalizedOptions[i].c=true; }
      });
      if(!normalizedOptions.some(o=>o.c) && Number.isInteger(q.correctIndex) && normalizedOptions[q.correctIndex]) normalizedOptions[q.correctIndex].c=true;
      return {q:text || `Pregunta ${idx+1}`, hint, opts:normalizedOptions};
    }).filter(q=>q.q && q.opts.length);
    if(!questions.length) return null;
    return {type:'tribeca-quiz', title:String(raw.title || raw.name || raw.titulo || 'Test interactivo'), questions};
  }
  function parseQuizFromInteractiveCode(code=''){
    const raw=stripEmbedCodeFence(code);
    if(!raw) return null;
    if(raw.startsWith('tribeca-quiz-json::')){
      try{return normalizeQuizPayload(JSON.parse(raw.slice('tribeca-quiz-json::'.length)));}catch(_e){return null;}
    }
    if(/^\s*[\[{]/.test(raw)){
      try{return normalizeQuizPayload(JSON.parse(raw));}catch(_e){}
    }
    const names=['quizData','questions','quizQuestions','testQuestions','preguntas','testData','items','exercises','ejercicios'];
    for(const name of names){
      const re=new RegExp(`(?:window\\.)?${name}\\s*=|\\b${name}\\b`,'i');
      const found=raw.search(re);
      if(found<0) continue;
      const arr=extractBalancedArrayLiteral(raw, found);
      if(arr){
        try{ const quiz=normalizeQuizPayload(Function(`"use strict"; return (${arr});`)()); if(quiz) return quiz; }
        catch(error){ console.warn('[Tribeca Aula] No se pudo extraer array de test:', name, error); }
      }
      const obj=extractBalancedObjectLiteral(raw, found);
      if(obj){
        try{ const quiz=normalizeQuizPayload(Function(`"use strict"; return (${obj});`)()); if(quiz) return quiz; }
        catch(error){ console.warn('[Tribeca Aula] No se pudo extraer objeto de test:', name, error); }
      }
    }
    const jsonScript=raw.match(/<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i);
    if(jsonScript){
      try{ return normalizeQuizPayload(JSON.parse(jsonScript[1])); }catch(_e){}
    }
    return null;
  }

  function quizPayloadToStorage(payload){
    const q=normalizeQuizPayload(payload);
    return q ? `tribeca-quiz-json::${JSON.stringify(q)}` : '';
  }
  function examPayloadToStorage(payload){
    const exam=normalizeExamPayload(payload);
    return exam ? `tribeca-exam-json::${JSON.stringify(exam)}` : '';
  }
  function normalizeExamType(value=''){
    const v=String(value||'').trim().toLowerCase().replace(/\s+/g,'_');
    if(['single','single_choice','choice','radio','select','test'].includes(v)) return 'single_choice';
    if(['multiple','multiple_choice','checkbox','multi'].includes(v)) return 'multiple_choice';
    if(['true_false','truefalse','verdadero_falso','vf'].includes(v)) return 'true_false';
    if(['short','short_text','text','fill','fill_blank','fill_in_blank','respuesta_corta'].includes(v)) return 'short_text';
    if(['writing','redaccion','redacción','essay','open_text'].includes(v)) return 'writing';
    if(['matching','match','unir','unir_flechas','pairs','parejas'].includes(v)) return 'matching';
    if(['ordering','order','ordenar','sequence','secuencia'].includes(v)) return 'ordering';
    if(['reading','reading_comprehension','comprension_lectora','comprensión_lectora'].includes(v)) return 'reading';
    return 'single_choice';
  }
  function arrayFromMaybe(value){
    if(Array.isArray(value)) return value;
    if(value === null || value === undefined || value === '') return [];
    return [value];
  }
  function textNorm(value='', caseSensitive=false){
    const raw=String(value||'').trim();
    const base=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
    return caseSensitive ? base : base.toLowerCase();
  }
  function normalizeExamQuestion(q={}, idx=0, parentPassage=''){
    const type=normalizeExamType(q.type || q.kind || q.exerciseType || q.exercise_type || q.formato || '');
    const prompt=String(q.question || q.q || q.prompt || q.statement || q.text || q.enunciado || q.pregunta || '').trim() || `Pregunta ${idx+1}`;
    const passage=String(q.passage || q.texto || q.reading || parentPassage || '').trim();
    const options=(q.options || q.answerOptions || q.answer_options || q.choices || q.opts || q.opciones || []).map((o,i)=>{
      if(typeof o==='string') return {text:o, correct:false, rationale:''};
      return {
        text:String(o.text || o.label || o.answer || o.option || o.value || o.respuesta || '').trim(),
        correct:quizTruth(o.isCorrect ?? o.correct ?? o.c ?? o.correcta ?? o.esCorrecta ?? false),
        rationale:String(o.rationale || o.feedback || o.explanation || o.reason || o.explicacion || '').trim()
      };
    }).filter(o=>o.text);
    const acceptedAnswers=arrayFromMaybe(q.acceptedAnswers || q.accepted_answers || q.correctAnswers || q.correct_answers || q.answer || q.respuesta_correcta).map(String).filter(Boolean);
    const keywords=arrayFromMaybe(q.requiredKeywords || q.required_keywords || q.keywords || q.palabras_clave).map(String).filter(Boolean);
    const pairs=(q.pairs || q.matches || q.matching || q.parejas || []).map(p=>{
      if(Array.isArray(p)) return {left:String(p[0]||''), right:String(p[1]||'')};
      return {left:String(p.left || p.a || p.term || p.concepto || ''), right:String(p.right || p.b || p.match || p.definicion || p.definición || '')};
    }).filter(p=>p.left && p.right);
    const items=arrayFromMaybe(q.items || q.order || q.sequence || q.orden || q.secuencia).map(String).filter(Boolean);
    return {
      id:String(q.id || `q${idx+1}`),
      type,
      prompt,
      passage,
      image:String(q.image || q.imageUrl || q.image_url || q.img || '').trim(),
      imageAlt:String(q.imageAlt || q.image_alt || q.alt || '').trim(),
      imageCaption:String(q.imageCaption || q.image_caption || q.caption || '').trim(),
      section:String(q.section || q.skill || q.category || q.bloque || q.apartado || '').trim(),
      exerciseTitle:String(q.exerciseTitle || q.exercise_title || q.title || '').trim(),
      points:q.points || q.puntos || null,
      originalNumber:q.questionNumber || q.question_number || q.number || q.numero || '',
      options,
      acceptedAnswers,
      keywords,
      pairs,
      items,
      caseSensitive:!!q.caseSensitive,
      minWords:Number(q.minWords || q.min_words || 0),
      feedback:String(q.feedback || q.rationale || q.explanation || q.explicacion || '').trim()
    };
  }
  function normalizeExamPayload(payload){
    let raw=payload;
    if(typeof raw==='string'){
      const parsed=parseExamFromInteractiveCode(raw);
      if(parsed) return parsed;
      try{ raw=JSON.parse(stripEmbedCodeFence(raw)); }catch(_e){ return null; }
    }
    if(Array.isArray(raw)) raw={questions:raw};
    if(raw?.exam && Array.isArray(raw.exam)) raw={...raw, questions:raw.exam};
    if(raw?.exercises && Array.isArray(raw.exercises)) raw={...raw, questions:raw.exercises};
    if(raw?.items && Array.isArray(raw.items)) raw={...raw, questions:raw.items};
    if(raw?.preguntas && Array.isArray(raw.preguntas)) raw={...raw, questions:raw.preguntas};
    if(raw?.quizData && Array.isArray(raw.quizData)) raw={...raw, questions:raw.quizData};
    if(!raw || !Array.isArray(raw.questions)) return null;
    const flat=[];
    raw.questions.forEach((q,idx)=>{
      const type=normalizeExamType(q.type || q.kind || q.exerciseType || q.exercise_type || '');
      if(type==='reading' && Array.isArray(q.questions || q.subquestions || q.preguntas)){
        const passage=String(q.passage || q.text || q.texto || q.reading || '').trim();
        (q.questions || q.subquestions || q.preguntas).forEach((sub,j)=>flat.push(normalizeExamQuestion({...sub, type:sub.type||sub.kind||'single_choice'}, flat.length, passage)));
      } else {
        flat.push(normalizeExamQuestion(q, flat.length));
      }
    });
    const questions=flat.filter(q=>{
      if(['single_choice','multiple_choice','true_false'].includes(q.type)) return q.options.length >= 2;
      if(['short_text','writing'].includes(q.type)) return !!q.prompt;
      if(q.type==='matching') return q.pairs.length >= 1;
      if(q.type==='ordering') return q.items.length >= 2;
      return !!q.prompt;
    });
    if(!questions.length) return null;
    return {
      type:'tribeca-exam',
      title:String(raw.title || raw.name || 'Simulacro de examen'),
      instructions:String(raw.instructions || raw.instrucciones || 'Responde todas las preguntas y pulsa finalizar para obtener tu resultado sobre 10.'),
      subject:String(raw.subject || ''),
      unit:String(raw.unit || raw.unit_title || ''),
      questions
    };
  }
  function parseExamFromInteractiveCode(code=''){
    const raw=stripEmbedCodeFence(code);
    if(!raw) return null;
    if(raw.startsWith('tribeca-exam-json::')){
      try{return normalizeExamPayload(JSON.parse(raw.slice('tribeca-exam-json::'.length)));}catch(_e){return null;}
    }
    if(/^\s*[\[{]/.test(raw)){
      try{
        const parsed=JSON.parse(raw);
        const marker=String(parsed.type || parsed.kind || parsed.format || '').toLowerCase();
        if(/exam|simulacro|examen/.test(marker) || parsed.exam || parsed.exercises) return normalizeExamPayload(parsed);
      }catch(_e){}
    }
    return null;
  }
  function isExamMaterial(m={}){
    const code=materialEmbedValue(m,'code');
    return normalizeMaterialKind(m.material_type || m.type)==='exam' || String(code||'').trim().startsWith('tribeca-exam-json::');
  }
  function materialVisualKind(m={}){
    if(isExamMaterial(m)) return 'exam';
    if(isVideoMaterial(m)) return 'video';
    return m.material_type || m.type || 'material';
  }
  function nativeExamMarkup(exam, m={}){
    if(!exam?.questions?.length) return '';
    return `<section class="material-embed-block native-exam-shell"><div><strong>Simulacro de examen</strong><small>Autocorregible · resultado sobre 10</small></div><div class="native-exam-block" data-t103-exam="${safe(encodeBase64Utf8(JSON.stringify(exam)))}" data-material-id="${safe(m.id||'')}"><p>Cargando simulacro…</p></div></section>`;
  }
  function examAttemptsFor(materialId, userId=State.profile?.id){
    if(!materialId || !userId) return [];
    return (State.data.examAttempts||[])
      .filter(a=>String(a.material_id)===String(materialId) && String(a.user_id)===String(userId))
      .sort((a,b)=>new Date(b.completed_at||b.created_at||0)-new Date(a.completed_at||a.created_at||0));
  }
  function examAttemptFor(materialId, userId=State.profile?.id){
    return examAttemptsFor(materialId, userId)[0] || null;
  }
  function attemptPrintRef(a={}){
    return String(a.id || a.attempt_id || a.completed_at || a.created_at || '').trim();
  }
  function attemptPrintButton(a={}, label='PDF'){
    const ref=attemptPrintRef(a);
    if(!ref) return '';
    return `<button type="button" class="attempt-pdf-btn" data-t148-attempt-pdf="${safe(ref)}">${safe(label)}</button>`;
  }
  function examAttemptHistoryMarkup(materialId, opts={}){
    if(roleTeacher() || !materialId || !State.profile?.id) return '';
    const attempts=examAttemptsFor(materialId);
    const count=attempts.length;
    if(!count && !opts.showEmpty) return '';
    const rows=attempts.map((a,i)=>{
      const when=a.completed_at ? new Date(a.completed_at).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'sin fecha';
      const teacherNote=(a.teacher_feedback||a.teacher_comment)?`<p class="attempt-teacher-note-v163"><strong>Comentario de la profesora:</strong> ${safe(a.teacher_feedback||a.teacher_comment)}</p>`:'';
      return `<li><span>Intento ${count-i}</span><strong>${Number(a.score||0).toFixed(2)}/10</strong><small>${safe(when)}</small>${teacherNote}${attemptPrintButton(a,'Descargar PDF')}</li>`;
    }).join('');
    return `<details class="exam-attempt-history exam-attempt-history-v148"><summary>Intentos realizados${count?` (${count})`:''}</summary>${count?`<ol>${rows}</ol>`:'<p>Todavía no hay intentos guardados.</p>'}</details>`;
  }
  function updateAttemptHistoryBox(container, materialId){
    if(!container || !materialId) return;
    container.querySelectorAll('[data-exam-attempt-history-slot]').forEach(slot=>{ slot.innerHTML=examAttemptHistoryMarkup(materialId); });
  }
  function attemptByPrintRef(ref=''){
    const key=String(ref||'').trim();
    if(!key) return null;
    return (State.data.examAttempts||[]).find(a=>String(a.id||'')===key || String(a.completed_at||'')===key || String(a.created_at||'')===key) || null;
  }
  function currentAttemptNumber(a={}){
    const rows=(State.data.examAttempts||[]).filter(x=>String(x.user_id||'')===String(a.user_id||'') && String(x.material_id||x.title||'')===String(a.material_id||a.title||''))
      .sort((x,y)=>String(x.completed_at||x.created_at||'').localeCompare(String(y.completed_at||y.created_at||'')));
    const idx=rows.findIndex(x=>String(x.id||x.completed_at||x.created_at)===String(a.id||a.completed_at||a.created_at));
    return idx>=0 ? idx+1 : rows.length || 1;
  }
  function formatAttemptValue(value){
    if(value===null || value===undefined || value==='') return 'Sin respuesta';
    if(Array.isArray(value)) return value.map(v=>formatAttemptValue(v)).join(' · ');
    if(typeof value==='object') return Object.entries(value).map(([k,v])=>`${k}: ${formatAttemptValue(v)}`).join(' · ');
    return String(value);
  }
  function attemptRowsForPdf(a={}){
    const arr=Array.isArray(a.answers) ? a.answers : (Array.isArray(a.correction?.answers) ? a.correction.answers : []);
    return arr.map((ans,i)=>{
      const fraction=Number(ans.fraction ?? ans.score ?? 0);
      const status=fraction>=1?'Correcta':(fraction>0?'Parcial':'Incorrecta');
      return `<tr><td>${i+1}</td><td>${safe(ans.question || ans.prompt || ans.section || `Pregunta ${i+1}`)}</td><td>${safe(formatAttemptValue(ans.value))}</td><td>${safe(formatAttemptValue(ans.correct))}</td><td>${safe(status)}</td><td>${safe(ans.feedback||'')}</td></tr>`;
    }).join('') || '<tr><td colspan="6">Este intento antiguo no conserva el detalle de respuestas.</td></tr>';
  }
  function attemptPdfBody(a={}){
    const st=(State.data.students||[]).find(s=>String(s.id)===String(a.user_id)) || (String(a.user_id||'')===String(State.profile?.id||'')?State.profile:{});
    const mat=materialById(a.material_id);
    const when=a.completed_at || a.created_at || '';
    const score=Number(a.score||0);
    const attemptNo=currentAttemptNumber(a);
    const title=a.title || mat.title || 'Actividad autocorregible';
    const subject=a.subject || mat.subject || 'Materia';
    const unit=a.unit_title || mat.unit_title || mat.unit || 'Unidad';
    return `<h1>Actividad realizada</h1><p class="muted">Documento de intento autocorregible generado desde Tribeca Aula. Este documento no forma parte de las calificaciones oficiales del centro educativo.</p>
      <table><tbody><tr><th>Alumno/a</th><td>${safe(displayName(st)||'Alumno/a')}</td><th>Intento</th><td>${safe(attemptNo)}</td></tr><tr><th>Materia</th><td>${safe(subject)}</td><th>Unidad</th><td>${safe(unit)}</td></tr><tr><th>Actividad</th><td>${safe(title)}</td><th>Fecha</th><td>${safe(when?fmtDT(when):'Sin fecha')}</td></tr><tr><th>Resultado</th><td><strong>${score.toFixed(2)}/10</strong></td><th>Porcentaje</th><td>${safe(a.percent ?? Math.round(score*10))}%</td></tr></tbody></table>
      <h2>Respuestas y corrección</h2><table class="attempt-pdf-table"><thead><tr><th>N.º</th><th>Pregunta</th><th>Respuesta dada</th><th>Respuesta correcta</th><th>Resultado</th><th>Feedback</th></tr></thead><tbody>${attemptRowsForPdf(a)}</tbody></table>
      <h2>Observación pedagógica</h2><div class="field">${score<5?'Conviene revisar la actividad con apoyo docente y comprobar si el error se debe a comprensión, técnica de estudio, lectura del enunciado o falta de consolidación.':score<7?'Resultado suficiente, aunque conviene repasar los errores para consolidar el aprendizaje.':'Buen resultado. Puede usarse como evidencia de avance y consolidación.'}</div>${(a.teacher_feedback||a.teacher_comment)?`<h2>Comentario de la profesora</h2><div class="field"><strong>Retroalimentación:</strong> ${safe(a.teacher_feedback||'Sin retroalimentación específica.')}<br><strong>Comentario:</strong> ${safe(a.teacher_comment||'Sin comentario adicional.')}</div>`:''}`;
  }
  function printAttemptPdf(ref=''){
    const a=attemptByPrintRef(ref);
    if(!a) return toast('No se encontró el intento para generar el PDF. Recarga la página e inténtalo de nuevo.');
    const title=`Intento ${currentAttemptNumber(a)} · ${a.title||'Actividad'}`;
    const w=window.open('', '_blank');
    if(!w) return toast('No se pudo abrir la ventana de impresión.');
    w.document.write(tribecaPrintableShell(title, attemptPdfBody(a)));
    w.document.close();
    setTimeout(()=>w.print(),250);
  }
  window.TribecaPrintAttemptPdf=printAttemptPdf;
  function scoreTextAnswer(value='', accepted=[], caseSensitive=false){
    const v=textNorm(value, caseSensitive);
    return accepted.some(a=>textNorm(a, caseSensitive)===v) ? 1 : 0;
  }
  function scoreWriting(value='', q={}){
    const words=String(value||'').trim().split(/\s+/).filter(Boolean);
    if(q.acceptedAnswers?.length && scoreTextAnswer(value,q.acceptedAnswers,q.caseSensitive)) return 1;
    if(q.minWords && words.length<q.minWords) return 0;
    if(q.keywords?.length){
      const text=textNorm(value,false);
      const ok=q.keywords.filter(k=>text.includes(textNorm(k,false))).length;
      return q.keywords.length ? ok/q.keywords.length : 0;
    }
    return 0;
  }
  function renderNativeExam(container){
    if(!container || container.dataset.t103Rendered==='1') return;
    let exam=null;
    try{ exam=JSON.parse(decodeBase64Utf8(container.dataset.t103Exam||'')); }catch(_e){ exam=null; }
    exam=normalizeExamPayload(exam);
    if(!exam){ container.innerHTML='<p>No se pudo cargar el simulacro.</p>'; container.dataset.t103Rendered='error'; return; }
    const materialId=container.dataset.materialId||'';
    const previous=examAttemptFor(materialId);
    const total=exam.questions.length;
    const perQuestion=total ? 10/total : 0;
    const optionsForPairs=q=>q.pairs.map(p=>p.right).slice().sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));
    const questionTypeLabel=q=>({single_choice:'Elige la respuesta correcta',multiple_choice:'Selecciona todas las correctas',true_false:'Verdadero o falso',short_text:'Completa',writing:'Writing',matching:'Relaciona',ordering:'Ordena'})[q.type] || 'Ejercicio';
    const sectionLabel=q=>String(q.section||'Simulacro').trim() || 'Simulacro';
    const grouped=[];
    exam.questions.forEach((q,idx)=>{
      const name=sectionLabel(q);
      let group=grouped[grouped.length-1];
      if(!group || group.name!==name){ group={name,items:[]}; grouped.push(group); }
      group.items.push({q,idx});
    });
    const questionHtml=(q,idx,localIdx)=>{
      const number=localIdx+1;
      const displayNumber=q.originalNumber || number;
      const passage=q.passage?`<blockquote class="exam-passage">${safe(q.passage)}</blockquote>`:'';
      const imageHtml=q.image?`<figure class="exam-question-image"><img src="${safe(q.image)}" alt="${safe(q.imageAlt||q.imageCaption||q.exerciseTitle||q.prompt)}">${q.imageCaption?`<figcaption>${safe(q.imageCaption)}</figcaption>`:''}</figure>`:'';
      const title=q.exerciseTitle?`<p class="exam-exercise-title">${safe(q.exerciseTitle)}</p>`:'';
      const head=`<div class="exam-question-head"><span class="exam-question-number">${safe(displayNumber)}</span><span class="exam-question-type">${safe(questionTypeLabel(q))}</span></div>`;
      const legend=`<legend>${safe(q.prompt)}</legend>`;
      const feedback=`<div class="exam-question-feedback" data-exam-feedback="${idx}" hidden></div>`;
      if(q.type==='matching') return `<fieldset class="exam-question" data-exam-q="${idx}" data-type="matching">${head}${title}${legend}${passage}${imageHtml}<div class="exam-matching">${q.pairs.map((p,i)=>`<label><span>${safe(p.left)}</span><select name="q${idx}_${i}"><option value="">Seleccionar</option>${optionsForPairs(q).map(o=>`<option value="${safe(o)}">${safe(o)}</option>`).join('')}</select></label>`).join('')}</div>${feedback}</fieldset>`;
      if(q.type==='ordering') return `<fieldset class="exam-question" data-exam-q="${idx}" data-type="ordering">${head}${title}${legend}${passage}${imageHtml}<div class="exam-ordering">${q.items.map((_,i)=>`<label><span>${i+1}.</span><select name="q${idx}_${i}"><option value="">Seleccionar</option>${q.items.map(o=>`<option value="${safe(o)}">${safe(o)}</option>`).join('')}</select></label>`).join('')}</div>${feedback}</fieldset>`;
      if(q.type==='short_text') return `<fieldset class="exam-question" data-exam-q="${idx}" data-type="short_text">${head}${title}${legend}${passage}${imageHtml}<input name="q${idx}" type="text" placeholder="Escribe tu respuesta">${feedback}</fieldset>`;
      if(q.type==='writing') return `<fieldset class="exam-question" data-exam-q="${idx}" data-type="writing">${head}${title}${legend}${passage}${imageHtml}<textarea name="q${idx}" rows="7" placeholder="Escribe tu respuesta"></textarea>${q.keywords?.length?`<small class="exam-help">Se autocorrige por criterios configurados.</small>`:''}${feedback}</fieldset>`;
      const multiple=q.type==='multiple_choice';
      const type=multiple?'checkbox':'radio';
      return `<fieldset class="exam-question" data-exam-q="${idx}" data-type="${safe(q.type)}">${head}${title}${legend}${passage}${imageHtml}<div class="exam-options">${q.options.map((o,i)=>`<label><input type="${type}" name="q${idx}${multiple?'[]':''}" value="${i}"><span>${safe(o.text)}</span></label>`).join('')}</div>${feedback}</fieldset>`;
    };
    const sectionsHtml=grouped.map(group=>{
      const pts=group.items.length*perQuestion;
      return `<section class="exam-paper-section"><header><h5>${safe(group.name)}</h5><span>${pts.toFixed(2)} / 10</span></header>${group.items.map(({q,idx},localIdx)=>questionHtml(q,idx,localIdx)).join('')}</section>`;
    }).join('');
    container.innerHTML=`<form class="native-exam-form exam-paper-form"><header class="native-exam-header exam-paper-header"><div class="exam-paper-topline"><span>Nombre: .....................................................</span><span>Resultado: ............ / 10</span></div><h4>${safe(exam.title)}</h4><p>${safe(exam.instructions)}</p><div data-exam-attempt-history-slot>${examAttemptHistoryMarkup(materialId)}</div></header><div class="native-exam-questions exam-paper-body">${sectionsHtml}</div><footer class="native-exam-footer exam-paper-footer"><button type="button" class="primary-btn" data-t129-grade-exam>Finalizar y corregir</button><span>${total} pregunta${total===1?'':'s'} · corrección automática sobre 10</span></footer></form><div class="native-exam-result" hidden></div>`;
    const form=container.querySelector('form');
    const joinList=arr=>(arr||[]).map(x=>safe(x)).join(', ');
    const optionText=(q,i)=> q.options?.[i]?.text || '';
    const optionRationale=(q,i)=> q.options?.[i]?.rationale || '';
    const statusTitle=fraction=>fraction===1?'Correcto':fraction>0?'Parcialmente correcto':'Incorrecto';
    const addGeneralFeedback=(q, parts)=> q.feedback ? [...parts, `<p><strong>Explicación:</strong> ${safe(q.feedback)}</p>`] : parts;
    const markQuestion=(idx,fraction,html)=>{
      const fs=form.querySelector(`[data-exam-q="${idx}"]`);
      if(!fs) return;
      fs.classList.remove('is-correct','is-wrong','is-partial');
      fs.classList.add(fraction===1?'is-correct':fraction>0?'is-partial':'is-wrong');
      const box=fs.querySelector('[data-exam-feedback]');
      if(box){ box.hidden=false; box.innerHTML=html; }
    };
    const selectedIndexes=(name)=>[...form.elements].filter(el=>el?.name===name && el.checked).map(x=>Number(x.value)).sort((a,b)=>a-b);
    const gradeExam=async ev=>{
      ev?.preventDefault?.();
      ev?.stopPropagation?.();
      if(form.dataset.t129Grading==='1') return;
      form.dataset.t129Grading='1';
      const gradeBtn=form.querySelector('[data-t129-grade-exam]');
      const oldGradeText=gradeBtn?.textContent||'Finalizar y corregir';
      if(gradeBtn){ gradeBtn.disabled=true; gradeBtn.textContent='Corrigiendo…'; }
      const resultBox=container.querySelector('.native-exam-result');
      try{
      let rawScore=0;
      const answers=[];
      form.querySelectorAll('.exam-question').forEach(q=>q.classList.remove('is-correct','is-wrong','is-partial'));
      form.querySelectorAll('.exam-options label,.exam-matching label,.exam-ordering label').forEach(l=>l.classList.remove('is-correct','is-wrong','is-selected','is-expected'));
      exam.questions.forEach((q,idx)=>{
        let fraction=0, value=null, correct=null, htmlParts=[];
        if(q.type==='matching'){
          const vals=q.pairs.map((p,i)=>form.elements[`q${idx}_${i}`]?.value || '');
          const ok=vals.filter((v,i)=>v===q.pairs[i].right).length;
          fraction=q.pairs.length?ok/q.pairs.length:0; value=vals; correct=q.pairs.map(p=>p.right);
          const labels=[...form.querySelectorAll(`[data-exam-q="${idx}"] .exam-matching label`)];
          htmlParts.push(`<p><strong>${statusTitle(fraction)}.</strong> ${ok}/${q.pairs.length} relaciones correctas.</p>`);
          htmlParts.push(`<ul>${q.pairs.map((p,i)=>{ const good=vals[i]===p.right; labels[i]?.classList.add(good?'is-correct':'is-wrong'); return `<li class="${good?'ok':'bad'}"><strong>${safe(p.left)}:</strong> ${good?'correcto':`marcaste “${safe(vals[i]||'sin respuesta')}”, debía ser “${safe(p.right)}”`}.</li>`; }).join('')}</ul>`);
          htmlParts=addGeneralFeedback(q, htmlParts);
        } else if(q.type==='ordering'){
          const vals=q.items.map((_,i)=>form.elements[`q${idx}_${i}`]?.value || '');
          const ok=vals.filter((v,i)=>v===q.items[i]).length;
          fraction=q.items.length?ok/q.items.length:0; value=vals; correct=q.items;
          const labels=[...form.querySelectorAll(`[data-exam-q="${idx}"] .exam-ordering label`)];
          htmlParts.push(`<p><strong>${statusTitle(fraction)}.</strong> ${ok}/${q.items.length} posiciones correctas.</p>`);
          htmlParts.push(`<p><strong>Tu orden:</strong> ${joinList(vals.filter(Boolean)) || 'sin respuesta'}.</p><p><strong>Orden correcto:</strong> ${joinList(q.items)}.</p>`);
          vals.forEach((v,i)=>labels[i]?.classList.add(v===q.items[i]?'is-correct':'is-wrong'));
          htmlParts=addGeneralFeedback(q, htmlParts);
        } else if(q.type==='multiple_choice'){
          const selected=selectedIndexes(`q${idx}[]`);
          const expected=q.options.map((o,i)=>o.correct?i:null).filter(x=>x!==null).sort((a,b)=>a-b);
          fraction=selected.length===expected.length && selected.every((v,i)=>v===expected[i]) ? 1 : 0; value=selected; correct=expected;
          const labels=[...form.querySelectorAll(`[data-exam-q="${idx}"] .exam-options label`)];
          labels.forEach((l,i)=>{
            if(expected.includes(i)) l.classList.add('is-correct','is-expected');
            if(selected.includes(i) && !expected.includes(i)) l.classList.add('is-wrong','is-selected');
            if(selected.includes(i) && expected.includes(i)) l.classList.add('is-selected');
          });
          htmlParts.push(`<p><strong>${statusTitle(fraction)}.</strong> En selección múltiple hay que marcar exactamente todas las opciones correctas y ninguna incorrecta.</p>`);
          htmlParts.push(`<p><strong>Marcaste:</strong> ${joinList(selected.map(i=>optionText(q,i))) || 'sin respuesta'}.</p><p><strong>Respuesta correcta:</strong> ${joinList(expected.map(i=>optionText(q,i)))}.</p>`);
          selected.filter(i=>optionRationale(q,i)).forEach(i=>htmlParts.push(`<p>${safe(optionRationale(q,i))}</p>`));
          expected.filter(i=>optionRationale(q,i) && !selected.includes(i)).forEach(i=>htmlParts.push(`<p>${safe(optionRationale(q,i))}</p>`));
          htmlParts=addGeneralFeedback(q, htmlParts);
        } else if(q.type==='short_text'){
          value=form.elements[`q${idx}`]?.value || '';
          fraction=scoreTextAnswer(value, q.acceptedAnswers, q.caseSensitive); correct=q.acceptedAnswers;
          const input=form.elements[`q${idx}`]; input?.classList.add(fraction===1?'is-correct':'is-wrong');
          htmlParts.push(`<p><strong>${statusTitle(fraction)}.</strong> ${fraction===1?'La respuesta coincide con una respuesta aceptada.':'La respuesta no coincide con las respuestas aceptadas.'}</p>`);
          htmlParts.push(`<p><strong>Tu respuesta:</strong> ${safe(value||'sin respuesta')}.</p><p><strong>Respuesta aceptada:</strong> ${joinList(q.acceptedAnswers)}.</p>`);
          htmlParts=addGeneralFeedback(q, htmlParts);
        } else if(q.type==='writing'){
          value=form.elements[`q${idx}`]?.value || '';
          fraction=scoreWriting(value, q); correct=q.acceptedAnswers?.length?q.acceptedAnswers:q.keywords;
          const words=String(value||'').trim().split(/\s+/).filter(Boolean);
          const missing=(q.keywords||[]).filter(k=>!textNorm(value,false).includes(textNorm(k,false)));
          const textarea=form.elements[`q${idx}`]; textarea?.classList.add(fraction===1?'is-correct':fraction>0?'is-partial':'is-wrong');
          htmlParts.push(`<p><strong>${statusTitle(fraction)}.</strong> Corrección objetiva por criterios configurados.</p>`);
          if(q.minWords) htmlParts.push(`<p><strong>Extensión:</strong> ${words.length}/${q.minWords} palabras mínimas${words.length<q.minWords?' (insuficiente)':' (correcto)'}.</p>`);
          if(q.acceptedAnswers?.length) htmlParts.push(`<p><strong>Respuesta aceptada:</strong> ${joinList(q.acceptedAnswers)}.</p>`);
          if(q.keywords?.length) htmlParts.push(`<p><strong>Palabras clave esperadas:</strong> ${joinList(q.keywords)}.${missing.length?` <strong>Faltan:</strong> ${joinList(missing)}.`:' Se han incluido todas.'}</p>`);
          htmlParts=addGeneralFeedback(q, htmlParts);
        } else {
          const selected=form.querySelector(`[name="q${idx}"]:checked`);
          value=selected?Number(selected.value):null;
          const expected=q.options.findIndex(o=>o.correct);
          fraction=value===expected ? 1 : 0; correct=expected;
          const labels=[...form.querySelectorAll(`[data-exam-q="${idx}"] .exam-options label`)];
          labels.forEach((l,i)=>{
            if(i===expected) l.classList.add('is-correct','is-expected');
            if(i===value && i!==expected) l.classList.add('is-wrong','is-selected');
            if(i===value && i===expected) l.classList.add('is-selected');
          });
          htmlParts.push(`<p><strong>${statusTitle(fraction)}.</strong> ${fraction===1?'Has elegido la opción correcta.':'La opción seleccionada no es correcta.'}</p>`);
          htmlParts.push(`<p><strong>Tu respuesta:</strong> ${value===null?'sin respuesta':safe(optionText(q,value))}.</p><p><strong>Respuesta correcta:</strong> ${safe(optionText(q,expected))}.</p>`);
          if(value!==null && optionRationale(q,value)) htmlParts.push(`<p>${safe(optionRationale(q,value))}</p>`);
          if(expected>=0 && optionRationale(q,expected) && expected!==value) htmlParts.push(`<p>${safe(optionRationale(q,expected))}</p>`);
          htmlParts=addGeneralFeedback(q, htmlParts);
        }
        rawScore += fraction*perQuestion;
        const feedbackHtml=`<div class="exam-feedback-card ${fraction===1?'is-correct':fraction>0?'is-partial':'is-wrong'}">${htmlParts.join('')}</div>`;
        markQuestion(idx,fraction,feedbackHtml);
        answers.push({question:q.prompt,type:q.type,value,correct,fraction,feedback:htmlParts.map(x=>x.replace(/<[^>]+>/g,' ')).join(' ').replace(/\s+/g,' ').trim()});
      });
      const score=Math.max(0, Math.min(10, Number(rawScore.toFixed(2))));
      const result={score, max_score:10, answers, completed_at:new Date().toISOString()};
      const resultBox=container.querySelector('.native-exam-result');
      resultBox.hidden=false;
      resultBox.innerHTML=`<div class="exam-score-card"><strong>${score.toFixed(2)}/10</strong><span>Ejercicio corregido</span><p>${answers.filter(a=>a.fraction===1).length}/${answers.length} preguntas completamente correctas. Revisa debajo de cada pregunta el feedback en verde, rojo o dorado.</p><button type="button" class="secondary-btn" data-t111-retake-exam>Rehacer ejercicio</button></div>`;
      form.dataset.t103Finished='1';
      form.querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=true);
      resultBox.querySelector('[data-t111-retake-exam]')?.addEventListener('click',()=>{
        delete container.dataset.t103Rendered;
        renderNativeExam(container);
        container.scrollIntoView?.({behavior:'smooth', block:'start'});
      });
      const savedAttempt=await saveExamAttempt(materialId, exam, result);
      if(savedAttempt && typeof attemptPrintButton==='function'){
        const card=resultBox.querySelector('.exam-score-card');
        if(card) card.insertAdjacentHTML('beforeend', `<div class="attempt-pdf-actions-v148">${attemptPrintButton(savedAttempt,'Descargar este intento en PDF')}</div>`);
      }
      updateAttemptHistoryBox(container, materialId);
      } catch(error){
        console.error('[Tribeca Aula] No se pudo corregir el simulacro:', error);
        const box=container.querySelector('.native-exam-result');
        if(box){
          box.hidden=false;
          box.innerHTML=`<div class="exam-score-card exam-score-error"><strong>No se pudo corregir</strong><span>Ha ocurrido un error al procesar el cuestionario.</span><p>${safe(error?.message || 'Error de corrección')}</p><button type="button" class="secondary-btn" data-t129-retry-exam>Intentar de nuevo</button></div>`;
          box.querySelector('[data-t129-retry-exam]')?.addEventListener('click',()=>{ box.hidden=true; box.innerHTML=''; form.dataset.t129Grading=''; const btn=form.querySelector('[data-t129-grade-exam]'); if(btn){ btn.disabled=false; btn.textContent=oldGradeText; } });
        }
        toast('No se pudo corregir el cuestionario. Revisa la publicación o inténtalo de nuevo.');
      } finally {
        if(form.dataset.t103Finished!=='1'){
          form.dataset.t129Grading='';
          const btn=form.querySelector('[data-t129-grade-exam]');
          if(btn){ btn.disabled=false; btn.textContent=oldGradeText; }
        }
      }
    };
    form.dataset.tribecaNativeForm='exam';
    form.addEventListener('submit', gradeExam, true);
    form.querySelector('[data-t129-grade-exam]')?.addEventListener('click', gradeExam);
    container.dataset.t103Rendered='1';
  }
  async function saveExamAttempt(materialId, exam, result){
    if(!materialId || !State.profile?.id) return null;
    if(roleTeacher()){
      toast(`Ejercicio corregido en modo docente (${Number(result.score||0).toFixed(2)}/10). No se guarda en el perfil del alumnado.`);
      return null;
    }
    const material=(State.data.materials||[]).find(m=>String(m.id)===String(materialId)) || {};
    const row={
      user_id:State.profile.id,
      material_id:materialId,
      class_id:material.class_id || null,
      class_subject_id:material.class_subject_id || null,
      class_unit_id:material.class_unit_id || null,
      subject:material.subject || exam.subject || '',
      unit_title:material.unit_title || material.unit || exam.unit || '',
      title:material.title || exam.title || 'Ejercicio autocorregible',
      score:result.score,
      max_score:10,
      percent:Math.round((Number(result.score||0)/10)*100),
      answers:result.answers || [],
      correction:result,
      teacher_feedback: result.teacher_feedback || null,
      teacher_comment: result.teacher_comment || null,
      completed_at:result.completed_at || new Date().toISOString()
    };
    const inserted = await maybe(table('exam_attempts').insert(row).select('*').single(), null);
    await maybe(table('material_completions').upsert({user_id:State.profile.id, material_id:materialId, completed_at:row.completed_at},{onConflict:'user_id,material_id'}));
    const savedAttempt = inserted || row;
    if(Number(row.score||0) <= 5){
      await tribecaDispatchPushNotification('activity', {
        preferenceKey:'',
        title:`Actividad con nota baja: ${displayName(State.profile)}`,
        body:`${row.title || 'Actividad'} · ${Number(row.score||0).toFixed(2)}/10. Conviene revisar el intento.`,
        targetRole:'teacher',
        section:'activityAnalytics',
        url:tribecaHistoryUrl('activityAnalytics', {studentId:State.profile.id}),
        includeActor:false
      });
    }
    await loadData(true);
    toast(`Ejercicio corregido: ${Number(row.score).toFixed(2)}/10. Intento guardado.`);
    return savedAttempt;
  }

  function hydrateNativeExams(root=document){
    const scope=root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.native-exam-block[data-t103-exam]').forEach(renderNativeExam);
  }


  function parseSchemaActivityFromInteractiveCode(code=''){
    const raw=stripEmbedCodeFence(code);
    if(!raw) return null;
    if(raw.startsWith('tribeca-schema-json::') || raw.startsWith('tribeca-activity-json::')){
      const prefix=raw.startsWith('tribeca-schema-json::') ? 'tribeca-schema-json::' : 'tribeca-activity-json::';
      try{ return normalizeSchemaActivityPayload(JSON.parse(raw.slice(prefix.length))); }catch(_e){ return null; }
    }
    if(/^\s*[\[{]/.test(raw)){
      try{ return normalizeSchemaActivityPayload(JSON.parse(raw)); }catch(_e){}
    }
    const jsonScript=raw.match(/<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i);
    if(jsonScript){
      try{ return normalizeSchemaActivityPayload(JSON.parse(jsonScript[1])); }catch(_e){}
    }
    const names=['schemaActivity','tribecaActivity','activityData','schemaData','esquemaData'];
    for(const name of names){
      const re=new RegExp(`(?:window\\.)?${name}\\s*=|\\b${name}\\b`,'i');
      const found=raw.search(re);
      if(found<0) continue;
      const obj=extractBalancedObjectLiteral(raw, found);
      if(obj){
        try{ const activity=normalizeSchemaActivityPayload(Function(`"use strict"; return (${obj});`)()); if(activity) return activity; }
        catch(error){ console.warn('[Tribeca Aula] No se pudo extraer esquema interactivo:', name, error); }
      }
    }
    return null;
  }
  function schemaActivityPayloadToStorage(payload){
    const activity=normalizeSchemaActivityPayload(payload);
    return activity ? `tribeca-schema-json::${JSON.stringify(activity)}` : '';
  }
  function normalizeSchemaActivityPayload(payload){
    let raw=payload;
    if(typeof raw==='string'){
      try{ raw=JSON.parse(stripEmbedCodeFence(raw).replace(/^tribeca-(?:schema|activity)-json::/,'')); }catch(_e){ return null; }
    }
    if(!raw || typeof raw!=='object') return null;
    const asArray=value=>Array.isArray(value) ? value : [];
    const firstArray=(...values)=>values.find(value=>Array.isArray(value) && value.length) || [];
    const activityConfig=raw.activity || raw.actividad || {};
    const rendering=raw.rendering || raw.render || {};
    const explicitLayout=raw.layout || {};
    const explicitNodes=firstArray(raw.nodes, explicitLayout.nodes);
    const explicitEdges=firstArray(raw.edges, explicitLayout.edges);
    const explicitTree=raw.tree || raw.esquema_jerarquico || raw.schemaTree || null;
    const activityType=String(raw.activityType || raw.activity_type || raw.publicationType || raw.kind || raw.type || raw.category || '').trim();
    const hasSchema=!!(raw.schema && (Array.isArray(raw.schema.branches) || Array.isArray(raw.schema.nodes)));
    const hasZones=Array.isArray(raw.dropZones || raw.drop_zones || raw.blanks || raw.huecos);
    const hasExplicit=explicitNodes.length>0 || !!explicitTree;
    const isTribeca=String(raw.type||'').toLowerCase()==='tribeca-activity';
    if(!isTribeca && !/schema|esquema|drag.?drop|fill|mapa.?conceptual/i.test(activityType) && !(hasSchema && hasZones) && !hasExplicit) return null;
    const itemSources=firstArray(raw.draggableItems, raw.draggable_items, raw.items, raw.words, raw.palabras, raw.wordBank, raw.palabras_para_arrastrar);
    const items=itemSources.map((it,idx)=>{
      if(typeof it==='string') return {id:`item_${idx+1}`, text:it, correctDropZoneId:''};
      return {
        id:String(it.id || it.key || it.value || it.correctWordId || `item_${idx+1}`),
        text:String(it.text || it.texto || it.label || it.title || it.value || it.answerText || it.correctAnswer || it.id || ''),
        correctDropZoneId:String(it.correctDropZoneId || it.correct_drop_zone_id || it.target || it.dropZoneId || '')
      };
    }).filter(it=>it.id && it.text);
    const itemTextById=new Map(items.map(it=>[String(it.id), it.text]));
    const itemTargetById=new Map(items.filter(it=>it.correctDropZoneId).map(it=>[String(it.id), String(it.correctDropZoneId)]));
    const zoneSources=firstArray(raw.dropZones, raw.drop_zones, raw.blanks, raw.huecos);
    const zones=zoneSources.map((z,idx)=>{
      const id=String(z.id || z.dropZoneId || z.drop_zone_id || z.blankId || z.blank_id || z.nodeId || z.key || `blank_${idx+1}`);
      const acceptedItemIds=asArray(z.acceptedItemIds || z.accepted_item_ids || z.acceptedItems || z.accepted_items).map(String).filter(Boolean);
      const directCorrectItem=String(z.correctItemId || z.correct_item_id || z.correctWordId || z.correct_word_id || z.correctWord || z.answerItemId || z.answer_item_id || z.itemId || '');
      const inferredItem=(items.find(it=>String(it.correctDropZoneId)===id)?.id) || '';
      const correctItemId=String(directCorrectItem || inferredItem || (acceptedItemIds.length===1 ? acceptedItemIds[0] : '') || '');
      if(correctItemId && !acceptedItemIds.includes(correctItemId)) acceptedItemIds.unshift(correctItemId);
      const acceptedAnswers=[...asArray(z.acceptedText || z.accepted_text), ...asArray(z.acceptedAnswers || z.accepted_answers), ...asArray(z.answers || z.respuestas)].map(String).filter(Boolean);
      const correctText=String(z.correctText || z.correct_text || z.answerText || z.answer_text || z.answer || z.correctAnswer || z.correct_answer || z.expected || itemTextById.get(correctItemId) || '');
      if(correctText && !acceptedAnswers.includes(correctText)) acceptedAnswers.unshift(correctText);
      acceptedItemIds.forEach(itemId=>{ const text=itemTextById.get(String(itemId)); if(text && !acceptedAnswers.includes(text)) acceptedAnswers.push(text); });
      const pos=z.position || {};
      const size=z.size || {};
      return {
        id,
        correctItemId,
        acceptedItemIds,
        correctText,
        acceptedAnswers,
        section:String(z.section||z.apartado||''),
        label:String(z.label||z.prompt||z.description||z.descripcion||''),
        afterText:String(z.afterText||z.after_text||z.continuesTo||z.endsIn||''),
        feedback:z.feedback || {},
        position:{x:Number(pos.x ?? z.x ?? 0)||0, y:Number(pos.y ?? z.y ?? 0)||0},
        size:{width:Number(size.width ?? z.width ?? 150)||150, height:Number(size.height ?? z.height ?? 44)||44}
      };
    }).filter(z=>z.id);
    const answerKey=asArray(raw.answerKey || raw.answer_key).map(a=>({
      dropZoneId:String(a.dropZoneId||a.drop_zone_id||a.blankId||a.id||''),
      correctItemId:String(a.correctItemId||a.correct_item_id||a.correctWordId||a.correct_word_id||a.correctWord||''),
      acceptedItemIds:asArray(a.acceptedItemIds || a.accepted_item_ids).map(String).filter(Boolean),
      correctText:String(a.correctText||a.correct_text||a.correctAnswer||a.answerText||a.answer||''),
      acceptedText:asArray(a.acceptedText || a.accepted_text || a.acceptedAnswers || a.accepted_answers).map(String).filter(Boolean)
    })).filter(a=>a.dropZoneId);
    answerKey.forEach(a=>{
      const z=zones.find(zone=>zone.id===a.dropZoneId);
      if(!z) return;
      if(a.correctItemId) z.correctItemId=a.correctItemId;
      if(a.correctItemId && !z.acceptedItemIds.includes(a.correctItemId)) z.acceptedItemIds.unshift(a.correctItemId);
      if(a.acceptedItemIds.length) z.acceptedItemIds=[...new Set([...(z.acceptedItemIds||[]), ...a.acceptedItemIds])];
      if(a.correctText) z.correctText=a.correctText;
      a.acceptedText.forEach(txt=>{ if(txt && !z.acceptedAnswers.includes(txt)) z.acceptedAnswers.push(txt); });
      if(z.correctText && !z.acceptedAnswers.includes(z.correctText)) z.acceptedAnswers.unshift(z.correctText);
      if(!z.correctText && z.correctItemId && itemTextById.has(z.correctItemId)) z.correctText=itemTextById.get(z.correctItemId);
      (z.acceptedItemIds||[]).forEach(itemId=>{ const text=itemTextById.get(String(itemId)); if(text && !z.acceptedAnswers.includes(text)) z.acceptedAnswers.push(text); });
    });
    items.forEach(it=>{
      const target=itemTargetById.get(String(it.id));
      if(!target) return;
      const z=zones.find(zone=>String(zone.id)===String(target));
      if(!z) return;
      if(!z.correctItemId) z.correctItemId=String(it.id);
      if(!z.acceptedItemIds.includes(String(it.id))) z.acceptedItemIds.unshift(String(it.id));
      if(!z.correctText) z.correctText=it.text;
      if(!z.acceptedAnswers.includes(it.text)) z.acceptedAnswers.push(it.text);
    });
    const settings={...(raw.settings || raw.config || raw.configuration || {})};
    const modeRaw=String(raw.mode || raw.interactionMode || raw.interaction_mode || settings.mode || settings.interactionMode || activityConfig.mode || activityConfig.modalidade || activityConfig.interaction || activityType || '').toLowerCase();
    const mode=/write|typing|fill_text|input|escribir|texto|casilla/.test(modeRaw) ? 'write' : 'drag';
    const treeToSchemaNode=n=>({
      titleBlankId: n.fixed || n.locked ? '' : String(n.id||n.dropZoneId||''),
      title: n.fixed || n.locked ? String(n.label || n.text || n.answerText || '') : '',
      nodes: asArray(n.children).map(treeToSchemaNode)
    });
    const treeToSchema=t=>({
      root:String(t.label || t.text || t.answerText || raw.root || 'ESQUEMA'),
      branches:asArray(t.children).map(treeToSchemaNode)
    });
    const schema=raw.schema || (explicitTree ? treeToSchema(explicitTree) : {root:raw.root || raw.label || 'ESQUEMA', branches:[]});
    const canvas=rendering.canvas || explicitLayout.canvas || {};
    const layoutType=String(rendering.type || explicitLayout.type || '').toLowerCase();
    const cssStyleObject=obj=>obj && typeof obj==='object' && !Array.isArray(obj) ? obj : null;
    const styleKeyFor=n=>{
      if(typeof n.style==='string') return n.style;
      const st=cssStyleObject(n.style);
      const bg=String(st?.background||st?.backgroundColor||'').toLowerCase();
      if(n.locked || n.fixed || n.type==='fixed' || n.kind==='fixed' || /050505|000|111|172018/.test(bg)) return 'root-black';
      if(bg && bg!=='#ffffff' && bg!=='white') return 'section-dark';
      if(Number(n.width||0)>300) return 'wide';
      return 'standard';
    };
    const normalizeNode=(n,idx)=>{
      const pos=n.position || {};
      const size=n.size || {};
      const id=String(n.id || n.dropZoneId || n.nodeId || `node_${idx+1}`);
      const z=zones.find(zone=>String(zone.id)===id || String(zone.id)===String(n.dropZoneId||''));
      return {
        id,
        text:String(n.text || n.label || ''),
        answerText:String(n.answerText || n.answer_text || n.correctText || n.correctAnswer || z?.correctText || ''),
        x:Number(n.x ?? pos.x ?? z?.position?.x ?? 0)||0,
        y:Number(n.y ?? pos.y ?? z?.position?.y ?? 0)||0,
        width:Number(n.width ?? size.width ?? z?.size?.width ?? 150)||150,
        height:Number(n.height ?? size.height ?? z?.size?.height ?? 44)||44,
        kind:String(n.kind || n.type || (z?'dropzone':'')).toLowerCase(),
        style:String(styleKeyFor(n) || ''),
        nodeStyle:cssStyleObject(n.style) || {},
        placeholder:String(n.placeholder || rendering.nodeStyle?.emptyLabel || 'Arrastra aquí'),
        locked:!!(n.locked || n.fixed)
      };
    };
    let nodesForLayout=explicitNodes.map(normalizeNode);
    if(!nodesForLayout.length && zones.some(z=>Number(z.position?.x||0) || Number(z.position?.y||0))){
      nodesForLayout=zones.map((z,idx)=>normalizeNode({id:z.id, type:'dropzone', x:z.position.x, y:z.position.y, width:z.size.width, height:z.size.height, placeholder:'Arrastra aquí'}, idx));
    }
    const canvasWidth=Number(canvas.width || rendering.width || explicitLayout.width || raw.width || 0) || 0;
    const canvasHeight=Number(canvas.height || rendering.height || explicitLayout.height || raw.height || 0) || 0;
    return {
      type:'tribeca-activity',
      schemaVersion:raw.schemaVersion || raw.schema_version || '1.0',
      activityType:activityType || (mode==='write'?'fill_schema':'drag_drop_schema'),
      mode,
      title:String(raw.title || raw.titulo || raw.name || 'Esquema interactivo'),
      subject:String(raw.subject || raw.materia || ''),
      course:String(raw.course || raw.curso || ''),
      unit:String(raw.unit || raw.unidad || ''),
      language:String(raw.language || raw.idioma || 'es'),
      description:String(raw.description || raw.descripcion || ''),
      instructions:String(raw.instructions || raw.instrucciones || ''),
      settings:{singleUseDraggables:true, ...settings, ...(activityConfig.singleUseDraggables!==undefined?{singleUseDraggables:activityConfig.singleUseDraggables}:{})},
      supportTools:raw.supportTools || raw.support_tools || raw.support || raw.tools || raw.herramientas_apoyo || {},
      draggableItems:items,
      dropZones:zones,
      answerKey:zones.map(z=>({dropZoneId:z.id, correctItemId:z.correctItemId, acceptedItemIds:z.acceptedItemIds||[], correctText:z.correctText, acceptedText:z.acceptedAnswers||[]})),
      schema,
      layout:{
        type:(layoutType==='explicit_tree_layout' || layoutType==='absolute' || nodesForLayout.length) ? 'explicit_tree_layout' : '',
        canvas:{width:canvasWidth, height:canvasHeight},
        nodes:nodesForLayout,
        edges:explicitEdges.map(e=>({from:String(e.from||''), to:String(e.to||''), type:String(e.type||e.connector||'elbow'), arrow:e.arrow!==false && e.endMarker!==false && e.markerEnd!==false, edgeStyle:e.style||{}})).filter(e=>e.from&&e.to)
      },
      feedback:raw.feedback || raw.feedbackFinal || {},
      accessibility:raw.accessibility || {},
      publication:raw.publication || raw.storage || {}
    };
  }
  function schemaActivityBlank(activity, blankId, mode='drag'){
    const z=(activity.dropZones||[]).find(x=>String(x.id)===String(blankId));
    const label=z?.label || 'Oco do esquema';
    const after=z?.afterText || '';
    if(mode==='write'){
      return `<span class="schema-blank schema-blank-write" data-t133-zone="${safe(blankId)}"><input type="text" aria-label="${safe(label)}" placeholder="Escribe aquí"><small>${safe(label)}</small></span>${after?`<span class="schema-after">${safe(after)}</span>`:''}`;
    }
    return `<button type="button" class="schema-blank schema-drop-zone" data-t133-zone="${safe(blankId)}" aria-label="${safe(label)}"><span class="schema-placeholder">Soltar aquí</span><small>${safe(label)}</small></button>${after?`<span class="schema-after">${safe(after)}</span>`:''}`;
  }
  function schemaActivityNodeHtml(node={}, activity={}, mode='drag'){
    const titleBlank=node.titleBlankId || node.title_blank_id || '';
    const blank=node.blankId || node.blank_id || '';
    const concept=node.concept || node.title || node.label || '';
    const continues=node.continuesTo || node.continues_to || '';
    const ends=node.endsIn || node.ends_in || node.afterText || '';
    const tooltipId=node.tooltipId || node.tooltip_id || '';
    const tooltip=tooltipId ? ((activity.supportTools?.tooltips||[]).find(t=>String(t.id)===String(tooltipId))||null) : null;
    const children=node.nodes || node.subdivisions || node.children || [];
    const main=titleBlank ? schemaActivityBlank(activity,titleBlank,mode) : `${concept?`<strong>${safe(concept)}</strong>`:''}${blank?schemaActivityBlank(activity,blank,mode):''}${continues?`<span class="schema-arrow">→</span><span>${safe(continues)}</span>`:''}${ends?`<span class="schema-arrow">→</span><span>${safe(ends)}</span>`:''}${tooltip?`<button type="button" class="schema-tooltip" title="${safe(tooltip.explanation)}">?</button>`:''}`;
    return `<li class="schema-node"><div class="schema-node-line">${main || '<span>Elemento</span>'}</div>${children.length?`<ul>${children.map(ch=>schemaActivityNodeHtml(ch,activity,mode)).join('')}</ul>`:''}</li>`;
  }
  function schemaActivityExplicitLayoutHtml(activity={}, mode='drag'){
    let nodes=Array.isArray(activity.layout?.nodes) ? activity.layout.nodes : [];
    const zonesById=new Map((activity.dropZones||[]).map(z=>[String(z.id), z]));
    if(!nodes.length && (activity.dropZones||[]).some(z=>Number(z.position?.x||0) || Number(z.position?.y||0))){
      nodes=(activity.dropZones||[]).map(z=>({id:z.id, kind:'dropzone', x:z.position?.x||0, y:z.position?.y||0, width:z.size?.width||150, height:z.size?.height||44, placeholder:'Arrastra aquí'}));
    }
    if(!Array.isArray(nodes) || !nodes.length) return '';
    const byId=new Map(nodes.map(n=>[String(n.id), n]));
    const width=Number(activity.layout?.canvas?.width||0) || Math.max(900, ...nodes.map(n=>Number(n.x||0)+Number(n.width||150)+60));
    const height=Number(activity.layout?.canvas?.height||0) || Math.max(520, ...nodes.map(n=>Number(n.y||0)+Number(n.height||44)+60));
    const center=(n,side)=>{ const x=Number(n.x||0), y=Number(n.y||0), w=Number(n.width||150), h=Number(n.height||44); return side==='left'?[x,y+h/2]:[x+w,y+h/2]; };
    const pathFor=e=>{ const a=byId.get(String(e.from)), b=byId.get(String(e.to)); if(!a||!b) return ''; const [x1,y1]=center(a,'right'); const [x2,y2]=center(b,'left'); const mid=Math.max(x1+24, Math.min(x2-24, (x1+x2)/2)); return `<path d="M ${x1} ${y1} H ${mid} V ${y2} H ${x2}" class="schema-map-edge" ${e.arrow!==false?'marker-end="url(#schemaArrow)"':''}/>`; };
    const cssName=name=>String(name||'').replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`).replace(/[^a-z0-9-]/gi,'');
    const inlineNodeStyle=n=>{
      const st=(n.nodeStyle && typeof n.nodeStyle==='object') ? n.nodeStyle : ((n.style && typeof n.style==='object') ? n.style : null);
      const allowed=['background','backgroundColor','color','border','borderRadius','fontWeight','boxShadow'];
      const css=st ? allowed.map(k=>st[k]!==undefined ? `${cssName(k)}:${String(st[k]).replace(/[;<>]/g,'')}` : '').filter(Boolean).join(';') : '';
      return `left:${Number(n.x||0)}px;top:${Number(n.y||0)}px;width:${Number(n.width||150)}px;height:${Number(n.height||44)}px;${css?`;${css}`:''}`;
    };
    const nodeHtml=n=>{
      const id=String(n.id||'');
      const z=zonesById.get(id);
      const style=inlineNodeStyle(n);
      const styleName=typeof n.style==='string' ? n.style : (n.locked||n.kind==='fixed'||n.type==='fixed' ? 'root-black' : 'standard');
      const cls=`schema-map-node schema-map-style-${safe(String(styleName||'standard'))}`;
      if(!z || n.kind==='fixed' || n.type==='fixed' || n.locked) return `<div class="${cls} schema-map-fixed" style="${style}">${safe(n.text || n.label || n.answerText || id)}</div>`;
      const small='';
      if(mode==='write') return `<span class="${cls} schema-blank schema-blank-write schema-map-drop" style="${style}" data-t133-zone="${safe(id)}"><input type="text" aria-label="${safe(z.label||z.correctText||id)}" placeholder="${safe(n.placeholder||'Escribe aquí')}">${small}</span>`;
      return `<button type="button" class="${cls} schema-blank schema-drop-zone schema-map-drop" style="${style}" data-t133-zone="${safe(id)}" aria-label="${safe(z.label||z.correctText||id)}"><span class="schema-placeholder">${safe(n.placeholder||'Arrastra aquí')}</span>${small}</button>`;
    };
    const edges=(activity.layout?.edges||[]).map(pathFor).join('');
    return `<div class="schema-map-viewport schema-map-fit" data-schema-map-width="${width}" data-schema-map-height="${height}"><div class="schema-map-canvas" style="--schema-map-width:${width}px;--schema-map-height:${height}px;"><svg class="schema-map-connectors" viewBox="0 0 ${width} ${height}" aria-hidden="true"><defs><marker id="schemaArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L8,3 z"></path></marker></defs>${edges}</svg>${nodes.map(nodeHtml).join('')}</div></div>`;
  }
  function schemaActivityTreeHtml(activity={}, mode='drag'){
    const explicit=schemaActivityExplicitLayoutHtml(activity, mode);
    if(explicit) return explicit;
    const schema=activity.schema || {};
    const branches=schema.branches || schema.nodes || [];
    return `<div class="schema-tree"><div class="schema-root">${safe(schema.root || activity.title || 'ESQUEMA')}</div><div class="schema-branches">${branches.map(branch=>{ const title=branch.titleBlankId ? schemaActivityBlank(activity,branch.titleBlankId,mode) : `<strong>${safe(branch.title || branch.concept || 'Apartado')}</strong>`; const nodes=branch.nodes || branch.subdivisions || branch.children || []; return `<section class="schema-branch"><h5>${title}</h5><ul>${nodes.map(n=>schemaActivityNodeHtml(n,activity,mode)).join('')}</ul></section>`; }).join('')}</div></div>`;
  }
    function schemaActivityMarkup(activity, m={}){
    const normalized=normalizeSchemaActivityPayload(activity);
    if(!normalized) return '';
    const encoded=encodeBase64Utf8(JSON.stringify(normalized));
    return `<section class="material-embed-block schema-activity-shell"><div><strong>Esquema interactivo</strong><small>Autocorregible · feedback inmediato</small></div><div class="schema-activity-block" data-t133-schema="${safe(encoded)}" data-material-id="${safe(m.id||'')}"><p>Cargando esquema interactivo…</p></div></section>`;
  }
  function schemaActivityStandaloneHtml(activity={}, m={}){
    const normalized=normalizeSchemaActivityPayload(activity)||activity||{};
    const encoded=encodeBase64Utf8(JSON.stringify(normalized));
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(normalized.title||m.title||'Esquema interactivo')}</title><style>body{margin:0;background:#f7f4ec;color:#172018;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;overflow:auto}.wrap{width:98vw;max-width:none;margin:0 auto;padding:12px}.schema-activity-shell{background:#fffdf7;border:1px solid #e0d7c0;border-radius:16px;padding:16px}.schema-bank{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.schema-draggable{border:1px solid #d7ccb5;border-radius:999px;background:#fff;padding:8px 12px;font-weight:800;cursor:pointer}.schema-draggable.is-used{opacity:.35}.schema-root,.schema-branch{border:1px solid #ded3bb;border-radius:14px;background:#fff;margin:10px 0;padding:12px}.schema-root{text-align:center;font-weight:900;color:#0b3d22}.schema-branches{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}.schema-node{margin:8px 0}.schema-node-line{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.schema-blank{border:1px dashed #9f8f70;border-radius:12px;min-width:150px;min-height:42px;background:#fffaf0;padding:7px 10px;font-weight:800}.schema-blank small{display:block;font-size:11px;color:#6a6458;font-weight:700}.schema-blank.is-correct{border-color:#1d6f3a;background:#edf8f0}.schema-blank.is-wrong{border-color:#a33;background:#fff0ed}.schema-after{color:#6a6458}.schema-feedback{border-radius:12px;margin-top:12px;padding:12px;background:#f2efe4}.schema-result{margin-top:12px}.schema-map-viewport{overflow:hidden;border:1px solid #e0d7c0;border-radius:16px;background:#fffaf0;padding:10px;width:100%;max-width:100%;box-sizing:border-box}.schema-map-viewport.schema-map-fit{max-width:100%;overflow:hidden}.schema-map-viewport.schema-map-fit .schema-map-canvas{transform-origin:0 0}.schema-map-canvas{position:relative;width:var(--schema-map-width);height:var(--schema-map-height);min-width:var(--schema-map-width);min-height:var(--schema-map-height);background:#fffdf7;border-radius:12px}.schema-map-connectors{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.schema-map-edge{fill:none;stroke:#222;stroke-width:2.5}.schema-map-connectors marker path{fill:#222}.schema-map-node{position:absolute;box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center}.schema-map-fixed{border:2px solid #111;background:#172018;color:#fff;border-radius:12px;font-weight:900;padding:8px}.schema-map-drop .schema-blank{width:100%;height:100%;box-sizing:border-box}.schema-map-drop small{display:none!important}.schema-drag-ghost{box-shadow:0 18px 40px rgba(0,0,0,.2);opacity:.92}.primary-btn,.secondary-btn{border:0;border-radius:999px;padding:9px 14px;font-weight:900;cursor:pointer}.primary-btn{background:#0b3d22;color:#fff}.secondary-btn{background:#eee4d0;color:#0b3d22}</style></head><body class="schema-standalone-page"><main class="wrap"><section class="schema-activity-shell" data-schema-standalone="1"><div class="schema-activity-block" data-t133-schema="${safe(encoded)}"></div></section></main><script>(${schemaActivityStandaloneRunner.toString()})();<\/script></body></html>`;
  }
  function schemaActivityStandaloneRunner(){
    const safe=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const decodeBase64Utf8=value=>{try{const binary=atob(String(value||''));const bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));return new TextDecoder().decode(bytes);}catch(e){return '';}};
    const norm=value=>String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toLowerCase();
    const block=document.querySelector('[data-t133-schema]');
    if(!block) return;
    const fitMaps=()=>{
      block.querySelectorAll('.schema-map-viewport.schema-map-fit').forEach(viewport=>{
        const canvas=viewport.querySelector('.schema-map-canvas');
        if(!canvas) return;
        const rawW=Number(viewport.dataset.schemaMapWidth||0) || parseFloat(getComputedStyle(canvas).getPropertyValue('--schema-map-width')) || canvas.scrollWidth || 0;
        const rawH=Number(viewport.dataset.schemaMapHeight||0) || parseFloat(getComputedStyle(canvas).getPropertyValue('--schema-map-height')) || canvas.scrollHeight || 0;
        if(!rawW || !rawH) return;
        const availableW=Math.max(320, viewport.clientWidth || viewport.getBoundingClientRect().width || 0) - 8;
        const maxH=Math.max(640, Math.min(Math.round((window.innerHeight||900)*0.84), 920));
        const scale=Math.max(0.62, Math.min(1, availableW / rawW, maxH / rawH));
        const fitH=Math.ceil(rawH * scale) + 16;
        canvas.style.width=`${rawW}px`;
        canvas.style.height=`${rawH}px`;
        canvas.style.minWidth=`${rawW}px`;
        canvas.style.minHeight=`${rawH}px`;
        canvas.style.transformOrigin='0 0';
        canvas.style.transform=`scale(${scale})`;
        viewport.style.height=`${fitH}px`;
        viewport.style.minHeight=`${fitH}px`;
        viewport.style.maxHeight=`${fitH}px`;
        viewport.style.overflow='hidden';
      });
    };
    window.addEventListener('resize', fitMaps);
    let activity=null;
    try{ activity=JSON.parse(decodeBase64Utf8(block.dataset.t133Schema||'')); }catch(_e){ activity=null; }
    if(!activity){ block.innerHTML='<p>No se pudo cargar el esquema.</p>'; return; }
    const mode=activity.mode==='write'?'write':'drag';
    const itemById=new Map((activity.draggableItems||[]).map(it=>[String(it.id),it]));
    const answerByZone=new Map((activity.dropZones||[]).map(z=>[String(z.id),z]));
    const acceptedFor=z=>{const vals=[...(z.acceptedAnswers||[]), ...(z.acceptedText||[])]; if(z.correctText) vals.push(z.correctText); (z.acceptedItemIds||[]).forEach(id=>{const it=itemById.get(String(id)); if(it&&it.text) vals.push(it.text);}); if(z.correctItemId&&itemById.get(String(z.correctItemId))&&itemById.get(String(z.correctItemId)).text) vals.push(itemById.get(String(z.correctItemId)).text); return [...new Set(vals.filter(Boolean).map(String))];};
    const currentText=zone=>mode==='write'?(zone.querySelector('input')?.value||''):(zone.dataset.itemText || (zone.dataset.item&&itemById.get(String(zone.dataset.item))?.text)||'');
    const zoneOk=zone=>{const z=answerByZone.get(String(zone.dataset.zone||''))||{}; const item=String(zone.dataset.item||''); if(item && (String(z.correctItemId||'')===item || (z.acceptedItemIds||[]).map(String).includes(item))) return true; const val=currentText(zone); return !!val && acceptedFor(z).some(a=>norm(a)===norm(val));};
    const blank=(id,node={})=>{ const z=answerByZone.get(String(id))||{}; if(mode==='write') return `<span class="schema-blank schema-blank-write" data-zone="${safe(id)}"><input type="text" placeholder="Escribe aquí" aria-label="${safe(z.label||z.correctText||id)}"></span>`; return `<button type="button" class="schema-blank schema-drop-zone" data-zone="${safe(id)}"><span>${safe(node.placeholder||'Arrastra aquí')}</span></button>`; };
    const explicitHtml=()=>{let nodes=activity.layout?.nodes||[]; if(!nodes.length && (activity.dropZones||[]).some(z=>Number(z.position?.x||0)||Number(z.position?.y||0))){nodes=(activity.dropZones||[]).map(z=>({id:z.id,kind:'dropzone',x:z.position?.x||0,y:z.position?.y||0,width:z.size?.width||150,height:z.size?.height||44,placeholder:'Arrastra aquí'}));} if(!nodes.length) return ''; const byId=new Map(nodes.map(n=>[String(n.id),n])); const w=Number(activity.layout?.canvas?.width||0)||Math.max(900,...nodes.map(n=>Number(n.x||0)+Number(n.width||150)+60)); const h=Number(activity.layout?.canvas?.height||0)||Math.max(520,...nodes.map(n=>Number(n.y||0)+Number(n.height||44)+60)); const center=(n,side)=>{const x=Number(n.x||0),y=Number(n.y||0),ww=Number(n.width||150),hh=Number(n.height||44); return side==='left'?[x,y+hh/2]:[x+ww,y+hh/2];}; const edge=e=>{const a=byId.get(String(e.from)),b=byId.get(String(e.to)); if(!a||!b) return ''; const [x1,y1]=center(a,'right'),[x2,y2]=center(b,'left'),mid=Math.max(x1+24,Math.min(x2-24,(x1+x2)/2)); return `<path d="M ${x1} ${y1} H ${mid} V ${y2} H ${x2}" class="schema-map-edge" marker-end="url(#schemaArrow)"></path>`;}; const cssName=name=>String(name||'').replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`).replace(/[^a-z0-9-]/gi,''); const inlineStyle=n=>{const st=n.nodeStyle&&typeof n.nodeStyle==='object'?n.nodeStyle:null; const allowed=['background','backgroundColor','color','border','borderRadius','fontWeight','boxShadow']; const extra=st?allowed.map(k=>st[k]!==undefined?`${cssName(k)}:${String(st[k]).replace(/[;<>]/g,'')}`:'').filter(Boolean).join(';'):''; return `left:${Number(n.x||0)}px;top:${Number(n.y||0)}px;width:${Number(n.width||150)}px;height:${Number(n.height||44)}px;${extra?`;${extra}`:''}`;}; const node=n=>{const id=String(n.id||''); const style=inlineStyle(n); if(!answerByZone.has(id)||n.kind==='fixed'||n.locked) return `<div class="schema-map-node schema-map-fixed" style="${style}">${safe(n.text||n.answerText||id)}</div>`; return `<span class="schema-map-node schema-map-drop" style="${style}">${blank(id,n)}</span>`;}; return `<div class="schema-map-viewport schema-map-fit" data-schema-map-width="${w}" data-schema-map-height="${h}"><div class="schema-map-canvas" style="--schema-map-width:${w}px;--schema-map-height:${h}px"><svg class="schema-map-connectors" viewBox="0 0 ${w} ${h}"><defs><marker id="schemaArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z"></path></marker></defs>${(activity.layout?.edges||[]).map(edge).join('')}</svg>${nodes.map(node).join('')}</div></div>`;};
    const node=n=>{const ch=n.nodes||n.subdivisions||n.children||[]; const main=n.titleBlankId?blank(n.titleBlankId):`${n.concept||n.title?`<strong>${safe(n.concept||n.title)}</strong>`:''}${n.blankId?blank(n.blankId):''}${n.continuesTo?`<span>→ ${safe(n.continuesTo)}</span>`:''}${n.endsIn?`<span>→ ${safe(n.endsIn)}</span>`:''}`; return `<li><div class="schema-node-line">${main}</div>${ch.length?`<ul>${ch.map(node).join('')}</ul>`:''}</li>`;};
    const branches=(activity.schema?.branches||[]).map(b=>`<section class="schema-branch"><h3>${b.titleBlankId?blank(b.titleBlankId):safe(b.title||'Apartado')}</h3><ul>${(b.nodes||[]).map(node).join('')}</ul></section>`).join('');
    const schemaHtml=explicitHtml() || `<div class="schema-root">${safe(activity.schema?.root||'ESQUEMA')}</div><div class="schema-branches">${branches}</div>`;
    block.innerHTML=`<h2>${safe(activity.title)}</h2><p>${safe(activity.instructions||'Completa el esquema.')}</p>${mode==='drag'?`<div class="schema-bank">${(activity.draggableItems||[]).map(it=>`<button type="button" draggable="true" class="schema-draggable" data-item="${safe(it.id)}">${safe(it.text)}</button>`).join('')}</div>`:''}${schemaHtml}<div class="schema-result" hidden></div><button type="button" class="primary-btn" data-check>Finalizar y corregir</button><button type="button" class="secondary-btn" data-reset>Rehacer</button>`;
    fitMaps(); setTimeout(fitMaps, 120);
    let selected='';
    const setSel=id=>{selected=String(id||'');block.querySelectorAll('[data-item]').forEach(b=>b.classList.toggle('is-selected',String(b.dataset.item)===selected));};
    const mark=z=>{const val=currentText(z).trim(); z.classList.remove('is-correct','is-wrong','is-empty'); if(!val){z.classList.add('is-empty'); return false;} const ok=zoneOk(z); z.classList.add(ok?'is-correct':'is-wrong'); return ok;};
    const place=(z,id)=>{const it=itemById.get(String(id)); if(!z||!it) return; z.dataset.item=String(id); z.dataset.itemText=it.text; const span=z.querySelector('span'); if(span) span.textContent=it.text; mark(z);};
    const checkAll=()=>{let good=0,total=0;block.querySelectorAll('[data-zone]').forEach(z=>{total++; if(mark(z)) good++;});const score=total?((good/total)*10).toFixed(2):'0.00';const res=block.querySelector('.schema-result');res.hidden=false;res.innerHTML=`<div class="schema-feedback"><strong>${good}/${total} · ${score}/10</strong><p>${safe(good===total?(activity.feedback?.allCorrect||activity.feedback?.final?.allCorrect||'Todo correcto.'):(activity.feedback?.someIncorrect||activity.feedback?.immediate?.incorrect||'Revisa los huecos marcados.'))}</p></div>`;};
    block.querySelectorAll('[data-item]').forEach(btn=>{
      btn.addEventListener('dragstart',ev=>{ ev.dataTransfer?.setData('text/plain', btn.dataset.item||''); setSel(btn.dataset.item); });
      btn.addEventListener('pointerdown',ev=>{
        if(ev.button!==undefined && ev.button!==0) return;
        const itemId=btn.dataset.item||''; if(!itemId) return;
        setSel(itemId);
        const ghost=btn.cloneNode(true); ghost.classList.add('schema-drag-ghost'); ghost.style.position='fixed'; ghost.style.left=`${ev.clientX+10}px`; ghost.style.top=`${ev.clientY+10}px`; ghost.style.zIndex='999999'; ghost.style.pointerEvents='none'; document.body.appendChild(ghost);
        const move=e=>{ghost.style.left=`${e.clientX+10}px`; ghost.style.top=`${e.clientY+10}px`;};
        const up=e=>{document.removeEventListener('pointermove',move,true); document.removeEventListener('pointerup',up,true); ghost.remove(); const target=document.elementFromPoint(e.clientX,e.clientY); const zone=target?.closest?.('[data-zone]'); if(zone && block.contains(zone)) place(zone,itemId); setSel('');};
        document.addEventListener('pointermove',move,true); document.addEventListener('pointerup',up,true); ev.preventDefault();
      });
    });
    block.querySelectorAll('[data-zone]').forEach(zone=>{
      zone.addEventListener('dragover',ev=>{ev.preventDefault(); zone.classList.add('is-drag-over');});
      zone.addEventListener('dragleave',()=>zone.classList.remove('is-drag-over'));
      zone.addEventListener('drop',ev=>{ev.preventDefault(); zone.classList.remove('is-drag-over'); place(zone, ev.dataTransfer?.getData('text/plain') || selected); setSel('');});
    });
    block.addEventListener('click',ev=>{ const item=ev.target.closest('[data-item]'); if(item){setSel(item.dataset.item);return;} const zone=ev.target.closest('[data-zone]'); if(zone&&selected){place(zone,selected);setSel('');return;} if(ev.target.closest('[data-reset]')){block.querySelectorAll('[data-zone]').forEach(z=>{z.dataset.item='';z.dataset.itemText='';z.classList.remove('is-correct','is-wrong','is-empty'); const span=z.querySelector('span'); if(span) span.textContent='Arrastra aquí'; const input=z.querySelector('input'); if(input) input.value='';}); const res=block.querySelector('.schema-result'); if(res){res.hidden=true;res.innerHTML='';}} if(ev.target.closest('[data-check]')) checkAll(); });
    block.querySelectorAll('[data-zone] input').forEach(input=>input.addEventListener('input',()=>mark(input.closest('[data-zone]'))));
  }
    async function saveSchemaActivityAttempt(materialId, activity, result){
    if(!materialId || typeof saveExamAttempt!=='function') return null;
    return saveExamAttempt(materialId, {title:activity.title||'Esquema interactivo', subject:activity.subject||'', unit:activity.unit||''}, result);
  }
  function renderSchemaActivity(container){
    if(!container || container.dataset.t133Rendered==='1') return;
    let activity=null;
    try{ activity=JSON.parse(decodeBase64Utf8(container.dataset.t133Schema||'')); }catch(_e){ activity=null; }
    activity=normalizeSchemaActivityPayload(activity);
    if(!activity){ container.innerHTML='<p>No se pudo cargar el esquema interactivo.</p>'; container.dataset.t133Rendered='error'; return; }
    const materialId=container.dataset.materialId||'';
    const mode=activity.mode || 'drag';
    const itemById=new Map((activity.draggableItems||[]).map(it=>[String(it.id), it]));
    const answerByZone=new Map((activity.dropZones||[]).map(z=>[String(z.id), z]));
    const total=activity.dropZones.length || 0;
    const canPersist=typeof State!=='undefined' && typeof saveExamAttempt==='function' && !!materialId;
    const itemsHtml=mode==='drag' ? `<div class="schema-bank" aria-label="Conceptos para arrastrar">${activity.draggableItems.map(it=>`<button type="button" draggable="true" class="schema-draggable" data-t133-item="${safe(it.id)}">${safe(it.text)}</button>`).join('')}</div>` : '';
    container.innerHTML=`<article class="schema-activity" data-t133-mode="${safe(mode)}"><header class="schema-activity-head"><div><h4>${safe(activity.title)}</h4>${activity.description?`<p>${safe(activity.description)}</p>`:''}${activity.instructions?`<p class="schema-instructions">${safe(activity.instructions)}</p>`:''}</div><strong>${total} oco${total===1?'':'s'}</strong></header><div data-exam-attempt-history-slot>${canPersist && typeof examAttemptHistoryMarkup==='function'?examAttemptHistoryMarkup(materialId):''}</div>${itemsHtml}${schemaActivityTreeHtml(activity, mode)}<div class="schema-live-feedback" aria-live="polite"></div><div class="schema-complete-feedback" hidden></div><footer class="schema-actions"><button type="button" class="primary-btn" data-t133-check>Finalizar y corregir</button><button type="button" class="secondary-btn" data-t133-reset>Rehacer esquema</button></footer></article>`;
    const root=container.querySelector('.schema-activity');
    const live=container.querySelector('.schema-live-feedback');
    const finalBox=container.querySelector('.schema-complete-feedback');
    let selectedItemId='';
    const norm=value=>textNorm(value, false);
    const acceptedFor=z=>{ const vals=[...(z.acceptedAnswers||[])]; if(z.correctText) vals.push(z.correctText); if(z.correctItemId && itemById.has(String(z.correctItemId))) vals.push(itemById.get(String(z.correctItemId)).text); return [...new Set(vals.filter(Boolean).map(String))]; };
    const answerTextFor=zoneId=>{ const z=answerByZone.get(String(zoneId)) || {}; return z.correctText || (z.correctItemId && itemById.get(String(z.correctItemId))?.text) || ''; };
    const currentTextFor=zone=> mode==='write' ? (zone.querySelector('input')?.value || '') : (zone.dataset.itemText || (zone.dataset.itemId && itemById.get(String(zone.dataset.itemId))?.text) || '');
    const zoneOk=zone=>{ const z=answerByZone.get(String(zone.dataset.t133Zone||'')) || {}; if(mode==='write') return acceptedFor(z).some(a=>norm(a)===norm(zone.querySelector('input')?.value||'')); const placed=String(zone.dataset.itemId||''); if(z.correctItemId && placed===String(z.correctItemId)) return true; return acceptedFor(z).some(a=>norm(a)===norm(currentTextFor(zone))); };
    const markZone=zone=>{ const value=currentTextFor(zone).trim(); zone.classList.remove('is-correct','is-wrong','is-empty'); if(!value){ zone.classList.add('is-empty'); return null; } const ok=zoneOk(zone); zone.classList.add(ok?'is-correct':'is-wrong'); live.innerHTML=`<span class="${ok?'is-correct':'is-wrong'}">${safe(ok?'Correcto.':`Incorrecto. Respuesta correcta: ${answerTextFor(zone.dataset.t133Zone) || 'sin configurar'}.`)}</span>`; return ok; };
    const updateProgress=()=>{ const filled=[...container.querySelectorAll('[data-t133-zone]')].filter(z=>currentTextFor(z).trim()).length; root.style.setProperty('--schema-progress', total?`${Math.round((filled/total)*100)}%`:'0%'); };
    const setSelectedItem=id=>{ selectedItemId=String(id||''); container.querySelectorAll('[data-t133-item]').forEach(btn=>btn.classList.toggle('is-selected', String(btn.dataset.t133Item)===selectedItemId)); };
    const refreshUsedItems=()=>{ if(mode!=='drag') return; const used=new Set([...container.querySelectorAll('[data-t133-zone]')].map(z=>z.dataset.itemId).filter(Boolean)); container.querySelectorAll('[data-t133-item]').forEach(btn=>btn.classList.toggle('is-used', used.has(String(btn.dataset.t133Item)))); };
    const clearZone=zone=>{ if(!zone) return; zone.dataset.itemId=''; zone.dataset.itemText=''; zone.innerHTML=`<span class="schema-placeholder">Arrastra aquí</span>`; zone.classList.remove('is-correct','is-wrong','is-empty'); };
    const placeItem=(zone,itemId)=>{ if(!zone||!itemId) return; const item=itemById.get(String(itemId)); if(!item) return; if(activity.settings?.singleUseDraggables !== false){ container.querySelectorAll('[data-t133-zone]').forEach(other=>{ if(other!==zone && String(other.dataset.itemId||'')===String(itemId)) clearZone(other); }); } zone.dataset.itemId=String(itemId); zone.dataset.itemText=item.text; zone.innerHTML=`<span>${safe(item.text)}</span>`; markZone(zone); refreshUsedItems(); updateProgress(); };
    if(mode==='drag'){
      container.querySelectorAll('[data-t133-item]').forEach(btn=>{ btn.addEventListener('dragstart',ev=>{ ev.dataTransfer?.setData('text/plain', btn.dataset.t133Item||''); setSelectedItem(btn.dataset.t133Item); }); btn.addEventListener('click',()=>setSelectedItem(btn.dataset.t133Item)); });
      container.querySelectorAll('.schema-drop-zone').forEach(zone=>{ zone.addEventListener('dragover',ev=>{ ev.preventDefault(); zone.classList.add('is-drag-over'); }); zone.addEventListener('dragleave',()=>zone.classList.remove('is-drag-over')); zone.addEventListener('drop',ev=>{ ev.preventDefault(); zone.classList.remove('is-drag-over'); placeItem(zone, ev.dataTransfer?.getData('text/plain') || selectedItemId); setSelectedItem(''); }); zone.addEventListener('click',()=>{ if(selectedItemId){ placeItem(zone, selectedItemId); setSelectedItem(''); } }); });
      container.querySelectorAll('[data-t133-item]').forEach(btn=>{
        btn.addEventListener('pointerdown', ev=>{
          if(ev.button!==undefined && ev.button!==0) return;
          const itemId=btn.dataset.t133Item||'';
          if(!itemId) return;
          setSelectedItem(itemId);
          const ghost=btn.cloneNode(true);
          ghost.classList.add('schema-drag-ghost');
          ghost.style.position='fixed'; ghost.style.left=`${ev.clientX+10}px`; ghost.style.top=`${ev.clientY+10}px`; ghost.style.zIndex='999999'; ghost.style.pointerEvents='none';
          document.body.appendChild(ghost);
          const move=e=>{ ghost.style.left=`${e.clientX+10}px`; ghost.style.top=`${e.clientY+10}px`; };
          const up=e=>{
            document.removeEventListener('pointermove', move, true);
            document.removeEventListener('pointerup', up, true);
            ghost.remove();
            const target=document.elementFromPoint(e.clientX, e.clientY);
            const zone=target?.closest?.('.schema-drop-zone,[data-t133-zone]');
            if(zone && container.contains(zone)) placeItem(zone, itemId);
            setSelectedItem('');
          };
          document.addEventListener('pointermove', move, true);
          document.addEventListener('pointerup', up, true);
          ev.preventDefault();
        });
      });
    } else {
      container.querySelectorAll('[data-t133-zone] input').forEach(input=>{ input.addEventListener('input',()=>{ updateProgress(); const zone=input.closest('[data-t133-zone]'); if(input.value.trim()) markZone(zone); }); input.addEventListener('blur',()=>markZone(input.closest('[data-t133-zone]'))); });
    }
    const collectResult=()=>{ let correct=0, answered=0; const rows=[...container.querySelectorAll('[data-t133-zone]')].map(zone=>{ const zoneId=String(zone.dataset.t133Zone||''); const z=answerByZone.get(zoneId)||{}; const value=currentTextFor(zone).trim(); if(value) answered++; const ok=!!value && zoneOk(zone); if(ok) correct++; markZone(zone); return {zoneId, section:z.section||'', question:z.label||zoneId, type:mode==='write'?'schema_write':'schema_drag_drop', value, correct:answerTextFor(zoneId), fraction:ok?1:0, feedback:ok?'Correcto.':`Respuesta correcta: ${answerTextFor(zoneId)}`}; }); const score=total?Number(((correct/total)*10).toFixed(2)):0; return {correct, answered, total, score, rows}; };
    const showFinal=async ()=>{ const result=collectResult(); const fb=activity.feedback||{}; const mainMessage=result.answered===0?(fb.empty||'Completa al menos un oco antes de finalizar.'):(result.correct===result.total?(fb.allCorrect||'Muy bien. Has completado correctamente el esquema.'):(fb.someIncorrect||'Revisa los conceptos marcados en rojo.')); finalBox.hidden=false; finalBox.innerHTML=`<div class="schema-score-card ${result.correct===result.total?'is-correct':'is-partial'}"><h4>Resultado</h4><strong>${result.correct}/${result.total} · ${result.score.toFixed(2)}/10</strong><p>${safe(mainMessage)}</p></div><details class="schema-answer-review" open><summary>Feedback completo</summary><ol>${result.rows.map((r,i)=>`<li class="${r.fraction?'is-correct':'is-wrong'}"><span>${i+1}. ${safe(r.question)}</span><b>${r.fraction?'Correcto':'Incorrecto'}</b><small>Tu respuesta: ${safe(r.value||'sin respuesta')} · Correcta: ${safe(r.correct||'sin configurar')}</small></li>`).join('')}</ol></details>`; if(canPersist){ const saved=await saveSchemaActivityAttempt(materialId, activity, {score:result.score, max_score:10, answers:result.rows, completed_at:new Date().toISOString(), activity_type:'schema'}); if(saved){ if(typeof attemptPrintButton==='function') finalBox.insertAdjacentHTML('beforeend', `<div class="attempt-pdf-actions-v148">${attemptPrintButton(saved,'Descargar este intento en PDF')}</div>`); if(typeof updateAttemptHistoryBox==='function') updateAttemptHistoryBox(container, materialId); } } };
    container.querySelector('[data-t133-check]')?.addEventListener('click',ev=>{ ev.preventDefault(); showFinal().catch(error=>{ console.error(error); finalBox.hidden=false; finalBox.innerHTML=`<div class="schema-score-card is-error"><strong>No se pudo corregir el esquema</strong><p>${safe(error?.message||'Error desconocido')}</p></div>`; }); });
    container.querySelector('[data-t133-reset]')?.addEventListener('click',ev=>{ ev.preventDefault(); container.querySelectorAll('[data-t133-zone]').forEach(zone=>{ if(mode==='write'){ const input=zone.querySelector('input'); if(input) input.value=''; zone.classList.remove('is-correct','is-wrong','is-empty'); } else clearZone(zone); }); setSelectedItem(''); refreshUsedItems(); updateProgress(); live.innerHTML=''; finalBox.hidden=true; finalBox.innerHTML=''; });
    updateProgress();
    fitSchemaActivityMaps(container);
    setTimeout(()=>fitSchemaActivityMaps(container), 120);
    container.dataset.t133Rendered='1';
  }
  function fitSchemaActivityMaps(root=document){
    const scope=root && root.querySelectorAll ? root : document;
    const run=()=>{
      scope.querySelectorAll('.schema-map-viewport.schema-map-fit').forEach(viewport=>{
        const canvas=viewport.querySelector('.schema-map-canvas');
        if(!canvas) return;
        const rawW=Number(viewport.dataset.schemaMapWidth||0) || parseFloat(getComputedStyle(canvas).getPropertyValue('--schema-map-width')) || canvas.scrollWidth || 0;
        const rawH=Number(viewport.dataset.schemaMapHeight||0) || parseFloat(getComputedStyle(canvas).getPropertyValue('--schema-map-height')) || canvas.scrollHeight || 0;
        if(!rawW || !rawH) return;
        const availableW=Math.max(320, viewport.clientWidth || viewport.getBoundingClientRect().width || 0) - 8;
        const isStandalone=document.body.classList.contains('schema-standalone-page') || !!viewport.closest('[data-schema-standalone="1"]');
        const isInsidePublication=!!viewport.closest('.material-collapse-card, .subject-material-list, .t16-publication');
        const maxH=isStandalone ? Math.max(620, Math.min(Math.round((window.innerHeight||900)*0.84), 900)) : (isInsidePublication ? 520 : 620);
        let scale=Math.min(availableW / rawW, maxH / rawH, 1);
        const minScale=isStandalone ? 0.62 : 0.42;
        scale=Math.max(minScale, Math.min(scale, isInsidePublication && !isStandalone ? 0.72 : 1));
        const fitH=Math.ceil(rawH * scale) + 16;
        canvas.style.width=`${rawW}px`;
        canvas.style.height=`${rawH}px`;
        canvas.style.minWidth=`${rawW}px`;
        canvas.style.minHeight=`${rawH}px`;
        canvas.style.transformOrigin='0 0';
        canvas.style.transform=`scale(${scale})`;
        viewport.style.setProperty('--schema-map-scale', String(scale));
        viewport.style.setProperty('--schema-fit-height', `${fitH}px`);
        viewport.style.height=`${fitH}px`;
        viewport.style.minHeight=`${fitH}px`;
        viewport.style.maxHeight=`${fitH}px`;
        viewport.style.overflow='hidden';
      });
    };
    if(typeof requestAnimationFrame==='function') requestAnimationFrame(run); else setTimeout(run,0);
  }
  if(typeof window!=='undefined' && !window.__tribecaSchemaFitReady){
    window.__tribecaSchemaFitReady=true;
    window.addEventListener('resize',()=>fitSchemaActivityMaps(document));
    document.addEventListener('click', ev=>{
      if(ev.target?.closest?.('summary')) setTimeout(()=>fitSchemaActivityMaps(document), 140);
    }, true);
  }
  function hydrateSchemaActivities(root=document){
    const scope=root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.schema-activity-block[data-t133-schema]').forEach(renderSchemaActivity);
  }

  function materialEmbedSource(m={}){
    const url=materialEmbedValue(m,'url');
    const code=materialEmbedValue(m,'code');
    const clean=stripEmbedCodeFence(code);
    const videoKind=normalizeMaterialKind(m.material_type || m.type)==='video';
    const exam=parseExamFromInteractiveCode(clean);
    if(exam) return {src:'', mode:'exam', html:'', quiz:null, exam};
    const quiz=parseQuizFromInteractiveCode(clean);
    if(quiz) return {src:'', mode:'quiz', html:'', quiz, exam:null};
    const schemaActivity=parseSchemaActivityFromInteractiveCode(clean);
    if(schemaActivity) return {src:'', mode:'schemaActivity', html:'', quiz:null, exam:null, activity:schemaActivity};
    const presentationKind=normalizeMaterialKind(m.material_type || m.type)==='presentation';
    if(clean && presentationKind){
      const iframeSrc=extractIframeSrc(clean);
      if(iframeSrc) return {src:iframeSrc, mode:'presentation', html:'', quiz:null, exam:null};
      return {src:'', mode:'presentationHtml', html:normalizeEmbeddedHtml(clean), quiz:null, exam:null};
    }
    if(clean){
      if(/^\s*[\[{]/.test(clean) || clean.startsWith('tribeca-exam-json::') || clean.startsWith('tribeca-schema-json::')) return {src:'', mode:'quizError', html:'', quiz:null, exam:null};
      const iframeSrc=extractIframeSrc(clean);
      if(iframeSrc && (videoKind || isVideoEmbedSource(iframeSrc))){
        const v=normalizeVideoUrl(iframeSrc);
        return {src:v.src || iframeSrc, mode:'video', html:'', quiz:null, exam:null, direct:!!v.direct, provider:v.provider};
      }
      if(/<video[\s>]/i.test(clean)) return {src:'', mode:'videoHtml', html:normalizeEmbeddedHtml(clean), quiz:null, exam:null, direct:false, provider:'html'};
      if(iframeSrc) return {src:iframeSrc, mode:'iframe', html:'', quiz:null, exam:null};
      return {src:'', mode:'html', html:normalizeEmbeddedHtml(clean), quiz:null, exam:null};
    }
    if(url){
      const v=normalizeVideoUrl(url);
      if(presentationKind) return {src:url, mode:'presentation', html:'', quiz:null, exam:null};
      if(videoKind || isVideoEmbedSource(url)) return {src:v.src || url, mode:'video', html:'', quiz:null, exam:null, direct:!!v.direct, provider:v.provider};
      return {src:url, mode:'url', html:'', quiz:null, exam:null};
    }
    return {src:'', mode:'', html:'', quiz:null, exam:null};
  }
  function videoEmbedMarkup(source={}, m={}, standalone=false){
    const height=Math.max(300, Math.min(Number(m.embed_height||540), 1600));
    const title=safe(m.title||'Vídeo');
    const header=`<div><strong>Vídeo</strong><small>${source.provider?`Vídeo embebido · ${safe(source.provider)}`:'Vídeo embebido en la publicación'}</small></div>`;
    if(source.mode==='videoHtml'){
      const encoded=encodeBase64Utf8(source.html||'');
      return `<section class="material-embed-block material-video-block"><div><strong>Vídeo</strong><small>Código de vídeo insertado</small></div><iframe title="${title}" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads" src="data:text/html;charset=utf-8;base64,${encoded}" style="min-height:${height}px"></iframe></section>`;
    }
    if(source.direct){
      return `<section class="material-embed-block material-video-block">${header}<video class="material-video-player" controls preload="metadata" src="${safe(source.src)}" style="min-height:${Math.min(height,720)}px"></video>${source.src?`<a class="embed-open-link" href="${safe(source.src)}" target="_blank" rel="noopener">Abrir vídeo en pestaña nueva</a>`:''}</section>`;
    }
    return `<section class="material-embed-block material-video-block">${header}<iframe title="${title}" loading="lazy" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-presentation" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen src="${safe(source.src)}" style="min-height:${height}px"></iframe>${source.src?`<a class="embed-open-link" href="${safe(source.src)}" target="_blank" rel="noopener">Abrir vídeo en pestaña nueva</a>`:''}</section>`;
  }
  function nativeQuizMarkup(quiz, m={}){
    if(!quiz?.questions?.length) return '';
    return `<section class="material-embed-block native-quiz-shell"><div><strong>Recurso interactivo</strong><small>Test autocorregible de Tribeca Aula</small></div><div class="native-quiz-block" data-t99-quiz="${safe(encodeBase64Utf8(JSON.stringify(quiz)))}" data-material-id="${safe(m.id||'')}"><p>Cargando test…</p></div></section>`;
  }
  function presentationEmbedMarkup(source={}, m={}){
    const height=Math.max(420, Math.min(Number(m.embed_height||720), 1800));
    const title=safe(m.title||'Presentación');
    const encoded=source.html ? encodeBase64Utf8(source.html||'') : '';
    const srcAttr=source.html ? ` src="data:text/html;charset=utf-8;base64,${encoded}"` : (source.src ? ` src="${safe(source.src)}"` : ' src="about:blank"');
    return `<section class="material-embed-block material-presentation-block"><div><strong>Presentación</strong><small>Diapositivas embebidas en la materia</small></div><iframe title="${title}" loading="lazy" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-presentation allow-downloads" allow="fullscreen; clipboard-write; autoplay; encrypted-media; web-share" allowfullscreen${srcAttr} style="min-height:${height}px"></iframe>${source.src?`<a class="embed-open-link" href="${safe(source.src)}" target="_blank" rel="noopener">Abrir presentación en pestaña nueva</a>`:''}</section>`;
  }
  function materialEmbedMarkup(m={}){
    const source=materialEmbedSource(m);
    if(source.mode==='exam') return nativeExamMarkup(source.exam, m);
    if(source.mode==='quiz') return nativeQuizMarkup(source.quiz, m);
    if(source.mode==='quizError') return `<section class="material-embed-block native-quiz-shell native-quiz-error"><div><strong>Recurso interactivo</strong><small>JSON no interpretado</small></div><p>No he podido transformar este JSON en test, simulacro o esquema interactivo. Comprueba que contiene <code>type: "tribeca-activity"</code>, <code>type: "tribeca-exam"</code> o <code>questions</code> con ejercicios compatibles.</p></section>`;
    if(source.mode==='schemaActivity') return schemaActivityMarkup(source.activity, m);
    if(source.mode==='video' || source.mode==='videoHtml') return videoEmbedMarkup(source, m);
    if(source.mode==='presentation' || source.mode==='presentationHtml') return presentationEmbedMarkup(source, m);
    if(!source.src && !source.html) return '';
    const height=Math.max(420, Math.min(Number(m.embed_height||620), 1600));
    const encoded=source.html ? encodeBase64Utf8(source.html) : '';
    const srcAttr = source.src ? ` src="${safe(source.src)}"` : ' src="about:blank"';
    return `<section class="material-embed-block material-embed-block-v98"><div><strong>Recurso interactivo</strong><small>${source.mode==='html'?'Código HTML insertado':source.mode==='iframe'?'Iframe insertado':'URL embebida'}</small></div><iframe title="Recurso interactivo" loading="lazy" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads"${srcAttr} data-t98-embed-html="${safe(encoded)}" style="min-height:${height}px"></iframe>${source.src?`<a class="embed-open-link" href="${safe(source.src)}" target="_blank" rel="noopener">Abrir recurso en pestaña nueva</a>`:''}</section>`;
  }
  function renderNativeQuiz(container){
    if(!container || container.dataset.t99Rendered==='1') return;
    let quiz=null;
    try{ quiz=JSON.parse(decodeBase64Utf8(container.dataset.t99Quiz||'')); }catch(_e){ quiz=null; }
    quiz=normalizeQuizPayload(quiz);
    if(!quiz){ container.innerHTML='<p>No se pudo cargar el test.</p>'; container.dataset.t99Rendered='error'; return; }
    const total=quiz.questions.length;
    const materialId=container.dataset.materialId||'';
    const canPersist=typeof State!=='undefined' && typeof saveExamAttempt==='function' && typeof examAttemptHistoryMarkup==='function' && !!materialId;
    const label=(q)=> q.opts.filter(o=>o.c).length>1 ? 'Selecciona todas las correctas' : 'Elige la respuesta correcta';
    const questionHtml=(q,idx)=>{
      const multi=q.opts.filter(o=>o.c).length>1;
      return `<fieldset class="native-quiz-question" data-quiz-q="${idx}"><legend><span>${idx+1}</span>${safe(q.q)}</legend>${q.hint?`<p class="native-quiz-hint">${safe(q.hint)}</p>`:''}<small>${safe(label(q))}</small><div class="native-quiz-options">${q.opts.map((o,i)=>`<label><input type="${multi?'checkbox':'radio'}" name="quiz${idx}${multi?'[]':''}" value="${i}"><span>${safe(o.t)}</span></label>`).join('')}</div><div class="native-quiz-feedback" data-quiz-feedback="${idx}" hidden></div></fieldset>`;
    };
    container.innerHTML=`<form class="native-quiz-form" data-t130-quiz-form><header><h4>${safe(quiz.title||'Test interactivo')}</h4><p>${total} pregunta${total===1?'':'s'} · corrección automática</p><div data-exam-attempt-history-slot>${canPersist?examAttemptHistoryMarkup(materialId):''}</div></header>${quiz.questions.map(questionHtml).join('')}<div class="native-quiz-result" hidden></div><footer><button type="button" class="primary-btn" data-t130-grade-quiz>Finalizar y corregir</button></footer></form>`;
    const form=container.querySelector('[data-t130-quiz-form]');
    const grade=async ()=>{
      try{
        let score=0;
        const answers=[];
        quiz.questions.forEach((q,idx)=>{
          const expected=q.opts.map((o,i)=>o.c?i:null).filter(x=>x!==null).sort((a,b)=>a-b);
          const multi=expected.length>1;
          const selected=[...form.querySelectorAll(`[name="quiz${idx}${multi?'[]':''}"]:checked`)].map(x=>Number(x.value)).sort((a,b)=>a-b);
          const ok=selected.length===expected.length && selected.every((v,i)=>v===expected[i]);
          if(ok) score++;
          const fs=form.querySelector(`[data-quiz-q="${idx}"]`);
          const feedback=form.querySelector(`[data-quiz-feedback="${idx}"]`);
          fs?.classList.remove('is-correct','is-incorrect');
          fs?.classList.add(ok?'is-correct':'is-incorrect');
          fs?.querySelectorAll('.native-quiz-options label').forEach((label,i)=>{
            label.classList.remove('is-correct','is-incorrect','is-selected');
            if(expected.includes(i)) label.classList.add('is-correct');
            if(selected.includes(i)) label.classList.add('is-selected');
            if(selected.includes(i) && !expected.includes(i)) label.classList.add('is-incorrect');
          });
          const selectedText=selected.map(i=>q.opts[i]?.t).filter(Boolean).join(', ') || 'sin respuesta';
          const expectedText=expected.map(i=>q.opts[i]?.t).filter(Boolean).join(', ') || 'sin respuesta configurada';
          const rationales=[...new Set([...selected,...expected].map(i=>q.opts[i]?.r).filter(Boolean))];
          answers.push({question:q.q,type:multi?'multiple_choice':'single_choice',value:selected,correct:expected,fraction:ok?1:0,feedback:`Tu respuesta: ${selectedText}. Respuesta correcta: ${expectedText}.`});
          if(feedback){
            feedback.hidden=false;
            feedback.className=`native-quiz-feedback ${ok?'is-correct':'is-incorrect'}`;
            feedback.innerHTML=`<strong>${ok?'Correcto.':'Incorrecto.'}</strong><p><b>Tu respuesta:</b> ${safe(selectedText)}</p><p><b>Respuesta correcta:</b> ${safe(expectedText)}</p>${rationales.map(r=>`<p>${safe(r)}</p>`).join('') || (!ok?'<p>Revisa la opción correcta marcada en verde.</p>':'')}`;
          }
        });
        const pct=Math.round((score/total)*100);
        const score10=total?Number(((score/total)*10).toFixed(2)):0;
        const result=form.querySelector('.native-quiz-result');
        result.hidden=false;
        result.innerHTML=`<div class="native-quiz-score-card"><h4>Test completado</h4><strong>${score}/${total}</strong><p>${pct}% de aciertos (${score10.toFixed(2)}/10). Revisa cada pregunta: verde correcto, rojo incorrecto.</p><button type="button" class="secondary-btn" data-t130-retake-quiz>Rehacer test</button></div>`;
        form.querySelectorAll('input,button[data-t130-grade-quiz]').forEach(el=>el.disabled=true);
        if(canPersist){
          const savedAttempt=await saveExamAttempt(materialId, {title:quiz.title||'Test interactivo'}, {score:score10, max_score:10, answers, completed_at:new Date().toISOString(), quiz_score:score, quiz_total:total});
          if(savedAttempt && typeof attemptPrintButton==='function') res.insertAdjacentHTML('beforeend', `<div class="attempt-pdf-actions-v148">${attemptPrintButton(savedAttempt,'Descargar este intento en PDF')}</div>`);
          if(typeof updateAttemptHistoryBox==='function') updateAttemptHistoryBox(container, materialId);
        }
        result.querySelector('[data-t130-retake-quiz]')?.addEventListener('click',()=>{ delete container.dataset.t99Rendered; renderNativeQuiz(container); container.scrollIntoView?.({behavior:'smooth',block:'start'}); });
      }catch(error){
        console.error('[Tribeca Aula] Error al corregir test nativo:', error);
        const result=form.querySelector('.native-quiz-result');
        result.hidden=false;
        result.innerHTML=`<div class="native-quiz-score-card is-error"><h4>No se pudo corregir el test</h4><p>${safe(error?.message||'Error desconocido')}</p></div>`;
      }
    };
    form.dataset.tribecaNativeForm='quiz';
    form.querySelector('[data-t130-grade-quiz]')?.addEventListener('click', ev=>{ ev.preventDefault(); ev.stopPropagation(); grade(); });
    form.addEventListener('submit', ev=>{ ev.preventDefault(); grade(); }, true);
    container.dataset.t99Rendered='1';
  }

  function hydrateNativeQuizzes(root=document){
    const scope=root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.native-quiz-block[data-t99-quiz]').forEach(renderNativeQuiz);
  }
  function hydrateInteractiveEmbeds(root=document){
    const scope=root && root.querySelectorAll ? root : document;
    hydrateNativeQuizzes(scope);
    hydrateNativeExams(scope);
    hydrateSchemaActivities(scope);
    ensureMathCalculatorWidget();
    scope.querySelectorAll('iframe[data-t98-embed-html]:not([data-t98-ready])').forEach(frame=>{
      const encoded=frame.getAttribute('data-t98-embed-html')||'';
      if(!encoded){ frame.dataset.t98Ready='1'; return; }
      const html=decodeBase64Utf8(encoded);
      if(!html){ frame.dataset.t98Ready='error'; return; }
      try{
        if(frame.dataset.t98ObjectUrl) URL.revokeObjectURL(frame.dataset.t98ObjectUrl);
        const blob=new Blob([html], {type:'text/html;charset=utf-8'});
        const blobUrl=URL.createObjectURL(blob);
        frame.dataset.t98ObjectUrl=blobUrl;
        frame.dataset.t98Ready='1';
        frame.src=blobUrl;
      }catch(error){
        console.error('[Tribeca Aula] No se pudo cargar el recurso interactivo:', error);
        frame.dataset.t98Ready='error';
      }
    });
  }
  function ensureEmbedHydrationObserver(){
    if(window.__tribecaEmbedHydrationObserver) return;
    try{
      const observer=new MutationObserver(()=>hydrateInteractiveEmbeds(document));
      observer.observe(document.body,{childList:true,subtree:true});
      window.__tribecaEmbedHydrationObserver=observer;
      setTimeout(()=>hydrateInteractiveEmbeds(document),80);
      setTimeout(()=>hydrateInteractiveEmbeds(document),600);
    }catch(_e){}
  }
  ensureEmbedHydrationObserver();
  function examPreviewMarkupForNewWindow(exam={}){
    const normalized=normalizeExamPayload(exam);
    if(!normalized?.questions?.length) return '<p>No se pudo cargar la vista previa del simulacro.</p>';
    const per=10/normalized.questions.length;
    const label=q=>({single_choice:'Elige una',multiple_choice:'Varias correctas',true_false:'Verdadero/falso',short_text:'Respuesta breve',writing:'Writing',matching:'Relacionar',ordering:'Ordenar'})[q.type]||'Ejercicio';
    const groups=[];
    normalized.questions.forEach((q,idx)=>{
      const name=String(q.section||'Simulacro').trim()||'Simulacro';
      let g=groups[groups.length-1];
      if(!g||g.name!==name){ g={name,items:[]}; groups.push(g); }
      g.items.push({q,idx});
    });
    const renderQ=(q,idx,localIdx)=>{
      const n=q.originalNumber||String(localIdx+1);
      const image=q.image?`<figure class="exam-preview-image"><img src="${safe(q.image)}" alt="${safe(q.imageAlt||q.imageCaption||q.prompt)}">${q.imageCaption?`<figcaption>${safe(q.imageCaption)}</figcaption>`:''}</figure>`:'';
      const passage=q.passage?`<blockquote>${safe(q.passage)}</blockquote>`:'';
      const title=q.exerciseTitle?`<p class="exercise-title">${safe(q.exerciseTitle)}</p>`:'';
      let body='';
      if(['single_choice','multiple_choice','true_false'].includes(q.type)) body=`<ol class="exam-preview-options">${q.options.map(o=>`<li>${safe(o.text)}</li>`).join('')}</ol>`;
      else if(q.type==='matching') body=`<table class="exam-preview-table"><tbody>${q.pairs.map(p=>`<tr><td>${safe(p.left)}</td><td>................................................</td></tr>`).join('')}</tbody></table>`;
      else if(q.type==='ordering') body=`<ol class="exam-preview-options">${q.items.map(i=>`<li>${safe(i)}</li>`).join('')}</ol>`;
      else if(q.type==='writing') body='<div class="exam-preview-writing"></div>';
      else body='<div class="exam-preview-line"></div>';
      return `<article class="exam-preview-question"><div class="q-head"><span>${safe(n)}</span><em>${safe(label(q))}</em></div>${title}<h3>${safe(q.prompt)}</h3>${passage}${image}${body}</article>`;
    };
    return `<div class="exam-preview"><header><div><strong>${safe(normalized.title)}</strong><p>${safe(normalized.instructions)}</p></div><span>${normalized.questions.length} preguntas · ${per.toFixed(2)} puntos/pregunta</span></header>${groups.map(g=>`<section><h2>${safe(g.name)}</h2>${g.items.map(({q,idx},localIdx)=>renderQ(q,idx,localIdx)).join('')}</section>`).join('')}</div>`;
  }

  function examRunnerHtmlForNewWindow(exam={}){
    const normalized=normalizeExamPayload(exam);
    if(!normalized?.questions?.length) return '<!doctype html><html><body><p>No se pudo cargar el simulacro.</p></body></html>';
    const payload=JSON.stringify(normalized).replace(/</g,'\\u003c');
    const style=`:root{font-size:12.5px}*{box-sizing:border-box}body{margin:0;background:#f7f4ec;color:#172018;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5}.wrap{max-width:980px;margin:0 auto;padding:20px 14px 34px}.teacher-note{border:1px solid #d7ccb5;border-radius:12px;background:#fff8e6;color:#6a4f14;font-weight:850;padding:10px 12px;margin-bottom:12px}.exam-paper-form{background:#fff;border:1px solid #d7ccb5;border-radius:10px;padding:18px 20px;box-shadow:0 10px 24px rgba(34,27,12,.06)}.exam-paper-header{border-bottom:2px solid #1f1e1a;padding-bottom:10px;margin-bottom:14px}.exam-paper-topline{display:flex;justify-content:space-between;gap:12px;color:#1f1e1a;font-size:13px}.exam-paper-header h1{font-family:Georgia,serif;font-size:clamp(26px,2.5vw,38px);line-height:1.08;margin:10px 0 6px;color:#1f1e1a}.exam-paper-header p{margin:0;color:#5d564b;font-weight:750}.exam-paper-section{margin:16px 0}.exam-paper-section>header{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #d7ccb5;margin-bottom:8px}.exam-paper-section h2{font-size:18px;margin:0 0 5px;color:#1f1e1a}.exam-paper-section header span{font-weight:850;color:#6a4f14}.exam-question{border:0;border-bottom:1px solid #eee4d0;margin:0;padding:10px 0 14px}.exam-question.is-correct{border-left:5px solid #15803d;padding-left:10px;background:#f2fbf5}.exam-question.is-wrong{border-left:5px solid #b42318;padding-left:10px;background:#fff5f4}.exam-question.is-partial{border-left:5px solid #b78218;padding-left:10px;background:#fff9eb}.exam-question-head{display:flex;gap:8px;align-items:center}.exam-question-number{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#f0eadc;font-weight:950}.exam-question-type{font-size:12px;color:#6a6458;font-weight:850}.exam-exercise-title{margin:5px 0 2px;color:#0b3d22;font-weight:900}.exam-question legend{padding:0;font-weight:800;font-size:15px;color:#1f1e1a;line-height:1.45}.exam-passage{margin:8px 0;padding:10px 12px;border-left:4px solid #0b3d22;background:#faf8f1}.exam-question-image{margin:8px 0;padding:8px;border:1px solid #d7ccb5;border-radius:10px;background:#fffdfa}.exam-question-image img{display:block;width:100%;max-height:420px;object-fit:contain;border-radius:8px;background:#fff}.exam-question-image figcaption{text-align:center;margin-top:5px;color:#6a6458;font-weight:750;font-size:12px}.exam-options,.exam-matching,.exam-ordering{display:grid;gap:6px;margin-top:8px}.exam-options label{display:grid;grid-template-columns:auto 1fr;gap:7px;align-items:start}.exam-matching label,.exam-ordering label{display:grid;grid-template-columns:minmax(160px,.8fr) minmax(220px,1.2fr);gap:10px;align-items:center}.exam-options label.is-correct,.exam-matching label.is-correct,.exam-ordering label.is-correct{background:#eaf8ef;border-radius:8px;padding:4px 7px;color:#14532d}.exam-options label.is-wrong,.exam-matching label.is-wrong,.exam-ordering label.is-wrong{background:#fdeceb;border-radius:8px;padding:4px 7px;color:#991b1b}.exam-question input[type=text],.exam-question textarea,.exam-question select{width:100%;border:1px solid #cfc7b8;border-radius:6px;min-height:38px;padding:7px 9px;background:#fff;color:#1f1e1a;font:inherit}.exam-question textarea{min-height:150px;resize:vertical}.exam-feedback-card{margin-top:10px;border-radius:10px;padding:10px 12px;border:1px solid #ddd;display:grid;gap:5px}.exam-feedback-card p{margin:0}.exam-feedback-card ul{margin:0;padding-left:18px}.exam-feedback-card.is-correct{background:#eaf8ef;border-color:#9ad5ac;color:#14532d}.exam-feedback-card.is-wrong{background:#fdeceb;border-color:#f0aaa5;color:#991b1b}.exam-feedback-card.is-partial{background:#fff9eb;border-color:#e8c77e;color:#7c4a03}.exam-paper-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:2px solid #1f1e1a;margin-top:14px;padding-top:12px}.primary-btn,.secondary-btn{border:0;border-radius:999px;padding:9px 14px;font-weight:950;cursor:pointer}.primary-btn{background:#0b3d22;color:#fff}.secondary-btn{background:#eef4e9;color:#0b3d22;border:1px solid #cfdccf}.exam-score-card{margin:14px 0 0;padding:14px 16px;border-radius:12px;background:#f3eddd;border:1px solid #d4c7a9;display:grid;gap:6px}.exam-score-card strong{font-size:36px;color:#0b3d22}.exam-score-card span{font-weight:950}.exam-score-card p{margin:0;color:#5d564b;font-weight:750}@media(max-width:720px){.exam-paper-form{padding:13px}.exam-paper-topline,.exam-paper-footer,.exam-matching label,.exam-ordering label{display:grid;grid-template-columns:1fr}}`;
    const script=`
const EXAM=${payload};
function esc(v){return String(v==null?'':v).replace(/[&<>'"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c];});}
function norm(v,caseSensitive){var s=String(v==null?'':v).trim().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/\\s+/g,' '); return caseSensitive?s:s.toLowerCase();}
function textOk(v,accepted,caseSensitive){accepted=accepted||[]; var n=norm(v,caseSensitive); return accepted.some(function(a){return norm(a,caseSensitive)===n;})?1:0;}
function writingScore(v,q){var words=String(v||'').trim().split(/\\s+/).filter(Boolean); if(q.acceptedAnswers&&q.acceptedAnswers.length&&textOk(v,q.acceptedAnswers,q.caseSensitive)) return 1; if(q.minWords&&words.length<q.minWords) return 0; var keys=q.keywords||q.requiredKeywords||[]; if(keys.length){var t=norm(v,false); var ok=keys.filter(function(k){return t.indexOf(norm(k,false))>-1;}).length; return ok/keys.length;} return 0;}
function qLabel(q){return {single_choice:'Elige la respuesta correcta',multiple_choice:'Selecciona todas las correctas',true_false:'Verdadero o falso',short_text:'Completa',writing:'Writing',matching:'Relaciona',ordering:'Ordena'}[q.type]||'Ejercicio';}
function sectionName(q){return String(q.section||'Simulacro').trim()||'Simulacro';}
function optsForPairs(q){return (q.pairs||[]).map(function(p){return p.right;}).slice().sort(function(a,b){return String(a).localeCompare(String(b),'es',{numeric:true});});}
function join(arr){return (arr||[]).map(esc).join(', ');}
function optionText(q,i){return ((q.options||[])[i]||{}).text||'';}
function statusTitle(f){return f===1?'Correcto':f>0?'Parcialmente correcto':'Incorrecto';}
function addFeedback(q,parts){if(q.feedback) parts.push('<p><strong>Explicación:</strong> '+esc(q.feedback)+'</p>'); return parts;}
function questionHtml(q,idx,localIdx){
  var display=q.originalNumber||q.questionNumber||String(localIdx+1);
  var passage=q.passage?'<blockquote class="exam-passage">'+esc(q.passage)+'</blockquote>':'';
  var image=q.image?'<figure class="exam-question-image"><img src="'+esc(q.image)+'" alt="'+esc(q.imageAlt||q.imageCaption||q.exerciseTitle||q.prompt)+'">'+(q.imageCaption?'<figcaption>'+esc(q.imageCaption)+'</figcaption>':'')+'</figure>':'';
  var title=q.exerciseTitle?'<p class="exam-exercise-title">'+esc(q.exerciseTitle)+'</p>':'';
  var head='<div class="exam-question-head"><span class="exam-question-number">'+esc(display)+'</span><span class="exam-question-type">'+esc(qLabel(q))+'</span></div>';
  var legend='<legend>'+esc(q.prompt||q.question||'Pregunta')+'</legend>';
  var fb='<div class="exam-question-feedback" data-exam-feedback="'+idx+'" hidden></div>';
  if(q.type==='matching') return '<fieldset class="exam-question" data-q="'+idx+'" data-type="matching">'+head+title+legend+passage+image+'<div class="exam-matching">'+(q.pairs||[]).map(function(p,i){return '<label><span>'+esc(p.left)+'</span><select name="q'+idx+'_'+i+'"><option value="">Seleccionar</option>'+optsForPairs(q).map(function(o){return '<option value="'+esc(o)+'">'+esc(o)+'</option>';}).join('')+'</select></label>';}).join('')+'</div>'+fb+'</fieldset>';
  if(q.type==='ordering') return '<fieldset class="exam-question" data-q="'+idx+'" data-type="ordering">'+head+title+legend+passage+image+'<div class="exam-ordering">'+(q.items||[]).map(function(_,i){return '<label><span>'+(i+1)+'.</span><select name="q'+idx+'_'+i+'"><option value="">Seleccionar</option>'+(q.items||[]).map(function(o){return '<option value="'+esc(o)+'">'+esc(o)+'</option>';}).join('')+'</select></label>';}).join('')+'</div>'+fb+'</fieldset>';
  if(q.type==='short_text') return '<fieldset class="exam-question" data-q="'+idx+'" data-type="short_text">'+head+title+legend+passage+image+'<input name="q'+idx+'" type="text" placeholder="Escribe tu respuesta">'+fb+'</fieldset>';
  if(q.type==='writing') return '<fieldset class="exam-question" data-q="'+idx+'" data-type="writing">'+head+title+legend+passage+image+'<textarea name="q'+idx+'" rows="7" placeholder="Escribe tu respuesta"></textarea>'+((q.keywords||q.requiredKeywords||[]).length?'<small class="exam-help">Se autocorrige por criterios configurados.</small>':'')+fb+'</fieldset>';
  var multiple=q.type==='multiple_choice'; var typ=multiple?'checkbox':'radio';
  return '<fieldset class="exam-question" data-q="'+idx+'" data-type="'+esc(q.type)+'">'+head+title+legend+passage+image+'<div class="exam-options">'+(q.options||[]).map(function(o,i){return '<label><input type="'+typ+'" name="q'+idx+(multiple?'[]':'')+'" value="'+i+'"><span>'+esc(o.text||o.t||'')+'</span></label>';}).join('')+'</div>'+fb+'</fieldset>';
}
function render(){
  var total=EXAM.questions.length, per=total?10/total:0, groups=[];
  EXAM.questions.forEach(function(q,idx){var name=sectionName(q), g=groups[groups.length-1]; if(!g||g.name!==name){g={name:name,items:[]}; groups.push(g);} g.items.push({q:q,idx:idx});});
  var sections=groups.map(function(g){return '<section class="exam-paper-section"><header><h2>'+esc(g.name)+'</h2><span>'+(g.items.length*per).toFixed(2)+' / 10</span></header>'+g.items.map(function(it,localIdx){return questionHtml(it.q,it.idx,localIdx);}).join('')+'</section>';}).join('');
  document.getElementById('app').innerHTML='<div class="teacher-note">Puedes realizar este simulacro todas las veces que quieras.</div><form id="examForm" class="exam-paper-form"><header class="exam-paper-header"><div class="exam-paper-topline"><span>Name: .....................................................</span><span>Mark: ............ / 10</span></div><h1>'+esc(EXAM.title||'Simulacro de examen')+'</h1><p>'+esc(EXAM.instructions||'Responde y finaliza para corregir.')+'</p></header>'+sections+'<footer class="exam-paper-footer"><button type="button" class="primary-btn" id="gradeExamBtn">Finalizar y corregir</button><span>'+total+' preguntas · corrección automática sobre 10</span></footer></form><div id="result"></div>';
  document.getElementById('examForm').addEventListener('submit', score);
  document.getElementById('gradeExamBtn').addEventListener('click', function(ev){ score(ev); });
}
function applyQuestionFeedback(idx,fraction,parts){
  var fs=document.querySelector('[data-q="'+idx+'"]'); if(!fs) return;
  fs.classList.add(fraction===1?'is-correct':(fraction>0?'is-partial':'is-wrong'));
  var box=fs.querySelector('[data-exam-feedback]');
  if(box){box.hidden=false; box.innerHTML='<div class="exam-feedback-card '+(fraction===1?'is-correct':(fraction>0?'is-partial':'is-wrong'))+'">'+parts.join('')+'</div>';}
}
function score(ev){
  if(ev&&ev.preventDefault) ev.preventDefault();
  var form=document.getElementById('examForm');
  if(!form || form.dataset.grading==='1') return;
  form.dataset.grading='1';
  try{
  var total=EXAM.questions.length, per=total?10/total:0, raw=0, answers=[];
  EXAM.questions.forEach(function(q,idx){
    var fraction=0,value=null,correct=null,parts=[];
    var fs=document.querySelector('[data-q="'+idx+'"]');
    if(q.type==='matching'){
      var vals=(q.pairs||[]).map(function(p,i){return (form.elements['q'+idx+'_'+i]||{}).value||'';});
      var ok=vals.filter(function(v,i){return v===(q.pairs||[])[i].right;}).length; fraction=(q.pairs||[]).length?ok/(q.pairs||[]).length:0; value=vals; correct=(q.pairs||[]).map(function(p){return p.right;});
      parts.push('<p><strong>'+statusTitle(fraction)+'.</strong> '+ok+'/'+(q.pairs||[]).length+' relaciones correctas.</p>');
      parts.push('<ul>'+(q.pairs||[]).map(function(p,i){var good=vals[i]===p.right; var lab=fs.querySelectorAll('.exam-matching label')[i]; if(lab) lab.classList.add(good?'is-correct':'is-wrong'); return '<li><strong>'+esc(p.left)+':</strong> '+(good?'correcto':'marcaste “'+esc(vals[i]||'sin respuesta')+'”, debía ser “'+esc(p.right)+'”')+'.</li>';}).join('')+'</ul>');
    } else if(q.type==='ordering'){
      var vals=(q.items||[]).map(function(_,i){return (form.elements['q'+idx+'_'+i]||{}).value||'';});
      var ok=vals.filter(function(v,i){return v===(q.items||[])[i];}).length; fraction=(q.items||[]).length?ok/(q.items||[]).length:0; value=vals; correct=q.items||[];
      parts.push('<p><strong>'+statusTitle(fraction)+'.</strong> '+ok+'/'+(q.items||[]).length+' posiciones correctas.</p><p><strong>Tu orden:</strong> '+(join(vals.filter(Boolean))||'sin respuesta')+'.</p><p><strong>Orden correcto:</strong> '+join(q.items||[])+'.</p>');
      vals.forEach(function(v,i){var lab=fs.querySelectorAll('.exam-ordering label')[i]; if(lab) lab.classList.add(v===(q.items||[])[i]?'is-correct':'is-wrong');});
    } else if(q.type==='multiple_choice'){
      var selected=[].slice.call(form.elements).filter(function(el){return el.name==='q'+idx+'[]' && el.checked;}).map(function(x){return Number(x.value);}).sort(function(a,b){return a-b;});
      var expected=(q.options||[]).map(function(o,i){return (o.correct||o.c)?i:null;}).filter(function(x){return x!==null;}).sort(function(a,b){return a-b;});
      fraction=selected.length===expected.length&&selected.every(function(v,i){return v===expected[i];})?1:0; value=selected; correct=expected;
      [].slice.call(fs.querySelectorAll('.exam-options label')).forEach(function(l,i){ if(expected.indexOf(i)>-1) l.classList.add('is-correct'); if(selected.indexOf(i)>-1&&expected.indexOf(i)===-1) l.classList.add('is-wrong'); });
      parts.push('<p><strong>'+statusTitle(fraction)+'.</strong> Debías marcar exactamente todas las opciones correctas.</p><p><strong>Marcaste:</strong> '+(join(selected.map(function(i){return optionText(q,i);}))||'sin respuesta')+'.</p><p><strong>Respuesta correcta:</strong> '+join(expected.map(function(i){return optionText(q,i);}))+'.</p>');
    } else if(q.type==='short_text'){
      value=(form.elements['q'+idx]||{}).value||''; fraction=textOk(value,q.acceptedAnswers||[],q.caseSensitive); correct=q.acceptedAnswers||[];
      parts.push('<p><strong>'+statusTitle(fraction)+'.</strong> '+(fraction===1?'La respuesta coincide con una respuesta aceptada.':'La respuesta no coincide con las respuestas aceptadas.')+'</p><p><strong>Tu respuesta:</strong> '+esc(value||'sin respuesta')+'.</p><p><strong>Respuesta aceptada:</strong> '+join(q.acceptedAnswers||[])+'.</p>');
    } else if(q.type==='writing'){
      value=(form.elements['q'+idx]||{}).value||''; fraction=writingScore(value,q); correct=(q.acceptedAnswers&&q.acceptedAnswers.length)?q.acceptedAnswers:(q.keywords||q.requiredKeywords||[]);
      var words=String(value||'').trim().split(/\\s+/).filter(Boolean); var keys=q.keywords||q.requiredKeywords||[]; var missing=keys.filter(function(k){return norm(value,false).indexOf(norm(k,false))<0;});
      parts.push('<p><strong>'+statusTitle(fraction)+'.</strong> Corrección objetiva por criterios configurados.</p>');
      if(q.minWords) parts.push('<p><strong>Extensión:</strong> '+words.length+'/'+q.minWords+' palabras mínimas'+(words.length<q.minWords?' (insuficiente)':' (correcto)')+'.</p>');
      if(keys.length) parts.push('<p><strong>Palabras clave esperadas:</strong> '+join(keys)+(missing.length?' <strong>Faltan:</strong> '+join(missing):' Se han incluido todas.')+'.</p>');
      if(q.acceptedAnswers&&q.acceptedAnswers.length) parts.push('<p><strong>Respuesta aceptada:</strong> '+join(q.acceptedAnswers)+'.</p>');
    } else {
      var selected=form.querySelector('[name="q'+idx+'"]:checked'); value=selected?Number(selected.value):null; var expected=(q.options||[]).findIndex(function(o){return o.correct||o.c;}); fraction=value===expected?1:0; correct=expected;
      [].slice.call(fs.querySelectorAll('.exam-options label')).forEach(function(l,i){ if(i===expected) l.classList.add('is-correct'); if(i===value&&i!==expected) l.classList.add('is-wrong'); });
      parts.push('<p><strong>'+statusTitle(fraction)+'.</strong> '+(fraction===1?'Has elegido la opción correcta.':'La opción seleccionada no es correcta.')+'</p><p><strong>Tu respuesta:</strong> '+(value===null?'sin respuesta':esc(optionText(q,value)))+'.</p><p><strong>Respuesta correcta:</strong> '+esc(optionText(q,expected))+'.</p>');
    }
    parts=addFeedback(q,parts);
    applyQuestionFeedback(idx,fraction,parts);
    raw+=fraction*per; answers.push({question:q.prompt||q.question,type:q.type,value:value,correct:correct,fraction:fraction});
  });
  var finalScore=Math.max(0,Math.min(10,Number(raw.toFixed(2))));
  document.getElementById('result').innerHTML='<div class="exam-score-card"><strong>'+finalScore.toFixed(2)+'/10</strong><span>'+(finalScore>=5?'Simulacro superado':'Simulacro no superado')+'</span><p>'+answers.filter(function(a){return a.fraction===1;}).length+'/'+answers.length+' preguntas completamente correctas. Revisa debajo de cada pregunta el feedback.</p><button type="button" class="secondary-btn" id="retake">Rehacer simulacro</button></div>';
  form.querySelectorAll('input,textarea,select,button').forEach(function(el){el.disabled=true;});
  document.getElementById('retake').addEventListener('click',function(){render(); window.scrollTo({top:0,behavior:'smooth'});});
  }catch(error){
    console.error(error);
    document.getElementById('result').innerHTML='<div class="exam-score-card"><strong>No se pudo corregir</strong><span>Ha ocurrido un error al procesar el cuestionario.</span><p>'+esc(error&&error.message?error.message:'Error de corrección')+'</p><button type="button" class="secondary-btn" id="retryGrade">Intentar de nuevo</button></div>';
    var retry=document.getElementById('retryGrade');
    if(retry) retry.addEventListener('click',function(){ form.dataset.grading=''; document.getElementById('result').innerHTML=''; });
  }
}
render();
`;
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(normalized.title||'Simulacro de examen')}</title><style>${style}</style></head><body><main class="wrap"><div id="app">Cargando simulacro…</div></main><script>${script.replace(/<\/script/gi,'<\\/script')}<\/script></body></html>`;
  }

  function materialEmbedMarkupForNewWindow(m={}){
    const source=materialEmbedSource(m);
    if(source.mode==='exam'){
      const runner=examRunnerHtmlForNewWindow(source.exam);
      return `<section class="material-embed-block exam-preview-shell"><div><strong>Simulacro de examen</strong><small>Autocorregible: puedes realizarlo, corregirlo y repetirlo.</small></div><iframe title="Simulacro de examen autocorregible" sandbox="allow-scripts allow-forms allow-same-origin" srcdoc="${safe(runner)}" style="min-height:920px"></iframe></section>`;
    }
    if(source.mode==='quiz'){
      const encoded=encodeBase64Utf8(JSON.stringify(source.quiz));
      return `<section class="material-embed-block"><div><strong>Recurso interactivo</strong><small>Test nativo de Tribeca Aula</small></div><div class="native-quiz-block" data-t99-quiz="${safe(encoded)}"><p>Cargando test…</p></div></section><script>(${renderNativeQuiz.toString()})(document.querySelector('.native-quiz-block'))<\/script>`;
    }
    if(source.mode==='schemaActivity'){
      const runner=schemaActivityStandaloneHtml(source.activity, m);
      return `<section class="material-embed-block schema-activity-shell"><div><strong>Esquema interactivo</strong><small>Autocorregible · feedback inmediato</small></div><iframe title="Esquema interactivo" sandbox="allow-scripts allow-forms allow-same-origin" srcdoc="${safe(runner)}" style="min-height:960px"></iframe></section>`;
    }
    if(source.mode==='video' || source.mode==='videoHtml') return videoEmbedMarkup(source, m, true);
    if(!source.src && !source.html) return '';
    const height=Math.max(420, Math.min(Number(m.embed_height||620), 1600));
    if(source.html){
      const encoded=encodeBase64Utf8(source.html);
      return `<section class="material-embed-block"><div><strong>Recurso interactivo</strong><small>Código HTML insertado</small></div><iframe title="Recurso interactivo" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads" src="data:text/html;charset=utf-8;base64,${encoded}" style="min-height:${height}px"></iframe></section>`;
    }
    return `<section class="material-embed-block"><div><strong>Recurso interactivo</strong><small>URL embebida</small></div><iframe title="Recurso interactivo" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads" src="${safe(source.src)}" style="min-height:${height}px"></iframe></section>`;
  }


  function openMaterialInNewWindow(materialId){
    const m=(State.data.materials||[]).find(x=>String(x.id)===String(materialId));
    if(!m) return toast('No se encontró la publicación.');
    const meta=materialTypeMeta(materialVisualKind(m));
    const attachments=normalizeAttachments(m);
    const body=m.body||m.description||m.content||m.text||'';
    const w=window.open('', '_blank');
    if(!w) return toast('El navegador ha bloqueado la ventana emergente.');
    const attachmentHtml=attachments.length?`<section class="files"><h2>Archivos adjuntos</h2>${attachments.map((att,i)=>{ const url=att.url||att.href||att.path||att.publicUrl||att.public_url||''; const name=att.name||att.filename||att.file_name||`Archivo ${i+1}`; const type=String(att.type||att.mime_type||'').toLowerCase(); return url?`<a class="attachment" href="${safe(url)}" target="_blank" rel="noopener">${/^image\//.test(type)?`<img src="${safe(url)}" alt="">`:''}<span>📎 ${safe(name)}</span></a>`:`<p>📎 ${safe(name)}</p>`; }).join('')}</section>`:'';
    const openEmbedSource=materialEmbedSource(m);
    const isSchemaOpen=openEmbedSource?.mode==='schemaActivity' || materialVisualKind(m)==='schema';
    if(isSchemaOpen && openEmbedSource?.activity){
      w.document.write(schemaActivityStandaloneHtml(openEmbedSource.activity, m));
      w.document.close();
      return;
    }
    const embedHtml=materialEmbedMarkupForNewWindow(m);
    const fontSize = 12.5;
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(m.title||'Publicación')}</title><style>:root{font-size:12.5px}*{box-sizing:border-box}body{margin:0;background:#f7f4ec;color:#172018;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5}.back-btn{position:fixed;top:16px;left:16px;z-index:20;display:inline-flex;align-items:center;gap:7px;border:1px solid #d7ccb5;border-radius:999px;background:#fffdf7;color:#0b3d22;text-decoration:none;font-weight:900;padding:8px 13px;box-shadow:0 8px 20px rgba(34,27,12,.09);font-size:13px}.back-btn:hover{background:#eef4e9}.wrap{max-width:${isSchemaOpen?'min(98vw,1500px)':'860px'};margin:0 auto;padding:64px 16px 28px}.head{border-left:6px solid #0b3d22;background:#fffdf7;border-radius:16px;padding:18px 22px;box-shadow:0 10px 26px rgba(35,28,12,.075)}.tag{display:inline-flex;border-radius:999px;background:#fff1df;color:#7b3c00;border:1px solid #f0c894;padding:4px 9px;font-weight:900;font-size:12px}h1{font-family:Georgia,serif;font-size:clamp(26px,2.4vw,38px);line-height:1.08;margin:14px 0 8px;letter-spacing:.005em;color:#0b3d22}.meta{color:#6a6458;font-weight:750;font-size:13px;margin:0}.body,.files{background:#fffdf7;border:1px solid #e0d7c0;border-radius:13px;padding:13px 16px;margin-top:12px}.body{font-size:${fontSize}px}.body p{margin:0 0 12px}.image{display:block;max-width:100%;max-height:240px;object-fit:contain;border-radius:12px;margin:12px 0}.link,.attachment{display:flex;align-items:center;gap:8px;width:fit-content;margin:9px 0 0;padding:7px 11px;border-radius:999px;background:#eef4e9;color:#0b3d22;font-weight:900;text-decoration:none;font-size:13px}.files h2{font-size:16px;margin:0 0 10px}.material-embed-block{background:#fffdf7;border:1px solid #e0d7c0;border-radius:13px;padding:13px 16px;margin-top:12px}.material-embed-block strong,.material-embed-block small{display:block}.material-embed-block small{color:#6a6458;font-weight:750}.material-embed-block iframe{width:100%;min-height:420px;border:1px solid #d7ccb5;border-radius:12px;background:#fff;margin-top:10px}.exam-preview{margin-top:12px}.exam-preview>header{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #1f1e1a;padding-bottom:10px;margin-bottom:12px}.exam-preview>header strong{display:block;color:#0b3d22;font-family:Georgia,serif;font-size:24px}.exam-preview>header p{margin:4px 0 0;color:#6a6458;font-weight:750}.exam-preview>header span{white-space:nowrap;font-weight:900;color:#6a4f14}.exam-preview section{margin-top:14px}.exam-preview h2{font-size:18px;margin:0 0 8px;border-bottom:1px solid #d7ccb5;padding-bottom:4px;color:#1f1e1a}.exam-preview-question{border-bottom:1px solid #eee4d0;padding:8px 0 12px}.exam-preview-question .q-head{display:flex;align-items:center;gap:8px;margin-bottom:4px}.exam-preview-question .q-head span{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#f0eadc;font-weight:900}.exam-preview-question .q-head em{font-style:normal;color:#6a6458;font-weight:800;font-size:12px}.exam-preview-question h3{font-size:16px;margin:4px 0 8px;color:#1f1e1a}.exercise-title{margin:0;color:#0b3d22;font-weight:900}.exam-preview blockquote{margin:8px 0;padding:10px 12px;border-left:4px solid #0b3d22;background:#faf8f1}.exam-preview-image{margin:8px 0;padding:8px;border:1px solid #d7ccb5;border-radius:10px;background:#fff}.exam-preview-image img{display:block;width:100%;max-height:420px;object-fit:contain}.exam-preview-image figcaption{text-align:center;color:#6a6458;font-weight:750;font-size:12px;margin-top:5px}.exam-preview-options{margin:6px 0 0 22px}.exam-preview-options li{margin:4px 0}.exam-preview-table{width:100%;border-collapse:collapse;margin-top:8px}.exam-preview-table td{border:1px solid #e2d8c2;padding:7px}.exam-preview-line{height:36px;border-bottom:1px solid #aaa}.exam-preview-writing{min-height:150px;border:1px solid #d7ccb5;border-radius:8px;background:#fff}.attachment img{width:64px;height:48px;object-fit:cover;border-radius:8px}@media (max-width:680px){.wrap{padding:66px 12px 24px}.back-btn{top:10px;left:10px}.body,.files,.head{padding:14px}}@media print{.back-btn,.link{display:none}}</style></head><body><a class="back-btn" href="#" onclick="if(history.length>1){history.back();}else{window.close();}return false;">← Atrás</a><main class="wrap"><header class="head"><span class="tag">${safe(meta.icon)} ${safe(meta.label)}</span><h1>${safe(m.title||'Publicación')}</h1><p class="meta">${safe(m.subject||'Materia')} · ${safe(m.unit_title||m.unit||'Unidad 1')}</p></header><section class="body">${m.image_url?`<img class="image" src="${safe(m.image_url)}" alt="">`:''}<p>${safe(body).replace(/\n/g,'<br>')}</p>${m.link_url?`<a class="link" href="${safe(m.link_url)}" target="_blank" rel="noopener">Abrir enlace externo</a>`:''}</section>${embedHtml}${attachmentHtml}</main></body></html>`);
    w.document.close();
  }

  const titleMap = {newPublication:'Nueva publicación',newDate:'Nueva fecha',activityLog:'Qué ha ocurrido en el aula',teacherAlerts:'Alertas docentes',classOverview:'Vista general del aula',teacherDocuments:'Documentos PDF',activityAnalytics:'Actividad del alumnado',passwordRequests:'Solicitudes de recuperación',studentProfiles:'Perfiles del alumnado',classrooms:'Clases',classroomDetail:'Clase',payments:'Pagos',attendance:'Asistencia y pausas',teacherSubjects:'Materias y materiales',videoclasses:'Videoclases',guidance:'Orientación académica',calendar:'Calendario',messages:'Mensajes',announcements:'Anuncios',profile:'Mi perfil',difficulties:'Mis materias con dificultades',grades:'Mis calificaciones',subjectDetail:'Materia',aboutTribeca:'Detrás de Tribeca',legal:'Aviso legal',support:'Soporte',contact:'Contacto'};
  function openTool(id, opts={}) {
    if(!roleTeacher() && State.profile && activePauseFor(State.profile.id)) { renderApp(); return; }
    closeAccountMenu();
    setTribecaHistory(id, opts || {});
    renderInlineSection(id, opts || {});
  }
  window.openTool = openTool;
  function baseAppUrl(){ return location.href.split('?')[0].split('#')[0]; }
  function tribecaHistoryUrl(id='home', opts={}){
    if(id==='home') return baseAppUrl();
    const params=new URLSearchParams();
    params.set('ta_section', String(id||'home'));
    Object.entries(opts||{}).forEach(([k,v])=>{ if(v!==undefined && v!==null && v!=='') params.set(`ta_${k}`, String(v)); });
    return `${baseAppUrl()}#${params.toString()}`;
  }
  function tribecaStateFromUrl(){
    const hash=String(location.hash||'').replace(/^#/,'');
    const params=new URLSearchParams(hash);
    const id=params.get('ta_section') || '';
    if(!id) return {id:'home', opts:{}};
    const opts={};
    params.forEach((v,k)=>{ if(k.startsWith('ta_') && k!=='ta_section') opts[k.slice(3)]=v; });
    return {id, opts};
  }
  function setTribecaHistory(id='home', opts={}, mode='push'){
    if(State.historyNavigating || State.suppressHistoryPush) return;
    const state={tribeca:true, id:String(id||'home'), opts:opts||{}};
    const url=tribecaHistoryUrl(state.id, state.opts);
    const current=history.state;
    const same=current?.tribeca && current.id===state.id && JSON.stringify(current.opts||{})===JSON.stringify(state.opts||{});
    if(same && mode!=='replace') return;
    try{ history[mode==='replace'?'replaceState':'pushState'](state,'',url); }catch(_e){}
  }
  function ensureTribecaHistoryState(id='home', opts={}){
    if(!history.state?.tribeca) setTribecaHistory(id, opts, 'replace');
  }
  function openAppSectionInNewTab(section){
    openTool(String(section || 'subjects'));
  }
  function openedPageTarget(){
    const params = new URLSearchParams(location.search);
    return params.get('t39_page') || params.get('t37_page') || params.get('t36_page') || params.get('t35_open') || '';
  }
  function ensureOpenedTabBackButton(){
    if(!openedPageTarget() || document.getElementById('t36OpenedPageBack')) return;
    const btn = document.createElement('button');
    btn.id = 't36OpenedPageBack';
    btn.className = 't35-opened-tab-back t36-opened-page-back';
    btn.type = 'button';
    btn.textContent = '← Atrás';
    btn.addEventListener('click', ev => {
      ev.preventDefault();
      if(history.length > 1) history.back(); else window.close();
    });
    document.body.appendChild(btn);
  }
  function standaloneSubjectsContent(){
    const p=State.profile;
    const subjects=subjectList(p);
    return `<section class="t36-standalone-head panel"><p class="eyebrow">Mis materias</p><h1>Materias de ${safe(p?.course||'')}</h1><p>${safe(academicLine(p))}</p></section><section class="subjects-grid t36-standalone-subjects" id="subjectsGrid">${subjects.map((s,i)=>subjectCard(s,i)).join('')}</section>`;
  }
  function renderStandalonePage(target){
    const main = $('#inicio');
    if(!main || !State.profile) return;
    if(!roleTeacher() && activePauseFor(State.profile.id)){ renderApp(); return; }
    const id = String(target || 'subjects');
    if(id === 'home') { showHomePage(); return; }
    document.body.classList.add('is-standalone-page');
    ensureMainNavHomeButton();
    ensureOpenedTabBackButton();
    setActiveMainNav(id);
    if(id === 'subjects') {
      main.innerHTML = standaloneSubjectsContent();
      bindSubjectCards();
    } else if(titleMap[id]) {
      let bodyHtml = '';
      try { bodyHtml = toolContent(id); }
      catch(error) { console.error(`[Tribeca Aula] Error al abrir página ${id}:`, error); bodyHtml = `<section class="window-panel"><h3>No se pudo cargar esta página</h3><p class="login-note">${safe(error?.message || 'Error desconocido')}</p></section>`; }
      main.innerHTML = `<section class="t36-standalone-head panel"><p class="eyebrow">Tribeca Aula</p><h1>${safe(titleMap[id]||id)}</h1></section><section class="t36-standalone-tool">${bodyHtml}</section>`;
      wireManagedForms(main);
      bindSubjectCards();
      if(id==='announcements') visibleAnnouncements().forEach(a=>localStorage.setItem(`tribeca-ann-seen-${a.id}`,'1'));
    }
    updateBadges();
    applyTranslations();
    hydrateInteractiveEmbeds(main);
  }
  function renderInlineSection(target, opts={}) {
    const main = $('#inicio');
    if(!main || !State.profile) return;
    if(!roleTeacher() && activePauseFor(State.profile.id)) { renderApp(); return; }
    const id = String(target || 'home');
    syncFocusModeClass();
    if(id && id !== 'home') setTribecaHistory(id, opts || {});
    State.activeInlineSection = id;
    State.activeInlineOptions = opts || {};
    if(opts.subject) State.currentSubject = opts.subject;
    if(opts.classSubjectId) State.currentClassSubjectId = opts.classSubjectId;
    if(opts.classId) State.currentClassId = opts.classId;
    State.windows.forEach(win => win?.remove?.());
    State.windows.clear();
    document.body.classList.remove('is-standalone-page');
    document.body.classList.add('is-inline-section');
    ensureMainNavHomeButton();
    setActiveMainNav(id === 'subjectDetail' ? 'subjects' : id);

    if(id === 'home') {
      State.activeInlineSection = null;
      State.activeInlineOptions = {};
      renderApp();
      return;
    }

    if(id === 'subjects') {
      main.innerHTML = standaloneSubjectsContent();
      bindSubjectCards();
      window.scrollTo({top: 0, behavior: 'smooth'});
      updateBadges();
      applyTranslations();
      hydrateInteractiveEmbeds(main);
      return;
    }

    let bodyHtml = '';
    try { bodyHtml = toolContent(id); }
    catch(error) {
      console.error(`[Tribeca Aula] Error al abrir sección ${id}:`, error);
      bodyHtml = `<section class="window-panel"><h3>No se pudo cargar esta sección</h3><p class="login-note">${safe(error?.message || 'Error desconocido')}</p></section>`;
    }

    const title = (id === 'classroomDetail' && State.currentClassId) ? (classroomLabel(classById(State.currentClassId)||{}) || 'Clase') : ((id === 'classSubjectDetail' && State.currentSubject) ? State.currentSubject : (id === 'subjectDetail' && State.currentSubject ? State.currentSubject : (titleMap[id] || id)));
    const headHtml = '';
    main.innerHTML = `${headHtml}<section class="t52-inline-tool ${safe(id)}-inline teacher-section-clean-v147" data-section-title="${safe(title)}">${bodyHtml}</section>`;

    wireManagedForms(main);
    bindSubjectCards();
    if(id === 'announcements') visibleAnnouncements().forEach(a => localStorage.setItem(`tribeca-ann-seen-${a.id}`, '1'));
    if(id === 'teacherAlerts' && roleTeacher()) localStorage.setItem(`tribeca-alerts-seen-${State.profile.id}`, String(teacherAlertCount()));
    window.scrollTo({top: 0, behavior: 'smooth'});
    updateBadges();
    applyTranslations();
    hydrateInteractiveEmbeds(main);
      hydrateInteractiveEmbeds(main);
    syncFocusModeClass();
  }
  window.TribecaRenderInlineSection = renderInlineSection;

  function handleInitialOpenRequest(){
    const target = openedPageTarget();
    if(!target || !State.profile) return;
    setTimeout(() => renderInlineSection(target), 80);
  }
  function refreshCalendarAfterNavigation(){
    if(State.activeInlineSection) renderInlineSection(State.activeInlineSection, State.activeInlineOptions || {});
    else rerender();
  }
  function parseCalendarInput(value){
    const raw = String(value || '').trim();
    if(!raw) return null;
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const m = raw.match(/^(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{4})$/);
    if(!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const date = new Date(year, month - 1, day);
    if(date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return toIso(date);
  }
  function chooseCalendarDate(){
    const current = parseIso(State.selectedDate || todayIso());
    const defaultValue = current.toLocaleDateString('es-ES');
    const answer = prompt('Introduce una fecha concreta en formato día/mes/año:', defaultValue);
    if(answer === null) return;
    const iso = parseCalendarInput(answer);
    if(!iso){ toast('Fecha no válida. Usa el formato día/mes/año, por ejemplo 31/05/2026.'); return; }
    State.selectedDate = iso;
    State.selectedEventId = null;
    State.calendarMonth = startMonth(parseIso(iso));
    refreshCalendarAfterNavigation();
  }
  function rerender(){
    if(State.activeInlineSection) {
      renderInlineSection(State.activeInlineSection, State.activeInlineOptions || {});
      return;
    }
    State.windows.forEach((_,id)=>openTool(id));
    updateBadges();
  }
  window.rerenderOpenWindows = rerender;
  function enableDrag(win){ const bar=$('.window-titlebar',win); if(!bar || bar.dataset.dragReady) return; bar.dataset.dragReady='1'; bar.addEventListener('pointerdown', e=>{ if(e.target.closest('button')||win.classList.contains('is-maximized')) return; const r=win.getBoundingClientRect(); const ox=e.clientX-r.left, oy=e.clientY-r.top; win.style.transform='none'; const move=me=>{win.style.left=`${me.clientX-ox}px`;win.style.top=`${me.clientY-oy}px`;}; const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);}; document.addEventListener('pointermove',move); document.addEventListener('pointerup',up); }); }
  function toolContent(id) {
    if(id==='badges' || id==='assignBadge') return '<div class="empty-state">Este apartado ya no está disponible en Tribeca Aula.</div>';
    if(id==='newPublication') return newPublicationContent(); if(id==='newDate') return calendarContent(true); if(id==='calendar') return calendarContent(false); if(id==='activityLog') return activityContent(); if(id==='teacherAlerts') return alertsContent(); if(id==='classOverview') return classOverviewContent(); if(id==='activityAnalytics') return activityAnalyticsContent(); if(id==='teacherDocuments') return teacherDocumentsContent(); if(id==='passwordRequests') return passwordRequestsContent(); if(id==='studentProfiles') return studentProfilesContent(); if(id==='classrooms') return classroomsContent(); if(id==='classroomDetail') return classroomDetailContent(State.currentClassId); if(id==='teacherSubjects') return teacherSubjectsContent(); if(id==='videoclasses') return videoclassesContent(); if(id==='materialRepository') return materialRepositoryContent(); if(id==='guidance') return guidanceContent(); if(id==='payments') return paymentsContent(); if(id==='attendance') return attendanceContent(); if(id==='messages') return messagesContent(); if(id==='announcements') return announcementsContent(); if(id==='profile') return profileContent(); if(id==='difficulties') return difficultiesContent(); if(id==='grades') return gradesContent(); if(id==='subjectDetail') return subjectDetailContent(State.currentSubject); if(id==='classSubjectDetail') return classSubjectDetailContent(State.currentClassSubjectId); if(id==='aboutTribeca') return aboutTribecaContent(); if(id==='legal') return legalContent(); if(id==='support') return supportContent(); if(id==='contact') return contactContent(); return '<div class="empty-state">Herramienta sin contenido.</div>';
  }

  function classSubjectOptions(stage = State.selectedSubjectStage, course = State.selectedSubjectCourse) {
    return (subjectCatalog[`${stage}-${course}`] || []).map(x => `<option>${safe(x)}</option>`).join('');
  }
  function recipientSelector(prefix='pub') {
    const students=State.data.students||[];
    return `<section class="window-panel recipient-panel"><h3>3. Destinatarios</h3><p class="meta">Primero elige el alcance. Si eliges alumnos concretos, marca uno o varios perfiles.</p><div class="t16-scope-grid premium-scope"><label><input type="radio" name="targetScope" value="all" checked> Todo el alumnado</label><label><input type="radio" name="targetScope" value="class"> Centro, etapa y curso</label><label><input type="radio" name="targetScope" value="selected"> Alumnos concretos</label></div><div class="window-grid"><label>Centro<select name="center"><option value="">Sin filtrar</option>${options(centers)}</select></label><label>Etapa<select name="stage"><option value="">Sin filtrar</option>${options(stages)}</select></label><label>Curso<select name="course"><option value="">Sin filtrar</option>${options(courses)}</select></label></div><input class="t16-search" type="search" placeholder="Filtrar alumnado por nombre o usuario..." data-t16-student-search><div class="recipient-scroll">${groups(students).map(g=>`<details class="recipient-group" open><summary>${safe(g.label)} <span>${g.items.length}</span></summary><div class="recipient-pills">${g.items.map(s=>`<label data-student-name="${safe((displayName(s)+' '+s.username+' '+academicLine(s)).toLowerCase())}"><input type="checkbox" name="targetUserIds" value="${safe(s.id)}"><span>${safe(displayName(s))}<small>${safe(s.username||'')} · ${safe(s.course||'')}</small></span></label>`).join('')}</div></details>`).join('')}</div></section>`;
  }
  function normalizeMaterialKind(value='') {
    const v = String(value || '').trim().toLowerCase();
    if(!v) return 'material';
    if(['announcement','notice','news','anuncio','aviso','noticia'].includes(v)) return 'announcement';
    if(['video','vídeo','videoclase','video_clase','clase_video','clase en vídeo','clase en video'].includes(v) || /v[ií]deo|video|videoclase/.test(v)) return 'video';
    if(['presentation','presentacion','presentación','slides','slide','diapositivas','powerpoint','power point','canva','genially','google slides'].includes(v) || /presentaci[oó]n|diapositiva|power.?point|canva|genially|google.?slides|slides?/.test(v)) return 'presentation';
    if(['schema','scheme','esquema','esquema_interactivo','interactive_schema','drag_drop_schema','fill_schema','complete_schema','mapa_conceptual'].includes(v) || /esquema|schema|mapa.?conceptual/.test(v)) return 'schema';
    if(['game','juego','jocs','play','gamified','ludico','lúdico'].includes(v) || /juego|game|l[uú]dic/.test(v)) return 'game';
    if(['exam','simulacro','mock_exam','simulacro_examen','mock','examen'].includes(v) || /simulacro|mock.?exam|examen/.test(v)) return 'exam';
    if(['test','quiz','external_test','prueba','cuestionario','daypo'].includes(v) || /test|quiz|cuestionario|prueba/.test(v)) return 'test';
    if(['task','tarea','actividad','activity','assignment','exercise','ejercicio'].includes(v) || /tarea|actividad|assignment|ejercicio/.test(v)) return 'task';
    if(['link','url','external_link','enlace','recurso','resource'].includes(v) || /enlace|link|url|recurso/.test(v)) return 'material';
    return 'material';
  }
  function dbMaterialType(kind='material') {
    const k = normalizeMaterialKind(kind);
    return ({ material:'apuntes', task:'tarea', test:'test', exam:'simulacro', game:'juego', video:'video', schema:'esquema', presentation:'presentacion' }[k] || 'apuntes');
  }
  function materialTypeMeta(value='material') {
    const k = normalizeMaterialKind(value);
    const map = {
      material: { key:'material', label:'Material', icon:'📄' },
      task: { key:'task', label:'Tarea', icon:'✅' },
      test: { key:'test', label:'Test externo', icon:'🧪' },
      exam: { key:'exam', label:'Simulacro de examen', icon:'📝' },
      game: { key:'game', label:'Juego', icon:'🎮' },
      video: { key:'video', label:'Vídeo', icon:'🎥' },
      presentation: { key:'presentation', label:'Presentación', icon:'🖥️' },
      schema: { key:'schema', label:'Esquema', icon:'🧩' },
      announcement: { key:'announcement', label:'Anuncio', icon:'📣' }
    };
    return map[k] || map.material;
  }
  function selectedAttr(a,b){ return String(a||'')===String(b||'') ? 'selected' : ''; }
  async function persistSupabaseRecord(tableName, payload, id=null) {
    let current = {...payload};
    const materialFallbacks = ['presentacion','apuntes','tarea','test','simulacro','juego','video','esquema','actividad','recurso','documento','document','link','material'];
    for(let attempt=0; attempt<12; attempt++) {
      const res = id ? await table(tableName).update(current).eq('id', id) : await table(tableName).insert(current);
      if(!res.error) return res;
      const msg = String(res.error.message || res.error.details || res.error.hint || '');
      const col = (msg.match(/'([^']+)' column/) || msg.match(/column "?([a-zA-Z0-9_]+)"?/) || [])[1];
      if(col && Object.prototype.hasOwnProperty.call(current, col)) { delete current[col]; continue; }
      if(tableName === 'subject_materials' && /material_type.*check|check constraint|violates check/i.test(msg)) {
        const next = materialFallbacks.find(x => x !== current.material_type);
        if(next) { current.material_type = next; materialFallbacks.splice(materialFallbacks.indexOf(next), 1); continue; }
      }
      throw res.error;
    }
    throw new Error('No se pudo guardar la publicación después de adaptar los campos a Supabase.');
  }
  function repositoryContextFromItem(item={}){
    const stage = item.stage || State.selectedSubjectStage || State.profile?.stage || '';
    const course = item.course || State.selectedSubjectCourse || State.profile?.course || '';
    const subject = State.prefillPublicationSubject || item.subject || '';
    const unit = item.unit_title || item.unit || '';
    const itemCenter = String(item.center || '').trim();
    const matchingStudents = (State.data.students||[]).filter(s=>
      (!stage || s.stage===stage) &&
      (!course || s.course===course)
    );
    const matchingCenters = repoUnique(matchingStudents.map(s=>s.center));
    const center = itemCenter && !/tribeca academia/i.test(itemCenter)
      ? itemCenter
      : (matchingCenters.length===1 ? matchingCenters[0] : '');
    return {center, stage, course, subject, unit};
  }
  function repositoryClassificationFields(ctx={}, prefix='repo'){
    const centerValues = repoUnique([...centersFromStudents(), ...(State.data.materialRepository||[]).map(r=>r.center), ...centers]);
    const stageValue = ctx.stage || '';
    const courseValue = ctx.course || '';
    const courseValues = stageValue ? coursesForStage(stageValue) : dynamicCourses();
    const stageValues = courseValue ? stagesForCourse(courseValue) : stages;
    return `<section class="window-panel repo-classification-panel">
      <h3>Clasificación para el repositorio</h3>
      <p class="meta">Asocia este material al centro, etapa y curso reales. Esto no es decorativo: determina dónde quedará guardado para reutilizarlo otros años.</p>
      <div class="window-grid">
        <label>Centro educativo<select name="${prefix}Center"><option value="">Seleccionar centro</option>${repoOptions(centerValues, ctx.center||'', false)}</select></label>
        <label>Etapa<select name="${prefix}Stage"><option value="">Seleccionar etapa</option>${repoOptions(stageValues, stageValue, false)}</select></label>
        <label>Curso<select name="${prefix}Course"><option value="">Seleccionar curso</option>${repoOptions(courseValues, courseValue, false)}</select></label>
      </div>
    </section>`;
  }

  function classroomLabel(c={}){
    return c?.name || classroomAutoName(c?.center, c?.stage, c?.course);
  }
  function publicationClassroomSelector(item={}){
    const classes=(State.data.classrooms||[]).filter(c=>c && c.active!==false).sort((a,b)=>String(a.center||'').localeCompare(String(b.center||''),'es') || String(a.course||'').localeCompare(String(b.course||''),'es',{numeric:true}));
    const selected=State.prefillPublicationClassId || item.class_id || '';
    return `<section class="window-panel classroom-publication-panel">
      <h3>Clase del nuevo modelo</h3>
      <p class="meta">Para publicar materiales en el nuevo modelo, selecciona siempre la clase. Los anuncios pueden seguir publicándose sin clase.</p>
      <label>Clase<select name="classId"><option value="">Seleccionar clase</option>${classes.map(c=>`<option value="${safe(c.id)}" ${selectedAttr(c.id,selected)}>${safe(classroomLabel(c))} · ${safe([c.center,c.stage,c.course].filter(Boolean).join(' · '))}</option>`).join('')}</select></label>
    </section>`;
  }
  async function ensureClassSubjectAndUnit(classId, subject, unit='Unidad 1'){
    if(!classId || !subject) return {classSubjectId:null, classUnitId:null};
    let classSubject=(State.data.classSubjects||[]).find(s=>String(s.class_id)===String(classId) && String(s.subject||'').trim().toLowerCase()===String(subject||'').trim().toLowerCase());
    if(!classSubject){
      const inserted=await maybe(table('tribeca_class_subjects').insert({class_id:classId, subject:String(subject).trim(), sort_order:0, hidden:false, active:true}).select('id,class_id,subject').single(), null);
      classSubject=inserted;
      if(classSubject) State.data.classSubjects=[...(State.data.classSubjects||[]), classSubject];
    }
    let classUnitId=null;
    if(classSubject?.id){
      const unitTitle=String(unit||'Unidad 1').trim() || 'Unidad 1';
      let classUnit=(State.data.classUnits||[]).find(u=>String(u.class_subject_id)===String(classSubject.id) && String(u.title||'').trim().toLowerCase()===unitTitle.toLowerCase());
      if(!classUnit){
        const insertedUnit=await maybe(table('tribeca_class_units').insert({class_subject_id:classSubject.id, title:unitTitle, sort_order:0, hidden:false, active:true}).select('id,class_subject_id,title').single(), null);
        classUnit=insertedUnit;
        if(classUnit) State.data.classUnits=[...(State.data.classUnits||[]), classUnit];
      }
      classUnitId=classUnit?.id || null;
    }
    return {classSubjectId:classSubject?.id || null, classUnitId};
  }
  function newPublicationContent() {
    const edit = State.pendingPublicationEdit || null;
    const item = edit?.item || {};
    const editing = !!edit?.id;
    const kind = editing ? (edit.kind || (edit.table === 'announcements' ? 'announcement' : normalizeMaterialKind(item.material_type || item.type))) : (State.prefillPublicationKind || 'material');
    const subjectValue = State.prefillPublicationSubject || item.subject || '';
    const dynamic = (State.data.subjects || []).map(s => s.subject).filter(Boolean);
    const classDynamic = (State.data.classSubjects || []).map(s => s.subject).filter(Boolean);
    const allSubjects = [...new Set(Object.values(subjectCatalog).flat().concat(dynamic, classDynamic, ['Apoyo personalizado','Tutoría', subjectValue].filter(Boolean)))].sort((a,b)=>a.localeCompare(b,'es'));
    const unitValue = State.prefillPublicationUnit || item.unit_title || item.unit || '';
    const attachments = normalizeAttachments(item);
    const attachmentsJson = JSON.stringify(attachments).replace(/"/g, '&quot;');
    const typeCard = (value, icon, title, desc) => `<label><input type="radio" name="publicationKind" value="${value}" ${normalizeMaterialKind(kind)===normalizeMaterialKind(value)?'checked':''}><span>${icon} ${title}<small>${desc}</small></span></label>`;
    const embedUrl = item.embed_url || item.interactive_url || item.game_url || '';
    const embedCode = item.embed_code || item.interactive_embed || item.game_embed || '';
    return `<form id="t16PublicationForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="t18-publication-wizard t94-publication-wizard">
      <input type="hidden" name="editId" value="${safe(edit?.id||'')}">
      <input type="hidden" name="editTable" value="${safe(edit?.table||'')}">
      <section class="window-panel t18-publish-main">
        <h3>${editing?'Editar publicación':'1. Contenido'}</h3>
        ${editing?'<p class="meta">Estás modificando una publicación existente. Al guardar no se creará una copia duplicada.</p>':''}
        <div class="t18-type-cards">${typeCard('material','📄','Material','Apuntes, boletín, documento o recurso.')}${typeCard('task','✅','Tarea o actividad','Actividad para trabajar en clase o en casa.')}${typeCard('video','🎥','Vídeo','Vídeo embebido de YouTube, Vimeo, Drive o URL directa.')}${typeCard('presentation','🖥️','Presentación','PowerPoint, Canva, Genially, Google Slides o HTML de diapositivas.')}${typeCard('schema','🧩','Esquema','Completar un esquema escribiendo o arrastrando conceptos.')}${typeCard('test','🧪','Test interactivo','Recurso evaluable o cuestionario embebido.')}${typeCard('exam','📝','Simulacro de examen','Examen autocorregible con resultado sobre 10.')}${typeCard('game','🎮','Juego','Actividad lúdica creada con IA o enlace externo.')}${typeCard('announcement','📣','Anuncio','Aviso general, fuera de una materia.')}</div>
        ${publicationClassroomSelector(item)}
        <div class="window-grid">
          <label>Materia<select name="subject"><option value="">Sin materia</option>${allSubjects.map(s=>`<option value="${safe(s)}" ${selectedAttr(s,subjectValue)}>${safe(s)}</option>`).join('')}</select></label>
          <label>Unidad didáctica<input name="unit" placeholder="Unidad 1" value="${safe(unitValue)}"></label>
        </div>
        <label>Título<input name="title" class="title-input" maxlength="120" required placeholder="Título claro de la publicación" value="${safe(item.title||'')}"></label>
        <label>Indicaciones para el alumnado<textarea name="body" rows="6" maxlength="1800" placeholder="Explica qué debe hacer el alumnado, qué debe leer o cómo debe usar el recurso.">${safe(item.body||item.description||item.content||item.text||'')}</textarea></label>
        <div class="t16-emoji-row">${['😀','🙂','👏','💡','⭐','📌','📚','🧠','🎯','🏅','✅','🔥','⚠️','📝','🔗'].map(e=>`<button type="button" data-t16-emoji="${e}">${e}</button>`).join('')}</div>
        <div class="window-grid"><label>Tamaño de texto<select name="fontSize">${[15,16,18,20,22].map(n=>`<option ${Number(item.font_size||16)===n?'selected':''}>${n}</option>`).join('')}</select></label><label>Enlace externo<input name="linkUrl" type="url" placeholder="https://..." value="${safe(item.link_url||item.url||'')}"></label></div>
      </section>
      <section class="window-panel publication-files-panel publication-files-panel-v94">
        <h3>2. Archivos y recursos interactivos</h3>
        <p class="meta">Adjunta documentos o inserta un esquema, test, vídeo o juego interactivo. Los esquemas en JSON de Tribeca Aula se corrigen automáticamente.</p>
        <div class="publication-upload-grid">
          <label class="publication-upload-card">
            <strong>Imagen de portada</strong>
            <small>Se verá dentro de la publicación.</small>
            <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp">
            <input type="hidden" name="imageUrl" value="${safe(item.image_url||'')}">
            <span id="t16ImagePreview" class="t16-image-preview">${item.image_url?`<img src="${safe(item.image_url)}" alt="">`:'Sin imagen seleccionada'}</span>
          </label>
          <label class="publication-upload-card">
            <strong>Archivos adjuntos</strong>
            <small>PDF, Word, imágenes, HTML o ZIP.</small>
            <input name="attachmentFiles" type="file" accept=".pdf,.doc,.docx,.html,.htm,.zip,.js,.css,image/png,image/jpeg,image/webp" multiple>
            <input type="hidden" name="attachmentsJson" value="${attachmentsJson}">
            <span class="attachment-preview-pill" id="attachmentPreview">${attachments.length?attachments.map(a=>safe(a.name||a.filename||'Archivo adjunto')).join(', '):'Ningún archivo seleccionado.'}</span>
          </label>
        </div>
        <div class="interactive-embed-panel interactive-embed-panel-v99">
          <h4>Recurso embebido: presentación, esquema, vídeo, test o juego</h4>
          <p class="meta">Para presentaciones, pega un iframe de Canva/PowerPoint/Google Slides/Genially o una URL embebible. Para esquemas, sube un JSON de tipo tribeca-activity. Para vídeos, pega la URL de YouTube, Vimeo, Google Drive, Streamable o un iframe. Para tests, sube JSON o HTML.</p>
          <label class="publication-upload-card interactive-file-card">
            <strong>Subir recurso interactivo</strong>
            <small>JSON, HTML, HTM o TXT. El JSON es la opción más limpia para esquemas, tests y simulacros.</small>
            <input name="interactiveFile" type="file" accept=".json,.html,.htm,.txt,application/json,text/html,text/plain">
            <span class="attachment-preview-pill" id="interactiveFilePreview">Ningún recurso interactivo seleccionado.</span>
          </label>
          <div class="window-grid">
            <label>URL embebible<input name="embedUrl" type="url" placeholder="https://www.canva.com/.../view?embed · https://docs.google.com/presentation/.../embed · https://..." value="${safe(embedUrl)}"></label>
            <label>Alto orientativo<input name="embedHeight" type="number" min="280" max="1600" value="${safe(item.embed_height||620)}"></label>
          </div>
          <label>Código HTML, JSON, iframe, presentación o vídeo<textarea name="embedCode" rows="7" maxlength="500000" placeholder="Pega JSON, HTML completo, iframe de Canva/PowerPoint/Slides/Genially, iframe de vídeo o etiqueta video.">${safe(embedCode)}</textarea></label>
          <p class="meta">Si eliges Presentación, se verá como visor de diapositivas dentro de la materia. Si eliges Esquema, se mostrará como actividad autocorregible. Si eliges Vídeo, se mostrará embebido. Si subes o pegas JSON de preguntas, Tribeca Aula puede convertirlo en test o simulacro nativo.</p>
        </div>
      </section>
      <section class="window-panel publication-schedule-panel-v173">
        <label class="compact-check schedule-publication-check-v173"><input type="checkbox" name="schedulePublication" ${item.scheduled_at?'checked':''}> <span>Programar esta publicación</span></label>
        <label class="schedule-date-field-v173"><span>Fecha y hora de publicación</span><input name="scheduledAt" type="datetime-local" value="${safe(item.scheduled_at?String(item.scheduled_at).slice(0,16):'')}"><small>Por defecto se publica inmediatamente. Si programas fecha y hora, el alumnado no la verá hasta ese momento.</small></label>
      </section>
      <footer class="publish-sticky-footer"><button class="primary-btn" type="submit">${editing?'Guardar cambios':(item.scheduled_at?'Guardar programación':'Publicar ahora')}</button>${editing?'<button class="secondary-btn" type="button" data-t32-cancel-publication-edit>Cancelar edición</button>':''}</footer>
    </form>`;
  }

  async function autoSaveMaterialPayloadToRepository(payload={}, sourceId=null){
    if(!roleTeacher()) return false;
    try {
      const repositoryPayload={
        source_material_id:sourceId || null,
        title:payload.title || 'Material sin título',
        body:payload.body || payload.description || payload.content || '',
        description:payload.description || payload.body || payload.content || '',
        content:payload.content || payload.body || payload.description || '',
        image_url:payload.image_url || null,
        link_url:payload.link_url || null,
        font_size:Number(payload.font_size||16),
        center:String(payload.center||'').trim() || null,
        stage:String(payload.stage||'').trim() || null,
        course:String(payload.course||'').trim() || null,
        subject:payload.subject || 'Apoyo personalizado',
        unit_title:payload.unit_title || payload.unit || 'Unidad 1',
        unit:payload.unit || payload.unit_title || 'Unidad 1',
        material_type:payload.material_type || payload.type || 'material',
        attachments:normalizeAttachments(payload),
        created_by:State.profile.id,
        active:true,
        notes:'Guardado automáticamente al publicar o modificar el material.'
      };
      let existing=[];
      if(sourceId) existing = await maybe(table('teacher_material_repository').select('id').eq('source_material_id',sourceId).limit(1), []);
      if(existing?.[0]?.id) await persistSupabaseRecord('teacher_material_repository', repositoryPayload, existing[0].id);
      else await persistSupabaseRecord('teacher_material_repository', repositoryPayload, null);
      await log('repository','Material guardado automáticamente en repositorio',{title:repositoryPayload.title,subject:repositoryPayload.subject,center:repositoryPayload.center,stage:repositoryPayload.stage,course:repositoryPayload.course});
      return true;
    } catch(error) {
      console.warn('[Tribeca Aula] No se pudo guardar automáticamente en el repositorio docente:', error);
      return false;
    }
  }

  async function savePublication(form) {
    const fd=new FormData(form);
    const rawKind=fd.get('publicationKind');
    const kind=normalizeMaterialKind(rawKind);
    const editId=String(fd.get('editId')||'').trim();
    const editTable=String(fd.get('editTable')||'').trim();
    const classId=String(fd.get('classId')||'').trim();
    const selectedClass=classId ? (State.data.classrooms||[]).find(c=>String(c.id)===String(classId)) : null;
    const isAnnouncement = kind === 'announcement' || editTable === 'announcements';
    const wantsSchedule = !!fd.get('schedulePublication');
    const scheduledRaw = String(fd.get('scheduledAt') || '').trim();
    const scheduledAt = wantsSchedule && scheduledRaw ? new Date(scheduledRaw).toISOString() : null;
    const isScheduledForFuture = !!(scheduledAt && Date.parse(scheduledAt) > Date.now());
    const hasClassModel = (State.data.classrooms||[]).some(c=>c && c.active!==false);
    if(!isAnnouncement && hasClassModel && !classId) throw new Error('Selecciona una clase antes de publicar materiales.');
    const scope = classId ? 'class' : 'all';
    const rec={
      title:fd.get('title'),
      body:fd.get('body')||'',
      description:fd.get('body')||'',
      content:fd.get('body')||'',
      image_url:fd.get('imageUrl')||null,
      link_url:fd.get('linkUrl')||null,
      font_size:Number(fd.get('fontSize')||16),
      target_scope:scope,
      target_user_ids:[],
      target_class_ids: classId ? [classId] : [],
      center:selectedClass?.center || null,
      stage:selectedClass?.stage || null,
      course:selectedClass?.course || null,
      created_by:State.profile.id,
      hidden:false,
      scheduled_at: scheduledAt
    };
    let attachments = [];
    try { attachments = JSON.parse(fd.get('attachmentsJson')||'[]'); } catch(_e) { attachments = []; }
    const tableName = isAnnouncement ? 'announcements' : 'subject_materials';
    const subject=fd.get('subject')||'Apoyo personalizado';
    const unit=fd.get('unit')||'Unidad 1';
    const payload = isAnnouncement
      ? {...rec, announcement_type:'announcement', attachments}
      : {...rec, subject, unit_title:unit, unit, material_type:dbMaterialType(kind), badge_codes:[], attachments, embed_url:String(fd.get('embedUrl')||'').trim()||null, embed_code:String(fd.get('embedCode')||'').trim()||null, embed_height:Number(fd.get('embedHeight')||520)};
    let linked={classSubjectId:null, classUnitId:null};
    if(!isAnnouncement && classId){
      linked=await ensureClassSubjectAndUnit(classId, subject, unit);
      payload.class_id=classId;
      payload.class_subject_id=linked.classSubjectId;
      payload.class_unit_id=linked.classUnitId;
    }
    if(editId) { delete payload.created_by; delete payload.hidden; }
    await persistSupabaseRecord(tableName, payload, editId || null);
    await log('publication', editId?'Publicación modificada':'Nueva publicación',{title:rec.title, kind, table:tableName, class_id:classId||null});
    if(!editId && !isScheduledForFuture){
      await tribecaDispatchPushNotification(isAnnouncement ? 'announcement' : 'material', {
        title: isAnnouncement ? `Nuevo anuncio: ${rec.title || 'Tribeca Aula'}` : `Material nuevo: ${rec.title || 'Tribeca Aula'}`,
        body: String(rec.body || '').slice(0, 180) || (isAnnouncement ? 'Hay un nuevo anuncio en Tribeca Aula.' : `${subject || 'Materia'} · ${unit || 'Unidad'}`),
        targetScope: payload.target_scope || scope,
        center: payload.center || null,
        stage: payload.stage || null,
        course: payload.course || null,
        classId: classId || null,
        classIds: classId ? [classId] : [],
        targetClassIds: classId ? [classId] : [],
        materialId: isAnnouncement ? null : null,
        section: isAnnouncement ? 'announcements' : (linked.classSubjectId ? 'classSubjectDetail' : 'subjects'),
        opts: isAnnouncement ? {} : (linked.classSubjectId ? {classSubjectId:linked.classSubjectId, classId:classId, subject} : {})
      });
    }
    State.pendingPublicationEdit=null; State.prefillPublicationSubject=null; State.prefillPublicationUnit=null; State.prefillPublicationClassId=null; State.prefillPublicationClassSubjectId=null; State.prefillPublicationClassUnitId=null; State.prefillPublicationKind=null;
    await loadData(true);
    toast(isScheduledForFuture ? 'Publicación programada correctamente.' : (isAnnouncement ? (editId?'Anuncio modificado.':'Anuncio publicado.') : (editId?'Material modificado.':'Material publicado en la clase.')));
    form.reset();
    rerender();
  }

  function eventColorType(e){ return e.event_type || e.type || 'personal'; }
  function isClosedEvent(e){ const t=eventColorType(e); return ['national','galicia','local','closed'].includes(t) || /no abre|cerrad/i.test(String(e.body||e.description||e.title||'')); }
  function calendarGrid() {
    const month=State.calendarMonth; const first=startMonth(month); const start=addDays(first,-((first.getDay()+6)%7)); const events=relevantEvents(); const weekdays=['L','M','X','J','V','S','D'];
    let html=`<div class="t16-calendar-head"><button type="button" data-t16-cal-prev aria-label="Mes anterior">‹</button><button type="button" class="t40-calendar-month-button" data-t40-cal-jump title="Elegir una fecha concreta">${month.toLocaleDateString('es-ES',{month:'long',year:'numeric'})}</button><button type="button" data-t16-cal-next aria-label="Mes siguiente">›</button></div><div class="event-legend"><span><i class="event-national"></i>Nacional</span><span><i class="event-galicia"></i>Galicia</span><span><i class="event-local"></i>Corcubión</span><span><i class="event-school"></i>Escolar</span><span><i class="event-exam"></i>Examen</span><span><i class="event-delivery"></i>Entrega</span><span><i class="event-presentation"></i>Presentación</span><span><i class="event-excursion"></i>Excursión</span><span><i class="event-student_absence"></i>No asistencia</span><span><i class="event-personal"></i>Personal</span></div><div class="t16-calendar-grid">${weekdays.map(d=>`<div class="calendar-weekday">${d}</div>`).join('')}`;
    for(let i=0;i<42;i++){ const d=addDays(start,i); const iso=toIso(d); const evs=events.filter(e=>e.date===iso); html+=`<button type="button" class="calendar-day ${d.getMonth()!==month.getMonth()?'is-other':''} ${iso===todayIso()?'is-today':''} ${iso===State.selectedDate?'is-selected':''} ${evs.some(isClosedEvent)?'is-closed-day':''}" data-t16-day="${iso}"><span class="day-number">${d.getDate()}</span>${evs.slice(0,4).map(e=>`<span class="day-event-label"><i class="day-event-dot event-${safe(eventColorType(e))}"></i>${safe(e.title)}</span>`).join('')}</button>`; }
    return html+'</div>';
  }
  function calendarContent(forceCreate=false) {
    const events=relevantEvents();
    const selected=events.filter(e=>e.date===State.selectedDate);
    const todayStart=parseIso(todayIso());
    const upcomingLimit=addDays(todayStart,7);
    const upcoming=events.filter(e=>{ const d=parseIso(e.date); return d>=todayStart && d<=upcomingLimit; }).sort((a,b)=>parseIso(a.date)-parseIso(b.date));
    const edit=State.selectedEventId ? events.find(e=>e.id===State.selectedEventId) : null; const closed=selected.filter(isClosedEvent);
    return `<div class="t16-calendar-layout premium-calendar calendar-clean-v107"><section class="window-panel calendar-main-panel">${calendarGrid()}</section><section class="window-panel calendar-side-panel">${closed.length?`<div class="closed-alert"><strong>Tribeca Academia no abre este día</strong><p>${closed.map(e=>safe(e.title)).join(' · ')}</p></div>`:''}<h3>Eventos del día · ${fmtDate(State.selectedDate)}</h3><div class="item-list">${selected.length?selected.map(e=>eventCard(e)).join(''):'<div class="empty-state">No hay eventos este día.</div>'}</div><details class="teacher-option-drawer calendar-form-drawer" ${forceCreate||edit?'open':''}><summary><span>${edit?'Editar fecha':'Añadir fecha'}</span><em>${safe(State.selectedDate)}</em></summary>${eventForm(edit)}</details></section><section class="window-panel upcoming-panel"><h3>Próximas fechas <span class="meta">7 días</span></h3><div class="item-list">${upcoming.map(e=>`<article class="list-item event-${safe(eventColorType(e))}" data-t16-event="${safe(e.id)}"><strong>${fmtDate(e.date)} · ${safe(e.title)}</strong><p>${safe(e.body||e.description||'')}</p><small>${safe(eventLabel(e))}</small></article>`).join('')||'<div class="empty-state">Sin próximas fechas en los próximos 7 días.</div>'}</div></section></div>`;
  }
  function eventLabel(e){ const t=eventColorType(e); return ({national:'Nacional',galicia:'Galicia',corcubion:'Corcubión',local:'Local',school:'Escolar',exam:'Examen',delivery:'Entrega de trabajo',presentation:'Presentación',excursion:'Excursión',personal:'Personal',teacher:'Profesora',closed:'Tribeca cerrado',class:'Grupo-clase',student_absence:'No asistiré este día a clases','school-proposal':'Escolar'}[t] || t || 'Evento'); }
  function eventCard(e){ const actions=canEditEvent(e)?`<div class="inline-actions"><button type="button" data-t16-event="${safe(e.id)}">Editar</button><button type="button" data-t16-hide-event="${safe(e.id)}">${e.hidden?'Mostrar':'Ocultar'}</button><button type="button" data-t16-delete-event="${safe(e.id)}">Eliminar</button></div>`:''; return `<article class="list-item event-${safe(eventColorType(e))}"><strong>${safe(e.title)}</strong><p>${safe(e.body||e.description||'')}</p><small>${safe(calendarEventVisibilityLabel(e))} · Añadido por ${safe(e.author_name||e.created_by_name||studentName(e.created_by)||'Tribeca Aula')}</small>${actions}</article>`; }
  function eventDefaultTitle(type='personal'){
    return ({exam:'Examen',delivery:'Entrega de trabajo',presentation:'Presentación',excursion:'Excursión',student_absence:'No asistiré este día a clases',personal:'Evento personal',class:'Evento de grupo',teacher:'Profesora',closed:'Tribeca cerrado',school:'Escolar'}[String(type||'personal')] || 'Evento');
  }
  function eventScopeIsChecked(e={}, value=''){
    e = e && typeof e === 'object' ? e : {};
    const scope=e?.scope || e?.target_scope || '';
    if(value==='classes') return ['classes','class_ids','classrooms'].includes(scope) || (scope==='class' && targetClassIds(e).length>0);
    if(value==='user') return ['user','personal','private'].includes(scope);
    return scope===value;
  }
  function calendarClassSelector(e=null, can=true){
    const classes=(State.data.classrooms||[]).filter(c=>c && c.active!==false && !c.hidden).sort((a,b)=>String(a.center||'').localeCompare(String(b.center||''),'es') || String(a.course||'').localeCompare(String(b.course||''),'es',{numeric:true}) || String(classroomLabel(a)||'').localeCompare(String(classroomLabel(b)||''),'es'));
    const selected=new Set(targetClassIds(e));
    const showClasses = eventScopeIsChecked(e,'classes');
    const hiddenAttr = showClasses ? '' : ' hidden';
    const disabled=can?'':'disabled';
    if(!classes.length) return `<div class="calendar-class-targets-v163 is-empty" data-calendar-class-targets${hiddenAttr}><p class="meta">Aún no hay clases activas para seleccionar.</p></div>`;
    return `<div class="calendar-class-targets-v163" data-calendar-class-targets${hiddenAttr}><p class="meta">Marca una o varias clases. Solo el alumnado asignado a esas clases verá la fecha y recibirá el aviso de la app.</p><div class="calendar-class-grid-v163">${classes.map(c=>`<label><input type="checkbox" name="targetClassIds" value="${safe(c.id)}" ${selected.has(String(c.id))?'checked':''} ${disabled}><span><strong>${safe(classroomLabel(c))}</strong><small>${safe([c.center,c.stage,c.course].filter(Boolean).join(' · '))}</small></span></label>`).join('')}</div></div>`;
  }
  function calendarEventVisibilityLabel(e={}){
    e = e && typeof e === 'object' ? e : {};
    const scope=e.scope||e.target_scope||'all';
    if(['user','personal','private'].includes(scope)) return 'Solo para mí';
    if(['classes','class_ids','classrooms'].includes(scope) || (scope==='class' && targetClassIds(e).length)){
      const labels=targetClassIds(e).map(id=>classroomLabel(classById(id)||{})).filter(Boolean);
      return labels.length ? `Visible para: ${labels.join(', ')}` : 'Visible por clases';
    }
    if(scope==='class') return [e.center,e.stage,e.course].filter(Boolean).join(' · ') || 'Grupo-clase';
    if(scope==='all') return 'Visible para todo el alumnado';
    return eventLabel(e);
  }
  function eventForm(e=null){
    const can=!e||canEditEvent(e);
    const teacher = roleTeacher();
    const typeOptions = teacher
      ? [['teacher','Profesora'],['closed','Tribeca cerrado'],['personal','Personal'],['class','Clase'],['exam','Examen'],['delivery','Entrega'],['presentation','Presentación'],['excursion','Excursión'],['school','Escolar']]
      : [['exam','Examen'],['delivery','Entrega de trabajo'],['presentation','Presentación'],['excursion','Excursión'],['student_absence','No asistiré este día a clases']];
    const scopeOptions = teacher
      ? [['user','Solo para mí'],['all','Todo el alumnado'],['classes','Por clases concretas']]
      : [['user','solo para mí'],['class','toda mi clase']];
    const currentType = e?.event_type || e?.type || (teacher ? 'teacher' : 'exam');
    const currentScope = e?.scope || e?.target_scope || (teacher ? 'user' : (currentType==='student_absence'?'user':'user'));
    const titleRequired = teacher ? 'required' : '';
    return `<form id="t16EventForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid premium-event-form event-form-v112 event-form-v163"><input type="hidden" name="id" value="${safe(e?.id||'')}"><label>Fecha<input name="eventDate" type="date" value="${safe(e?.date||State.selectedDate)}" required ${can?'':'disabled'}></label><div class="window-grid"><label>Tipo de evento<select name="eventType" ${can?'':'disabled'}>${typeOptions.map(([v,l])=>`<option value="${v}" ${currentType===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Visibilidad<select name="scope" data-calendar-scope-select ${can?'':'disabled'}>${scopeOptions.map(([v,l])=>`<option value="${v}" ${(currentScope===v || (v==='classes' && eventScopeIsChecked(e,'classes')))?'selected':''}>${l}</option>`).join('')}</select></label></div>${teacher?calendarClassSelector(e,can):''}<label>Título${teacher?'':' opcional'}<input name="title" value="${safe(e?.title||'')}" placeholder="${safe(eventDefaultTitle(currentType))}" ${titleRequired} ${can?'':'disabled'}></label><label>Descripción<textarea name="body" rows="3" placeholder="Añade detalles si lo necesitas" ${can?'':'disabled'}>${safe(e?.body||e?.description||'')}</textarea></label><p class="form-status is-info event-student-note" data-t121-event-status>${teacher?'Elige si la fecha será privada, visible para todo el alumnado o visible solo para una o varias clases. Las fechas privadas no generan notificación al alumnado.':'El tipo “No asistiré este día a clases” se guarda como evento personal y envía una notificación de la app a la profesora si la tiene activada.'}</p><button class="primary-btn" type="button" data-t25-save-event onclick="return window.TribecaSaveCalendarEventDirect(this,event)" ${can?'':'disabled'}>${e?'Guardar cambios':'Añadir evento'}</button></form>`;
  }

  async function triggerEmailOutboxSend(eventType=''){
    try {
      if(!State.client?.functions?.invoke) return null;
      const cleanType = String(eventType || '').trim();
      const body = cleanType ? { event_type: cleanType } : {};
      const res = await State.client.functions.invoke('tribeca-send-email-outbox', { body });
      if(res?.error) throw res.error;
      return res?.data || null;
    } catch(error) {
      console.warn('[Tribeca Aula] La cola de email se ha preparado, pero no se pudo activar el envío inmediato:', error);
      return null;
    }
  }

  async function queueCalendarEmailNotification(_rec, _isUpdate=false){
    return 0;
  }

  async function queueTeacherMessageEmailNotification(_payload){
    return 0;
  }

  function calendarEventPayloadFromForm(form){
    const fd=new FormData(form);
    const id=String(fd.get('id')||'').trim();
    const type=String(fd.get('eventType')||'personal').trim() || 'personal';
    const rawScope = fd.get('scope') || (roleTeacher() ? 'user' : 'user');
    const classIds=[...new Set(fd.getAll('targetClassIds').map(String).map(x=>x.trim()).filter(Boolean))];
    let scope;
    if(roleTeacher()) scope = type==='closed' ? 'all' : String(rawScope||'user');
    else scope = type==='student_absence' ? 'user' : (rawScope==='class'?'class':'user');
    if(scope==='classes' && !classIds.length) throw new Error('Selecciona al menos una clase o cambia la visibilidad.');
    const title=String(fd.get('title')||'').trim() || eventDefaultTitle(type);
    const body=String(fd.get('body')||'').trim() || (type==='student_absence'?'Aviso creado por el alumnado: no asistirá este día a clases.':'');
    const event_date=String(fd.get('eventDate')||'').slice(0,10);
    const firstClass = classIds.length ? classById(classIds[0]) : null;
    const personalScope = ['user','personal','private'].includes(scope);
    const payload={
      id:id||null,
      event_date,
      title,
      body,
      event_type:type,
      scope,
      center: scope==='class' ? State.profile.center : (firstClass?.center || (scope==='all'?State.profile.center:null)),
      stage: scope==='class' ? State.profile.stage : (firstClass?.stage || (scope==='all'?State.profile.stage:null)),
      course: scope==='class' ? State.profile.course : (firstClass?.course || (scope==='all'?State.profile.course:null)),
      target_class_ids: classIds,
      created_by:State.profile.id,
      user_id: personalScope ? State.profile.id : null,
      target_user_ids:[],
      hidden:false
    };
    return payload;
  }
  async function saveCalendarEventViaRpcOrTable(rec){
    const classIds = parseArrayField(rec.target_class_ids || []);
    const useDirect = ['classes','class_ids','classrooms'].includes(rec.scope || rec.target_scope || '') || classIds.length > 0;
    const directSave = async(fallbackError=null)=>{
      const row={...rec};
      delete row.id;
      if(rec.id){
        delete row.created_by;
        const direct=await table('calendar_events').update(row).eq('id', rec.id);
        if(direct.error) throw fallbackError || direct.error;
        return direct;
      }
      const direct=await table('calendar_events').insert(row);
      if(direct.error) throw fallbackError || direct.error;
      return direct;
    };
    if(useDirect) return await directSave();
    const rpc=await State.client.rpc('tribeca_save_calendar_event_v27',{p_payload:rec});
    if(!rpc?.error) return rpc;
    console.warn('[Tribeca Aula] RPC calendario falló, se intenta guardado directo:', rpc.error?.message || rpc.error);
    return await directSave(rpc.error);
  }
  async function saveEvent(form){
    const btn = form?.querySelector?.('[data-t25-save-event], [type="submit"]');
    const status = form?.querySelector?.('[data-t121-event-status]') || form?.querySelector?.('.event-student-note');
    const setStatus=(msg,kind='info')=>{
      if(status){
        status.textContent=msg||'';
        status.classList.remove('is-ok','is-error','is-info');
        if(msg) status.classList.add(kind==='ok'?'is-ok':kind==='error'?'is-error':'is-info');
      }
    };
    if(!form) return;
    if(form.dataset.t121Saving==='1') return;
    form.dataset.t121Saving='1';
    if(btn){ btn.disabled=true; btn.dataset.originalText=btn.textContent; btn.textContent='Guardando…'; }
    try{
      const rec=calendarEventPayloadFromForm(form);
      if(!rec.event_date || !rec.title) throw new Error('Completa la fecha y el título.');
      setStatus('Guardando evento…','info');
      await saveCalendarEventViaRpcOrTable(rec);
      await log('calendar', rec.id?'Fecha actualizada':'Fecha creada', {title:rec.title,date:rec.event_date});
      await queueCalendarEmailNotification(rec, !!rec.id);
      if(!rec.id){
        if(roleTeacher()){
          if(!['user','personal','private'].includes(rec.scope || rec.target_scope || '')){
            await tribecaDispatchPushNotification('calendar', {
              title: `Nueva fecha: ${rec.title}`,
              body: [rec.event_date, rec.body || 'Nueva fecha en el calendario de Tribeca Aula.'].filter(Boolean).join(' · '),
              targetScope: rec.scope || rec.target_scope || 'all',
              center: rec.center || null,
              stage: rec.stage || null,
              course: rec.course || null,
              classIds: rec.target_class_ids || [],
              targetClassIds: rec.target_class_ids || [],
              section: 'calendar'
            });
          }
        } else {
          await tribecaDispatchPushNotification('calendar', {
            title: `Aviso de calendario de ${displayName(State.profile)}`,
            body: [rec.event_date, rec.title, rec.body].filter(Boolean).join(' · '),
            targetRole: 'teacher',
            preferenceKey:'',
            section: 'calendar'
          });
        }
      }
      await loadData(true);
      State.selectedDate=rec.event_date;
      State.selectedEventId=null;
      toast(rec.id?'Fecha actualizada.':'Fecha creada.');
      setStatus(rec.id?'Fecha actualizada.':'Fecha creada.','ok');
      refreshCalendarAfterNavigation();
    } catch(e){
      console.error('[Tribeca Aula] No se pudo guardar el evento:', e);
      const msg = String(e?.message || e?.details || 'No se pudo guardar el evento.');
      const friendly = /event_type|calendar_events|tribeca_save_calendar_event_v27|violates check|constraint/i.test(msg)
        ? 'No se pudo guardar el evento. Ejecuta el SQL de la v121 en Supabase y vuelve a intentarlo.'
        : msg;
      setStatus(friendly,'error');
      toast(friendly);
    } finally {
      form.dataset.t121Saving='';
      if(btn){ btn.disabled=false; btn.textContent=btn.dataset.originalText || 'Añadir evento'; }
    }
  }

  function activityTypeClass(type=''){ const t=String(type||'').toLowerCase(); if(t.includes('login')) return 'activity-login'; if(t.includes('message')) return 'activity-message'; if(t.includes('publication')||t.includes('guidance')) return 'activity-publication'; if(t.includes('calendar')) return 'activity-calendar'; if(t.includes('badge')) return 'activity-badge'; if(t.includes('grade')) return 'activity-grade'; if(t.includes('difficulty')) return 'activity-difficulty'; if(t.includes('profile')) return 'activity-profile'; return 'activity-generic'; }
  function activityContent(){ return `<section class="window-panel"><h3>Registro de actividad retirado</h3><p class="meta">Este apartado se ha retirado del panel docente para simplificar la interfaz.</p></section>`; }
  function alertItemCard(a){
    const ignored=teacherAlertIgnored(a.key);
    return `<article class="list-item ${a.tone||''} ${ignored?'is-ignored-alert':''}"><strong>${safe(a.title)}</strong><p>${safe(a.body||'')}</p><label class="check-line ignore-alert-check"><input type="checkbox" data-t74-ignore-alert="${safe(a.key)}" ${ignored?'checked':''}> Ignorar alerta</label></article>`;
  }
  function alertsContent(){
    const items=teacherAlertItems();
    const groupsMap=new Map();
    items.forEach(a=>{ if(!groupsMap.has(a.group)) groupsMap.set(a.group, []); groupsMap.get(a.group).push(a); });
    const order=['Calificaciones bajas','Dificultades declaradas','Recuperación de contraseña','Mensualidades pendientes'];
    const sections=order.map(group=>{
      const rows=groupsMap.get(group)||[];
      let empty='Sin alertas en esta categoría.';
      if(group==='Calificaciones bajas') empty='Sin suspensos registrados.';
      if(group==='Dificultades declaradas') empty='Sin materias con dificultades.';
      if(group==='Recuperación de contraseña') empty='Sin solicitudes pendientes.';
      if(group==='Mensualidades pendientes') empty='Sin mensualidades vencidas pendientes.';
      return `<section class="window-panel alerts-panel"><h3>${safe(group)}</h3>${rows.length?rows.map(alertItemCard).join(''):`<div class="empty-state">${empty}</div>`}</section>`;
    }).join('');
    const active=items.filter(a=>!teacherAlertIgnored(a.key)).length;
    const ignored=items.length-active;
    return `<div class="alerts-summary window-panel"><h3>Alertas docentes</h3><p class="meta">${active} alerta${active===1?'':'s'} activa${active===1?'':'s'} · ${ignored} ignorada${ignored===1?'':'s'}. Marca “Ignorar alerta” para que no aparezca la notificación mientras la situación siga activa.</p></div><div class="window-grid alerts-grid">${sections}</div>`;
  }
  function fieldArray(value){ if(Array.isArray(value)) return value.filter(Boolean); if(!value) return []; if(typeof value==='string'){ try{ const parsed=JSON.parse(value); if(Array.isArray(parsed)) return parsed.filter(Boolean); }catch(_e){} return value.split(/[;,]/).map(x=>x.trim()).filter(Boolean); } return []; }
  function supportSummary(s){ const nee=fieldArray(s.nee_types); const neae=fieldArray(s.neae_types); const health=fieldArray(s.health_conditions); const flags=[]; if(s.personalized_attention) flags.push('Atención personalizada'); if(nee.length) flags.push(`${nee.length} NEE`); if(neae.length) flags.push(`${neae.length} NEAE`); if(health.length) flags.push(`${health.length} condición/es registradas`); return {nee,neae,health,flags}; }
  function classOverviewContent(){
    const students=State.data.students||[];
    const classes=(State.data.classrooms||[]).filter(c=>c.active!==false && !c.hidden);
    const gs=groups(students);
    const month=State.billingMonth||defaultBillingMonth();
    const totalDue=students.reduce((sum,s)=>sum+(paymentPausedForMonth(s.id,month)?0:Number(calculatePaymentAmount(s.id,month).amount||0)),0);
    const alerts=students.filter(s=>attemptAlertForStudent(s.id).tone==='danger' || pauseStatusText(s.id) || supportSummary(s).flags.length).length;
    return `<section class="class-overview-premium clean-overview overview-v144"><div class="overview-hero window-panel clean-hero"><div><p class="eyebrow">Vista docente</p><h3>Vista general del aula</h3><p class="meta">Resumen operativo de alumnado, clases, asistencia, pagos y actividad autocorregible.</p></div><div class="overview-kpis clean-kpis"><span><strong>${students.length}</strong> alumnado</span><span><strong>${classes.length}</strong> clases activas</span><span><strong>${alerts}</strong> seguimientos</span><span><strong>${money(totalDue)}</strong> previsto</span></div></div><div class="overview-action-grid-v144"><button type="button" data-t16-tool="studentProfiles">Perfiles</button><button type="button" data-t16-tool="attendance">Asistencia</button><button type="button" data-t16-tool="payments">Pagos</button><button type="button" data-t16-tool="activityAnalytics">Actividad</button><button type="button" data-t16-tool="teacherDocuments">PDF</button></div><div class="overview-group-grid clean-overview-grid">${gs.map((g,idx)=>{ const needCount=g.items.filter(s=>supportSummary(s).flags.length || pauseStatusText(s.id) || attemptAlertForStudent(s.id).tone==='danger').length; return `<details class="overview-group-card window-panel clean-group-card" ${idx===0?'open':''}><summary><div><h3>${safe(g.label)}</h3><p>${g.items.length} alumno/s · ${needCount} seguimiento/s</p></div><span>${g.items.length}</span></summary><div class="overview-student-list clean-student-list">${g.items.map(st=>{ const sup=supportSummary(st); const pause=pauseStatusText(st.id); const al=attemptAlertForStudent(st.id); const calc=calculatePaymentAmount(st.id,month); return `<div class="overview-student-row ${pause?'is-paused-row':''}"><div><strong>${safe(displayName(st))}</strong><small>${safe(st.username||'')} · ${safe(st.course||'')}${pause?' · EN PAUSA':''}</small></div><div class="overview-tags">${pause?`<em class="tag-pause">${safe(pause)}</em>`:''}<em class="tag-${safe(al.tone)}">${safe(al.label)}</em><em>${safe(money(calc.amount))}</em>${sup.flags.slice(0,2).map(f=>`<em class="tag-support">${safe(f)}</em>`).join('')}</div></div>`; }).join('')}</div></details>`; }).join('')||'<div class="empty-state">No hay alumnado cargado.</div>'}</div></section>`;
  }
  function assignBadgeContent(){
    const students=State.data.students||[]; const grouped=groups(students);
    const firstBadge = badges[0] || {icon:'🏅', name:'Insignia'};
    return `<section class="assign-badge-premium t32-assign-badge"><div class="assign-badge-header window-panel"><div><p class="eyebrow">Reconocimiento docente</p><h3>Asignar insignia manualmente</h3><p class="meta">Elige una insignia, busca alumnado y abre solo el grupo que necesites.</p></div><span class="t35-badge-symbol">🏅</span></div><form id="t16AssignBadgeForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="window-panel assign-badge-form t35-badge-form t32-badge-form"><aside class="t32-assign-sidebar"><div class="t32-step"><span>1</span><strong>Insignia</strong></div><label>Insignia<select name="badgeCode" required>${badges.map(b=>`<option value="${b.code}">${b.icon} ${safe(b.name)}</option>`).join('')}</select></label><div class="t32-badge-preview"><span>${safe(firstBadge.icon)}</span><div><strong>Reconocimiento manual</strong><small>Se guardará en el perfil del alumnado seleccionado.</small></div></div><div class="t32-step"><span>2</span><strong>Búsqueda</strong></div><label>Filtrar alumnado<input class="t16-search" type="search" placeholder="Filtrar por nombre, usuario, centro, etapa o curso..." data-t16-student-search></label><div class="t32-badge-toolbar"><button type="button" class="secondary-btn" data-t32-select-visible>Marcar visibles</button><button type="button" class="secondary-btn" data-t32-clear-all>Desmarcar todo</button></div><p class="t35-counter">${students.length} perfiles disponibles · ${grouped.length} grupos</p></aside><main class="t32-assign-main"><div class="t32-step"><span>3</span><strong>Alumnado</strong></div><div class="t35-badge-groups t32-badge-groups">${grouped.map((g,idx)=>`<details class="t35-badge-group t32-badge-group teacher-option-drawer"><summary><strong>${safe(g.label)}</strong><span>${g.items.length}</span></summary><div class="t32-group-tools"><button type="button" data-t32-select-group="${idx}">Seleccionar este grupo</button><button type="button" data-t32-clear-group="${idx}">Limpiar grupo</button></div><div class="t35-badge-student-grid t32-badge-student-grid">${g.items.map(st=>`<label class="t35-badge-student t32-badge-student" data-student-name="${safe((displayName(st)+' '+(st.username||'')+' '+academicLine(st)).toLowerCase())}"><input type="checkbox" name="userIds" value="${safe(st.id)}"><span class="t32-student-avatar">${safe((displayName(st)||'?').slice(0,1).toUpperCase())}</span><span class="t32-student-copy"><strong>${safe(displayName(st))}</strong><small>${safe(st.username||'')} · ${safe(st.center||'Sin centro')} · ${safe(st.course||'Sin curso')}</small></span></label>`).join('')}</div></details>`).join('')}</div></main><footer class="t32-assign-footer"><button class="primary-btn t35-assign-submit" type="submit">Asignar insignia</button></footer></form></section>`;
  }
  async function saveUserBadgesWithoutDuplicates(rows){
    if(!rows.length) return { inserted:0, skipped:0 };
    const code = rows[0].badge_code;
    const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
    const existing = await maybe(table('user_badges').select('user_id,badge_code').eq('badge_code', code).in('user_id', ids), []);
    const existingIds = new Set((existing || []).map(x => x.user_id));
    const pending = rows.filter(r => !existingIds.has(r.user_id));
    if(!pending.length) return { inserted:0, skipped:ids.length };
    const { error } = await table('user_badges').upsert(pending, { onConflict:'user_id,badge_code', ignoreDuplicates:true });
    if(error && /duplicate|user_badges_user_id_badge_code_key/i.test(`${error.message||''} ${error.details||''}`)) {
      let inserted = 0;
      for(const row of pending){
        const res = await table('user_badges').insert(row);
        if(!res.error) inserted += 1;
      }
      return { inserted, skipped:ids.length - inserted };
    }
    if(error) throw error;
    return { inserted:pending.length, skipped:ids.length - pending.length };
  }
  async function assignBadge(form){
    const fd=new FormData(form);
    const ids=[...new Set(fd.getAll('userIds').filter(Boolean))];
    if(!ids.length) return toast('Selecciona al menos un alumno.');
    const code=fd.get('badgeCode');
    const rows=ids.map(user_id=>({user_id,badge_code:code,badge_name:badgeName(code),assigned_by:State.profile.id}));
    const result=await saveUserBadgesWithoutDuplicates(rows);
    await log('badge','Insignia asignada',{code, count:result.inserted, skipped:result.skipped});
    await loadData(true);
    if(result.inserted && result.skipped) toast(`Insignia asignada a ${result.inserted} alumno(s). ${result.skipped} ya la tenían.`);
    else if(result.inserted) toast(`Insignia asignada a ${result.inserted} alumno(s).`);
    else toast('La insignia ya estaba asignada al alumnado seleccionado.');
    rerender();
  }
  async function resolveClaim(id, ok){ const claim=(State.data.badgeClaims||[]).find(c=>c.id===id); if(!claim) return; await maybe(table('badge_claim_requests').update({status:ok?'approved':'rejected', resolved_at:new Date().toISOString(), resolved_by:State.profile.id}).eq('id',id)); if(ok) await saveUserBadgesWithoutDuplicates([{user_id:claim.user_id,badge_code:claim.badge_code,badge_name:badgeName(claim.badge_code),assigned_by:State.profile.id}]); await loadData(true); toast(ok?'Insignia aprobada.':'Solicitud rechazada.'); rerender(); }

  function materialById(id){ return (State.data.materials||[]).find(m=>String(m.id)===String(id)) || {}; }
  function attemptRowsForStudent(userId=''){
    return (State.data.examAttempts||[]).filter(a=>!userId || String(a.user_id)===String(userId)).sort((a,b)=>String(b.completed_at||b.created_at||'').localeCompare(String(a.completed_at||a.created_at||'')));
  }
  function attemptAlertForStudent(userId=''){
    const rows=attemptRowsForStudent(userId);
    if(!rows.length) return {tone:'muted', label:'Sin intentos', detail:'Todavía no ha realizado actividades autocorregibles.'};
    const byMat=new Map(); rows.forEach(a=>{ const k=String(a.material_id||a.title||''); if(!byMat.has(k)) byMat.set(k, []); byMat.get(k).push(a); });
    let alerts=[];
    byMat.forEach((items,k)=>{ const sorted=items.slice().sort((a,b)=>String(a.completed_at||'').localeCompare(String(b.completed_at||''))); const last=sorted[sorted.length-1]; const scores=sorted.map(x=>Number(x.score||0)); const lastScore=Number(last?.score||0); const best=Math.max(...scores); if(lastScore<5) alerts.push('última nota baja'); if(sorted.length>=3 && best<6) alerts.push('repite sin consolidar'); if(sorted.length>=3 && scores[scores.length-1] <= scores[0]) alerts.push('sin mejora clara'); });
    if(alerts.length) return {tone:'danger', label:'Revisar', detail:[...new Set(alerts)].join(' · ')};
    const avg=rows.reduce((s,a)=>s+Number(a.score||0),0)/rows.length;
    return avg>=7 ? {tone:'ok', label:'Buen progreso', detail:`Media ${avg.toFixed(2)}/10 en ${rows.length} intento(s).`} : {tone:'warn', label:'Seguimiento', detail:`Media ${avg.toFixed(2)}/10 en ${rows.length} intento(s).`};
  }
  function activityAnalyticsStudentCards(students=[]){
    const active=students.filter(s=>attemptRowsForStudent(s.id).length);
    if(!active.length) return '<div class="empty-state">Todavía no hay actividades autocorregibles realizadas.</div>';
    return `<div class="activity-student-card-grid-v145 activity-student-card-grid-v149">${active.map(s=>{ const rows=attemptRowsForStudent(s.id); const al=attemptAlertForStudent(s.id); const avg=rows.reduce((sum,a)=>sum+Number(a.score||0),0)/Math.max(1,rows.length); const unique=new Set(rows.map(a=>String(a.material_id||a.title||''))).size; return `<button type="button" class="activity-student-card-v145 activity-student-card-v149 is-${safe(al.tone)} ${State.selectedStudentId===s.id?'is-selected':''}" data-t16-select-student="${safe(s.id)}" data-student-name="${safe((displayName(s)+' '+(s.username||'')+' '+academicLine(s)).toLowerCase())}">${studentAvatarMarkup(s,'activity-student-avatar-v149')}<span class="activity-student-copy-v149"><span>${safe(displayName(s))}</span><small>${rows.length} intento${rows.length===1?'':'s'} · ${unique} actividad${unique===1?'':'es'}</small><em>${safe(al.label)} · ${safe(al.detail)}</em></span><strong>${avg.toFixed(2)}/10</strong></button>`; }).join('')}</div>`;
  }
  function attemptSubjectButton(a={}, mat={}){
    const subject=a.subject||mat.subject||'';
    if(mat.class_subject_id) return `<button type="button" class="linklike activity-nav-link" onclick="window.openTool && window.openTool('classSubjectDetail',{classSubjectId:'${safe(mat.class_subject_id)}',classId:'${safe(mat.class_id||'')}',subject:'${safe(subject)}'})">${safe(subject||'Materia')}</button>`;
    if(subject) return `<button type="button" class="linklike activity-nav-link" onclick="window.openTool && window.openTool('subjectDetail',{subject:'${safe(subject)}'})">${safe(subject)}</button>`;
    return 'Materia';
  }
  function attemptUnitButton(a={}, mat={}){
    const unit=a.unit_title||mat.unit_title||mat.unit||'';
    if(mat.class_subject_id) return `<button type="button" class="linklike activity-nav-link" onclick="window.openTool && window.openTool('classSubjectDetail',{classSubjectId:'${safe(mat.class_subject_id)}',classId:'${safe(mat.class_id||'')}',subject:'${safe(mat.subject||a.subject||'')}'})">${safe(unit||'Unidad')}</button>`;
    return safe(unit||'Unidad');
  }
  function activityAnalyticsContent(){
    const students=State.data.students||[];
    const activeStudents=students.filter(s=>attemptRowsForStudent(s.id).length);
    const selected=students.find(s=>s.id===State.selectedStudentId) || activeStudents[0] || students[0];
    if(!State.selectedStudentId && selected) State.selectedStudentId=selected.id;
    const all=State.data.examAttempts||[];
    const low=all.filter(a=>Number(a.score||0)<5).length;
    const repeated=[...new Set(all.map(a=>`${a.user_id}:${a.material_id}`).filter(Boolean))].filter(k=>{ const [u,m]=k.split(':'); return all.filter(a=>String(a.user_id)===u && String(a.material_id)===m).length>=3; }).length;
    const selectedRows=selected?attemptRowsForStudent(selected.id):[];
    return `<section class="activity-analytics-v144 activity-analytics-v145"><div class="window-panel clean-hero activity-hero-v144"><div><p class="eyebrow">Actividad autocorregible</p><h2>Seguimiento de intentos y calificaciones</h2><p>Los alumnos con actividad aparecen en primer plano para que el seguimiento sea evidente y rápido.</p></div><div class="overview-kpis clean-kpis"><span><strong>${all.length}</strong> intentos</span><span><strong>${activeStudents.length}</strong> alumnos activos</span><span><strong>${low}</strong> notas bajas</span><span><strong>${repeated}</strong> repeticiones</span></div></div><section class="window-panel activity-main-students-v145"><div class="section-heading"><h3>Alumnado con actividad</h3><span>${activeStudents.length}</span></div>${activityAnalyticsStudentCards(students)}</section><section class="window-panel activity-detail-v144 activity-detail-v145"><h3>${selected?`Detalle de ${safe(displayName(selected))}`:'Selecciona un alumno'}</h3>${selected?activityStudentAttemptsTable(selectedRows):'<div class="empty-state">Selecciona un alumno para ver su actividad.</div>'}</section></section>`;
  }
  function activityStudentAttemptsTable(rows=[]){
    if(!rows.length) return '<div class="empty-state">Este alumno todavía no tiene intentos guardados.</div>';
    return `<div class="activity-table-wrap-v145"><table class="premium-table activity-attempt-table activity-attempt-table-v148 activity-attempt-table-v163"><thead><tr><th>Fecha</th><th>Materia</th><th>Unidad</th><th>Actividad</th><th>Nota</th><th>Intento</th><th>PDF</th><th>Retroalimentación docente</th></tr></thead><tbody>${rows.map((a,idx)=>{ const mat=materialById(a.material_id); const same=rows.filter(x=>String(x.material_id||x.title)===String(a.material_id||a.title)); const attemptNo=same.slice().reverse().findIndex(x=>String(x.id||x.completed_at)===String(a.id||a.completed_at))+1 || (same.length-idx); const score=Number(a.score||0); const title=a.title||mat.title||'Actividad'; const ref=safe(a.id||''); const feedback=safe(a.teacher_feedback||''); const comment=safe(a.teacher_comment||''); return `<tr class="${score<=5?'is-low-score':''}"><td>${safe(fmtDT(a.completed_at||a.created_at||''))}</td><td>${attemptSubjectButton(a,mat)}</td><td>${attemptUnitButton(a,mat)}</td><td>${mat.id?`<button type="button" class="linklike activity-nav-link" data-t33-open-mat="${safe(mat.id)}">${safe(title)}</button>`:safe(title)}</td><td><strong>${score.toFixed(2)}/10</strong></td><td>${attemptNo}</td><td>${attemptPrintButton(a,'PDF')}</td><td>${ref?`<form class="attempt-feedback-form-v163" data-attempt-feedback-form="${ref}"><label>Retroalimentación<textarea name="teacherFeedback" rows="2" maxlength="1200" placeholder="Orientaciones para mejorar este intento">${feedback}</textarea></label><label>Comentario<textarea name="teacherComment" rows="2" maxlength="1200" placeholder="Comentario adicional">${comment}</textarea></label><button type="button" class="secondary-btn" data-t163-save-attempt-feedback="${ref}">Guardar</button></form>`:'Intento sin identificador'}</td></tr>`; }).join('')}</tbody></table></div>`;
  }
  async function saveAttemptTeacherFeedback(attemptId, form){
    if(!roleTeacher()) return toast('Solo la profesora puede añadir retroalimentación.');
    const id=String(attemptId||'').trim();
    if(!id) return toast('No se encontró el intento.');
    const fd=new FormData(form);
    const patch={
      teacher_feedback:String(fd.get('teacherFeedback')||'').trim() || null,
      teacher_comment:String(fd.get('teacherComment')||'').trim() || null,
      teacher_feedback_by:State.profile.id,
      teacher_feedback_at:new Date().toISOString()
    };
    const { error } = await table('exam_attempts').update(patch).eq('id', id);
    if(error) throw error;
    await loadData(true);
    toast('Retroalimentación guardada en el intento.');
    rerender();
  }

  function teacherDocumentsContent(){
    const month=State.billingMonth||defaultBillingMonth();
    const selected=(State.data.students||[]).find(s=>s.id===State.selectedStudentId)||(State.data.students||[])[0];
    const season=activeScheduleSeason();
    return `<section class="teacher-documents-v144 teacher-documents-v144b teacher-documents-v145"><div class="window-panel clean-hero"><div><p class="eyebrow">Documentos rápidos</p><h2>Descargas y plantillas PDF</h2><p>Genera documentos limpios con estética Tribeca desde los datos actuales del aula.</p></div></div><div class="document-card-grid-v144"><article class="window-panel document-card-v144"><h3>Pagos y recibís</h3><p>Recibís e históricos mensual, trimestral, anual, total, por alumno o por familia.</p><div class="inline-actions"><button type="button" class="secondary-btn" onclick="window.TribecaPrintTribecaDocument && window.TribecaPrintTribecaDocument('payments-month',{month:'${safe(month)}'})">Histórico mensual</button><button type="button" class="secondary-btn" onclick="window.TribecaPrintTribecaDocument && window.TribecaPrintTribecaDocument('payments-year',{month:'${safe(month)}'})">Histórico anual</button>${selected?`<button type="button" class="secondary-btn" onclick="window.TribecaPrintPaymentReceipt && window.TribecaPrintPaymentReceipt('${safe(selected.id)}','${safe(month)}')">Recibí alumno seleccionado</button>`:''}</div></article><article class="window-panel document-card-v144"><h3>Planificario con horas</h3><p>Descarga el planning con los horarios actuales ya cubiertos o una plantilla en blanco para cubrir a mano.</p><div class="inline-actions"><button type="button" class="secondary-btn" onclick="window.TribecaPrintTribecaDocument && window.TribecaPrintTribecaDocument('schedule',{season:'school',blank:false})">Curso escolar cubierto</button><button type="button" class="secondary-btn" onclick="window.TribecaPrintTribecaDocument && window.TribecaPrintTribecaDocument('schedule',{season:'summer',blank:false})">Verano cubierto</button><button type="button" class="secondary-btn" onclick="window.TribecaPrintTribecaDocument && window.TribecaPrintTribecaDocument('schedule',{season:'school',blank:true})">Plantilla curso</button><button type="button" class="secondary-btn" onclick="window.TribecaPrintTribecaDocument && window.TribecaPrintTribecaDocument('schedule',{season:'summer',blank:true})">Plantilla verano</button></div></article><article class="window-panel document-card-v144"><h3>Ficha persoal do alumnado</h3><p>Formulario imprimible para familias, con datos persoais, familiares, académicos y hoja médica.</p><button type="button" class="secondary-btn" onclick="window.TribecaPrintTribecaDocument && window.TribecaPrintTribecaDocument('student-form')">Descargar ficha en blanco</button></article><article class="window-panel document-card-v144"><h3>Seguimiento pedagógico</h3><p>Plantilla para tutoría, objetivos, acuerdos y evolución.</p><button type="button" class="secondary-btn" onclick="window.TribecaPrintTribecaDocument && window.TribecaPrintTribecaDocument('pedagogical-followup')">Descargar plantilla</button></article><article class="window-panel document-card-v144 document-card-wide-v148"><h3>Instrumentos de evaluación</h3><p>Modelos propios para observar, valorar y autoevaluar sin generar datos innecesarios en la web.</p><div class="inline-actions"><button type="button" class="secondary-btn" onclick="window.TribecaPrintTribecaDocument && window.TribecaPrintTribecaDocument('checklist')">Lista de control</button><button type="button" class="secondary-btn" onclick="window.TribecaPrintTribecaDocument && window.TribecaPrintTribecaDocument('rating-scale')">Escala de valoración</button><button type="button" class="secondary-btn" onclick="window.TribecaPrintTribecaDocument && window.TribecaPrintTribecaDocument('rubric')">Rúbrica</button><button type="button" class="secondary-btn" onclick="window.TribecaPrintTribecaDocument && window.TribecaPrintTribecaDocument('evaluation-target')">Diana de evaluación</button><button type="button" class="secondary-btn" onclick="window.TribecaPrintTribecaDocument && window.TribecaPrintTribecaDocument('self-assessment')">Autoevaluación</button></div></article></div></section>`;
  }
  function tribecaPrintableShell(title='', body=''){
    const today=new Date().toLocaleDateString('es-ES');
    return `<html><head><title>${safe(title)}</title><style>@page{margin:16mm}body{font-family:Inter,Arial,sans-serif;color:#172018;background:#fff;font-size:12px}.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #b99a3b;padding-bottom:12px;margin-bottom:20px}.brand strong{font-family:Georgia,serif;font-size:24px;color:#0b3d22}.brand span{display:block;color:#766b56}.tag{border:1px solid #d8caa5;border-radius:999px;padding:6px 10px;background:#fbf7ea;color:#0b3d22;font-weight:800}h1{font-family:Georgia,serif;color:#0b3d22;margin:0 0 12px}h2{font-size:15px;color:#0b3d22;border-bottom:1px solid #e5dcc6;padding-bottom:5px;margin-top:18px}table{width:100%;border-collapse:collapse;margin:8px 0 14px}.planning-pdf-table th,.planning-pdf-table td{height:54px}.planning-pdf-table td{font-size:11px}th,td{border:1px solid #e3d8bf;padding:7px;text-align:left;vertical-align:top}th{background:#f7f1e1;color:#0b3d22}.field{border:1px solid #e3d8bf;border-radius:10px;min-height:34px;margin:6px 0 10px;padding:8px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.muted{color:#6c6558}.sign{margin-top:35px;display:grid;grid-template-columns:1fr 1fr;gap:30px}.line{border-top:1px solid #172018;padding-top:6px}</style></head><body><header class="head"><div class="brand"><strong>Tribeca Academia</strong><span>Documento generado desde Tribeca Aula</span></div><span class="tag">${safe(today)}</span></header><main>${body}</main></body></html>`;
  }
  window.TribecaPrintTribecaDocument=function(kind, opts={}){
    const month=opts.month||State.billingMonth||defaultBillingMonth();
    let title='Documento Tribeca'; let body='';
    if(kind==='payments-month'){ title='Histórico mensual de pagos'; body=`<h1>${title}</h1><p class="muted">Mes: ${safe(monthLabel(month))}</p>${paymentSummary(month)}`; }
    else if(kind==='payments-year'){ const y=String(month).slice(0,4)||String(new Date().getFullYear()); title='Histórico anual de pagos'; const months=Array.from({length:12},(_,i)=>`${y}-${String(i+1).padStart(2,'0')}`); body=`<h1>${title}</h1><p class="muted">Año ${safe(y)}</p>${months.map(m=>`<h2>${safe(monthLabel(m))}</h2>${paymentSummary(m)}`).join('')}`; }
    else if(kind==='schedule'){ const season=opts.season||activeScheduleSeason(); const blank=!!opts.blank; title=`${season==='summer'?'Planificario de verano':'Planificario curso escolar'}${blank?' · plantilla en blanco':' · horarios actuales'}`; body=`<h1>${title}</h1><p class="muted">${blank?'Plantilla sin alumnado para cubrir a mano.':(season==='summer'?'Horario de mañana para clases de verano con alumnado ya colocado.':'Horario ordinario de curso escolar con alumnado ya colocado.')}</p>${schedulePlanningTable(season, blank)}`; }
    else if(kind==='student-form'){ title='Ficha persoal do alumnado'; body=`<h1>${title}</h1><p class="muted">Tribeca Apoio ao estudo · Rúa Rafael Juan 33 · 15130 Corcubión (A Coruña) · 647 961 161</p><h2>Datos persoais</h2><div class="grid"><div class="field">Apelidos:</div><div class="field">Nome:</div><div class="field">DNI / NIE:</div><div class="field">Data de nacemento:</div><div class="field">Enderezo: rúa, número, andar, letra</div><div class="field">Código postal e localidade:</div><div class="field">Provincia:</div><div class="field">Teléfono móbil:</div></div><h2>Datos familiares</h2><div class="grid"><div class="field">Pai / titor, idade e profesión:</div><div class="field">Nai / titora, idade e profesión:</div><div class="field">Teléfonos de contacto:</div><div class="field">Número de irmáns e lugar que ocupa:</div></div><div class="field">Vives cos teus pais ou titores legais?  ☐ SI   ☐ NON</div><div class="field">Outros familiares ou persoas que viven contigo:</div><div class="field">Situacións especiais na familia que poidan influír nos estudos:</div><h2>Datos académicos</h2><div class="grid"><div class="field">Centro de estudos:</div><div class="field">Curso:</div></div><div class="field">Materias con dificultades:</div><div class="field">Repetiches curso algunha vez? ☐ SI ☐ NON. Curso e motivo:</div><div class="field">Materias habitualmente suspensas:</div><div class="field">Que che gustaría estudar no futuro?</div><div class="field">Realizas outros estudos ou actividades fóra de Tribeca? Cal/es?</div><div class="field">Que outra formación complementaria desexarías recibir en Tribeca?</div><h2>Folla de información médica</h2><div class="field">Alerxias, medicación ou información médica relevante:</div><div class="field">Necesidades educativas, atención específica ou observacións pedagóxicas:</div><div class="sign"><div class="line">Firma da familia</div><div class="line">Data</div></div>`; }
    else if(kind==='checklist'){ title='Lista de control o cotejo'; body=`<h1>${title}</h1><p class="muted">Instrumento para comprobar la presencia o ausencia de conductas, destrezas o procedimientos observables.</p><div class="grid"><div class="field">Alumno/a:</div><div class="field">Fecha:</div><div class="field">Materia o actividad:</div><div class="field">Observador/a:</div></div><table><thead><tr><th>Indicador observable</th><th>Sí</th><th>No</th><th>En proceso</th><th>Observaciones</th></tr></thead><tbody>${Array.from({length:12},(_,i)=>`<tr><td>${i+1}. </td><td></td><td></td><td></td><td></td></tr>`).join('')}</tbody></table><h2>Conclusión</h2><div class="field"></div>`; }
    else if(kind==='rating-scale'){ title='Escala de valoración'; body=`<h1>${title}</h1><p class="muted">Instrumento para graduar frecuencia, calidad, autonomía o nivel de logro. Escala propuesta: 1 nunca o insuficiente, 2 a veces o inicial, 3 casi siempre o adecuado, 4 siempre o excelente.</p><div class="grid"><div class="field">Alumno/a:</div><div class="field">Fecha:</div><div class="field">Área evaluada:</div><div class="field">Evaluador/a:</div></div><table><thead><tr><th>Dimensión</th><th>1</th><th>2</th><th>3</th><th>4</th><th>Evidencia observada</th></tr></thead><tbody>${['Atención sostenida','Comprensión de instrucciones','Organización del material','Autonomía en la tarea','Uso de estrategias de estudio','Participación','Revisión de errores','Gestión del tiempo','Tolerancia a la frustración','Transferencia a nuevas tareas'].map(x=>`<tr><td>${x}</td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}</tbody></table><h2>Orientación para la mejora</h2><div class="field"></div>`; }
    else if(kind==='rubric'){ title='Modelo de rúbrica'; body=`<h1>${title}</h1><p class="muted">Plantilla para valorar una tarea compleja mediante criterios y niveles de desempeño.</p><div class="grid"><div class="field">Alumno/a o grupo:</div><div class="field">Tarea:</div><div class="field">Materia:</div><div class="field">Fecha:</div></div><table><thead><tr><th>Criterio</th><th>4 Excelente</th><th>3 Adecuado</th><th>2 Inicial</th><th>1 Necesita apoyo</th></tr></thead><tbody>${['Comprensión del contenido','Organización y estructura','Precisión y rigor','Aplicación de estrategias','Presentación y claridad','Autonomía y revisión'].map(x=>`<tr><td><strong>${x}</strong></td><td></td><td></td><td></td><td></td></tr>`).join('')}</tbody></table><h2>Resultado y comentario</h2><div class="field"></div>`; }
    else if(kind==='evaluation-target'){ title='Modelo de diana de evaluación'; body=`<h1>${title}</h1><p class="muted">Instrumento visual para autoevaluación o coevaluación. Marca cada eje del 1 al 4 y une los puntos.</p><div class="grid"><div class="field">Alumno/a:</div><div class="field">Actividad:</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:center"><svg viewBox="0 0 420 420" width="100%" height="360" role="img" aria-label="Diana de evaluación"><circle cx="210" cy="210" r="170" fill="none" stroke="#d8caa5" stroke-width="2"/><circle cx="210" cy="210" r="128" fill="none" stroke="#d8caa5" stroke-width="2"/><circle cx="210" cy="210" r="86" fill="none" stroke="#d8caa5" stroke-width="2"/><circle cx="210" cy="210" r="44" fill="none" stroke="#d8caa5" stroke-width="2"/><line x1="210" y1="40" x2="210" y2="380" stroke="#0b3d22"/><line x1="40" y1="210" x2="380" y2="210" stroke="#0b3d22"/><line x1="90" y1="90" x2="330" y2="330" stroke="#0b3d22"/><line x1="330" y1="90" x2="90" y2="330" stroke="#0b3d22"/><text x="210" y="25" text-anchor="middle" font-size="13">Comprensión</text><text x="395" y="214" text-anchor="end" font-size="13">Autonomía</text><text x="210" y="405" text-anchor="middle" font-size="13">Esfuerzo</text><text x="25" y="214" font-size="13">Organización</text></svg><div><h2>Ejes</h2><table><tbody><tr><th>Comprensión</th><td>1 · 2 · 3 · 4</td></tr><tr><th>Autonomía</th><td>1 · 2 · 3 · 4</td></tr><tr><th>Esfuerzo</th><td>1 · 2 · 3 · 4</td></tr><tr><th>Organización</th><td>1 · 2 · 3 · 4</td></tr><tr><th>Atención</th><td>1 · 2 · 3 · 4</td></tr><tr><th>Revisión de errores</th><td>1 · 2 · 3 · 4</td></tr></tbody></table></div></div><h2>Comentario final</h2><div class="field"></div>`; }
    else if(kind==='self-assessment'){ title='Instrumentos de autoevaluación'; body=`<h1>${title}</h1><p class="muted">Modelos breves para que el alumnado tome conciencia de cómo aprende, qué comprende y qué debe mejorar.</p><h2>Semáforo de aprendizaje</h2><table><thead><tr><th>Verde</th><th>Amarillo</th><th>Rojo</th></tr></thead><tbody><tr><td>Lo entiendo y puedo explicarlo.</td><td>Lo entiendo parcialmente, necesito practicar.</td><td>No lo entiendo todavía, necesito ayuda.</td></tr><tr><td style="height:42px"></td><td></td><td></td></tr></tbody></table><h2>Autoevaluación breve</h2><table><thead><tr><th>Pregunta</th><th>Respuesta del alumno/a</th></tr></thead><tbody>${['¿Qué he aprendido hoy?','¿Qué me ha resultado más difícil?','¿Qué estrategia he utilizado?','¿He revisado mis errores?','¿Qué haré distinto la próxima vez?','¿Qué ayuda necesito?'].map(x=>`<tr><td>${x}</td><td style="height:38px"></td></tr>`).join('')}</tbody></table><h2>Escala de autonomía</h2><table><thead><tr><th>Acción</th><th>Solo/a</th><th>Con poca ayuda</th><th>Con mucha ayuda</th></tr></thead><tbody>${['Preparé el material','Leí las instrucciones','Empecé la tarea','Pedí ayuda de forma adecuada','Terminé y revisé'].map(x=>`<tr><td>${x}</td><td></td><td></td><td></td></tr>`).join('')}</tbody></table>`; }
    else { title='Seguimiento pedagógico'; body=`<h1>${title}</h1><div class="grid"><div class="field">Alumno/a:</div><div class="field">Fecha:</div></div><h2>Objetivos</h2><div class="field"></div><h2>Trabajo realizado</h2><div class="field"></div><h2>Observaciones</h2><div class="field"></div><h2>Acuerdos y próximos pasos</h2><div class="field"></div>`; }
    const w=window.open('', '_blank'); if(!w) return toast('No se pudo abrir la ventana de impresión.'); w.document.write(tribecaPrintableShell(title, body)); w.document.close(); setTimeout(()=>w.print(),250); return false;
  };

  function passwordRequestsContent(){ const rows=State.data.passwordRequests||[]; return `<section class="window-panel"><h3>Solicitudes de recuperación de contraseña</h3>${rows.length?rows.map(r=>`<article class="list-item"><strong>${safe(r.username||r.display_name)}</strong><p>${safe(r.display_name||'')} · ${safe(r.status||'pending')}</p><small>${fmtDT(r.created_at)}</small><button data-t16-pass-done="${safe(r.id)}">Marcar como atendida</button></article>`).join(''):'<div class="empty-state">No hay solicitudes pendientes.</div>'}</section>`; }

  function profileFilterLabel(filter='all'){
    return ({all:'Todo el alumnado', scheduled:'Con horario', paused:'Pausas', support:'Apoyos', focus:'Modo concentración'})[filter] || 'Todo el alumnado';
  }
  function studentMatchesProfileFilter(s, filter='all'){
    if(filter==='scheduled') return (State.data.schedules||[]).some(x=>String(x.user_id)===String(s.id) && x.active!==false);
    if(filter==='paused') return !!pauseStatusText(s.id);
    if(filter==='support') return !!supportSummary(s).flags.length;
    if(filter==='focus') return !!focusModeEnabledForProfile(s);
    return true;
  }
  function studentProfilesContent(){
    const students = State.data.students || [];
    const currentFilter = State.profileKpiFilter || 'all';
    const filteredStudents = students.filter(s=>studentMatchesProfileFilter(s, currentFilter));
    const selectedPool = filteredStudents.length ? filteredStudents : students;
    const selected = selectedPool.find(s => String(s.id) === String(State.selectedStudentId)) || selectedPool[0] || null;
    if(selected && !State.selectedStudentId) State.selectedStudentId = selected.id;
    const active = students.filter(s=>!pauseStatusText(s.id)).length;
    const paused = students.length - active;
    const focusCount = students.filter(s=>focusModeEnabledForProfile(s)).length;
    const withSchedule = students.filter(s=>(State.data.schedules||[]).some(x=>String(x.user_id)===String(s.id) && x.active!==false)).length;
    const supportCount = students.filter(s=>supportSummary(s).flags.length).length;
    const selectedFamily = selected ? String(selected.family_name || selected.family_group_id || '').trim() : '';
    const kpi=(filter,title,value,caption,tone='')=>`<button type="button" class="profile-kpi-card-v174 ${tone} ${currentFilter===filter?'is-active':''}" data-profile-kpi-filter="${safe(filter)}"><small>${safe(title)}</small><strong>${safe(value)}</strong><span>${safe(caption)}</span></button>`;
    const list = groups(filteredStudents).map(g => `<details class="profile-group-v147" open><summary><span>${safe(g.label)}</span><em>${g.items.length}</em></summary><div class="profile-card-grid-v147">${g.items.map(s => {
      const pause=pauseStatusText(s.id);
      const sup=supportSummary(s);
      const selectedClass=String(selected?.id||'')===String(s.id)?'is-selected':'';
      const focus=focusModeEnabledForProfile(s);
      const family=String(s.family_name || s.family_group_id || '').trim();
      const schedCount=(State.data.schedules||[]).filter(x=>String(x.user_id)===String(s.id) && x.active!==false).length;
      return `<button type="button" class="profile-student-card-v147 ${selectedClass} ${pause?'is-paused':''}" data-t16-select-student="${safe(s.id)}" data-student-name="${safe((displayName(s)+' '+(s.username||'')+' '+academicLine(s)+' '+family).toLowerCase())}">
        ${studentAvatarMarkup(s,'profile-avatar-v147')}
        <span class="profile-card-main-v147"><strong>${safe(displayName(s))}</strong><small>${safe(s.username||'')} · ${safe(academicLine(s))}</small><span>${family?`Familia: ${safe(family)}`:'Sin grupo familiar'} · ${schedCount} horario${schedCount===1?'':'s'}</span></span>
        <span class="profile-card-badges-v147">${pause?`<em class="danger">Pausa</em>`:''}${focus?`<em>Concentración</em>`:''}${sup.flags.length?`<em>${safe(sup.flags[0])}</em>`:''}</span>
      </button>`;
    }).join('')}</div></details>`).join('');
    return `<section class="teacher-profiles-v147 teacher-profiles-v174">
      <header class="finance-hero-clean-v146 profile-hero-v147 profile-hero-v174 window-panel"><div><p class="eyebrow">Seguimiento pedagógico</p><h2>Perfiles del alumnado</h2><p>Fichas completas, horarios, apoyos, familia y datos profesionales en una vista limpia y fácil de revisar.</p></div><div class="profile-quick-actions-v174"><button type="button" class="secondary-btn tool-jump-btn" data-t16-tool="attendance">Ir a asistencia</button><button type="button" class="secondary-btn tool-jump-btn" data-t16-tool="payments">Ir a pagos</button></div></header>
      <section class="profile-kpi-grid-v147 profile-kpi-grid-v174">
        ${kpi('all','Total',students.length,'perfiles activos')}
        ${kpi('scheduled','Con horario',withSchedule,'alumnos con clases registradas')}
        ${kpi('paused','Pausas',paused,'perfiles temporalmente pausados',paused?'is-warn':'')}
        ${kpi('support','Apoyos',supportCount,'con NEAE, NEE o notas relevantes')}
        ${kpi('focus','Modo concentración',focusCount,'vista simplificada activa')}
      </section>
      <section class="window-panel profile-toolbar-v147 profile-toolbar-v174"><label>Buscar alumnado<input class="t16-search" type="search" placeholder="Filtrar por nombre, usuario, curso o familia..." data-t16-student-search></label><span class="profile-family-pill-v147">Filtro: ${safe(profileFilterLabel(currentFilter))} · ${filteredStudents.length}/${students.length}</span>${selectedFamily?`<span class="profile-family-pill-v147">${safe(selectedFamily)}</span>`:''}</section>
      <div class="profile-layout-v147">
        <section class="window-panel profile-list-v147"><div class="section-heading"><h3>Alumnado</h3><span>${filteredStudents.length}</span></div>${list || '<div class="empty-state">No hay alumnado en esta categoría.</div>'}</section>
        <section class="window-panel profile-editor-v147"><div class="section-heading"><h3>${selected?`Ficha de ${safe(displayName(selected))}`:'Ficha del alumnado'}</h3><span>${selected?safe(academicLine(selected)):''}</span></div>${selected ? studentEditForm(selected) : '<div class="empty-state">Selecciona un alumno.</div>'}</section>
      </div>
    </section>`;
  }

  function studentPhotoUrl(s={}){ return String(s.student_photo_url || s.photo_url || s.avatar_url || '').trim(); }
  function studentAvatarMarkup(s={}, className='student-avatar-photo-v149', alt=''){
    const photo=studentPhotoUrl(s);
    const name=displayName(s)||'Alumno';
    const initial=safe((name||'?').slice(0,1).toUpperCase());
    const title=safe(alt || name);
    return `<span class="${safe(className)} ${photo?'has-photo':'has-initial'}" aria-label="${title}">${photo?`<img src="${safe(photo)}" alt="${title}">`:initial}</span>`;
  }
  function birthDateInputValue(value=''){ const raw=String(value||'').trim(); if(!raw) return ''; return raw.slice(0,10); }

  function studentEditForm(s){
    const schedAll = (State.data.schedules || []).filter(x => x.user_id === s.id);
    const schoolSched = schedAll.filter(x=>scheduleRecordSeason(x)==='school');
    const summerSched = schedAll.filter(x=>scheduleRecordSeason(x)==='summer');
    const activeSchedSeason = activeScheduleSeasonForStudent(s.id);
    const selectedNee = Array.isArray(s.nee_types) ? s.nee_types : [];
    const selectedNeae = Array.isArray(s.neae_types) ? s.neae_types : [];
    const selectedHealth = Array.isArray(s.health_conditions) ? s.health_conditions : [];
    const scheduleRows = scheduleRowsEditor(schoolSched, 'schoolSchedule');
    const summerScheduleRows = scheduleRowsEditor(summerSched, 'summerSchedule');
    const schoolSchedulePreset = schedulePresetToolbar('schoolSchedule','curso escolar','15:30','16:30');
    const summerSchedulePreset = schedulePresetToolbar('summerSchedule','verano','10:00','11:00');
    const checks = (name, items, selected) => items.map(x=>`<label><input type="checkbox" name="${name}" value="${safe(x)}" ${selected.includes(x)?'checked':''}> <span>${safe(x)}</span></label>`).join('');
    const pause=pauseStatusText(s.id);
    const sup=supportSummary(s);
    const activeClasses=studentAssignedClasses(s.id);
    const focusActive=focusModeEnabledForProfile(s);
    const photoUrl = studentPhotoUrl(s);
    const statusChips=[academicLine(s), pause?`En pausa: ${pause}`:'Activo', focusActive?'Modo concentración activo':'Vista estándar', sup.flags.length?sup.flags.join(' · '):'Sin apoyos registrados', activeClasses.length?`${activeClasses.length} clase${activeClasses.length===1?'':'s'}`:'Sin clase nueva'].filter(Boolean);
    return `<form id="t24StudentProfileForm" class="form-grid premium-student-editor t24-student-editor teacher-clean-form" method="post" action="javascript:void(0)">
      <input type="hidden" name="id" value="${safe(s.id)}">
      <div class="t24-editor-head clean-editor-head student-personal-editor-head">
        <figure class="student-editor-photo">${photoUrl?`<img src="${safe(photoUrl)}" alt="Foto de ${safe(displayName(s))}">`:`<span>${safe((displayName(s)||'?').slice(0,1).toUpperCase())}</span>`}</figure>
        <div><p class="eyebrow">Perfil del alumnado</p><h3>${safe(displayName(s))}</h3><div class="clean-chip-row">${statusChips.map(x=>`<span>${safe(x)}</span>`).join('')}</div></div>
      </div>
      <div class="form-status t24-profile-status" data-t24-profile-status></div>
      <section class="premium-form-section clean-primary-section">
        <h4>Datos principales</h4>
        <div class="window-grid"><label>Nombre<input name="firstName" value="${safe(s.first_name||firstPart(s.full_name))}"></label><label>Apellidos<input name="lastName" value="${safe(s.last_name||lastPart(s.full_name))}"></label></div>
        <div class="window-grid"><label>Nombre completo<input name="fullName" value="${safe(s.full_name && !/^demo\b/i.test(s.full_name) ? s.full_name : displayName(s))}"></label><label>Usuario<input name="username" value="${safe(s.username||'')}"></label></div>
        <div class="window-grid"><label>Centro<select name="center">${options(centers,s.center)}</select></label><label>Etapa<select name="stage">${options(stages,s.stage)}</select></label><label>Curso<select name="course">${options(dynamicCourses(),s.course)}</select></label></div>
        <div class="window-grid t143-personal-grid"><label>Fecha de nacimiento<input name="birthDate" type="date" value="${safe(birthDateInputValue(s.birth_date))}"></label><label>Foto del alumno (URL o archivo)<input name="studentPhotoUrl" type="url" value="${safe(photoUrl)}" placeholder="https://... o sube una imagen"></label></div>
        <label class="publication-upload-card student-photo-upload-v144"><strong>Subir foto desde el ordenador</strong><small>PNG, JPG o WebP. Puedes subir hasta 4 MB; Tribeca la optimiza antes de guardarla.</small><input name="studentPhotoFile" type="file" accept="image/png,image/jpeg,image/webp"><span class="attachment-preview-pill" data-student-photo-file-name>Ningún archivo seleccionado.</span></label>
      </section>
      <details class="teacher-option-drawer" open><summary><span>Datos familiares y personales</span><em>Privado</em></summary>
        <section class="premium-form-section"><div class="window-grid"><label>Nombre y apellidos del padre / tutor 1<input name="fatherFullName" value="${safe(s.father_full_name||'')}"></label><label>Nombre y apellidos de la madre / tutora 2<input name="motherFullName" value="${safe(s.mother_full_name||'')}"></label></div><div class="window-grid"><label>Teléfono principal de familia<input name="familyPhone" value="${safe(s.family_phone||'')}"></label><label>Teléfono de emergencia<input name="emergencyPhone" value="${safe(s.emergency_phone||'')}"></label></div><div class="window-grid"><label>Email familiar<input name="familyEmail" type="email" value="${safe(s.family_email||'')}"></label><label>Contacto preferente<input name="preferredContact" value="${safe(s.preferred_contact||'')}"></label></div><div class="window-grid"><label>Grupo familiar / hermanos<input name="familyGroupId" value="${safe(s.family_group_id||'')}" placeholder="Ej.: familia_wrona"></label><label>Nombre visible de familia<input name="familyName" value="${safe(s.family_name||'')}" placeholder="Ej.: Familia Wrona"></label></div><label>Dirección<textarea name="studentAddress" rows="2">${safe(s.address||'')}</textarea></label></section>
      </details>
      <details class="teacher-option-drawer" open><summary><span>Contacto e itinerario</span><em>Datos útiles</em></summary>
        <section class="premium-form-section"><div class="window-grid"><label>Email interno<input name="authEmail" type="email" value="${safe(s.auth_email||'')}"></label><label>Email personal<input name="personalEmail" type="email" value="${safe(s.personal_email||'')}"></label></div><label>Modalidad / itinerario<input name="track" value="${safe(s.track||'')}"></label></section>
      </details>
      <details class="teacher-option-drawer" open><summary><span>Horarios de asistencia</span><em>${scheduleSeasonLabel(activeSchedSeason)} activo</em></summary>
        <section class="premium-form-section seasonal-schedule-editor"><p class="meta">Registra los horarios de curso escolar y verano por separado. Elige cuál está activo para calcular pagos, asistencia y próximos horarios de este alumno. Esta elección no cambia la estética ni el logo del aula.</p><div class="active-schedule-selector-v175"><strong>Horario activo para este alumno</strong><label><input type="radio" name="activeScheduleSeason" value="school" ${activeSchedSeason==='school'?'checked':''}> Curso escolar</label><label><input type="radio" name="activeScheduleSeason" value="summer" ${activeSchedSeason==='summer'?'checked':''}> Verano</label></div><div class="seasonal-schedule-columns"><article class="${activeSchedSeason==='school'?'is-active-schedule-v175':''}"><h5>Curso escolar</h5><p class="meta">Horario ordinario de tarde.</p>${schoolSchedulePreset}<div class="t24-schedule-grid">${scheduleRows}</div></article><article class="${activeSchedSeason==='summer'?'is-active-schedule-v175':''}"><h5>Verano</h5><p class="meta">Horario especial de mañana.</p>${summerSchedulePreset}<div class="t24-schedule-grid">${summerScheduleRows}</div></article></div></section>
      </details>
      <details class="teacher-option-drawer"><summary><span>Perfil pedagógico profesional</span><em>Seguimiento</em></summary>
        <section class="premium-form-section"><div class="window-grid"><label>Tutor/a del centro educativo<input name="schoolTutor" value="${safe(s.school_tutor||'')}"></label><label>Motivo principal de apoyo<input name="supportReason" value="${safe(s.support_reason||'')}"></label></div><label>Objetivos pedagógicos<textarea name="learningGoals" rows="3">${safe(s.learning_goals||'')}</textarea></label><label>Observaciones de evaluación inicial<textarea name="initialAssessment" rows="3">${safe(s.initial_assessment||'')}</textarea></label><label>Indicaciones familiares o coordinación externa<textarea name="familyCoordination" rows="3">${safe(s.family_coordination||'')}</textarea></label><label>Notas sensibles o clínicas relevantes para la intervención educativa<textarea name="diagnosisNotes" rows="3">${safe(s.diagnosis_notes||'')}</textarea></label></section>
      </details>
      <details class="teacher-option-drawer"><summary><span>Atención personalizada, NEAE y NEE</span><em>${sup.flags.length||0} indicador${sup.flags.length===1?'':'es'}</em></summary>
        <section class="premium-form-section attention-section t34-attention-section"><div class="support-note"><strong>Clasificación correcta:</strong> las NEE forman parte de las NEAE. Registra solo lo relevante para la atención educativa.</div><label class="check-line attention-main"><input type="checkbox" name="personalizedAttention" ${s.personalized_attention?'checked':''}> Requiere atención personalizada o adaptación</label><div class="support-needs-grid t24-support-grid t34-support-grid"><fieldset class="support-box support-box-nee"><legend>NEE</legend><div class="support-checks">${checks('neeTypes', neeTypes, selectedNee)}</div></fieldset><fieldset class="support-box support-box-neae"><legend>NEAE</legend><div class="support-checks">${checks('neaeTypes', neaeTypes, selectedNeae)}</div></fieldset><fieldset class="support-box support-box-health"><legend>Condiciones relevantes</legend><div class="support-checks">${checks('healthConditions', healthConditions, selectedHealth)}</div></fieldset></div><label>Observaciones privadas<textarea name="observations" rows="5">${safe(s.observations||'')}</textarea></label></section>
      </details>
      <details class="teacher-option-drawer focus-mode-drawer" ${focusActive?'open':''}><summary><span>Modo concentración</span><em>${focusActive?'Activo':'Inactivo'}</em></summary>
        <section class="premium-form-section focus-mode-section"><p class="meta">Vista simplificada, clara y sin distracciones para el trabajo diario. Solo la profesora puede activarla o desactivarla desde este perfil.</p><label class="check-line focus-mode-check"><input type="checkbox" name="focusModeEnabled" ${focusActive?'checked':''}> Activar vista simplificada por defecto para este alumno</label><div class="focus-mode-preview"><strong>Qué verá el alumnado:</strong><span>una interfaz más limpia</span><span>menos tarjetas simultáneas</span><span>instrucciones visibles</span><span>actividades centradas en un paso cada vez</span></div></section>
      </details>
      <details class="teacher-option-drawer"><summary><span>Promoción de curso</span><em>Uso puntual</em></summary>
        <section class="premium-form-section promotion-section"><p class="meta">Actualiza centro, etapa y curso con los datos elegidos arriba y limpia datos académicos del curso anterior.</p><button class="secondary-btn" type="button" data-t29-promote-student>Promocionar y limpiar datos del curso anterior</button></section>
      </details>
      <div class="sticky-form-actions clean-sticky-actions"><button class="primary-btn t24-save-profile" type="button" data-t24-save-student onclick="return window.TribecaSaveStudentProfileDirect(this,event)">Guardar cambios</button><span class="form-status" data-t24-profile-status-bottom></span></div>
    </form>`;
  }

  function firstPart(n=''){ return String(n).trim().split(/\s+/).slice(0,1).join(' '); } function lastPart(n=''){ return String(n).trim().split(/\s+/).slice(1).join(' '); }

  function buildStudentProfilePayload(form){
    const fd = new FormData(form);
    const id = String(fd.get('id') || '').trim();
    const first = String(fd.get('firstName') || '').trim();
    const last = String(fd.get('lastName') || '').trim();
    const username = String(fd.get('username') || '').trim().toLowerCase();
    const full = String(fd.get('fullName') || `${first} ${last}`.trim() || knownStudentNames[username] || username).trim();
    const schedule = [
      ...buildStudentScheduleFromFormData(fd, 'schoolSchedule', 'school'),
      ...buildStudentScheduleFromFormData(fd, 'summerSchedule', 'summer')
    ];
    return { id, first_name:first, last_name:last, full_name:full, username, auth_email:String(fd.get('authEmail')||'').trim()||null, personal_email:String(fd.get('personalEmail')||'').trim()||null, center:fd.get('center')||null, stage:fd.get('stage')||null, course:fd.get('course')||null, track:String(fd.get('track')||'').trim()||null, birth_date:String(fd.get('birthDate')||'').trim()||null, student_photo_url:String(fd.get('studentPhotoUrl')||'').trim()||null, father_full_name:String(fd.get('fatherFullName')||'').trim()||null, mother_full_name:String(fd.get('motherFullName')||'').trim()||null, family_phone:String(fd.get('familyPhone')||'').trim()||null, emergency_phone:String(fd.get('emergencyPhone')||'').trim()||null, family_email:String(fd.get('familyEmail')||'').trim()||null, preferred_contact:String(fd.get('preferredContact')||'').trim()||null, family_group_id:String(fd.get('familyGroupId')||'').trim()||null, family_name:String(fd.get('familyName')||'').trim()||null, address:String(fd.get('studentAddress')||'').trim()||null, school_tutor:String(fd.get('schoolTutor')||'').trim()||null, support_reason:String(fd.get('supportReason')||'').trim()||null, learning_goals:String(fd.get('learningGoals')||'').trim()||null, initial_assessment:String(fd.get('initialAssessment')||'').trim()||null, family_coordination:String(fd.get('familyCoordination')||'').trim()||null, diagnosis_notes:String(fd.get('diagnosisNotes')||'').trim()||null, nee_types:fd.getAll('neeTypes'), neae_types:fd.getAll('neaeTypes'), health_conditions:fd.getAll('healthConditions'), observations:fd.get('observations')||'', personalized_attention:!!fd.get('personalizedAttention'), focus_mode_enabled:!!fd.get('focusModeEnabled'), schedule };
  }

  async function saveStudentProfile(form){
    const buttons = Array.from(form.querySelectorAll('[data-t24-save-student],[data-t23-save-student],[data-t22-save-student],[data-t21-save-student],[type="submit"]'));
    const statuses = Array.from(form.querySelectorAll('[data-t24-profile-status],[data-t24-profile-status-bottom],[data-t23-profile-status],[data-t22-profile-status],[data-t21-profile-status]'));
    const setStatus = (msg, kind='info') => { statuses.forEach(status => { status.textContent = msg || ''; status.classList.remove('is-ok','is-error','is-info'); if(msg) status.classList.add(kind==='ok'?'is-ok':kind==='error'?'is-error':'is-info'); }); if(msg) toast(msg); };
    if(!roleTeacher()) { setStatus('Solo la profesora puede editar perfiles del alumnado.', 'error'); return; }
    buttons.forEach(btn => { btn.disabled = true; btn.dataset.originalText = btn.dataset.originalText || btn.textContent; btn.textContent = 'Guardando…'; });
    setStatus('Guardando cambios en Supabase…', 'info');
    try {
      const payload = buildStudentProfilePayload(form);
      if(!payload.id) throw new Error('No se ha podido identificar el perfil del alumno.');
      const personalKeys = ['birth_date','student_photo_url','father_full_name','mother_full_name','family_phone','emergency_phone','family_email','preferred_contact','family_group_id','family_name','address','school_tutor','support_reason','learning_goals','initial_assessment','family_coordination','diagnosis_notes'];
      const personalPayload = {};
      personalKeys.forEach(k => { personalPayload[k] = payload[k] || null; });
      const rpcPayload = {...payload};
      personalKeys.forEach(k => delete rpcPayload[k]);
      delete rpcPayload.schedule;
      const rpc = await State.client.rpc('tribeca_teacher_save_student_profile_v25', { p_payload: rpcPayload });
      if(rpc.error) throw rpc.error;
      if(!rpc.data || rpc.data.ok !== true) throw new Error('Supabase no confirmó el guardado.');
      let personalData = null;
      const personalRpc = await State.client.rpc('tribeca_teacher_save_student_personal_v143', { p_payload: {id: payload.id, ...personalPayload} });
      if(personalRpc.error || personalRpc.data?.ok !== true){
        const personalUpdate = await State.client.from('profiles').update(personalPayload).eq('id', payload.id).select('*').single();
        if(personalUpdate.error) throw new Error(`${personalRpc.error?.message || personalUpdate.error.message || 'No se pudo guardar la ficha personal.'} Ejecuta el SQL de la versión 143 si todavía no lo has aplicado.`);
        personalData = personalUpdate.data || personalPayload;
      } else {
        personalData = personalRpc.data.profile || personalPayload;
      }
      const focusRpc = await State.client.rpc('tribeca_teacher_set_focus_mode_v138', { p_user_id: payload.id, p_enabled: !!payload.focus_mode_enabled });
      if(focusRpc.error) throw new Error(`${focusRpc.error.message || 'No se pudo guardar el modo concentración.'} Ejecuta el SQL de la versión 138 si todavía no lo has aplicado.`);
      const scheduleRpc = await State.client.rpc('tribeca_teacher_save_student_schedules_v144b', { p_user_id: payload.id, p_schedules: payload.schedule || [] });
      if(scheduleRpc.error || scheduleRpc.data?.ok !== true) throw new Error(`${scheduleRpc.error?.message || scheduleRpc.data?.error || 'No se pudieron guardar los horarios de curso/verano.'} Ejecuta el SQL ampliado de la versión 144 si todavía no lo has aplicado.`);
      const fresh = {...(rpc.data.profile || rpcPayload), ...personalData, focus_mode_enabled:!!payload.focus_mode_enabled};
      State.selectedStudentId = payload.id;
      State.data.students = (State.data.students||[]).map(st => st.id===payload.id ? {...st, ...fresh} : st);
      const sched = await State.client.from('student_schedules').select('*').eq('user_id', payload.id).order('weekday').order('start_time');
      if(!sched.error) State.data.schedules = [...(State.data.schedules||[]).filter(x=>x.user_id!==payload.id), ...(sched.data||[])];
      await log('profile','Perfil del alumnado actualizado',{student:payload.full_name});
      setStatus('Perfil guardado correctamente.', 'ok');
    } catch(e) {
      console.error('Error al guardar perfil de alumnado:', e);
      setStatus(`Error al guardar: ${e?.message || e?.details || e || 'Error desconocido'}`, 'error');
    } finally {
      buttons.forEach(btn => { btn.disabled = false; btn.textContent = btn.dataset.originalText || 'Guardar cambios del alumno'; });
    }
  }


  function paymentMonthRecord(userId, month){ return (State.data.paymentMonths||[]).find(x=>x.user_id===userId && String(x.month||'').slice(0,7)===String(month).slice(0,7)) || {}; }
  function monthLabel(month){ try { const [y,m]=String(month).split('-').map(Number); return new Date(y, (m||1)-1, 1).toLocaleDateString('es-ES',{month:'long',year:'numeric'}); } catch(_){ return String(month||''); } }
  function addMonthsToMonth(month, delta){ const [y,m]=String(month||todayIso().slice(0,7)).split('-').map(Number); const d=new Date(y||new Date().getFullYear(), (m||1)-1+delta, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
  function paymentModeForStudent(s){ const haystack = `${displayName(s)} ${s?.username||''}`.toLowerCase(); return (/wrona/.test(haystack) || /marco\s+calvo|marco_calvo/.test(haystack)) ? 'advance' : 'arrears'; }
  function paymentModeLabel(s){ return paymentModeForStudent(s)==='advance' ? 'Pago por adelantado' : 'Pago a mes vencido'; }
  function paymentMethodLabel(value=''){
    const v=String(value||'').trim().toLowerCase();
    if(v==='cash') return 'Efectivo';
    if(v==='bizum') return 'Bizum';
    return 'Sin forma de pago indicada';
  }
  function paymentPausedForMonth(userId, month){
    const overlaps = pauseMonthOverlap(userId, month);
    if(!overlaps.length) return false;
    const activeToday = activePauseFor(userId, todayIso());
    if(activeToday && overlaps.some(p=>String(p.id)===String(activeToday.id))) return true;
    const c = calculatePaymentAmount(userId, month);
    return Number(c.amount||0) === 0 && overlaps.length > 0;
  }
  function defaultBillingMonth(){
    const today=new Date();
    const y=today.getFullYear();
    const m=today.getMonth()+1;
    const day=today.getDate();
    const target = day<=10 ? new Date(y, m-2, 1) : new Date(y, m-1, 1);
    return `${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,'0')}`;
  }
  function paymentDueDate(s, month){ const [y,m]=String(month).split('-').map(Number); if(!y||!m) return new Date(); return paymentModeForStudent(s)==='advance' ? new Date(y, m-1, 1) : new Date(y, m, 20); }
  function paymentLateAfterDay10(month){
    const [y,m]=String(month).split('-').map(Number);
    if(!y||!m) return false;
    const today=new Date();
    const cutoff=new Date(y, m, 10, 23, 59, 59, 999);
    return today>cutoff;
  }
  function isPaymentOverdue(month, student=null){ const [y,m]=String(month).split('-').map(Number); if(!y||!m) return false; const due = student ? paymentDueDate(student, month) : new Date(y, m, 20); const today=new Date(); return today > due; }
  function paymentSummaryStatus(pay={}, month='', paused=false){
    if(paused) return {key:'paused', label:'En pausa', detail:'Excluido de pagos esperados'};
    if(pay.paid) return {key:'paid', label:'Pagado', detail:pay.paid_date?fmtDate(pay.paid_date):'Sin fecha indicada'};
    if(paymentLateAfterDay10(month)) return {key:'late', label:'Retrasado', detail:'Pendiente después del día 10 del mes siguiente'};
    return {key:'pending', label:'Pendiente', detail:'Dentro del plazo operativo'};
  }
  function quarterMonthsFor(month){ const [y,m]=String(month||todayIso().slice(0,7)).split('-').map(Number); const start=Math.floor(((m||1)-1)/3)*3+1; return [0,1,2].map(i=>`${y}-${String(start+i).padStart(2,'0')}`); }
  function paidMonthsForStudent(userId){ return [...new Set((State.data.paymentMonths||[]).filter(p=>String(p.user_id)===String(userId) && p.paid).map(p=>String(p.month).slice(0,7)).filter(Boolean))].sort().reverse(); }
  function unpaidPaymentAlerts(){ const month=(State.billingMonth||defaultBillingMonth()); return (State.data.students||[]).map(s=>({student:s, bill:(State.data.billing||[]).find(b=>b.user_id===s.id)||{}, pay:paymentMonthRecord(s.id, month), paused:paymentPausedForMonth(s.id, month)})).filter(x=>!x.paused && isPaymentOverdue(month, x.student) && x.pay.paid!==true).map(x=>({name:displayName(x.student), month, amount:calculatePaymentAmount(x.student.id, month).amount})); }
  function teacherStudentPicker(selected, context='payments'){
    const students=State.data.students||[];
    const title = context === 'attendance' ? 'Alumnado' : 'Alumnado';
    return `<section class="window-panel payments-students t54-student-picker"><h3>${title}</h3><input class="t16-search" type="search" placeholder="Filtrar alumnado..." data-t16-student-search>${groups(students).map(g=>`<details open><summary>${safe(g.label)}</summary>${g.items.map(s=>{ const pText=pauseStatusText(s.id); return `<button type="button" class="t16-student-row ${selected?.id===s.id?'is-selected':''} ${pText?'is-paused-row':''}" data-t16-select-student="${safe(s.id)}" data-student-name="${safe((displayName(s)+' '+s.username+' '+academicLine(s)).toLowerCase())}"><span>${safe(displayName(s))}</span><small>${safe(academicLine(s))}${pText?' · En pausa':''}</small>${pText?'<em class="pause-mini-label">Pausa</em>':''}</button>`; }).join('')}</details>`).join('')}</section>`;
  }
  function paymentMonthNavigator(month, heading='Mes de referencia'){
    return `<div class="attendance-head payment-month-nav t54-month-nav"><h4>${safe(heading)}: ${safe(monthLabel(month))}</h4><div class="inline-actions"><button type="button" class="secondary-btn" data-t51-month-nav="${safe(addMonthsToMonth(month,-1))}">← Mes anterior</button><label>Mes<input type="month" value="${safe(month)}" data-t16-billing-month></label><button type="button" class="secondary-btn" data-t51-month-nav="${safe(addMonthsToMonth(month,1))}">Mes siguiente →</button></div></div>`;
  }
  function financeStudentMetricsV146(s={}, month=defaultBillingMonth()){
    const calc=calculatePaymentAmount(s.id,month);
    const pay=paymentMonthRecord(s.id,month);
    const paused=paymentPausedForMonth(s.id,month);
    const status=paymentSummaryStatus(pay, month, paused);
    const bill=(State.data.billing||[]).find(b=>String(b.user_id)===String(s.id))||{};
    return {calc,pay,paused,status,bill};
  }
  function paymentKpisV146(month){
    const students=State.data.students||[];
    let total=0, paid=0, pending=0, late=0, paused=0;
    students.forEach(s=>{ const m=financeStudentMetricsV146(s,month); if(!m.paused) total+=Number(m.calc.amount||0); if(m.status.key==='paid') paid++; else if(m.status.key==='late') late++; else if(m.status.key==='paused') paused++; else pending++; });
    return {total,paid,pending,late,paused,count:students.length};
  }
  function financeTopKpisMarkupV146(month){
    const k=paymentKpisV146(month);
    return `<section class="finance-kpi-grid-v146" aria-label="Resumen económico del mes">
      <article><small>Total previsto</small><strong>${money(k.total)}</strong><span>${safe(monthLabel(month))}</span></article>
      <article><small>Pagados</small><strong>${k.paid}</strong><span>mensualidades confirmadas</span></article>
      <article class="${k.pending?'is-warn':''}"><small>Pendientes</small><strong>${k.pending}</strong><span>en plazo o sin confirmar</span></article>
      <article class="${k.late?'is-danger':''}"><small>Retrasados</small><strong>${k.late}</strong><span>requieren revisión</span></article>
      ${k.paused?`<article><small>En pausa</small><strong>${k.paused}</strong><span>excluidos del total</span></article>`:''}
    </section>`;
  }
  function financeStudentCardV146(s={}, month=defaultBillingMonth(), selected=null){
    const m=financeStudentMetricsV146(s,month);
    const family=familyGroupForStudent(s);
    const familyLabel=family.length>1 ? `${family.length} hermanos/as` : 'Individual';
    const paidText=m.paused?'En pausa':m.status.label;
    const amount=m.paused?0:m.calc.amount;
    return `<button type="button" class="finance-student-card-v146 status-${safe(m.status.key)} ${String(selected?.id)===String(s.id)?'is-selected':''}" data-t16-select-student="${safe(s.id)}" data-student-name="${safe((displayName(s)+' '+(s.username||'')+' '+academicLine(s)+' '+(s.family_name||'')).toLowerCase())}">
      ${studentAvatarMarkup(s,'finance-student-avatar-v146')}
      <span class="finance-student-main-v146"><strong>${safe(displayName(s))}</strong><small>${safe(academicLine(s))}</small><em>${safe(familyLabel)} · ${safe(paymentModeLabel(s))}</em></span>
      <span class="finance-student-amount-v146"><strong>${money(amount)}</strong><small>${safe(paidText)}</small></span>
    </button>`;
  }
  function attendanceStudentCardV146(s={}, month=defaultBillingMonth(), selected=null){
    const c=calculatePaymentAmount(s.id,month);
    const active=activePauseFor(s.id);
    const total=Math.max(1,Number(c.activeDays||0));
    const percent=Math.round((Number(c.present||0)/total)*100);
    const tone=active?'paused':(c.absent>2?'danger':(c.absent>0?'warn':'ok'));
    return `<button type="button" class="attendance-student-card-v146 is-${safe(tone)} ${String(selected?.id)===String(s.id)?'is-selected':''}" data-t16-select-student="${safe(s.id)}" data-student-name="${safe((displayName(s)+' '+(s.username||'')+' '+academicLine(s)).toLowerCase())}">
      ${studentAvatarMarkup(s,'finance-student-avatar-v146')}
      <span class="finance-student-main-v146"><strong>${safe(displayName(s))}</strong><small>${safe(academicLine(s))}</small><em>${active?'Pausa activa':`${c.present} asistencias · ${c.absent} faltas · ${c.justified} justificadas`}</em></span>
      <span class="attendance-percent-v146"><strong>${active?'—':percent+'%'}</strong><small>${c.activeDays||0} clases</small></span>
    </button>`;
  }
  function financeSearchBoxV146(placeholder='Filtrar alumnado...'){
    return `<label class="finance-search-v146"><span>Buscar</span><input class="t16-search" type="search" placeholder="${safe(placeholder)}" data-t16-student-search></label>`;
  }
  function paymentsContent(){
    const students=State.data.students||[];
    const selected=students.find(s=>String(s.id)===String(State.selectedStudentId))||students[0]||null;
    if(!State.selectedStudentId && selected) State.selectedStudentId=selected.id;
    const month=(State.billingMonth||defaultBillingMonth()); State.billingMonth=month;
    const family=selected ? familyPaymentCard(selected, month) : '';
    return `<section class="teacher-finance-v146 payments-v146">
      <header class="finance-hero-clean-v146 window-panel"><div><p class="eyebrow">Gestión económica</p><h2>Pagos</h2><p>Una vista limpia para revisar importes, familias, mensualidades pendientes y recibís sin paneles solapados.</p></div><button type="button" class="secondary-btn tool-jump-btn" data-t16-tool="attendance">Ir a asistencia</button></header>
      <section class="window-panel finance-toolbar-v146">${paymentMonthNavigator(month,'Mes económico')}</section>
      ${financeTopKpisMarkupV146(month)}
      <div class="finance-layout-v146">
        <section class="window-panel finance-student-list-v146"><div class="section-heading"><h3>Alumnado y familias</h3><span>${students.length}</span></div>${financeSearchBoxV146('Filtrar por nombre, curso o familia...')}<div class="finance-student-grid-v146">${students.length?students.map(s=>financeStudentCardV146(s,month,selected)).join(''):'<div class="empty-state">No hay alumnado cargado.</div>'}</div></section>
        <section class="window-panel finance-student-detail-v146"><div class="section-heading"><h3>${selected?`Ficha económica de ${safe(displayName(selected))}`:'Ficha económica'}</h3><span>${safe(monthLabel(month))}</span></div>${selected?`${family}${paymentEditor(selected,month)}`:'<div class="empty-state">Selecciona un alumno.</div>'}</section>
      </div>
      <section class="window-panel finance-history-v146"><details><summary>Ver histórico mensual completo y pagos familiares agrupados</summary>${paymentSummary(month)}</details></section>
    </section>`;
  }
  function attendanceContent(){
    const students=State.data.students||[];
    const selected=students.find(s=>String(s.id)===String(State.selectedStudentId))||students[0]||null;
    if(!State.selectedStudentId && selected) State.selectedStudentId=selected.id;
    const month=(State.billingMonth||defaultBillingMonth()); State.billingMonth=month;
    return `<section class="teacher-attendance-v146 attendance-v146">
      <header class="finance-hero-clean-v146 window-panel"><div><p class="eyebrow">Seguimiento de clases</p><h2>Asistencia y pausas</h2><p>Control mensual claro: asistencias, faltas, justificaciones y pausas que afectan al cálculo económico.</p></div><button type="button" class="secondary-btn tool-jump-btn" data-t16-tool="payments">Ir a pagos</button></header>
      <section class="window-panel finance-toolbar-v146">${paymentMonthNavigator(month,'Mes de asistencia')}</section>
      ${attendanceSummary(month)}
      <div class="finance-layout-v146 attendance-layout-v146">
        <section class="window-panel finance-student-list-v146"><div class="section-heading"><h3>Alumnado</h3><span>${students.length}</span></div>${financeSearchBoxV146('Filtrar alumnado...')}<div class="finance-student-grid-v146">${students.length?students.map(s=>attendanceStudentCardV146(s,month,selected)).join(''):'<div class="empty-state">No hay alumnado cargado.</div>'}</div></section>
        <section class="window-panel finance-student-detail-v146 attendance-student-detail-v146"><div class="section-heading"><h3>${selected?`Asistencia de ${safe(displayName(selected))}`:'Asistencia'}</h3><span>${safe(monthLabel(month))}</span></div>${selected?attendanceEditor(selected,month):'<div class="empty-state">Selecciona un alumno.</div>'}</section>
      </div>
    </section>`;
  }
  function paymentEditor(s,month){
    const bill=(State.data.billing||[]).find(b=>String(b.user_id)===String(s.id))||{};
    const pay=paymentMonthRecord(s.id,month);
    const calc=calculatePaymentAmount(s.id,month);
    const pausedBilling=paymentPausedForMonth(s.id,month);
    const method=pay.payment_method || '';
    const status=paymentSummaryStatus(pay, month, pausedBilling);
    return `<section class="payment-editor-v146">
      <div class="payment-total-card-v146 status-${safe(status.key)}"><div><small>Importe calculado</small><strong>${money(pausedBilling?0:calc.amount)}</strong><p>${safe(calc.detail)}${pausedBilling?' · mes excluido por pausa':''}</p></div><span class="payment-status-pill payment-status-${safe(status.key)}">${safe(status.label)}</span></div>
      <form id="t16BillingForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="premium-form finance-payment-form-v146">
        <input type="hidden" name="userId" value="${safe(s.id)}"><input type="hidden" name="month" value="${safe(month)}">
        <div class="finance-form-section-v146"><h4>Tarifa</h4><div class="finance-form-grid-v146"><label>Tipo de tarifa<select name="tariffType"><option value="group" ${bill.tariff_type==='group'||!bill.tariff_type?'selected':''}>Grupal, cuota fija mensual</option><option value="individual" ${bill.tariff_type==='individual'?'selected':''}>Individual, pago por clase asistida</option><option value="mixed" ${bill.tariff_type==='mixed'?'selected':''}>Mixta, cuota fija + clases individuales</option></select></label><label>Cuota fija (€)<input name="monthlyFee" type="number" min="0" step="0.01" value="${safe(bill.monthly_fee??'')}"></label><label>Clase individual (€)<input name="classRate" type="number" min="0" step="0.01" value="${safe(bill.class_rate??'')}"></label></div></div>
        <div class="finance-form-section-v146"><h4>Estado del mes</h4><div class="finance-form-grid-v146"><label class="check-line"><input type="checkbox" name="paid" ${pay.paid?'checked':''}> Pagado</label><label>Día de pago<input name="paidDate" type="date" value="${safe(pay.paid_date||'')}"></label><label>Forma de pago<select name="paymentMethod"><option value="" ${!method?'selected':''}>Sin indicar</option><option value="cash" ${method==='cash'?'selected':''}>Efectivo</option><option value="bizum" ${method==='bizum'?'selected':''}>Bizum</option></select></label></div></div>
        <label>Notas privadas de pago<textarea name="paymentNotes" rows="3" placeholder="Observaciones internas de pago, familia o acuerdo económico.">${safe(bill.payment_notes||'')}</textarea></label>
        <div class="finance-actions-v146"><button class="primary-btn" type="submit">Guardar pago</button><button class="secondary-btn" type="button" onclick="window.TribecaPrintPaymentReceipt && window.TribecaPrintPaymentReceipt('${safe(s.id)}','${safe(month)}')">Recibí del mes</button><button class="secondary-btn" type="button" onclick="window.TribecaPrintQuarterReceipts && window.TribecaPrintQuarterReceipts('${safe(s.id)}','${safe(month)}')">Recibís del trimestre</button></div>
      </form>
      <details class="finance-history-drawer-v146"><summary>Histórico económico de ${safe(displayName(s))}</summary>${paymentStudentHistory(s.id)}</details>
    </section>`;
  }
  function attendanceEditor(s,month){
    const days=monthScheduleDays(s.id,month,{includePaused:true});
    const calc=calculatePaymentAmount(s.id,month);
    const grouped=days.reduce((map,d)=>{ const k=String(d.date).slice(0,7); if(!map[k]) map[k]=[]; map[k].push(d); return map; },{});
    const dayCards=days.length?days.map(d=>{ const rec=(State.data.attendance||[]).find(a=>String(a.user_id)===String(s.id) && a.class_date===d.date && String(a.scheduled_start||'').slice(0,5)===d.start); const status=d.paused?'paused':(rec?.status||'absent'); return `<article class="attendance-day-v146 is-${safe(status)} is-${safe(d.type)}" ${d.paused?'data-paused="true"':''} data-t22-attendance-toggle data-user="${safe(s.id)}" data-date="${safe(d.date)}" data-start="${safe(d.start)}" data-end="${safe(d.end)}" data-class-type="${safe(d.type)}" data-current="${safe(status)}"><header><strong>${fmtLongDate(d.date)}</strong><span>${safe(d.start)}-${safe(d.end)}</span></header><p>${d.type==='individual'?'Clase individual':'Clase grupal'}</p><em>${status==='present'?'Asistió':status==='justified'?'Justificada':status==='paused'?'Pausa':'Falta'}</em>${d.paused?'<small>Bloqueada por pausa</small>':`<div class="attendance-actions-v146"><button type="button" data-t16-attendance="present" data-user="${safe(s.id)}" data-date="${safe(d.date)}" data-start="${safe(d.start)}" data-end="${safe(d.end)}" data-class-type="${safe(d.type)}">Asistió</button><button type="button" data-t16-attendance="absent" data-user="${safe(s.id)}" data-date="${safe(d.date)}" data-start="${safe(d.start)}" data-end="${safe(d.end)}" data-class-type="${safe(d.type)}">Falta</button><button type="button" data-t16-attendance="justified" data-user="${safe(s.id)}" data-date="${safe(d.date)}" data-start="${safe(d.start)}" data-end="${safe(d.end)}" data-class-type="${safe(d.type)}">Justificada</button></div>`}</article>`; }).join(''):'<div class="empty-state">Este alumno no tiene horario asignado para este mes.</div>';
    return `<section class="attendance-editor-clean-v146">
      <div class="attendance-stats-v146"><article><small>Asistencias</small><strong>${calc.present}</strong></article><article><small>Faltas</small><strong>${calc.absent}</strong></article><article><small>Justificadas</small><strong>${calc.justified}</strong></article><article><small>Pausadas</small><strong>${calc.paused||0}</strong></article><article><small>Importe asociado</small><strong>${money(calc.amount)}</strong></article></div>
      <details class="pause-drawer-v146"><summary>Pausas temporales de asistencia y acceso</summary>${paymentPausePanel(s,month)}</details>
      <div class="attendance-help-v146"><strong>Registro rápido</strong><p>Usa los botones de cada día. Los cambios se guardan al momento y actualizan el cálculo económico.</p></div>
      <div class="attendance-month-grid-v146">${dayCards}</div>
    </section>`;
  }
  function attendanceSummary(month){
    const students=State.data.students||[];
    let present=0, absent=0, justified=0, paused=0, withSchedule=0;
    students.forEach(s=>{ const c=calculatePaymentAmount(s.id,month); present+=Number(c.present||0); absent+=Number(c.absent||0); justified+=Number(c.justified||0); paused+=Number(c.paused||0); if(Number(c.totalDays||0)>0) withSchedule++; });
    return `<section class="attendance-kpi-grid-v146"><article><small>Alumnado con horario</small><strong>${withSchedule}</strong><span>${safe(monthLabel(month))}</span></article><article><small>Asistencias</small><strong>${present}</strong><span>registradas</span></article><article class="${absent?'is-warn':''}"><small>Faltas</small><strong>${absent}</strong><span>pendientes de revisar</span></article><article><small>Justificadas</small><strong>${justified}</strong><span>no computan como asistencia</span></article>${paused?`<article><small>Pausadas</small><strong>${paused}</strong><span>excluidas del cálculo</span></article>`:''}</section>`;
  }
  function paymentPausePanel(s, month){
    const active=activePauseFor(s.id); const pauses=pauseRecords(s.id); const upcoming=pauses.find(p=>p.active!==false && !pauseCoversDate(p) && String(p.start_date||'')>todayIso()); const editing=active||upcoming||{};
    const status=active?`<div class="pause-active-card"><strong>Asistencia pausada</strong><p>${safe(pauseStatusText(s.id))}. El acceso del alumno al aula virtual queda bloqueado mientras dure la pausa.</p></div>`:(upcoming?`<div class="pause-active-card is-upcoming"><strong>Pausa programada</strong><p>Programada desde ${safe(fmtDate(upcoming.start_date))}${upcoming.end_date?` hasta ${safe(fmtDate(upcoming.end_date))}`:' hasta reactivación manual'}.</p></div>`:'<p class="meta">Puedes programar una pausa por fechas o dejarla abierta para activarla y desactivarla manualmente. La pausa se crea solo si marcas expresamente “Pausa activa”.</p>');
    return `<section class="student-pause-panel"><h4>Pausa temporal de asistencia y acceso</h4>${status}<form id="t50PauseForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid"><input type="hidden" name="pauseId" value="${safe(editing.id||'')}"><input type="hidden" name="userId" value="${safe(s.id)}"><div class="window-grid"><label>Tipo de pausa<select name="mode"><option value="scheduled" ${editing.mode!=='manual'?'selected':''}>Programada por fechas</option><option value="manual" ${editing.mode==='manual'?'selected':''}>Manual, hasta reactivación</option></select></label><label class="check-line"><input type="checkbox" name="active" ${(active || (editing.id && editing.active!==false))?'checked':''}> Pausa activa</label></div><div class="window-grid"><label>Fecha de inicio<input name="startDate" type="date" value="${safe(editing.start_date||todayIso())}" required></label><label>Fecha de fin<input name="endDate" type="date" value="${safe(editing.end_date||'')}"><small>Déjala en blanco si la pausa será manual.</small></label></div><label>Motivo o nota visible para el alumno cuando intente iniciar sesión<textarea name="reason" rows="2" placeholder="Ej.: pausa de verano, viaje familiar, descanso temporal... El alumno verá este texto al intentar entrar en el aula.">${safe(editing.reason||'')}</textarea><small class="field-help">No escribas aquí nada que no quieras que el alumno vea en la pantalla de acceso pausado.</small></label><div class="inline-actions"><button class="primary-btn" type="submit">Guardar pausa</button>${active?`<button class="danger-btn" type="button" data-t50-end-pause="${safe(active.id)}">Reanudar asistencia desde hoy</button>`:''}</div></form>${pauses.length?`<details class="pause-history"><summary>Histórico de pausas (${pauses.length})</summary><table class="premium-table compact"><thead><tr><th>Inicio</th><th>Fin</th><th>Estado</th><th>Motivo visible</th></tr></thead><tbody>${pauses.map(p=>`<tr><td>${p.start_date?fmtDate(p.start_date):'—'}</td><td>${p.end_date?fmtDate(p.end_date):'Abierta'}</td><td>${pauseCoversDate(p)?'Activa':'Finalizada/programada'}</td><td>${safe(p.reason||'—')}</td></tr>`).join('')}</tbody></table></details>`:''}</section>`;
  }
  function monthScheduleDays(userId,month,opts={}){ const [y,m]=String(month).split('-').map(Number); if(!y||!m) return []; const season=opts.season||activeScheduleSeasonForStudent(userId); const sched=(State.data.schedules||[]).filter(x=>x.user_id===userId && x.active!==false && (opts.allSeasons || scheduleRecordSeason(x)===season)); const last=new Date(y,m,0).getDate(); const out=[]; for(let d=1; d<=last; d++){ const date=new Date(y,m-1,d); const iso=toIso(date); const isPaused=pausedOnDate(userId,iso); if(isPaused && !opts.includePaused) continue; const weekday=((date.getDay()+6)%7)+1; sched.filter(s=>Number(s.weekday)===weekday).forEach(s=>out.push({date:iso, start:String(s.start_time||'').slice(0,5), end:String(s.end_time||'').slice(0,5), type:String(s.class_type||s.type||'group'), paused:isPaused})); } return out; }
  function calculatePaymentAmount(userId,month){ const bill=(State.data.billing||[]).find(b=>b.user_id===userId)||{}; const allDays=monthScheduleDays(userId,month,{includePaused:true}); const activeDays=allDays.filter(d=>!d.paused); const att=(State.data.attendance||[]).filter(a=>a.user_id===userId && String(a.class_date||'').startsWith(month) && !pausedOnDate(userId,a.class_date)); const present=att.filter(a=>a.status==='present').length; const absent=att.filter(a=>a.status==='absent').length; const justified=att.filter(a=>a.status==='justified').length; const fixed=Number(bill.monthly_fee||0); const rate=Number(bill.class_rate||0); const individualPresent=activeDays.filter(d=>d.type==='individual' && att.some(a=>a.status==='present' && a.class_date===d.date && String(a.scheduled_start||'').slice(0,5)===d.start)).length; const totalGroupDays=allDays.filter(d=>d.type!=='individual').length; const activeGroupDays=activeDays.filter(d=>d.type!=='individual').length; const paused=allDays.filter(d=>d.paused).length; const fixedProrated=totalGroupDays>0 && activeGroupDays<totalGroupDays ? fixed*(activeGroupDays/totalGroupDays) : fixed; let amount=0, detail=''; if(bill.tariff_type==='individual'){ amount=present*rate; detail=`${present} asistencias activas × ${money(rate)}`; } else if(bill.tariff_type==='mixed'){ amount=fixedProrated+(individualPresent*rate); detail=`Cuota ${activeGroupDays<totalGroupDays?'prorrateada ':''}${money(fixedProrated)} + ${individualPresent} clases individuales × ${money(rate)}`; } else { amount=fixedProrated; detail=activeGroupDays<totalGroupDays?`Cuota fija prorrateada: ${activeGroupDays}/${totalGroupDays} clases activas`:'Cuota fija mensual'; } if(paused && amount===0) detail='Mes en pausa, sin clases facturables'; return {amount,detail,present,individualPresent,fixedGroupDays:activeGroupDays,absent,justified,paused,totalDays:allDays.length,activeDays:activeDays.length}; }
  function studentPaymentAmount(userId,month){ const c=calculatePaymentAmount(userId,month); const pay=paymentMonthRecord(userId,month); return `<strong>Total calculado: ${money(c.amount)}</strong><p>${safe(c.detail)} · Faltas: ${c.absent} · Justificadas: ${c.justified} · Pausadas: ${c.paused||0} · ${pay.paid?'Pagado '+(pay.paid_date?fmtDate(pay.paid_date):''):'Pendiente de pago'}</p>`; }
  function paymentStudentHistory(userId){
    const pauseMonths=pauseRecords(userId).flatMap(p=>{ const start=String(p.start_date||todayIso()).slice(0,7); const end=String(p.end_date||start).slice(0,7); return [start,end]; });
    const months=[...new Set([...(State.data.paymentMonths||[]).filter(p=>p.user_id===userId).map(p=>String(p.month).slice(0,7)), ...pauseMonths, State.billingMonth||defaultBillingMonth()])].filter(Boolean).sort().reverse();
    return `<table class="premium-table compact"><thead><tr><th>Mes</th><th>Importe</th><th>Estado</th><th>Forma de pago</th><th>Día de pago</th><th>Pausas</th><th>Recibí</th></tr></thead><tbody>${months.map(m=>{ const c=calculatePaymentAmount(userId,m); const p=paymentMonthRecord(userId,m); const pausedBilling=paymentPausedForMonth(userId,m); const pauses=pauseMonthOverlap(userId,m).length; return `<tr class="${pausedBilling?'is-paused-row':''}"><td>${safe(monthLabel(m))}</td><td>${money(pausedBilling?0:c.amount)}</td><td>${pausedBilling?'En pausa, excluido':p.paid?'Pagado':'Pendiente'}</td><td>${safe(paymentMethodLabel(p.payment_method))}</td><td>${p.paid_date?fmtDate(p.paid_date):'—'}</td><td>${pauses?`${pauses} pausa/s`:c.paused?`${c.paused} clase/s`: '—'}</td><td><button type="button" class="secondary-btn compact-btn" onclick="window.TribecaPrintPaymentReceipt && window.TribecaPrintPaymentReceipt('${safe(userId)}','${safe(m)}')">Descargar</button></td></tr>`; }).join('')}</tbody></table>`;
  }

  function studentFamilyKey(s={}){
    return String(s.family_group_id || s.family_name || '').trim();
  }
  function familyGroupForStudent(s={}){
    const key=studentFamilyKey(s);
    if(!key) return [];
    return (State.data.students||[]).filter(x=>studentFamilyKey(x) && studentFamilyKey(x).toLowerCase()===key.toLowerCase()).sort((a,b)=>displayName(a).localeCompare(displayName(b),'es'));
  }
  function familyPaymentCard(s={}, month=defaultBillingMonth()){
    const members=familyGroupForStudent(s);
    if(members.length<2) return '';
    const rows=members.map(st=>{ const calc=calculatePaymentAmount(st.id, month); const pay=paymentMonthRecord(st.id,month); return {st,calc,pay,paused:paymentPausedForMonth(st.id,month)}; });
    const total=rows.reduce((sum,r)=>sum+(r.paused?0:Number(r.calc.amount||0)),0);
    return `<section class="window-panel family-payment-card-v144"><div><p class="eyebrow">Pago familiar único</p><h3>${safe(s.family_name || s.family_group_id || 'Familia')}</h3><p class="meta">Puedes ver el importe total familiar y el desglose individual de cada hermano/a.</p></div><strong>${money(total)}</strong><table class="premium-table compact-table"><thead><tr><th>Alumno/a</th><th>Importe individual</th><th>Estado</th></tr></thead><tbody>${rows.map(r=>{ const status=paymentSummaryStatus(r.pay, month, r.paused); return `<tr><td>${safe(displayName(r.st))}</td><td>${money(r.paused?0:r.calc.amount)}</td><td><span class="payment-status-pill payment-status-${safe(status.key)}">${safe(status.label)}</span></td></tr>`; }).join('')}</tbody></table></section>`;
  }
  function familySummaryRows(month){
    const groupsMap=new Map();
    (State.data.students||[]).forEach(s=>{ const key=studentFamilyKey(s); if(!key) return; if(!groupsMap.has(key.toLowerCase())) groupsMap.set(key.toLowerCase(), {label:s.family_name||key, members:[]}); groupsMap.get(key.toLowerCase()).members.push(s); });
    return [...groupsMap.values()].filter(g=>g.members.length>1).map(g=>{ const total=g.members.reduce((sum,s)=>sum+(paymentPausedForMonth(s.id,month)?0:Number(calculatePaymentAmount(s.id,month).amount||0)),0); return `<tr><td>${safe(g.label)}</td><td>${g.members.map(displayName).map(safe).join('<br>')}</td><td>${money(total)}</td></tr>`; }).join('');
  }

  function paymentSummary(month){
    const students=State.data.students||[];
    let total=0, paidCount=0, pendingCount=0, lateCount=0, pausedCount=0;
    const rows=students.map(s=>{
      const bill=(State.data.billing||[]).find(b=>b.user_id===s.id)||{};
      const c=calculatePaymentAmount(s.id,month);
      const pay=paymentMonthRecord(s.id,month);
      const pausedBilling=paymentPausedForMonth(s.id,month);
      if(!pausedBilling) total+=c.amount;
      const pText=pauseMonthOverlap(s.id,month).length?' · pausa registrada':'';
      const status=paymentSummaryStatus(pay, month, pausedBilling);
      if(status.key==='paid') paidCount++;
      else if(status.key==='late') lateCount++;
      else if(status.key==='pending') pendingCount++;
      else if(status.key==='paused') pausedCount++;
      return `<tr class="payment-status-row payment-status-${safe(status.key)} ${pText?'is-paused-row':''}">
        <td>${safe(displayName(s))}${pausedBilling?'<br><small>En pausa, excluido de pagos esperados</small>':pText?'<br><small>Con pausa</small>':''}</td>
        <td>${bill.tariff_type==='mixed'?'Mixta':bill.tariff_type==='individual'?'Individual':'Grupal'}</td>
        <td>${c.present}</td>
        <td>${pausedBilling?money(0):money(c.amount)}</td>
        <td><span class="payment-status-pill payment-status-${safe(status.key)}">${safe(status.label)}</span><br><small>${safe(status.detail)} · ${safe(paymentModeLabel(s))}${pay.payment_method?` · ${safe(paymentMethodLabel(pay.payment_method))}`:''}</small></td>
      </tr>`;
    }).join('');
    return `<label>Mes<input type="month" value="${safe(month)}" data-t16-billing-month></label>
      <div class="payment-grand-total">Total previsto: ${money(total)}</div>
      <div class="payment-status-legend"><span class="payment-status-pill payment-status-paid">Pagados: ${paidCount}</span><span class="payment-status-pill payment-status-pending">Pendientes: ${pendingCount}</span><span class="payment-status-pill payment-status-late">Retrasados: ${lateCount}</span>${pausedCount?`<span class="payment-status-pill payment-status-paused">En pausa: ${pausedCount}</span>`:''}</div>
      <p class="meta">El total previsto excluye al alumnado en pausa. El estado “retrasado” se aplica si sigue pendiente después del día 10 del mes siguiente.</p>
      ${familySummaryRows(month)?`<h4>Pagos familiares agrupados</h4><table class="premium-table payment-family-table-v144"><thead><tr><th>Familia</th><th>Alumnado</th><th>Total familiar</th></tr></thead><tbody>${familySummaryRows(month)}</tbody></table>`:''}
      <h4>Histórico total mensual</h4>
      <div class="inline-actions"><button type="button" class="secondary-btn" onclick="window.TribecaPrintPaymentsPdf && window.TribecaPrintPaymentsPdf('month')">Descargar histórico mensual en PDF</button><button type="button" class="secondary-btn" onclick="window.TribecaPrintTribecaDocument && window.TribecaPrintTribecaDocument('payments-month',{month:'${safe(month)}'})">PDF mensual completo</button></div>
      <table class="premium-table payment-summary-table"><thead><tr><th>Alumno/a</th><th>Tarifa</th><th>Asistencias</th><th>Importe</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function money(v){ return `${Number(v||0).toFixed(2).replace('.',',')} €`; }
  async function saveBilling(form){ const fd=new FormData(form); const rec={user_id:fd.get('userId'), tariff_type:fd.get('tariffType'), monthly_fee:fd.get('monthlyFee')?Number(fd.get('monthlyFee')):0, class_rate:fd.get('classRate')?Number(fd.get('classRate')):0, payment_notes:fd.get('paymentNotes')||'', updated_at:new Date().toISOString()}; const paymentMethod=fd.get('paymentMethod')||null; const pay={user_id:fd.get('userId'), month:fd.get('month')||State.billingMonth||defaultBillingMonth(), paid:!!fd.get('paid'), paid_date:fd.get('paidDate')||null, updated_at:new Date().toISOString()}; const r=await State.client.rpc('tribeca_save_payment_v28',{p_billing:rec,p_month:pay}); if(r.error) throw r.error; await maybe(table('payment_months').update({payment_method:paymentMethod, updated_at:new Date().toISOString()}).eq('user_id',pay.user_id).eq('month',pay.month)); await log('payment','Tarifa o pago actualizado',{student:studentName(rec.user_id),month:pay.month,payment_method:paymentMethod}); await loadData(true); toast('Pago guardado.'); rerender(); }
  async function saveStudentPause(form){ const fd=new FormData(form); const id=String(fd.get('pauseId')||'').trim(); const userId=String(fd.get('userId')||'').trim(); const start=String(fd.get('startDate')||todayIso()).slice(0,10); const end=String(fd.get('endDate')||'').slice(0,10)||null; if(end && end < start) throw new Error('La fecha de fin no puede ser anterior a la fecha de inicio.'); const active=!!fd.get('active'); if(!active && !id) throw new Error('Marca “Pausa activa” para crear una nueva pausa.'); const rec={user_id:userId,start_date:start,end_date:end,active,mode:fd.get('mode')||'scheduled',reason:String(fd.get('reason')||'').trim()||null,updated_at:new Date().toISOString()}; let error; if(id){ ({error}=await table('student_pauses').update(rec).eq('id',id)); } else { rec.created_by=State.profile.id; ({error}=await table('student_pauses').insert(rec)); } if(error) throw error; await log('pause','Pausa de asistencia actualizada',{student:studentName(userId),start,end,active}); await loadData(true); toast(active?'Pausa guardada. El acceso del alumno quedará bloqueado durante el período indicado.':'Pausa desactivada.'); rerender(); }
  async function endStudentPause(id){ const rec=(State.data.studentPauses||[]).find(p=>p.id===id); if(!rec) return toast('No se encontró la pausa.'); const {error}=await table('student_pauses').update({active:false,end_date:todayIso(),updated_at:new Date().toISOString()}).eq('id',id); if(error) return toast(error.message || 'No se pudo finalizar la pausa.'); await log('pause','Pausa finalizada',{student:studentName(rec.user_id)}); await loadData(true); toast('Pausa finalizada. El alumno podrá volver a acceder.'); rerender(); }
  async function saveAttendance(btn){ if(pausedOnDate(btn.dataset.user, btn.dataset.date)) return toast('Este día está dentro de una pausa y no cuenta como asistencia ni como falta.'); const rec={user_id:btn.dataset.user, class_date:btn.dataset.date, scheduled_start:btn.dataset.start||null, scheduled_end:btn.dataset.end||null, class_type:btn.dataset.classType||'group', status:btn.dataset.t16Attendance, updated_at:new Date().toISOString()}; const { error } = await State.client.from('attendance_records').upsert(rec,{onConflict:'user_id,class_date,scheduled_start'}); if(error) throw error; await loadData(true); rerender(); }
  async function toggleAttendance(card){ if(card.dataset.paused==='true' || pausedOnDate(card.dataset.user, card.dataset.date)) return toast('Este día está pausado y se excluye del cálculo de asistencia y facturación.'); const current=card.dataset.current || 'absent'; const next=current==='present'?'absent':'present'; const rec={user_id:card.dataset.user, class_date:card.dataset.date, scheduled_start:card.dataset.start||null, scheduled_end:card.dataset.end||null, class_type:card.dataset.classType||'group', status:next, updated_at:new Date().toISOString()}; const { error } = await State.client.from('attendance_records').upsert(rec,{onConflict:'user_id,class_date,scheduled_start'}); if(error) throw error; await loadData(true); rerender(); }


  function messagesContent(){
    const p=State.profile;
    const all=(State.data.messages||[]).filter(m=>!(m.sender_id===p.id&&m.deleted_by_sender) && !(m.recipient_id===p.id&&m.deleted_by_recipient));
    const inbox=all.filter(m=>m.recipient_id===p.id&&!m.archived);
    const sent=all.filter(m=>m.sender_id===p.id);
    const archived=all.filter(m=>m.archived && (m.sender_id===p.id||m.recipient_id===p.id));
    const unread=inbox.filter(m=>!m.read_at).length;
    const studentOptions=(State.data.students||[]).map(s=>`<option value="${safe(s.id)}">${safe(displayName(s))}${s.course?` · ${safe(s.course)}`:''}</option>`).join('');
    const compose = roleTeacher()
      ? `<form id="t16TeacherMessageForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="focus-message-compose email-compose"><label>Alumno/a<select name="recipientId" required>${studentOptions}</select></label><label>Asunto<input name="subject" maxlength="100" required placeholder="Escribe un asunto claro"></label><input type="hidden" name="fontSize" value="16"><input type="hidden" name="textColor" value="#1d251d"><label class="focus-message-body">Mensaje<textarea name="body" maxlength="3000" rows="7" required placeholder="Escribe el mensaje privado para el alumno o alumna"></textarea></label><label class="focus-message-attachment">Adjuntar documentos o imágenes<input name="messageFiles" type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"><input type="hidden" name="attachmentsJson" value=""><small data-message-file-name></small></label><button class="primary-btn" type="submit">Enviar mensaje</button></form>`
      : `<form id="t16StudentMessageForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="focus-message-compose email-compose"><label>Motivo<select name="reason"><option>Necesito ayuda</option><option>No puedo asistir a clase</option><option>Tengo una duda sobre una tarea</option><option>Quiero revisar una calificación</option><option>Otro motivo</option></select></label><label>Asunto<input name="subject" maxlength="100" required placeholder="Resume el motivo"></label><input type="hidden" name="fontSize" value="16"><input type="hidden" name="textColor" value="#1d251d"><label class="focus-message-body">Mensaje<textarea name="body" maxlength="2000" rows="7" required placeholder="Explica tu duda o aviso"></textarea></label><label class="focus-message-attachment">Adjuntar documentos o imágenes<input name="messageFiles" type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"><input type="hidden" name="attachmentsJson" value=""><small data-message-file-name></small></label><button class="primary-btn" type="submit">Enviar a la profesora</button></form>`;
    const box = (name, title, rows, empty) => `<div class="mail-box" data-mail-box-view="${name}" ${name==='inbox'?'':'hidden'}><header class="messages-box-head-v166"><h3>${title}</h3><small>${rows.length} mensaje${rows.length===1?'':'s'}</small></header>${rows.length?rows.map(messageCard).join(''):`<div class="empty-state">${empty}</div>`}</div>`;
    return `<div class="mail-app mail-app-v107 tribeca-messages-v166">
      <section class="messages-focus-hero-v166 window-panel"><div><p class="eyebrow">Mensajes privados</p><h3>${roleTeacher()?'Comunicación directa con el alumnado':'Comunicación directa con la profesora'}</h3><p>Interfaz limpia, lectura cómoda y avisos por app cuando el dispositivo tiene las notificaciones activadas.</p></div><span>${unread?`${unread} sin leer`:'Todo al día'}</span></section>
      <aside class="mail-sidebar messages-sidebar-v166 window-panel"><h3>Mensajes</h3><button class="mail-tab is-active" type="button" data-mail-box="inbox">Recibidos <span>${unread}</span></button><button class="mail-tab" type="button" data-mail-box="sent">Enviados <span>${sent.length}</span></button><button class="mail-tab" type="button" data-mail-box="archived">Archivados <span>${archived.length}</span></button></aside>
      <section class="window-panel mail-list-panel mail-list-panel-v107 messages-list-v166">${box('inbox','Bandeja de entrada',inbox,'No hay mensajes recibidos.')}${box('sent','Enviados',sent,'No hay mensajes enviados.')}${box('archived','Archivados',archived,'No hay mensajes archivados.')}</section>
      <details class="window-panel teacher-option-drawer mail-compose-drawer messages-compose-v166"><summary><span>${roleTeacher()?'Escribir mensaje privado':'Mensaje para la profesora'}</span><em>Nuevo</em></summary><p class="meta">Los mensajes son privados. Si el destinatario ha activado las notificaciones de la app, recibirá un aviso push.</p>${compose}</details>
    </div>`;
  }
  function messageCard(m){
    const mine=m.sender_id===State.profile?.id;
    const atts=Array.isArray(m.attachments)?m.attachments:[];
    const who=mine?`Para ${safe(m.recipient_name||studentName(m.recipient_id))}`:`De ${safe(m.sender_name||studentName(m.sender_id))}`;
    const initial=(mine?(m.recipient_name||studentName(m.recipient_id)):(m.sender_name||studentName(m.sender_id))||'T').trim().charAt(0).toUpperCase() || 'T';
    return `<article class="mail-card message-card-v166 ${!m.read_at && !mine?'is-unread':''}"><div class="message-avatar-v166">${safe(initial)}</div><div class="message-card-main-v166"><header><strong>${safe(m.subject||'Sin asunto')}</strong><span>${who}</span></header><p style="font-size:${Number(m.font_size||16)}px;color:${safe(m.text_color||'inherit')}">${safe(m.body||'')}</p>${atts.length?`<div class="attachment-list">${atts.map(a=>`<a href="${safe(a.url)}" target="_blank" rel="noopener">📎 ${safe(a.name||'Archivo')}</a>`).join('')}</div>`:''}<footer><small>${fmtDT(m.created_at)}</small><div class="inline-actions">${!mine&&!m.read_at?`<button type="button" data-t28-mark-read="${safe(m.id)}">Marcar como leído</button>`:''}<button type="button" data-t16-archive-message="${safe(m.id)}">Archivar</button><button type="button" data-t28-delete-message="${safe(m.id)}">Eliminar</button></div></footer></div></article>`;
  }
  async function sendMessage(form, teacher=false){
    const fd=new FormData(form);
    let recipientId=fd.get('recipientId');
    let recipientName='Profesora';
    if(!teacher){
      const t=await maybe(table('profiles').select('id,full_name,username').eq('role','teacher').limit(1), []);
      recipientId=t?.[0]?.id;
      recipientName=displayName(t?.[0]);
    } else {
      recipientName=studentName(recipientId);
    }
    if(!recipientId) return toast('No se encontró destinatario.');
    let attachments=[];
    try{ attachments=fd.get('attachmentsJson')?JSON.parse(fd.get('attachmentsJson')):[]; }catch(_e){}
    const bodyRaw=String(fd.get('body')||'').trim();
    const payload={
      sender_id:State.profile.id,
      sender_name:displayName(State.profile),
      recipient_id:recipientId,
      recipient_name:recipientName,
      subject:String(fd.get('subject')||'').trim(),
      body:teacher?bodyRaw:`${fd.get('reason')}. ${bodyRaw}`,
      reason:fd.get('reason')||'',
      font_size:Number(fd.get('fontSize')||16),
      text_color:fd.get('textColor')||null,
      attachments,
      is_draft:false,
      archived:false
    };
    if(!payload.subject||!bodyRaw) return toast('Completa asunto y mensaje.');
    const rpc=await State.client.rpc('tribeca_send_private_message_v28',{p_payload:payload});
    if(rpc.error) throw rpc.error;
    await log('message','Mensaje enviado',{subject:payload.subject});
    const pushResult = await tribecaDispatchPushNotification('message', {
      title: `Nuevo mensaje de ${displayName(State.profile)}`,
      body: payload.subject || payload.body || 'Tienes un mensaje nuevo en Tribeca Aula.',
      recipientIds: [recipientId],
      section: 'messages'
    });
    // v166: los avisos automáticos por email quedan desactivados; se usa solo notificación de la app.
    await loadData(true);
    if(roleTeacher() && pushResult && Number(pushResult.sent||0) <= 0) toast('Mensaje enviado. El alumno/a lo verá al abrir Tribeca Aula; para recibir aviso en la cortina debe activar las notificaciones de la app en su dispositivo.');
    else toast('Mensaje enviado.');
    form.reset();
    rerender();
  }

  function safeJsonArray(value) { return parseArrayField(value); }
  function normalizeAttachments(item={}) {
    const raw = item.attachments ?? item.attachment ?? item.files ?? item.attachment_url ?? item.file_url ?? [];
    if(Array.isArray(raw)) return raw.filter(Boolean);
    if(typeof raw === 'string') {
      const trimmed = raw.trim();
      if(!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : (parsed ? [parsed] : []);
      } catch(_e) {
        return [{ name: item.attachment_name || item.file_name || 'Archivo adjunto', url: trimmed, type: item.attachment_type || item.file_type || '' }];
      }
    }
    return raw && typeof raw === 'object' ? [raw] : [];
  }
  function attachmentList(item={}) {
    const attachments = normalizeAttachments(item);
    if(!attachments.length) return '';
    return `<div class="attachment-list">${attachments.map((att, index) => {
      const url = att.url || att.href || att.path || att.publicUrl || att.public_url || '';
      const name = att.name || att.filename || att.file_name || `Archivo ${index + 1}`;
      const type = String(att.type || att.mime_type || '').toLowerCase();
      const thumb = url && /^image\//.test(type) ? `<img src="${safe(url)}" alt="">` : '';
      return url ? `<a class="attachment-pill" href="${safe(url)}" target="_blank" rel="noopener">${thumb}<span>📎 ${safe(name)}</span></a>` : `<span class="attachment-pill">📎 ${safe(name)}</span>`;
    }).join('')}</div>`;
  }
  function announcementScopeLabel(a={}) {
    const scope = a.target_scope || a.scope || 'all';
    if(['selected','user'].includes(scope)) {
      const count = safeJsonArray(a.target_user_ids).length;
      return count ? `${count} alumno${count===1?'':'s'} seleccionado${count===1?'':'s'}` : 'Alumnado seleccionado';
    }
    if(scope === 'class') return [a.center, a.stage, a.course].filter(Boolean).join(' · ') || 'Grupo concreto';
    if(scope === 'center') return a.center || 'Centro concreto';
    return 'Anuncio general';
  }
  function announcementSeenKey(id){ return `tribeca-ann-seen-${State.profile?.id||'anon'}-${id}`; }
  function announcementOldSeenKey(id){ return `tribeca-ann-seen-${id}`; }
  function announcementViewedKey(id){ return `tribeca-ann-viewed-${State.profile?.id||'anon'}-${id}`; }
  function announcementIsRead(a){ return !!(a?.id && (localStorage.getItem(announcementSeenKey(a.id)) || localStorage.getItem(announcementOldSeenKey(a.id)))); }
  function announcementIsViewed(a){ return !!(a?.id && localStorage.getItem(announcementViewedKey(a.id))); }
  function markAnnouncementViewed(id){ if(id) localStorage.setItem(announcementViewedKey(id), new Date().toISOString()); }
  function markAnnouncementRead(id){
    if(!id) return;
    localStorage.setItem(announcementSeenKey(id), new Date().toISOString());
    localStorage.setItem(announcementOldSeenKey(id), new Date().toISOString());
    markAnnouncementViewed(id);
    updateBadges();
  }
  function markAllAnnouncementsRead(){
    visibleAnnouncements().forEach(a=>markAnnouncementRead(a.id));
    toast('Anuncios marcados como leídos.');
    rerender();
  }
  function announcementsContent(){
    const rows=visibleAnnouncements();
    const firstViewIds = new Set(rows.filter(a=>!announcementIsViewed(a)).map(a=>String(a.id)));
    rows.forEach(a=>markAnnouncementViewed(a.id));
    const unread=rows.filter(a=>!announcementIsRead(a));
    const head=`<div class="announcements-head announcements-focus-head-v173"><div><p class="eyebrow">Modo foco</p><h3>Anuncios, avisos y noticias</h3><p class="meta">${unread.length?`${unread.length} anuncio${unread.length===1?'':'s'} pendiente${unread.length===1?'':'s'} de lectura.`:'No hay anuncios pendientes de lectura.'}</p></div><div class="announcements-head-actions-v173">${roleTeacher()?`<button type="button" class="primary-btn" data-t173-new-announcement>Nuevo anuncio</button>`:''}${rows.length?`<button type="button" class="secondary-btn" onclick="return window.TribecaMarkAllAnnouncementsRead(event)">Marcar todos como leídos</button>`:''}</div></div>`;
    return `<section class="window-panel announcements-panel">${head}${rows.length?rows.map(a=>{ const isNew=firstViewIds.has(String(a.id)); const unreadOne=!announcementIsRead(a); return `<article class="t16-publication announcement-card ${a.hidden?'is-hidden-item':''} ${isNew?'is-new-announcement':''}"><small>${isNew?'<span class="new-announcement-tag">Nuevo anuncio</span> ':''}${safe(announcementScopeLabel(a))}${a.scheduled_at?` · ${safe(scheduledLabel(a))}`:(a.created_at?` · ${fmtDT(a.created_at)}`:'')}${a.hidden?' · Oculto':''}</small><h3>${safe(a.title || 'Anuncio sin título')}</h3>${a.image_url?`<img src="${safe(a.image_url)}" alt="">`:''}<p style="font-size:${Number(a.font_size||16)}px">${safe(a.body||a.description||a.content||'')}</p>${a.link_url?`<a href="${safe(a.link_url)}" target="_blank" rel="noopener">Abrir enlace</a>`:''}${attachmentList(a)}<div class="inline-actions"><button type="button" data-t73-read-ann="${safe(a.id)}" onclick="return window.TribecaMarkAnnouncementReadDirect(this,event)" ${unreadOne?'':'disabled'}>${unreadOne?'Marcar como leído':'Leído'}</button>${roleTeacher()?`<button type="button" data-t32-edit-ann="${safe(a.id)}">Editar</button><button type="button" data-t16-toggle-ann="${safe(a.id)}">${a.hidden?'Mostrar':'Ocultar'}</button><button type="button" data-t16-delete-ann="${safe(a.id)}">Eliminar</button>`:''}</div></article>`; }).join(''):'<div class="empty-state">Todavía no hay anuncios publicados.</div>'}</section>`;
  }
  window.TribecaMarkAnnouncementReadDirect=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); markAnnouncementRead(btn?.dataset?.t73ReadAnn); toast('Anuncio marcado como leído.'); rerender(); return false; };
  window.TribecaMarkAllAnnouncementsRead=function(ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); markAllAnnouncementsRead(); return false; };

  function classUnitEditDrawer(u={}, s={}){
    if(!roleTeacher()) return '';
    return `<details class="class-unit-edit-drawer">
      <summary>Editar unidad</summary>
      <form class="class-unit-edit-form" data-t126-unit-edit-form method="post" action="javascript:void(0)" onsubmit="return window.TribecaClassroomSaveUnit(this,event)">
        <input type="hidden" name="unitId" value="${safe(u.id)}">
        <input type="hidden" name="classSubjectId" value="${safe(s.id||u.class_subject_id||'')}">
        <label><span>Título</span><input name="title" value="${safe(u.title||'')}" required></label>
        <label><span>Orden</span><input name="sortOrder" type="number" min="1" step="1" value="${safe(Number(u.sort_order||0)||'')}"></label>
        <label class="compact-check"><input type="checkbox" name="hidden" ${u.hidden?'checked':''}> <span>Unidad oculta para el alumnado</span></label>
        <div class="inline-actions"><button type="button" class="primary-btn" data-t126-save-unit onclick="return window.TribecaClassroomSaveUnit(this.closest('form'),event)">Guardar unidad</button><button type="button" data-t124-delete-unit="${safe(u.id)}" onclick="return window.TribecaClassroomDeleteUnit(this,event)">Eliminar unidad</button><span class="form-status class-unit-status" data-t126-unit-status></span></div>
      </form>
    </details>`;
  }
  function classUnitCreateForm(classSubjectId=''){
    if(!roleTeacher()) return '';
    return `<form class="class-unit-create-form window-panel" data-t126-unit-create-form method="post" action="javascript:void(0)" onsubmit="return window.TribecaClassroomAddUnit(this,event)">
      <input type="hidden" name="classSubjectId" value="${safe(classSubjectId)}">
      <label><span>Nueva unidad didáctica</span><input name="title" placeholder="Ejemplo: Unidad 3, Álgebra, Module 5..." required></label>
      <div class="inline-actions"><button type="button" class="primary-btn" data-t126-add-unit onclick="return window.TribecaClassroomAddUnit(this.closest('form'),event)">Añadir unidad</button><span class="form-status class-unit-status" data-t126-unit-status></span></div>
      <p class="meta">La unidad se añade sin sacarte de la materia.</p>
    </form>`;
  }
  function renderCurrentClassroomContext(){
    const opts=State.activeInlineOptions || {};
    if(State.activeInlineSection){
      renderInlineSection(State.activeInlineSection, opts);
      return;
    }
    if(State.currentClassSubjectId) renderInlineSection('classSubjectDetail', {classSubjectId:State.currentClassSubjectId, classId:State.currentClassId||'', subject:State.currentSubject||''});
    else rerender();
  }

  function classSubjectDetailContent(classSubjectId){
    const s=classSubjectById(classSubjectId || State.currentClassSubjectId);
    if(!s) return '<div class="empty-state premium-empty">No se encontró esta materia de clase.</div>';
    const c=classById(s.class_id) || {};
    const units=visibleClassUnitsForSubject(s.id).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0) || unitTitleOrder(a.title,b.title));
    const orphanMaterials=sortMaterialsAsc(materialsForClassSubject(s.id).filter(m=>!m.class_unit_id && !units.some(u=>String(m.unit_title||m.unit||'')===String(u.title||''))));
    const vis=subjectVisual(s.subject);
    const pr=classSubjectProgress(s.id);
    const unitsHtml=units.map((u,idx)=>{ const items=materialsForClassUnit(u.id,s.id); return `<details class="subject-unit-card ${u.hidden?'is-hidden-classroom':''}" ${idx===0?'open':''}><summary><span>${safe(u.title)}</span><em>${items.length} material${items.length===1?'':'es'}${u.hidden?' · oculta':''}</em></summary>${roleTeacher()?`<div class="class-unit-teacher-actions"><button type="button" class="primary-btn" data-t82-new-material data-class-id="${safe(s.class_id)}" data-subject="${safe(s.subject)}" data-unit="${safe(u.title)}" onclick="return window.TribecaClassroomNewMaterial(this,event)">Crear material</button><button type="button" class="secondary-btn" data-t127-new-video data-class-id="${safe(s.class_id)}" data-subject="${safe(s.subject)}" data-unit="${safe(u.title)}" onclick="return window.TribecaClassroomNewVideo(this,event)">Crear vídeo</button>${classUnitEditDrawer(u,s)}</div>`:''}<div class="subject-material-list">${items.length?items.map(m=>materialCard(m)).join(''):'<div class="empty-state">Esta unidad todavía no tiene materiales visibles.</div>'}</div></details>`; }).join('');
    const orphanHtml=orphanMaterials.length?`<details class="subject-unit-card" open><summary><span>Otros materiales</span><em>${orphanMaterials.length}</em></summary><div class="subject-material-list">${orphanMaterials.map(m=>materialCard(m)).join('')}</div></details>`:'';
    return `<section class="t16-subject-detail subject-detail-premium class-subject-detail">
      <header class="subject-detail-head subject-0" style="--subject-color:${vis.color}">
        <div class="subject-detail-emblem">${safe(vis.glyph)}</div>
        <div class="subject-detail-copy">
          <span class="subject-detail-kicker">${safe(classroomLabel(c))}</span>
          <h2>${safe(s.subject)}</h2>
          <p>${safe([c.center,c.stage,c.course].filter(Boolean).join(' · '))} · ${pr.total} publicaciones · progreso ${pr.percent}%</p>
          <div class="subject-detail-progress"><span style="width:${pr.percent}%"></span></div>
        </div>
      </header>
      <div class="subject-detail-intro window-panel">
        <strong>Materiales organizados por unidades didácticas</strong>
        <p>Las unidades aparecen en orden natural y, dentro de cada unidad, los materiales más recientes quedan al final.</p>
      </div>
      ${roleTeacher()?classUnitCreateForm(s.id):''}
      <div class="subject-units-list">
        ${unitsHtml}${orphanHtml || (!unitsHtml?'<div class="empty-state premium-empty">Todavía no hay publicaciones visibles en esta materia.</div>':'')}
      </div>
    </section>`;
  }
  function subjectDetailContent(subject){
    const mats=visibleMaterials(subject);
    const byUnit=new Map();
    mats.forEach(m=>{ const u=m.unit_title||m.unit||'Unidad 1'; if(!byUnit.has(u)) byUnit.set(u,[]); byUnit.get(u).push(m); });
    const i=subjectList().indexOf(subject);
    const vis=subjectVisual(subject);
    const units=[...byUnit.entries()].sort((a,b)=>unitTitleOrder(a[0],b[0])).map(([u,items])=>[u,sortMaterialsAsc(items)]);
    const course = roleTeacher() ? (State.selectedSubjectCourse || State.profile?.course || '') : (State.profile?.course || '');
    const pr = subjectProgress(subject);
    return `<section class="t16-subject-detail subject-detail-premium">
      <header class="subject-detail-head subject-${Math.max(i,0)%6}" style="--subject-color:${vis.color}">
        <div class="subject-detail-emblem">${safe(vis.glyph)}</div>
        <div class="subject-detail-copy">
          <span class="subject-detail-kicker">${safe(course||'Materia')}</span>
          <h2>${safe(subject)}</h2>
          <p>${mats.length} publicaciones · ${units.length||0} unidades${roleTeacher()?'':` · progreso ${pr.percent}%`}</p>
          ${roleTeacher()?'':`<div class="subject-detail-progress"><span style="width:${pr.percent}%"></span></div>`}
        </div>
      </header>
      ${roleTeacher()?`<div class="subject-teacher-actions premium-actions"><button type="button" class="primary-btn" data-t29-new-material="${safe(subject)}">Publicar nuevo material</button><button type="button" class="secondary-btn" data-t30-subject-edit-by-name="${safe(subject)}">Editar materia</button></div>`:''}
      <div class="subject-detail-intro window-panel">
        <strong>Materiales organizados por unidades didácticas</strong>
        <p>Las unidades aparecen en orden natural. Dentro de cada unidad, las publicaciones más recientes quedan al final.</p>
      </div>
      <div class="subject-units-list">
        ${units.map(([u,items],idx)=>`<details class="subject-unit-card" ${idx===0?'open':''}>
          <summary><span>${safe(u)}</span><em>${items.length} material${items.length===1?'':'es'}</em></summary>
          <div class="subject-material-list">${items.map(m=>materialCard(m)).join('')}</div>
        </details>`).join('')||'<div class="empty-state premium-empty">Todavía no hay publicaciones en esta materia.</div>'}
      </div>
    </section>`;
  }
  function materialCard(m){
    const meta=materialTypeMeta(m.material_type||m.type);
    const done=isMaterialCompleted(m.id);
    const dateLabel=m.created_at ? new Date(m.created_at).toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
    return `<details class="t16-publication publication-type-card publication-type-card-${safe(meta.key)} material-collapse-card ${m.hidden?'is-hidden-item':''} ${done?'is-completed-material':''}" ${materialIsMath(m)?'data-math-material="1"':''}>
      <summary class="material-collapse-summary">
        <div class="material-summary-main">
          <span class="publication-type-tag publication-type-${safe(meta.key)}">${safe(meta.icon)} ${safe(meta.label)}</span>
          <h3 class="material-title-prominent">${safe(m.title)}</h3>
          <small>${safe([m.unit_title||m.unit||'', dateLabel].filter(Boolean).join(' · '))}</small>
        </div>
        <div class="material-summary-flags">${m.hidden?'<span>Oculto</span>':''}${done&&!roleTeacher()?'<span class="completed-chip">Hecha</span>':''}<span class="material-expand-hint">Abrir</span></div>
      </summary>
      <div class="material-collapse-body">
        ${m.image_url?`<img src="${safe(m.image_url)}" alt="">`:''}
        <p class="material-body-text" style="font-size:${Number(m.font_size||16)}px">${safe(m.body||m.description||m.content||m.text||'')}</p>
        ${m.link_url?`<a href="${safe(m.link_url)}" target="_blank" rel="noopener">Abrir enlace</a>`:''}
        ${materialEmbedMarkup(m)}
        ${attachmentList(m)}
        <div class="material-card-actions">${materialOpenButton(m)}${materialCompletionButton(m)}${roleTeacher()?`<div class="inline-actions"><button type="button" data-t32-edit-mat="${safe(m.id)}">Editar</button><button type="button" data-t16-toggle-mat="${safe(m.id)}">${m.hidden?'Mostrar':'Ocultar'}</button><button type="button" data-t16-delete-mat="${safe(m.id)}">Eliminar</button></div>`:''}</div>
      </div>
    </details>`;
  }



  function repositoryFilters(){
    return {
      center: localStorage.getItem('tribeca-repo-center') || '',
      stage: localStorage.getItem('tribeca-repo-stage') || '',
      course: localStorage.getItem('tribeca-repo-course') || '',
      subject: localStorage.getItem('tribeca-repo-subject') || ''
    };
  }
  function setRepositoryFilter(key, value){
    if(!['center','stage','course','subject'].includes(key)) return;
    localStorage.setItem(`tribeca-repo-${key}`, String(value||''));
    if(key==='stage'){
      const valid=coursesForStage(value);
      const current=localStorage.getItem('tribeca-repo-course') || '';
      if(current && valid.length && !valid.includes(current)) localStorage.setItem('tribeca-repo-course', valid[0] || '');
    }
    if(key==='course'){
      const validStages=stagesForCourse(value);
      const current=localStorage.getItem('tribeca-repo-stage') || '';
      if(value && validStages.length && (!current || !validStages.includes(current))) localStorage.setItem('tribeca-repo-stage', validStages[0] || '');
    }
    rerender();
  }
  function repoUnique(values){
    return [...new Set((values||[]).map(v=>String(v||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
  }
  function repoOptions(values, selected='', includeAll=true){
    const opts = repoUnique(values);
    return `${includeAll?'<option value="">Todos</option>':''}${opts.map(v=>`<option value="${safe(v)}" ${String(selected)===String(v)?'selected':''}>${safe(v)}</option>`).join('')}`;
  }
  function repoFilteredRows(rows, f){
    return rows.filter(r=>
      (!f.center || r.center===f.center) &&
      (!f.stage || r.stage===f.stage) &&
      (!f.course || r.course===f.course) &&
      (!f.subject || r.subject===f.subject)
    );
  }
  function repositoryManualCreateForm(){
    const ctx={center:'',stage:State.selectedSubjectStage||'',course:State.selectedSubjectCourse||'',subject:'',unit:'Unidad 1'};
    const dynamic = (State.data.subjects || []).map(s => s.subject).filter(Boolean);
    const allSubjects = [...new Set(Object.values(subjectCatalog).flat().concat(dynamic, ['Apoyo personalizado','Tutoría']).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    return `<details class="window-panel repo-create-panel"><summary><span>Crear material directamente en el repositorio</span><em>No se publica aún al alumnado</em></summary>
      <form id="t78RepoMaterialForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid repo-create-form">
        ${repositoryClassificationFields(ctx,'repoNew')}
        <label>Materia<select name="subject" required><option value="">Seleccionar materia</option>${allSubjects.map(s=>`<option value="${safe(s)}">${safe(s)}</option>`).join('')}</select></label>
        <label>Unidad didáctica<input name="unit" value="Unidad 1" placeholder="Unidad 1"></label>
        <label>Tipo<select name="materialType"><option value="apuntes">Material</option><option value="presentacion">Presentación</option><option value="tarea">Tarea o actividad</option><option value="test">Test externo</option><option value="juego">Juego</option></select></label>
        <label>Título<input name="title" maxlength="120" required placeholder="Título del material"></label>
        <label class="full-row">Contenido<textarea name="body" rows="5" maxlength="1800" placeholder="Descripción o instrucciones del material"></textarea></label>
        <label>Enlace externo<input name="linkUrl" type="url" placeholder="https://..."></label>
        <label>Tamaño de texto<select name="fontSize">${[15,16,18,20,22].map(n=>`<option ${n===16?'selected':''}>${n}</option>`).join('')}</select></label>
        <button class="primary-btn full-row" type="submit">Guardar en repositorio</button>
      </form>
    </details>`;
  }
  function materialRepositoryContent(){
    if(!roleTeacher()) return '<div class="empty-state">Solo la profesora puede acceder al repositorio docente.</div>';
    const rows=(State.data.materialRepository||[]).filter(x=>x && x.active!==false);
    const f=repositoryFilters();
    const visibleRows=repoFilteredRows(rows,f);
    const stageChoices = f.course ? stagesForCourse(f.course) : repoUnique([...stages, ...rows.map(r=>r.stage)]);
    const courseChoices = f.stage ? coursesForStage(f.stage) : repoUnique([...dynamicCourses(), ...rows.map(r=>r.course)]);
    const subjectsForFilters = rows.filter(r=>
      (!f.center || r.center===f.center) &&
      (!f.stage || r.stage===f.stage) &&
      (!f.course || r.course===f.course)
    ).map(r=>r.subject);
    const centers = repoUnique([...centersFromStudents(), ...rows.map(r=>r.center)]);
    const list = repositoryGroupedList(visibleRows);
    const summary = repositoryCenterOverview(rows, f);
    return `<section class="repository-tool repository-tool-v78">
      <section class="repository-hero window-panel">
        <div>
          <p class="eyebrow">Repositorio privado docente</p>
          <h3>Materiales asociados a centros, etapas, cursos y materias</h3>
          <p class="meta">Cada material queda vinculado al centro educativo, etapa, curso, asignatura y unidad correspondientes para poder republicarlo en el lugar correcto.</p>
        </div>
        <button type="button" class="repo-stats repo-stats-button" onclick="return window.TribecaRepositoryShowAll(event)" title="Ver todos los materiales guardados"><strong>${rows.length}</strong><span>material${rows.length===1?'':'es'} guardado${rows.length===1?'':'s'}</span></button>
      </section>
      ${repositoryManualCreateForm()}
      ${summary}
      <section class="window-panel repository-filters">
        <div class="repo-filter-head">
          <div>
            <h3>Filtrar repositorio</h3>
            <p class="meta">Los filtros son acumulativos. También puedes pulsar una tarjeta de centro para ir directamente a sus cursos.</p>
          </div>
          <div class="inline-actions"><button type="button" class="secondary-btn" onclick="return window.TribecaRepositoryShowAll(event)">Ver todo</button><button type="button" class="secondary-btn" onclick="return window.TribecaRepositoryClearFilters(event)">Limpiar filtros</button></div>
        </div>
        <div class="window-grid">
          <label>Centro<select onchange="window.TribecaRepositorySetFilter('center',this.value)">${repoOptions(centers, f.center)}</select></label>
          <label>Etapa<select onchange="window.TribecaRepositorySetFilter('stage',this.value)">${repoOptions(stageChoices, f.stage)}</select></label>
          <label>Curso<select onchange="window.TribecaRepositorySetFilter('course',this.value)">${repoOptions(courseChoices, f.course)}</select></label>
          <label>Materia<select onchange="window.TribecaRepositorySetFilter('subject',this.value)">${repoOptions(subjectsForFilters.length?subjectsForFilters:rows.map(r=>r.subject), f.subject)}</select></label>
        </div>
      </section>
      <section class="repository-results">
        <div class="repository-result-count">${visibleRows.length} material${visibleRows.length===1?'':'es'} mostrado${visibleRows.length===1?'':'s'}${rows.length!==visibleRows.length?` de ${rows.length}`:''}</div>
        ${list || '<div class="empty-state">No hay materiales guardados con estos filtros. Pulsa “Ver todo” para retirar los filtros.</div>'}
      </section>
    </section>`;
  }
  function repositoryCenterOverview(rows=[], f={}){
    if(!rows.length) return `<section class="window-panel repo-empty-guide"><h3>El repositorio todavía está vacío</h3><p>Publica materiales dentro de cualquier materia y se guardarán automáticamente aquí.</p></section>`;
    const byCenter=new Map();
    rows.forEach(r=>{
      const center=r.center||'Sin centro educativo';
      if(!byCenter.has(center)) byCenter.set(center, []);
      byCenter.get(center).push(r);
    });
    const cards=[...byCenter.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es')).map(([center,items])=>{
      const byCourse=new Map();
      items.forEach(r=>{
        const key=[r.stage||'Sin etapa', r.course||'Sin curso'].join(' · ');
        if(!byCourse.has(key)) byCourse.set(key, 0);
        byCourse.set(key, byCourse.get(key)+1);
      });
      const chips=[...byCourse.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es',{numeric:true})).slice(0,6).map(([label,count])=>`<span>${safe(label)} · ${count}</span>`).join('');
      return `<button type="button" class="repo-center-summary-card ${f.center===center?'is-active':''}" data-t77-repo-center="${safe(center)}" onclick="return window.TribecaRepositoryFilterCenter(this,event)">
        <strong>${safe(center)}</strong>
        <em>${items.length} material${items.length===1?'':'es'}</em>
        <div class="repo-course-chips">${chips || '<span>Sin cursos asignados</span>'}</div>
      </button>`;
    }).join('');
    return `<section class="window-panel repo-center-overview"><div class="repo-filter-head"><div><h3>Centros y cursos guardados</h3><p class="meta">Pulsa un centro para ver sus materiales organizados por curso y materia.</p></div></div><div class="repo-center-summary-grid">${cards}</div></section>`;
  }
  function repositoryGroupedList(rows){
    if(!rows.length) return '';
    const byCenter=new Map();
    rows.forEach(r=>{
      const center=r.center||'Sin centro educativo';
      if(!byCenter.has(center)) byCenter.set(center, []);
      byCenter.get(center).push(r);
    });
    return [...byCenter.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es')).map(([center,centerRows])=>{
      const byCourse=new Map();
      centerRows.forEach(r=>{
        const key=[r.stage||'Sin etapa', r.course||'Sin curso'].join(' · ');
        if(!byCourse.has(key)) byCourse.set(key, []);
        byCourse.get(key).push(r);
      });
      const courseHtml=[...byCourse.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es',{numeric:true})).map(([courseLabel,courseRows])=>{
        const bySubject=new Map();
        courseRows.forEach(r=>{ const s=r.subject||'Sin materia'; if(!bySubject.has(s)) bySubject.set(s, []); bySubject.get(s).push(r); });
        const subjectHtml=[...bySubject.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es')).map(([subject,items])=>{
          const byUnit=new Map();
          items.forEach(r=>{ const unit=r.unit_title||r.unit||'Unidad 1'; if(!byUnit.has(unit)) byUnit.set(unit, []); byUnit.get(unit).push(r); });
          const unitHtml=[...byUnit.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es',{numeric:true})).map(([unit,unitItems])=>`<details class="repo-unit-group" open><summary><span>${safe(unit)}</span><em>${unitItems.length} material${unitItems.length===1?'':'es'}</em></summary><div class="repo-card-grid">${unitItems.map(repositoryMaterialCard).join('')}</div></details>`).join('');
          return `<details class="repo-subject-group" open><summary><span>${safe(subject)}</span><em>${items.length} material${items.length===1?'':'es'}</em></summary><div class="repo-unit-list">${unitHtml}</div></details>`;
        }).join('');
        return `<article class="repo-course-card"><header><div><p class="eyebrow">Curso</p><h3>${safe(courseLabel)}</h3></div><strong>${courseRows.length}</strong></header><div class="repo-subject-list">${subjectHtml}</div></article>`;
      }).join('');
      return `<details class="repo-center-section" open><summary><span>${safe(center)}</span><em>${centerRows.length} material${centerRows.length===1?'':'es'} · ${byCourse.size} curso${byCourse.size===1?'':'s'}</em></summary><div class="repo-course-list">${courseHtml}</div></details>`;
    }).join('');
  }
  function centersFromStudents(){ return (State.data.students||[]).map(s=>s.center); }
  function repositoryClassificationMiniForm(r){
    const centerValues = repoUnique([...centersFromStudents(), ...(State.data.materialRepository||[]).map(x=>x.center), ...centers]);
    const stageValues = r.course ? stagesForCourse(r.course) : stages;
    const courseValues = r.stage ? coursesForStage(r.stage) : dynamicCourses();
    return `<details class="repo-classify-box"><summary>Cambiar clasificación</summary><form onsubmit="return window.TribecaRepositorySaveClassification(this,event)" class="repo-classify-form"><input type="hidden" name="id" value="${safe(r.id)}"><label>Centro<select name="center"><option value="">Sin centro</option>${repoOptions(centerValues,r.center||'',false)}</select></label><label>Etapa<select name="stage"><option value="">Sin etapa</option>${repoOptions(stageValues,r.stage||'',false)}</select></label><label>Curso<select name="course"><option value="">Sin curso</option>${repoOptions(courseValues,r.course||'',false)}</select></label><label>Materia<input name="subject" value="${safe(r.subject||'')}"></label><label>Unidad<input name="unit" value="${safe(r.unit_title||r.unit||'Unidad 1')}"></label><button type="submit" class="secondary-btn">Guardar clasificación</button></form></details>`;
  }
  function repositoryMaterialCard(r){
    const meta=materialTypeMeta(r.material_type||r.type||'material');
    const att=normalizeAttachments(r);
    const snippet=String(r.body||r.description||r.content||'').replace(/\s+/g,' ').slice(0,210);
    return `<article class="repo-material-card">
      <div class="publication-card-top"><span class="publication-type-tag publication-type-${safe(meta.key)}">${safe(meta.icon)} ${safe(meta.label)}</span><small>${r.created_at?`Guardado ${fmtDate(String(r.created_at).slice(0,10))}`:'Guardado'}</small></div>
      <h3>${safe(r.title||'Material sin título')}</h3>
      <p>${safe(snippet)}${snippet.length>=210?'…':''}</p>
      <small>${att.length?`${att.length} adjunto${att.length===1?'':'s'}`:'Sin adjuntos'}${r.link_url?' · enlace':''}</small>
      ${repositoryClassificationMiniForm(r)}
      <div class="inline-actions repo-actions">
        <button type="button" class="primary-btn" data-t70-repo-publish="${safe(r.id)}" onclick="return window.TribecaRepositoryPublishDirect(this,event,true)">Publicar visible</button>
        <button type="button" class="secondary-btn" data-t70-repo-publish="${safe(r.id)}" onclick="return window.TribecaRepositoryPublishDirect(this,event,false)">Publicar oculto</button>
        <button type="button" data-t70-repo-delete="${safe(r.id)}" onclick="return window.TribecaRepositoryDeleteDirect(this,event)">Eliminar</button>
      </div>
    </article>`;
  }
  async function saveRepositoryMaterial(form){
    if(!roleTeacher()) return;
    const fd=new FormData(form);
    const payload={
      source_material_id:null,
      title:fd.get('title') || 'Material sin título',
      body:fd.get('body') || '',
      description:fd.get('body') || '',
      content:fd.get('body') || '',
      image_url:null,
      link_url:fd.get('linkUrl') || null,
      font_size:Number(fd.get('fontSize')||16),
      center:fd.get('repoNewCenter') || null,
      stage:fd.get('repoNewStage') || null,
      course:fd.get('repoNewCourse') || null,
      subject:fd.get('subject') || 'Apoyo personalizado',
      unit_title:fd.get('unit') || 'Unidad 1',
      unit:fd.get('unit') || 'Unidad 1',
      material_type:fd.get('materialType') || 'apuntes',
      attachments:[],
      created_by:State.profile.id,
      active:true,
      notes:'Creado directamente en el repositorio docente.'
    };
    if(!payload.center || !payload.stage || !payload.course) throw new Error('Selecciona centro, etapa y curso para clasificar el material.');
    await persistSupabaseRecord('teacher_material_repository', payload, null);
    await log('repository','Material creado directamente en repositorio',{title:payload.title,center:payload.center,stage:payload.stage,course:payload.course,subject:payload.subject});
    await loadData(true);
    toast('Material creado en el repositorio docente.');
    form.reset();
    rerender();
  }
  async function saveRepositoryClassification(form){
    const fd=new FormData(form); const id=fd.get('id');
    if(!id) return;
    const unit=fd.get('unit') || 'Unidad 1';
    const payload={center:fd.get('center')||null, stage:fd.get('stage')||null, course:fd.get('course')||null, subject:fd.get('subject')||'Apoyo personalizado', unit_title:unit, unit};
    await persistSupabaseRecord('teacher_material_repository', payload, id);
    await loadData(true);
    toast('Clasificación del material actualizada.');
    rerender();
  }
  async function saveMaterialToRepository(materialId){
    if(!roleTeacher()) return toast('Solo la profesora puede guardar materiales en el repositorio.');
    const m=(State.data.materials||[]).find(x=>String(x.id)===String(materialId));
    if(!m) return toast('No se encontró el material.');
    const repositorySaved=await autoSaveMaterialPayloadToRepository(m, m.id || null);
    await loadData(true);
    toast(repositorySaved?'Material guardado en el repositorio docente.':'No se pudo guardar en el repositorio docente.');
    rerender();
  }
  async function publishRepositoryMaterial(repoId, visible=true){
    if(!roleTeacher()) return toast('Solo la profesora puede republicar materiales.');
    const r=(State.data.materialRepository||[]).find(x=>String(x.id)===String(repoId));
    if(!r) return toast('No se encontró el material del repositorio.');
    const payload={
      title:r.title || 'Material sin título',
      body:r.body || r.description || r.content || '',
      description:r.description || r.body || r.content || '',
      content:r.content || r.body || r.description || '',
      image_url:r.image_url || null,
      link_url:r.link_url || null,
      font_size:Number(r.font_size||16),
      target_scope:'class',
      target_user_ids:[],
      center:r.center || null,
      stage:r.stage || null,
      course:r.course || null,
      created_by:State.profile.id,
      hidden:!visible,
      subject:r.subject || 'Apoyo personalizado',
      unit_title:r.unit_title || r.unit || 'Unidad 1',
      unit:r.unit || r.unit_title || 'Unidad 1',
      material_type:r.material_type || 'material',
      badge_codes:[],
      attachments:normalizeAttachments(r)
    };
    if(!payload.center || !payload.stage || !payload.course) throw new Error('Antes de publicar, clasifica el material con centro, etapa y curso.');
    await persistSupabaseRecord('subject_materials', payload, null);
    await log('repository', visible?'Material republicado visible':'Material republicado oculto',{title:payload.title,subject:payload.subject,center:payload.center,stage:payload.stage,course:payload.course});
    await loadData(true);
    toast(visible?'Material publicado y visible en la materia correspondiente.':'Material publicado como oculto en la materia correspondiente. Podrás mostrarlo cuando lo necesites.');
    rerender();
  }
  async function deleteRepositoryMaterial(repoId){
    if(!roleTeacher()) return;
    if(!confirm('¿Eliminar este material del repositorio docente? Esta acción no elimina publicaciones ya republicadas.')) return;
    const {error}=await table('teacher_material_repository').delete().eq('id',repoId);
    if(error) throw error;
    await log('repository','Material eliminado del repositorio',{id:repoId});
    await loadData(true);
    toast('Material eliminado del repositorio.');
    rerender();
  }
  window.TribecaRepositorySetFilter=function(key,value){ setRepositoryFilter(key,value); return false; };
  window.TribecaRepositoryFilterCenter=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); const center=btn?.dataset?.t77RepoCenter || ''; localStorage.setItem('tribeca-repo-center', center); ['stage','course','subject'].forEach(k=>localStorage.removeItem(`tribeca-repo-${k}`)); rerender(); return false; };
  window.TribecaRepositoryShowAll=function(ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); ['center','stage','course','subject'].forEach(k=>localStorage.removeItem(`tribeca-repo-${k}`)); State.profilePanel='profile'; rerender(); return false; };
  window.TribecaRepositoryClearFilters=function(ev){ ev?.preventDefault?.(); ['center','stage','course','subject'].forEach(k=>localStorage.removeItem(`tribeca-repo-${k}`)); rerender(); return false; };
  window.TribecaRepositorySaveMaterialDirect=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); const id=btn?.dataset?.t70RepoSave; saveMaterialToRepository(id).catch(e=>{ console.error(e); toast(e.message||'No se pudo guardar en el repositorio.'); }); return false; };
  window.TribecaRepositorySaveClassification=function(form,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); saveRepositoryClassification(form).catch(e=>{ console.error(e); toast(e.message||'No se pudo guardar la clasificación.'); }); return false; };
  window.TribecaRepositoryPublishDirect=function(btn,ev,visible=true){ ev?.preventDefault?.(); ev?.stopPropagation?.(); const id=btn?.dataset?.t70RepoPublish; publishRepositoryMaterial(id, !!visible).catch(e=>{ console.error(e); toast(e.message||'No se pudo republicar el material.'); }); return false; };
  window.TribecaRepositoryDeleteDirect=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); const id=btn?.dataset?.t70RepoDelete; deleteRepositoryMaterial(id).catch(e=>{ console.error(e); toast(e.message||'No se pudo eliminar del repositorio.'); }); return false; };





  function currentAcademicYearLabel(){
    const d=new Date(); const y=d.getFullYear(); const m=d.getMonth()+1;
    const start=m>=9 ? y : y-1;
    return `${start}/${String(start+1).slice(-2)}`;
  }
  function activeClassAssignments(){
    return (State.data.classStudents||[]).filter(x=>x && x.active!==false);
  }
  function classroomAssignments(classId){
    return activeClassAssignments().filter(x=>String(x.class_id)===String(classId));
  }
  function studentActiveClass(studentId){
    const assignment=activeClassAssignments().find(x=>String(x.user_id)===String(studentId));
    return assignment ? (State.data.classrooms||[]).find(c=>String(c.id)===String(assignment.class_id)) || null : null;
  }
  function classroomStudents(classId){
    const ids=new Set(classroomAssignments(classId).map(x=>String(x.user_id)));
    return (State.data.students||[]).filter(s=>ids.has(String(s.id))).sort((a,b)=>displayName(a).localeCompare(displayName(b),'es'));
  }
  function classroomStudentsCount(classId){
    return classroomStudents(classId).length;
  }
  function unassignedStudents(){
    const assigned=new Set(activeClassAssignments().map(x=>String(x.user_id)));
    return (State.data.students||[]).filter(s=>!assigned.has(String(s.id))).sort((a,b)=>displayName(a).localeCompare(displayName(b),'es'));
  }
  function classroomSubjects(classId){
    return (State.data.classSubjects||[]).filter(x=>String(x.class_id)===String(classId) && x.active!==false).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0) || String(a.subject||'').localeCompare(String(b.subject||''),'es'));
  }
  function classroomUnitsForSubject(subjectId){
    return (State.data.classUnits||[]).filter(x=>String(x.class_subject_id)===String(subjectId) && x.active!==false).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0) || String(a.title||'').localeCompare(String(b.title||''),'es',{numeric:true}));
  }
  function classroomAutoName(center, stage, course){
    return [course, center].filter(Boolean).join(' · ') || 'Nueva clase';
  }
  function classroomPeoplePanel(c){
    const students=classroomStudents(c.id);
    const assignmentOpen=classroomAssignmentBox(c).replace('<details class="classroom-assignment-box">','<details class="classroom-assignment-box" open>');
    return `<section class="classroom-people-panel classroom-people-panel-v92">
      <header class="classroom-section-title">
        <div><h3>Alumnado</h3><p>${students.length} alumno${students.length===1?'':'s'}</p></div>
      </header>
      <div class="classroom-people-list classroom-people-list-v92">${students.length?students.map(s=>`<button type="button" class="classroom-person-row classroom-person-row-v91 classroom-person-button" data-t114-open-student-profile="${safe(s.id)}"><span>${safe((displayName(s)||'?').slice(0,1).toUpperCase())}</span><div><strong>${safe(displayName(s))}</strong><small>${safe(s.username||'')} · ${safe(academicLine(s))}</small></div></button>`).join(''):'<div class="empty-state">Todavía no hay alumnado asignado.</div>'}</div>
      <details class="classroom-assignment-compact">
        <summary><span>Editar alumnado</span><em>${students.length}</em></summary>
        ${assignmentOpen}
      </details>
    </section>`;
  }
  
  function classroomClassSummary(c){
    const subjects=classroomSubjects(c.id);
    const materials=(State.data.materials||[]).filter(m=>String(m.class_id||'')===String(c.id));
    return `<p class="classroom-clean-meta">${classroomStudentsCount(c.id)} alumno${classroomStudentsCount(c.id)===1?'':'s'} · ${subjects.length} materia${subjects.length===1?'':'s'} · ${materials.length} material${materials.length===1?'':'es'}</p>`;
  }
  function classroomDetailContent(classId){
    const c=classById(classId || State.currentClassId);
    if(!c) return '<div class="empty-state premium-empty">No se encontró esta clase.</div>';
    const label=classroomLabel(c);
    return `<section class="classroom-detail-v92">
      <header class="classroom-detail-hero classroom-detail-hero-v92 ${classroomThemeClass(c)}" style="${safe(classroomThemeStyle(c))}">
        <div>
          <p>${safe(c.academic_year||currentAcademicYearLabel())}</p>
          <h2>${safe(label)}</h2>
          <span>${safe([c.center,c.stage,c.course].filter(Boolean).join(' · '))}</span>
          ${classroomClassSummary(c)}
        </div>
        <button type="button" class="secondary-btn classroom-back-btn" onclick="return window.TribecaRenderInlineSection ? (window.TribecaRenderInlineSection('classrooms'), false) : false;">Todas las clases</button>
      </header>
      <section class="classroom-clean-layout classroom-clean-layout-v92">
        <main class="classroom-clean-main">
          ${classroomSubjectsBox(c)}
        </main>
        <aside class="classroom-clean-side">
          ${classroomPeoplePanel(c)}
        </aside>
      </section>
    </section>`;
  }

function classroomsContent(){
    if(!roleTeacher()) return '<div class="empty-state">Solo la profesora puede gestionar clases.</div>';
    const rows=(State.data.classrooms||[]).filter(Boolean);
    const edit=State.pendingClassroomEdit || null;
    const editId=edit?.id || '';
    const editCenter=edit?.center || '';
    const editStage=edit?.stage || State.selectedSubjectStage || 'ESO';
    const editCourse=edit?.course || State.selectedSubjectCourse || '1.º ESO';
    const editName=edit?.name || '';
    const editYear=edit?.academic_year || currentAcademicYearLabel();
    const editColor=(edit?.class_color || edit?.color || classColorFor(edit||{}).key);
    const colorOptions=classColorPalette();
    const activeRows=rows.filter(c=>c.active!==false && !c.hidden).sort((a,b)=>String(a.center||'').localeCompare(String(b.center||''),'es') || String(a.course||'').localeCompare(String(b.course||''),'es',{numeric:true}) || String(a.name||'').localeCompare(String(b.name||''),'es'));
    const hiddenRows=rows.filter(c=>c.hidden || c.active===false);
    const assignedCount=new Set(activeClassAssignments().map(x=>String(x.user_id))).size;
    const unassigned=unassignedStudents();
    const classCards=activeRows.map((c,i)=>classroomCard(c,i)).join('');
    return `<section class="classrooms-tool classrooms-tool-v89">
      <section class="classroom-topbar panel">
        <div>
          <p class="eyebrow">Panel docente</p>
          <h2>Clases</h2>
          <p>Gestiona el aula desde clases permanentes: alumnado, materias, unidades y materiales.</p>
        </div>
        <div class="classroom-top-stats">
          <span><strong>${activeRows.length}</strong> clases</span>
          <span><strong>${assignedCount}</strong> alumnos asignados</span>
          <span><strong>${unassigned.length}</strong> sin clase</span>
        </div>
        <button type="button" class="secondary-btn classroom-base-subjects-btn" data-t92-default-all-subjects>Añadir materias base a todas</button>
      </section>

      <details class="classroom-create-drawer window-panel" ${editId?'open':''}>
        <summary><span>${editId?'Editar clase':'Crear nueva clase'}</span><em>${editId?'Edición activa':'Opcional'}</em></summary>
        <form id="t80ClassroomForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid premium-form classroom-compact-form">
          <input type="hidden" name="id" value="${safe(editId)}">
          <label>Centro educativo<select name="center" required><option value="">Seleccionar centro</option>${repoOptions(repoUnique([...centersFromStudents(), ...centers, ...rows.map(c=>c.center)]), editCenter, false)}</select></label>
          <label>Etapa<select name="stage" required>${repoOptions(stagesForCourse(editCourse), editStage, false)}</select></label>
          <label>Curso<select name="course" required>${repoOptions(coursesForStage(editStage), editCourse, false)}</select></label>
          <label>Curso académico<input name="academicYear" value="${safe(editYear)}" placeholder="2026/27"></label>
          <label class="full-row">Nombre visible<input name="name" maxlength="160" value="${safe(editName)}" placeholder="Ejemplo: 1.º ESO Fernando Blanco"></label>
          <label class="full-row">Descripción interna<textarea name="description" rows="2" maxlength="600">${safe(edit?.description||'')}</textarea></label>
          <fieldset class="class-color-picker full-row"><legend>Color de la clase</legend><div>${colorOptions.map(o=>`<label class="class-color-option" style="--swatch:${safe(o.primary)}"><input type="radio" name="classColor" value="${safe(o.key)}" ${editColor===o.key?'checked':''}><span></span><em>${safe(o.label)}</em></label>`).join('')}</div></fieldset>
          <div class="classroom-state-options full-row"><label class="check-line"><input type="checkbox" name="hidden" ${edit?.hidden?'checked':''}> <span>Clase oculta para el alumnado</span></label>
          <label class="check-line"><input type="checkbox" name="active" ${editId?(edit?.active!==false?'checked':''):'checked'}> <span>Clase activa</span></label></div>
          <div class="inline-actions full-row"><button class="primary-btn" type="button" onclick="return window.TribecaSaveClassroomDirect(this,event)">${editId?'Guardar cambios':'Crear clase'}</button>${editId?'<button class="secondary-btn" type="button" onclick="window.TribecaClassroomCancelEdit && window.TribecaClassroomCancelEdit(event)">Cancelar edición</button>':''}</div>
        </form>
      </details>

      ${unassigned.length?`<details class="classroom-unassigned-drawer window-panel"><summary><span>Alumnado sin clase activa</span><em>${unassigned.length}</em></summary><div class="classroom-chip-row">${unassigned.map(s=>`<span>${safe(displayName(s))}<small>${safe(academicLine(s))}</small></span>`).join('')}</div></details>`:''}

      <section class="classroom-google-grid">
        ${classCards || '<div class="empty-state">Todavía no hay clases activas. Crea una clase para empezar.</div>'}
      </section>

      ${hiddenRows.length?`<details class="classroom-hidden-drawer window-panel"><summary><span>Clases ocultas o inactivas</span><em>${hiddenRows.length}</em></summary><section class="classroom-google-grid is-hidden-list">${hiddenRows.map((c,i)=>classroomCard(c,i+activeRows.length)).join('')}</section></details>`:''}
    </section>`;
  }
  function isPrimaryClass(c={}){
    const text=`${c.stage||''} ${c.course||''}`.toLowerCase();
    return /primaria|primary/.test(text);
  }
  function isEsoClass(c={}){
    const text=`${c.stage||''} ${c.course||''}`.toLowerCase();
    return /\beso\b|e\.s\.o|secundaria/.test(text);
  }
  function defaultSubjectsForClass(c={}){
    const common=['Lengua Castellana y Literatura','Lingua Galega','Matemáticas','English'];
    const primary=['Ciencias da Natureza','Ciencias Sociais'];
    const eso=['Bioloxía e Xeoloxía','Xeografía e Historia','Física e Química'];
    return [...new Set([...common, ...(isPrimaryClass(c)?primary:[]), ...(isEsoClass(c)?eso:[])])];
  }
  async function addDefaultSubjectsToClass(classId){
    const c=classById(classId);
    if(!c) return toast('No se encontró la clase.');
    const subjects=defaultSubjectsForClass(c);
    if(!subjects.length) return toast('No hay materias base para esta etapa.');
    const existing=new Set((State.data.classSubjects||[]).filter(s=>String(s.class_id)===String(classId)).map(s=>String(s.subject||'').trim().toLowerCase()));
    const rows=subjects.filter(s=>!existing.has(s.toLowerCase())).map((subject,idx)=>({
      class_id:classId,
      subject,
      sort_order:idx+1,
      hidden:false,
      active:true,
      updated_at:new Date().toISOString()
    }));
    if(!rows.length){ toast('Esta clase ya tiene las materias base.'); return; }
    const {error}=await table('tribeca_class_subjects').upsert(rows,{onConflict:'class_id,subject'});
    if(error) throw error;
    await log('classroom','Materias base añadidas a clase',{class_id:classId,count:rows.length,subjects:rows.map(r=>r.subject)});
    await loadData(true);
    toast(`${rows.length} materia${rows.length===1?'':'s'} base añadida${rows.length===1?'':'s'} correctamente.`);
    rerender();
  }
  async function addDefaultSubjectsToAllClasses(){
    if(!confirm('¿Añadir las materias base a todas las clases activas? No se duplicarán las que ya existan.')) return;
    const classes=(State.data.classrooms||[]).filter(c=>c && c.active!==false);
    let added=0;
    for(const c of classes){
      const before=(State.data.classSubjects||[]).filter(s=>String(s.class_id)===String(c.id)).length;
      const subjects=defaultSubjectsForClass(c);
      const existing=new Set((State.data.classSubjects||[]).filter(s=>String(s.class_id)===String(c.id)).map(s=>String(s.subject||'').trim().toLowerCase()));
      const rows=subjects.filter(s=>!existing.has(s.toLowerCase())).map((subject,idx)=>({
        class_id:c.id,
        subject,
        sort_order:before+idx+1,
        hidden:false,
        active:true,
        updated_at:new Date().toISOString()
      }));
      if(rows.length){
        const {error}=await table('tribeca_class_subjects').upsert(rows,{onConflict:'class_id,subject'});
        if(error) throw error;
        added+=rows.length;
      }
    }
    await log('classroom','Materias base añadidas a todas las clases',{count:added});
    await loadData(true);
    toast(`${added} materia${added===1?'':'s'} base añadida${added===1?'':'s'} en total.`);
    rerender();
  }

function classroomCard(c,i=0){
    const assigned=classroomStudents(c.id);
    const students=assigned.length;
    const names=assigned.slice(0,4).map(s=>`<li>${safe(displayName(s))}</li>`).join('');
    const label=classroomLabel(c);
    return `<article class="classroom-google-card classroom-google-card-v92 ${classroomThemeClass(c)} ${c.hidden?'is-hidden-classroom':''} ${c.active===false?'is-inactive-classroom':''}" style="${safe(classroomThemeStyle(c))}" data-t90-open-class="${safe(c.id)}" tabindex="0" role="button" aria-label="Abrir clase ${safe(label)}">
      <header class="classroom-google-cover">
        <div>
          <p>${safe(c.academic_year||currentAcademicYearLabel())}</p>
          <h3>${safe(label)}</h3>
          <span>${safe([c.center,c.stage,c.course].filter(Boolean).join(' · '))}</span>
        </div>
        <strong title="Alumnado asignado">${students}</strong>
      </header>
      <section class="classroom-google-body classroom-card-body-v92">
        <div class="classroom-card-counts"><span>${students} alumno${students===1?'':'s'}</span></div>
        <ul class="classroom-card-student-names">${names || '<li>Sin alumnado asignado</li>'}${assigned.length>4?`<li>+ ${assigned.length-4} más</li>`:''}</ul>
      </section>
      <footer class="classroom-google-actions classroom-card-actions-v90">
        <button type="button" class="primary-btn" data-t90-open-class-button="${safe(c.id)}">Abrir clase</button>
        <button type="button" title="Editar clase" data-t80-edit-class="${safe(c.id)}" onclick="return window.TribecaClassroomEditDirect(this,event)">Editar</button>
        <button type="button" title="Visibilidad" data-t80-toggle-class="${safe(c.id)}" onclick="return window.TribecaClassroomToggleDirect(this,event)">${c.hidden?'Mostrar':'Ocultar'}</button>
        <button type="button" title="Eliminar" data-t80-delete-class="${safe(c.id)}" onclick="return window.TribecaClassroomDeleteDirect(this,event)">Eliminar</button>
      </footer>
    </article>`;
  }
  function classroomSubjectsBox(c){
    const subjects=classroomSubjects(c.id);
    const dynamic=(State.data.subjects||[]).map(s=>s.subject).filter(Boolean);
    const opts=[...new Set([...defaultSubjectsForClass(c), ...(subjectCatalog[`${c.stage}-${c.course}`]||[]), ...dynamic, 'Apoyo personalizado','Tutoría'])].filter(Boolean).sort((a,b)=>a.localeCompare(b,'es'));
    return `<section class="classroom-subjects-box classroom-subjects-box-v92">
      <header class="classroom-section-title classroom-section-title-v92">
        <div><h3>Materias</h3><p>${subjects.length} materia${subjects.length===1?'':'s'} en esta clase</p></div>
        <button type="button" class="secondary-btn" data-t92-default-subjects="${safe(c.id)}">Añadir materias base</button>
      </header>
      <details class="manual-subject-drawer">
        <summary>Añadir materia manualmente</summary>
        <form class="classroom-subject-form classroom-subject-form-v92" onsubmit="return window.TribecaClassroomAddSubject(this,event)">
          <input type="hidden" name="classId" value="${safe(c.id)}">
          <label><span>Materia</span><select name="subject">${opts.map(s=>`<option value="${safe(s)}">${safe(s)}</option>`).join('')}</select></label>
          <label><span>Otra materia</span><input name="subjectCustom" placeholder="Escribir materia"></label>
          <button type="button" class="primary-btn" onclick="return window.TribecaClassroomAddSubject(this.closest('form'),event)">Añadir</button>
          <p class="form-status is-info" data-t90-subject-status></p>
        </form>
      </details>
      <div class="classroom-subject-list classroom-subject-list-v92">${subjects.length?subjects.map(classroomSubjectCard).join(''):'<div class="empty-state">Todavía no hay materias. Pulsa “Añadir materias base” para crearlas automáticamente.</div>'}</div>
    </section>`;
  }
  function classroomSubjectCard(s){
    const units=classroomUnitsForSubject(s.id);
    const materials=(State.data.materials||[]).filter(m=>String(m.class_subject_id||'')===String(s.id) || (String(m.class_id||'')===String(s.class_id) && String(m.subject||'')===String(s.subject||'')));
    const materialCount=materials.length;
    return `<details class="classroom-subject-card classroom-subject-card-v92 ${s.hidden?'is-hidden-classroom':''}">
      <summary>
        <div><strong>${safe(s.subject)}</strong><small>${units.length} unidad${units.length===1?'':'es'} · ${materialCount} material${materialCount===1?'':'es'}</small></div>
        <span>${s.hidden?'Oculta':'Visible'}</span>
      </summary>
      <div class="subject-card-inner-v92">
        <details class="subject-options-v92">
          <summary>Opciones de materia</summary>
          <div class="classroom-subject-actions-v91">
            <button type="button" data-t82-toggle-subject="${safe(s.id)}" onclick="return window.TribecaClassroomToggleSubject(this,event)">${s.hidden?'Mostrar materia':'Ocultar materia'}</button>
            <button type="button" data-t82-delete-subject="${safe(s.id)}" onclick="return window.TribecaClassroomDeleteSubject(this,event)">Eliminar materia</button>
          </div>
        </details>
        <form class="classroom-unit-form classroom-unit-form-v92" onsubmit="return window.TribecaClassroomAddUnit(this,event)">
          <input type="hidden" name="classSubjectId" value="${safe(s.id)}">
          <input name="title" placeholder="Nueva unidad, por ejemplo Module 5" required>
          <button type="button" class="secondary-btn" onclick="return window.TribecaClassroomAddUnit(this.closest('form'),event)">Añadir unidad</button>
        </form>
        <div class="classroom-unit-list classroom-unit-list-v91">${units.length?units.map(u=>classroomUnitCard(u,s)).join(''):'<div class="empty-state">Sin unidades todavía.</div>'}</div>
      </div>
    </details>`;
  }
  function classroomUnitCard(u,s){
    const materials=sortMaterialsAsc((State.data.materials||[]).filter(m=>String(m.class_unit_id||'')===String(u.id) || (String(m.class_subject_id||'')===String(s.id) && String(m.unit_title||m.unit||'')===String(u.title||''))));
    const matRows=materials.length?`<div class="classroom-material-visibility-list classroom-material-list-v91">${materials.map(classroomMaterialVisibilityRow).join('')}</div>`:'<div class="empty-state">Sin materiales en esta unidad.</div>';
    return `<details class="classroom-unit-card classroom-unit-card-v92 ${u.hidden?'is-hidden-classroom':''}">
      <summary>
        <div><strong>${safe(u.title)}</strong><small>${materials.length} material${materials.length===1?'':'es'} · ${u.hidden?'oculta':'visible'}</small></div>
      </summary>
      <div class="classroom-unit-actions-v92">
        <button type="button" class="primary-btn" data-t82-new-material data-class-id="${safe(s.class_id)}" data-subject="${safe(s.subject)}" data-unit="${safe(u.title)}" onclick="return window.TribecaClassroomNewMaterial(this,event)">Crear material</button>
        <button type="button" data-t82-toggle-unit="${safe(u.id)}" onclick="return window.TribecaClassroomToggleUnit(this,event)">${u.hidden?'Mostrar unidad':'Ocultar unidad'}</button>
        <button type="button" data-t82-delete-unit="${safe(u.id)}" onclick="return window.TribecaClassroomDeleteUnit(this,event)">Eliminar unidad</button>
      </div>
      ${classUnitEditDrawer(u,s)}
      ${matRows}
    </details>`;
  }
  function classroomMaterialVisibilityRow(m){
    const meta=materialTypeMeta(materialVisualKind(m));
    return `<article class="classroom-material-row ${m.hidden?'is-hidden-material':''}">
      <div><strong>${safe(m.title||'Material sin título')}</strong><small>${safe(meta.label)} · ${m.hidden?'oculto para alumnado':'visible para alumnado'}</small></div>
      <div class="inline-actions classroom-material-actions">
        <button type="button" data-t33-open-mat="${safe(m.id)}">Abrir</button>
        <button type="button" data-t32-edit-mat="${safe(m.id)}">Editar</button>
        <button type="button" data-t86-duplicate-material="${safe(m.id)}" onclick="return window.TribecaClassroomDuplicateMaterial(this,event)">Duplicar</button>
        <button type="button" data-t83-toggle-material="${safe(m.id)}" onclick="return window.TribecaClassroomToggleMaterial(this,event)">${m.hidden?'Mostrar':'Ocultar'}</button>
        <button type="button" data-t85-unlink-material="${safe(m.id)}" onclick="return window.TribecaClassroomUnlinkMaterial(this,event)">Quitar vínculo</button>
        <button type="button" data-t86-delete-class-material="${safe(m.id)}" onclick="return window.TribecaClassroomDeleteMaterial(this,event)">Eliminar</button>
      </div>
    </article>`;
  }
  function classroomAssignmentBox(c){
    const students=(State.data.students||[]).slice().sort((a,b)=>{
      const aIn=String(studentActiveClass(a.id)?.id||'')===String(c.id), bIn=String(studentActiveClass(b.id)?.id||'')===String(c.id);
      if(aIn!==bIn) return aIn?-1:1;
      const stageCmp=String(a.stage||'').localeCompare(String(b.stage||''),'es');
      if(stageCmp) return stageCmp;
      const courseCmp=String(a.course||'').localeCompare(String(b.course||''),'es',{numeric:true});
      if(courseCmp) return courseCmp;
      return displayName(a).localeCompare(displayName(b),'es');
    });
    return `<details class="classroom-assignment-box"><summary><span>Asignar o promocionar alumnado</span><em>${classroomStudentsCount(c.id)} asignado${classroomStudentsCount(c.id)===1?'':'s'}</em></summary>
      <form class="classroom-assignment-form" onsubmit="return false;">
        <input type="hidden" name="classId" value="${safe(c.id)}">
        <p class="meta">Selecciona alumnado. “Guardar lista” actualiza solo esta clase. “Asignar/promocionar a esta clase” retira al alumnado seleccionado de otras clases activas y actualiza su centro, etapa y curso al de esta clase.</p>
        <input class="t16-search" type="search" placeholder="Filtrar alumnado..." data-t16-student-search>
        <div class="classroom-student-select-list">
          ${students.map(s=>{ const current=studentActiveClass(s.id); const checked=String(current?.id||'')===String(c.id); return `<label data-student-name="${safe((displayName(s)+' '+s.username+' '+academicLine(s)+' '+(current?.name||'')).toLowerCase())}" class="${checked?'is-assigned-here':current?'is-assigned-elsewhere':''}"><input type="checkbox" name="studentIds" value="${safe(s.id)}" ${checked?'checked':''}><span><strong>${safe(displayName(s))}</strong><small>${safe(academicLine(s))}${current?` · Clase actual: ${safe(current.name||classroomAutoName(current.center,current.stage,current.course))}`:' · Sin clase activa'}</small></span></label>`; }).join('')}
        </div>
        <div class="inline-actions">
          <button type="button" class="secondary-btn" onclick="return window.TribecaClassroomSaveStudents(this,event,'assign')">Guardar lista de esta clase</button>
          <button type="button" class="primary-btn" onclick="return window.TribecaClassroomSaveStudents(this,event,'promote')">Asignar/promocionar a esta clase</button>
        </div>
      </form>
    </details>`;
  }

  function classBootstrapGroups(){
    const students=(State.data.students||[]).filter(Boolean);
    const map=new Map();
    students.forEach(s=>{
      const center=String(s.center||'').trim();
      const stage=String(s.stage||'').trim();
      const course=String(s.course||'').trim();
      if(!center || !stage || !course) return;
      const key=[center,stage,course].join('||');
      if(!map.has(key)) map.set(key,{center,stage,course,students:[]});
      map.get(key).students.push(s);
    });
    return [...map.values()].sort((a,b)=>a.center.localeCompare(b.center,'es') || a.stage.localeCompare(b.stage,'es') || a.course.localeCompare(b.course,'es',{numeric:true}));
  }
  function matchingClassForGroup(g){
    return (State.data.classrooms||[]).find(c=>String(c.center||'')===String(g.center) && String(c.stage||'')===String(g.stage) && String(c.course||'')===String(g.course) && c.active!==false) || null;
  }
  function classroomBootstrapPanel(){
    const groups=classBootstrapGroups();
    const studentsWithData=groups.reduce((n,g)=>n+g.students.length,0);
    const missing=(State.data.students||[]).filter(s=>!String(s.center||'').trim() || !String(s.stage||'').trim() || !String(s.course||'').trim());
    const rows=groups.map(g=>{ const existing=matchingClassForGroup(g); return `<article class="bootstrap-class-row ${existing?'is-existing':'is-new'}"><div><strong>${safe(classroomAutoName(g.center,g.stage,g.course))}</strong><small>${safe([g.center,g.stage,g.course].join(' · '))} · ${g.students.length} alumno${g.students.length===1?'':'s'}</small></div><em>${existing?'Ya existe':'Se creará'}</em></article>`; }).join('');
    return `<section class="window-panel classroom-bootstrap-panel">
      <div class="bootstrap-head">
        <div>
          <p class="eyebrow">Asistente de transición</p>
          <h3>Crear clases desde el alumnado actual</h3>
          <p class="meta">Agrupa automáticamente tus perfiles por centro, etapa y curso, crea las clases que falten y asigna cada alumno a su clase correspondiente.</p>
        </div>
        <strong>${groups.length}</strong>
      </div>
      <div class="bootstrap-class-list">${rows || '<div class="empty-state">No hay alumnado con centro, etapa y curso completos.</div>'}</div>
      ${missing.length?`<div class="bootstrap-warning"><strong>${missing.length} perfil${missing.length===1?'':'es'} sin datos completos</strong><p>Estos perfiles no se asignarán hasta que tengan centro, etapa y curso: ${missing.map(s=>safe(displayName(s))).join(', ')}.</p></div>`:''}
      <div class="inline-actions">
        <button type="button" class="primary-btn" onclick="return window.TribecaClassroomBootstrapFromStudents(event)" ${studentsWithData?'':'disabled'}>Crear clases y asignar alumnado actual</button>
      </div>
    </section>`;
  }
  function legacyMaterialsForClass(c){
    return (State.data.materials||[])
      .filter(m=>m && !m.class_id && m.hidden!==true)
      .filter(m=>{
        const sameCenter = !m.center || String(m.center)===String(c.center);
        const sameStage = !m.stage || String(m.stage)===String(c.stage);
        const sameCourse = !m.course || String(m.course)===String(c.course);
        return sameCenter && sameStage && sameCourse;
      })
      .sort((a,b)=>String(a.subject||'').localeCompare(String(b.subject||''),'es') || String(a.unit_title||a.unit||'').localeCompare(String(b.unit_title||b.unit||''),'es',{numeric:true}) || String(a.title||'').localeCompare(String(b.title||''),'es'));
  }
  function classroomLegacyMigrationBox(c){
    const legacy=legacyMaterialsForClass(c);
    if(!legacy.length) return `<details class="classroom-migration-box is-empty"><summary><span>Migración desde el sistema anterior</span><em>0 pendientes</em></summary><div class="empty-state">No hay materiales antiguos coincidentes pendientes de vincular a esta clase.</div></details>`;
    const bySubject=new Map();
    legacy.forEach(m=>{ const s=m.subject||'Sin materia'; if(!bySubject.has(s)) bySubject.set(s, []); bySubject.get(s).push(m); });
    const rows=[...bySubject.entries()].map(([subject,items])=>{
      const byUnit=new Map();
      items.forEach(m=>{ const u=m.unit_title||m.unit||'Unidad 1'; if(!byUnit.has(u)) byUnit.set(u, []); byUnit.get(u).push(m); });
      return `<details class="migration-subject-group" open><summary>${safe(subject)} <em>${items.length}</em></summary>${[...byUnit.entries()].map(([unit,mats])=>`<div class="migration-unit-group"><strong>${safe(unit)}</strong>${mats.map(m=>`<label><input type="checkbox" name="materialIds" value="${safe(m.id)}" checked><span>${safe(m.title||'Material sin título')}<small>${safe([m.center,m.stage,m.course].filter(Boolean).join(' · '))}</small></span></label>`).join('')}</div>`).join('')}</details>`;
    }).join('');
    return `<details class="classroom-migration-box"><summary><span>Migración desde el sistema anterior</span><em>${legacy.length} pendiente${legacy.length===1?'':'s'}</em></summary>
      <form class="classroom-migration-form" onsubmit="return window.TribecaClassroomMigrateMaterials(this,event)">
        <input type="hidden" name="classId" value="${safe(c.id)}">
        <p class="meta">Estos materiales antiguos coinciden con el centro, etapa y curso de esta clase, pero todavía no están vinculados al nuevo modelo. Al migrarlos quedarán dentro de sus materias y unidades correspondientes.</p>
        <div class="migration-list">${rows}</div>
        <div class="inline-actions">
          <button type="button" class="secondary-btn" onclick="this.closest('form').querySelectorAll('input[name=materialIds]').forEach(x=>x.checked=true); return false;">Seleccionar todo</button>
          <button type="button" class="secondary-btn" onclick="this.closest('form').querySelectorAll('input[name=materialIds]').forEach(x=>x.checked=false); return false;">Deseleccionar todo</button>
          <button type="submit" class="primary-btn">Migrar seleccionados a esta clase</button>
        </div>
      </form>
    </details>`;
  }
  async function addClassSubject(form){
    const status=form?.querySelector?.('[data-t90-subject-status]');
    const setStatus=(msg,kind='info')=>{
      if(status){ status.textContent=msg; status.className='form-status '+(kind==='ok'?'is-ok':kind==='error'?'is-error':'is-info'); }
      if(msg) toast(msg);
    };
    const fd=new FormData(form);
    const classId=String(fd.get('classId')||'').trim();
    const subject=String(fd.get('subjectCustom')||fd.get('subject')||'').trim();
    if(!classId || !subject){ setStatus('Selecciona o escribe una materia.','error'); return; }
    const existing=(State.data.classSubjects||[]).find(s=>String(s.class_id)===String(classId) && String(s.subject||'').toLowerCase()===subject.toLowerCase());
    if(existing){ setStatus('La materia ya existe en esta clase.','info'); return; }
    setStatus('Guardando materia…','info');
    const {error}=await table('tribeca_class_subjects').insert({class_id:classId, subject, sort_order:(State.data.classSubjects||[]).filter(s=>String(s.class_id)===String(classId)).length+1, hidden:false, active:true});
    if(error){ setStatus(error.message || 'No se pudo añadir la materia.','error'); throw error; }
    await log('classroom','Materia añadida a clase',{class_id:classId,subject});
    await loadData(true);
    setStatus(`Materia “${subject}” añadida correctamente.`, 'ok');
    rerender();
  }
  function classUnitFormStatus(form, message='', kind='info'){
    const box=form?.querySelector?.('[data-t126-unit-status]');
    if(!box) return;
    box.textContent=message||'';
    box.classList.remove('is-ok','is-error','is-info');
    if(message) box.classList.add(kind==='ok'?'is-ok':kind==='error'?'is-error':'is-info');
  }
  async function addClassUnit(form){
    if(!form || form.dataset.t126Saving==='1') return false;
    const btn=form.querySelector('[data-t126-add-unit], .primary-btn');
    form.dataset.t126Saving='1';
    if(btn){ btn.disabled=true; btn.dataset.originalText=btn.textContent; btn.textContent='Añadiendo…'; }
    try{
      const fd=new FormData(form);
      const classSubjectId=String(fd.get('classSubjectId')||'').trim();
      const title=String(fd.get('title')||'').trim();
      if(!classSubjectId || !title){ classUnitFormStatus(form,'Escribe el título de la unidad.','error'); toast('Escribe el título de la unidad.'); return false; }
      const s=classSubjectById(classSubjectId);
      if(!s){ classUnitFormStatus(form,'No se encontró la materia.','error'); toast('No se encontró la materia.'); return false; }
      const existing=(State.data.classUnits||[]).find(u=>String(u.class_subject_id)===String(classSubjectId) && String(u.title||'').toLowerCase()===title.toLowerCase());
      if(existing){ classUnitFormStatus(form,'La unidad ya existe en esta materia.','error'); toast('La unidad ya existe en esta materia.'); return false; }
      classUnitFormStatus(form,'Guardando unidad…','info');
      const payload={class_subject_id:classSubjectId, title, sort_order:(State.data.classUnits||[]).filter(u=>String(u.class_subject_id)===String(classSubjectId)).length+1, hidden:false, active:true};
      const inserted=await table('tribeca_class_units').insert(payload).select('*').single();
      if(inserted.error) throw inserted.error;
      await log('classroom','Unidad añadida a materia de clase',{class_subject_id:classSubjectId,title});
      await loadData(true);
      State.currentClassSubjectId=classSubjectId;
      State.currentClassId=s.class_id;
      State.currentSubject=s.subject;
      State.activeInlineSection='classSubjectDetail';
      State.activeInlineOptions={classSubjectId, classId:s.class_id, subject:s.subject};
      toast(`Unidad “${title}” añadida.`);
      classUnitFormStatus(form,'Unidad añadida.','ok');
      renderCurrentClassroomContext();
    }catch(e){
      console.error('[Tribeca Aula] No se pudo añadir la unidad:', e);
      classUnitFormStatus(form, e.message || 'No se pudo añadir la unidad.','error');
      toast(e.message || 'No se pudo añadir la unidad.');
    }finally{
      form.dataset.t126Saving='';
      if(btn){ btn.disabled=false; btn.textContent=btn.dataset.originalText || 'Añadir unidad'; }
    }
    return false;
  }
  async function saveClassUnit(form){
    if(!form || form.dataset.t126Saving==='1') return false;
    const btn=form.querySelector('[data-t126-save-unit], .primary-btn');
    form.dataset.t126Saving='1';
    if(btn){ btn.disabled=true; btn.dataset.originalText=btn.textContent; btn.textContent='Guardando…'; }
    try{
      const fd=new FormData(form);
      const unitId=String(fd.get('unitId')||'').trim();
      const classSubjectId=String(fd.get('classSubjectId')||'').trim();
      const title=String(fd.get('title')||'').trim();
      const sortOrderRaw=String(fd.get('sortOrder')||'').trim();
      if(!unitId || !title){ classUnitFormStatus(form,'Escribe el título de la unidad.','error'); toast('Escribe el título de la unidad.'); return false; }
      const current=(State.data.classUnits||[]).find(u=>String(u.id)===String(unitId));
      if(!current){ classUnitFormStatus(form,'No se encontró la unidad. Recarga el aula e inténtalo de nuevo.','error'); toast('No se encontró la unidad.'); return false; }
      const subject=classSubjectById(classSubjectId || current.class_subject_id);
      const parentSubjectId=String(current.class_subject_id || classSubjectId || '');
      const duplicate=(State.data.classUnits||[]).find(u=>String(u.id)!==String(unitId) && String(u.class_subject_id||'')===parentSubjectId && String(u.title||'').trim().toLowerCase()===title.toLowerCase());
      if(duplicate){ classUnitFormStatus(form,'Ya existe otra unidad con ese título.','error'); toast('Ya existe otra unidad con ese título.'); return false; }
      const payload={title, hidden:!!fd.get('hidden')};
      const sortNumber=Number(sortOrderRaw);
      if(Number.isFinite(sortNumber) && sortNumber>0) payload.sort_order=sortNumber;
      classUnitFormStatus(form,'Guardando cambios…','info');
      let res=await table('tribeca_class_units').update({...payload, updated_at:new Date().toISOString()}).eq('id', unitId).select('*').maybeSingle();
      const msg=String(res?.error?.message || res?.error?.details || '');
      if(res.error && /updated_at|schema cache|column/i.test(msg)){
        res=await table('tribeca_class_units').update(payload).eq('id', unitId).select('*').maybeSingle();
      }
      if(res.error) throw res.error;
      if(!res.data) throw new Error('Supabase no ha devuelto la unidad actualizada. Revisa permisos RLS de tribeca_class_units o recarga la sesión.');
      const saved=res.data;
      State.data.classUnits=(State.data.classUnits||[]).map(u=>String(u.id)===String(unitId)?{...u,...saved}:u);
      if(title!==current.title){
        await maybe(table('subject_materials').update({unit_title:title, unit:title}).eq('class_unit_id', unitId), null);
      }
      await log('classroom','Unidad editada',{unit_id:unitId,title});
      await loadData(true);
      if(subject){
        State.currentClassSubjectId=subject.id;
        State.currentClassId=subject.class_id;
        State.currentSubject=subject.subject;
        State.activeInlineSection='classSubjectDetail';
        State.activeInlineOptions={classSubjectId:subject.id, classId:subject.class_id, subject:subject.subject};
      }
      toast('Unidad actualizada.');
      classUnitFormStatus(form,'Unidad actualizada.','ok');
      renderCurrentClassroomContext();
    }catch(e){
      console.error('[Tribeca Aula] No se pudo editar la unidad:', e);
      const msg=e.message || 'No se pudo editar la unidad.';
      classUnitFormStatus(form, msg, 'error');
      toast(msg);
    }finally{
      form.dataset.t126Saving='';
      if(btn){ btn.disabled=false; btn.textContent=btn.dataset.originalText || 'Guardar unidad'; }
    }
    return false;
  }


  async function bootstrapClassesFromStudents(){
    if(!roleTeacher()) return toast('Solo la profesora puede crear clases desde alumnado.');
    const groups=classBootstrapGroups();
    if(!groups.length) return toast('No hay alumnado con centro, etapa y curso completos.');
    if(!confirm('¿Crear las clases correspondientes al alumnado actual y asignar cada alumno a su clase?')) return;
    const academicYear=currentAcademicYearLabel();
    const allStudentIds=groups.flatMap(g=>g.students.map(s=>String(s.id))).filter(Boolean);
    const groupClassPairs=[];
    for(const g of groups){
      let classroom=matchingClassForGroup(g);
      if(!classroom){
        classroom=await maybe(table('tribeca_classes').insert({
          name:classroomAutoName(g.center,g.stage,g.course),
          center:g.center,
          stage:g.stage,
          course:g.course,
          academic_year:academicYear,
          description:'Clase creada automáticamente desde los perfiles de alumnado actuales.',
          hidden:false,
          active:true,
          created_by:State.profile.id,
          updated_at:new Date().toISOString()
        }).select('*').single(), null);
        if(!classroom) throw new Error(`No se pudo crear la clase ${g.course} · ${g.center}.`);
        State.data.classrooms=[...(State.data.classrooms||[]), classroom];
      }
      groupClassPairs.push({group:g,classroom});
    }
    if(allStudentIds.length){
      const {error:offError}=await table('tribeca_class_students').update({active:false, withdrawn_at:todayIso(), updated_at:new Date().toISOString()}).in('user_id', allStudentIds);
      if(offError) console.warn('[Tribeca Aula] No se pudieron desactivar asignaciones previas:', offError);
    }
    const upserts=[];
    groupClassPairs.forEach(({group,classroom})=>{
      group.students.forEach(s=>upserts.push({
        class_id:classroom.id,
        user_id:s.id,
        active:true,
        enrolled_at:todayIso(),
        withdrawn_at:null,
        notes:'Asignación automática desde perfiles existentes.',
        updated_at:new Date().toISOString()
      }));
    });
    if(upserts.length){
      const {error}=await table('tribeca_class_students').upsert(upserts,{onConflict:'class_id,user_id'});
      if(error) throw error;
    }
    await log('classroom','Clases creadas desde alumnado actual',{classes:groupClassPairs.length,students:upserts.length});
    await loadData(true);
    toast(`${groupClassPairs.length} clase${groupClassPairs.length===1?'':'s'} revisada${groupClassPairs.length===1?'':'s'} y ${upserts.length} alumno${upserts.length===1?'':'s'} asignado${upserts.length===1?'':'s'}.`);
    rerender();
  }
  async function duplicateClassMaterial(materialId){
    if(!roleTeacher()) return toast('Solo la profesora puede duplicar materiales.');
    const m=(State.data.materials||[]).find(x=>String(x.id)===String(materialId));
    if(!m) return toast('No se encontró el material.');
    const payload={
      title:`Copia de ${m.title || 'material'}`,
      body:m.body || m.description || m.content || '',
      description:m.description || m.body || m.content || '',
      content:m.content || m.body || m.description || '',
      image_url:m.image_url || null,
      link_url:m.link_url || null,
      font_size:Number(m.font_size||16),
      target_scope:m.target_scope || 'class',
      target_user_ids:parseArrayField(m.target_user_ids),
      center:m.center || null,
      stage:m.stage || null,
      course:m.course || null,
      created_by:State.profile.id,
      hidden:true,
      subject:m.subject || 'Apoyo personalizado',
      unit_title:m.unit_title || m.unit || 'Unidad 1',
      unit:m.unit || m.unit_title || 'Unidad 1',
      material_type:m.material_type || 'apuntes',
      badge_codes:parseArrayField(m.badge_codes),
      attachments:normalizeAttachments(m),
      class_id:m.class_id || null,
      class_subject_id:m.class_subject_id || null,
      class_unit_id:m.class_unit_id || null,
      embed_url:m.embed_url || null,
      embed_code:m.embed_code || null,
      embed_height:Number(m.embed_height||520)
    };
    await persistSupabaseRecord('subject_materials', payload, null);
    await log('classroom','Material duplicado dentro de clase',{source:m.id,title:payload.title,class_id:payload.class_id});
    await loadData(true);
    toast('Material duplicado y dejado oculto para revisarlo antes de mostrarlo.');
    rerender();
  }
  async function deleteClassMaterial(materialId){
    const m=(State.data.materials||[]).find(x=>String(x.id)===String(materialId));
    if(!m) return toast('No se encontró el material.');
    if(!confirm('¿Eliminar definitivamente este material? Esta acción sí borra la publicación.')) return;
    await maybe(table('material_completions').delete().eq('material_id', materialId));
    const {error}=await table('subject_materials').delete().eq('id',materialId);
    if(error) throw error;
    await log('classroom','Material eliminado desde clase',{id:materialId,title:m.title});
    await loadData(true);
    toast('Material eliminado.');
    rerender();
  }
  async function migrateLegacyMaterialsToClass(form){
    if(!roleTeacher()) throw new Error('Solo la profesora puede migrar materiales.');
    const fd=new FormData(form);
    const classId=String(fd.get('classId')||'').trim();
    const classroom=(State.data.classrooms||[]).find(c=>String(c.id)===String(classId));
    if(!classroom) throw new Error('No se encontró la clase.');
    const ids=fd.getAll('materialIds').map(String).filter(Boolean);
    if(!ids.length) throw new Error('Selecciona al menos un material para migrar.');
    let count=0;
    for(const id of ids){
      const m=(State.data.materials||[]).find(x=>String(x.id)===String(id));
      if(!m) continue;
      const subject=m.subject || 'Apoyo personalizado';
      const unit=m.unit_title || m.unit || 'Unidad 1';
      const linked=await ensureClassSubjectAndUnit(classId, subject, unit);
      const payload={
        class_id:classId,
        class_subject_id:linked.classSubjectId,
        class_unit_id:linked.classUnitId,
        center:classroom.center || m.center || null,
        stage:classroom.stage || m.stage || null,
        course:classroom.course || m.course || null,
        target_scope:'class',
        updated_at:new Date().toISOString()
      };
      await persistSupabaseRecord('subject_materials', payload, id);
      count++;
    }
    await log('classroom','Materiales antiguos migrados a clase',{class_id:classId,classroom:classroomLabel(classroom),count});
    await loadData(true);
    toast(`${count} material${count===1?'':'es'} migrado${count===1?'':'s'} a la clase.`);
    rerender();
  }
  async function unlinkMaterialFromClass(materialId){
    const m=(State.data.materials||[]).find(x=>String(x.id)===String(materialId));
    if(!m) return toast('No se encontró el material.');
    if(!confirm('¿Quitar el vínculo de este material con la clase? El material no se elimina, solo vuelve a quedar fuera del nuevo modelo.')) return;
    await persistSupabaseRecord('subject_materials',{class_id:null,class_subject_id:null,class_unit_id:null,updated_at:new Date().toISOString()},materialId);
    await log('classroom','Material desvinculado de clase',{id:materialId,title:m.title});
    await loadData(true);
    toast('Material desvinculado de la clase.');
    rerender();
  }
  async function saveClassroom(form){
    if(!roleTeacher()) throw new Error('Solo la profesora puede gestionar clases.');
    const fd=new FormData(form);
    const id=String(fd.get('id')||'').trim();
    const center=String(fd.get('center')||'').trim();
    const stage=String(fd.get('stage')||'').trim();
    const course=String(fd.get('course')||'').trim();
    if(!center || !stage || !course) throw new Error('Selecciona centro, etapa y curso.');
    const payload={
      name:String(fd.get('name')||'').trim() || classroomAutoName(center,stage,course),
      center, stage, course,
      academic_year:String(fd.get('academicYear')||'').trim() || currentAcademicYearLabel(),
      description:String(fd.get('description')||'').trim() || null,
      class_color:String(fd.get('classColor')||'').trim() || null,
      hidden:!!fd.get('hidden'),
      active:!!fd.get('active'),
      created_by:State.profile.id,
      updated_at:new Date().toISOString()
    };
    if(id) delete payload.created_by;
    await persistSupabaseRecord('tribeca_classes', payload, id || null);
    await log('classroom', id?'Clase actualizada':'Clase creada',{name:payload.name,center,stage,course});
    State.pendingClassroomEdit=null;
    await loadData(true);
    toast(id?'Clase actualizada.':'Clase creada.');
    rerender();
  }
  async function saveClassroomStudents(form, mode='assign'){
    if(!roleTeacher()) throw new Error('Solo la profesora puede asignar alumnado.');
    const fd=new FormData(form);
    const classId=String(fd.get('classId')||'').trim();
    const classroom=(State.data.classrooms||[]).find(c=>String(c.id)===String(classId));
    if(!classroom) throw new Error('No se encontró la clase.');
    const selected=fd.getAll('studentIds').map(String);
    const selectedSet=new Set(selected);
    const existing=classroomAssignments(classId);
    const today=todayIso();
    const toDeactivate=existing.filter(x=>!selectedSet.has(String(x.user_id)));
    if(toDeactivate.length){
      const ids=toDeactivate.map(x=>x.id).filter(Boolean);
      if(ids.length){
        const {error}=await table('tribeca_class_students').update({active:false, withdrawn_at:today, updated_at:new Date().toISOString()}).in('id',ids);
        if(error) throw error;
      }
    }
    if(mode==='promote' && selected.length){
      const other=activeClassAssignments().filter(x=>selectedSet.has(String(x.user_id)) && String(x.class_id)!==String(classId));
      const otherIds=other.map(x=>x.id).filter(Boolean);
      if(otherIds.length){
        const {error}=await table('tribeca_class_students').update({active:false, withdrawn_at:today, updated_at:new Date().toISOString()}).in('id',otherIds);
        if(error) throw error;
      }
    }
    if(selected.length){
      const upserts=selected.map(userId=>({class_id:classId,user_id:userId,active:true,enrolled_at:today,withdrawn_at:null,updated_at:new Date().toISOString()}));
      const {error}=await table('tribeca_class_students').upsert(upserts,{onConflict:'class_id,user_id'});
      if(error) throw error;
      if(mode==='promote'){
        const {error:profileError}=await table('profiles').update({center:classroom.center,stage:classroom.stage,course:classroom.course}).in('id',selected);
        if(profileError) console.warn('[Tribeca Aula] No se pudo actualizar centro/curso del perfil tras promoción:', profileError);
      }
    }
    await log('classroom', mode==='promote'?'Alumnado asignado/promocionado':'Lista de alumnado de clase actualizada',{class_id:classId,classroom:classroom.name||classroomAutoName(classroom.center,classroom.stage,classroom.course),selected:selected.length});
    await loadData(true);
    toast(mode==='promote'?'Alumnado asignado o promocionado a la clase.':'Lista de alumnado de la clase guardada.');
    rerender();
  }
  async function deleteClassroom(id){
    if(!confirm('¿Eliminar esta clase? Se eliminarán también sus asignaciones internas, pero no los perfiles de alumnado.')) return;
    const {error}=await table('tribeca_classes').delete().eq('id',id);
    if(error) throw error;
    await log('classroom','Clase eliminada',{id});
    await loadData(true);
    toast('Clase eliminada.');
    rerender();
  }
  window.TribecaSaveTeacherTask=async function(form,ev){
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    if(ev?.stopImmediatePropagation) ev.stopImmediatePropagation();
    if(!roleTeacher()) return false;
    if(!form) return false;
    const status=form.querySelector('[data-t117-task-status]');
    const btn=form.querySelector('[data-t117-save-task]');
    try{
      const fd=new FormData(form);
      const id=String(fd.get('id')||'').trim();
      const existing=id ? teacherTaskById(id) : null;
      const title=String(fd.get('title')||'').trim();
      const task_date=String(fd.get('taskDate')||todayIso()).slice(0,10);
      const notes=String(fd.get('notes')||'').trim()||null;
      if(!title){
        if(status){ status.textContent='Escribe la tarea pendiente.'; status.className='form-status teacher-task-status is-error'; }
        toast('Escribe la tarea pendiente.');
        form.elements.title?.focus?.();
        return false;
      }
      if(status){ status.textContent=id?'Guardando cambios…':'Añadiendo tarea…'; status.className='form-status teacher-task-status is-info'; }
      if(btn) btn.disabled=true;
      const payload={title, task_date, notes, done:!!existing?.done, active:true, updated_at:new Date().toISOString()};
      if(!id) payload.created_by=State.profile.id;
      await persistSupabaseRecord('teacher_tasks', payload, id||null);
      await loadData(true);
      State.teacherTasksOpen=true;
      State.pendingTeacherTaskEdit=null;
      toast(id?'Tarea actualizada.':'Tarea guardada.');
      refreshTeacherTasksArea(true);
    } catch(e){
      console.error('[Tribeca Aula] No se pudo guardar la tarea:', e);
      const msg=String(e?.message||'No se pudo guardar la tarea.');
      const friendly=/teacher_tasks|relation .* does not exist|schema cache|column/i.test(msg)
        ? 'No se pudo guardar la tarea. Comprueba que el SQL de la v114 está ejecutado en Supabase.'
        : msg;
      if(status){ status.textContent=friendly; status.className='form-status teacher-task-status is-error'; }
      toast(friendly);
      if(btn) btn.disabled=false;
    }
    return false;
  };
  window.TribecaToggleTeacherTask=function(id,done){
    if(!roleTeacher() || !id) return;
    persistSupabaseRecord('teacher_tasks',{done:!!done, updated_at:new Date().toISOString()},id).then(()=>loadData(true)).then(()=>{
      State.teacherTasksOpen=true;
      refreshTeacherTasksArea(false);
    }).catch(e=>toast(e.message||'No se pudo actualizar la tarea.'));
  };
  window.TribecaDeleteTeacherTask=function(id){
    if(!roleTeacher() || !id) return;
    if(!confirm('¿Eliminar esta tarea pendiente?')) return;
    persistSupabaseRecord('teacher_tasks',{active:false, updated_at:new Date().toISOString()},id).then(()=>loadData(true)).then(()=>{
      State.teacherTasksOpen=true;
      if(String(State.pendingTeacherTaskEdit||'')===String(id)) State.pendingTeacherTaskEdit=null;
      toast('Tarea eliminada.');
      refreshTeacherTasksArea(false);
    }).catch(e=>toast(e.message||'No se pudo eliminar la tarea.'));
  };

  window.TribecaClassroomEditDirect=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); const id=btn?.dataset?.t80EditClass; const c=(State.data.classrooms||[]).find(x=>String(x.id)===String(id)); if(c){ State.pendingClassroomEdit={...c}; rerender(); } return false; };
  window.TribecaClassroomCancelEdit=function(ev){ ev?.preventDefault?.(); State.pendingClassroomEdit=null; rerender(); return false; };
  window.TribecaSaveClassroomDirect=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); if(ev?.stopImmediatePropagation) ev.stopImmediatePropagation(); const form=btn?.closest?.('form') || document.getElementById('t80ClassroomForm'); if(!form){ toast('No se encontró el formulario de clase.'); return false; } const old=btn.textContent; btn.disabled=true; btn.textContent='Guardando…'; saveClassroom(form).catch(e=>{ console.error(e); toast(e.message||'No se pudo guardar la clase.'); }).finally(()=>{ btn.disabled=false; btn.textContent=old; }); return false; };
  window.TribecaClassroomSaveStudents=function(btn,ev,mode='assign'){ ev?.preventDefault?.(); ev?.stopPropagation?.(); const form=btn?.closest?.('form'); if(!form){ toast('No se encontró el formulario de alumnado.'); return false; } saveClassroomStudents(form,mode).catch(e=>{ console.error(e); toast(e.message||'No se pudo guardar el alumnado de la clase.'); }); return false; };
  window.TribecaClassroomToggleDirect=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); const id=btn?.dataset?.t80ToggleClass; const c=(State.data.classrooms||[]).find(x=>String(x.id)===String(id)); if(!c) return false; persistSupabaseRecord('tribeca_classes',{hidden:!c.hidden,updated_at:new Date().toISOString()},id).then(()=>loadData(true)).then(()=>{toast(c.hidden?'Clase visible.':'Clase oculta.'); rerender();}).catch(e=>toast(e.message||'No se pudo modificar la clase.')); return false; };
  window.TribecaClassroomDeleteDirect=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); deleteClassroom(btn?.dataset?.t80DeleteClass).catch(e=>toast(e.message||'No se pudo eliminar la clase.')); return false; };

  window.TribecaClassroomAddSubject=function(form,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); addClassSubject(form).catch(e=>{ console.error(e); toast(e.message||'No se pudo añadir la materia.'); }); return false; };
  window.TribecaClassroomAddUnit=function(form,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); if(ev?.stopImmediatePropagation) ev.stopImmediatePropagation(); addClassUnit(form); return false; };
  window.TribecaClassroomSaveUnit=function(form,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); if(ev?.stopImmediatePropagation) ev.stopImmediatePropagation(); saveClassUnit(form); return false; };
  window.TribecaClassroomNewMaterial=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); State.pendingPublicationEdit=null; State.prefillPublicationKind='material'; State.prefillPublicationClassId=btn?.dataset?.classId||null; State.prefillPublicationSubject=btn?.dataset?.subject||''; State.prefillPublicationUnit=btn?.dataset?.unit||'Unidad 1'; openTool('newPublication'); return false; };
  window.TribecaClassroomNewVideo=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); State.pendingPublicationEdit=null; State.prefillPublicationKind='video'; State.prefillPublicationClassId=btn?.dataset?.classId||null; State.prefillPublicationSubject=btn?.dataset?.subject||''; State.prefillPublicationUnit=btn?.dataset?.unit||'Unidad 1'; openTool('newPublication'); return false; };
  window.TribecaClassroomToggleSubject=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); const id=btn?.dataset?.t82ToggleSubject; const s=(State.data.classSubjects||[]).find(x=>String(x.id)===String(id)); if(!s) return false; persistSupabaseRecord('tribeca_class_subjects',{hidden:!s.hidden,updated_at:new Date().toISOString()},id).then(()=>loadData(true)).then(()=>{toast(s.hidden?'Materia visible.':'Materia oculta.'); rerender();}).catch(e=>toast(e.message||'No se pudo modificar la materia.')); return false; };
  window.TribecaClassroomToggleUnit=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); const id=btn?.dataset?.t82ToggleUnit; const u=(State.data.classUnits||[]).find(x=>String(x.id)===String(id)); if(!u) return false; persistSupabaseRecord('tribeca_class_units',{hidden:!u.hidden,updated_at:new Date().toISOString()},id).then(()=>loadData(true)).then(()=>{toast(u.hidden?'Unidad visible.':'Unidad oculta.'); renderCurrentClassroomContext();}).catch(e=>toast(e.message||'No se pudo modificar la unidad.')); return false; };
  window.TribecaClassroomToggleMaterial=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); const id=btn?.dataset?.t83ToggleMaterial; const m=(State.data.materials||[]).find(x=>String(x.id)===String(id)); if(!m) return false; persistSupabaseRecord('subject_materials',{hidden:!m.hidden},id).then(()=>loadData(true)).then(()=>{toast(m.hidden?'Material visible para el alumnado.':'Material oculto para el alumnado.'); rerender();}).catch(e=>toast(e.message||'No se pudo modificar el material.')); return false; };
  window.TribecaClassroomMigrateMaterials=function(form,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); migrateLegacyMaterialsToClass(form).catch(e=>{ console.error(e); toast(e.message||'No se pudieron migrar los materiales.'); }); return false; };
  window.TribecaClassroomUnlinkMaterial=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); unlinkMaterialFromClass(btn?.dataset?.t85UnlinkMaterial).catch(e=>{ console.error(e); toast(e.message||'No se pudo desvincular el material.'); }); return false; };
  window.TribecaClassroomBootstrapFromStudents=function(ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); bootstrapClassesFromStudents().catch(e=>{ console.error(e); toast(e.message||'No se pudieron crear las clases desde el alumnado.'); }); return false; };
  window.TribecaClassroomDuplicateMaterial=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); duplicateClassMaterial(btn?.dataset?.t86DuplicateMaterial).catch(e=>{ console.error(e); toast(e.message||'No se pudo duplicar el material.'); }); return false; };
  window.TribecaClassroomDeleteMaterial=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); deleteClassMaterial(btn?.dataset?.t86DeleteClassMaterial).catch(e=>{ console.error(e); toast(e.message||'No se pudo eliminar el material.'); }); return false; };
  window.TribecaClassroomDeleteSubject=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); const id=btn?.dataset?.t82DeleteSubject; if(!confirm('¿Eliminar esta materia de la clase? Los materiales ya publicados no se borrarán, pero pueden quedar sin vínculo de materia de clase.')) return false; table('tribeca_class_subjects').delete().eq('id',id).then(({error})=>{ if(error) throw error; }).then(()=>loadData(true)).then(()=>{toast('Materia eliminada de la clase.'); rerender();}).catch(e=>toast(e.message||'No se pudo eliminar la materia.')); return false; };
  window.TribecaClassroomDeleteUnit=function(btn,ev){ ev?.preventDefault?.(); ev?.stopPropagation?.(); const id=btn?.dataset?.t82DeleteUnit || btn?.dataset?.t124DeleteUnit; if(!confirm('¿Eliminar esta unidad? Los materiales ya publicados no se borrarán, pero pueden quedar sin vínculo de unidad de clase.')) return false; table('tribeca_class_units').delete().eq('id',id).then(({error})=>{ if(error) throw error; }).then(()=>loadData(true)).then(()=>{toast('Unidad eliminada.'); renderCurrentClassroomContext();}).catch(e=>toast(e.message||'No se pudo eliminar la unidad.')); return false; };


  function teacherSubjectsContent(){
    const stage=State.selectedSubjectStage, course=State.selectedSubjectCourse; const subjects=teacherSubjectList(stage,course);
    const custom=(State.data.subjects||[]).filter(x=>x.stage===stage&&x.course===course);
    const edit = State.pendingSubjectEdit || {};
    const editStage = edit.stage || stage, editCourse = edit.course || course, editSubject = edit.subject || '', editId = edit.id || '';
    return `<div class="teacher-subjects-layout v34-teacher-subjects"><section class="window-panel teacher-subjects-main"><h3>Materias vistas como alumnado</h3><p class="meta">Selecciona etapa y curso para revisar materias, publicaciones y visibilidad. Las materias ocultas aparecen atenuadas y marcadas con la etiqueta “Oculta”.</p><div class="window-grid teacher-subject-filters"><label>Etapa<select data-t18-subject-stage>${stageOptionsForCourse(course,stage)}</select></label><label>Curso<select data-t18-subject-course>${courseOptionsForStage(stage,course)}</select></label></div><div class="subjects-grid teacher-subject-preview v34-subject-preview">${subjects.map((sub,i)=>subjectCardFor(sub,i,course)).join('')||'<div class="empty-state">Selecciona un curso con materias cargadas.</div>'}</div></section><section class="window-panel subject-editor-panel v34-subject-editor"><h3>${editSubject?'Editar materia':'Crear curso o materia'}</h3><p class="meta">Cambia etapa, curso, nombre o visibilidad. Para cursos nuevos, escribe el curso y guarda una materia.</p><form id="t27SubjectForm" class="form-grid" method="post" action="javascript:void(0)"><input type="hidden" name="id" value="${safe(editId)}"><label>Etapa<select name="stage">${stageOptionsForCourse(editCourse,editStage)}</select></label><label>Curso<select name="course">${courseOptionsForStage(editStage,editCourse)}</select></label><label>O escribir curso nuevo<input name="courseCustom" placeholder="Ej.: FP Medio Higiene Bucodental"></label><label>Nombre de la materia<input name="subject" required maxlength="120" value="${safe(editSubject)}" placeholder="Ej.: Cultura Clásica"></label><label class="check-line"><input type="checkbox" name="active" ${edit.active===false?'':'checked'}> Visible para el alumnado</label><div class="inline-actions"><button class="primary-btn" type="button" data-t27-save-subject>Guardar materia</button><button class="secondary-btn" type="button" data-t31-clear-subject-editor>Limpiar editor</button></div><span class="form-status" data-t31-subject-status></span></form><hr><h3>Materias añadidas o modificadas</h3>${custom.map(x=>`<article class="list-item ${x.active===false?'is-hidden-item':''}"><strong>${safe(x.subject)}</strong><p>${safe(x.stage)} · ${safe(x.course)} · ${x.active===false?'oculta':'visible'}</p><div class="inline-actions"><button type="button" data-t27-edit-subject="${safe(x.id)}">Editar</button><button type="button" data-t33-toggle-subject="${safe(x.subject)}">${x.active===false?'Mostrar':'Ocultar'}</button><button type="button" data-t27-delete-subject="${safe(x.id)}">Eliminar</button></div></article>`).join('')||'<div class="empty-state">Todavía no hay materias personalizadas para este curso.</div>'}</section></div>`;
  }
  function subjectCardFor(subject, i, course){
    const mats=visibleMaterials(subject);
    const custom=subjectOverride(State.selectedSubjectStage,course,subject);
    const hidden=isSubjectHidden(State.selectedSubjectStage,course,subject);
    const vis=subjectVisual(subject);
    const units=new Set(mats.map(m=>m.unit_title||m.unit||'Unidad 1')).size||0;
    return `<article class="subject-card subject-${i%6} ${hidden?'is-hidden-subject':''}" tabindex="0" role="button" data-subject="${safe(subject)}" style="--subject-color:${vis.color}"><div class="subject-top"><span>${safe(course||'')}</span>${hidden?'<em class="subject-hidden-label">Oculta</em>':''}${roleTeacher()?`<button type="button" class="subject-menu-btn" data-t29-subject-menu="${safe(custom?.id||'')}" data-subject-name="${safe(subject)}">⋯</button>`:''}</div><div class="subject-mark">${safe(vis.glyph)}</div><h3>${safe(subject)}</h3><p>${mats.length} publicaciones · ${units} unidades</p><small>${hidden?'No se muestra al alumnado.':'Visible para el alumnado.'}</small>${roleTeacher()?`<div class="subject-inline-actions"><button type="button" data-t29-new-material="${safe(subject)}">Publicar material</button><button type="button" data-t33-toggle-subject="${safe(subject)}">${hidden?'Mostrar al alumnado':'Ocultar al alumnado'}</button>${custom?`<button type="button" data-t27-edit-subject="${safe(custom.id)}">Editar</button><button type="button" data-t27-delete-subject="${safe(custom.id)}">Eliminar</button>`:`<button type="button" data-t29-create-custom-subject="${safe(subject)}">Editar</button>`}</div>`:''}</article>`;
  }
  async function toggleSubjectVisibility(subject){
    const stage=State.selectedSubjectStage, course=State.selectedSubjectCourse;
    const current=subjectOverride(stage, course, subject);
    const currentlyHidden=isSubjectHidden(stage, course, subject);
    const payload=current ? {...current, active: currentlyHidden} : {id:null, stage, course, subject, active: currentlyHidden ? true : false};
    const rpc=await State.client.rpc('tribeca_save_subject_override_v30',{p_payload:payload});
    if(rpc.error) throw rpc.error;
    setLocalSubjectHidden(stage, course, subject, payload.active===false);
    await loadData(true);
    toast(payload.active===false?'Materia oculta al alumnado.':'Materia visible para el alumnado.');
    rerender();
  }

  function guidanceContent(){
    const rows = (State.data.guidance || []).filter(r => roleTeacher() || !r.hidden);
    if(roleTeacher()) { const edit=State.pendingGuidanceEdit||{}; return `<div class="guidance-layout t24-guidance-layout"><section class="window-panel guidance-editor-panel"><h3>${edit.id?'Editar recurso de orientación':'Nuevo recurso de orientación'}</h3><p class="meta">Publica o modifica tests, documentos, enlaces, presentaciones o recursos visibles para el alumnado.</p><form id="t24GuidanceForm" method="post" action="javascript:void(0)" class="form-grid"><input type="hidden" name="id" value="${safe(edit.id||'')}"><label>Tipo<select name="resourceType">${[['vocational_test','Test vocacional'],['emotional_test','Test de inteligencia emocional'],['itinerary','Itinerarios académicos'],['bachillerato','Bachillerato y accesos'],['fp','Formación Profesional'],['career','Carreras universitarias'],['link','Enlace externo'],['presentation','Presentación'],['pdf','Documento PDF']].map(([v,l])=>`<option value="${v}" ${String(edit.resource_type||'')===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Título<input name="title" required maxlength="140" value="${safe(edit.title||'')}"></label><label>Descripción<textarea name="body" rows="5">${safe(edit.body||'')}</textarea></label><label>Enlace<input name="linkUrl" type="url" placeholder="https://..." value="${safe(edit.link_url||'')}"></label><label>Archivo PDF, presentación, Word o imagen<input name="guidanceFile" type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,image/png,image/jpeg,image/webp"><input type="hidden" name="attachmentJson" value="${safe(JSON.stringify(Array.isArray(edit.attachments)?edit.attachments[0]||'':''))}"><small id="guidanceFileName">${safe(Array.isArray(edit.attachments)&&edit.attachments[0]?.name?edit.attachments[0].name:'')}</small></label><label class="check-line"><input type="checkbox" name="hidden" ${edit.hidden?'checked':''}> Ocultar de momento</label><div class="inline-actions"><button class="primary-btn" type="button" data-t24-save-guidance onclick="return window.TribecaSaveGuidanceDirect(this,event)">${edit.id?'Guardar cambios':'Guardar recurso'}</button>${edit.id?'<button class="secondary-btn" type="button" data-t35-cancel-guidance-edit>Cancelar edición</button>':''}</div><span class="form-status" data-t24-guidance-status></span></form></section><section class="window-panel guidance-list-panel"><h3>Recursos publicados</h3>${rows.map(g=>guidanceCard(g,true)).join('')||'<div class="empty-state">Todavía no hay recursos.</div>'}</section></div>`; }
    return `<section class="window-panel guidance-student"><h3>Orientación académica y profesional</h3><p class="meta">Recursos publicados por la profesora para orientar tus decisiones académicas y profesionales.</p>${rows.map(g=>guidanceCard(g,false)).join('')||'<div class="empty-state">Todavía no hay recursos de orientación publicados.</div>'}</section>`;
  }
  function guidanceTypeLabel(g){
    const raw = String(g.resource_type || g.resourceType || '').trim();
    const text = `${g.title||''} ${g.body||''}`.toLowerCase();
    if(/emocional|emotional/.test(text)) return 'Test de inteligencia emocional';
    const map = {vocational_test:'Test vocacional', emotional_test:'Test de inteligencia emocional', itinerary:'Itinerarios académicos', bachillerato:'Bachillerato y accesos', fp:'Formación Profesional', career:'Carreras universitarias', link:'Enlace externo', presentation:'Presentación', pdf:'Documento PDF'};
    return map[raw] || 'Recurso de orientación';
  }
  function guidanceCustomIconAsset(g){
    const text = `${g?.title||''} ${g?.body||''} ${g?.link_url||''}`.toLowerCase();
    if(text.includes('lumen-v') || text.includes('lumen v')) return 'assets/lumen-v-icon.webp';
    if(text.includes('itinera')) return 'assets/itinera-icon.webp';
    return '';
  }
  function guidanceTypeIcon(g){
    const label = guidanceTypeLabel(g).toLowerCase();
    if(label.includes('emocional')) return '🧠';
    if(label.includes('vocacional')) return '🧭';
    if(label.includes('bachiller')) return '🎓';
    if(label.includes('formación profesional')) return '🛠️';
    if(label.includes('universit')) return '🏛️';
    if(label.includes('pdf')) return '📄';
    if(label.includes('presentación')) return '🖥️';
    return '🔗';
  }
  function guidanceIconMarkup(g){
    const custom = guidanceCustomIconAsset(g);
    if(custom) return `<img src="${safe(custom)}" alt="Icono del recurso ${safe(g?.title || 'de orientación')}" loading="lazy">`;
    return `<span aria-hidden="true">${safe(guidanceTypeIcon(g))}</span>`;
  }
  function guidanceLinkClickRows(guidanceId){
    return (State.data.guidanceLinkClicks||[]).filter(x=>String(x.guidance_resource_id||'')===String(guidanceId));
  }
  function guidanceLinkClickStats(g){
    const rows=guidanceLinkClickRows(g.id);
    const map=new Map();
    rows.forEach(r=>{
      const key=String(r.user_id || r.username || r.user_display_name || 'sin_usuario');
      if(!map.has(key)) map.set(key,{user_id:r.user_id, name:r.user_display_name || studentName(r.user_id), username:r.username||'', count:0, last:''});
      const item=map.get(key);
      item.count++;
      const when=String(r.created_at||'');
      if(!item.last || when>item.last) item.last=when;
    });
    return {total:rows.length, people:[...map.values()].sort((a,b)=>b.count-a.count || String(a.name).localeCompare(String(b.name),'es'))};
  }
  function guidanceAccessMarkup(g){
    if(!roleTeacher() || !g.link_url) return '';
    const stats=guidanceLinkClickStats(g);
    if(!stats.total) return `<div class="guidance-access-box is-empty"><strong>Acceso al enlace</strong><span>Sin accesos registrados.</span></div>`;
    return `<details class="guidance-access-box"><summary><strong>Acceso al enlace</strong><span>${stats.people.length} persona${stats.people.length===1?'':'s'} · ${stats.total} clic${stats.total===1?'':'s'}</span></summary><div class="guidance-access-list">${stats.people.map(p=>`<div><span>${safe(p.name||'Usuario')}</span><small>${p.count} clic${p.count===1?'':'s'}${p.last?` · último: ${safe(fmtDT(p.last))}`:''}</small></div>`).join('')}</div></details>`;
  }
  async function recordGuidanceLinkClick(guidanceId, linkUrl){
    if(!guidanceId || !linkUrl || !State.profile || roleTeacher()) return;
    try{
      await table('guidance_link_clicks').insert({
        guidance_resource_id:guidanceId,
        user_id:State.profile.id,
        user_display_name:displayName(State.profile),
        username:State.profile.username || null,
        link_url:linkUrl,
        context:{
          title:(State.data.guidance||[]).find(g=>String(g.id)===String(guidanceId))?.title || '',
          center:State.profile.center || '',
          stage:State.profile.stage || '',
          course:State.profile.course || ''
        }
      });
    }catch(error){
      console.warn('[Tribeca Aula] No se pudo registrar el acceso al enlace de orientación:', error?.message || error);
    }
  }

  function guidanceCard(g,teacher=false){
    const a=Array.isArray(g.attachments)?g.attachments[0]:null;
    const typeLabel=guidanceTypeLabel(g);
    const link=g.link_url?`<a class="secondary-btn" href="${safe(g.link_url)}" target="_blank" rel="noopener" data-t119-guidance-link="${safe(g.id)}" data-t119-guidance-url="${safe(g.link_url)}">Abrir recurso</a>`:'';
    return `<article class="guidance-card-premium ${g.hidden?'is-hidden-item':''}"><div class="guidance-card-icon ${guidanceCustomIconAsset(g)?'has-custom-icon':''}">${guidanceIconMarkup(g)}</div><div class="guidance-card-body"><div class="guidance-card-top"><span>${safe(typeLabel)}</span>${g.hidden?'<em>Oculto</em>':''}</div><h3>${safe(g.title)}</h3><p>${safe(g.body||'')}</p>${teacher?guidanceAccessMarkup(g):''}<div class="guidance-actions">${link}${a?attachmentList({attachments:[a]}):''}${teacher?`<button type="button" data-t35-edit-guidance="${safe(g.id)}">Editar</button><button type="button" data-t18-toggle-guidance="${safe(g.id)}">${g.hidden?'Mostrar':'Ocultar'}</button><button type="button" data-t18-delete-guidance="${safe(g.id)}">Eliminar</button>`:''}</div></div></article>`;
  }

  async function saveGuidance(form){
    const fd = new FormData(form); const btn = form.querySelector('[type="submit"]'); const status=form.querySelector('[data-t24-guidance-status]');
    const setStatus=(msg,kind='info')=>{ if(status){ status.textContent=msg||''; status.classList.remove('is-ok','is-error','is-info'); if(msg) status.classList.add(kind==='ok'?'is-ok':kind==='error'?'is-error':'is-info'); } if(msg) toast(msg); };
    if(btn){ btn.disabled=true; btn.dataset.originalText=btn.textContent; btn.textContent='Guardando…'; }
    try{
      const attachment = fd.get('attachmentJson') ? JSON.parse(fd.get('attachmentJson')) : null;
      const rec = { id: fd.get('id') || null, resource_type: fd.get('resourceType'), title:String(fd.get('title')||'').trim(), body:fd.get('body')||'', link_url:String(fd.get('linkUrl')||'').trim()||null, attachments:attachment?[attachment]:[], hidden:!!fd.get('hidden'), created_by:State.profile.id };
      if(!rec.title) throw new Error('Escribe un título para el recurso de orientación.');
      const rpc = await State.client.rpc('tribeca_save_guidance_resource_v27', { p_payload: rec });
      if(rpc.error) throw rpc.error;
      await log('guidance','Recurso de orientación guardado',{title:rec.title});
      await loadData(true); State.pendingGuidanceEdit=null; setStatus('Recurso guardado correctamente.', 'ok'); form.reset(); rerender();
    } catch(e){ console.error(e); setStatus(`Error al guardar orientación: ${e?.message || e?.details || e}`, 'error'); }
    finally { if(btn){ btn.disabled=false; btn.textContent=btn.dataset.originalText || 'Guardar recurso'; } }
  }

  function profileContent(){
    const p = State.profile || {};
    const currentIcon = p.avatar_icon || '💡';
    const photo = teacherProfileImageUrl(p);
    const academic = academicLine(p);
    const panel = State.profilePanel || 'profile';
    const summary = `<section class="profile-summary-card">
        <div class="profile-summary-avatar">${photo ? `<img src="${safe(photo)}" alt="Retrato de perfil">` : safe(currentIcon)}</div>
        <div>
          <p class="eyebrow">Mi cuenta</p>
          <h2>${safe(displayName(p))}</h2>
          <p>${safe(p.role === 'teacher' ? 'Profesora' : academic)}</p>
        </div>
      </section>`;
    const tabs = `<div class="profile-account-tabs"><button type="button" data-t74-profile-tab="profile" class="${panel==='profile'?'is-active':''}">Mi perfil</button><button type="button" data-t74-profile-tab="password" class="${panel==='password'?'is-active':''}">Ajustes de contraseña</button><button type="button" data-t74-profile-tab="notifications" class="${panel==='notifications'?'is-active':''}">Ajustes de notificaciones</button><button type="button" data-t74-profile-tab="appearance" class="${panel==='appearance'?'is-active':''}">Apariencia</button></div>`;
    const profileCard = `<section class="profile-tool-card profile-avatar-card">
        <header class="profile-tool-head">
          <span class="profile-tool-icon">🎨</span>
          <div>
            <h3>Mi perfil</h3>
            <p>Elige uno de los iconos disponibles para que sea tu nueva imagen de perfil.</p>
          </div>
        </header>
        <form id="t16ProfileIconForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid">
          <div class="icon-grid t16-icon-grid profile-icon-grid" aria-label="Iconos de perfil">${icon100.map(ic=>`<button type="button" class="icon-choice ${(currentIcon)===ic?'is-selected':''}" data-t16-avatar="${safe(ic)}" title="Icono ${safe(ic)}">${safe(ic)}</button>`).join('')}</div>
          <input type="hidden" name="avatarIcon" value="${safe(currentIcon)}">
          ${roleTeacher()?`<div class="teacher-profile-image-box"><label>Imagen de perfil de profesora<input name="profileImage" type="file" accept="image/png,image/jpeg,image/webp"></label><input type="hidden" name="avatarImageUrl" value="${safe(photo||'')}"><span id="profileImagePreview" class="profile-preview-avatar">${photo?`<img src="${safe(photo)}" alt="Retrato de perfil">`:safe(currentIcon)}</span></div>`:''}
          <button class="primary-btn" type="submit">Guardar perfil</button>
        </form>
      </section>`;
    const pushStatus = tribecaPushStatusText();
    const notificationPermission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
    const teacherAccount = roleTeacher();
    const pushEnabled = tribecaPushEnabled() && notificationPermission === 'granted';
    const lastPushError = tribecaPushLastError();
    const lastPushOk = tribecaPushLastOk();
    const pushNotice = lastPushError ? `<p class="tribeca-push-feedback-v154 is-error">${safe(lastPushError)}</p>` : lastPushOk ? `<p class="tribeca-push-feedback-v154 is-ok">${safe(lastPushOk)}</p>` : (!pushEnabled && notificationPermission === 'granted' ? '<p class="tribeca-push-feedback-v154 is-info">El permiso del móvil ya está concedido. Pulsa el botón principal para terminar la activación.</p>' : '');
    const pushMainDisabled = !tribecaPushSupported() || notificationPermission === 'denied' || (pushEnabled && !teacherAccount);
    const pushMainAttr = pushEnabled ? (teacherAccount ? 'data-t152-test-push' : '') : 'data-t151-enable-push';
    const pushMainLabel = notificationPermission === 'denied' ? 'Notificaciones bloqueadas' : (pushEnabled ? (teacherAccount ? 'Enviar prueba de notificación' : 'Notificaciones activadas') : 'Activar notificaciones de la app');
    const resetLink = teacherAccount && notificationPermission === 'granted' ? '<button type="button" class="tribeca-inline-reset-v155" data-t151-disable-push>Desactivar o reiniciar este dispositivo</button>' : '';
    const supportWarning = tribecaPushSupported() ? '' : `<p class="tribeca-push-feedback-v154 is-error">${safe(teacherAccount ? 'Este dispositivo no permite completar la activación push web. Comprueba que estés usando la PWA o Chrome/Android con permisos del sitio.' : 'Este dispositivo no permite activar notificaciones de la app.')}</p>`;
    const notificationsCard = `<section class="profile-tool-card">
        <header class="profile-tool-head">
          <span class="profile-tool-icon">🔔</span>
          <div>
            <h3>Notificaciones de la app</h3>
            <p>Activa una vez este dispositivo para recibir avisos de Tribeca Aula.</p>
          </div>
        </header>
        <div class="tribeca-push-panel-v151 tribeca-push-panel-v155 tribeca-push-panel-v156">
          <div>
            <strong>Estado</strong>
            <p>${safe(pushStatus)}</p>
            <small>${safe(pushEnabled ? (teacherAccount ? 'Este dispositivo está registrado. El botón principal enviará una prueba.' : 'Este dispositivo está registrado para recibir avisos de Tribeca Aula.') : (teacherAccount ? 'Activa este móvil con tu cuenta docente para recibir avisos del alumnado. El alumnado puede activarlo en su propio móvil si quiere recibir avisos.' : 'Pulsa el botón principal para activar los avisos de Tribeca Aula en este dispositivo.'))}</small>
            ${supportWarning}
            ${pushNotice}
          </div>
          <div class="tribeca-push-actions-v151 tribeca-push-single-actions-v155">
            <button type="button" class="primary-btn tribeca-push-main-btn-v155" ${pushMainAttr} ${pushMainDisabled?'disabled':''}>${safe(pushMainLabel)}</button>
            ${resetLink}
          </div>
          <small>${safe(teacherAccount ? 'Los avisos por email quedan desactivados. El numerito del icono depende de Android/iOS y del navegador; la prueba válida es que la notificación llegue a la cortina del móvil.' : 'Recibirás avisos de Tribeca Aula cuando haya novedades dirigidas a ti.')}</small>
        </div>
      </section>`;
    const passwordCard = `<section class="profile-tool-card">
        <header class="profile-tool-head">
          <span class="profile-tool-icon">🔐</span>
          <div>
            <h3>Ajustes de contraseña</h3>
            <p>Cambia tu contraseña de acceso o solicita recuperación si no recuerdas la actual.</p>
          </div>
        </header>
        <form id="t16PasswordForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid">
          <label>Nueva contraseña<input name="password" type="password" minlength="6" required autocomplete="new-password"></label>
          <label>Repetir contraseña<input name="repeat" type="password" minlength="6" required autocomplete="new-password"></label>
          <button class="secondary-btn" type="submit">Modificar contraseña</button>
        </form>
        <form id="t16OwnResetForm" class="profile-reset-form">
          <button class="link-button" type="submit">Solicitar recuperación de contraseña</button>
        </form>
      </section>`;
    const academicCard = !roleTeacher()?`<section class="profile-tool-card profile-academic-card">
        <header class="profile-tool-head">
          <span class="profile-tool-icon">🎓</span>
          <div>
            <h3>Datos académicos</h3>
            <p>${safe(academic)}</p>
          </div>
        </header>
        <p class="meta">Estos datos solo puede modificarlos la profesora.</p>
      </section>`:'';
    const appearanceCard = `<section class="profile-tool-card appearance-tool-card-v167">
        <header class="profile-tool-head">
          <span class="profile-tool-icon">🌓</span>
          <div>
            <h3>Apariencia</h3>
            <p>Elige el modo claro u oscuro. El cambio se guarda en este dispositivo y funciona igual en la web y en la app instalada.</p>
          </div>
        </header>
        <div class="theme-choice-grid-v167" role="group" aria-label="Apariencia de Tribeca Aula">
          <button type="button" class="theme-choice-card-v167 ${document.body.classList.contains('is-dark')?'':'is-selected'}" data-t167-set-theme="light"><span>☀️</span><strong>Modo claro</strong><small>Fondo marfil, verde Tribeca y dorado clásico.</small></button>
          <button type="button" class="theme-choice-card-v167 ${document.body.classList.contains('is-dark')?'is-selected':''}" data-t167-set-theme="dark"><span>🌙</span><strong>Modo oscuro</strong><small>Negro suave, dorado y contraste alto para uso prolongado.</small></button>
        </div>
      </section>`;
    const selected = panel==='password' ? passwordCard : panel==='notifications' ? notificationsCard : panel==='appearance' ? appearanceCard : profileCard + academicCard;
    return `<div class="profile-hub">${summary}${tabs}${selected}</div>`;
  }

  async function saveProfileIcon(form){ const fd=new FormData(form); const patch={avatar_icon:fd.get('avatarIcon')||'💡'}; if(roleTeacher()) patch.avatar_image_url=fd.get('avatarImageUrl') || TRIBECA_TEACHER_PROFILE_IMAGE; const {error}=await table('profiles').update(patch).eq('id',State.profile.id); if(error) throw error; Object.assign(State.profile,patch); updateTopProfile(); await updatePresence(); toast('Perfil actualizado correctamente.'); }
  async function saveProfileNotifications(form){ const fd=new FormData(form); const prefs=tribecaAllAppNotificationPrefs(); const patch={personal_email:fd.get('personalEmail')||State.profile?.personal_email||null,notification_preferences:prefs}; await maybe(table('profiles').update(patch).eq('id',State.profile.id)); Object.assign(State.profile,patch); await refreshTribecaPushSubscriptionIfEnabled(); toast('Preferencias de la app guardadas.'); refreshProfileNotificationsPanel(); }
  async function changePassword(form){ const fd=new FormData(form); if(fd.get('password')!==fd.get('repeat')) return toast('Las contraseñas no coinciden.'); if(!confirm('¿Quieres modificar tu contraseña?')) return; const {error}=await State.client.auth.updateUser({password:fd.get('password')}); if(error) toast('No se pudo modificar la contraseña.'); else {toast('Contraseña modificada correctamente.'); form.reset();} }

  function difficultiesContent(){ const rows=State.data.difficulties||[]; return `<div class="window-grid"><section class="window-panel"><h3>Añadir o modificar materia</h3><form id="t16DifficultyForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid"><input type="hidden" name="id"><label>Materia<select name="subject">${subjectList().map(s=>`<option>${safe(s)}</option>`).join('')}</select></label><label>Nivel de dificultad<select name="level"><option>Baja</option><option selected>Media</option><option>Alta</option><option>Muy alta</option></select></label><label>Explica las dificultades<textarea name="notes" rows="4" placeholder="Describe qué contenidos, tareas o situaciones te resultan difíciles."></textarea></label><button class="primary-btn" type="submit">Guardar</button></form></section><section class="window-panel"><h3>Mis materias con dificultades</h3>${rows.length?rows.map(d=>`<article class="list-item"><strong>${safe(d.subject)}</strong><p>${safe(d.level)} · ${safe(d.notes||'')}</p><button data-t16-edit-diff="${d.id}">Editar</button><button data-t16-delete-diff="${d.id}">Eliminar</button></article>`).join(''):'<div class="empty-state">No has indicado materias con dificultades.</div>'}</section></div>`; }
  async function saveDifficulty(form){ const fd=new FormData(form); const rec={user_id:State.profile.id,subject:fd.get('subject'),level:fd.get('level'),notes:fd.get('notes')||''}; if(fd.get('id')) await maybe(table('difficult_subjects').update(rec).eq('id',fd.get('id'))); else await maybe(table('difficult_subjects').insert(rec)); await log('difficulty','Materia con dificultad actualizada',rec); await loadData(true); toast('Guardado.'); renderApp(); rerender(); }
  function gradesContent(){
    const rows=(State.data.grades||[]).filter(g=>String(g.user_id||g.student_id||'')===String(State.profile?.id||''));
    const subjects=subjectList();
    const bySubject=gradeSubjectSummaries(rows);
    const overall=gradeSummary(rows);
    const subjectOptions=subjects.map(s=>`<option value="${safe(s)}">${safe(s)}</option>`).join('');
    const subjectCards=bySubject.length ? bySubject.map(s=>{
      const evals = ['Primera evaluación','Segunda evaluación','Tercera evaluación'].map(ev=>{
        const evSum=gradeSummary(s.items.filter(x=>String(x.evaluation||'')===ev));
        return `<span class="eval-chip ${evSum.cls}">${ev.replace(' evaluación','')}: <strong>${evSum.avg}</strong></span>`;
      }).join('');
      return `<article class="grade-average-card ${s.cls}"><div><strong>${safe(s.subject)}</strong><span>${s.count} nota${s.count===1?'':'s'}</span></div><div class="grade-average-number">${s.avg}</div><small>${safe(s.label)}</small><div class="evaluation-average-row">${evals}</div></article>`;
    }).join('') : '<div class="empty-state">Aún no hay medias por asignatura. Registra tu primera calificación.</div>';
    const tableRows=rows.length ? rows.map(g=>{ const item=gradeSummary([g]); return `<tr><td>${safe(g.subject)}</td><td>${safe(g.unit||g.didactic_unit||'')}</td><td>${safe(g.evaluation)}</td><td>${safe(g.type||g.assessment_type||g.test_type||'')}</td><td>${g.weight?`${Number(g.weight).toFixed(0)} %`:'Normal'}</td><td><span class="grade-pill ${item.cls}">${Number(g.grade).toFixed(2)} · ${safe(item.label)}</span></td><td class="table-actions"><button type="button" data-t16-edit-grade="${g.id}">Editar</button><button type="button" data-t16-delete-grade="${g.id}">Eliminar</button></td></tr>`; }).join('') : `<tr><td colspan="7" class="empty-cell">Todavía no hay calificaciones registradas.</td></tr>`;
    return `<div class="grades-tool"><section class="window-panel grade-form-panel"><h3>Nueva calificación</h3><p class="meta">Añade tus notas del centro escolar. La media se calcula automáticamente por asignatura y por evaluación.</p><form id="t16GradeForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid grade-form"><input type="hidden" name="id"><label>Materia<select name="subject" required>${subjectOptions}</select></label><label>Unidad didáctica<input name="unit" maxlength="80" required placeholder="Ej.: Unidade 5"></label><label>Evaluación<select name="evaluation" required><option>Primera evaluación</option><option>Segunda evaluación</option><option>Tercera evaluación</option></select></label><label>Tipo de prueba<select name="type" required><option>Examen</option><option>Trabajo</option><option>Presentación</option><option>Examen oral</option></select></label><label>Nota<input name="grade" type="number" step="0.01" min="0" max="10" required placeholder="0-10"></label><label class="grade-weight-field">Ponderación opcional (%)<input name="weight" type="number" step="1" min="0" max="100" placeholder="Vacío = media normal"><small>La ponderación sirve para indicar cuánto pesa una prueba en la media. Por ejemplo, un examen puede valer el 70 % y un trabajo el 30 %. Si lo dejas en blanco, la plataforma calcula una media normal con el mismo valor para todas las notas.</small></label><button class="primary-btn" type="button" data-t29-save-grade onclick="return window.TribecaSaveGradeDirect(this,event)">Guardar calificación</button><div id="gradeSaveStatus" class="form-status" aria-live="polite"></div></form></section><section class="window-panel grade-summary-panel"><h3>Media total de todas las evaluaciones</h3><div class="t16-grade-summary ${overall.cls}"><strong>${overall.avg}</strong><span>${safe(overall.label)}</span></div><h3>Media por asignatura y evaluación</h3><div class="grade-average-grid">${subjectCards}</div></section><section class="window-panel grade-table-panel"><h3>Tabla de calificaciones</h3><div class="table-wrap"><table class="grades-table"><thead><tr><th>Materia</th><th>Unidad</th><th>Evaluación</th><th>Tipo</th><th>Ponderación</th><th>Nota</th><th>Acciones</th></tr></thead><tbody>${tableRows}</tbody></table></div></section></div>`;
  }
  function gradeSubjectSummaries(rows){
    const map=new Map();
    rows.forEach(r=>{ const key=r.subject||'Sin materia'; if(!map.has(key)) map.set(key,[]); map.get(key).push(r); });
    return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0],'es')).map(([subject,items])=>({subject,count:items.length,items,...gradeSummary(items)}));
  }
  function gradeSummary(rows){
    const clean=(rows||[]).filter(r=>!Number.isNaN(Number(r.grade)));
    if(!clean.length) return {avg:'—',label:'Sin calificaciones',cls:'is-empty'};
    const weighted=clean.filter(r=>Number(r.weight)>0);
    const totalW=weighted.reduce((a,r)=>a+Number(r.weight),0);
    const avg=totalW>0 ? weighted.reduce((a,r)=>a+(Number(r.grade)*Number(r.weight)),0)/totalW : clean.reduce((a,r)=>a+Number(r.grade),0)/clean.length;
    let label='Suspenso', cls='is-fail';
    if(avg>=9){label='Sobresaliente';cls='is-excellent'} else if(avg>=7){label='Notable';cls='is-notable'} else if(avg>=6){label='Bien';cls='is-good'} else if(avg>=5){label='Aprobado';cls='is-pass'}
    return {avg:avg.toFixed(2),label,cls};
  }
  async function saveGrade(form){
    const status = form?.querySelector?.('#gradeSaveStatus');
    const setStatus=(msg,kind='info')=>{ if(status){ status.textContent=msg; status.className=`form-status ${kind}`; } };
    try{
      if(!State.client || !State.profile?.id) throw new Error('No se detecta sesión activa. Cierra sesión y vuelve a entrar.');
      const fd=new FormData(form);
      const gradeValue=Number(String(fd.get('grade')||'').replace(',','.'));
      const weightRaw=String(fd.get('weight')||'').trim();
      const rec={ id:fd.get('id')||null, user_id:State.profile.id, student_id:State.profile.id, subject:String(fd.get('subject')||'').trim(), unit:String(fd.get('unit')||'').trim(), didactic_unit:String(fd.get('unit')||'').trim(), evaluation:String(fd.get('evaluation')||'').trim(), type:String(fd.get('type')||'').trim(), assessment_type:String(fd.get('type')||'').trim(), test_type:String(fd.get('type')||'').trim(), grade:gradeValue, weight:weightRaw!==''?Number(weightRaw):null };
      if(!rec.subject || !rec.unit || !rec.evaluation || !rec.type) throw new Error('Completa materia, unidad didáctica, evaluación y tipo de prueba.');
      if(Number.isNaN(rec.grade) || rec.grade<0 || rec.grade>10) throw new Error('La nota debe estar entre 0 y 10.');
      if(rec.weight!==null && (Number.isNaN(rec.weight) || rec.weight<0 || rec.weight>100)) throw new Error('La ponderación debe estar entre 0 y 100.');
      setStatus('Guardando calificación...', 'info');
      const {data,error}=await State.client.rpc('tribeca_save_student_grade_v29',{p_payload:rec});
      if(error) throw error;
      if(!data || data.ok===false) throw new Error(data?.message || 'Supabase no confirmó el guardado de la calificación.');
      try{ await log('grade','Calificación registrada',rec); }catch(_e){}
      await loadData(true); setStatus('Calificación guardada correctamente.', 'success'); toast('Calificación guardada correctamente.'); form.reset(); renderApp(); rerender();
    }catch(e){ console.error('Error al guardar calificación', e); const msg=e?.message || 'No se pudo guardar la calificación.'; setStatus(`Error: ${msg}`, 'error'); toast(`No se pudo guardar la calificación: ${msg}`); }
    return false;
  }
  function badgesContent(){ const earned=(State.data.userBadges||[]).filter(b=>b.user_id===State.profile.id || b.student_id===State.profile.id); return `<section class="window-panel"><h3>Mis insignias</h3>${earned.length?earned.map(b=>`<article class="r10-badge-card"><span class="badge-icon">${safe(badgeIcon(b.badge_code))}</span><div><strong>${safe(b.badge_name||badgeName(b.badge_code))}</strong><p>Asignada por la profesora.</p></div></article>`).join(''):'<div class="empty-state">Todavía no tienes insignias asignadas.</div>'}</section>`; }

  function claimableMaterials(){ const claimed=new Set((State.data.badgeClaims||[]).filter(c=>c.user_id===State.profile?.id).map(c=>`${c.material_id}:${c.badge_code}`)); return visibleMaterials().filter(m=>Array.isArray(m.badge_codes)&&m.badge_codes.some(c=>!claimed.has(`${m.id}:${c}`))); }
  async function claimBadge(materialId){ const mat=visibleMaterials().find(m=>m.id===materialId); if(!mat) return; for(const code of mat.badge_codes||[]) await maybe(table('badge_claim_requests').insert({user_id:State.profile.id, material_id:mat.id, material_title:mat.title, badge_code:code, status:'pending'})); await log('badge_claim','Insignia reclamada',{material:mat.title}); await loadData(true); toast('Solicitud enviada a la profesora.'); rerender(); }



  function aboutTribecaContent(){
    return `<section class="footer-about about-tribeca-panel" aria-labelledby="aboutTribecaTitle"><figure class="footer-about-portrait"><img src="assets/patricia-trillo-perfil.webp" alt="Retrato profesional de Patricia Trillo, pedagoga y fundadora de Tribeca Academia"></figure><div class="footer-about-copy"><p class="footer-about-kicker">Detrás de Tribeca</p><h2 id="aboutTribecaTitle">Patricia Trillo, una mirada pedagógica, creativa e innovadora</h2><p>Tribeca Academia nace del impulso profesional de Patricia Trillo, pedagoga y fundadora del proyecto. Con quince años de experiencia en enseñanza, refuerzo educativo y acompañamiento académico, Patricia ha trabajado con alumnado de distintas edades, etapas y perfiles, siempre desde una premisa clara: cada persona aprende de una forma singular y necesita una respuesta educativa ajustada, humana y rigurosa.</p><p>El proyecto comenzó cuando, con veintiún años, fundó Tribeca Academia para ofrecer apoyo educativo a alumnado de Primaria y ESO. Desde entonces, la academia ha crecido hasta convertirse en un espacio de aprendizaje cercano, exigente y creativo, orientado a acompañar trayectorias académicas diversas y a transformar las dificultades en oportunidades reales de mejora.</p><p>Su forma de entender la educación combina experiencia, curiosidad e innovación pedagógica. Esa búsqueda constante de mejora sostiene la identidad del proyecto: enseñar con rigor, acompañar con sensibilidad y crear soluciones educativas que tengan sentido para el alumnado de hoy.</p></div></section>`;
  }
  function legalContent(){ return `<section class="window-panel privacy-section"><h3>Aviso legal</h3><p>Tribeca Aula es una plataforma educativa vinculada a Tribeca Academia, situada en Calle Rafael Juan, 33, 15130, Corcubión, A Coruña. Esta web se destina a la comunicación educativa, la organización de materiales, el seguimiento académico y la atención pedagógica del alumnado.</p><h4>Política de privacidad</h4><p>Los datos personales se tratarán con la finalidad de gestionar el aula virtual, las comunicaciones, el seguimiento académico y las solicitudes realizadas por alumnado o familias. El acceso a datos sensibles de seguimiento, observaciones, NEE o NEAE queda restringido a la profesora.</p><h4>Política de cookies</h4><p>La plataforma puede utilizar almacenamiento local técnico para conservar preferencias de visualización, sesión, idioma, zoom o estado de lectura. Antes de incorporar analítica, publicidad o cookies no técnicas deberá habilitarse un sistema específico de consentimiento.</p><h4>Condiciones de uso</h4><p>El uso de Tribeca Aula debe ser respetuoso, veraz y exclusivamente educativo. No se permite compartir credenciales, suplantar identidades, difundir materiales sin autorización ni publicar contenido ofensivo.</p><h4>Protección de datos</h4><p>La versión operativa debe mantener autenticación, permisos y reglas de seguridad en Supabase. Las contraseñas no deben compartirse y cualquier solicitud de recuperación será gestionada manualmente por la profesora.</p></section>`; }
  function supportContent(){ return `<section class="window-panel"><h3>Soporte</h3><p>Para incidencias de acceso, materiales, mensajes o calendario, utiliza el formulario de contacto o escribe a la profesora.</p></section>`; }
  function contactContent(){ return `<section class="window-panel"><h3>Contacto</h3><form id="contactForm" method="post" action="javascript:void(0)" onsubmit="return window.TribecaSubmitForm ? window.TribecaSubmitForm(this,event) : false;" class="form-grid"><label>Nombre y apellidos<input name="name" required></label><label>Teléfono<input name="phone" required></label><label>Email<input name="email" type="email" required></label><label>Consulta<select name="topic"><option>Información sobre precios</option><option>Horarios</option><option>Metodología</option><option>Problemas de acceso</option><option>Otra consulta</option></select></label><label>Mensaje<textarea name="message" maxlength="600" rows="5"></textarea></label><button class="primary-btn" type="submit">Preparar email</button></form></section>`; }


  async function saveSubjectOverride(form){ const status=form.querySelector('[data-t31-subject-status]'); const setStatus=(m,k='info')=>{ if(status){ status.textContent=m; status.className='form-status '+(k==='ok'?'is-ok':k==='error'?'is-error':'is-info'); } if(m) toast(m); }; const fd=new FormData(form); const custom=String(fd.get('courseCustom')||'').trim(); const previousId=fd.get('id')||null; const before=previousId ? (State.data.subjects||[]).find(x=>x.id===previousId) : null; const payload={id:previousId,stage:fd.get('stage'),course:custom||fd.get('course'),subject:String(fd.get('subject')||'').trim(),active:!!fd.get('active')}; if(!payload.subject) return setStatus('Escribe el nombre de la materia.','error'); setStatus('Guardando materia…'); const rpc=await State.client.rpc('tribeca_save_subject_override_v30',{p_payload:payload}); if(rpc.error) throw rpc.error; const saved=rpc.data?.subject || rpc.data?.row || payload; if(before){ pushUndo('edición de materia', async()=>{ await State.client.rpc('tribeca_save_subject_override_v30',{p_payload:before}); }); } else if(saved?.id){ pushUndo('creación de materia', async()=>{ await State.client.rpc('tribeca_delete_subject_override_v30',{p_id:saved.id}); }); } await loadData(true); State.selectedSubjectStage=payload.stage; State.selectedSubjectCourse=payload.course; State.pendingSubjectEdit=null; setStatus('Materia guardada correctamente.','ok'); rerender(); }
  async function deleteSubjectOverride(id){ if(!confirm('¿Eliminar esta materia personalizada?')) return; const before=(State.data.subjects||[]).find(x=>x.id===id); const rpc=await State.client.rpc('tribeca_delete_subject_override_v30',{p_id:id}); if(rpc.error) throw rpc.error; if(before){ pushUndo('eliminación de materia', async()=>{ await State.client.rpc('tribeca_save_subject_override_v30',{p_payload:before}); }); } await loadData(true); toast('Materia eliminada.'); rerender(); }
  function studentName(id){ const s=(State.data.students||[]).find(x=>x.id===id); if(s) return displayName(s); if(id===State.profile?.id) return displayName(State.profile); return 'Usuario'; }
  function badgeName(code){ return badges.find(b=>b.code===code)?.name || code || 'Insignia'; } function badgeIcon(code){ return badges.find(b=>b.code===code)?.icon || '🏅'; }
  function readFileAsText(file){
    if(file?.text) return file.text();
    return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(String(r.result||'')); r.onerror=reject; r.readAsText(file); });
  }
  async function handleInteractiveFile(file, form){
    if(!file || !form) return;
    const preview=form.querySelector('#interactiveFilePreview');
    const embed=form.elements.embedCode;
    const typeInput=form.elements.publicationKind;
    const raw=await readFileAsText(file);
    const selectedKind=form.querySelector('input[name="publicationKind"]:checked')?.value || '';
    const exam=parseExamFromInteractiveCode(raw) || ((selectedKind==='exam' || /simulacro|examen|exam/i.test(file.name)) ? normalizeExamPayload(raw) : null);
    if(exam){
      if(embed) embed.value=examPayloadToStorage(exam);
      if(preview) preview.textContent=`${file.name} · simulacro autocorregible (${exam.questions.length} preguntas)`;
      const radios=form.querySelectorAll('input[name="publicationKind"]');
      radios.forEach(r=>{ r.checked = r.value==='exam'; });
      toast(`Simulacro importado: ${exam.questions.length} preguntas.`);
      return;
    }
    const schemaActivity=parseSchemaActivityFromInteractiveCode(raw);
    if(schemaActivity){
      if(embed) embed.value=schemaActivityPayloadToStorage(schemaActivity);
      if(preview) preview.textContent=`${file.name} · esquema autocorregible (${schemaActivity.dropZones.length} ocos)`;
      const radios=form.querySelectorAll('input[name="publicationKind"]');
      radios.forEach(r=>{ r.checked = r.value==='schema'; });
      toast(`Esquema importado: ${schemaActivity.dropZones.length} ocos autocorregibles.`);
      return;
    }
    const quiz=parseQuizFromInteractiveCode(raw);
    if(quiz){
      if(embed) embed.value=quizPayloadToStorage(quiz);
      if(preview) preview.textContent=`${file.name} · test nativo (${quiz.questions.length} preguntas)`;
      const radios=form.querySelectorAll('input[name="publicationKind"]');
      radios.forEach(r=>{ r.checked = r.value==='test'; });
      toast(`Test importado: ${quiz.questions.length} preguntas.`);
      return;
    }
    if(embed) embed.value=raw;
    if(preview) preview.textContent=`${file.name} · HTML/iframe guardado como recurso interactivo`;
    const radios=form.querySelectorAll('input[name="publicationKind"]');
    if(/game|juego/i.test(file.name)) radios.forEach(r=>{ r.checked = r.value==='game'; });
    else radios.forEach(r=>{ if(r.value==='test') r.checked=true; });
    toast('Recurso interactivo cargado.');
  }

  function normImage(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); }); }

  const STUDENT_PHOTO_MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
  const STUDENT_PHOTO_TARGET_BYTES = 850 * 1024;
  function approxDataUrlBytes(dataUrl=''){
    const raw = String(dataUrl||'').split(',')[1] || '';
    return Math.round(raw.length * 3 / 4);
  }
  function prettyBytes(bytes=0){
    const n=Number(bytes||0);
    if(n>=1024*1024) return `${(n/(1024*1024)).toFixed(n>=10*1024*1024?0:1)} MB`;
    if(n>=1024) return `${Math.round(n/1024)} KB`;
    return `${Math.round(n)} B`;
  }
  function studentPhotoFileToDataUrl(file){
    return new Promise((resolve,reject)=>{
      if(!file) return reject(new Error('No se ha seleccionado ninguna foto.'));
      if(!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type||'')) return reject(new Error('Formato no admitido. Usa PNG, JPG o WebP.'));
      if(file.size > STUDENT_PHOTO_MAX_UPLOAD_BYTES) return reject(new Error(`La foto supera ${prettyBytes(STUDENT_PHOTO_MAX_UPLOAD_BYTES)}. Reduce la imagen antes de subirla.`));
      const url=URL.createObjectURL(file);
      const img=new Image();
      img.onload=()=>{
        try{
          URL.revokeObjectURL(url);
          const sourceW=img.naturalWidth || img.width || 1;
          const sourceH=img.naturalHeight || img.height || 1;
          let best='';
          const dimensions=[960,840,720,600,520,440];
          const qualities=[.88,.8,.72,.64,.56,.48,.4];
          for(const maxDim of dimensions){
            const scale=Math.min(1, maxDim/sourceW, maxDim/sourceH);
            const w=Math.max(1, Math.round(sourceW*scale));
            const h=Math.max(1, Math.round(sourceH*scale));
            const canvas=document.createElement('canvas');
            canvas.width=w; canvas.height=h;
            const ctx=canvas.getContext('2d');
            ctx.fillStyle='#fff';
            ctx.fillRect(0,0,w,h);
            ctx.drawImage(img,0,0,w,h);
            for(const q of qualities){
              const data=canvas.toDataURL('image/jpeg', q);
              best=data;
              if(approxDataUrlBytes(data) <= STUDENT_PHOTO_TARGET_BYTES) return resolve(data);
            }
          }
          resolve(best);
        }catch(err){ reject(err); }
      };
      img.onerror=()=>{ URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen seleccionada.')); };
      img.src=url;
    });
  }



  async function promoteStudentFromForm(form){
    if(!roleTeacher()) return toast('Solo la profesora puede promocionar alumnado.');
    if(!confirm('¿Promocionar este alumno y borrar datos académicos del curso anterior?')) return;
    const fd=new FormData(form);
    const id=String(fd.get('id')||'').trim();
    const center=fd.get('center')||null, stage=fd.get('stage')||null, course=fd.get('course')||null;
    const rpc=await State.client.rpc('tribeca_teacher_promote_student_v30',{p_student_id:id,p_center:center,p_stage:stage,p_course:course});
    if(rpc.error){ toast(rpc.error.message||'No se pudo promocionar.'); return; }
    pushUndo('promoción de alumno', async()=>{ await State.client.rpc('tribeca_teacher_undo_last_v30',{}); }); await loadData(true); toast('Alumno promocionado y datos académicos anteriores limpiados.'); rerender();
  }

  async function handleManagedSubmit(form){
    if(!form || form.dataset.tribecaSubmitting === '1') return;
    form.dataset.tribecaSubmitting = '1';
    try {
      if(form.id==='t16LoginForm') await signIn(form.elements.username.value,form.elements.password.value);
      else if(form.id==='t16ResetForm') await requestReset(form);
      else if(form.id==='t16PublicationForm') await savePublication(form);
      else if(form.id==='t16EventForm') await saveEvent(form);
      else if(form.id==='t16AssignBadgeForm') await assignBadge(form);
      else if(form.id==='t16StudentProfileForm' || form.id==='t24StudentProfileForm') await saveStudentProfile(form);
      else if(form.id==='t16StudentMessageForm') await sendMessage(form,false);
      else if(form.id==='t16TeacherMessageForm') await sendMessage(form,true);
      else if(form.id==='t16ProfileIconForm') await saveProfileIcon(form);
      else if(form.id==='t16ProfileNotificationsForm') await saveProfileNotifications(form);
      else if(form.id==='t16PasswordForm') await changePassword(form);
      else if(form.id==='t16OwnResetForm') { await maybe(table('password_reset_requests').insert({username:State.profile.username,display_name:displayName(State.profile),status:'pending'})); toast('Solicitud enviada.'); }
      else if(form.id==='t16DifficultyForm') await saveDifficulty(form);
      else if(form.id==='t16GradeForm') await saveGrade(form);
      else if(form.id==='t16BillingForm') await saveBilling(form);
      else if(form.id==='t50PauseForm') await saveStudentPause(form);
      else if(form.id==='t18GuidanceForm' || form.id==='t24GuidanceForm') await saveGuidance(form);
      else if(form.id==='t27SubjectForm') await saveSubjectOverride(form);
      else if(form.id==='t78RepoMaterialForm') await saveRepositoryMaterial(form);
      else if(form.id==='t80ClassroomForm') await saveClassroom(form);
      else if(form.id==='contactForm'){ const fd=new FormData(form); location.href=`mailto:tribecaacademia@gmail.com?subject=${encodeURIComponent('Consulta Tribeca Aula: '+fd.get('topic'))}&body=${encodeURIComponent('Nombre: '+fd.get('name')+'\nTeléfono: '+fd.get('phone')+'\nEmail: '+fd.get('email')+'\n\n'+fd.get('message'))}`; }
    } catch(e){ console.error(e); toast(e.message || 'No se pudo completar la acción.'); }
    finally { setTimeout(()=>{ if(form) form.dataset.tribecaSubmitting = ''; }, 250); }
  }
  window.TribecaSubmitForm = function(form, ev){
    if(form?.matches?.('.native-exam-form, .native-quiz-form, [data-t130-quiz-form]')){
      if(ev) ev.preventDefault();
      return false;
    }
    if(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }
    if(form?.matches?.('[data-t126-unit-edit-form], .class-unit-edit-form')) return window.TribecaClassroomSaveUnit(form, ev);
    if(form?.matches?.('[data-t126-unit-create-form], .class-unit-create-form')) return window.TribecaClassroomAddUnit(form, ev);
    if(form?.matches?.('[data-t117-task-form], .teacher-task-form')) return window.TribecaSaveTeacherTask(form, ev);
    handleManagedSubmit(form);
    return false;
  };
  window.TribecaSaveStudentProfileDirect = function(btn, ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); } const form = btn?.closest?.('form') || (document.getElementById('t24StudentProfileForm') || document.getElementById('t16StudentProfileForm')); if(!form){ toast('No se encontró el formulario de perfil. Cierra y vuelve a abrir Perfiles del alumnado.'); return false; } saveStudentProfile(form); return false; };
  window.TribecaSaveCalendarEventDirect = async function(btn, ev){
    if(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }
    const form = btn?.closest?.('form') || document.getElementById('t16EventForm');
    if(!form){ toast('No se encontró el formulario del calendario.'); return false; }
    await saveEvent(form);
    return false;
  };
  window.TribecaSaveGuidanceDirect = function(btn, ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); } const form = btn?.closest?.('form') || document.getElementById('t24GuidanceForm') || document.getElementById('t18GuidanceForm'); if(!form){ toast('No se encontró el formulario de orientación.'); return false; } saveGuidance(form); return false; };
  window.TribecaSaveGradeDirect = function(btn, ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); } const form = btn?.closest?.('form') || document.getElementById('t16GradeForm'); if(!form){ toast('No se encontró el formulario de calificaciones.'); return false; } saveGrade(form); return false; };
  function receiptVerificationCode(userId, month, amount){ return `TRB-${String(month).replace('-','')}-${String(hashText(`${userId}-${month}-${amount}-${new Date().toISOString().slice(0,10)}`)).slice(0,8).toUpperCase()}`; }
  window.TribecaPrintPaymentsPdf = function(kind){ const title = kind==='student'?'Histórico de pagos del alumno':'Resumen mensual de pagos'; const source = kind==='student' ? document.querySelector('.payment-history-panel') : document.querySelector('.payments-summary'); const html = source ? source.innerHTML : document.querySelector('.payments-layout')?.innerHTML || ''; const w = window.open('', '_blank'); if(!w) return toast('No se pudo abrir la ventana de impresión.'); const logo = 'assets/tribeca-academia-logo.webp'; w.document.write(`<html><head><title>${title}</title><style>@page{margin:18mm}body{font-family:Georgia,serif;padding:0;color:#172018}.pdf-head{display:flex;align-items:center;gap:14px;border-bottom:2px solid #b99a3b;padding-bottom:12px;margin-bottom:22px}.pdf-head img{width:54px;height:54px;object-fit:contain}.pdf-head strong{font-size:22px}.pdf-head span{display:block;color:#686052;font-size:12px}h1{font-size:21px;margin:0 0 18px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:left}.primary-btn,.secondary-btn,button{display:none!important}</style></head><body><header class="pdf-head"><img src="${logo}" alt="Tribeca Academia"><div><strong>Tribeca Academia</strong><span>Documento generado desde Tribeca Aula</span></div></header><h1>${title}</h1>${html}</body></html>`); w.document.close(); setTimeout(()=>w.print(),250); };
  function paymentReceiptMarkup(userId, month, opts={}){
    const s=(State.data.students||[]).find(x=>String(x.id)===String(userId)); if(!s) return '';
    const c=calculatePaymentAmount(userId, month); const pay=paymentMonthRecord(userId, month); const bill=(State.data.billing||[]).find(b=>b.user_id===userId)||{};
    const now=new Date(); const generated=now.toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'}); const pausedBilling=paymentPausedForMonth(userId,month); const paidText=pausedBilling?'en pausa, excluido de pago':pay.paid?(pay.paid_date?fmtDate(pay.paid_date):'pagado'):'pendiente de pago'; const code=receiptVerificationCode(userId, month, pausedBilling?0:c.amount);
    const tariff=bill.tariff_type==='mixed'?'Mixta':bill.tariff_type==='individual'?'Individual, por clase asistida':'Grupal, cuota fija mensual';
    const logo='assets/tribeca-academia-logo.webp';
    return `<main class="receipt-slip"><header class="receipt-head"><div class="receipt-brand"><img src="${logo}" alt="Tribeca Academia"><div><strong>Tribeca Academia</strong><span>Recibí interno · no factura</span></div></div><div class="receipt-code"><strong>${safe(code)}</strong><span>${safe(generated)}</span></div></header><section class="receipt-title"><h1>RECIBÍ</h1><p>${safe(monthLabel(month))} · ${safe(paymentModeLabel(s))} · ${safe(paymentMethodLabel(pay.payment_method))}</p></section><section class="receipt-grid"><div><small>Alumno/a</small><strong>${safe(displayName(s))}</strong><span>${safe(academicLine(s))}</span></div><div><small>Estado</small><strong>${safe(paidText)}</strong><span>${pay.paid_date?fmtDate(pay.paid_date):'Fecha no registrada'}</span></div><div><small>Tarifa</small><strong>${safe(tariff)}</strong><span>${safe(c.detail)}</span></div><div><small>Importe</small><strong class="receipt-amount">${money(pausedBilling?0:c.amount)}</strong><span>${c.present} asist. · ${c.justified} justif. · ${c.paused||0} pausadas</span></div><div><small>Forma de pago</small><strong>${safe(paymentMethodLabel(pay.payment_method))}</strong><span>${pay.payment_method?'Registrada':'No indicada'}</span></div></section><section class="receipt-concept"><strong>Concepto:</strong> apoyo educativo y clases de refuerzo correspondientes a ${safe(monthLabel(month))}.</section><footer class="receipt-sign"><div><small>Recibido por</small><strong>Patricia Trillo</strong></div><div><small>Firma electrónica interna</small><strong>${safe(code)}</strong></div></footer></main>`;
  }
  function receiptPrintDocument(title, body){
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(title)}</title><style>@page{size:A4;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#f7f5ee;color:#172018;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif}.actions{position:sticky;top:0;z-index:2;padding:8px;text-align:right;background:#f7f5ee}.actions button{border:0;border-radius:999px;background:#0b3d22;color:#fffdf8;font-weight:900;padding:8px 12px}.receipt-sheet{display:grid;gap:8mm;align-content:start}.receipt-slip{width:190mm;min-height:86mm;margin:0 auto;background:#fffdf8;border:1px solid #d9cfb7;border-left:5px solid #0b3d22;border-radius:10px;padding:8mm;break-inside:avoid;page-break-inside:avoid}.receipt-head{display:flex;justify-content:space-between;gap:10px;border-bottom:1.5px solid #b99a3b;padding-bottom:6px}.receipt-brand{display:flex;align-items:center;gap:9px}.receipt-brand img{width:34px;height:34px;object-fit:contain}.receipt-brand strong{display:block;font-family:Georgia,serif;font-size:15px;color:#0b3d22}.receipt-brand span,.receipt-code span{display:block;color:#6f6658;font-size:9px;font-weight:750}.receipt-code{text-align:right;font-size:9px;color:#4b443b}.receipt-title{display:flex;align-items:end;justify-content:space-between;margin:8px 0}.receipt-title h1{font-family:Georgia,serif;font-size:22px;letter-spacing:.16em;color:#0b3d22;margin:0}.receipt-title p{margin:0;color:#6f6658;font-weight:850;font-size:10px}.receipt-grid{display:grid;grid-template-columns:1.15fr .85fr 1.15fr .85fr;gap:6px}.receipt-grid div{border:1px solid #e2d8c2;border-radius:8px;padding:7px;background:#fff}.receipt-grid small,.receipt-sign small{display:block;text-transform:uppercase;letter-spacing:.08em;color:#8a753b;font-size:8px;font-weight:900;margin-bottom:3px}.receipt-grid strong{display:block;font-size:11px}.receipt-grid span{display:block;color:#6f6658;font-size:9px;margin-top:2px}.receipt-amount{font-size:16px!important;color:#0b3d22}.receipt-concept{border-left:3px solid #b99a3b;margin:8px 0;padding:5px 0 5px 8px;font-size:10px}.receipt-sign{display:grid;grid-template-columns:1fr 1fr;gap:8px;border-top:1px solid #e2d8c2;padding-top:6px}.receipt-sign strong{font-family:Georgia,serif;font-size:12px}@media print{body{background:white}.actions{display:none}.receipt-slip{margin:0 auto 5mm}}</style></head><body><div class="actions"><button onclick="window.print()">Descargar o guardar como PDF</button></div><section class="receipt-sheet">${body}</section><script>setTimeout(()=>window.print(),350)</script></body></html>`;
  }
  window.TribecaPrintPaymentReceipt = function(userId, month){
    const s=(State.data.students||[]).find(x=>String(x.id)===String(userId)); if(!s) return toast('Selecciona un alumno para generar el recibí.');
    const html=paymentReceiptMarkup(userId, month); const w=window.open('', '_blank'); if(!w) return toast('No se pudo abrir la ventana de impresión.');
    w.document.write(receiptPrintDocument(`Recibí ${displayName(s)} ${monthLabel(month)}`, html)); w.document.close();
  };
  window.TribecaPrintQuarterReceipts = function(userId, month){
    const s=(State.data.students||[]).find(x=>String(x.id)===String(userId)); if(!s) return toast('Selecciona un alumno para generar los recibís.');
    const months=quarterMonthsFor(month).filter(m=>paymentMonthRecord(userId,m).paid || calculatePaymentAmount(userId,m).amount>0);
    const html=months.map(m=>paymentReceiptMarkup(userId,m)).join(''); const w=window.open('', '_blank'); if(!w) return toast('No se pudo abrir la ventana de impresión.');
    w.document.write(receiptPrintDocument(`Recibís trimestrales ${displayName(s)}`, html || '<p>No hay recibís disponibles para este trimestre.</p>')); w.document.close();
  };

  function wireManagedForms(root=document){
    root.querySelectorAll('form').forEach(form=>{
      if(form.matches?.('.native-exam-form, .native-quiz-form, [data-t130-quiz-form]')) return;
      if(form.dataset.tribecaWired) return;
      form.dataset.tribecaWired='1';
      form.setAttribute('method','post');
      form.setAttribute('action','javascript:void(0)');
      form.addEventListener('submit', ev=>window.TribecaSubmitForm(form, ev), true);
    });
  }
  function bindGlobal() {
    window.addEventListener('resize', () => { if(document.body.classList.contains('tribeca-account-menu-open')) positionAccountMenu(); }, { passive:true });
    window.addEventListener('orientationchange', () => setTimeout(positionAccountMenu, 180), { passive:true });
    window.addEventListener('scroll', () => { if(document.body.classList.contains('tribeca-account-menu-open')) positionAccountMenu(); }, { passive:true });
    window.addEventListener('click', async ev=>{ const btn=ev.target.closest?.('[data-t24-save-student]'); if(btn){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); const f=btn.closest('form'); if(f) await saveStudentProfile(f); } }, true);
    document.addEventListener('click', async ev=>{
      const pwaInstall=ev.target.closest?.('[data-pwa-install]'); if(pwaInstall){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); closeAccountMenu(); await handleTribecaPwaInstall(); return; }
      const pwaDismiss=ev.target.closest?.('[data-pwa-install-dismiss]'); if(pwaDismiss){ ev.preventDefault(); ev.stopPropagation(); localStorage.setItem(TRIBECA_PWA_DISMISSED_KEY,'1'); updatePwaInstallCta(); return; }
      const pwaHelpClose=ev.target.closest?.('[data-pwa-help-close]'); if(pwaHelpClose){ ev.preventDefault(); ev.stopPropagation(); document.getElementById('tribecaPwaHelp')?.remove(); return; }
      const saveAttemptFeedback=ev.target.closest?.('[data-t163-save-attempt-feedback]'); if(saveAttemptFeedback){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); const form=saveAttemptFeedback.closest('form'); const oldText=saveAttemptFeedback.textContent; saveAttemptFeedback.disabled=true; saveAttemptFeedback.textContent='Guardando…'; try{ await saveAttemptTeacherFeedback(saveAttemptFeedback.dataset.t163SaveAttemptFeedback, form); } catch(error){ toast(error?.message || 'No se pudo guardar la retroalimentación.'); } finally { saveAttemptFeedback.disabled=false; saveAttemptFeedback.textContent=oldText; } return; }
      const enablePush=ev.target.closest?.('[data-t151-enable-push]'); if(enablePush){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); const oldText=enablePush.textContent; enablePush.disabled=true; enablePush.textContent='Activando…'; try{ await enableTribecaPushNotifications(); } finally { enablePush.disabled=false; enablePush.textContent=oldText; } return; }
      const disablePush=ev.target.closest?.('[data-t151-disable-push]'); if(disablePush){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); if(!roleTeacher()) return; const oldText=disablePush.textContent; disablePush.disabled=true; disablePush.textContent='Reiniciando…'; try{ await disableTribecaPushNotifications(); } finally { disablePush.disabled=false; disablePush.textContent=oldText; } return; }
      const testPush=ev.target.closest?.('[data-t152-test-push]'); if(testPush){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); if(!roleTeacher()) return; const oldText=testPush.textContent; testPush.disabled=true; testPush.textContent='Enviando…'; try{ await tribecaSendPushTestToCurrentUser(); } finally { testPush.disabled=false; testPush.textContent=oldText; } return; }
      const attemptPdf=ev.target.closest?.('[data-t148-attempt-pdf]'); if(attemptPdf){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); window.TribecaPrintAttemptPdf?.(attemptPdf.dataset.t148AttemptPdf); return; }
      const unitSave=ev.target.closest?.('[data-t126-save-unit]'); if(unitSave){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); const f=unitSave.closest('form'); if(f) await saveClassUnit(f); return; }
      const unitAdd=ev.target.closest?.('[data-t126-add-unit]'); if(unitAdd){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); const f=unitAdd.closest('form'); if(f) await addClassUnit(f); return; }
      const guidanceLink=ev.target.closest?.('[data-t119-guidance-link]'); if(guidanceLink){ recordGuidanceLinkClick(guidanceLink.dataset.t119GuidanceLink, guidanceLink.dataset.t119GuidanceUrl || guidanceLink.href); return; }
      const mailTab=ev.target.closest?.('[data-mail-box]'); if(mailTab){ const box=mailTab.dataset.mailBox; const root=mailTab.closest('.mail-app'); root?.querySelectorAll('.mail-tab').forEach(b=>b.classList.toggle('is-active', b===mailTab)); root?.querySelectorAll('[data-mail-box-view]').forEach(v=>v.hidden=v.dataset.mailBoxView!==box); return; }
      const newAnnouncement=ev.target.closest?.('[data-t173-new-announcement]'); if(newAnnouncement){ ev.preventDefault(); ev.stopPropagation(); State.pendingPublicationEdit=null; State.prefillPublicationKind='announcement'; openTool('newPublication'); return; }
      const saveVideoClassBtn=ev.target.closest?.('[data-t173-save-video-class]'); if(saveVideoClassBtn){ ev.preventDefault(); ev.stopPropagation(); const f=saveVideoClassBtn.closest('form'); if(f) await saveVideoClass(f); return; }
      const delVideoClass=ev.target.closest?.('[data-t173-delete-video-class]'); if(delVideoClass){ ev.preventDefault(); ev.stopPropagation(); await deleteVideoClass(delVideoClass.dataset.t173DeleteVideoClass); return; }
      const hideVideoClass=ev.target.closest?.('[data-t173-toggle-video-class]'); if(hideVideoClass){ ev.preventDefault(); ev.stopPropagation(); await toggleVideoClassHidden(hideVideoClass.dataset.t173ToggleVideoClass); return; }
      const themeSet=ev.target.closest?.('[data-t167-set-theme]'); if(themeSet){ ev.preventDefault(); ev.stopPropagation(); const value=themeSet.dataset.t167SetTheme === 'dark' ? 'dark' : 'light'; setTribecaTheme(value); updateTopProfile(); rerender(); toast(value === 'dark' ? 'Modo oscuro activado.' : 'Modo claro activado.'); return; }
      const themeToggleAccount=ev.target.closest?.('[data-t167-toggle-theme]'); if(themeToggleAccount){ ev.preventDefault(); ev.stopPropagation(); const next=document.body.classList.contains('is-dark') ? 'light' : 'dark'; setTribecaTheme(next); closeAccountMenu(); updateTopProfile(); toast(next === 'dark' ? 'Modo oscuro activado.' : 'Modo claro activado.'); return; }
      const profileTab=ev.target.closest?.('[data-t74-profile-tab]'); if(profileTab){ ev.preventDefault(); ev.stopPropagation(); State.profilePanel=profileTab.dataset.t74ProfileTab || 'profile'; rerender(); return; }
      const monthNav=ev.target.closest?.('[data-t51-month-nav]'); if(monthNav){ ev.preventDefault(); ev.stopPropagation(); State.billingMonth=monthNav.dataset.t51MonthNav; rerender(); return; }
      const logout=ev.target.closest?.('#logoutButton,[data-action="logout"]'); if(logout){ ev.preventDefault(); ev.stopImmediatePropagation(); signOut(); return; }
      const accountTool=ev.target.closest?.('[data-t141-account-tool]'); if(accountTool){ ev.preventDefault(); ev.stopImmediatePropagation(); const target=accountTool.dataset.t141AccountTool; closeAccountMenu(); if(target) openTool(target); return; }
      const accountPanel=ev.target.closest?.('[data-t73-account-panel]'); if(accountPanel){ ev.preventDefault(); ev.stopImmediatePropagation(); State.profilePanel=accountPanel.dataset.t73AccountPanel || 'profile'; closeAccountMenu(); openTool('profile'); return; }
      const prof=ev.target.closest?.('#profileButton'); if(prof){ ev.preventDefault(); ev.stopImmediatePropagation(); toggleAccountMenu(); return; }
      if(document.body.classList.contains('tribeca-account-menu-open') && !ev.target.closest?.('#profileButton') && !ev.target.closest?.('#profileMenu')) closeAccountMenu();
      const navBtn=ev.target.closest?.('.main-nav .nav-btn');
      if(navBtn){
        if(navBtn.matches('[data-public-tool-link]')) return;
        const target = navBtn.dataset.tool || navBtn.dataset.route || 'subjects';
        ev.preventDefault();
        ev.stopImmediatePropagation();
        closeAccountMenu();
        if(target === 'home') showHomePage();
        else renderInlineSection(target);
        return;
      }
      const publicToolLink=ev.target.closest?.('[data-public-tool-link]'); if(publicToolLink){ return; }
      const inlineHome=ev.target.closest?.('[data-t52-go-home]'); if(inlineHome){ ev.preventDefault(); ev.stopImmediatePropagation(); showHomePage(); return; }
      const dataTool=ev.target.closest?.('[data-tool]'); if(dataTool){ ev.preventDefault(); ev.stopImmediatePropagation(); closeAccountMenu(); openTool(dataTool.dataset.tool); return; }
      const undoBtn=ev.target.closest?.('[data-t30-undo]'); if(undoBtn){ ev.preventDefault(); ev.stopPropagation(); await undoLast(); return; } const teacherTool=ev.target.closest?.('[data-t16-tool]'); if(teacherTool){ ev.preventDefault(); openTool(teacherTool.dataset.t16Tool); return; }
      const taskOpen=ev.target.closest?.('[data-t114-open-tasks]'); if(taskOpen){ ev.preventDefault(); ev.stopPropagation(); State.pendingTeacherTaskEdit=null; renderTeacherHomeWithTasks(true); return; }
      const taskSave=ev.target.closest?.('[data-t117-save-task]'); if(taskSave){ ev.preventDefault(); ev.stopPropagation(); const f=taskSave.closest('form'); if(f) window.TribecaSaveTeacherTask(f, ev); return; }
      const taskClose=ev.target.closest?.('[data-t114-close-tasks]'); if(taskClose){ ev.preventDefault(); ev.stopPropagation(); State.teacherTasksOpen=false; State.pendingTeacherTaskEdit=null; renderApp(); return; }
      const taskEdit=ev.target.closest?.('[data-t116-edit-task]'); if(taskEdit){ ev.preventDefault(); ev.stopPropagation(); State.pendingTeacherTaskEdit=taskEdit.dataset.t116EditTask; renderTeacherHomeWithTasks(true); return; }
      const taskCancelEdit=ev.target.closest?.('[data-t116-cancel-task-edit]'); if(taskCancelEdit){ ev.preventDefault(); ev.stopPropagation(); State.pendingTeacherTaskEdit=null; renderTeacherHomeWithTasks(true); return; }
      const taskDelete=ev.target.closest?.('[data-t114-delete-task]'); if(taskDelete){ ev.preventDefault(); ev.stopPropagation(); window.TribecaDeleteTeacherTask(taskDelete.dataset.t114DeleteTask); return; }
      const openStudentProfile=ev.target.closest?.('[data-t114-open-student-profile]'); if(openStudentProfile){ ev.preventDefault(); ev.stopPropagation(); State.selectedStudentId=openStudentProfile.dataset.t114OpenStudentProfile; renderInlineSection('studentProfiles'); return; }
      const openClassBtn=ev.target.closest?.('[data-t90-open-class-button]');
      const openClassCard=ev.target.closest?.('[data-t90-open-class]');
      if(openClassBtn || openClassCard){
        if(openClassCard && !openClassBtn && ev.target.closest?.('button,a,input,select,textarea,label,summary,details')) return;
        ev.preventDefault(); ev.stopPropagation();
        const classId=openClassBtn?.dataset?.t90OpenClassButton || openClassCard?.dataset?.t90OpenClass;
        renderInlineSection('classroomDetail',{classId});
        return;
      }
      const defaultSubjectsBtn=ev.target.closest?.('[data-t92-default-subjects]'); if(defaultSubjectsBtn){ ev.preventDefault(); ev.stopPropagation(); await addDefaultSubjectsToClass(defaultSubjectsBtn.dataset.t92DefaultSubjects); return; }
      const defaultAllSubjectsBtn=ev.target.closest?.('[data-t92-default-all-subjects]'); if(defaultAllSubjectsBtn){ ev.preventDefault(); ev.stopPropagation(); await addDefaultSubjectsToAllClasses(); return; }
      const quickSubject=ev.target.closest?.('[data-t90-quick-new-subject]'); if(quickSubject){ ev.preventDefault(); ev.stopPropagation(); document.querySelector('.manual-subject-drawer')?.setAttribute('open',''); document.querySelector('.classroom-subject-form-v92 select')?.focus?.(); return; }
      if(ev.target.closest?.('[data-t44-mobile-back],[data-t16-close]')){ const w=ev.target.closest('.tool-window'); State.windows.delete(w?.dataset.window); w?.remove(); return; }
      if(ev.target.closest?.('[data-t16-min]')){ ev.target.closest('.tool-window')?.classList.add('is-hidden'); return; }
      if(ev.target.closest?.('[data-t16-max]')){ ev.target.closest('.tool-window')?.classList.toggle('is-maximized'); return; }
      const saveStudentBtn=ev.target.closest?.('[data-t24-save-student],[data-t23-save-student],[data-t22-save-student],[data-t21-save-student]'); if(saveStudentBtn){ const f=saveStudentBtn.closest('form'); if(f){ ev.preventDefault(); ev.stopImmediatePropagation(); await handleManagedSubmit(f); } return; }
      const saveEventBtn=ev.target.closest?.('[data-t25-save-event]'); if(saveEventBtn){ const f=saveEventBtn.closest('form'); if(f){ ev.preventDefault(); ev.stopImmediatePropagation(); await saveEvent(f); } return; }
      const saveGuidanceBtn=ev.target.closest?.('[data-t24-save-guidance]'); if(saveGuidanceBtn){ const f=saveGuidanceBtn.closest('form'); if(f){ ev.preventDefault(); ev.stopImmediatePropagation(); await saveGuidance(f); } return; }
      const saveGradeBtn=ev.target.closest?.('[data-t25-save-grade],[data-t26-save-grade],[data-t29-save-grade]'); if(saveGradeBtn){ const f=saveGradeBtn.closest('form'); if(f){ ev.preventDefault(); ev.stopImmediatePropagation(); await saveGrade(f); } return; }
      const avatar=ev.target.closest?.('[data-t16-avatar]'); if(avatar){ const f=avatar.closest('form'); f.querySelectorAll('.icon-choice').forEach(b=>b.classList.remove('is-selected')); avatar.classList.add('is-selected'); f.elements.avatarIcon.value=avatar.dataset.t16Avatar; return; }
      const emoji=ev.target.closest?.('[data-t16-emoji]'); if(emoji){ const ta=emoji.closest('form')?.elements.body; if(ta){ta.value+=emoji.dataset.t16Emoji; ta.focus();} return; }
      const day=ev.target.closest?.('[data-t16-day]'); if(day){ State.selectedDate=day.dataset.t16Day; State.selectedEventId=null; State.calendarMonth=startMonth(parseIso(State.selectedDate)); refreshCalendarAfterNavigation(); return; }
      if(ev.target.closest?.('[data-t40-cal-jump]')){ ev.preventDefault(); chooseCalendarDate(); return; }
      if(ev.target.closest?.('[data-t16-cal-prev]')){ State.calendarMonth=new Date(State.calendarMonth.getFullYear(),State.calendarMonth.getMonth()-1,1); refreshCalendarAfterNavigation(); return; }
      if(ev.target.closest?.('[data-t16-cal-next]')){ State.calendarMonth=new Date(State.calendarMonth.getFullYear(),State.calendarMonth.getMonth()+1,1); refreshCalendarAfterNavigation(); return; }
      const eventBtn=ev.target.closest?.('[data-t16-event]'); if(eventBtn){ State.selectedEventId=eventBtn.dataset.t16Event; const e=relevantEvents().find(x=>x.id===State.selectedEventId); if(e){State.selectedDate=e.date;State.calendarMonth=startMonth(parseIso(e.date));} refreshCalendarAfterNavigation(); return; }
      const hideE=ev.target.closest?.('[data-t16-hide-event]'); if(hideE){ await maybe(table('calendar_events').update({hidden:true}).eq('id',hideE.dataset.t16HideEvent)); await loadData(true); rerender(); return; }
      const delE=ev.target.closest?.('[data-t16-delete-event]'); if(delE){ if(confirm('¿Eliminar esta fecha?')){ await maybe(table('calendar_events').delete().eq('id',delE.dataset.t16DeleteEvent)); await loadData(true); rerender(); } return; }
      const profileKpi=ev.target.closest?.('[data-profile-kpi-filter]'); if(profileKpi){ ev.preventDefault(); ev.stopPropagation(); State.profileKpiFilter=profileKpi.dataset.profileKpiFilter || 'all'; State.selectedStudentId=null; rerender(); return; }
      const st=ev.target.closest?.('[data-t16-select-student]'); if(st){ State.selectedStudentId=st.dataset.t16SelectStudent; rerender(); return; }
      const attToggle=ev.target.closest?.('[data-t22-attendance-toggle]'); if(attToggle && !ev.target.closest('button')){ await toggleAttendance(attToggle); return; }
      const attBtn=ev.target.closest?.('[data-t16-attendance]'); if(attBtn){ await saveAttendance(attBtn); return; }
      const endPauseBtn=ev.target.closest?.('[data-t50-end-pause]'); if(endPauseBtn){ ev.preventDefault(); ev.stopPropagation(); await endStudentPause(endPauseBtn.dataset.t50EndPause); return; }
      const approve=ev.target.closest?.('[data-t16-approve-claim]'); if(approve){ resolveClaim(approve.dataset.t16ApproveClaim,true); return; }
      const reject=ev.target.closest?.('[data-t16-reject-claim]'); if(reject){ resolveClaim(reject.dataset.t16RejectClaim,false); return; }
      const passDone=ev.target.closest?.('[data-t16-pass-done]'); if(passDone){ await maybe(table('password_reset_requests').update({status:'attended',consulted_at:new Date().toISOString()}).eq('id',passDone.dataset.t16PassDone)); await loadData(true); rerender(); return; }
      const diffE=ev.target.closest?.('[data-t16-edit-diff]'); if(diffE){ const d=(State.data.difficulties||[]).find(x=>x.id===diffE.dataset.t16EditDiff); const f=$('#t16DifficultyForm'); if(d&&f){f.elements.id.value=d.id;f.elements.subject.value=d.subject;f.elements.level.value=d.level;f.elements.notes.value=d.notes||'';} return; }
      const diffD=ev.target.closest?.('[data-t16-delete-diff]'); if(diffD){ await maybe(table('difficult_subjects').delete().eq('id',diffD.dataset.t16DeleteDiff)); await loadData(true); renderApp(); rerender(); return; }
      const gradeE=ev.target.closest?.('[data-t16-edit-grade]'); if(gradeE){ const g=(State.data.grades||[]).find(x=>x.id===gradeE.dataset.t16EditGrade); const f=$('#t16GradeForm'); if(g&&f){f.elements.id.value=g.id;f.elements.subject.value=g.subject;f.elements.unit.value=g.unit||g.didactic_unit||'';f.elements.evaluation.value=g.evaluation;f.elements.type.value=g.type||g.assessment_type||g.test_type||'';f.elements.grade.value=g.grade;f.elements.weight.value=g.weight||'';} return; }
      const gradeD=ev.target.closest?.('[data-t16-delete-grade]'); if(gradeD){ const rpc=await State.client.rpc('tribeca_delete_student_grade_v29',{p_grade_id:gradeD.dataset.t16DeleteGrade}); if(rpc.error) toast(rpc.error.message||'No se pudo eliminar.'); await loadData(true); renderApp(); rerender(); return; }
      const claim=ev.target.closest?.('[data-t16-claim]'); if(claim){ claimBadge(claim.dataset.t16Claim); return; }
      const toggleAnn=ev.target.closest?.('[data-t16-toggle-ann]'); if(toggleAnn){ const a=(State.data.announcements||[]).find(x=>x.id===toggleAnn.dataset.t16ToggleAnn); await maybe(table('announcements').update({hidden:!a?.hidden}).eq('id',toggleAnn.dataset.t16ToggleAnn)); await loadData(true); rerender(); return; }
      const delAnn=ev.target.closest?.('[data-t16-delete-ann]'); if(delAnn){ await maybe(table('announcements').delete().eq('id',delAnn.dataset.t16DeleteAnn)); await loadData(true); rerender(); return; }
      const toggleMat=ev.target.closest?.('[data-t16-toggle-mat]'); if(toggleMat){ const m=(State.data.materials||[]).find(x=>x.id===toggleMat.dataset.t16ToggleMat); await maybe(table('subject_materials').update({hidden:!m?.hidden}).eq('id',toggleMat.dataset.t16ToggleMat)); await loadData(true); rerender(); return; }
      const delMat=ev.target.closest?.('[data-t16-delete-mat]'); if(delMat){ await maybe(table('subject_materials').delete().eq('id',delMat.dataset.t16DeleteMat)); await loadData(true); rerender(); return; }
      const editAnn=ev.target.closest?.('[data-t32-edit-ann]'); if(editAnn){ ev.preventDefault(); ev.stopPropagation(); const a=(State.data.announcements||[]).find(x=>String(x.id)===String(editAnn.dataset.t32EditAnn)); if(a){ State.pendingPublicationEdit={table:'announcements', id:a.id, item:{...a}, kind:'announcement'}; openTool('newPublication'); } return; }
      const editMat=ev.target.closest?.('[data-t32-edit-mat]'); if(editMat){ ev.preventDefault(); ev.stopPropagation(); const m=(State.data.materials||[]).find(x=>String(x.id)===String(editMat.dataset.t32EditMat)); if(m){ State.pendingPublicationEdit={table:'subject_materials', id:m.id, item:{...m}, kind:normalizeMaterialKind(m.material_type||m.type)}; State.currentSubject=m.subject || State.currentSubject; openTool('newPublication'); } return; }
      if(ev.target.closest?.('[data-t32-cancel-publication-edit]')){ ev.preventDefault(); ev.stopPropagation(); State.pendingPublicationEdit=null; State.prefillPublicationSubject=null; State.prefillPublicationKind=null; openTool('newPublication'); return; }
      const selectVisible=ev.target.closest?.('[data-t32-select-visible]'); if(selectVisible){ ev.preventDefault(); const form=selectVisible.closest('form'); form?.querySelectorAll('.t32-badge-student:not([hidden]) input[name="userIds"]').forEach(i=>{ i.checked=true; }); return; }
      const clearAll=ev.target.closest?.('[data-t32-clear-all]'); if(clearAll){ ev.preventDefault(); clearAll.closest('form')?.querySelectorAll('input[name="userIds"]').forEach(i=>{ i.checked=false; }); return; }
      const selectGroup=ev.target.closest?.('[data-t32-select-group]'); if(selectGroup){ ev.preventDefault(); selectGroup.closest('details')?.querySelectorAll('.t32-badge-student:not([hidden]) input[name="userIds"]').forEach(i=>{ i.checked=true; }); return; }
      const clearGroup=ev.target.closest?.('[data-t32-clear-group]'); if(clearGroup){ ev.preventDefault(); clearGroup.closest('details')?.querySelectorAll('input[name="userIds"]').forEach(i=>{ i.checked=false; }); return; }

      const matDone=ev.target.closest?.('[data-t33-toggle-completion]'); if(matDone){ ev.preventDefault(); ev.stopPropagation(); await toggleMaterialCompletion(matDone.dataset.t33ToggleCompletion); return; }
      const matOpen=ev.target.closest?.('[data-t33-open-mat]'); if(matOpen){ ev.preventDefault(); ev.stopPropagation(); openMaterialInNewWindow(matOpen.dataset.t33OpenMat); return; }
      const subjToggle=ev.target.closest?.('[data-t33-toggle-subject]'); if(subjToggle){ ev.preventDefault(); ev.stopPropagation(); await toggleSubjectVisibility(subjToggle.dataset.t33ToggleSubject); return; }
      const newMat=ev.target.closest?.('[data-t29-new-material]'); if(newMat){ ev.preventDefault(); ev.stopPropagation(); State.pendingPublicationEdit=null; State.prefillPublicationSubject=newMat.dataset.t29NewMaterial; openTool('newPublication'); return; }
      const subjMenu=ev.target.closest?.('[data-t29-subject-menu]'); if(subjMenu){ ev.preventDefault(); ev.stopPropagation(); const id=subjMenu.dataset.t29SubjectMenu; const x=(State.data.subjects||[]).find(s=>s.id===id); State.pendingSubjectEdit = x ? {...x} : {stage:State.selectedSubjectStage,course:State.selectedSubjectCourse,subject:subjMenu.dataset.subjectName,active:true}; openTool('teacherSubjects'); return; }
      const subjEditByName=ev.target.closest?.('[data-t30-subject-edit-by-name]'); if(subjEditByName){ ev.preventDefault(); ev.stopPropagation(); const name=subjEditByName.dataset.t30SubjectEditByName; const x=(State.data.subjects||[]).find(s=>s.stage===State.selectedSubjectStage&&s.course===State.selectedSubjectCourse&&s.subject===name); State.pendingSubjectEdit = x ? {...x} : {stage:State.selectedSubjectStage,course:State.selectedSubjectCourse,subject:name,active:true}; openTool('teacherSubjects'); return; }
      const createCustom=ev.target.closest?.('[data-t29-create-custom-subject]'); if(createCustom){ ev.preventDefault(); ev.stopPropagation(); const name=createCustom.dataset.t29CreateCustomSubject; const x=(State.data.subjects||[]).find(s=>s.stage===State.selectedSubjectStage&&s.course===State.selectedSubjectCourse&&s.subject===name); State.pendingSubjectEdit = x ? {...x} : {stage:State.selectedSubjectStage,course:State.selectedSubjectCourse,subject:name,active:true}; openTool('teacherSubjects'); return; }
      const clearSubj=ev.target.closest?.('[data-t31-clear-subject-editor]'); if(clearSubj){ ev.preventDefault(); State.pendingSubjectEdit=null; rerender(); return; }
      const prom=ev.target.closest?.('[data-t29-promote-student]'); if(prom){ const f=prom.closest('form'); if(f){ ev.preventDefault(); ev.stopImmediatePropagation(); await promoteStudentFromForm(f); } return; }
      const saveSubj=ev.target.closest?.('[data-t27-save-subject]'); if(saveSubj){ const f=saveSubj.closest('form'); if(f){ ev.preventDefault(); ev.stopImmediatePropagation(); await saveSubjectOverride(f); } return; }
      const editSubj=ev.target.closest?.('[data-t27-edit-subject]'); if(editSubj){ const x=(State.data.subjects||[]).find(s=>s.id===editSubj.dataset.t27EditSubject); if(x){ State.pendingSubjectEdit={...x}; rerender(); } return; }
      const delSubj=ev.target.closest?.('[data-t27-delete-subject]'); if(delSubj){ await deleteSubjectOverride(delSubj.dataset.t27DeleteSubject); return; }
      const editGuid=ev.target.closest?.('[data-t35-edit-guidance]'); if(editGuid){ ev.preventDefault(); ev.stopPropagation(); const g=(State.data.guidance||[]).find(x=>x.id===editGuid.dataset.t35EditGuidance); if(g){ State.pendingGuidanceEdit={...g}; openTool('guidance'); } return; }
      const cancelGuid=ev.target.closest?.('[data-t35-cancel-guidance-edit]'); if(cancelGuid){ ev.preventDefault(); ev.stopPropagation(); State.pendingGuidanceEdit=null; openTool('guidance'); return; }
      const toggleGuid=ev.target.closest?.('[data-t18-toggle-guidance]'); if(toggleGuid){ const g=(State.data.guidance||[]).find(x=>x.id===toggleGuid.dataset.t18ToggleGuidance); await maybe(table('guidance_resources').update({hidden:!g?.hidden}).eq('id',toggleGuid.dataset.t18ToggleGuidance)); await loadData(true); rerender(); return; }
      const delGuid=ev.target.closest?.('[data-t18-delete-guidance]'); if(delGuid){ if(confirm('¿Eliminar este recurso de orientación?')){ await maybe(table('guidance_resources').delete().eq('id',delGuid.dataset.t18DeleteGuidance)); await loadData(true); rerender(); } return; }
      const markMsg=ev.target.closest?.('[data-t16-mark-read],[data-t28-mark-read]'); if(markMsg){ const id=markMsg.dataset.t16MarkRead||markMsg.dataset.t28MarkRead; const rpc=await State.client.rpc('tribeca_mark_private_message_read_v28',{p_message_id:id}); if(rpc.error) toast(rpc.error.message||'No se pudo marcar como leído.'); await loadData(true); updateBadges(); rerender(); return; }
      const archMsg=ev.target.closest?.('[data-t16-archive-message]'); if(archMsg){ const rpc=await State.client.rpc('tribeca_archive_private_message_v28',{p_message_id:archMsg.dataset.t16ArchiveMessage}); if(rpc.error) toast(rpc.error.message||'No se pudo archivar.'); await loadData(true); updateBadges(); rerender(); return; }
      const delMsg=ev.target.closest?.('[data-t28-delete-message]'); if(delMsg){ if(confirm('¿Eliminar este mensaje de tu bandeja?')){ const rpc=await State.client.rpc('tribeca_delete_private_message_v28',{p_message_id:delMsg.dataset.t28DeleteMessage}); if(rpc.error) toast(rpc.error.message||'No se pudo eliminar.'); await loadData(true); updateBadges(); rerender(); } return; }
      if(ev.target.closest?.('[data-t16-forgot]')){ $('#t16LoginForm').hidden=true; $('#t16ResetForm').hidden=false; return; }
      if(ev.target.closest?.('[data-t16-login]')){ $('#t16ResetForm').hidden=true; $('#t16LoginForm').hidden=false; return; }
    }, true);
    document.addEventListener('click', ev=>{ const btn=ev.target.closest?.('.native-exam-form [data-t129-grade-exam]'); if(btn){ ev.preventDefault(); ev.stopPropagation(); const form=btn.closest('form'); form?.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); } }, true);
    document.addEventListener('submit', async ev=>{ const f=ev.target; const ids=['t16LoginForm','t16ResetForm','t16PublicationForm','t16EventForm','t16AssignBadgeForm','t16StudentProfileForm','t24StudentProfileForm','t16StudentMessageForm','t16TeacherMessageForm','t16ProfileIconForm','t16ProfileNotificationsForm','t16PasswordForm','t16OwnResetForm','t16DifficultyForm','t16GradeForm','t16BillingForm','t50PauseForm','t18GuidanceForm','t24GuidanceForm','t27SubjectForm','t78RepoMaterialForm','t80ClassroomForm','contactForm']; if(!ids.includes(f.id)) return; ev.preventDefault(); ev.stopImmediatePropagation(); await handleManagedSubmit(f); }, true);
    document.addEventListener('input', ev=>{ if(ev.target?.dataset?.t16StudentSearch!==undefined){ const q=ev.target.value.toLowerCase(); const root=ev.target.closest('.window-panel,form') || document; root.querySelectorAll('[data-student-name]').forEach(el=>{el.hidden=!!(q && !el.dataset.studentName.includes(q));}); root.querySelectorAll('details').forEach(d=>{ const items=[...d.querySelectorAll('[data-student-name]')]; if(items.length) d.hidden=items.every(x=>x.hidden); }); } }, true);
    document.addEventListener('change', async ev=>{ if(ev.target?.matches?.('[data-calendar-scope-select]')){ const form=ev.target.closest('form'); const box=form?.querySelector?.('[data-calendar-class-targets]'); if(box) box.hidden = ev.target.value !== 'classes'; return; } if(ev.target?.dataset?.t74IgnoreAlert!==undefined){ setTeacherAlertIgnored(ev.target.dataset.t74IgnoreAlert, !!ev.target.checked); rerender(); return; } if(ev.target?.id==='languageSelect'){ localStorage.setItem('tribeca-language-user-set','1'); localStorage.setItem('tribeca-language', ev.target.value || (roleTeacher()?'es':'gl')); setTimeout(()=>{ applyTranslations(document); updateAccessibilityWidgetText(); }, 0); return; } if(ev.target?.name==='imageFile' && ev.target.files?.[0]){ const url=await normImage(ev.target.files[0]); ev.target.form.elements.imageUrl.value=url; $('#t16ImagePreview', ev.target.form).innerHTML=`<img src="${safe(url)}" alt="">`; } if(ev.target?.name==='attachmentFiles' && ev.target.files?.length){ const files=await Promise.all(Array.from(ev.target.files).map(async file=>({name:file.name,type:file.type||'application/octet-stream',size:file.size,url:await normImage(file)}))); ev.target.form.elements.attachmentsJson.value=JSON.stringify(files); const box=$('#attachmentPreview', ev.target.form); if(box) box.textContent=files.map(f=>f.name).join(', '); } if(ev.target?.name==='interactiveFile' && ev.target.files?.[0]){ await handleInteractiveFile(ev.target.files[0], ev.target.form); } if(ev.target?.name==='messageFiles' && ev.target.files?.length){ const files=await Promise.all(Array.from(ev.target.files).map(async file=>({name:file.name,type:file.type||'application/octet-stream',size:file.size,url:await normImage(file)}))); ev.target.form.elements.attachmentsJson.value=JSON.stringify(files); const n=ev.target.form.querySelector('[data-message-file-name]'); if(n) n.textContent=files.map(f=>f.name).join(', '); } if(ev.target?.name==='guidanceFile' && ev.target.files?.[0]){ const file=ev.target.files[0]; ev.target.form.elements.attachmentJson.value=JSON.stringify({name:file.name,type:file.type||'application/octet-stream',size:file.size,url:await normImage(file)}); const n=ev.target.form.querySelector('#guidanceFileName'); if(n) n.textContent=file.name; } if(ev.target?.dataset?.t114ToggleTask!==undefined){ window.TribecaToggleTeacherTask(ev.target.dataset.t114ToggleTask, ev.target.checked); return; } if(ev.target?.name==='profileImage' && ev.target.files?.[0]){ const url=await normImage(ev.target.files[0]); ev.target.form.elements.avatarImageUrl.value=url; $('#profileImagePreview', ev.target.form).innerHTML=`<img src="${safe(url)}" alt="">`; } if(ev.target?.name==='studentPhotoFile' && ev.target.files?.[0]){ const file=ev.target.files[0]; try{ const url=await studentPhotoFileToDataUrl(file); if(ev.target.form?.elements?.studentPhotoUrl) ev.target.form.elements.studentPhotoUrl.value=url; const n=ev.target.form?.querySelector('[data-student-photo-file-name]'); if(n) n.textContent=`${file.name} · optimizada a ${prettyBytes(approxDataUrlBytes(url))}`; const fig=ev.target.form?.querySelector('.student-editor-photo'); if(fig) fig.innerHTML=`<img src="${safe(url)}" alt="Foto del alumno">`; toast('Foto optimizada y cargada. Pulsa Guardar cambios para conservarla.'); }catch(err){ toast(err?.message || 'No se pudo procesar la foto.'); ev.target.value=''; } } if(ev.target?.dataset?.t16BillingMonth!==undefined){ State.billingMonth=ev.target.value; rerender(); } if(ev.target?.dataset?.t18SubjectStage!==undefined){ State.selectedSubjectStage=ev.target.value; const valid=coursesForStage(State.selectedSubjectStage); if(valid.length && !valid.includes(State.selectedSubjectCourse)) State.selectedSubjectCourse=valid[0]; localStorage.setItem('tribeca-teacher-subject-stage', State.selectedSubjectStage); localStorage.setItem('tribeca-teacher-subject-course', State.selectedSubjectCourse); rerender(); } if(ev.target?.dataset?.t18SubjectCourse!==undefined){ State.selectedSubjectCourse=ev.target.value; const validStages=stagesForCourse(State.selectedSubjectCourse); if(validStages.length && !validStages.includes(State.selectedSubjectStage)) State.selectedSubjectStage=validStages[0]; localStorage.setItem('tribeca-teacher-subject-stage', State.selectedSubjectStage); localStorage.setItem('tribeca-teacher-subject-course', State.selectedSubjectCourse); rerender(); } }, true);
  }


  const BASE_TRANSLATIONS = {
    'Mi cuenta':{Galego:'A miña conta',English:'My account',Français:'Mon compte',Polski:'Moje konto',Deutsch:'Mein Konto',Português:'A minha conta'},
    'Mi perfil':{Galego:'O meu perfil',English:'My profile',Français:'Mon profil',Polski:'Mój profil',Deutsch:'Mein Profil',Português:'O meu perfil'},
    'Ajustes de contraseña':{Galego:'Axustes de contrasinal',English:'Password settings',Français:'Paramètres du mot de passe',Polski:'Ustawienia hasła',Deutsch:'Passworteinstellungen',Português:'Definições de palavra-passe'},
    'Ajustes de notificaciones':{Galego:'Axustes de notificacións',English:'Notification settings',Français:'Paramètres des notifications',Polski:'Ustawienia powiadomień',Deutsch:'Benachrichtigungseinstellungen',Português:'Definições de notificações'},
    'Marcar como leído':{Galego:'Marcar como lido',English:'Mark as read',Français:'Marquer comme lu',Polski:'Oznacz jako przeczytane',Deutsch:'Als gelesen markieren',Português:'Marcar como lido'},
    'Marcar todos como leídos':{Galego:'Marcar todos como lidos',English:'Mark all as read',Français:'Tout marquer comme lu',Polski:'Oznacz wszystko jako przeczytane',Deutsch:'Alle als gelesen markieren',Português:'Marcar todos como lidos'},
    'Nuevo anuncio':{Galego:'Novo anuncio',English:'New announcement',Français:'Nouvelle annonce',Polski:'Nowe ogłoszenie',Deutsch:'Neue Ankündigung',Português:'Novo anúncio'},
    'Ignorar alerta':{Galego:'Ignorar alerta',English:'Ignore alert',Français:'Ignorer l’alerte',Polski:'Ignoruj alert',Deutsch:'Warnung ignorieren',Português:'Ignorar alerta'},

    'Panel personal de aprendizaje':{Galego:'Panel persoal de aprendizaxe',English:'Personal learning panel',Français:'Tableau personnel d’apprentissage',Polski:'Osobisty panel nauki',Deutsch:'Persönlicher Lernbereich',Português:'Painel pessoal de aprendizagem'},
    'Materiales organizados por unidades didácticas':{Galego:'Materiais organizados por unidades didácticas',English:'Materials organised by teaching units',Français:'Ressources organisées par unités',Polski:'Materiały uporządkowane według działów',Deutsch:'Materialien nach Lerneinheiten geordnet',Português:'Materiais organizados por unidades didáticas'},
    'Abre o cierra cada unidad para consultar apuntes, boletines, pruebas, juegos o enlaces publicados por la profesora.':{Galego:'Abre ou pecha cada unidade para consultar apuntamentos, boletíns, probas, xogos ou ligazóns publicados pola profesora.',English:'Open or close each unit to check notes, worksheets, tests, games or links published by the teacher.',Français:'Ouvre ou ferme chaque unité pour consulter les notes, fiches, tests, jeux ou liens publiés par l’enseignante.',Polski:'Otwórz lub zamknij każdy dział, aby sprawdzić notatki, karty pracy, testy, gry lub linki opublikowane przez nauczycielkę.',Deutsch:'Öffne oder schließe jede Einheit, um Notizen, Arbeitsblätter, Tests, Spiele oder Links der Lehrerin anzusehen.',Português:'Abre ou fecha cada unidade para consultar apontamentos, fichas, testes, jogos ou ligações publicados pela professora.'},
    'Todavía no hay publicaciones en esta materia.':{Galego:'Aínda non hai publicacións nesta materia.',English:'There are no posts in this subject yet.',Français:'Il n’y a pas encore de publications dans cette matière.',Polski:'Nie ma jeszcze publikacji z tego przedmiotu.',Deutsch:'Für dieses Fach gibt es noch keine Veröffentlichungen.',Português:'Ainda não há publicações nesta disciplina.'},
    'Publicar nuevo material':{Galego:'Publicar novo material',English:'Publish new material',Français:'Publier une nouvelle ressource',Polski:'Opublikuj nowy materiał',Deutsch:'Neues Material veröffentlichen',Português:'Publicar novo material'},
    'Editar materia':{Galego:'Editar materia',English:'Edit subject',Français:'Modifier la matière',Polski:'Edytuj przedmiot',Deutsch:'Fach bearbeiten',Português:'Editar disciplina'},
    'Progreso':{Galego:'Progreso',English:'Progress',Français:'Progression',Polski:'Postęp',Deutsch:'Fortschritt',Português:'Progresso'},
    'Abre la materia para ver unidades y materiales.':{Galego:'Abre a materia para ver unidades e materiais.',English:'Open the subject to view units and materials.',Français:'Ouvre la matière pour voir les unités et les ressources.',Polski:'Otwórz przedmiot, aby zobaczyć działy i materiały.',Deutsch:'Öffne das Fach, um Einheiten und Materialien zu sehen.',Português:'Abre a disciplina para ver unidades e materiais.'},
    'Ciencias de la Naturaleza':{Galego:'Ciencias da Natureza',English:'Natural Sciences',Français:'Sciences de la nature',Polski:'Nauki przyrodnicze',Deutsch:'Naturwissenschaften',Português:'Ciências da Natureza'},
    'Ciencias Sociales':{Galego:'Ciencias Sociais',English:'Social Sciences',Français:'Sciences sociales',Polski:'Nauki społeczne',Deutsch:'Sozialwissenschaften',Português:'Ciências Sociais'},
    'Educación Física':{Galego:'Educación Física',English:'Physical Education',Français:'Éducation physique',Polski:'Wychowanie fizyczne',Deutsch:'Sport',Português:'Educação Física'},
    'Educación Plástica y Visual':{Galego:'Educación Plástica e Visual',English:'Art and Visual Education',Français:'Arts plastiques et visuels',Polski:'Plastyka i edukacja wizualna',Deutsch:'Kunst und visuelle Bildung',Português:'Educação Plástica e Visual'},
    'Educación Plástica, Visual y Audiovisual':{Galego:'Educación Plástica, Visual e Audiovisual',English:'Art, Visual and Audiovisual Education',Français:'Arts plastiques, visuels et audiovisuels',Polski:'Edukacja plastyczna, wizualna i audiowizualna',Deutsch:'Kunst, visuelle und audiovisuelle Bildung',Português:'Educação Plástica, Visual e Audiovisual'},
    'Lengua Castellana y Literatura':{Galego:'Lingua Castelá e Literatura',English:'Spanish Language and Literature',Français:'Langue espagnole et littérature',Polski:'Język hiszpański i literatura',Deutsch:'Spanische Sprache und Literatur',Português:'Língua Espanhola e Literatura'},
    'Lengua Gallega y Literatura':{Galego:'Lingua Galega e Literatura',English:'Galician Language and Literature',Français:'Langue galicienne et littérature',Polski:'Język galicyjski i literatura',Deutsch:'Galicische Sprache und Literatur',Português:'Língua Galega e Literatura'},
    'English':{Galego:'English',English:'English',Français:'Anglais',Polski:'Angielski',Deutsch:'Englisch',Português:'Inglês'},
    'Français':{Galego:'Français',English:'French',Français:'Français',Polski:'Francuski',Deutsch:'Französisch',Português:'Francês'},
    'Matemáticas':{Galego:'Matemáticas',English:'Mathematics',Français:'Mathématiques',Polski:'Matematyka',Deutsch:'Mathematik',Português:'Matemática'},
    'Música':{Galego:'Música',English:'Music',Français:'Musique',Polski:'Muzyka',Deutsch:'Musik',Português:'Música'},
    'Música y Danza':{Galego:'Música e Danza',English:'Music and Dance',Français:'Musique et danse',Polski:'Muzyka i taniec',Deutsch:'Musik und Tanz',Português:'Música e Dança'},
    'Biología y Geología':{Galego:'Bioloxía e Xeoloxía',English:'Biology and Geology',Français:'Biologie et géologie',Polski:'Biologia i geologia',Deutsch:'Biologie und Geologie',Português:'Biologia e Geologia'},
    'Física y Química':{Galego:'Física e Química',English:'Physics and Chemistry',Français:'Physique et chimie',Polski:'Fizyka i chemia',Deutsch:'Physik und Chemie',Português:'Física e Química'},
    'Geografía e Historia':{Galego:'Xeografía e Historia',English:'Geography and History',Français:'Géographie et histoire',Polski:'Geografia i historia',Deutsch:'Geografie und Geschichte',Português:'Geografia e História'},
    'Tecnología y Digitalización':{Galego:'Tecnoloxía e Dixitalización',English:'Technology and Digitalisation',Français:'Technologie et numérisation',Polski:'Technologia i cyfryzacja',Deutsch:'Technologie und Digitalisierung',Português:'Tecnologia e Digitalização'},
    'Tecnología':{Galego:'Tecnoloxía',English:'Technology',Français:'Technologie',Polski:'Technologia',Deutsch:'Technik',Português:'Tecnologia'},
    'Digitalización':{Galego:'Dixitalización',English:'Digitalisation',Français:'Numérisation',Polski:'Cyfryzacja',Deutsch:'Digitalisierung',Português:'Digitalização'},
    'Tutoría':{Galego:'Titoría',English:'Tutoring',Français:'Tutorat',Polski:'Tutoring',Deutsch:'Tutorium',Português:'Tutoria'},
    'Ámbito Científico-Tecnológico':{Galego:'Ámbito Científico-Tecnolóxico',English:'Scientific-Technological Area',Français:'Domaine scientifique et technologique',Polski:'Obszar naukowo-technologiczny',Deutsch:'Naturwissenschaftlich-technischer Bereich',Português:'Área Científico-Tecnológica'},
    'Ámbito Lingüístico y Social':{Galego:'Ámbito Lingüístico e Social',English:'Linguistic and Social Area',Français:'Domaine linguistique et social',Polski:'Obszar językowo-społeczny',Deutsch:'Sprachlich-sozialer Bereich',Português:'Área Linguística e Social'},
    'Educación en Valores Cívicos y Éticos':{Galego:'Educación en Valores Cívicos e Éticos',English:'Civic and Ethical Values',Français:'Valeurs civiques et éthiques',Polski:'Wartości obywatelskie i etyczne',Deutsch:'Bürgerliche und ethische Werte',Português:'Valores Cívicos e Éticos'},
    'Filosofía':{Galego:'Filosofía',English:'Philosophy',Français:'Philosophie',Polski:'Filozofia',Deutsch:'Philosophie',Português:'Filosofia'},
    'Latín':{Galego:'Latín',English:'Latin',Français:'Latin',Polski:'Łacina',Deutsch:'Latein',Português:'Latim'},
    'Griego':{Galego:'Grego',English:'Greek',Français:'Grec',Polski:'Greka',Deutsch:'Griechisch',Português:'Grego'},
    'Economía':{Galego:'Economía',English:'Economics',Français:'Économie',Polski:'Ekonomia',Deutsch:'Wirtschaft',Português:'Economia'},
    'Economía y Emprendimiento':{Galego:'Economía e Emprendemento',English:'Economics and Entrepreneurship',Français:'Économie et entrepreneuriat',Polski:'Ekonomia i przedsiębiorczość',Deutsch:'Wirtschaft und Unternehmertum',Português:'Economia e Empreendedorismo'},
    'Química':{Galego:'Química',English:'Chemistry',Français:'Chimie',Polski:'Chemia',Deutsch:'Chemie',Português:'Química'},
    'Física':{Galego:'Física',English:'Physics',Français:'Physique',Polski:'Fizyka',Deutsch:'Physik',Português:'Física'},
    'Historia de España':{Galego:'Historia de España',English:'History of Spain',Français:'Histoire de l’Espagne',Polski:'Historia Hiszpanii',Deutsch:'Geschichte Spaniens',Português:'História de Espanha'},
    'Historia de la Filosofía':{Galego:'Historia da Filosofía',English:'History of Philosophy',Français:'Histoire de la philosophie',Polski:'Historia filozofii',Deutsch:'Geschichte der Philosophie',Português:'História da Filosofia'},
    'Psicología':{Galego:'Psicoloxía',English:'Psychology',Français:'Psychologie',Polski:'Psychologia',Deutsch:'Psychologie',Português:'Psicologia'},
    'Mis materias':{Galego:'As miñas materias',English:'My subjects',Français:'Mes matières',Polski:'Moje przedmioty',Deutsch:'Meine Fächer',Português:'As minhas disciplinas'},
    'Calendario':{Galego:'Calendario',English:'Calendar',Français:'Calendrier',Polski:'Kalendarz',Deutsch:'Kalender',Português:'Calendário'},
    'Mensajes':{Galego:'Mensaxes',English:'Messages',Français:'Messages',Polski:'Wiadomości',Deutsch:'Nachrichten',Português:'Mensagens'},
    'Anuncios':{Galego:'Anuncios',English:'Announcements',Français:'Annonces',Polski:'Ogłoszenia',Deutsch:'Ankündigungen',Português:'Anúncios'},
    'Cerrar sesión':{Galego:'Pechar sesión',English:'Log out',Français:'Se déconnecter',Polski:'Wyloguj',Deutsch:'Abmelden',Português:'Terminar sessão'},
    'Mi perfil':{Galego:'O meu perfil',English:'My profile',Français:'Mon profil',Polski:'Mój profil',Deutsch:'Mein Profil',Português:'O meu perfil'},
    'Panel docente':{Galego:'Panel docente',English:'Teacher panel',Français:'Panneau enseignant',Polski:'Panel nauczyciela',Deutsch:'Lehrerbereich',Português:'Painel docente'},
    'Nueva publicación':{Galego:'Nova publicación',English:'New post',Français:'Nouvelle publication',Polski:'Nowa publikacja',Deutsch:'Neue Veröffentlichung',Português:'Nova publicação'},
    'Qué ha ocurrido en el aula':{Galego:'Que ocorreu na aula',English:'What happened in class',Français:'Ce qui s’est passé en classe',Polski:'Co wydarzyło się w klasie',Deutsch:'Was im Kurs passiert ist',Português:'O que aconteceu na aula'},
    'Alertas docentes':{Galego:'Alertas docentes',English:'Teacher alerts',Français:'Alertes enseignantes',Polski:'Alerty nauczyciela',Deutsch:'Lehrerhinweise',Português:'Alertas docentes'},
    'Vista general del aula':{Galego:'Vista xeral da aula',English:'Class overview',Français:'Vue générale de la classe',Polski:'Przegląd klasy',Deutsch:'Kursübersicht',Português:'Vista geral da turma'},
    'Asignar insignia':{Galego:'Asignar insignia',English:'Assign badge',Français:'Attribuer un badge',Polski:'Przyznaj odznakę',Deutsch:'Abzeichen vergeben',Português:'Atribuir insígnia'},
    'Solicitudes de recuperación':{Galego:'Solicitudes de recuperación',English:'Password requests',Français:'Demandes de récupération',Polski:'Prośby o odzyskanie hasła',Deutsch:'Passwortanfragen',Português:'Pedidos de recuperação'},
    'Perfiles del alumnado':{Galego:'Perfís do alumnado',English:'Student profiles',Français:'Profils des élèves',Polski:'Profile uczniów',Deutsch:'Schülerprofile',Português:'Perfis dos alunos'},
    'Materias y materiales':{Galego:'Materias e materiais',English:'Subjects and materials',Français:'Matières et ressources',Polski:'Przedmioty i materiały',Deutsch:'Fächer und Materialien',Português:'Disciplinas e materiais'},
    'Orientación académica':{Galego:'Orientación académica',English:'Academic guidance',Français:'Orientation académique',Polski:'Doradztwo edukacyjne',Deutsch:'Schulische Beratung',Português:'Orientação académica'},
    'Pagos y asistencia':{Galego:'Pagos e asistencia',English:'Payments and attendance',Français:'Paiements et présence',Polski:'Płatności i obecność',Deutsch:'Zahlungen und Anwesenheit',Português:'Pagamentos e assiduidade'},
    'Pagos':{Galego:'Pagos',English:'Payments',Français:'Paiements',Polski:'Płatności',Deutsch:'Zahlungen',Português:'Pagamentos'},
    'Asistencia y pausas':{Galego:'Asistencia e pausas',English:'Attendance and pauses',Français:'Présence et pauses',Polski:'Obecność i przerwy',Deutsch:'Anwesenheit und Pausen',Português:'Assiduidade e pausas'},
    'Mis insignias':{Galego:'As miñas insignias',English:'My badges',Français:'Mes badges',Polski:'Moje odznaki',Deutsch:'Meine Abzeichen',Português:'As minhas insígnias'},
    'Mis materias con dificultades':{Galego:'Materias con dificultades',English:'Subjects I find difficult',Français:'Matières difficiles',Polski:'Trudne przedmioty',Deutsch:'Schwierige Fächer',Português:'Disciplinas com dificuldade'},
    'Mis calificaciones':{Galego:'As miñas cualificacións',English:'My grades',Français:'Mes notes',Polski:'Moje oceny',Deutsch:'Meine Noten',Português:'As minhas classificações'},
    'Guardar':{Galego:'Gardar',English:'Save',Français:'Enregistrer',Polski:'Zapisz',Deutsch:'Speichern',Português:'Guardar'},
    'Guardar calificación':{Galego:'Gardar cualificación',English:'Save grade',Français:'Enregistrer la note',Polski:'Zapisz ocenę',Deutsch:'Note speichern',Português:'Guardar classificação'},
    'Nueva calificación':{Galego:'Nova cualificación',English:'New grade',Français:'Nouvelle note',Polski:'Nowa ocena',Deutsch:'Neue Note',Português:'Nova classificação'},
    'Materia':{Galego:'Materia',English:'Subject',Français:'Matière',Polski:'Przedmiot',Deutsch:'Fach',Português:'Disciplina'},
    'Unidad didáctica':{Galego:'Unidade didáctica',English:'Unit',Français:'Unité',Polski:'Dział',Deutsch:'Lerneinheit',Português:'Unidade didática'},
    'Evaluación':{Galego:'Avaliación',English:'Term',Français:'Évaluation',Polski:'Okres oceniania',Deutsch:'Bewertung',Português:'Avaliação'},
    'Tipo de prueba':{Galego:'Tipo de proba',English:'Assessment type',Français:'Type d’épreuve',Polski:'Rodzaj sprawdzianu',Deutsch:'Prüfungsart',Português:'Tipo de prova'},
    'Nota':{Galego:'Nota',English:'Grade',Français:'Note',Polski:'Ocena',Deutsch:'Note',Português:'Nota'},
    'Tabla de calificaciones':{Galego:'Táboa de cualificacións',English:'Grades table',Français:'Tableau des notes',Polski:'Tabela ocen',Deutsch:'Notentabelle',Português:'Tabela de classificações'},
    'Media total de todas las evaluaciones':{Galego:'Media total de todas as avaliacións',English:'Overall average for all terms',Français:'Moyenne totale de toutes les évaluations',Polski:'Średnia ogólna ze wszystkich okresów',Deutsch:'Gesamtdurchschnitt aller Bewertungen',Português:'Média total de todas as avaliações'},
    'Media por asignatura y evaluación':{Galego:'Media por materia e avaliación',English:'Average by subject and term',Français:'Moyenne par matière et période',Polski:'Średnia według przedmiotu i okresu',Deutsch:'Durchschnitt nach Fach und Halbjahr',Português:'Média por disciplina e avaliação'},
    'Crear fecha':{Galego:'Crear data',English:'Create event',Français:'Créer une date',Polski:'Utwórz datę',Deutsch:'Termin erstellen',Português:'Criar data'},
    'Próximas fechas':{Galego:'Próximas datas',English:'Upcoming dates',Français:'Prochaines dates',Polski:'Nadchodzące daty',Deutsch:'Kommende Termine',Português:'Próximas datas'},
    'Deshacer último cambio':{Galego:'Desfacer o último cambio',English:'Undo last change',Français:'Annuler le dernier changement',Polski:'Cofnij ostatnią zmianę',Deutsch:'Letzte Änderung rückgängig machen',Português:'Desfazer última alteração'}
  };
  const EXTRA_TRANSLATIONS = {
    'Curso 2025/26':{Galego:'Curso 2025/26',English:'School year 2025/26',Français:'Année scolaire 2025/26',Polski:'Rok szkolny 2025/26',Deutsch:'Schuljahr 2025/26',Português:'Ano letivo 2025/26'},
    'Página principal':{Galego:'Páxina principal',English:'Home page',Français:'Page d’accueil',Polski:'Strona główna',Deutsch:'Startseite',Português:'Página principal'},
    'Texto':{Galego:'Texto',English:'Text',Français:'Texte',Polski:'Tekst',Deutsch:'Text',Português:'Texto'},
    'Lectura':{Galego:'Lectura',English:'Reading',Français:'Lecture',Polski:'Czytanie',Deutsch:'Lesen',Português:'Leitura'},
    'Por defecto':{Galego:'Por defecto',English:'Default',Français:'Par défaut',Polski:'Domyślne',Deutsch:'Standard',Português:'Predefinido'},
    'Idioma':{Galego:'Idioma',English:'Language',Français:'Langue',Polski:'Język',Deutsch:'Sprache',Português:'Idioma'},
    'Claro':{Galego:'Claro',English:'Light',Français:'Clair',Polski:'Jasny',Deutsch:'Hell',Português:'Claro'},
    'Oscuro':{Galego:'Escuro',English:'Dark',Français:'Sombre',Polski:'Ciemny',Deutsch:'Dunkel',Português:'Escuro'},
    'Aviso legal':{Galego:'Aviso legal',English:'Legal notice',Français:'Mentions légales',Polski:'Nota prawna',Deutsch:'Impressum',Português:'Aviso legal'},
    'Soporte':{Galego:'Soporte',English:'Support',Français:'Support',Polski:'Pomoc',Deutsch:'Support',Português:'Suporte'},
    'Contacto':{Galego:'Contacto',English:'Contact',Français:'Contact',Polski:'Kontakt',Deutsch:'Kontakt',Português:'Contacto'},
    '← Atrás':{Galego:'← Atrás',English:'← Back',Français:'← Retour',Polski:'← Wstecz',Deutsch:'← Zurück',Português:'← Voltar'},
    'Atrás':{Galego:'Atrás',English:'Back',Français:'Retour',Polski:'Wstecz',Deutsch:'Zurück',Português:'Voltar'},
    'Hola':{Galego:'Ola',English:'Hello',Français:'Bonjour',Polski:'Witaj',Deutsch:'Hallo',Português:'Olá'},
    'Panel personal':{Galego:'Panel persoal',English:'Personal panel',Français:'Panneau personnel',Polski:'Panel osobisty',Deutsch:'Persönlicher Bereich',Português:'Painel pessoal'},
    'Orientación académica y profesional':{Galego:'Orientación académica e profesional',English:'Academic and career guidance',Français:'Orientation scolaire et professionnelle',Polski:'Doradztwo edukacyjne i zawodowe',Deutsch:'Schulische und berufliche Beratung',Português:'Orientação académica e profissional'},
    'Tests vocacionales, inteligencia emocional, itinerarios, Bachillerato, FP y recursos para decidir mejor.':{Galego:'Tests vocacionais, intelixencia emocional, itinerarios, Bacharelato, FP e recursos para decidir mellor.',English:'Vocational tests, emotional intelligence, pathways, Baccalaureate, vocational training and resources to make better decisions.',Français:'Tests d’orientation, intelligence émotionnelle, parcours, lycée, formation professionnelle et ressources pour mieux décider.',Polski:'Testy predyspozycji, inteligencja emocjonalna, ścieżki kształcenia, szkoła średnia, kształcenie zawodowe i zasoby pomagające lepiej decydować.',Deutsch:'Berufswahltests, emotionale Intelligenz, Bildungswege, Oberstufe, Berufsbildung und Materialien für bessere Entscheidungen.',Português:'Testes vocacionais, inteligência emocional, percursos, Bacharelato, formação profissional e recursos para decidir melhor.'},
    'Recursos publicados por la profesora para orientar tus decisiones académicas y profesionales.':{Galego:'Recursos publicados pola profesora para orientar as túas decisións académicas e profesionais.',English:'Resources published by the teacher to guide your academic and career decisions.',Français:'Ressources publiées par l’enseignante pour guider tes décisions scolaires et professionnelles.',Polski:'Materiały opublikowane przez nauczycielkę, aby pomóc Ci w decyzjach edukacyjnych i zawodowych.',Deutsch:'Von der Lehrerin veröffentlichte Materialien zur Unterstützung deiner schulischen und beruflichen Entscheidungen.',Português:'Recursos publicados pela professora para orientar as tuas decisões académicas e profissionais.'},
    'Indica dónde necesitas más refuerzo.':{Galego:'Indica onde precisas máis reforzo.',English:'Indicate where you need more support.',Français:'Indique où tu as besoin de plus de soutien.',Polski:'Wskaż, gdzie potrzebujesz większego wsparcia.',Deutsch:'Gib an, wo du mehr Unterstützung brauchst.',Português:'Indica onde precisas de mais apoio.'},
    'Registra tus notas del centro escolar.':{Galego:'Rexistra as túas notas do centro escolar.',English:'Record your school grades.',Français:'Enregistre tes notes scolaires.',Polski:'Zapisuj swoje oceny szkolne.',Deutsch:'Trage deine Schulnoten ein.',Português:'Regista as tuas notas escolares.'},
    'Sin insignias todavía.':{Galego:'Aínda sen insignias.',English:'No badges yet.',Français:'Aucun badge pour le moment.',Polski:'Brak odznak.',Deutsch:'Noch keine Abzeichen.',Português:'Ainda sem insígnias.'},
    'Todavía no tienes insignias asignadas.':{Galego:'Aínda non tes insignias asignadas.',English:'You do not have any assigned badges yet.',Français:'Tu n’as pas encore de badges attribués.',Polski:'Nie masz jeszcze przyznanych odznak.',Deutsch:'Du hast noch keine Abzeichen erhalten.',Português:'Ainda não tens insígnias atribuídas.'},
    'No has indicado materias con dificultades.':{Galego:'Non indicaches materias con dificultades.',English:'You have not added subjects with difficulties.',Français:'Tu n’as indiqué aucune matière difficile.',Polski:'Nie wskazano trudnych przedmiotów.',Deutsch:'Du hast keine schwierigen Fächer angegeben.',Português:'Não indicaste disciplinas com dificuldades.'},
    'Sin materias con dificultades.':{Galego:'Sen materias con dificultades.',English:'No difficult subjects.',Français:'Aucune matière difficile.',Polski:'Brak trudnych przedmiotów.',Deutsch:'Keine schwierigen Fächer.',Português:'Sem disciplinas com dificuldades.'},
    'Explica las dificultades':{Galego:'Explica as dificultades',English:'Explain the difficulties',Français:'Explique les difficultés',Polski:'Opisz trudności',Deutsch:'Erkläre die Schwierigkeiten',Português:'Explica as dificuldades'},
    'Nivel de dificultad':{Galego:'Nivel de dificultade',English:'Difficulty level',Français:'Niveau de difficulté',Polski:'Poziom trudności',Deutsch:'Schwierigkeitsgrad',Português:'Nível de dificuldade'},
    'Leve':{Galego:'Leve',English:'Low',Français:'Faible',Polski:'Niski',Deutsch:'Gering',Português:'Ligeira'},
    'Media':{Galego:'Media',English:'Medium',Français:'Moyenne',Polski:'Średni',Deutsch:'Mittel',Português:'Média'},
    'Alta':{Galego:'Alta',English:'High',Français:'Élevée',Polski:'Wysoki',Deutsch:'Hoch',Português:'Alta'},
    'Añade tus notas del centro escolar. La media se calcula automáticamente por asignatura y por evaluación.':{Galego:'Engade as túas notas do centro escolar. A media calcúlase automaticamente por materia e por avaliación.',English:'Add your school grades. The average is calculated automatically by subject and term.',Français:'Ajoute tes notes scolaires. La moyenne est calculée automatiquement par matière et par période.',Polski:'Dodaj swoje oceny szkolne. Średnia oblicza się automatycznie według przedmiotu i okresu.',Deutsch:'Trage deine Schulnoten ein. Der Durchschnitt wird automatisch nach Fach und Halbjahr berechnet.',Português:'Adiciona as tuas notas escolares. A média é calculada automaticamente por disciplina e avaliação.'},
    'Ponderación':{Galego:'Ponderación',English:'Weighting',Français:'Pondération',Polski:'Waga oceny',Deutsch:'Gewichtung',Português:'Ponderação'},
    'Ponderación opcional (%)':{Galego:'Ponderación opcional (%)',English:'Optional weighting (%)',Français:'Pondération facultative (%)',Polski:'Opcjonalna waga (%)',Deutsch:'Optionale Gewichtung (%)',Português:'Ponderação opcional (%)'},
    'Se puede dejar en blanco. Sirve para indicar que una prueba cuenta más o menos en la media. Si todas las ponderaciones están vacías, la media será aritmética; si alguna tiene porcentaje, se usará la media ponderada.':{Galego:'Pódese deixar en branco. Serve para indicar que unha proba conta máis ou menos na media. Se todas as ponderacións están baleiras, a media será aritmética; se algunha ten porcentaxe, usarase a media ponderada.',English:'It can be left blank. It indicates whether an assessment counts more or less towards the average. If all weightings are blank, the average is arithmetic; if any percentage is entered, the weighted average is used.',Français:'Ce champ peut rester vide. Il indique si une épreuve compte plus ou moins dans la moyenne. Si toutes les pondérations sont vides, la moyenne est arithmétique ; si un pourcentage est indiqué, la moyenne pondérée est utilisée.',Polski:'Można zostawić puste. Pole wskazuje, czy dana praca liczy się bardziej lub mniej do średniej. Jeśli wszystkie wagi są puste, średnia jest arytmetyczna; jeśli wpisano procent, używana jest średnia ważona.',Deutsch:'Das Feld kann leer bleiben. Es zeigt an, ob eine Leistung stärker oder schwächer in den Durchschnitt eingeht. Sind alle Gewichtungen leer, wird der arithmetische Durchschnitt berechnet; bei Prozentwerten der gewichtete Durchschnitt.',Português:'Pode ficar em branco. Serve para indicar se uma prova conta mais ou menos na média. Se todas as ponderações estiverem vazias, a média será aritmética; se alguma tiver percentagem, será usada a média ponderada.'},
    'Primera evaluación':{Galego:'Primeira avaliación',English:'First term',Français:'Première évaluation',Polski:'Pierwszy okres',Deutsch:'Erste Bewertung',Português:'Primeira avaliação'},
    'Segunda evaluación':{Galego:'Segunda avaliación',English:'Second term',Français:'Deuxième évaluation',Polski:'Drugi okres',Deutsch:'Zweite Bewertung',Português:'Segunda avaliação'},
    'Tercera evaluación':{Galego:'Terceira avaliación',English:'Third term',Français:'Troisième évaluation',Polski:'Trzeci okres',Deutsch:'Dritte Bewertung',Português:'Terceira avaliação'},
    'Examen':{Galego:'Exame',English:'Exam',Français:'Examen',Polski:'Egzamin',Deutsch:'Prüfung',Português:'Exame'},
    'Trabajo':{Galego:'Traballo',English:'Project',Français:'Travail',Polski:'Praca',Deutsch:'Arbeit',Português:'Trabalho'},
    'Presentación':{Galego:'Presentación',English:'Presentation',Français:'Présentation',Polski:'Prezentacja',Deutsch:'Präsentation',Português:'Apresentação'},
    'Examen oral':{Galego:'Exame oral',English:'Oral exam',Français:'Examen oral',Polski:'Egzamin ustny',Deutsch:'Mündliche Prüfung',Português:'Exame oral'},
    'Todavía no hay calificaciones registradas.':{Galego:'Aínda non hai cualificacións rexistradas.',English:'There are no grades recorded yet.',Français:'Aucune note n’est encore enregistrée.',Polski:'Nie zapisano jeszcze ocen.',Deutsch:'Es sind noch keine Noten eingetragen.',Português:'Ainda não há classificações registadas.'},
    'Aún no hay medias por asignatura. Registra tu primera calificación.':{Galego:'Aínda non hai medias por materia. Rexistra a túa primeira cualificación.',English:'There are no subject averages yet. Record your first grade.',Français:'Il n’y a pas encore de moyennes par matière. Enregistre ta première note.',Polski:'Nie ma jeszcze średnich z przedmiotów. Zapisz pierwszą ocenę.',Deutsch:'Es gibt noch keine Fach-Durchschnitte. Trage deine erste Note ein.',Português:'Ainda não há médias por disciplina. Regista a tua primeira classificação.'},
    'No hay eventos este día. Puedes crear uno nuevo.':{Galego:'Non hai eventos este día. Podes crear un novo.',English:'There are no events on this day. You can create a new one.',Français:'Il n’y a aucun événement ce jour-là. Tu peux en créer un nouveau.',Polski:'Tego dnia nie ma wydarzeń. Możesz utworzyć nowe.',Deutsch:'An diesem Tag gibt es keine Termine. Du kannst einen neuen erstellen.',Português:'Não há eventos neste dia. Podes criar um novo.'},
    'Sin próximas fechas en los próximos 7 días.':{Galego:'Sen próximas datas nos vindeiros 7 días.',English:'No upcoming dates in the next 7 days.',Français:'Aucune date prévue dans les 7 prochains jours.',Polski:'Brak nadchodzących dat w ciągu najbliższych 7 dni.',Deutsch:'Keine Termine in den nächsten 7 Tagen.',Português:'Sem próximas datas nos próximos 7 dias.'},
    'Próximas fechas y días':{Galego:'Próximas datas e días',English:'Upcoming dates and days',Français:'Prochaines dates et journées',Polski:'Nadchodzące daty i dni',Deutsch:'Kommende Termine und Tage',Português:'Próximas datas e dias'},
    'Solo se muestran fechas en los próximos 7 días.':{Galego:'Só se mostran datas dos vindeiros 7 días.',English:'Only dates in the next 7 days are shown.',Français:'Seules les dates des 7 prochains jours sont affichées.',Polski:'Wyświetlane są tylko daty z najbliższych 7 dni.',Deutsch:'Es werden nur Termine der nächsten 7 Tage angezeigt.',Português:'Só são mostradas datas dos próximos 7 dias.'},
    'Fecha':{Galego:'Data',English:'Date',Français:'Date',Polski:'Data',Deutsch:'Datum',Português:'Data'},
    'Título':{Galego:'Título',English:'Title',Français:'Titre',Polski:'Tytuł',Deutsch:'Titel',Português:'Título'},
    'Descripción':{Galego:'Descrición',English:'Description',Français:'Description',Polski:'Opis',Deutsch:'Beschreibung',Português:'Descrição'},
    'Tipo':{Galego:'Tipo',English:'Type',Français:'Type',Polski:'Typ',Deutsch:'Typ',Português:'Tipo'},
    'Visibilidad':{Galego:'Visibilidade',English:'Visibility',Français:'Visibilité',Polski:'Widoczność',Deutsch:'Sichtbarkeit',Português:'Visibilidade'},
    'Solo para mí':{Galego:'Só para min',English:'Only me',Français:'Seulement pour moi',Polski:'Tylko dla mnie',Deutsch:'Nur für mich',Português:'Só para mim'},
    'solo para mí':{Galego:'só para min',English:'only me',Français:'seulement pour moi',Polski:'tylko dla mnie',Deutsch:'nur für mich',Português:'só para mim'},
    'toda mi clase':{Galego:'toda a miña clase',English:'my whole class',Français:'toute ma classe',Polski:'cała moja klasa',Deutsch:'meine ganze Klasse',Português:'toda a minha turma'},
    'Todo el alumnado':{Galego:'Todo o alumnado',English:'All students',Français:'Tous les élèves',Polski:'Wszyscy uczniowie',Deutsch:'Alle Schülerinnen und Schüler',Português:'Todo o alumnado'},
    'Centro, etapa y curso':{Galego:'Centro, etapa e curso',English:'School, stage and course',Français:'Établissement, niveau et classe',Polski:'Szkoła, etap i klasa',Deutsch:'Schule, Stufe und Kurs',Português:'Centro, etapa e curso'},
    'Alumnos concretos':{Galego:'Alumnado concreto',English:'Specific students',Français:'Élèves précis',Polski:'Wybrani uczniowie',Deutsch:'Bestimmte Lernende',Português:'Alunos concretos'},
    'Centro':{Galego:'Centro',English:'School',Français:'Établissement',Polski:'Szkoła',Deutsch:'Schule',Português:'Centro'},
    'Etapa':{Galego:'Etapa',English:'Stage',Français:'Niveau',Polski:'Etap',Deutsch:'Stufe',Português:'Etapa'},
    'Curso':{Galego:'Curso',English:'Course',Français:'Classe',Polski:'Klasa',Deutsch:'Kurs',Português:'Curso'},
    'Sin filtrar':{Galego:'Sen filtrar',English:'No filter',Français:'Sans filtre',Polski:'Bez filtra',Deutsch:'Ohne Filter',Português:'Sem filtrar'},
    'Filtrar alumnado...':{Galego:'Filtrar alumnado...',English:'Filter students...',Français:'Filtrer les élèves...',Polski:'Filtruj uczniów...',Deutsch:'Lernende filtern...',Português:'Filtrar alumnado...'},
    'Nombre, usuario, centro, etapa o curso...':{Galego:'Nome, usuario, centro, etapa ou curso...',English:'Name, username, school, stage or course...',Français:'Nom, utilisateur, établissement, niveau ou classe...',Polski:'Imię, użytkownik, szkoła, etap lub klasa...',Deutsch:'Name, Benutzername, Schule, Stufe oder Kurs...',Português:'Nome, utilizador, centro, etapa ou curso...'},
    'Buscar alumno':{Galego:'Filtrar alumnado',English:'Filter students',Français:'Filtrer les élèves',Polski:'Filtruj uczniów',Deutsch:'Lernende filtern',Português:'Filtrar alumnado'},
    'Seleccionar visibles':{Galego:'Seleccionar visibles',English:'Select visible',Français:'Sélectionner les visibles',Polski:'Zaznacz widocznych',Deutsch:'Sichtbare auswählen',Português:'Selecionar visíveis'},
    'Desmarcar todo':{Galego:'Desmarcar todo',English:'Unselect all',Français:'Tout décocher',Polski:'Odznacz wszystko',Deutsch:'Alles abwählen',Português:'Desmarcar tudo'},
    'Asignar insignia manualmente':{Galego:'Asignar insignia manualmente',English:'Assign badge manually',Français:'Attribuer un badge manuellement',Polski:'Przyznaj odznakę ręcznie',Deutsch:'Abzeichen manuell vergeben',Português:'Atribuir insígnia manualmente'},
    'Las insignias solo puede concederlas la profesora. Selecciona una insignia, busca alumnado y marca uno o varios perfiles.':{Galego:'As insignias só pode concedelas a profesora. Selecciona unha insignia, filtra alumnado e marca un ou varios perfís.',English:'Only the teacher can award badges. Select a badge, filter students and mark one or more profiles.',Français:'Seule l’enseignante peut attribuer les badges. Sélectionne un badge, filtre les élèves et coche un ou plusieurs profils.',Polski:'Odznaki może przyznawać tylko nauczycielka. Wybierz odznakę, przefiltruj uczniów i zaznacz jeden lub kilka profili.',Deutsch:'Nur die Lehrerin kann Abzeichen vergeben. Wähle ein Abzeichen, filtere die Lernenden und markiere ein oder mehrere Profile.',Português:'As insígnias só podem ser atribuídas pela professora. Seleciona uma insígnia, filtra alumnado e marca um ou vários perfis.'},
    'Se guardará en el perfil del alumnado seleccionado.':{Galego:'Gardarase no perfil do alumnado seleccionado.',English:'It will be saved in the selected students’ profiles.',Français:'Ce sera enregistré dans le profil des élèves sélectionnés.',Polski:'Zostanie zapisane w profilach wybranych uczniów.',Deutsch:'Es wird in den Profilen der ausgewählten Lernenden gespeichert.',Português:'Será guardado no perfil do alumnado selecionado.'},
    'perfiles disponibles':{Galego:'perfís dispoñibles',English:'profiles available',Français:'profils disponibles',Polski:'dostępne profile',Deutsch:'Profile verfügbar',Português:'perfis disponíveis'},
    'perfil disponible':{Galego:'perfil dispoñible',English:'profile available',Français:'profil disponible',Polski:'dostępny profil',Deutsch:'Profil verfügbar',Português:'perfil disponível'},
    'Nueva publicación':{Galego:'Nova publicación',English:'New post',Français:'Nouvelle publication',Polski:'Nowa publikacja',Deutsch:'Neue Veröffentlichung',Português:'Nova publicação'},
    'Qué vas a publicar':{Galego:'Que vas publicar',English:'What are you going to publish?',Français:'Que vas-tu publier ?',Polski:'Co chcesz opublikować?',Deutsch:'Was möchtest du veröffentlichen?',Português:'O que vais publicar'},
    'Anuncio, aviso o noticia':{Galego:'Anuncio, aviso ou noticia',English:'Announcement, notice or news',Français:'Annonce, avis ou nouvelle',Polski:'Ogłoszenie, informacja lub aktualność',Deutsch:'Ankündigung, Hinweis oder Nachricht',Português:'Anúncio, aviso ou notícia'},
    'Material de materia':{Galego:'Material de materia',English:'Subject material',Français:'Ressource de matière',Polski:'Materiał przedmiotowy',Deutsch:'Fachmaterial',Português:'Material de disciplina'},
    'Tarea o actividad':{Galego:'Tarefa ou actividade',English:'Task or activity',Français:'Tâche ou activité',Polski:'Zadanie lub aktywność',Deutsch:'Aufgabe oder Aktivität',Português:'Tarefa ou atividade'},
    'Test externo':{Galego:'Test externo',English:'External test',Français:'Test externe',Polski:'Test zewnętrzny',Deutsch:'Externer Test',Português:'Teste externo'},
    'Juego':{Galego:'Xogo',English:'Game',Français:'Jeu',Polski:'Gra',Deutsch:'Spiel',Português:'Jogo'},
    'Actividad lúdica o enlace a juego.':{Galego:'Actividade lúdica ou ligazón a un xogo.',English:'Playful activity or link to a game.',Français:'Activité ludique ou lien vers un jeu.',Polski:'Aktywność edukacyjna lub link do gry.',Deutsch:'Spielerische Aktivität oder Link zu einem Spiel.',Português:'Atividade lúdica ou ligação para jogo.'},
    'Se verá en Anuncios, dentro de una materia.':{Galego:'Verase en Anuncios, dentro dunha materia.',English:'It will appear in Announcements, within a subject.',Français:'Cela apparaîtra dans les annonces, dans une matière.',Polski:'Pojawi się w Ogłoszeniach, w ramach przedmiotu.',Deutsch:'Es erscheint in den Ankündigungen innerhalb eines Fachs.',Português:'Será visto em Anúncios, dentro de uma disciplina.'},
    'Apuntes, boletín, documento o recurso.':{Galego:'Apuntamentos, boletín, documento ou recurso.',English:'Notes, worksheet, document or resource.',Français:'Notes, fiche, document ou ressource.',Polski:'Notatki, karta pracy, dokument lub materiał.',Deutsch:'Notizen, Arbeitsblatt, Dokument oder Ressource.',Português:'Apontamentos, ficha, documento ou recurso.'},
    'Las insignias se asignan manualmente desde el panel docente.':{Galego:'As insignias asígnanse manualmente desde o panel docente.',English:'Badges are assigned manually from the teacher panel.',Français:'Les badges sont attribués manuellement depuis le panneau enseignant.',Polski:'Odznaki są przyznawane ręcznie z panelu nauczyciela.',Deutsch:'Abzeichen werden manuell über den Lehrerbereich vergeben.',Português:'As insígnias são atribuídas manualmente a partir do painel docente.'},
    'Usa el enlace para el test interactivo.':{Galego:'Usa a ligazón para o test interactivo.',English:'Use the link for the interactive test.',Français:'Utilise le lien pour le test interactif.',Polski:'Użyj linku do testu interaktywnego.',Deutsch:'Nutze den Link für den interaktiven Test.',Português:'Usa a ligação para o teste interativo.'},
    'Archivos adjuntos':{Galego:'Arquivos adxuntos',English:'Attachments',Français:'Fichiers joints',Polski:'Załączniki',Deutsch:'Anhänge',Português:'Ficheiros anexos'},
    'Imagen visible en la publicación':{Galego:'Imaxe visible na publicación',English:'Visible image in the post',Français:'Image visible dans la publication',Polski:'Widoczny obraz w publikacji',Deutsch:'Sichtbares Bild in der Veröffentlichung',Português:'Imagem visível na publicação'},
    'Documentos adjuntos PDF, Word o imágenes':{Galego:'Documentos adxuntos PDF, Word ou imaxes',English:'Attached PDF, Word or image files',Français:'Documents joints PDF, Word ou images',Polski:'Załączone pliki PDF, Word lub obrazy',Deutsch:'Angehängte PDF-, Word- oder Bilddateien',Português:'Documentos anexos PDF, Word ou imagens'},
    'Ningún archivo seleccionado.':{Galego:'Ningún arquivo seleccionado.',English:'No file selected.',Français:'Aucun fichier sélectionné.',Polski:'Nie wybrano pliku.',Deutsch:'Keine Datei ausgewählt.',Português:'Nenhum ficheiro selecionado.'},
    'Destinatarios':{Galego:'Destinatarios',English:'Recipients',Français:'Destinataires',Polski:'Odbiorcy',Deutsch:'Empfänger',Português:'Destinatários'},
    'Primero elige el alcance. Si eliges alumnos concretos, marca uno o varios perfiles.':{Galego:'Primeiro escolle o alcance. Se escolles alumnado concreto, marca un ou varios perfís.',English:'First choose the scope. If you choose specific students, select one or more profiles.',Français:'Choisis d’abord la portée. Si tu choisis des élèves précis, coche un ou plusieurs profils.',Polski:'Najpierw wybierz zakres. Jeśli wybierzesz konkretnych uczniów, zaznacz jeden lub kilka profili.',Deutsch:'Wähle zuerst den Umfang. Wenn du bestimmte Lernende auswählst, markiere ein oder mehrere Profile.',Português:'Primeiro escolhe o alcance. Se escolheres alunos concretos, marca um ou vários perfis.'},
    'Publicar ahora':{Galego:'Publicar agora',English:'Publish now',Français:'Publier maintenant',Polski:'Opublikuj teraz',Deutsch:'Jetzt veröffentlichen',Português:'Publicar agora'},
    'Estás modificando una publicación existente. Al guardar no se creará una copia duplicada.':{Galego:'Estás modificando unha publicación existente. Ao gardar non se creará unha copia duplicada.',English:'You are editing an existing post. Saving will not create a duplicate copy.',Français:'Tu modifies une publication existante. L’enregistrement ne créera pas de copie.',Polski:'Edytujesz istniejącą publikację. Zapisanie nie utworzy duplikatu.',Deutsch:'Du bearbeitest eine bestehende Veröffentlichung. Beim Speichern wird keine Kopie erstellt.',Português:'Estás a modificar uma publicação existente. Ao guardar não será criada uma cópia duplicada.'},
    'Cancelar edición':{Galego:'Cancelar edición',English:'Cancel editing',Français:'Annuler la modification',Polski:'Anuluj edycję',Deutsch:'Bearbeitung abbrechen',Português:'Cancelar edição'},
    'Abrir publicación':{Galego:'Abrir publicación',English:'Open post',Français:'Ouvrir la publication',Polski:'Otwórz publikację',Deutsch:'Veröffentlichung öffnen',Português:'Abrir publicação'},
    'Abrir enlace':{Galego:'Abrir ligazón',English:'Open link',Français:'Ouvrir le lien',Polski:'Otwórz link',Deutsch:'Link öffnen',Português:'Abrir ligação'},
    'Abrir enlace externo':{Galego:'Abrir ligazón externa',English:'Open external link',Français:'Ouvrir le lien externe',Polski:'Otwórz link zewnętrzny',Deutsch:'Externen Link öffnen',Português:'Abrir ligação externa'},
    'Marcar como hecha':{Galego:'Marcar como feita',English:'Mark as done',Français:'Marquer comme terminé',Polski:'Oznacz jako wykonane',Deutsch:'Als erledigt markieren',Português:'Marcar como feita'},
    'Hecha':{Galego:'Feita',English:'Done',Français:'Terminée',Polski:'Wykonane',Deutsch:'Erledigt',Português:'Feita'},
    'Pendiente':{Galego:'Pendente',English:'Pending',Français:'En attente',Polski:'Oczekujące',Deutsch:'Ausstehend',Português:'Pendente'},
    'Publicación marcada como hecha.':{Galego:'Publicación marcada como feita.',English:'Post marked as done.',Français:'Publication marquée comme terminée.',Polski:'Publikacja oznaczona jako wykonana.',Deutsch:'Veröffentlichung als erledigt markiert.',Português:'Publicação marcada como feita.'},
    'Publicación marcada como pendiente.':{Galego:'Publicación marcada como pendente.',English:'Post marked as pending.',Français:'Publication marquée comme en attente.',Polski:'Publikacja oznaczona jako oczekująca.',Deutsch:'Veröffentlichung als ausstehend markiert.',Português:'Publicação marcada como pendente.'},
    'Material':{Galego:'Material',English:'Material',Français:'Ressource',Polski:'Materiał',Deutsch:'Material',Português:'Material'},
    'Tarea':{Galego:'Tarefa',English:'Task',Français:'Tâche',Polski:'Zadanie',Deutsch:'Aufgabe',Português:'Tarefa'},
    'Test':{Galego:'Test',English:'Test',Français:'Test',Polski:'Test',Deutsch:'Test',Português:'Teste'},
    'Aviso':{Galego:'Aviso',English:'Notice',Français:'Avis',Polski:'Informacja',Deutsch:'Hinweis',Português:'Aviso'},
    'Noticia':{Galego:'Noticia',English:'News',Français:'Nouvelle',Polski:'Aktualność',Deutsch:'Nachricht',Português:'Notícia'},
    'Visible':{Galego:'Visible',English:'Visible',Français:'Visible',Polski:'Widoczne',Deutsch:'Sichtbar',Português:'Visível'},
    'Oculta':{Galego:'Oculta',English:'Hidden',Français:'Masquée',Polski:'Ukryte',Deutsch:'Ausgeblendet',Português:'Oculta'},
    'Oculto':{Galego:'Oculto',English:'Hidden',Français:'Masqué',Polski:'Ukryte',Deutsch:'Ausgeblendet',Português:'Oculto'},
    'Ocultar':{Galego:'Ocultar',English:'Hide',Français:'Masquer',Polski:'Ukryj',Deutsch:'Ausblenden',Português:'Ocultar'},
    'Mostrar':{Galego:'Mostrar',English:'Show',Français:'Afficher',Polski:'Pokaż',Deutsch:'Anzeigen',Português:'Mostrar'},
    'Ocultar al alumnado':{Galego:'Ocultar ao alumnado',English:'Hide from students',Français:'Masquer aux élèves',Polski:'Ukryj przed uczniami',Deutsch:'Vor Lernenden ausblenden',Português:'Ocultar ao alumnado'},
    'Mostrar al alumnado':{Galego:'Mostrar ao alumnado',English:'Show to students',Français:'Afficher aux élèves',Polski:'Pokaż uczniom',Deutsch:'Lernenden anzeigen',Português:'Mostrar ao alumnado'},
    'Publicar material':{Galego:'Publicar material',English:'Publish material',Français:'Publier une ressource',Polski:'Opublikuj materiał',Deutsch:'Material veröffentlichen',Português:'Publicar material'},
    'Crear curso o materia':{Galego:'Crear curso ou materia',English:'Create course or subject',Français:'Créer une classe ou une matière',Polski:'Utwórz klasę lub przedmiot',Deutsch:'Kurs oder Fach erstellen',Português:'Criar curso ou disciplina'},
    'Cambia etapa, curso, nombre o visibilidad. Para cursos nuevos, escribe el curso y guarda una materia.':{Galego:'Cambia etapa, curso, nome ou visibilidade. Para cursos novos, escribe o curso e garda unha materia.',English:'Change stage, course, name or visibility. For new courses, type the course and save a subject.',Français:'Modifie le niveau, la classe, le nom ou la visibilité. Pour de nouvelles classes, écris la classe et enregistre une matière.',Polski:'Zmień etap, klasę, nazwę lub widoczność. Dla nowych klas wpisz klasę i zapisz przedmiot.',Deutsch:'Ändere Stufe, Kurs, Name oder Sichtbarkeit. Für neue Kurse gib den Kurs ein und speichere ein Fach.',Português:'Altera etapa, curso, nome ou visibilidade. Para cursos novos, escreve o curso e guarda uma disciplina.'},
    'Nombre de la materia':{Galego:'Nome da materia',English:'Subject name',Français:'Nom de la matière',Polski:'Nazwa przedmiotu',Deutsch:'Fachname',Português:'Nome da disciplina'},
    'Visible para el alumnado':{Galego:'Visible para o alumnado',English:'Visible to students',Français:'Visible pour les élèves',Polski:'Widoczne dla uczniów',Deutsch:'Für Lernende sichtbar',Português:'Visível para o alumnado'},
    'Guardar materia':{Galego:'Gardar materia',English:'Save subject',Français:'Enregistrer la matière',Polski:'Zapisz przedmiot',Deutsch:'Fach speichern',Português:'Guardar disciplina'},
    'Limpiar editor':{Galego:'Limpar editor',English:'Clear editor',Français:'Effacer l’éditeur',Polski:'Wyczyść edytor',Deutsch:'Editor leeren',Português:'Limpar editor'},
    'Materias añadidas o modificadas':{Galego:'Materias engadidas ou modificadas',English:'Added or modified subjects',Français:'Matières ajoutées ou modifiées',Polski:'Dodane lub zmienione przedmioty',Deutsch:'Hinzugefügte oder geänderte Fächer',Português:'Disciplinas adicionadas ou modificadas'},
    'Todavía no hay materias personalizadas para este curso.':{Galego:'Aínda non hai materias personalizadas para este curso.',English:'There are no customised subjects for this course yet.',Français:'Il n’y a pas encore de matières personnalisées pour cette classe.',Polski:'Nie ma jeszcze przedmiotów dostosowanych do tej klasy.',Deutsch:'Für diesen Kurs gibt es noch keine angepassten Fächer.',Português:'Ainda não há disciplinas personalizadas para este curso.'},
    'Materias vistas como alumnado':{Galego:'Materias vistas como alumnado',English:'Subjects as seen by students',Français:'Matières vues comme par les élèves',Polski:'Przedmioty widoczne dla uczniów',Deutsch:'Fächer aus Schülersicht',Português:'Disciplinas vistas como alumnado'},
    'Selecciona etapa y curso para revisar materias, publicaciones y visibilidad. Las materias ocultas aparecen marcadas para que se distingan de inmediato.':{Galego:'Selecciona etapa e curso para revisar materias, publicacións e visibilidade. As materias ocultas aparecen marcadas para distinguilas de inmediato.',English:'Select stage and course to review subjects, posts and visibility. Hidden subjects are marked so they can be identified immediately.',Français:'Sélectionne le niveau et la classe pour revoir les matières, publications et visibilité. Les matières masquées sont indiquées clairement.',Polski:'Wybierz etap i klasę, aby sprawdzić przedmioty, publikacje i widoczność. Ukryte przedmioty są oznaczone, aby były od razu widoczne.',Deutsch:'Wähle Stufe und Kurs, um Fächer, Veröffentlichungen und Sichtbarkeit zu prüfen. Ausgeblendete Fächer sind deutlich markiert.',Português:'Seleciona etapa e curso para rever disciplinas, publicações e visibilidade. As disciplinas ocultas aparecem marcadas para se distinguirem de imediato.'},
    'Perfiles del alumnado':{Galego:'Perfís do alumnado',English:'Student profiles',Français:'Profils des élèves',Polski:'Profile uczniów',Deutsch:'Schülerprofile',Português:'Perfis do alumnado'},
    'Identificación':{Galego:'Identificación',English:'Identification',Français:'Identification',Polski:'Identyfikacja',Deutsch:'Identifikation',Português:'Identificação'},
    'Atención personalizada, NEAE y NEE':{Galego:'Atención personalizada, NEAE e NEE',English:'Personalised support, NEAE and SEN',Français:'Accompagnement personnalisé, besoins spécifiques et besoins éducatifs particuliers',Polski:'Wsparcie indywidualne, specjalne potrzeby i trudności edukacyjne',Deutsch:'Individuelle Unterstützung, Förderbedarf und besondere Bedürfnisse',Português:'Atenção personalizada, NEAE e NEE'},
    'Datos privados de gestión docente.':{Galego:'Datos privados de xestión docente.',English:'Private data for teacher management.',Français:'Données privées de gestion enseignante.',Polski:'Dane prywatne do zarządzania nauczycielskiego.',Deutsch:'Private Daten für die Lehrerverwaltung.',Português:'Dados privados de gestão docente.'},
    'Guardar cambios del alumno':{Galego:'Gardar cambios do alumno',English:'Save student changes',Français:'Enregistrer les modifications de l’élève',Polski:'Zapisz zmiany ucznia',Deutsch:'Änderungen am Schülerprofil speichern',Português:'Guardar alterações do aluno'},
    'Mi perfil':{Galego:'O meu perfil',English:'My profile',Français:'Mon profil',Polski:'Mój profil',Deutsch:'Mein Profil',Português:'O meu perfil'},
    'Cambiar icono de perfil':{Galego:'Cambiar icona de perfil',English:'Change profile icon',Français:'Changer l’icône du profil',Polski:'Zmień ikonę profilu',Deutsch:'Profilsymbol ändern',Português:'Alterar ícone de perfil'},
    'Elige uno de los iconos disponibles para que sea tu nueva imagen de perfil.':{Galego:'Elixe un dos iconos dispoñibles para que sexa a túa nova imaxe de perfil.',English:'Choose one of the available icons to use as your new profile image.',Français:'Choisis l’une des icônes disponibles comme nouvelle image de profil.',Polski:'Wybierz jedną z dostępnych ikon jako nowy obraz profilu.',Deutsch:'Wähle eines der verfügbaren Symbole als neues Profilbild.',Português:'Escolhe um dos ícones disponíveis para ser a tua nova imagem de perfil.'},
    'Guardar icono':{Galego:'Gardar icona',English:'Save icon',Français:'Enregistrer l’icône',Polski:'Zapisz ikonę',Deutsch:'Symbol speichern',Português:'Guardar ícone'},
    'Notificaciones por email':{Galego:'Notificacións por email',English:'Email notifications',Français:'Notifications par email',Polski:'Powiadomienia e-mail',Deutsch:'E-Mail-Benachrichtigungen',Português:'Notificações por email'},
    'Indica un correo personal y marca qué avisos quieres recibir.':{Galego:'Indica un correo persoal e marca que avisos queres recibir.',English:'Enter a personal email and choose which notices you want to receive.',Français:'Indique une adresse personnelle et choisis les avis que tu veux recevoir.',Polski:'Wpisz prywatny e-mail i zaznacz, jakie powiadomienia chcesz otrzymywać.',Deutsch:'Gib eine persönliche E-Mail-Adresse ein und wähle aus, welche Hinweise du erhalten möchtest.',Português:'Indica um email pessoal e assinala os avisos que queres receber.'},
    'Email personal':{Galego:'Email persoal',English:'Personal email',Français:'Email personnel',Polski:'E-mail prywatny',Deutsch:'Persönliche E-Mail',Português:'Email pessoal'},
    'Guardar notificaciones':{Galego:'Gardar notificacións',English:'Save notifications',Français:'Enregistrer les notifications',Polski:'Zapisz powiadomienia',Deutsch:'Benachrichtigungen speichern',Português:'Guardar notificações'},
    'Modificar contraseña':{Galego:'Modificar contrasinal',English:'Change password',Français:'Modifier le mot de passe',Polski:'Zmień hasło',Deutsch:'Passwort ändern',Português:'Modificar palavra-passe'},
    'Cambia tu contraseña de acceso o solicita recuperación si no recuerdas la actual.':{Galego:'Cambia o teu contrasinal de acceso ou solicita recuperación se non lembras o actual.',English:'Change your access password or request recovery if you do not remember the current one.',Français:'Modifie ton mot de passe ou demande une récupération si tu ne te souviens pas de l’actuel.',Polski:'Zmień hasło dostępu albo poproś o odzyskanie, jeśli nie pamiętasz obecnego.',Deutsch:'Ändere dein Zugangspasswort oder beantrage Wiederherstellung, wenn du das aktuelle nicht kennst.',Português:'Altera a tua palavra-passe de acesso ou solicita recuperação se não te lembras da atual.'},
    'Nueva contraseña':{Galego:'Novo contrasinal',English:'New password',Français:'Nouveau mot de passe',Polski:'Nowe hasło',Deutsch:'Neues Passwort',Português:'Nova palavra-passe'},
    'Repetir contraseña':{Galego:'Repetir contrasinal',English:'Repeat password',Français:'Répéter le mot de passe',Polski:'Powtórz hasło',Deutsch:'Passwort wiederholen',Português:'Repetir palavra-passe'},
    'Solicitar recuperación de contraseña':{Galego:'Solicitar recuperación de contrasinal',English:'Request password recovery',Français:'Demander la récupération du mot de passe',Polski:'Poproś o odzyskanie hasła',Deutsch:'Passwortwiederherstellung beantragen',Português:'Solicitar recuperação da palavra-passe'},
    'Datos académicos':{Galego:'Datos académicos',English:'Academic data',Français:'Données scolaires',Polski:'Dane edukacyjne',Deutsch:'Schuldaten',Português:'Dados académicos'},
    'Estos datos solo puede modificarlos la profesora.':{Galego:'Estes datos só pode modificalos a profesora.',English:'Only the teacher can modify these data.',Français:'Seule l’enseignante peut modifier ces données.',Polski:'Te dane może zmienić tylko nauczycielka.',Deutsch:'Diese Daten kann nur die Lehrerin ändern.',Português:'Estes dados só podem ser modificados pela professora.'},
    'Bandeja de entrada':{Galego:'Bandexa de entrada',English:'Inbox',Français:'Boîte de réception',Polski:'Skrzynka odbiorcza',Deutsch:'Posteingang',Português:'Caixa de entrada'},
    'Recibidos':{Galego:'Recibidos',English:'Received',Français:'Reçus',Polski:'Odebrane',Deutsch:'Empfangen',Português:'Recebidos'},
    'Enviados':{Galego:'Enviados',English:'Sent',Français:'Envoyés',Polski:'Wysłane',Deutsch:'Gesendet',Português:'Enviados'},
    'Archivados':{Galego:'Arquivados',English:'Archived',Français:'Archivés',Polski:'Zarchiwizowane',Deutsch:'Archiviert',Português:'Arquivados'},
    'Marcar como leído':{Galego:'Marcar como lido',English:'Mark as read',Français:'Marquer comme lu',Polski:'Oznacz jako przeczytane',Deutsch:'Als gelesen markieren',Português:'Marcar como lido'},
    'Responder':{Galego:'Responder',English:'Reply',Français:'Répondre',Polski:'Odpowiedz',Deutsch:'Antworten',Português:'Responder'},
    'Archivar':{Galego:'Arquivar',English:'Archive',Français:'Archiver',Polski:'Archiwizuj',Deutsch:'Archivieren',Português:'Arquivar'},
    'Eliminar':{Galego:'Eliminar',English:'Delete',Français:'Supprimer',Polski:'Usuń',Deutsch:'Löschen',Português:'Eliminar'},
    'Enviar mensaje':{Galego:'Enviar mensaxe',English:'Send message',Français:'Envoyer un message',Polski:'Wyślij wiadomość',Deutsch:'Nachricht senden',Português:'Enviar mensagem'},
    'Asunto':{Galego:'Asunto',English:'Subject',Français:'Objet',Polski:'Temat',Deutsch:'Betreff',Português:'Assunto'},
    'Mensaje':{Galego:'Mensaxe',English:'Message',Français:'Message',Polski:'Wiadomość',Deutsch:'Nachricht',Português:'Mensagem'},
    'Enviar':{Galego:'Enviar',English:'Send',Français:'Envoyer',Polski:'Wyślij',Deutsch:'Senden',Português:'Enviar'},
    'Todavía no hay anuncios publicados.':{Galego:'Aínda non hai anuncios publicados.',English:'There are no announcements yet.',Français:'Il n’y a pas encore d’annonces.',Polski:'Nie ma jeszcze ogłoszeń.',Deutsch:'Es gibt noch keine Ankündigungen.',Português:'Ainda não há anúncios publicados.'},
    'Día de la Enseñanza':{Galego:'Día do Ensino',English:'Education Day',Français:'Journée de l’enseignement',Polski:'Dzień Edukacji',Deutsch:'Tag der Bildung',Português:'Dia do Ensino'},
    'Día no lectivo':{Galego:'Día non lectivo',English:'Non-teaching day',Français:'Jour non scolaire',Polski:'Dzień wolny od zajęć',Deutsch:'Unterrichtsfreier Tag',Português:'Dia não letivo'},
    'Día no lectivo.':{Galego:'Día non lectivo.',English:'Non-teaching day.',Français:'Jour non scolaire.',Polski:'Dzień wolny od zajęć.',Deutsch:'Unterrichtsfreier Tag.',Português:'Dia não letivo.'},
    'Tribeca Academia no abre este día.':{Galego:'Tribeca Academia non abre este día.',English:'Tribeca Academia is closed on this day.',Français:'Tribeca Academia est fermée ce jour-là.',Polski:'Tribeca Academia jest tego dnia zamknięta.',Deutsch:'Tribeca Academia ist an diesem Tag geschlossen.',Português:'A Tribeca Academia não abre neste dia.'},
    'Tribeca Academia no abre este día':{Galego:'Tribeca Academia non abre este día',English:'Tribeca Academia is closed on this day',Français:'Tribeca Academia est fermée ce jour-là',Polski:'Tribeca Academia jest tego dnia zamknięta',Deutsch:'Tribeca Academia ist an diesem Tag geschlossen',Português:'A Tribeca Academia não abre neste dia'},
    'Fecha relevante del calendario escolar.':{Galego:'Data relevante do calendario escolar.',English:'Relevant school calendar date.',Français:'Date importante du calendrier scolaire.',Polski:'Ważna data w kalendarzu szkolnym.',Deutsch:'Wichtiger Termin im Schulkalender.',Português:'Data relevante do calendário escolar.'},
    'Festivo local del centro educativo.':{Galego:'Festivo local do centro educativo.',English:'Local holiday for the school.',Français:'Jour férié local de l’établissement.',Polski:'Lokalne święto szkoły.',Deutsch:'Lokaler Feiertag der Schule.',Português:'Feriado local do centro educativo.'},
    'Período no lectivo.':{Galego:'Período non lectivo.',English:'Non-teaching period.',Français:'Période non scolaire.',Polski:'Okres bez zajęć.',Deutsch:'Unterrichtsfreie Zeit.',Português:'Período não letivo.'},
    'Período no lectivo propuesto.':{Galego:'Período non lectivo proposto.',English:'Proposed non-teaching period.',Français:'Période non scolaire proposée.',Polski:'Proponowany okres bez zajęć.',Deutsch:'Vorgeschlagene unterrichtsfreie Zeit.',Português:'Período não letivo proposto.'},
    'Inicio general de actividades lectivas en Galicia.':{Galego:'Inicio xeral das actividades lectivas en Galicia.',English:'General start of teaching activities in Galicia.',Français:'Début général des activités scolaires en Galice.',Polski:'Ogólny początek zajęć szkolnych w Galicji.',Deutsch:'Allgemeiner Beginn des Unterrichts in Galicien.',Português:'Início geral das atividades letivas na Galiza.'},
    'Finalización general de actividades lectivas en Galicia.':{Galego:'Finalización xeral das actividades lectivas en Galicia.',English:'General end of teaching activities in Galicia.',Français:'Fin générale des activités scolaires en Galice.',Polski:'Ogólne zakończenie zajęć szkolnych w Galicji.',Deutsch:'Allgemeines Ende des Unterrichts in Galicien.',Português:'Finalização geral das atividades letivas na Galiza.'},
    'Inicio de actividades lectivas 2025/26':{Galego:'Inicio das actividades lectivas 2025/26',English:'Start of teaching activities 2025/26',Français:'Début des activités scolaires 2025/26',Polski:'Początek zajęć szkolnych 2025/26',Deutsch:'Unterrichtsbeginn 2025/26',Português:'Início das atividades letivas 2025/26'},
    'Fin de actividades lectivas 2025/26':{Galego:'Fin das actividades lectivas 2025/26',English:'End of teaching activities 2025/26',Français:'Fin des activités scolaires 2025/26',Polski:'Koniec zajęć szkolnych 2025/26',Deutsch:'Unterrichtsende 2025/26',Português:'Fim das atividades letivas 2025/26'},
    'Inicio de actividades lectivas 2026/27':{Galego:'Inicio das actividades lectivas 2026/27',English:'Start of teaching activities 2026/27',Français:'Début des activités scolaires 2026/27',Polski:'Początek zajęć szkolnych 2026/27',Deutsch:'Unterrichtsbeginn 2026/27',Português:'Início das atividades letivas 2026/27'},
    'Fin de actividades lectivas 2026/27':{Galego:'Fin das actividades lectivas 2026/27',English:'End of teaching activities 2026/27',Français:'Fin des activités scolaires 2026/27',Polski:'Koniec zajęć szkolnych 2026/27',Deutsch:'Unterrichtsende 2026/27',Português:'Fim das atividades letivas 2026/27'},
    'Año Nuevo':{Galego:'Aninovo',English:'New Year’s Day',Français:'Jour de l’An',Polski:'Nowy Rok',Deutsch:'Neujahr',Português:'Ano Novo'},
    'Epifanía del Señor, Reyes':{Galego:'Epifanía do Señor, Reis',English:'Epiphany',Français:'Épiphanie',Polski:'Święto Trzech Króli',Deutsch:'Heilige Drei Könige',Português:'Epifania do Senhor, Reis'},
    'San José':{Galego:'San Xosé',English:'Saint Joseph’s Day',Français:'Saint Joseph',Polski:'Świętego Józefa',Deutsch:'Josefstag',Português:'São José'},
    'Jueves Santo':{Galego:'Xoves Santo',English:'Maundy Thursday',Français:'Jeudi saint',Polski:'Wielki Czwartek',Deutsch:'Gründonnerstag',Português:'Quinta-feira Santa'},
    'Viernes Santo':{Galego:'Venres Santo',English:'Good Friday',Français:'Vendredi saint',Polski:'Wielki Piątek',Deutsch:'Karfreitag',Português:'Sexta-feira Santa'},
    'Fiesta del Trabajo':{Galego:'Festa do Traballo',English:'Labour Day',Français:'Fête du Travail',Polski:'Święto Pracy',Deutsch:'Tag der Arbeit',Português:'Festa do Trabalho'},
    'San Juan':{Galego:'San Xoán',English:'Saint John’s Day',Français:'Saint Jean',Polski:'Świętego Jana',Deutsch:'Johannistag',Português:'São João'},
    'Día Nacional de Galicia':{Galego:'Día Nacional de Galicia',English:'Galicia National Day',Français:'Fête nationale de la Galice',Polski:'Narodowy Dzień Galicji',Deutsch:'Nationalfeiertag Galiciens',Português:'Dia Nacional da Galiza'},
    'Asunción de la Virgen':{Galego:'Asunción da Virxe',English:'Assumption of Mary',Français:'Assomption',Polski:'Wniebowzięcie Najświętszej Maryi Panny',Deutsch:'Mariä Himmelfahrt',Português:'Assunção da Virgem'},
    'Fiesta Nacional de España':{Galego:'Festa Nacional de España',English:'National Day of Spain',Français:'Fête nationale de l’Espagne',Polski:'Święto Narodowe Hiszpanii',Deutsch:'Spanischer Nationalfeiertag',Português:'Festa Nacional de Espanha'},
    'Inmaculada Concepción':{Galego:'Inmaculada Concepción',English:'Immaculate Conception',Français:'Immaculée Conception',Polski:'Niepokalane Poczęcie',Deutsch:'Unbefleckte Empfängnis',Português:'Imaculada Conceição'},
    'Natividad del Señor':{Galego:'Natividade do Señor',English:'Christmas Day',Français:'Nativité du Seigneur',Polski:'Boże Narodzenie',Deutsch:'Weihnachten',Português:'Natividade do Senhor'},
    'Vacaciones de Navidad, inicio':{Galego:'Vacacións de Nadal, inicio',English:'Christmas holidays, start',Français:'Vacances de Noël, début',Polski:'Ferie świąteczne, początek',Deutsch:'Weihnachtsferien, Beginn',Português:'Férias de Natal, início'},
    'Vacaciones de Navidad, fin':{Galego:'Vacacións de Nadal, fin',English:'Christmas holidays, end',Français:'Vacances de Noël, fin',Polski:'Ferie świąteczne, koniec',Deutsch:'Weihnachtsferien, Ende',Português:'Férias de Natal, fim'},
    'Entroido/Carnaval, inicio':{Galego:'Entroido/Carnaval, inicio',English:'Carnival, start',Français:'Carnaval, début',Polski:'Karnawał, początek',Deutsch:'Karneval, Beginn',Português:'Entrudo/Carnaval, início'},
    'Entroido/Carnaval, fin':{Galego:'Entroido/Carnaval, fin',English:'Carnival, end',Français:'Carnaval, fin',Polski:'Karnawał, koniec',Deutsch:'Karneval, Ende',Português:'Entrudo/Carnaval, fim'},
    'Semana Santa, inicio':{Galego:'Semana Santa, inicio',English:'Holy Week, start',Français:'Semaine sainte, début',Polski:'Wielki Tydzień, początek',Deutsch:'Karwoche, Beginn',Português:'Semana Santa, início'},
    'Semana Santa, fin':{Galego:'Semana Santa, fin',English:'Holy Week, end',Français:'Semaine sainte, fin',Polski:'Wielki Tydzień, koniec',Deutsch:'Karwoche, Ende',Português:'Semana Santa, fim'},
    'Lunes de Pascua, Cee':{Galego:'Luns de Pascua, Cee',English:'Easter Monday, Cee',Français:'Lundi de Pâques, Cee',Polski:'Poniedziałek Wielkanocny, Cee',Deutsch:'Ostermontag, Cee',Português:'Segunda-feira de Páscoa, Cee'},
    'San Adrián, Cee':{Galego:'San Adrián, Cee',English:'Saint Adrian, Cee',Français:'Saint Adrien, Cee',Polski:'Święty Adrian, Cee',Deutsch:'Sankt Adrian, Cee',Português:'São Adrião, Cee'},
    'San Pedro, Corcubión':{Galego:'San Pedro, Corcubión',English:'Saint Peter, Corcubión',Français:'Saint Pierre, Corcubión',Polski:'Święty Piotr, Corcubión',Deutsch:'Sankt Peter, Corcubión',Português:'São Pedro, Corcubión'},
    'Fiesta del Carmen, Corcubión':{Galego:'Festa do Carme, Corcubión',English:'Our Lady of Carmen, Corcubión',Français:'Fête du Carmen, Corcubión',Polski:'Święto Carmen, Corcubión',Deutsch:'Fest der Virgen del Carmen, Corcubión',Português:'Festa do Carmo, Corcubión'},
    'Fiesta local de Fisterra':{Galego:'Festa local de Fisterra',English:'Local holiday in Fisterra',Français:'Fête locale de Fisterra',Polski:'Lokalne święto Fisterry',Deutsch:'Lokaler Feiertag in Fisterra',Português:'Festa local de Fisterra'},
    'Detrás de Tribeca':{Galego:'Detrás de Tribeca',English:'Behind Tribeca',Français:'Derrière Tribeca',Polski:'Za Tribecą',Deutsch:'Hinter Tribeca',Português:'Por trás da Tribeca'},
    'Patricia Trillo, una mirada pedagógica, creativa e innovadora':{Galego:'Patricia Trillo, unha mirada pedagóxica, creativa e innovadora',English:'Patricia Trillo, a creative and innovative pedagogical outlook',Français:'Patricia Trillo, un regard pédagogique, créatif et innovant',Polski:'Patricia Trillo, pedagogiczne, kreatywne i innowacyjne spojrzenie',Deutsch:'Patricia Trillo, ein pädagogischer, kreativer und innovativer Blick',Português:'Patricia Trillo, um olhar pedagógico, criativo e inovador'},
    'Tribeca Academia nace del impulso profesional de Patricia Trillo, pedagoga y fundadora del proyecto. Con quince años de experiencia en enseñanza, refuerzo educativo y acompañamiento académico, Patricia ha trabajado con alumnado de distintas edades, etapas y perfiles, siempre desde una premisa clara: cada persona aprende de una forma singular y necesita una respuesta educativa ajustada, humana y rigurosa.':{Galego:'Tribeca Academia nace do impulso profesional de Patricia Trillo, pedagoga e fundadora do proxecto. Con quince anos de experiencia en ensino, reforzo educativo e acompañamento académico, Patricia traballou con alumnado de distintas idades, etapas e perfís, sempre desde unha premisa clara: cada persoa aprende dunha maneira singular e precisa unha resposta educativa axustada, humana e rigorosa.',English:'Tribeca Academia grew from the professional drive of Patricia Trillo, pedagogue and founder of the project. With fifteen years of experience in teaching, educational support and academic guidance, Patricia has worked with learners of different ages, stages and profiles, always from one clear premise: each person learns in a singular way and needs an educational response that is precise, humane and rigorous.',Français:'Tribeca Academia naît de l’élan professionnel de Patricia Trillo, pédagogue et fondatrice du projet. Forte de quinze ans d’expérience dans l’enseignement, le soutien éducatif et l’accompagnement scolaire, Patricia a travaillé avec des élèves d’âges, de niveaux et de profils différents, toujours à partir d’une idée claire : chaque personne apprend d’une manière singulière et a besoin d’une réponse éducative ajustée, humaine et rigoureuse.',Polski:'Tribeca Academia powstała z zawodowej inicjatywy Patricii Trillo, pedagoga i założycielki projektu. Mając piętnaście lat doświadczenia w nauczaniu, wsparciu edukacyjnym i towarzyszeniu w nauce, Patricia pracowała z uczniami w różnym wieku, na różnych etapach i o różnych profilach, wychodząc z jasnego założenia: każda osoba uczy się w sposób szczególny i potrzebuje odpowiedzi edukacyjnej dopasowanej, ludzkiej i rzetelnej.',Deutsch:'Tribeca Academia entstand aus dem beruflichen Antrieb von Patricia Trillo, Pädagogin und Gründerin des Projekts. Mit fünfzehn Jahren Erfahrung in Unterricht, Bildungsförderung und schulischer Begleitung hat Patricia mit Lernenden unterschiedlichen Alters, verschiedener Stufen und Profile gearbeitet, stets ausgehend von einer klaren Prämisse: Jeder Mensch lernt auf eigene Weise und braucht eine passgenaue, menschliche und sorgfältige pädagogische Antwort.',Português:'A Tribeca Academia nasce do impulso profissional de Patricia Trillo, pedagoga e fundadora do projeto. Com quinze anos de experiência em ensino, reforço educativo e acompanhamento académico, Patricia trabalhou com alumnado de diferentes idades, etapas e perfis, sempre a partir de uma premissa clara: cada pessoa aprende de forma singular e precisa de uma resposta educativa ajustada, humana e rigorosa.'},
    'El proyecto comenzó cuando, con veintiún años, fundó Tribeca Academia para ofrecer apoyo educativo a alumnado de Primaria y ESO. Desde entonces, la academia ha crecido hasta convertirse en un espacio de aprendizaje cercano, exigente y creativo, orientado a acompañar trayectorias académicas diversas y a transformar las dificultades en oportunidades reales de mejora.':{Galego:'O proxecto comezou cando, con vinte e un anos, fundou Tribeca Academia para ofrecer apoio educativo a alumnado de Primaria e ESO. Desde entón, a academia medrou ata converterse nun espazo de aprendizaxe próximo, esixente e creativo, orientado a acompañar traxectorias académicas diversas e a transformar as dificultades en oportunidades reais de mellora.',English:'The project began when, at the age of twenty-one, she founded Tribeca Academia to provide educational support for Primary and Secondary students. Since then, the academy has grown into a close, demanding and creative learning space, focused on accompanying diverse academic journeys and transforming difficulties into real opportunities for improvement.',Français:'Le projet a commencé lorsqu’à vingt et un ans, elle a fondé Tribeca Academia pour offrir un soutien éducatif aux élèves du primaire et du secondaire. Depuis, l’académie est devenue un espace d’apprentissage proche, exigeant et créatif, destiné à accompagner des parcours scolaires divers et à transformer les difficultés en véritables occasions de progrès.',Polski:'Projekt rozpoczął się, gdy w wieku dwudziestu jeden lat założyła Tribeca Academia, aby oferować wsparcie edukacyjne uczniom szkoły podstawowej i średniej. Od tego czasu akademia rozwinęła się w bliską, wymagającą i kreatywną przestrzeń nauki, której celem jest towarzyszenie różnym ścieżkom edukacyjnym i przekształcanie trudności w realne możliwości rozwoju.',Deutsch:'Das Projekt begann, als sie mit einundzwanzig Jahren Tribeca Academia gründete, um Schülerinnen und Schülern der Primar- und Sekundarstufe Bildungsunterstützung anzubieten. Seitdem ist die Akademie zu einem nahbaren, anspruchsvollen und kreativen Lernraum gewachsen, der vielfältige Bildungswege begleitet und Schwierigkeiten in echte Verbesserungsmöglichkeiten verwandelt.',Português:'O projeto começou quando, aos vinte e um anos, fundou a Tribeca Academia para oferecer apoio educativo ao alumnado de Primária e ESO. Desde então, a academia cresceu até se tornar um espaço de aprendizagem próximo, exigente e criativo, orientado para acompanhar trajetórias académicas diversas e transformar dificuldades em oportunidades reais de melhoria.'},
    'Su forma de entender la educación combina experiencia, curiosidad e innovación pedagógica. Esa búsqueda constante de mejora sostiene la identidad del proyecto: enseñar con rigor, acompañar con sensibilidad y crear soluciones educativas que tengan sentido para el alumnado de hoy.':{Galego:'A súa forma de entender a educación combina experiencia, curiosidade e innovación pedagóxica. Esa procura constante de mellora sostén a identidade do proxecto: ensinar con rigor, acompañar con sensibilidade e crear solucións educativas con sentido para o alumnado de hoxe.',English:'Her way of understanding education combines experience, curiosity and pedagogical innovation. This constant search for improvement sustains the identity of the project: teaching with rigour, accompanying with sensitivity and creating educational solutions that make sense for today’s learners.',Français:'Sa manière de comprendre l’éducation combine expérience, curiosité et innovation pédagogique. Cette recherche constante d’amélioration fonde l’identité du projet : enseigner avec rigueur, accompagner avec sensibilité et créer des solutions éducatives qui aient du sens pour les élèves d’aujourd’hui.',Polski:'Jej sposób rozumienia edukacji łączy doświadczenie, ciekawość i innowację pedagogiczną. To ciągłe dążenie do poprawy stanowi podstawę tożsamości projektu: uczyć rzetelnie, towarzyszyć z wrażliwością i tworzyć rozwiązania edukacyjne, które mają sens dla dzisiejszych uczniów.',Deutsch:'Ihr Bildungsverständnis verbindet Erfahrung, Neugier und pädagogische Innovation. Diese ständige Suche nach Verbesserung trägt die Identität des Projekts: sorgfältig unterrichten, sensibel begleiten und pädagogische Lösungen schaffen, die für die Lernenden von heute sinnvoll sind.',Português:'A sua forma de entender a educação combina experiência, curiosidade e inovação pedagógica. Essa procura constante de melhoria sustenta a identidade do projeto: ensinar com rigor, acompanhar com sensibilidade e criar soluções educativas que façam sentido para o alumnado de hoje.'},
    'Acceso seguro':{Galego:'Acceso seguro',English:'Secure access',Français:'Accès sécurisé',Polski:'Bezpieczny dostęp',Deutsch:'Sicherer Zugang',Português:'Acesso seguro'},
    'Acceso a Tribeca Aula':{Galego:'Acceso a Tribeca Aula',English:'Access to Tribeca Aula',Français:'Accès à Tribeca Aula',Polski:'Dostęp do Tribeca Aula',Deutsch:'Zugang zu Tribeca Aula',Português:'Acesso à Tribeca Aula'},
    'Introduce tu nombre de usuario y contraseña.':{Galego:'Introduce o teu nome de usuario e contrasinal.',English:'Enter your username and password.',Français:'Saisis ton nom d’utilisateur et ton mot de passe.',Polski:'Wpisz nazwę użytkownika i hasło.',Deutsch:'Gib deinen Benutzernamen und dein Passwort ein.',Português:'Introduz o teu nome de utilizador e palavra-passe.'},
    'Usuario':{Galego:'Usuario',English:'Username',Français:'Utilisateur',Polski:'Użytkownik',Deutsch:'Benutzername',Português:'Utilizador'},
    'Contraseña':{Galego:'Contrasinal',English:'Password',Français:'Mot de passe',Polski:'Hasło',Deutsch:'Passwort',Português:'Palavra-passe'},
    'Entrar':{Galego:'Entrar',English:'Log in',Français:'Entrer',Polski:'Zaloguj',Deutsch:'Anmelden',Português:'Entrar'},
    'No recuerdo mi contraseña':{Galego:'Non lembro o meu contrasinal',English:'I do not remember my password',Français:'Je ne me souviens pas de mon mot de passe',Polski:'Nie pamiętam hasła',Deutsch:'Ich habe mein Passwort vergessen',Português:'Não me lembro da minha palavra-passe'},
    'Recuperar contraseña':{Galego:'Recuperar contrasinal',English:'Recover password',Français:'Récupérer le mot de passe',Polski:'Odzyskaj hasło',Deutsch:'Passwort wiederherstellen',Português:'Recuperar palavra-passe'},
    'La profesora recibirá la solicitud y restablecerá la contraseña manualmente.':{Galego:'A profesora recibirá a solicitude e restablecerá o contrasinal manualmente.',English:'The teacher will receive the request and reset the password manually.',Français:'L’enseignante recevra la demande et réinitialisera le mot de passe manuellement.',Polski:'Nauczycielka otrzyma prośbę i ręcznie zresetuje hasło.',Deutsch:'Die Lehrerin erhält die Anfrage und setzt das Passwort manuell zurück.',Português:'A professora receberá o pedido e reporá a palavra-passe manualmente.'},
    'Nombre y apellidos':{Galego:'Nome e apelidos',English:'Full name',Français:'Nom et prénom',Polski:'Imię i nazwisko',Deutsch:'Vor- und Nachname',Português:'Nome e apelidos'},
    'Solicitar recuperación':{Galego:'Solicitar recuperación',English:'Request recovery',Français:'Demander la récupération',Polski:'Poproś o odzyskanie',Deutsch:'Wiederherstellung beantragen',Português:'Solicitar recuperação'},
    'Volver al inicio de sesión':{Galego:'Volver ao inicio de sesión',English:'Return to login',Français:'Revenir à la connexion',Polski:'Wróć do logowania',Deutsch:'Zur Anmeldung zurück',Português:'Voltar ao início de sessão'},
    'Sesión iniciada.':{Galego:'Sesión iniciada.',English:'Session started.',Français:'Session ouverte.',Polski:'Sesja rozpoczęta.',Deutsch:'Sitzung gestartet.',Português:'Sessão iniciada.'},
    'Nombre de usuario o contraseña incorrectos.':{Galego:'Nome de usuario ou contrasinal incorrectos.',English:'Incorrect username or password.',Français:'Nom d’utilisateur ou mot de passe incorrect.',Polski:'Nieprawidłowa nazwa użytkownika lub hasło.',Deutsch:'Benutzername oder Passwort falsch.',Português:'Nome de utilizador ou palavra-passe incorretos.'},
    'Supabase aún no está configurado. Revisa supabase-config.js.':{Galego:'Supabase aínda non está configurado. Revisa supabase-config.js.',English:'Supabase is not configured yet. Check supabase-config.js.',Français:'Supabase n’est pas encore configuré. Vérifie supabase-config.js.',Polski:'Supabase nie jest jeszcze skonfigurowany. Sprawdź supabase-config.js.',Deutsch:'Supabase ist noch nicht konfiguriert. Prüfe supabase-config.js.',Português:'O Supabase ainda não está configurado. Revê supabase-config.js.'}
  };

  Object.assign(EXTRA_TRANSLATIONS, {
    'Perfil del alumnado':{Galego:'Perfil do alumnado',English:'Student profile',Français:'Profil de l’élève',Polski:'Profil ucznia',Deutsch:'Schülerprofil',Português:'Perfil do aluno'},
    'Datos familiares y personales':{Galego:'Datos familiares e persoais',English:'Family and personal details',Français:'Données familiales et personnelles',Polski:'Dane rodzinne i osobiste',Deutsch:'Familiäre und persönliche Daten',Português:'Dados familiares e pessoais'},
    'Nombre y apellidos del padre / tutor 1':{Galego:'Nome e apelidos do pai / titor 1',English:'Father / guardian 1 full name',Français:'Nom complet du père / tuteur 1',Polski:'Imię i nazwisko ojca / opiekuna 1',Deutsch:'Vollständiger Name Vater / Vormund 1',Português:'Nome completo do pai / tutor 1'},
    'Nombre y apellidos de la madre / tutora 2':{Galego:'Nome e apelidos da nai / titora 2',English:'Mother / guardian 2 full name',Français:'Nom complet de la mère / tutrice 2',Polski:'Imię i nazwisko matki / opiekuna 2',Deutsch:'Vollständiger Name Mutter / Vormund 2',Português:'Nome completo da mãe / tutora 2'},
    'Dirección':{Galego:'Enderezo',English:'Address',Français:'Adresse',Polski:'Adres',Deutsch:'Adresse',Português:'Morada'},
    'Fecha de nacimiento':{Galego:'Data de nacemento',English:'Date of birth',Français:'Date de naissance',Polski:'Data urodzenia',Deutsch:'Geburtsdatum',Português:'Data de nascimento'},
    'Foto del alumno (URL)':{Galego:'Foto do alumno (URL)',English:'Student photo (URL)',Français:'Photo de l’élève (URL)',Polski:'Zdjęcie ucznia (URL)',Deutsch:'Foto des Schülers (URL)',Português:'Fotografia do aluno (URL)'},
    'Cumpleaños de hoy':{Galego:'Aniversarios de hoxe',English:'Today’s birthdays',Français:'Anniversaires du jour',Polski:'Dzisiejsze urodziny',Deutsch:'Geburtstage heute',Português:'Aniversários de hoje'},
    'Ver perfil':{Galego:'Ver perfil',English:'View profile',Français:'Voir le profil',Polski:'Zobacz profil',Deutsch:'Profil ansehen',Português:'Ver perfil'},
    'Privado':{Galego:'Privado',English:'Private',Français:'Privé',Polski:'Prywatne',Deutsch:'Privat',Português:'Privado'}
  });
  Object.assign(BASE_TRANSLATIONS, EXTRA_TRANSLATIONS);
  const LANG_META = {
    es:{label:'Castellano', html:'es'}, gl:{label:'Galego', html:'gl'}, en:{label:'English', html:'en'}, fr:{label:'Français', html:'fr'}, pl:{label:'Polski', html:'pl'}, de:{label:'Deutsch', html:'de'}, pt:{label:'Português', html:'pt'}
  };
  const LABEL_TO_CODE = Object.fromEntries(Object.entries(LANG_META).map(([code,meta]) => [meta.label, code]));
  const textSource = new WeakMap();
  let translationLookup = null;
  const normalizeI18n = value => String(value ?? '').replace(/\s+/g,' ').trim();
  function buildTranslationLookup(){
    if(translationLookup) return translationLookup;
    translationLookup = new Map();
    Object.entries(BASE_TRANSLATIONS).forEach(([source,row]) => {
      const pack = {Castellano:source, ...(row||{})};
      Object.values(pack).forEach(value => { const key=normalizeI18n(value); if(key && !translationLookup.has(key)) translationLookup.set(key, {source, row}); });
    });
    return translationLookup;
  }
  function currentLangCode(){
    const sel = document.querySelector('#languageSelect');
    const value = localStorage.getItem('tribeca-language') || sel?.value || (roleTeacher()?'es':'gl');
    if(LANG_META[value]) return value;
    const label = sel?.selectedOptions?.[0]?.textContent?.trim() || value;
    return LABEL_TO_CODE[label] || (roleTeacher()?'es':'gl');
  }
  function currentLang(){ return LANG_META[currentLangCode()]?.label || 'Galego'; }
  function translateText(value, targetLabel=currentLang()){
    const raw = String(value ?? '');
    const trimmed = normalizeI18n(raw);
    if(!trimmed) return raw;
    if(targetLabel === 'Castellano') return raw;
    const found = buildTranslationLookup().get(trimmed);
    if(found?.row?.[targetLabel]) return raw.replace(raw.trim(), found.row[targetLabel]);
    let m;
    if((m = trimmed.match(/^(\d+) publicaciones · (\d+) unidades$/))){
      const pub = targetLabel==='Galego'?'publicacións':targetLabel==='English'?'posts':targetLabel==='Français'?'publications':targetLabel==='Polski'?'publikacje':targetLabel==='Deutsch'?'Veröffentlichungen':'publicações';
      const uni = targetLabel==='Galego'?'unidades':targetLabel==='English'?'units':targetLabel==='Français'?'unités':targetLabel==='Polski'?'działy':targetLabel==='Deutsch'?'Einheiten':'unidades';
      return `${m[1]} ${pub} · ${m[2]} ${uni}`;
    }
    if((m = trimmed.match(/^(\d+)\/(\d+) publicaciones hechas\.$/))){
      const txt = targetLabel==='Galego'?'publicacións feitas.':targetLabel==='English'?'posts completed.':targetLabel==='Français'?'publications terminées.':targetLabel==='Polski'?'publikacje wykonane.':targetLabel==='Deutsch'?'Veröffentlichungen erledigt.':'publicações feitas.';
      return `${m[1]}/${m[2]} ${txt}`;
    }
    if((m = trimmed.match(/^(\d+) perfiles$/))){
      return `${m[1]} ${targetLabel==='Galego'?'perfís':targetLabel==='English'?'profiles':targetLabel==='Français'?'profils':targetLabel==='Polski'?'profile':targetLabel==='Deutsch'?'Profile':'perfis'}`;
    }
    if((m = trimmed.match(/^(\d+) insignias asignadas$/))){
      return `${m[1]} ${targetLabel==='Galego'?'insignias asignadas':targetLabel==='English'?'badges assigned':targetLabel==='Français'?'badges attribués':targetLabel==='Polski'?'przyznane odznaki':targetLabel==='Deutsch'?'vergebene Abzeichen':'insígnias atribuídas'}`;
    }
    if((m = trimmed.match(/^(\d+) solicitudes de contraseña$/))){
      return `${m[1]} ${targetLabel==='Galego'?'solicitudes de contrasinal':targetLabel==='English'?'password requests':targetLabel==='Français'?'demandes de mot de passe':targetLabel==='Polski'?'prośby o hasło':targetLabel==='Deutsch'?'Passwortanfragen':'pedidos de palavra-passe'}`;
    }
    if((m = trimmed.match(/^(\d+) alertas$/))){
      return `${m[1]} ${targetLabel==='Galego'?'alertas':targetLabel==='English'?'alerts':targetLabel==='Français'?'alertes':targetLabel==='Polski'?'alerty':targetLabel==='Deutsch'?'Hinweise':'alertas'}`;
    }
    return raw;
  }
  function ensureLanguageDefault(){
    const sel = document.querySelector('#languageSelect');
    const saved = localStorage.getItem('tribeca-language');
    const manual = localStorage.getItem('tribeca-language-user-set') === '1';
    const fallbackLang = roleTeacher() ? 'es' : 'gl';
    const next = manual && saved && LANG_META[saved] ? saved : fallbackLang;
    if(!manual || !saved || !LANG_META[saved]) localStorage.setItem('tribeca-language', next);
    if(sel && sel.value !== next) sel.value = next;
    document.documentElement.lang = LANG_META[next]?.html || (roleTeacher()?'es':'gl');
  }
  function applyTranslations(root=document){
    const targetLabel = currentLang();
    const targetCode = currentLangCode();
    const i18n = window.I18N || {};
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = i18n[targetCode]?.[key] || i18n.gl?.[key] || i18n.es?.[key];
      if(val) el.textContent = val;
    });
    const container = root.body || root;
    const rejectTags = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA']);
    const walker=document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {acceptNode:n=>{
      if(!n.parentElement || rejectTags.has(n.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
      const current = normalizeI18n(n.nodeValue || '');
      if(!current || current.length>650) return NodeFilter.FILTER_REJECT;
      if(!textSource.has(n)) textSource.set(n, n.nodeValue.trim());
      const source = normalizeI18n(textSource.get(n) || n.nodeValue);
      if(buildTranslationLookup().has(source) || buildTranslationLookup().has(current) || /^(\d+) publicaciones · (\d+) unidades$/.test(current) || /^(\d+)\/(\d+) publicaciones hechas\.$/.test(current) || /^(\d+) (perfiles|insignias asignadas|solicitudes de contraseña|alertas)$/.test(current)) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_REJECT;
    }});
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n=>{
      const source = textSource.get(n) || n.nodeValue;
      const translated = translateText(source, targetLabel);
      if(translated !== source) n.nodeValue = n.nodeValue.replace(n.nodeValue.trim(), translated.trim());
      else {
        const translatedCurrent = translateText(n.nodeValue, targetLabel);
        if(translatedCurrent !== n.nodeValue) n.nodeValue = translatedCurrent;
      }
    });
    container.querySelectorAll?.('[placeholder],[title],[aria-label],[alt]').forEach(el => ['placeholder','title','aria-label','alt'].forEach(attr=>{
      if(el.hasAttribute(attr)){
        const originalAttr = `data-i18n-original-${attr.replace(/[^a-z]/g,'')}`;
        if(!el.hasAttribute(originalAttr)) el.setAttribute(originalAttr, el.getAttribute(attr) || '');
        const translated = translateText(el.getAttribute(originalAttr), targetLabel);
        if(translated) el.setAttribute(attr, translated);
      }
    }));
    document.documentElement.lang = LANG_META[targetCode]?.html || 'gl';
  }
  async function boot() {
    ensureLanguageDefault();
    registerTribecaPwa();
    bindTribecaServiceWorkerMessages();
    applyAccessibilitySettings();
    setTimeout(()=>{ ensureAccessibilityWidget(); updatePwaInstallCta(); }, 0);
    bindTribecaThemeControls();
    syncTribecaStandaloneClass();
    State.client = configured && window.supabase?.createClient ? window.supabase.createClient(cfg.url, cfg.anonKey, { auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true} }) : null;
    bindGlobal(); wireManagedForms(); new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>{ if(n.nodeType===1){ wireManagedForms(n); applyTranslations(n); applySeasonalLogos(n); bindTribecaThemeControls(); syncTribecaStandaloneClass(); syncFocusModeClass(); } }))).observe(document.body,{childList:true,subtree:true}); applySeasonalLogos(document); syncFocusModeClass();
    if(!window.__tribecaHistoryBound){
      window.__tribecaHistoryBound=true;
      window.addEventListener('popstate', ev=>{
        if(!State.profile) return;
        const st=ev.state?.tribeca ? ev.state : {tribeca:true, ...tribecaStateFromUrl()};
        State.historyNavigating=true;
        try{
          if(!st?.id || st.id==='home') showHomePage();
          else renderInlineSection(st.id, st.opts||{});
        } finally {
          setTimeout(()=>{ State.historyNavigating=false; }, 0);
        }
      });
    }
    if(!State.client){ showLogin(); applySeasonalLogos(document); return; }
    try { await hydrate(true); ensureLanguageDefault(); } catch(e) { console.warn(e); }
    if(State.user && State.profile){
      hideLogin();
      const initial=tribecaStateFromUrl();
      ensureTribecaHistoryState(initial.id||'home', initial.opts||{});
      if(initial.id && initial.id!=='home') renderInlineSection(initial.id, initial.opts||{});
      else renderApp();
      applySeasonalLogos(document);
      handleInitialOpenRequest();
      deferTribecaBackgroundTask(() => tribecaAutoRegisterPushIfPermissionGranted(), 900);
      deferTribecaBackgroundTask(() => refreshTribecaPushSubscriptionIfEnabled({ force: (typeof Notification !== 'undefined' && Notification.permission === 'granted') }), 1600);
      deferTribecaBackgroundTask(() => syncTribecaAppBadge(), 1900);
    } else { showLogin(); applySeasonalLogos(document); }
    setInterval(async()=>{ if(!State.profile) return; await updatePresence(); updateBadges(); }, 45000);
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
