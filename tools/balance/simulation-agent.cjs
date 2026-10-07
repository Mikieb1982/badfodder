'use strict';
const Objectives=require('../../mission-objectives.js');
if(!Objectives.__balanceBarcelonaCompat){
 const create=Objectives.create;
 Objectives.create=function(mission){
  const runtime=create(mission);
  if(mission?.id==='barcelona-1936'&&!runtime.manager.get('evacuate-residents')){
   runtime.manager.add({id:'evacuate-residents',type:'EVACUATE',optional:true,priority:-10,hidden:true,title:'Rescue every resident'});
  }
  return runtime;
 };
 Object.defineProperty(Objectives,'__balanceBarcelonaCompat',{value:true});
}
module.exports=require('./simulation-core.cjs');
