/* Full-screen campaign intro shown before the campaign briefing. */
(function(root){
  'use strict';
  const ASSET='assets/menu/rabbitscampaign.mp4';
  let active=false;

  function play(done){
    if(active||typeof document==='undefined'){done?.();return;}
    active=true;
    const overlay=document.createElement('div');
    overlay.id='campaignIntro';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Campaign introduction');
    overlay.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;';

    const video=document.createElement('video');
    const original=root.BadFodderAssetUrl?.(ASSET)||ASSET;
    video.src=root.BadFodderCampaignVideoMobile||original;
    video.preload='auto';
    video.setAttribute('preload','auto');
    video.autoplay=true;
    video.playsInline=true;
    video.muted=false;
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    video.style.cssText='width:100%;height:100%;object-fit:contain;background:#000;';

    const loading=document.createElement('div');
    loading.textContent='LOADING INTRO…';
    loading.setAttribute('aria-live','polite');
    loading.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#ddd;font:700 13px/1 system-ui,sans-serif;letter-spacing:.12em;pointer-events:none;';

    const skip=document.createElement('button');
    skip.type='button';
    skip.textContent='SKIP';
    skip.setAttribute('aria-label','Skip campaign introduction');
    skip.style.cssText='position:absolute;right:max(18px,env(safe-area-inset-right));top:max(18px,env(safe-area-inset-top));z-index:3;border:1px solid rgba(255,255,255,.55);border-radius:999px;background:rgba(20,20,20,.62);color:#fff;padding:10px 16px;font:700 13px/1 system-ui,sans-serif;letter-spacing:.08em;cursor:pointer;backdrop-filter:blur(4px);';

    let finished=false,loadTimer=null,startButton=null,fellBack=false;
    const finish=()=>{
      if(finished)return;
      finished=true;active=false;clearTimeout(loadTimer);
      video.pause();overlay.remove();done?.();
    };
    const armTimeout=()=>{clearTimeout(loadTimer);loadTimer=setTimeout(()=>{if(!finished&&video.readyState<2)finish();},12000);};
    const showPlay=()=>{
      if(finished||startButton)return;
      startButton=document.createElement('button');startButton.type='button';startButton.textContent='PLAY INTRO';startButton.setAttribute('aria-label','Play campaign introduction');
      startButton.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:3;padding:16px 26px;border:2px solid #f1dfaa;border-radius:8px;background:#202a20;color:#f1dfaa;font:700 16px system-ui,sans-serif;cursor:pointer;';
      startButton.addEventListener('click',()=>{loading.textContent='LOADING INTRO…';const retry=video.play();if(retry&&typeof retry.then==='function')retry.then(()=>{startButton?.remove();startButton=null;loading.hidden=true}).catch(()=>{if(startButton)startButton.textContent='TAP TO PLAY';armTimeout()})});
      overlay.appendChild(startButton);startButton.focus({preventScroll:true});
    };
    const tryOriginal=()=>{
      if(fellBack||video.src===original||finished)return false;
      fellBack=true;video.pause();video.src=original;video.load();armTimeout();const retry=video.play();if(retry?.catch)retry.catch(showPlay);return true;
    };

    video.addEventListener('loadeddata',()=>{loading.hidden=true;clearTimeout(loadTimer)},{once:true});
    video.addEventListener('playing',()=>{loading.hidden=true;startButton?.remove();startButton=null;clearTimeout(loadTimer)});
    video.addEventListener('ended',finish,{once:true});
    video.addEventListener('timeupdate',()=>{if(Number.isFinite(video.duration)&&video.duration>0&&video.currentTime>=video.duration-.15)finish()});
    video.addEventListener('error',()=>{if(!tryOriginal())finish()});
    video.addEventListener('stalled',armTimeout);
    skip.addEventListener('click',finish);
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape')finish()});
    overlay.append(video,loading,skip);document.body.appendChild(overlay);
    root.BadFodderMusic?.audio?.pause();
    armTimeout();
    try{video.load()}catch(_){}
    const attempt=video.play();
    if(attempt&&typeof attempt.catch==='function')attempt.catch(showPlay);
  }

  // The mission controller owns playback and advances directly to the briefing.
  root.BadFodderCampaignIntro={play};
})(typeof window!=='undefined'?window:globalThis);
