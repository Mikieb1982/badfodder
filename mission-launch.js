/* Launch mode for campaign play versus standalone mission selection.
   Browser: window.BadFodderMissionLaunch
   Node: require('./mission-launch.js') */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderMissionLaunch=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const KEY='badfodder.launch.v1';
  const AUTO_KEY='badfodder.launch.autostart.v1';

  function create({storage,missions,campaign}){
    if(!storage)throw new Error('Mission launch requires session storage.');
    if(!Array.isArray(missions))throw new Error('Mission launch requires mission definitions.');
    if(!campaign)throw new Error('Mission launch requires campaign state.');

    function read(){
      try{
        const raw=JSON.parse(storage.getItem(KEY)||'null');
        if(raw&&raw.mode==='select'&&Number.isInteger(raw.index)){
          const selected=missions[raw.index];
          if(selected&&selected.playable)return{mode:'select',index:raw.index};
        }
      }catch(_){}
      return{mode:'campaign',index:null};
    }

    let launch=read();

    function mode(){return launch.mode}
    function isCampaign(){return launch.mode==='campaign'}
    function isSelection(){return launch.mode==='select'}

    function currentIndex(){
      if(isSelection())return launch.index;
      const index=Number(campaign.state.current)||0;
      return Math.max(0,Math.min(missions.length-1,index));
    }

    function current(){
      return missions[currentIndex()]||missions[0];
    }

    function useCampaign(){
      launch={mode:'campaign',index:null};
      try{storage.removeItem(KEY)}catch(_){}
      return current();
    }

    function select(index){
      index=index|0;
      const selected=missions[index];
      if(!selected||!selected.playable)return false;
      launch={mode:'select',index};
      try{storage.setItem(KEY,JSON.stringify(launch))}catch(_){}
      return true;
    }

    function requestAutoStart(){
      try{storage.setItem(AUTO_KEY,'1')}catch(_){}
    }

    function consumeAutoStart(){
      let pending=false;
      try{
        pending=storage.getItem(AUTO_KEY)==='1';
        storage.removeItem(AUTO_KEY);
      }catch(_){}
      return pending;
    }

    return{
      mode,isCampaign,isSelection,currentIndex,current,
      useCampaign,select,requestAutoStart,consumeAutoStart,
      keys:{launch:KEY,autoStart:AUTO_KEY}
    };
  }

  return{create};
});
