const BACKEND_URL='https://script.google.com/macros/s/AKfycbyZb3KtsdY89aIyi2NBOX4Lf1NDq2BIw3CQQwgvZ3IvO47b-sDUVF-l7Wi3sFZQpDyi/exec';
const AUDIO_VOLUME = 0.65;
const REGISTRATION_STORAGE_KEY = 'bodaCarlosVictoriaIndividualRegistrationKey';

let state={
  data:null,registrationKey:'',countdownTimer:null,
  musicPlaying:false,musicMuted:false,musicShouldStart:false,
  audioContext:null,audioGain:null,audioBuffer:null,audioSource:null,
  audioLoading:false,audioReady:false,audioError:null,
  mediaAudio:null,mediaPrepared:false,mediaFailed:false,
  loadingStepTimer:null,loadingStepValue:1,
  invitationPrepared:false,audioPreloadDone:false,audioBlobUrl:'',accessRevealed:false,
  floralData:null,galleryItems:null,closingImage:''
};

let openingRuntime={
  active:false,
  finished:false,
  startedAt:0,
  finishTimer:null,
  safetyTimer:null
};

function safeStorageGet(key){
  try{return window.localStorage?window.localStorage.getItem(key):null;}catch(e){return null;}
}
function safeStorageSet(key,value){
  try{if(window.localStorage)window.localStorage.setItem(key,value);return true;}catch(e){return false;}
}


function forceVerticalScrollEnabled(){
  try{
    const html=document.documentElement;
    const body=document.body;
    const page=document.getElementById('invitationPage');
    const scrolling=document.scrollingElement||html||body;

    if(html){
      html.style.setProperty('overflow-x','hidden','important');
      html.style.setProperty('overflow-y','auto','important');
      html.style.setProperty('height','auto','important');
      html.style.setProperty('min-height','100%','important');
      html.style.setProperty('touch-action','pan-y pinch-zoom','important');
      html.style.setProperty('-webkit-overflow-scrolling','touch','important');
    }
    if(body){
      body.style.setProperty('position','static','important');
      body.style.setProperty('width','100%','important');
      body.style.setProperty('height','auto','important');
      body.style.setProperty('min-height','100%','important');
      body.style.setProperty('overflow-x','hidden','important');
      body.style.setProperty('overflow-y','visible','important');
      body.style.setProperty('touch-action','pan-y pinch-zoom','important');
      body.style.setProperty('-webkit-overflow-scrolling','touch','important');
    }
    if(page){
      page.style.setProperty('position','relative','important');
      page.style.setProperty('height','auto','important');
      page.style.setProperty('overflow-x','hidden','important');
      page.style.setProperty('overflow-y','visible','important');
      page.style.setProperty('touch-action','pan-y pinch-zoom','important');
      page.style.setProperty('-webkit-overflow-scrolling','touch','important');
    }
    if(scrolling){
      scrolling.style.setProperty('overflow-y','auto','important');
      scrolling.style.setProperty('touch-action','pan-y pinch-zoom','important');
    }
  }catch(e){}
}

function finishInvitationOpening(reason){
  if(openingRuntime.finished)return;
  openingRuntime.finished=true;
  openingRuntime.active=false;
  clearTimeout(openingRuntime.finishTimer);
  clearTimeout(openingRuntime.safetyTimer);

  const access=document.getElementById('accessScreen');
  const stage=document.getElementById('envelopeStage');
  const page=document.getElementById('invitationPage');
  const flash=document.getElementById('softFlash');

  if(page){
    page.classList.add('ready');
    page.classList.remove('hidden');
  }
  if(stage){stage.classList.add('fade-away');}
  if(flash){flash.classList.add('release');}
  if(access){
    access.classList.add('exit','opening-complete');
    access.style.pointerEvents='none';
  }

  document.body.classList.remove('opening-invitation');
  document.body.classList.add('invitation-opened');
  forceVerticalScrollEnabled();

  const finalizeLayer=()=>{
    if(access){
      access.classList.add('hidden');
      access.style.display='none';
    }
    if(stage){stage.setAttribute('aria-hidden','true');}
    forceVerticalScrollEnabled();
  };

  requestAnimationFrame(()=>{
    forceVerticalScrollEnabled();
    requestAnimationFrame(forceVerticalScrollEnabled);
  });
  setTimeout(finalizeLayer,420);
  setTimeout(forceVerticalScrollEnabled,700);
  setTimeout(forceVerticalScrollEnabled,1400);

  initPetals();
  enableAutoScroll();

  const loadDeferredVisuals=()=>{
    if(state.floralData)renderFloralDecor(state.floralData);
    if(state.galleryItems&&state.galleryItems.length)renderGallery(state.galleryItems);
    if(state.closingImage){
      const closing=document.getElementById('closingSection');
      if(closing)closing.style.backgroundImage=`url("${safeCssUrl(state.closingImage)}")`;
    }
  };
  if('requestIdleCallback' in window)requestIdleCallback(loadDeferredVisuals,{timeout:1200});
  else setTimeout(loadDeferredVisuals,550);

  if(state.musicShouldStart&&state.mediaFailed&&!state.audioReady&&!state.audioLoading){
    setTimeout(()=>preloadWeddingAudio(),220);
  }
}

