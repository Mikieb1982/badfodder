/* Wigan compatibility shim: keep the proven renderer until the shared miniature pass is safe here. */
(function(root){
  'use strict';
  const clay=root.BadFodderClay;
  if(!clay||clay.__wiganStableRenderer)return;
  const configure=clay.configure.bind(clay);
  const preload=clay.preload.bind(clay);
  clay.configure=options=>{
    if(options?.key==='wigan')return false;
    return configure(options);
  };
  clay.preload=key=>key==='wigan'?Promise.resolve(false):preload(key);
  Object.defineProperty(clay,'__wiganStableRenderer',{value:true});
})(typeof window!=='undefined'?window:globalThis);
