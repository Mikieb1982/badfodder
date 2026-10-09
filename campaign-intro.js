/* Full-screen campaign intro shown before the campaign briefing. */
(function(root){
  'use strict';
  const ASSET='assets/menu/rabbitscampaign.mp4';
  let active=false;

  function play(done){
    if(active||typeof document==='undefined'){done?.();return;}
    active=true;
    const mobile=!!(root.matchMedia?.('(pointer: coarse)')?.matches||/Android|iPhone|iPad|iPod|Mobile/i.test(root.navigator?.userAgent||''));
    const overlay=document.createElement('div');
    overlay.id='campaignIntro';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Campaign introduction');
    overlay.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:manipulation;';

    const video=document.createElement('video');
    const original=root.BadFodderAssetUrl?.(ASSET)||ASSET;
    const mobileAsset=root.BadFodderCampaignVideoMobile||original;
    let source=mobile?mobileAsset:original;
    let usedFallback=source===original;
    video.preload=mobile?'metadata':'auto';
    video.setAttribute('preload',mobile?'metadata':'auto');
    video.playsInline=true;
    video.muted=false;
    video.controls=false;
    video.disablePictureInPicture=true;
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    video.setAttribute('controlslist','nodownload noplaybackrate noremoteplayback');
    video.setAttribute('x-webkit-airplay','deny');
    video.style.cssText='width:100%;height:100%;object-fit:contain;background:#000;';

    const loading=document.createElement('div');
    loading.textContent=mobile?'INTRO READY':'LOADING INTRO…';
    loading.setAttribute('aria-live','polite');
    loading.style.cssText='position:absolute;left:50%;top:calc(50% + 48px);transform:translate(-50%,-50%);z-index:2;color:#ddd;font:700 12px/1 system-ui,sans-serif;letter-spacing:.12em;pointer-events:none;';

    const skip=document.createElement('button');
    skip.type='button';
    skip.textContent='SKIP';
    skip.setAttribute('aria-label','Skip campaign introduction');
    skip.style.cssText='position:absolute;right:max(18px,env(safe-area-inset-right));top:max(18px,env(safe-area-inset-top));z-index:4;border:1px solid rgba(255,255,255,.55);border-radius:999px;background:rgba(20,20,20,.72);color:#fff;padding:11px 17px;font:700 13px/1 system-ui,sans-serif;letter-spacing:.08em;cursor:pointer;backdrop-filter:blur(4px);';

    const playButton=document.createElement('button');
    playButton.type='button';
    playButton.textContent=mobile?'TAP TO PLAY INTRO':'PLAY INTRO';
    playButton.setAttribute('aria-label','Play campaign introduction');
    playButton.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:4;min-width:190px;padding:17px 26px;border:2px solid #f1dfaa;border-radius:10px;background:rgba(27,35,27,.94);color:#f1dfaa;font:800 16px/1 system-ui,sans-serif;letter-spacing:.06em;cursor:pointer;box-shadow:0 12px 32px rgba(0,0,0,.5);';

    let finished=false,loadTimer=null,playing=false;
    const clearLoadTimer=()=>{if(loadTimer){clearTimeout(loadTimer);loadTimer=null;}};
    const finish=()=>{
      if(finished)return;
      finished=true;active=false;clearLoadTimer();
      try{video.pause()}catch(_){}
      overlay.remove();done?.();
    };
    const setSource=src=>{
      source=src;
      try{video.pause()}catch(_){}
      video.removeAttribute('src');
      video.src=src;
      try{video.load()}catch(_){}
    };
    const failToContinue=()=>{
      clearLoadTimer();
      loading.textContent='INTRO UNAVAILABLE';loading.hidden=false;
      playButton.textContent='CONTINUE TO BRIEFING';playButton.hidden=false;
      playButton.onclick=finish;
      playButton.focus({preventScroll:true});
    };
    const retryOriginal=()=>{
      if(usedFallback||original===source){failToContinue();return;}
      usedFallback=true;loading.textContent='LOADING FALLBACK…';loading.hidden=false;setSource(original);
      playButton.textContent='TAP TO PLAY INTRO';playButton.hidden=false;playButton.onclick=attemptUserPlay;
      playButton.focus({preventScroll:true});
    };
    const armPlaybackTimeout=()=>{
      clearLoadTimer();
      loadTimer=setTimeout(()=>{if(!finished&&!playing)retryOriginal();},15000);
    };
    function attemptUserPlay(){
      if(finished)return;
      loading.textContent='LOADING INTRO…';loading.hidden=false;playButton.disabled=true;
      let attempt;
      try{attempt=video.play()}catch(_){attempt=null;}
      if(attempt&&typeof attempt.then==='function'){
        attempt.then(()=>{playing=true;clearLoadTimer();playButton.hidden=true;playButton.disabled=false;loading.hidden=true;}).catch(()=>{playButton.disabled=false;retryOriginal();});
      }else if(!video.paused){playing=true;playButton.hidden=true;loading.hidden=true;clearLoadTimer();}
      else{playButton.disabled=false;retryOriginal();}
      armPlaybackTimeout();
    }

    video.addEventListener('canplay',()=>{if(!playing){loading.textContent=mobile?'TAP TO PLAY':'READY';loading.hidden=false;}},{passive:true});
    video.addEventListener('playing',()=>{playing=true;clearLoadTimer();loading.hidden=true;playButton.hidden=true;playButton.disabled=false;});
    video.addEventListener('waiting',()=>{if(playing){loading.textContent='BUFFERING…';loading.hidden=false;}armPlaybackTimeout();});
    video.addEventListener('stalled',()=>{loading.textContent='BUFFERING…';loading.hidden=false;armPlaybackTimeout();});
    video.addEventListener('ended',finish,{once:true});
    video.addEventListener('timeupdate',()=>{if(Number.isFinite(video.duration)&&video.duration>0&&video.currentTime>=video.duration-.12)finish();});
    video.addEventListener('error',retryOriginal);
    skip.addEventListener('click',finish);
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape')finish();});

    playButton.onclick=attemptUserPlay;
    overlay.append(video,loading,playButton,skip);document.body.appendChild(overlay);
    root.BadFodderMusic?.audio?.pause();
    setSource(source);

    // Mobile Safari/Chrome are most reliable when audible video starts from an explicit tap.
    // Desktop can still attempt autoplay and falls back to the same button if blocked.
    if(mobile){
      playButton.hidden=false;playButton.focus({preventScroll:true});
    }else{
      playButton.hidden=true;loading.textContent='LOADING INTRO…';loading.hidden=false;
      let attempt;
      try{attempt=video.play()}catch(_){attempt=null;}
      if(attempt&&typeof attempt.then==='function')attempt.then(()=>{playing=true;loading.hidden=true;clearLoadTimer();}).catch(()=>{playButton.hidden=false;playButton.focus({preventScroll:true});});
      else if(video.paused){playButton.hidden=false;playButton.focus({preventScroll:true});}
      armPlaybackTimeout();
    }
  }

  // The mission controller owns playback and advances directly to the briefing.
  root.BadFodderCampaignIntro={play};
})(typeof window!=='undefined'?window:globalThis);
