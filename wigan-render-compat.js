/* Wigan compatibility shim: keep the proven renderer until the shared miniature pass is safe here. */
(function(root){
  'use strict';
  const clay=root.BadFodderClay;
  if(clay&&!clay.__wiganStableRenderer){
    const configure=clay.configure.bind(clay);
    const preload=clay.preload.bind(clay);
    clay.configure=options=>{
      if(options?.key==='wigan')return false;
      return configure(options);
    };
    clay.preload=key=>key==='wigan'?Promise.resolve(false):preload(key);
    Object.defineProperty(clay,'__wiganStableRenderer',{value:true});
  }

  // Wigan's resistance-network actors are runtime story actors, not map spawns.
  // Keep them out of the civilian list until startup connectivity validation is complete.
  const civilians=root.BadFodderCivilians;
  if(civilians?.create&&!civilians.__wiganStartupCompat){
    const create=civilians.create.bind(civilians);
    civilians.create=function(options={}){
      const runtime=create(options),list=options.getCivilians?.(),network=runtime?.network;
      if(!network||!Array.isArray(list))return runtime;
      const actors=list.filter(c=>c?.networkActor);
      if(!actors.length)return runtime;
      for(let i=list.length-1;i>=0;i--)if(list[i]?.networkActor)list.splice(i,1);
      let attached=false;
      const update=runtime.update.bind(runtime),snapshot=runtime.snapshot.bind(runtime);
      const attach=()=>{if(attached)return;list.push(...actors);attached=true;};
      runtime.update=dt=>{attach();update(dt);};
      runtime.snapshot=()=>{
        if(attached)return snapshot();
        list.push(...actors);
        try{return snapshot();}finally{list.splice(list.length-actors.length,actors.length);}
      };
      return runtime;
    };
    Object.defineProperty(civilians,'__wiganStartupCompat',{value:true});
  }
})(typeof window!=='undefined'?window:globalThis);
