/* Full-screen campaign intro shown before the campaign briefing. */
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
    overlay.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#050705;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:manipulation;';

    const video=document.createElement('video');
    video.preload=mobile?'none':'auto';video.setAttribute('preload',mobile?'none':'auto');video.playsInline=true;video.muted=false;video.controls=false;video.disablePictureInPicture=true;
    video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');video.setAttribute('controlslist','nodownload noplaybackrate noremoteplayback');video.setAttribute('x-webkit-airplay','deny');
    video.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;opacity:0;transition:opacity .18s ease;';

    const card=document.createElement('div');
    card.style.cssText='position:relative;z-index:3;width:min(86vw,430px);padding:28px 24px 24px;border:1px solid rgba(240,217,142,.35);border-radius:12px;background:linear-gradient(180deg,rgba(27,35,27,.97),rgba(13,18,14,.97));box-shadow:0 22px 60px rgba(0,0,0,.58);color:#f2e6bf;text-align:center;font-family:system-ui,sans-serif;';
    const kicker=document.createElement('div');kicker.textContent='IF I CAN SHOOT RABBITS';kicker.style.cssText='font:800 11px/1.2 system-ui,sans-serif;letter-spacing:.16em;opacity:.66;';
    const title=document.createElement('div');title.textContent='CAMPAIGN';title.style.cssText='margin-top:8px;font:900 clamp(26px,7vw,38px)/1 system-ui,sans-serif;letter-spacing:.035em;';
    const copy=document.createElement('div');copy.textContent=mobile?'Tap below to watch the campaign introduction.':'Campaign introduction';copy.style.cssText='margin:12px auto 20px;max-width:330px;font:600 13px/1.45 system-ui,sans-serif;color:rgba(255,255,255,.72);';
    const watch=document.createElement('button');watch.type='button';watch.textContent=mobile?'WATCH INTRO':'PLAY INTRO';watch.setAttribute('aria-label','Play campaign introduction');watch.style.cssText='display:block;width:100%;min-height:50px;border:2px solid #f0d98e;border-radius:8px;background:#273227;color:#f4e7bc;font:850 14px/1 system-ui,sans-serif;letter-spacing:.075em;cursor:pointer;';
    const continueBtn=document.createElement('button');continueBtn.type='button';continueBtn.textContent='CONTINUE WITHOUT VIDEO';continueBtn.style.cssText='display:block;width:100%;min-height:46px;margin-top:9px;border:1px solid rgba(255,255,255,.22);border-radius:8px;background:rgba(255,255,255,.045);color:rgba(255,255,255,.76);font:750 12px/1 system-ui,sans-serif;letter-spacing:.055em;cursor:pointer;';
    const status=document.createElement('div');status.setAttribute('aria-live','polite');status.textContent=mobile?'VIDEO STARTS ONLY AFTER YOUR TAP':'READY';status.style.cssText='margin-top:14px;min-height:15px;font:700 10px/1.3 system-ui,sans-serif;letter-spacing:.11em;color:rgba(255,255,255,.48);';
    card.append(kicker,title,copy,watch,continueBtn,status);

    const skip=document.createElement('button');skip.type='button';skip.textContent='SKIP';skip.setAttribute('aria-label','Skip campaign introduction');
    skip.style.cssText='position:absolute;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));z-index:5;min-height:44px;border:1px solid rgba(255,255,255,.5);border-radius:999px;background:rgba(15,18,15,.78);color:#fff;padding:0 16px;font:800 12px/1 system-ui,sans-serif;letter-spacing:.08em;cursor:pointer;backdrop-filter:blur(5px);';

    let finished=false,timer=null,playing=false,source='',fallbackTried=false;
    const clearTimer=()=>{if(timer){clearTimeout(timer);timer=null;}};
    const finish=()=>{if(finished)return;finished=true;active=false;clearTimer();try{video.pause()}catch(_){}overlay.remove();done?.();};
    const resetCard=(message,label='WATCH INTRO')=>{playing=false;clearTimer();video.style.opacity='0';card.hidden=false;status.textContent=message;watch.textContent=label;watch.disabled=false;watch.focus({preventScroll:true});};
    const assign=src=>{source=src;try{video.pause()}catch(_){}video.removeAttribute('src');video.src=src;try{video.load()}catch(_){};};
    const fail=()=>{
      clearTimer();
      if(!fallbackTried&&source!==original){fallbackTried=true;assign(original);resetCard('MOBILE VERSION COULD NOT PLAY · ORIGINAL VIDEO READY','TRY ORIGINAL VIDEO');return;}
      resetCard('INTRO COULD NOT PLAY ON THIS DEVICE','CONTINUE TO BRIEFING');watch.onclick=finish;
    };
    const armTimeout=()=>{clearTimer();timer=setTimeout(()=>{if(!finished&&!playing)fail()},18000);};
    const beginPlayback=()=>{
      if(finished)return;
      watch.disabled=true;status.textContent='LOADING INTRO…';
      if(!source)assign(mobile?mobileAsset:original);
      let attempt=null;try{attempt=video.play()}catch(_){}
      armTimeout();
      if(attempt&&typeof attempt.then==='function')attempt.then(()=>{playing=true;clearTimer();card.hidden=true;video.style.opacity='1';watch.disabled=false;}).catch(fail);
      else if(!video.paused){playing=true;clearTimer();card.hidden=true;video.style.opacity='1';watch.disabled=false}else fail();
    };

    watch.onclick=beginPlayback;continueBtn.onclick=finish;skip.onclick=finish;
    video.addEventListener('playing',()=>{playing=true;clearTimer();card.hidden=true;video.style.opacity='1';});
    video.addEventListener('waiting',()=>{if(playing){card.hidden=false;copy.textContent='Buffering the introduction…';status.textContent='BUFFERING';watch.hidden=true;continueBtn.textContent='CONTINUE TO BRIEFING';}armTimeout();});
    video.addEventListener('canplay',()=>{if(!playing)status.textContent='READY TO PLAY';},{passive:true});
    video.addEventListener('ended',finish,{once:true});
    video.addEventListener('timeupdate',()=>{if(Number.isFinite(video.duration)&&video.duration>0&&video.currentTime>=video.duration-.12)finish()});
    video.addEventListener('error',fail);
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape')finish()});
    overlay.append(video,card,skip);document.body.appendChild(overlay);
    root.BadFodderMusic?.audio?.pause();

    if(mobile){
      // Do not even request audible media until a real user gesture. This is the most
      // reliable path on iOS Safari, Android Chrome and installed PWAs.
      watch.focus({preventScroll:true});
    }else{
      assign(original);card.hidden=true;video.style.opacity='1';let attempt=null;try{attempt=video.play()}catch(_){}
      armTimeout();
      if(attempt&&typeof attempt.then==='function')attempt.then(()=>{playing=true;clearTimer()}).catch(()=>resetCard('AUTOPLAY BLOCKED · PRESS PLAY','PLAY INTRO'));
      else if(video.paused)resetCard('PRESS PLAY TO WATCH THE INTRO','PLAY INTRO');
    }
  }

  root.BadFodderCampaignIntro={play};
})(typeof window!=='undefined'?window:globalThis);