function installIOSScrollRecovery(){
  let lastRun=0;
  const recover=(force)=>{
    const now=Date.now();
    if(!force&&now-lastRun<450)return;
    lastRun=now;
    if(document.body&&document.body.classList.contains('invitation-opened')){
      forceVerticalScrollEnabled();
      return;
    }
    if(openingRuntime.active&&now-openingRuntime.startedAt>3900){
      finishInvitationOpening('ios-recovery');
    }
  };

  window.addEventListener('pageshow',()=>recover(true),{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(()=>recover(true),260),{passive:true});
  window.addEventListener('resize',()=>setTimeout(()=>recover(false),180),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>recover(true),80);});
}

function installPerformanceLifecycle(){
  document.addEventListener('visibilitychange',()=>{
    const paused=document.hidden?'paused':'running';
    document.querySelectorAll('.petal,.gallery-track').forEach(el=>{el.style.animationPlayState=paused;});
  },{passive:true});
}

function startLoadingSequence(){
  stopLoadingSequence();
  state.loadingStepValue=1;
  const el=document.getElementById('loadingDots');
  if(el)el.textContent='.';
  state.loadingStepTimer=setInterval(()=>{
    state.loadingStepValue=state.loadingStepValue>=3?1:state.loadingStepValue+1;
    const dots=document.getElementById('loadingDots');
    if(!dots)return;
    dots.textContent='.'.repeat(state.loadingStepValue);
  },420);
}
function stopLoadingSequence(){
  if(state.loadingStepTimer){clearInterval(state.loadingStepTimer);state.loadingStepTimer=null;}
}
function getNativeWeddingAudio(){
  if(state.mediaAudio)return state.mediaAudio;
  const audio=document.getElementById('weddingAudio');
  if(!audio)return null;
  state.mediaAudio=audio;
  audio.volume=AUDIO_VOLUME;
  audio.loop=true;
  audio.preload='auto';
  audio.setAttribute('playsinline','');
  audio.setAttribute('webkit-playsinline','');

  const syncUi=()=>{state.musicPlaying=!audio.paused&&!audio.muted;updateMusicButton();};
  const tryAutoplay=()=>{
    if(!state.musicShouldStart||state.musicMuted)return;
    audio.muted=false;
    audio.volume=AUDIO_VOLUME;
    let playPromise=null;
    try{playPromise=audio.play();}catch(err){
      state.musicPlaying=false;
      state.mediaFailed=true;
      state.audioError=err&&err.message?err.message:'No se pudo iniciar la música.';
      updateMusicButton();
      return;
    }
    if(playPromise&&typeof playPromise.then==='function'){
      playPromise.then(()=>{state.musicPlaying=true;state.mediaFailed=false;updateMusicButton();})
      .catch(err=>{
        state.musicPlaying=false;
        state.mediaFailed=true;
        state.audioError=err&&err.message?err.message:'El navegador bloqueó la reproducción.';
        updateMusicButton();
      });
    }else syncUi();
  };

  audio.__tryAutoplay=tryAutoplay;
  audio.addEventListener('canplay',()=>{state.mediaPrepared=true;state.mediaFailed=false;if(state.musicShouldStart&&audio.paused)tryAutoplay();},{passive:true});
  audio.addEventListener('loadeddata',()=>{state.mediaPrepared=true;if(state.musicShouldStart&&audio.paused)tryAutoplay();},{passive:true});
  audio.addEventListener('playing',()=>{state.musicPlaying=true;state.mediaFailed=false;updateMusicButton();},{passive:true});
  audio.addEventListener('pause',()=>{state.musicPlaying=!audio.paused&&!state.musicMuted;updateMusicButton();},{passive:true});
  audio.addEventListener('error',()=>{
    state.mediaFailed=true;
    state.musicPlaying=false;
    updateMusicButton();
  },{passive:true});
  return audio;
}
function base64Mp3ToBlobUrl(base64,mimeType){
  const binary=atob(base64||'');
  const chunk=65536;
  const parts=[];
  for(let offset=0;offset<binary.length;offset+=chunk){
    const slice=binary.slice(offset,offset+chunk);
    const bytes=new Uint8Array(slice.length);
    for(let i=0;i<slice.length;i++)bytes[i]=slice.charCodeAt(i);
    parts.push(bytes);
  }
  return URL.createObjectURL(new Blob(parts,{type:mimeType||'audio/mpeg'}));
}
function preloadWeddingAudioFromServer(){
  // En GitHub Pages la pista se sirve directamente desde Drive. No bloqueamos la portada.
  state.audioLoading=false;
  state.audioPreloadDone=true;
  maybeRevealAccess();
}
function maybeRevealAccess(){
  if(state.accessRevealed||!state.invitationPrepared||!state.audioPreloadDone)return;
  state.accessRevealed=true;
  stopLoadingSequence();
  hide('loading');
  unhide('accessScreen');
}


function loadInvitationFromBackend(){
  return new Promise((resolve,reject)=>{
    const callback='__bodaBootstrap_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
    const script=document.createElement('script');
    const timer=setTimeout(()=>finish(new Error('El servidor tardó demasiado en responder.')),15000);
    function finish(err,data){
      clearTimeout(timer);
      try{delete window[callback];}catch(e){window[callback]=undefined;}
      if(script.parentNode)script.parentNode.removeChild(script);
      err?reject(err):resolve(data);
    }
    window[callback]=(data)=>finish(null,data);
    script.onerror=()=>finish(new Error('No se pudo conectar con el servidor de la invitación.'));
    const rk=encodeURIComponent(state.registrationKey||'');
    script.src=BACKEND_URL+'?action=bootstrap&callback='+encodeURIComponent(callback)+'&rk='+rk+'&v='+Date.now();
    document.head.appendChild(script);
  });
}

