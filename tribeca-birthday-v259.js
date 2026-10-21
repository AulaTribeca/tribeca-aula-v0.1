/* Tribeca Aula · cumpleaños v259.
   Animación no intrusiva: solo el alumno autenticado, una vez por entrada,
   sin audio, sin escrituras ni consultas sobre otros alumnos. */
(function () {
  'use strict';
  var activeKey = null;
  var removalTimer = null;
  var iconSet = ['🎂','🥳','🎉','🎊','🎈','✨','🎁','🎂','🎉','🥳','🎀'];
  var translations = {
    gl: ['HOXE É O TEU DÍA', 'Parabéns', 'En Tribeca tamén o celebramos contigo.', 'Pechar felicitación'],
    es: ['HOY ES TU DÍA', 'Feliz cumpleaños', 'En Tribeca también lo celebramos contigo.', 'Cerrar felicitación'],
    en: ['TODAY IS YOUR DAY', 'Happy birthday', 'We are celebrating with you at Tribeca.', 'Close greeting'],
    fr: ["C’EST TON JOUR", 'Joyeux anniversaire', 'Chez Tribeca, nous fêtons aussi avec toi.', 'Fermer'],
    pt: ['HOJE É O TEU DIA', 'Feliz aniversário', 'Na Tribeca, também celebramos contigo.', 'Fechar'],
    de: ['HEUTE IST DEIN TAG', 'Alles Gute zum Geburtstag', 'Wir feiern bei Tribeca mit dir.', 'Schließen'],
    pl: ['DZIŚ JEST TWÓJ DZIEŃ', 'Wszystkiego najlepszego', 'W Tribeca świętujemy razem z Tobą.', 'Zamknij']
  };
  function madridDate(date) {
    var parts = new Intl.DateTimeFormat('en-GB',{
      timeZone:'Europe/Madrid', year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(date || new Date());
    var values = {};
    parts.forEach(function (p) { values[p.type]=p.value; });
    return {month:Number(values.month),day:Number(values.day),key:values.year+'-'+values.month+'-'+values.day};
  }
  function birthdayParts(profile) {
    if (!profile || typeof profile!=='object') return null;
    var raw = String(profile.birth_date || profile.date_of_birth || '').trim();
    var match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T| )/.exec(raw);
    if (match) {
      var year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
      var valid = new Date(Date.UTC(year,month-1,day));
      if(valid.getUTCFullYear()===year && valid.getUTCMonth()+1===month && valid.getUTCDate()===day)
        return {month:month,day:day};
    }
    var prefs = profile.ui_preferences;
    if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) return null;
    match = /^(\d{2})-(\d{2})$/.exec(String(prefs.birthday_md || '').trim());
    var m=match?Number(match[1]):Number(prefs.birthday && prefs.birthday.month);
    var d=match?Number(match[2]):Number(prefs.birthday && prefs.birthday.day);
    var validFallback = new Date(Date.UTC(2024,m-1,d));
    return (m>=1 && m<=12 && d>=1 && validFallback.getUTCMonth()+1===m &&
      validFallback.getUTCDate()===d) ? {month:m,day:d} : null;
  }
  function isBirthday(profile,now) {
    var b=birthdayParts(profile), today=madridDate(now);
    return !!b && b.month===today.month && b.day===today.day;
  }
  function firstName(profile) {
    var s=String(profile.preferred_name || profile.first_name ||
      profile.full_name || '').trim().split(/\s+/)[0];
    return s.slice(0,34);
  }
  function remove() {
    if(removalTimer) { clearTimeout(removalTimer); removalTimer=null; }
    var current=document.getElementById('tribeca-birthday-v259');
    if(current) current.remove();
  }
  function reduced() {
    return document.body.classList.contains('is-focus-mode') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function element(tag,className,text) {
    var node=document.createElement(tag);
    if(className) node.className=className;
    if(text!==undefined) node.textContent=text;
    return node;
  }
  function celebration(profile) {
    remove();
    var lang=String(document.getElementById('languageSelect')?.value ||
      document.documentElement.lang || 'es').slice(0,2).toLowerCase();
    var words=translations[lang] || translations.es;
    var container=element('section','tribeca-birthday-v259');
    container.id='tribeca-birthday-v259';
    container.setAttribute('aria-label',words[1]);
    var fx=element('div','tribeca-birthday-effects-v259');
    fx.setAttribute('aria-hidden','true');
    container.appendChild(fx);

    var card=element('div','tribeca-birthday-card-v259');
    card.setAttribute('role','status');
    card.setAttribute('aria-live','polite');
    var mark=element('div','tribeca-birthday-cake-v259','🎂');
    mark.setAttribute('aria-hidden','true');
    var eyebrow=element('p','tribeca-birthday-eyebrow-v259',words[0]);
    var name=firstName(profile);
    var heading=element('h2','tribeca-birthday-title-v259',
      words[1]+(name?', '+name:'')+'!');
    var copy=element('p','tribeca-birthday-subtitle-v259',words[2]);
    var close=element('button','tribeca-birthday-close-v259','×');
    close.type='button';
    close.setAttribute('aria-label',words[3]);
    close.addEventListener('click',remove);
    card.appendChild(close);
    card.appendChild(mark);
    card.appendChild(eyebrow);
    card.appendChild(heading);
    card.appendChild(copy);
    container.appendChild(card);
    if (!reduced()) {
      for(var i=0;i<52;i++) {
        var emoji=i<30;
        var particle=element('span','tribeca-birthday-particle-v259 '+(emoji?'is-emoji':'is-confetti'),
          emoji ? iconSet[i%iconSet.length] : '');
        particle.style.setProperty('--x',((i*59+13)%101)+'%');
        particle.style.setProperty('--drift',(((i*37)%190)-95)+'px');
        particle.style.setProperty('--turn',((i*113)%600-300)+'deg');
        particle.style.setProperty('--delay',(((i*17)%24)/10)+'s');
        particle.style.setProperty('--duration',(3.0+((i*7)%15)/10)+'s');
        particle.style.setProperty('--size',(emoji?(18+(i%5)*5):(7+i%3*2))+'px');
        if(!emoji) particle.style.setProperty('--chip', ['#A8872D','#103F24','#6B9479','#D5B75B','#8D6BAA'][i%5]);
        fx.appendChild(particle);
      }
    }
    document.body.appendChild(container);
    removalTimer=setTimeout(remove,6200);
  }
  function onProfile(profile,options) {
    options=options||{};
    if (!profile || !profile.id) {
      activeKey=null;
      remove();
      return;
    }
    if(options.teacher || options.paused || profile.active===false) {
      remove(); return;
    }
    var today=madridDate(new Date());
    var key=String(profile.id)+'|'+today.key;
    if(!isBirthday(profile)) {remove();return;}
    if(activeKey===key) return;
    activeKey=key;
    celebration(profile);
  }
  document.addEventListener('click',function(e){
    if(e.target.closest?.('[data-action="logout"]')) { activeKey=null; remove(); }
  },true);
  window.TribecaBirthdayV259={onProfile:onProfile,isBirthday:isBirthday,birthdayParts:birthdayParts,madridDate:madridDate,remove:remove};
})();