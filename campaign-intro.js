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
    video.preload='auto';
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
    const finish=()=>{
      if(finished)return;
      finished=true;active=false;
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
    skip.addEventListener('click',finish);
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape')finish();});
    overlay.append(video,skip);
    document.body.appendChild(overlay);
    root.BadFodderMusic?.audio?.pause();
    skip.focus({preventScroll:true});
    const attempt=video.play();
    if(attempt&&typeof attempt.catch==='function')attempt.catch(()=>{video.controls=true;skip.textContent='SKIP INTRO';});
  }

  function install(){
    const button=document.getElementById('menuStart');
    if(!button||button.dataset.campaignIntroBound==='1')return;
    button.dataset.campaignIntroBound='1';
    let bypass=false;
    button.addEventListener('click',event=>{
      if(bypass||root.__testGame)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      play(()=>{
        bypass=true;
        try{button.click()}finally{bypass=false}
      });
    },true);
  }

  root.BadFodderCampaignIntro={play};
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
    else install();
  }
})(typeof window!=='undefined'?window:globalThis);