function normalizeWeddingAudioUrl(value){
  const s=String(value||'').trim();
  if(!s)return'';
  let m=s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if(!m)m=s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if(!m)return s;
  return 'https://drive.usercontent.google.com/download?id='+m[1]+'&export=download&confirm=t';
}

function configureWeddingAudio(config){
  const audio=getNativeWeddingAudio();
  if(!audio)return;
  const raw=String(config&&config.musica_url||'').trim();
  const url=normalizeWeddingAudioUrl(raw);
  if(!url)return;
  if(audio.dataset.sourceUrl===url&&audio.src)return;
  audio.dataset.sourceUrl=url;
  state.mediaFailed=false;
  state.mediaPrepared=false;
  audio.src=url+(url.includes('?')?'&':'?')+'v=20261004';
  audio.preload='auto';
  try{audio.load();}catch(e){}
}

document.addEventListener('DOMContentLoaded',function(){
  try{
    startLoadingSequence();
    getNativeWeddingAudio();
    state.audioPreloadDone=true;
    state.registrationKey=safeStorageGet(REGISTRATION_STORAGE_KEY)||'';
    initAutoScrollController();
    installIOSScrollRecovery();
    installPerformanceLifecycle();
    loadInvitationFromBackend()
      .then(data=>{
        if(data&&data.ok&&data.config)configureWeddingAudio(data.config);
        prepareInvitation(data);
      })
      .catch(showFatal);
  }catch(err){
    showFatal(err);
  }
});

function prepareInvitation(data){
  if(!data||!data.ok){showFatal({message:'No se pudo preparar la invitación.'});return;}
  state.data=data;
  if(data.registro&&data.registro.registrationKey){
    state.registrationKey=data.registro.registrationKey;
    safeStorageSet(REGISTRATION_STORAGE_KEY,state.registrationKey);
  }

  const c=data.config||{};
  configureWeddingAudio(c);
  const groom=firstDisplayName(c.novio,'Carlos');
  const bride=firstDisplayName(c.novia,'Victoria');
  setText('accessGroom',groom);setText('accessBride',bride);
  setText('accessDate',formatDateLong(c.fecha_boda)||'7 de noviembre de 2026');
  setText('envelopeNames',groom+' & '+bride);
  setText('envelopeDate',formatDateShort(c.fecha_boda)||'07 · 11 · 2026');

  // La invitación nunca queda bloqueada por el audio. Esto es especialmente
  // importante en Safari/iPhone, donde la decodificación puede demorarse o fallar.
  renderInvitation(data);
  state.invitationPrepared=true;
  maybeRevealAccess();
}

function openInvitation(){
  const btn=document.getElementById('openInvitationBtn');
  if(btn){btn.disabled=true;const label=btn.querySelector('span');if(label)label.textContent='Abriendo…';}
  startWeddingMusic();
  startEnvelopeAnimation();
}

function startEnvelopeAnimation(){
  const card=document.getElementById('accessCard');
  const stage=document.getElementById('envelopeStage');
  const page=document.getElementById('invitationPage');
  const flash=document.getElementById('softFlash');
  const access=document.getElementById('accessScreen');

  openingRuntime.active=true;
  openingRuntime.finished=false;
  openingRuntime.startedAt=Date.now();

  unhide('invitationPage');
  if(page)page.classList.remove('ready');

  if(access){
    access.classList.add('opening-active');
    access.classList.remove('exit','opening-complete');
    access.style.pointerEvents='auto';
    access.style.display='';
  }

  try{window.scrollTo(0,0);}catch(e){}
  document.body.classList.add('opening-invitation');
  document.body.classList.remove('invitation-opened');

  requestAnimationFrame(()=>{
    if(card)card.classList.add('validated');

    setTimeout(()=>{
      if(openingRuntime.finished)return;
      if(card)card.classList.add('gone');
      if(stage){unhide('envelopeStage');stage.setAttribute('aria-hidden','false');}

      requestAnimationFrame(()=>{
        if(openingRuntime.finished)return;
        if(stage)stage.classList.add('seal-release');

        setTimeout(()=>{
          if(openingRuntime.finished)return;
          if(flash)flash.classList.add('active');
          if(stage)stage.classList.add('open');

          setTimeout(()=>{
            if(openingRuntime.finished)return;
            if(stage)stage.classList.add('reveal-card');
            if(page)page.classList.add('ready');
            if(flash)flash.classList.add('release');
            initRevealObserver();

            setTimeout(()=>{
              if(openingRuntime.finished)return;
              if(access){access.classList.add('exit');access.style.pointerEvents='none';}
              if(stage)stage.classList.add('fade-away');
              openingRuntime.finishTimer=setTimeout(()=>finishInvitationOpening('timeline'),500);
            },650);
          },1250);
        },420);
      });
    },300);
  });

  openingRuntime.safetyTimer=setTimeout(()=>finishInvitationOpening('hard-safety'),3900);
}

