/* Launch mode for campaign, standalone and historical missions.
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

  function create({storage,missions,campaign,historicalMissions=[]}){
    if(!storage)throw new Error('Mission launch requires session storage.');
    if(!Array.isArray(missions))throw new Error('Mission launch requires campaign mission definitions.');
    if(!Array.isArray(historicalMissions))throw new Error('Mission launch requires a historical mission list.');
    if(!campaign)throw new Error('Mission launch requires campaign state.');

    const historicalById=new Map(
      historicalMissions
        .filter(m=>m&&typeof m.id==='string'&&m.id)
        .map(m=>[m.id,m])
    );

    function historicalAvailable(mission){
      return !!(mission&&mission.playable&&mission.mapReady!==false&&mission.map);
    }

    function read(){
      try{
        const raw=JSON.parse(storage.getItem(KEY)||'null');
        if(raw&&raw.mode==='select'&&Number.isInteger(raw.index)){
          const selected=missions[raw.index];
          if(selected&&selected.playable)return{mode:'select',index:raw.index,id:null};
        }
        if(raw&&raw.mode==='historical'&&typeof raw.id==='string'){
          const selected=historicalById.get(raw.id);
          if(historicalAvailable(selected))return{mode:'historical',index:null,id:raw.id};
        }
      }catch(_){}
      return{mode:'campaign',index:null,id:null};
    }

    let launch=read();

    function persist(){
      try{
        if(launch.mode==='campaign')storage.removeItem(KEY);
        else storage.setItem(KEY,JSON.stringify(launch));
      }catch(_){}
    }

    function mode(){return launch.mode}
    function isCampaign(){return launch.mode==='campaign'}
    function isSelection(){return launch.mode==='select'}
    function isHistorical(){return launch.mode==='historical'}

    function currentIndex(){
      if(isSelection())return launch.index;
      if(isHistorical())return null;
      const requested=Math.max(0,Math.min(missions.length-1,Number(campaign.state.current)||0));
      if(missions[requested]&&missions[requested].playable)return requested;
      for(let i=requested;i>=0;i--)if(missions[i]&&missions[i].playable)return i;
      return missions.findIndex(m=>m&&m.playable);
    }

    function currentId(){
      if(isHistorical())return launch.id;
      const mission=current();
      return mission?mission.id:null;
    }

    function current(){
      if(isHistorical())return historicalById.get(launch.id)||null;
      const index=currentIndex();
      return missions[index]||missions[0]||null;
    }

    function useCampaign(){
      launch={mode:'campaign',index:null,id:null};
      const resolved=currentIndex();
      if(resolved>=0&&resolved!==campaign.state.current)campaign.setCurrent(resolved);
      persist();
      return current();
    }

    function select(index){
      index=index|0;
      const selected=missions[index];
      if(!selected||!selected.playable)return false;
      launch={mode:'select',index,id:null};
      persist();
      return true;
    }

    function selectHistorical(id){
      if(typeof id!=='string'||!id)return false;
      const selected=historicalById.get(id);
      if(!historicalAvailable(selected))return false;
      launch={mode:'historical',index:null,id};
      persist();
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
      mode,isCampaign,isSelection,isHistorical,currentIndex,currentId,current,
      useCampaign,select,selectHistorical,requestAutoStart,consumeAutoStart,
      historicalAvailable,
      keys:{launch:KEY,autoStart:AUTO_KEY}
    };
  }

  return{create};
});
