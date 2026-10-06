/* Shared finite barricade integrity rules, extracted unchanged from Cable Street. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderBarricades=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const MAX_CONSTRUCTION_TIER=4;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function validBarricade(b){
    return !!b&&Number.isFinite(b.maxIntegrity)&&b.maxIntegrity>0&&Number.isFinite(b.integrity)&&
      Number.isInteger(b.constructionTier)&&b.constructionTier>=0&&b.constructionTier<=MAX_CONSTRUCTION_TIER&&
      Array.isArray(b.occupiedWorkPositions);
  }

  function createBarricade({id,maxIntegrity,constructionTier=0,integrity=0,workPositions=0}={}){
    if(typeof id!=='string'||!id.trim())throw new Error('Barricade requires an id.');
    if(!Number.isFinite(maxIntegrity)||maxIntegrity<=0)throw new Error('Barricade requires a positive finite maxIntegrity.');
    if(!Number.isFinite(integrity))throw new Error('Barricade integrity must be finite.');
    if(!Number.isInteger(constructionTier)||constructionTier<0||constructionTier>MAX_CONSTRUCTION_TIER){
      throw new Error('Barricade constructionTier must be an integer from 0 to '+MAX_CONSTRUCTION_TIER+'.');
    }
    if(!Number.isInteger(workPositions)||workPositions<0)throw new Error('Barricade workPositions must be a non-negative integer.');
    const current=clamp(integrity,0,maxIntegrity);
    return{
      id:id.trim(),
      maxIntegrity,
      integrity:current,
      constructionTier,
      breached:current<=0,
      occupiedWorkPositions:Array(workPositions).fill(null)
    };
  }

  function reinforceBarricade(barricade,value,{tierIncrease=0}={}){
    if(!validBarricade(barricade)||!Number.isFinite(value)||value<=0)return 0;
    if(!Number.isInteger(tierIncrease)||tierIncrease<0)return 0;
    const before=barricade.integrity;
    barricade.integrity=clamp(barricade.integrity+value,0,barricade.maxIntegrity);
    if(barricade.integrity>before&&tierIncrease){
      barricade.constructionTier=clamp(
        barricade.constructionTier+tierIncrease,
        0,MAX_CONSTRUCTION_TIER
      );
    }
    barricade.breached=barricade.integrity<=0;
    return barricade.integrity-before;
  }

  function damageBarricade(barricade,value){
    if(!validBarricade(barricade)||!Number.isFinite(value)||value<=0)return 0;
    const before=barricade.integrity;
    barricade.integrity=clamp(barricade.integrity-value,0,barricade.maxIntegrity);
    barricade.breached=barricade.integrity<=0;
    return before-barricade.integrity;
  }

return{validBarricade,createBarricade,reinforceBarricade,damageBarricade};
});