function renderInvitation(data){
  const c=data.config||{},t=data.textos||{},imgs=data.imagenes||{};
  const groom=firstDisplayName(c.novio,'Carlos'),bride=firstDisplayName(c.novia,'Victoria');

  setText('novio',groom);setText('novia',bride);setText('closingGroom',groom);setText('closingBride',bride);
  setText('fechaHero',formatDateLong(c.fecha_boda)||'7 de noviembre de 2026');

  if(t.bienvenida){setText('bienvenidaTitulo',t.bienvenida.titulo||'Nuestra boda');setText('bienvenidaTexto',t.bienvenida.texto||'Nos haría mucha ilusión compartir este día contigo.');}
  if(t.rsvp)setText('rsvpIntro',t.rsvp.texto||'Tu respuesta nos ayudará a organizar cada detalle.');
  if(t.fotos)setText('fotosTexto',t.fotos.texto||'Después de la celebración podrás añadir tus fotografías al álbum.');
  if(t.despedida)setText('despedidaTexto',t.despedida.texto||'Gracias por formar parte de nuestra historia.');

  setText('lugarCeremonia',c.lugar_ceremonia||'Iglesia de la Compañía de Jesús');
  setText('horaCeremonia',c.hora_ceremonia?'Hora: '+c.hora_ceremonia:'');
  setText('direccionCeremonia',c.direccion_ceremonia&&c.direccion_ceremonia!=='Por confirmar'?c.direccion_ceremonia:'');
  setLink('mapsCeremonia',c.maps_ceremonia);
  setText('lugarRecepcion',c.lugar_recepcion||'CASA REAL EVENTOS');
  setText('horaRecepcion',c.hora_recepcion?'Hora: '+c.hora_recepcion:'');
  setText('direccionRecepcion',c.direccion_recepcion&&c.direccion_recepcion!=='Por confirmar'?c.direccion_recepcion:'');
  setLink('mapsRecepcion',c.maps_recepcion);

  setText('dressCode',c.vestimenta||'Elegante');
  setText('dressNote',c.nota_vestimenta||'Reservamos el color blanco para la novia.');
  const adults=c.solo_adultos===true||String(c.solo_adultos).toUpperCase()==='TRUE';
  if(adults){
    setText('adultosTitulo',c.titulo_adultos||'Celebración para adultos');
    setText('adultosTexto',c.texto_adultos||'Con mucho cariño, nuestra celebración será únicamente para adultos. Agradecemos su comprensión.');
    unhide('adultosSection');
  }

  if(imgs.portada){
    const hero=document.getElementById('hero');
    const preload=new Image();
    try{preload.fetchPriority='high';}catch(e){}
    preload.decoding='async';
    preload.onload=()=>{if(hero)hero.style.backgroundImage=`url("${safeCssUrl(imgs.portada)}")`;};
    preload.onerror=()=>{if(hero)hero.style.backgroundImage=`url("${safeCssUrl(imgs.portada)}")`;};
    preload.src=imgs.portada;
  }
  if(imgs.pareja01){setImg('pareja01',imgs.pareja01);unhide('couplePhotoOne');unhide('coupleSection');}
  if(imgs.pareja02){setImg('pareja02',imgs.pareja02);unhide('couplePhotoTwo');unhide('coupleSection');}
  if(imgs.ceremonia)setImg('fotoCeremonia',imgs.ceremonia);
  if(imgs.recepcion)setImg('fotoRecepcion',imgs.recepcion);

  state.galleryItems=[...(imgs.galeria||[]),...((data.galeria||[]).filter(x=>['galeria','general'].includes(String(x.tipo).toLowerCase())).map(x=>x.url))];
  state.floralData=data.flores||{};
  state.closingImage=imgs.cierre||'';
  if(c.drive_fotos_invitados){document.getElementById('albumLink').href=c.drive_fotos_invitados;unhide('albumSection');}

  renderGift(c);
  renderRsvp();
  startCountdown(c.fecha_boda,c.hora_ceremonia);
}

function renderFloralDecor(flores){
  const corners=(flores&&flores.esquinas)||[];
  const horizontals=(flores&&flores.horizontales)||[];

  document.querySelectorAll('.floral-frame').forEach((el,i)=>{
    if(!corners.length)return;
    const left=corners[i%corners.length];
    const right=corners[(i+1)%corners.length]||left;
    if(left)el.style.setProperty('--corner-left',`url("${safeCssUrl(left)}")`);
    if(right)el.style.setProperty('--corner-right',`url("${safeCssUrl(right)}")`);
    el.classList.add('has-floral-corners');
  });

  const page=document.getElementById('invitationPage');
  if(!page||!horizontals.length)return;
  [...page.children].filter(el=>el.classList&&el.classList.contains('auto-floral-divider')).forEach(el=>el.remove());
  const sections=[...page.children].filter(el=>el.tagName==='SECTION'&&!el.classList.contains('hidden'));
  const rich=horizontals[0]||horizontals[2]||horizontals[1];
  const light=horizontals[1]||horizontals[2]||horizontals[0];
  const medium=horizontals[2]||horizontals[0]||horizontals[1];

  for(let i=1;i<sections.length;i++){
    const previous=sections[i-1],next=sections[i];
    const prevTone=getFloralSectionTone(previous),nextTone=getFloralSectionTone(next);
    let src=light,detailClass='floral-light';
    if(nextTone==='wine'){src=rich;detailClass='floral-rich';}
    else if(prevTone==='wine'||prevTone==='dark'||nextTone==='dark'){src=medium;detailClass='floral-medium';}
    if(!src)continue;
    const divider=document.createElement('div');
    divider.className=`floral-divider auto-floral-divider ${detailClass}`;
    divider.setAttribute('aria-hidden','true');
    divider.style.setProperty('--floral-strip',`url("${safeCssUrl(src)}")`);
    next.parentNode.insertBefore(divider,next);
  }
}

