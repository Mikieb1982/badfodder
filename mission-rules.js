/* Shared mission objective rules for If I Can Shoot Rabbits.
   Browser: window.BadFodderMissionRules
   Node: require('./mission-rules.js') */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BadFodderMissionRules=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const OBJECTIVE_TYPES=Object.freeze([
    'REACH','CLEAR','HOLD','CAPTURE','FIND','SEARCH','RESCUE','ESCORT','EVACUATE',
    'GARRISON','INTERACT','SABOTAGE','DESTROY','DEFEND','ESCAPE','SURVIVE','OPTIONAL'
  ]);
  const OBJECTIVE_STATES=Object.freeze(['PENDING','ACTIVE','COMPLETED','FAILED','SKIPPED']);
  const TYPE_ALIASES=Object.freeze({
    reach:'REACH',clear:'CLEAR',eliminate:'CLEAR',hold:'HOLD',capture:'CAPTURE',
    'secure-zone':'CAPTURE','eliminate-and-reach':'CAPTURE',find:'FIND',search:'SEARCH',
    rescue:'RESCUE',escort:'ESCORT',evacuate:'EVACUATE',garrison:'GARRISON',interact:'INTERACT',
    sabotage:'SABOTAGE',destroy:'DESTROY',defend:'DEFEND',protect:'DEFEND',escape:'ESCAPE',
    survive:'SURVIVE',optional:'OPTIONAL'
  });
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));

  function normalizeType(type){
    if(typeof type!=='string'||!type.trim())throw new Error('Objective type is required.');
    const raw=type.trim();
    const upper=raw.toUpperCase();
    if(OBJECTIVE_TYPES.includes(upper))return upper;
    const alias=TYPE_ALIASES[raw.toLowerCase()];
    if(alias)return alias;
    throw new Error('Unsupported objective type: '+type);
  }

  function objectiveId(def,index){
    if(typeof def.id==='string'&&def.id.trim())return def.id.trim();
    const seed=String(def.title||def.brief||def.text||'objective-'+(index+1))
      .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    return seed||'objective-'+(index+1);
  }

  function list(value){
    if(value==null)return[];
    return(Array.isArray(value)?value:[value]).filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim());
  }

  function normalizeObjective(def,index=0){
    if(!def||typeof def!=='object')throw new Error('Objective definition must be an object.');
    const type=normalizeType(def.type||'INTERACT');
    const status=typeof def.status==='string'?def.status.toUpperCase():'PENDING';
    if(!OBJECTIVE_STATES.includes(status))throw new Error('Unsupported objective state: '+status);
    const hidden=!!def.hidden;
    return{
      ...clone(def),
      id:objectiveId(def,index),
      type,
      legacyType:typeof def.legacyType==='string'?def.legacyType:typeof def.type==='string'?def.type:null,
      title:String(def.title||def.brief||def.text||'Objective'),
      text:String(def.text||def.brief||def.title||'Complete the objective.'),
      status,
      optional:!!def.optional||type==='OPTIONAL',
      hidden,
      discovered:def.discovered==null?!hidden:!!def.discovered,
      priority:Number.isFinite(def.priority)?def.priority:0,
      requires:list(def.requires),
      next:list(def.next),
      marker:def.marker?clone(def.marker):null,
      director:def.director?clone(def.director):null,
      phase:def.phase==null?null:def.phase,
      meta:def.meta?clone(def.meta):{}
    };
  }

  function validateObjectives(definitions){
    if(!Array.isArray(definitions)||!definitions.length)throw new Error('Mission requires at least one objective.');
    const normalized=definitions.map(normalizeObjective);
    const ids=new Set();
    for(const objective of normalized){
      if(ids.has(objective.id))throw new Error('Duplicate objective id: '+objective.id);
      ids.add(objective.id);
    }
    for(const objective of normalized){
      for(const dependency of objective.requires){
        if(!ids.has(dependency))throw new Error('Unknown objective dependency: '+dependency);
      }
      for(const nextId of objective.next){
        if(!ids.has(nextId))throw new Error('Unknown chained objective: '+nextId);
      }
    }
    for(const field of ['requires','next']){
      const visiting=new Set(),visited=new Set();
      const byId=new Map(normalized.map(o=>[o.id,o]));
      function visit(id){
        if(visiting.has(id))throw new Error('Cyclic objective '+field+': '+id);
        if(visited.has(id))return;
        visiting.add(id);for(const ref of byId.get(id)[field])visit(ref);
        visiting.delete(id);visited.add(id);
      }
      for(const id of ids)visit(id);
    }
    return normalized;
  }

  class ObjectiveManager{
    constructor(definitions=[],options={}){
      this.options={autoActivate:options.autoActivate!==false,autoAdvance:options.autoAdvance!==false};
      this.listeners=new Set();
      this.objectives=[];
      this.setObjectives(definitions,{activate:this.options.autoActivate});
    }

    setObjectives(definitions,{activate=this.options.autoActivate}={}){
      this.objectives=definitions.length?validateObjectives(definitions):[];
      if(activate&&this.objectives.length&&!this.objectives.some(o=>o.status==='ACTIVE')){
        const first=this.objectives.find(o=>o.status==='PENDING'&&this._eligible(o));
        if(first){first.status='ACTIVE';first.discovered=true}
      }
      this._emit('reset',null);
      return this;
    }

    onChange(listener){
      if(typeof listener!=='function')return()=>{};
      this.listeners.add(listener);
      return()=>this.listeners.delete(listener);
    }

    _emit(action,objective,detail=null){
      if(!this.listeners.size)return;
      const event={action,objective:objective?clone(objective):null,detail:clone(detail),state:this.missionState()};
      for(const listener of this.listeners)listener(event);
    }

    _get(id){return this.objectives.find(o=>o.id===id)||null}
    _require(id){const objective=this._get(id);if(!objective)throw new Error('Unknown objective: '+id);return objective}
    _eligible(objective){return objective.requires.every(id=>{
      const dependency=this._get(id);
      return dependency?.status==='COMPLETED'||dependency?.optional&&['FAILED','SKIPPED'].includes(dependency.status);
    })}

    get(id){const objective=this._get(id);return objective?clone(objective):null}
    all(){return clone(this.objectives)}
    active(){return clone(this.objectives.filter(o=>o.status==='ACTIVE').sort((a,b)=>b.priority-a.priority))}
    visible(){return clone(this.objectives.filter(o=>!o.hidden||o.discovered))}
    current(){return this.active()[0]||null}

    activate(id,{discover=true}={}){
      const objective=this._require(id);
      if(objective.status==='COMPLETED'||objective.status==='FAILED'||objective.status==='SKIPPED')return this.get(id);
      if(!this._eligible(objective))throw new Error('Objective dependencies are incomplete: '+id);
      objective.status='ACTIVE';
      if(discover)objective.discovered=true;
      this._emit('activate',objective);
      return this.get(id);
    }

    discover(id,changes={}){
      const objective=this._require(id);
      objective.discovered=true;
      if(changes.title!=null)objective.title=String(changes.title);
      if(changes.text!=null)objective.text=String(changes.text);
      if(changes.brief!=null)objective.text=String(changes.brief);
      this._emit('discover',objective,changes);
      return this.get(id);
    }

    updateText(id,changes){
      const objective=this._require(id);
      if(typeof changes==='string')objective.text=changes;
      else if(changes&&typeof changes==='object'){
        if(changes.title!=null)objective.title=String(changes.title);
        if(changes.text!=null)objective.text=String(changes.text);
        if(changes.brief!=null)objective.text=String(changes.brief);
      }
      this._emit('update-text',objective,changes);
      return this.get(id);
    }

    complete(id,detail=null){
      const objective=this._require(id);
      if(['COMPLETED','FAILED','SKIPPED'].includes(objective.status))return this.get(id);
      if(objective.status!=='ACTIVE')throw new Error('Objective is not active: '+id);
      objective.status='COMPLETED';
      objective.discovered=true;
      if(detail&&detail.text)objective.text=String(detail.text);
      this._emit('complete',objective,detail);
      if(this.options.autoAdvance)this._activateNext(objective);
      return this.get(id);
    }

    fail(id,detail=null){
      const objective=this._require(id);
      if(['COMPLETED','FAILED','SKIPPED'].includes(objective.status))return this.get(id);
      objective.status='FAILED';
      objective.discovered=true;
      if(detail&&detail.text)objective.text=String(detail.text);
      this._emit('fail',objective,detail);
      if(objective.optional&&this.options.autoAdvance)this._activateNext(objective);
      return this.get(id);
    }

    skip(id,detail=null){
      const objective=this._require(id);
      if(!objective.optional)throw new Error('Only optional objectives can be skipped: '+id);
      if(['COMPLETED','FAILED','SKIPPED'].includes(objective.status))return this.get(id);
      objective.status='SKIPPED';
      this._emit('skip',objective,detail);
      if(this.options.autoAdvance)this._activateNext(objective);
      return this.get(id);
    }

    _activateNext(objective){
      const explicit=objective.next.map(id=>this._get(id)).filter(Boolean);
      if(explicit.length){
        for(const next of explicit)if(next.status==='PENDING'&&this._eligible(next))this.activate(next.id);
        return;
      }
      const index=this.objectives.indexOf(objective);
      const candidates=[...this.objectives.slice(index+1),...this.objectives.slice(0,index)];
      for(const next of candidates){
        if(next.status==='PENDING'&&this._eligible(next)){this.activate(next.id);break}
      }
    }

    add(definition,{beforeId=null,afterId=null,activate=false}={}){
      const objective=normalizeObjective(definition,this.objectives.length);
      if(this._get(objective.id))throw new Error('Duplicate objective id: '+objective.id);
      for(const dependency of objective.requires)if(!this._get(dependency))throw new Error('Unknown objective dependency: '+dependency);
      let index=this.objectives.length;
      if(beforeId!=null){index=this.objectives.findIndex(o=>o.id===beforeId);if(index<0)throw new Error('Unknown objective: '+beforeId)}
      else if(afterId!=null){index=this.objectives.findIndex(o=>o.id===afterId);if(index<0)throw new Error('Unknown objective: '+afterId);index++}
      const candidate=this.all();candidate.splice(index,0,objective);
      validateObjectives(candidate);
      if(activate&&!this._eligible(objective))throw new Error('Objective dependencies are incomplete: '+objective.id);
      this.objectives.splice(index,0,objective);
      this._emit('add',objective);
      if(activate)this.activate(objective.id);
      return this.get(objective.id);
    }

    remove(id){
      const index=this.objectives.findIndex(o=>o.id===id);
      if(index<0)return null;
      const [objective]=this.objectives.splice(index,1);
      for(const other of this.objectives){
        other.requires=other.requires.filter(ref=>ref!==id);
        other.next=other.next.filter(ref=>ref!==id);
      }
      this._emit('remove',objective);
      if(this.options.autoAdvance&&!this.current()&&!this.missionState().failed)this._activateNext(objective);
      return clone(objective);
    }

    replace(id,definition,{preserveStatus=true,activate=false}={}){
      const index=this.objectives.findIndex(o=>o.id===id);
      if(index<0)throw new Error('Unknown objective: '+id);
      const previous=this.objectives[index];
      const next=normalizeObjective({...previous,...definition,legacyType:definition.type||previous.legacyType,id:definition.id||id},index);
      if(next.id!==id&&this._get(next.id))throw new Error('Duplicate objective id: '+next.id);
      if(preserveStatus&&definition.status==null)next.status=previous.status;
      if(definition.discovered==null)next.discovered=previous.discovered;
      const candidate=this.all();candidate[index]=next;
      for(const other of candidate){
        other.requires=other.requires.map(ref=>ref===id?next.id:ref);
        other.next=other.next.map(ref=>ref===id?next.id:ref);
      }
      validateObjectives(candidate);
      if(activate&&!next.requires.every(ref=>candidate.find(o=>o.id===ref)?.status==='COMPLETED'))throw new Error('Objective dependencies are incomplete: '+next.id);
      this.objectives=candidate;
      this._emit('replace',next,{previous});
      if(activate)this.activate(next.id);
      return this.get(next.id);
    }

    reprioritize(id,priority){
      if(!Number.isFinite(priority))throw new Error('Objective priority must be finite.');
      const objective=this._require(id);objective.priority=priority;this._emit('reprioritize',objective);return this.get(id);
    }

    setMarker(id,marker){
      const objective=this._require(id);objective.marker=marker?clone(marker):null;this._emit('marker',objective);return this.get(id);
    }

    setDirector(id,director){
      const objective=this._require(id);objective.director=director?clone(director):null;this._emit('director',objective);return this.get(id);
    }

    missionState(){
      const required=this.objectives.filter(o=>!o.optional);
      const failed=required.some(o=>o.status==='FAILED');
      const complete=required.length>0&&required.every(o=>o.status==='COMPLETED');
      return{complete,failed,active:this.active().map(o=>o.id),remaining:required.filter(o=>o.status!=='COMPLETED').map(o=>o.id)};
    }

    directorContext(){
      const objective=this.current();
      if(!objective)return{objective:null};
      return{objective:{id:objective.id,type:objective.type,status:objective.status,phase:objective.phase,optional:objective.optional,marker:clone(objective.marker),behavior:clone(objective.director)}};
    }

    snapshot(){return{version:1,objectives:clone(this.objectives)}}
    restore(snapshot){
      if(!snapshot||snapshot.version!==1||!Array.isArray(snapshot.objectives))throw new Error('Unsupported objective snapshot.');
      this.setObjectives(snapshot.objectives,{activate:false});
      this._emit('restore',null);
      return this;
    }
  }

  function createObjectiveManager(definitions,options){return new ObjectiveManager(definitions,options)}

  function pointInCircle(x,y,z){
    return !!z&&Math.hypot(x-z.x,y-z.y)<=z.r;
  }

  function phaseDefenders(phase,enemies){
    if(!phase||!phase.defenderGroup)return null;
    return enemies.filter(e=>e.alive&&e.objectiveGroup===phase.defenderGroup);
  }

  function evaluatePhase({phase,living,enemies,zones,scale=1}){
    living=Array.isArray(living)?living:[];
    enemies=Array.isArray(enemies)?enemies:[];
    zones=zones||{};
    const remaining=enemies.filter(e=>e.alive).length;
    if(!phase)return{complete:true,ready:true,status:'Mission complete.'};

    const zone=phase.zone?zones[phase.zone]||null:null;
    const inZone=!!(zone&&living.some(s=>pointInCircle(s.x,s.y,zone)));

    if(phase.type==='reach'){
      return{complete:inZone,ready:inZone,inZone,status:phase.brief};
    }

    if(phase.type==='secure-zone'||phase.type==='eliminate-and-reach'){
      const assigned=phaseDefenders(phase,enemies);
      const radius=(phase.radius||160)*scale;
      const defenders=assigned||(
        zone?enemies.filter(e=>e.alive&&Math.hypot(e.x-zone.x,e.y-zone.y)<radius):[]
      );
      const contestRadius=(phase.contestRadius||75)*scale;
      const contesters=zone&&defenders.length===0
        ?enemies.filter(e=>e.alive&&Math.hypot(e.x-zone.x,e.y-zone.y)<contestRadius)
        :[];
      const ready=inZone&&defenders.length===0&&contesters.length===0;

      let detail='';
      if(defenders.length){
        const label=phase.type==='eliminate-and-reach'?'final defender':'assigned defender';
        detail=defenders.length+' '+label+(defenders.length===1?'':'s')+' remain.';
      }else if(!inZone){
        detail='Area clear — move the squad into the objective.';
      }else if(contesters.length){
        detail='Objective contested by '+contesters.length+' nearby hostile'+(contesters.length===1?'':'s')+'.';
      }else{
        detail=phase.hold?'Area clear — hold position.':'Area secured.';
      }

      return{
        complete:ready&&!phase.hold,
        ready,inZone,contested:contesters.length>0,
        defenders:defenders.length,contesters:contesters.length,
        status:phase.brief+' '+detail
      };
    }

    if(phase.type==='eliminate'){
      const ready=remaining===0;
      return{complete:ready,ready,status:phase.brief+' '+remaining+' hostile'+(remaining===1?'':'s')+' remain.'};
    }

    if(phase.type==='destroy'||phase.type==='rescue'||phase.type==='protect'){
      return{complete:false,ready:false,status:phase.brief};
    }

    return{complete:false,ready:false,status:phase.brief||phase.title||'Complete the objective.'};
  }

  function advanceHold(phase,result,holdTime,dt){
    if(!phase||!phase.hold)return{holdTime:0,complete:!!result.complete};
    const next=result.ready?Math.min(phase.hold,holdTime+dt):0;
    return{holdTime:next,complete:next>=phase.hold};
  }

  function phaseStatus(phase,result,holdTime){
    if(!phase||!result)return'Mission complete.';
    if(result.ready&&phase.hold){
      const left=Math.max(0,phase.hold-holdTime);
      return result.status+' Hold '+left.toFixed(1)+'s.';
    }
    return result.status;
  }

  return{
    OBJECTIVE_TYPES,OBJECTIVE_STATES,TYPE_ALIASES,normalizeType,normalizeObjective,validateObjectives,
    ObjectiveManager,createObjectiveManager,
    pointInCircle,phaseDefenders,evaluatePhase,advanceHold,phaseStatus
  };
});
