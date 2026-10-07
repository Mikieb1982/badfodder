/* Launch mode for campaign, standalone and historical missions.
   Browser: window.BadFodderMissionLaunch
   Node: require('./mission-launch.js') */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderMissionLaunch=api;
})(typeof window!=='undefined'?window:globalThis,function(root){
  'use strict';

  const KEY='badfodder.launch.v1';
  const AUTO_KEY='badfodder.launch.autostart.v1';

  function create({storage,missions,campaign,historicalMissions=[],registry=null}){
    if(!storage)throw new Error('Mission launch requires session storage.');
    if(!Array.isArray(missions))throw new Error('Mission launch requires campaign mission definitions.');
    if(!Array.isArray(historicalMissions))throw new Error('Mission launch requires a historical mission list.');
    if(!campaign)throw new Error('Mission launch requires campaign state.');

    const historicalById=new Map(historicalMissions.filter(m=>m&&typeof m.id==='string'&&m.id).map(m=>[m.id,m]));
    const missionRegistry=()=>registry||root?.BadFodderMissionRegistry||null;
    function campaignIndex(ref){
      if(Number.isInteger(ref))return ref;
      if(typeof ref!=='string')return -1;
      let index=missions.findIndex(m=>m.id===ref||m.legacyId===ref);
      if(index>=0)return index;
      const definition=missionRegistry()?.get?.(ref);
      if(!definition)return -1;
      return missions.findIndex(m=>m.id===definition.id||m.legacyId===definition.id||m.map===definition.map?.key||definition.aliases?.includes(m.id));
    }
    function historicalId(ref){
      if(historicalById.has(ref))return ref;
      const definition=missionRegistry()?.get?.(ref);
      if(!definition)return null;
      for(const alias of definition.aliases||[])if(historicalById.has(alias))return alias;
      return historicalById.has(definition.id)?definition.id:null;
    }
    function historicalAvailable(mission){return !!(mission&&mission.playable&&mission.mapReady!==false&&mission.map)}

    function read(){
      try{
        const raw=JSON.parse(storage.getItem(KEY)||'null');
        if(raw&&raw.mode==='select'&&(typeof raw.id==='string'||Number.isInteger(raw.index))){
          const index=typeof raw.id==='string'?campaignIndex(raw.id):raw.index;
          const selected=missions[index];
          if(selected&&selected.playable)return{mode:'select',index,id:selected.id};
        }
        if(raw&&raw.mode==='historical'&&typeof raw.id==='string'){
          const id=historicalId(raw.id),selected=id&&historicalById.get(id);
          if(historicalAvailable(selected))return{mode:'historical',index:null,id};
        }
      }catch(_){}
      return{mode:'campaign',index:null,id:null};
    }

    let launch=read();
    function persist(){try{if(launch.mode==='campaign')storage.removeItem(KEY);else storage.setItem(KEY,JSON.stringify(launch));}catch(_){}}
    function mode(){return launch.mode}
    function isCampaign(){return launch.mode==='campaign'}
    function isSelection(){return launch.mode==='select'}
    function isHistorical(){return current()?.scenario==='historical'||launch.mode==='historical'}
    function currentIndex(){
      if(isSelection())return launch.index;
      if(launch.mode==='historical')return null;
      const requested=Math.max(0,Math.min(missions.length-1,Number(campaign.state.current)||0));
      if(missions[requested]&&missions[requested].playable)return requested;
      for(let i=requested;i>=0;i--)if(missions[i]&&missions[i].playable)return i;
      return missions.findIndex(m=>m&&m.playable);
    }
    function currentId(){if(launch.mode==='historical')return launch.id;const mission=current();return mission?mission.id:null}
    function current(){if(launch.mode==='historical')return historicalById.get(launch.id)||null;const index=currentIndex();return missions[index]||missions[0]||null}
    function useCampaign(){launch={mode:'campaign',index:null,id:null};const resolved=currentIndex();if(resolved>=0&&resolved!==campaign.state.current)campaign.setCurrent(resolved);persist();return current()}
    function select(index){
      index=campaignIndex(index);
      if(!Number.isInteger(index)||index<0)return false;
      const selected=missions[index];
      if(!selected||!selected.playable)return false;
      launch={mode:'select',index,id:selected.id};persist();return true;
    }
    function selectHistorical(id){
      id=historicalId(id);
      if(!id)return false;
      const selected=historicalById.get(id);
      if(!historicalAvailable(selected))return false;
      launch={mode:'historical',index:null,id};persist();return true;
    }
    function requestAutoStart(){try{storage.setItem(AUTO_KEY,'1')}catch(_){}}
    function consumeAutoStart(){let pending=false;try{pending=storage.getItem(AUTO_KEY)==='1';storage.removeItem(AUTO_KEY);}catch(_){}return pending;}
    return{mode,isCampaign,isSelection,isHistorical,currentIndex,currentId,current,useCampaign,select,selectHistorical,requestAutoStart,consumeAutoStart,historicalAvailable,keys:{launch:KEY,autoStart:AUTO_KEY}};
  }
  return{create};
});