function getFloralSectionTone(section){
  if(!section)return'light';
  if(section.id==='countdownSection'||section.id==='albumSection'||section.classList.contains('countdown-section')||section.classList.contains('album-section'))return'wine';
  if(section.id==='hero'||section.id==='closingSection'||section.classList.contains('hero-wedding')||section.classList.contains('closing-section'))return'dark';
  return'light';
}

function renderGift(c){
  const active=c.regalos_activo===true||String(c.regalos_activo).toUpperCase()==='TRUE';
  if(!active)return;
  setText('giftTitle',c.regalo_titulo||'Lo más importante es tu presencia');
  setText('giftText',c.regalo_texto||'Tu presencia es lo más importante. Si además deseas tener un detalle con nosotros, cualquier gesto será recibido con mucho cariño.');
  const hasBank1=renderBankProvider(1,c.banco1_nombre,c.banco1_logo_url,c.banco1_cc);
  const hasBank2=renderBankProvider(2,c.banco2_nombre,c.banco2_logo_url,c.banco2_cc);
  const hasYape=renderYapeNumber(1,c.yape1_numero);
  if(hasYape){
    if(c.yape_logo_url){setImg('yapeLogo',normalizeImageUrl(c.yape_logo_url));hide('yapeLogoFallback');}
    unhide('yapeCard');
  }
  if(hasBank1||hasBank2||hasYape)unhide('giftSection');
}

function renderBankProvider(n,name,logo,cc){
  if(!name&&!cc)return false;
  setText('bank'+n+'Name',name||'Banco');
  if(logo){setImg('bank'+n+'Logo',normalizeImageUrl(logo));hide('bank'+n+'LogoFallback');}
  if(cc){setText('bank'+n+'Cc',cc);unhide('bank'+n+'CcBtn');}
  unhide('bank'+n+'Card');return true;
}
function renderYapeNumber(n,number){if(!number)return false;setText('yape'+n+'Number',number);unhide('yape'+n+'Btn');return true;}

/* ===========================
   RSVP GENERAL
=========================== */
function renderRsvp(){
  const data=state.data||{},r=data.registro||null,d=data.deadline||{},c=data.config||{};
  hide('result');hide('rsvpContact');hide('editRsvpBtn');

  if(d.hasDeadline){
    const deadlineEl=document.getElementById('rsvpDeadline');
    const deadlineText=d.display||formatDeadlineEs(d.iso);
    deadlineEl.innerHTML='Confirma o modifica tu respuesta hasta el <strong class="deadline-date">'+escapeHtml(deadlineText)+'</strong>.';
    unhide('rsvpDeadline');
  }else hide('rsvpDeadline');

  prefillRsvp(r);

  if(d.passed){
    hide('rsvpForm');unhide('rsvpStatusCard');
    setText('rsvpStatusEyebrow','PLAZO DE CONFIRMACIÓN FINALIZADO');
    if(r){
      setText('rsvpStatusTitle','Tu confirmación ya fue registrada');
      setText('rsvpStatusDetail',registrationSummary(r));
    }else{
      setText('rsvpStatusTitle','El plazo para confirmar ya terminó');
      setText('rsvpStatusDetail','Si necesitas comunicar un cambio, contáctate con los novios.');
    }
    renderRsvpContact(c,true);return;
  }

  if(r){
    hide('rsvpForm');unhide('rsvpStatusCard');
    setText('rsvpStatusEyebrow','TU RESPUESTA ACTUAL');
    setText('rsvpStatusTitle',r.estado==='NO ASISTE'?'Gracias por avisarnos':'¡Contamos contigo!');
    setText('rsvpStatusDetail',registrationSummary(r));
    unhide('editRsvpBtn');
  }else{
    hide('rsvpStatusCard');unhide('rsvpForm');
  }
}

function registrationSummary(r){
  if(!r)return'';
  if(r.estado==='NO ASISTE'||r.respuesta==='NO ASISTIRÉ')return `${r.nombre||'Invitado'}, registramos que no podrás acompañarnos.`;
  return `${r.nombre||'Invitado'}, registramos tu asistencia para 1 persona.`;
}

function renderRsvpContact(c,force){
  const text=(c.contacto_confirmaciones||'').trim(),wa=(c.contacto_whatsapp||'').trim();
  if(!text&&!wa&&!force)return;
  const box=document.getElementById('rsvpContact');box.innerHTML='';
  const p=document.createElement('p');p.textContent='Si necesitas realizar un cambio, comunícate con los novios'+(text?' mediante '+text:'')+'.';box.appendChild(p);
  if(wa){const a=document.createElement('a');a.className='contact-btn';a.target='_blank';a.rel='noopener';a.href='https://wa.me/'+wa.replace(/\D/g,'');a.textContent='Contactar por WhatsApp';box.appendChild(a);}
  unhide('rsvpContact');
}

function enableRsvpEdit(){hide('rsvpStatusCard');unhide('rsvpForm');document.getElementById('rsvpForm').scrollIntoView({behavior:'smooth',block:'center'});}

