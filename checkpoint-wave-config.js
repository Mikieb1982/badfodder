/* Runtime checkpoint escalation profile for the two military missions. */
(function(root){
  'use strict';
  function apply(campaign){
    if(!campaign?.missions||campaign.__largeCheckpointWaves)return campaign;
    const profiles=[
      {
        checkpoint:{style:'siege',count:8,intermission:.45,waves:[{style:'siege',count:14}]},
        brief:'Clear the defenders, form the sandbag position and survive two heavy siege assaults.'
      },
      {
        checkpoint:{style:'pincer',count:8,intermission:.45,waves:[{style:'pincer',count:16},{style:'siege',count:18}]},
        brief:'Take the checkpoint, dig in behind the sandbags and survive three escalating counterattack waves.'
      },
      {
        checkpoint:{style:'siege',count:8,intermission:.4,waves:[{style:'siege',count:18},{style:'pincer',count:20},{style:'last-stand',count:24}]},
        brief:'Take the final checkpoint and make a last stand through four escalating waves attacking from multiple directions.'
      }
    ];
    for(const mission of campaign.missions){
      if(!mission?.playable||!['bad-belzig','wigan'].includes(mission.map)||!Array.isArray(mission.phases))continue;
      mission.phases.slice(0,3).forEach((phase,i)=>{
        if(!phase||!profiles[i])return;
        phase.checkpoint={...profiles[i].checkpoint,waves:profiles[i].checkpoint.waves.map(w=>({...w}))};
        phase.brief=profiles[i].brief;
      });
    }
    Object.defineProperty(campaign,'__largeCheckpointWaves',{value:true,configurable:true});
    return campaign;
  }

  if(root.BadFodderCampaign){apply(root.BadFodderCampaign);return}
  const existing=Object.getOwnPropertyDescriptor(root,'BadFodderCampaign');
  if(!existing||existing.configurable){
    let value=existing&&'value'in existing?existing.value:null;
    Object.defineProperty(root,'BadFodderCampaign',{
      configurable:true,enumerable:true,
      get(){return value},
      set(next){value=apply(next)}
    });
    if(value)apply(value);
  }
  if(typeof module==='object'&&module.exports)module.exports={apply};
})(typeof window!=='undefined'?window:globalThis);
