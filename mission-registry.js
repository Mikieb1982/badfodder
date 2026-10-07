/* Authoritative shared integration registry for playable missions. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./mission-definition.js'):root.BadFodderMissionDefinition);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderMissionRegistry=api;
})(typeof window!=='undefined'?window:globalThis,function(Definition){
  'use strict';
  if(!Definition?.create)throw new Error('Mission definition module is unavailable.');
  const definitions=[
    Definition.create({key:'bad-belzig',id:'bad-belzig',aliases:['belzig'],classification:'fictional',modules:['town-map.js','bad-belzig-data.js'],map:{key:'bad-belzig'},runtime:{type:'standard'},characters:{identity:'belzig'},selection:{buttonIds:['menuMissionBad']}}),
    Definition.create({key:'wigan',id:'wigan',classification:'fictional',modules:['wigan-map.js','wigan-details.js','wigan-scenery.js?v=20261003-upgrade-1'],map:{key:'wigan'},runtime:{type:'standard'},characters:{identity:'wigan'},selection:{buttonIds:['menuMissionWigan']}}),
    Definition.create({key:'cable-street',id:'cable-street',aliases:['cable-street-1936'],classification:'historical',modules:['cable-street-map.js?v=20261003-tactical-1','cable-street-runtime.js','cable-street-interactions.js?v=20261004-adaptive-1','cable-street-director.js?v=20261004-adaptive-1','cable-street-crowd.js?v=20261004-adaptive-1','cable-street-art.js?v=20261003-visual-2'],map:{key:'cable-street',global:'CABLE_STREET_MAP'},runtime:{type:'specialised',global:'BadFodderCableStreet'},characters:{identity:'cable-street'},selection:{buttonIds:['menuHistoricalCable']}}),
    Definition.create({key:'barcelona',id:'barcelona-1936',aliases:['barcelona'],classification:'historical',modules:['barcelona-map.js','barcelona-art.js','friendly-resistance.js','barcelona-runtime.js'],map:{key:'barcelona',global:'BARCELONA_MAP'},runtime:{type:'specialised',global:'BadFodderBarcelona'},characters:{identity:'barcelona'},selection:{buttonIds:['menuMissionBarcelona']}})
  ];
  const byRef=new Map();
  for(const definition of definitions){
    for(const ref of [...definition.aliases,definition.map.key])byRef.set(String(ref).toLowerCase(),definition);
  }
  function refOf(value){
    if(value&&typeof value==='object')return value.id||value.key||(typeof value.map==='string'?value.map:value.map?.key)||null;
    return value;
  }
  function get(value){const ref=refOf(value);return ref==null?null:byRef.get(String(ref).toLowerCase())||null}
  function has(value){return !!get(value)}
  function all(){return [...definitions]}
  function modules(value){return get(value)?.modules||[]}
  function map(value){return get(value)?.map||null}
  function runtime(value){return get(value)?.runtime||null}
  function mapEntries(scope=root){
    const out={};
    for(const definition of definitions){
      const globalName=definition.map.global;
      if(globalName&&scope&&scope[globalName])out[definition.map.key]=scope[globalName];
    }
    return out;
  }
  return{all,get,has,modules,map,runtime,mapEntries};
});