function prefillRsvp(r){
  document.querySelectorAll('input[name="respuesta"]').forEach(x=>x.checked=false);
  setTextValue('rsvpFullName',r&&r.nombre?r.nombre:'');
  setTextValue('contacto',r&&r.contacto?r.contacto:'');
  setTextValue('mensaje',r&&r.mensaje?r.mensaje:'');
  if(r&&r.respuesta){const radio=[...document.querySelectorAll('input[name="respuesta"]')].find(x=>x.value===r.respuesta);if(radio)radio.checked=true;}
}

function updateCompanion(){}

function sendRsvp(ev){
  ev.preventDefault();
  const selected=document.querySelector('input[name="respuesta"]:checked');
  if(!selected)return;
  const nombre=(document.getElementById('rsvpFullName').value||'').trim();
  const contacto=(document.getElementById('contacto').value||'').trim();
  const mensaje=(document.getElementById('mensaje').value||'').trim();
  if(nombre.split(/\s+/).filter(Boolean).length<2){setText('result','Escribe tu nombre completo y apellido.');unhide('result');return;}
  if(contacto.replace(/\D/g,'').length<7){setText('result','Escribe un número de contacto válido.');unhide('result');return;}

  const btn=document.getElementById('submitBtn');
  btn.disabled=true;btn.textContent='Guardando…';hide('result');
  if(!state.registrationKey){
    state.registrationKey='web_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12);
    safeStorageSet(REGISTRATION_STORAGE_KEY,state.registrationKey);
  }

  let form=document.getElementById('backendPostForm');
  if(form)form.remove();
  form=document.createElement('form');
  form.id='backendPostForm';form.method='POST';form.action=BACKEND_URL;form.target='backendFrame';form.style.display='none';
  const payload={action:'rsvp',registrationKey:state.registrationKey,nombre,respuesta:selected.value,contacto,mensaje};
  Object.entries(payload).forEach(([k,v])=>{const input=document.createElement('input');input.type='hidden';input.name=k;input.value=v==null?'':String(v);form.appendChild(input);});
  document.body.appendChild(form);

  const frame=document.getElementById('backendFrame');
  let finished=false;
  const finish=()=>{
    if(finished)return;finished=true;
    btn.disabled=false;btn.textContent='Guardar mi respuesta';
    const personas=selected.value==='NO ASISTIRÉ'?0:1;
    state.data.registro={registrationKey:state.registrationKey,nombre,respuesta:selected.value,personas,contacto:contacto.replace(/\D/g,''),mensaje,estado:personas?'CONFIRMADO':'NO ASISTE',fechaRespuesta:new Date().toISOString()};
    setText('result','Tu respuesta se guardó correctamente.');unhide('result');
    setTimeout(()=>{hide('result');renderRsvp();document.getElementById('rsvpSection').scrollIntoView({behavior:'smooth',block:'center'});},900);
  };
  const onload=()=>{frame.removeEventListener('load',onload);finish();};
  frame.addEventListener('load',onload);
  setTimeout(()=>{frame.removeEventListener('load',onload);finish();},5000);
  form.submit();
}

function preloadGalleryImage(url){
  return new Promise(resolve=>{
    const img=new Image();
    img.decoding='async';
    img.onload=()=>resolve({url,ok:true});
    img.onerror=()=>resolve({url,ok:false});
    img.src=url;
    if(img.complete)resolve({url,ok:img.naturalWidth>0});
  });
}

function buildGalleryCarousel(urls){
  const box=document.getElementById('gallery');
  box.innerHTML='';
  box.className='gallery-carousel gallery-ready';

  const viewport=document.createElement('div');
  viewport.className='gallery-viewport';

  const track=document.createElement('div');
  track.className='gallery-track';
  const duration=Math.max(32,Math.min(46,urls.length*6.8));
  track.style.setProperty('--gallery-speed',duration+'s');

  for(let loop=0;loop<2;loop++){
    const strip=document.createElement('div');
    strip.className='gallery-strip';
    strip.setAttribute('aria-hidden',loop===1?'true':'false');

    urls.forEach((url,i)=>{
      const fig=document.createElement('figure');
      // Ambos bloques repiten EXACTAMENTE el mismo patrón para que el bucle no salte.
      fig.className='gallery-card '+(i%2===0?'tilt-left':'tilt-right');

      const frame=document.createElement('div');
      frame.className='gallery-card-frame';

      const img=document.createElement('img');
      img.src=url;
      img.alt='Carlos y Victoria - foto '+(i+1);
      img.loading=(loop===0&&i<2)?'eager':'lazy';
      img.decoding='async';
      img.fetchPriority=(loop===0&&i===0)?'high':'low';

      frame.appendChild(img);
      fig.appendChild(frame);
      strip.appendChild(fig);
    });
    track.appendChild(strip);
  }

  viewport.appendChild(track);
  box.appendChild(viewport);
  box.dataset.count=String(urls.length);
  unhide('galeriaSection');
}

function renderGallery(items){
  const unique=[...new Set((items||[]).filter(Boolean))];
  if(!unique.length)return;
  const prepared=unique.length===1?[unique[0],unique[0],unique[0]]:unique;
  hide('galeriaSection');
  buildGalleryCarousel(prepared);
}

