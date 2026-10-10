/* Full-screen campaign intro shown immediately after Campaign is pressed. */
(function(root){
  'use strict';
  const ASSET='assets/menu/rabbitscampaign.mp4';
  let active=false;

  function play(done){
    if(active||typeof document==='undefined'){done?.();return;}
    active=true;
    const mobile=!!(root.matchMedia?.('(pointer: coarse)')?.matches||/Android|iPhone|iPad|iPod|Mobile/i.test(root.navigator?.userAgent||''));
    const original=root.BadFodderAssetUrl?.(ASSET)||ASSET;
    const mobileAsset=root.BadFodderCampaignVideoMobile||original;

    const overlay=document.createElement('div');
    overlay.id='campaignIntro';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Campaign introduction');
    overlay.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:manipulation;';

    const video=document.createElement('video');
    video.preload='metadata';video.setAttribute('preload','metadata');video.playsInline=true;video.muted=false;video.controls=false;video.disablePictureInPicture=true;
    video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');video.setAttribute('controlslist','nodownload noplaybackrate noremoteplayback');video.setAttribute('x-webkit-airplay','deny');
    video.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;opacity:0;transition:opacity .14s ease;';

    const loading=document.createElement('div');
    loading.setAttribute('aria-live','polite');loading.textContent='LOADING INTRO…';
    loading.style.cssText='position:relative;z-index:3;padding:10px 14px;border-radius:999px;background:rgba(15,18,15,.74);color:rgba(255,255,255,.78);font:800 11px/1 system-ui,sans-serif;letter-spacing:.12em;pointer-events:none;';

    // This card is recovery UI only. It is never shown during the normal Campaign flow.
    const card=document.createElement('div');card.hidden=true;
    card.style.cssText='position:relative;z-index:4;width:min(86vw,430px);padding:26px 24px 22px;border:1px solid rgba(240,217,142,.35);border-radius:12px;background:linear-gradient(180deg,rgba(27,35,27,.97),rgba(13,18,14,.97));box-shadow:0 22px 60px rgba(0,0,0,.58);color:#f2e6bf;text-align:center;font-family:system-ui,sans-serif;';
    const title=document.createElement('div');title.textContent='CAMPAIGN INTRO';title.style.cssText='font:900 clamp(23px,6vw,34px)/1 system-ui,sans-serif;letter-spacing:.035em;';
    const copy=document.createElement('div');copy.textContent='Playback was blocked on this device. Tap once to continue the introduction.';copy.style.cssText='margin:12px auto 18px;max-width:340px;font:600 13px/1.45 system-ui,sans-serif;color:rgba(255,255,255,.72);';
    const watch=document.createElement('button');watch.type='button';watch.textContent='PLAY INTRO';watch.setAttribute('aria-label','Play campaign introduction');watch.style.cssText='display:block;width:100%;min-height:50px;border:2px solid #f0d98e;border-radius:8px;background:#273227;color:#f4e7bc;font:850 14px/1 system-ui,sans-serif;letter-spacing:.075em;cursor:pointer;';
    const continueBtn=document.createElement('button');continueBtn.type='button';continueBtn.textContent='CONTINUE TO BRIEFING';continueBtn.style.cssText='display:block;width:100%;min-height:46px;margin-top:9px;border:1px solid rgba(255,255,255,.22);border-radius:8px;background:rgba(255,255,255,.045);color:rgba(255,255,255,.76);font:750 12px/1 system-ui,sans-serif;letter-spacing:.055em;cursor:pointer;';
    const status=document.createElement('div');status.setAttribute('aria-live','polite');status.style.cssText='margin-top:13px;min-height:14px;font:700 10px/1.3 system-ui,sans-serif;letter-spacing:.1em;color:rgba(255,255,255,.48);';
    card.append(title,copy,watch,continueBtn,status);

    const skip=document.createElement('button');skip.type='button';skip.textContent='SKIP';skip.setAttribute('aria-label','Skip campaign introduction');
    skip.style.cssText='position:absolute;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));z-index:5;min-height:44px;border:1px solid rgba(255,255,255,.5);border-radius:999px;background:rgba(15,18,15,.78);color:#fff;padding:0 16px;font:800 12px/1 system-ui,sans-serif;letter-spacing:.08em;cursor:pointer;backdrop-filter:blur(5px);';

    let finished=false,timer=null,playing=false,source='',fallbackTried=false;
    const clearTimer=()=>{if(timer){clearTimeout(timer);timer=null;}};
    const finish=()=>{if(finished)return;finished=true;active=false;clearTimer();try{video.pause()}catch(_){}overlay.remove();done?.();};
    const assign=src=>{source=src;try{video.pause()}catch(_){}video.removeAttribute('src');video.src=src;try{video.load()}catch(_){};};
    const showRecovery=(message='PLAYBACK BLOCKED')=>{
      playing=false;clearTimer();loading.hidden=true;video.style.opacity='0';card.hidden=false;status.textContent=message;watch.disabled=false;
      try{watch.focus({preventScroll:true})}catch(_){}
    };
    const armTimeout=()=>{clearTimer();timer=setTimeout(()=>{if(!finished&&!playing)recover('INTRO TOOK TOO LONG TO START')},18000);};
    const recover=message=>{
      clearTimer();
      if(!fallbackTried&&source!==original){fallbackTried=true;start(original,true);return;}
      showRecovery(message||'INTRO COULD NOT START');
    };
    const start=(src=source||original,isFallback=false)=>{
      if(finished)return;
      card.hidden=true;loading.hidden=false;loading.textContent=isFallback?'LOADING INTRO…':'LOADING INTRO…';video.style.opacity='0';playing=false;
      if(source!==src)assign(src);else if(!video.src)assign(src);
      let attempt=null;try{attempt=video.play()}catch(_){}
      armTimeout();
      if(attempt&&typeof attempt.then==='function')attempt.then(()=>{playing=true;clearTimer();card.hidden=true;loading.hidden=true;video.style.opacity='1';}).catch(()=>recover('TAP PLAY TO CONTINUE'));
      else if(!video.paused){playing=true;clearTimer();card.hidden=true;loading.hidden=true;video.style.opacity='1'}else recover('TAP PLAY TO CONTINUE');
    };

    watch.onclick=()=>start(source||original,true);continueBtn.onclick=finish;skip.onclick=finish;
    video.addEventListener('playing',()=>{playing=true;clearTimer();card.hidden=true;loading.hidden=true;video.style.opacity='1';});
    video.addEventListener('waiting',()=>{if(finished)return;playing=false;loading.hidden=false;loading.textContent='BUFFERING…';armTimeout();});
    video.addEventListener('ended',finish,{once:true});
    video.addEventListener('timeupdate',()=>{if(Number.isFinite(video.duration)&&video.duration>0&&video.currentTime>=video.duration-.12)finish()});
    video.addEventListener('error',()=>recover('INTRO COULD NOT PLAY ON THIS DEVICE'));
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape')finish()});

    overlay.append(video,loading,card,skip);document.body.appendChild(overlay);
    root.BadFodderMusic?.audio?.pause();

    // play() is called synchronously from the Campaign button handler. That original
    // user gesture is deliberately reused here so iOS/Android can begin audible video
    // without inserting a second confirmation menu.
    start(mobile?mobileAsset:original);
  }

  root.BadFodderCampaignIntro={play};
})(typeof window!=='undefined'?window:globalThis);
