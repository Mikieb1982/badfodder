'use strict';
const base=require('./cable-street-navigation-fixture.cjs');

const mapData={
  key:'cable-street-interaction-fixture',
  historicalObjects:{
    barricades:[
      {
        id:'B',
        label:'Main defence',
        maxIntegrity:30,
        integrity:8,
        constructionTier:1,
        workPositions:2,
        x:180,y:90,
        points:base.barricade.points,
        interactionRadius:42
      }
    ],
    materials:[
      {id:'timber-1',type:'timber',label:'Timber',x:138,y:90,interactionRadius:28}
    ],
    civilians:[
      {id:'resident-1',label:'Resident',x:112,y:90,optional:true,interactionRadius:30,exitSeconds:.3}
    ],
    formations:[
      {
        id:'police-1',
        label:'Police line',
        width:30,
        objective:'B',
        state:'approach',
        x:312,y:90,
        targetX:212,targetY:90,
        withdrawX:338,withdrawY:90,
        speed:70,
        stopDistance:14,
        haltSeconds:.2,
        regroupSeconds:.2,
        damageRate:22
      }
    ]
  }
};

module.exports={...base,mapData};