function startCountdown(dateValue,timeValue){
  if(state.countdownTimer)clearInterval(state.countdownTimer);
  const target=parseWeddingDate(dateValue,timeValue);if(!target)return;
  const tick=()=>{let diff=Math.max(0,target.getTime()-Date.now());const days=Math.floor(diff/86400000);diff%=86400000;const hours=Math.floor(diff/3600000);diff%=3600000;const mins=Math.floor(diff/60000);const secs=Math.floor((diff%60000)/1000);setText('cdDays',pad(days));setText('cdHours',pad(hours));setText('cdMinutes',pad(mins));setText('cdSeconds',pad(secs));};
  tick();state.countdownTimer=setInterval(tick,1000);
}
function parseWeddingDate(v,time){let y=2026,m=11,d=29;const s=String(v||'').trim();let a=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(a){y=+a[1];m=+a[2];d=+a[3];}else{a=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);if(a){d=+a[1];m=+a[2];y=+a[3];}}let hh=0,mm=0;const tm=String(time||'').match(/(\d{1,2}):(\d{2})/);if(tm){hh=+tm[1];mm=+tm[2];}return new Date(y,m-1,d,hh,mm,0);}

function copyPayment(id){const target=document.getElementById(id);const text=(target&&target.textContent?target.textContent:'').trim();if(!text)return;const done=()=>{unhide('copyNotice');clearTimeout(window.__copyTimer);window.__copyTimer=setTimeout(()=>hide('copyNotice'),1500);};if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(text).then(done).catch(()=>fallbackCopy(text,done));else fallbackCopy(text,done);}
function fallbackCopy(text,done){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done();}catch(e){}ta.remove();}
function normalizeImageUrl(value){const s=String(value||'').trim();if(!s)return'';let m=s.match(/\/d\/([a-zA-Z0-9_-]+)/);if(!m)m=s.match(/[?&]id=([a-zA-Z0-9_-]+)/);if(!m)m=s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);return m?'https://drive.google.com/thumbnail?id='+m[1]+'&sz=w800':s;}

/* ===========================
   MÚSICA
=========================== */
function startWeddingMusic(){
  state.musicShouldStart=true;
  state.musicMuted=false;
  unhide('musicBtn');
  const audio=getNativeWeddingAudio();
  if(!audio)return;
  audio.muted=false;
  audio.volume=AUDIO_VOLUME;
  if(!audio.src&&!state.audioLoading&&!state.audioPreloadDone)preloadWeddingAudioFromServer();
  if(typeof audio.__tryAutoplay==='function')audio.__tryAutoplay();
  else{
    try{
      const p=audio.play();
      if(p&&typeof p.then==='function')p.then(()=>{state.musicPlaying=true;state.mediaFailed=false;updateMusicButton();}).catch(()=>updateMusicButton());
    }catch(e){updateMusicButton();}
  }
  setTimeout(()=>{if(state.musicShouldStart&&audio.paused&&typeof audio.__tryAutoplay==='function')audio.__tryAutoplay();},180);
  setTimeout(()=>{if(state.musicShouldStart&&audio.paused&&typeof audio.__tryAutoplay==='function')audio.__tryAutoplay();},520);
}
function toggleMusic(){
  const audio=getNativeWeddingAudio();
  if(!audio)return;
  state.musicMuted=!state.musicMuted;
  audio.muted=state.musicMuted;
  audio.volume=AUDIO_VOLUME;
  if(!state.musicMuted&&state.musicShouldStart&&audio.paused){
    try{const p=audio.play();if(p&&p.catch)p.catch(()=>{});}catch(e){}
  }
  state.musicPlaying=!audio.paused&&!state.musicMuted;
  updateMusicButton();
}
function updateMusicButton(){
  const btn=document.getElementById('musicBtn'),slash=document.getElementById('musicSlash');
  if(!btn)return;
  btn.classList.toggle('muted',state.musicMuted);
  if(slash)slash.classList.toggle('hidden',!state.musicMuted);
  btn.setAttribute('aria-label',state.musicMuted?'Activar música':'Silenciar música');
  btn.title=state.musicMuted?'Activar música':'Silenciar música';
}

