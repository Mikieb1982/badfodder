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
    overlay.setAttribute('aria-label','Campaign introduction');
    overlay.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;';

    const video=document.createElement('video');
    video.src=root.BadFodderAssetUrl?.(ASSET)||ASSET;
    video.preload='metadata';
    video.setAttribute('preload','metadata');
    video.autoplay=true;
    video.playsInline=true;
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    video.style.cssText='width:100%;height:100%;object-fit:contain;background:#000;';

    const skip=document.createElement('button');
    skip.type='button';
    skip.textContent='SKIP';
    skip.setAttribute('aria-label','Skip campaign introduction');
    skip.style.cssText='position:absolute;right:max(18px,env(safe-area-inset-right));top:max(18px,env(safe-area-inset-top));z-index:2;border:1px solid rgba(255,255,255,.55);border-radius:999px;background:rgba(20,20,20,.62);color:#fff;padding:10px 16px;font:700 13px/1 system-ui,sans-serif;letter-spacing:.08em;cursor:pointer;backdrop-filter:blur(4px);';

    let finished=false;
    let loadTimer=null;
    const finish=()=>{
      if(finished)return;
      finished=true;active=false;
      clearTimeout(loadTimer);
      video.pause();
      overlay.remove();
      done?.();
    };

    video.addEventListener('ended',finish,{once:true});
    // Some mobile browsers stop on the last frame without dispatching ended.
    video.addEventListener('timeupdate',()=>{
      if(Number.isFinite(video.duration)&&video.duration>0&&video.currentTime>=video.duration-0.15)finish();
    });
    video.addEventListener('error',finish,{once:true});
    // Never trap mobile users behind a video that cannot load or decode.
    video.addEventListener('playing',()=>clearTimeout(loadTimer));
    loadTimer=setTimeout(()=>{if(!finished&&video.readyState<2)finish();},12000);
    skip.addEventListener('click',finish);
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape')finish();});
    overlay.append(video,skip);
    document.body.appendChild(overlay);
    root.BadFodderMusic?.audio?.pause();
    skip.focus({preventScroll:true});
    const attempt=video.play();
    if(attempt&&typeof attempt.catch==='function')attempt.catch(()=>{
      if(finished)return;
      // Mobile autoplay with audio may be blocked. Require an explicit tap,
      // rather than leaving a paused black video with browser controls.
      const start=document.createElement('button');
      start.type='button';
      start.textContent='PLAY INTRO';
      start.setAttribute('aria-label','Play campaign introduction');
      start.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;padding:16px 26px;border:2px solid #f1dfaa;border-radius:8px;background:#202a20;color:#f1dfaa;font:700 16px system-ui,sans-serif;cursor:pointer;';
      start.addEventListener('click',()=>{
        const retry=video.play();
        if(retry&&typeof retry.then==='function')retry.then(()=>start.remove()).catch(()=>{start.textContent='TAP TO PLAY';});
      });
      overlay.appendChild(start);
      clearTimeout(loadTimer);
      loadTimer=setTimeout(()=>{if(!finished&&video.readyState<2)finish();},12000);
    });
  }

  // The mission controller owns playback and advances directly to the briefing.
  // Do not intercept the Campaign button: that would replay the intro.
  root.BadFodderCampaignIntro={play};
})(typeof window!=='undefined'?window:globalThis);