function formatDeadlineEs(value){const d=value?new Date(value):null;if(!d||isNaN(d.getTime()))return'';return new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Lima'}).format(d);}
function initRevealObserver(){const nodes=document.querySelectorAll('.reveal');if(!('IntersectionObserver' in window)){nodes.forEach(el=>el.classList.add('visible'));return;}const obs=new IntersectionObserver(entries=>{entries.forEach(x=>{if(x.isIntersecting){x.target.classList.add('visible');obs.unobserve(x.target);}});},{threshold:.08,rootMargin:'80px 0px'});nodes.forEach(el=>obs.observe(el));setTimeout(()=>{document.querySelectorAll('.hero-content.reveal').forEach(el=>el.classList.add('visible'));},60);}
function showFatal(err){stopLoadingSequence();hide('loading');hide('accessScreen');document.body.innerHTML='<div class="fatal-screen"><div><strong>No se pudo cargar la invitación</strong><p>'+(err&&err.message?escapeHtml(err.message):'Inténtalo nuevamente.')+'</p></div></div>';}
function formatDateLong(v){const d=parseWeddingDate(v,'');if(!d)return'';return new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'long',year:'numeric'}).format(d);}
function formatDateShort(v){const d=parseWeddingDate(v,'');if(!d)return'';return[pad(d.getDate()),pad(d.getMonth()+1),d.getFullYear()].join(' · ');}
function firstDisplayName(v,fallback){const s=String(v||'').trim();return s?s.split(/\s+/)[0]:fallback;}
function safeCssUrl(v){return String(v||'').replace(/["'()\\]/g,'');}
function pad(n){return String(n).padStart(2,'0');}
function setText(id,text){const el=document.getElementById(id);if(el)el.textContent=text||'';}
function setTextValue(id,text){const el=document.getElementById(id);if(el)el.value=text||'';}
function setLink(id,url){const el=document.getElementById(id);if(el&&url){el.href=url;unhide(id);}else hide(id);}
function setImg(id,url){const el=document.getElementById(id);if(el&&url){el.loading='lazy';el.decoding='async';el.src=url;unhide(id);}}
function hide(id){const el=document.getElementById(id);if(el)el.classList.add('hidden');}
function unhide(id){const el=document.getElementById(id);if(el)el.classList.remove('hidden');}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

/* ===========================
   DESPLAZAMIENTO NATURAL
   No usamos auto-scroll: evita competir con el gesto del usuario en iOS/Android.
=========================== */
function initAutoScrollController(){}
function enableAutoScroll(){}
function pauseAutoScroll(){}

/* ===========================
   PÉTALOS
=========================== */
let petalsStarted=false,petalsResizeTimer=null,petalsViewportWidth=0;
function initPetals(){
  const container=document.getElementById('petalsContainer');
  if(!container)return;
  petalsViewportWidth=window.innerWidth;
  createPetals(container);
  if(!petalsStarted){
    window.addEventListener('resize',()=>{
      const nextWidth=window.innerWidth;
      if(Math.abs(nextWidth-petalsViewportWidth)<80)return;
      petalsViewportWidth=nextWidth;
      clearTimeout(petalsResizeTimer);
      petalsResizeTimer=setTimeout(()=>createPetals(container),320);
    },{passive:true});
    petalsStarted=true;
  }
}
function createPetals(container){
  container.innerHTML='';
  const width=window.innerWidth;
  const isMobile=width<=768;
  const isSmall=width<=420;
  const laneCount=isSmall?10:(isMobile?14:18);
  const perLane=isSmall?1:(isMobile?2:2);
  const colors=['#56654D','#74885E','#AAB99A','#D8D7C4','#EEE9D8','#B79652','#CBD3BA'];
  const frag=document.createDocumentFragment();
  const total=laneCount*perLane;
  let index=0;

  for(let lane=0; lane<laneCount; lane++){
    const laneBase=((lane+0.5)/laneCount)*100;
    for(let slot=0; slot<perLane; slot++){
      const petal=document.createElement('span');
      const tierRoll=Math.random();
      let tier='small', sizeRange=[10,15], duration=[13.6,17.2], scale=[0.92,1.02], opacity=[.34,.56];
      if(tierRoll>.82){tier='large'; sizeRange=isMobile?[19,25]:[23,31]; duration=[8.6,10.8]; scale=[1.04,1.18]; opacity=[.50,.72];}
      else if(tierRoll>.46){tier='medium'; sizeRange=isMobile?[14,19]:[16,22]; duration=[10.6,13.2]; scale=[.98,1.08]; opacity=[.42,.64];}
      const size=randomNumber(sizeRange[0],sizeRange[1]);
      const durationValue=randomNumber(duration[0],duration[1]);
      const evenDelay=-((index/Math.max(1,total))*durationValue + randomNumber(0,.9));
      const jitter=randomNumber(-(100/laneCount)*0.24,(100/laneCount)*0.24);
      const direction=index%2===0?1:-1;
      const driftBase=isMobile?12:18;
      petal.className='petal '+tier;
      petal.style.left=(laneBase+jitter).toFixed(3)+'vw';
      petal.style.width=size.toFixed(1)+'px';
      petal.style.height=(size*randomNumber(.92,1.16)).toFixed(1)+'px';
      petal.style.setProperty('--petal-color',randomItem(colors));
      petal.style.setProperty('--petal-opacity',randomNumber(opacity[0],opacity[1]).toFixed(2));
      petal.style.setProperty('--fall-duration',durationValue.toFixed(2)+'s');
      petal.style.setProperty('--fall-delay',evenDelay.toFixed(2)+'s');
      petal.style.setProperty('--petal-scale',randomNumber(scale[0],scale[1]).toFixed(2));
      petal.style.setProperty('--drift-1',randomNumber(4,driftBase)*direction+'px');
      petal.style.setProperty('--drift-2',randomNumber(driftBase*0.7,driftBase*1.6)*(-direction)+'px');
      petal.style.setProperty('--drift-3',randomNumber(driftBase*1.1,driftBase*2.1)*direction+'px');
      petal.style.setProperty('--drift-end',randomNumber(driftBase*1.2,driftBase*2.5)*(-direction)+'px');
      const startRotation=randomNumber(-45,45);
      petal.style.setProperty('--rotation-start',startRotation.toFixed(0)+'deg');
      petal.style.setProperty('--rotate-end',(startRotation+randomNumber(290,430)).toFixed(0)+'deg');
      frag.appendChild(petal);
      index++;
    }
  }
  container.appendChild(frag);
}
function randomNumber(min,max){return Math.random()*(max-min)+min;}
function randomItem(array){return array[Math.floor(Math.random()*array.length)];}