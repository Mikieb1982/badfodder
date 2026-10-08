/* If I Can Shoot Rabbits campaign definition and persistent campaign progress. */
(function(){
'use strict';

const KEY='badfodder.campaign.v1';

const missions=[
  {
    id:'bad-belzig',chapter:1,order:1,status:'playable',scenario:'fictional',location:'Bad Belzig',country:'Germany',title:'Bad Belzig',environment:'temperate-town',map:'bad-belzig',squadSize:4,playable:true,factDefaults:{opening_state:'NOT_MET'},
    phases:[
      {type:'secure-zone',zone:'post',defenderGroup:'post',hold:2.5,contestRadius:72,title:'Secure the Postdistanzsäule',brief:'Clear the Postdistanzsäule patrol, enter the checkpoint position and repel the fast frontal counterattack.',checkpoint:{style:'rush',count:3}},
      {type:'secure-zone',zone:'castle',defenderGroup:'castle',hold:2.8,contestRadius:105,title:'Secure Burg Eisenhardt',brief:'Clear the castle defenders, occupy the Burg checkpoint and hold it against a two-sided flanking counterattack.',checkpoint:{style:'pincer',count:4}},
      {type:'eliminate-and-reach',zone:'market',defenderGroup:'market',hold:3.0,contestRadius:100,title:'Take Marktplatz',brief:'Defeat the Marktplatz defenders, occupy the Rathaus checkpoint and survive the final three-pronged assault.',checkpoint:{style:'siege',count:5}}
    ]
  },
  {
    id:'wigan',chapter:2,order:2,status:'playable',scenario:'fictional',location:'Wigan',country:'England',title:'Wigan',environment:'wigan-town',map:'wigan',squadSize:4,playable:true,
    phases:[
      {type:'secure-zone',zone:'tudor',defenderGroup:'tudor',hold:2.5,contestRadius:75,title:'Tudor Breakout',brief:'Clear the Tudor House defenders, enter the checkpoint building and repel the immediate frontal rush.',checkpoint:{style:'rush',count:3}},
      {type:'secure-zone',zone:'grandArcade',defenderGroup:'grandArcade',hold:2.8,contestRadius:95,title:'Town Centre Sweep',brief:'Fight through Market Place, garrison the Grand Arcade checkpoint and hold it against a pincer attack.',checkpoint:{style:'pincer',count:4}},
      {type:'eliminate-and-reach',zone:'wallgate',defenderGroup:'wallgate',hold:3.0,contestRadius:90,title:'Station Run',brief:'Defeat the station defenders, occupy the Wallgate checkpoint and break the final multi-direction counterattack. King Street supplies are optional.',checkpoint:{style:'siege',count:5}}
    ]
  },
  {...window.BadFodderHistoricalMissions.missions.find(m=>m.map==='cable-street'),id:'cable-street',legacyId:'cable-street-1936',status:'playable',campaignLinked:true,chapter:3,order:3},
  {id:'barcelona-1936',title:'Barcelona',location:'Barcelona',country:'Spain',date:'1936-07-19',scenario:'historical',status:'playable',map:'barcelona',squadSize:4,playable:true,chapter:4,order:4,coop:false,actionProfile:{firearms:true,grenades:true,contextualActions:[]},
   phases:[
    {id:'opening',type:'REACH',zone:'junction',eventDriven:true,title:'REACH THE RAMBLA JUNCTION',brief:'Meet your neighbours at the Catalunya approach. Gunfire carries across the city.'},
    {id:'patrol',type:'CLEAR',zone:'patrol',defenderGroup:'patrol',title:'GET RIFLES AND STOP THE PATROL',brief:'Follow NEXT to the printer on the left. E / ACTION equips all four. Then right-click / FIRE to stop the two troops.'},
    {id:'acquire-weapons',type:'INTERACT',zone:'contact',title:'ACQUIRE RIFLES',brief:'Meet the resistance contact outside the printer. E / ACTION: take rifles.'},
    {id:'reach-barricade',type:'REACH',zone:'barricade',title:'REACH THE BARRICADE',brief:'Return to the Rambla approach and cover the side passages.'},
    {id:'build-barricade',type:'INTERACT',zone:'barricade',title:'REINFORCE THE BARRICADE',brief:'Take two loads from nearby material piles. E / ACTION: carry, then reinforce.'},
    {id:'hold-barricade',type:'DEFEND',zone:'barricade',title:'HOLD THE BARRICADE',brief:'Defend alongside your neighbours. Repair breaches and keep the route behind you open.',eventDriven:true},
    {id:'recovery',type:'SURVIVE',zone:'barricade',eventDriven:true,title:'REGROUP AND RECOVER',brief:'Reload, help the wounded and regroup. The first column has pulled back.'},
    {id:'reach-civilians',type:'REACH',zone:'residents',title:'FIND THE CIVILIANS',brief:'Residents are sheltering beside the Santa Anna apartments. Leave a guard or take everyone.'},
    {id:'escort-civilians',type:'EVACUATE',zone:'safe',eventDriven:true,title:'GET THEM TO SAFETY',brief:'E / ACTION: gather residents. Guide them to the western shelter. Santa Anna is exposed; the southern passage offers cover.'},
    {id:'second-route',type:'REACH',zone:'eastern',title:'DEFEND THE EASTERN ROUTE',brief:'A second column is coming up Portal de l’Àngel. Use the apartment corners and cover the crossing.'},
    {id:'hold-east',type:'DEFEND',zone:'eastern',eventDriven:true,title:'STOP THE FLANKING COLUMN',brief:'Hold Santa Anna. Garrison the corners, cover the side street and help the wounded.'},
    {id:'counterattack',type:'CAPTURE',zone:'advance',eventDriven:true,title:'SECURE THE JUNCTION',brief:'They are falling back. Advance with the resistance and secure the Portal junction.'}
   ].map(p=>({...p,text:p.title}))}
];

// Numeric fields remain available to existing runtime consumers. Persisted IDs are authoritative.
const futureChapters=[
 {id:'naples-1943',title:'Naples',location:'Naples',country:'Italy',date:'1943-09'},
 {id:'paris-1944',title:'Paris',location:'Paris',country:'France',date:'1944-08'},
 {id:'munich-1945',title:'Munich',location:'Munich',country:'Germany',date:'1945-04-28'}
].map((m,i)=>({...m,chapter:i+5,order:i+5,scenario:'historical',status:'planned',playable:false}));
const storage=()=>typeof BadFodderStorage!=='undefined'?BadFodderStorage.local:localStorage;
const defaults=()=>({current:0,unlocked:0,completed:[]});
function indexOf(ref){
 if(Number.isInteger(ref)&&ref>=0&&ref<missions.length)return ref;
 return missions.findIndex(m=>m.id===ref||m.legacyId===ref);
}
function migrate(raw){
 if(!raw||typeof raw!=='object')return defaults();
 const modern=raw.campaignSchema===2;
 const resolve=ref=>modern?indexOf(ref):(Number.isInteger(ref)&&ref>=0&&ref<2?ref:-1);
 const completed=[...new Set((Array.isArray(raw.completedIds)&&modern?raw.completedIds:Array.isArray(raw.completed)?raw.completed:[]).map(resolve).filter(i=>i>=0))].sort((a,b)=>a-b);
 let unlocked=resolve(modern?(raw.unlockedId??raw.unlocked):raw.unlocked);
 // Obsolete legacy positions imply Wigan was accessible, never that Cable Street was completed.
 if(!modern&&Number.isInteger(raw.unlocked)&&raw.unlocked>=2)unlocked=1;
 unlocked=Math.max(0,unlocked,...completed.map(i=>Math.min(missions.length-1,i+1)));
 let current=resolve(modern?(raw.currentId??raw.current):raw.current);
 if(current<0)current=unlocked;
 return{current:Math.min(current,unlocked),unlocked,completed};
}
let state;
try{state=migrate(JSON.parse(storage().getItem(KEY)||'null'))}catch(_){state=defaults()}
function save(){
 try{storage().setItem(KEY,JSON.stringify({...state,campaignSchema:2,currentId:missions[state.current].id,unlockedId:missions[state.unlocked].id,completedIds:state.completed.map(i=>missions[i].id)}))}catch(_){}
}
function mission(ref=state.current){return missions[indexOf(ref)]||missions[0]}
function setCurrent(ref){const index=indexOf(ref);state.current=index<0?state.unlocked:Math.min(state.unlocked,index);save();return mission()}
function complete(ref=state.current){
 const index=indexOf(ref);if(index<0||index>state.unlocked)return state;
 if(!state.completed.includes(index))state.completed.push(index);
 state.completed.sort((a,b)=>a-b);
 state.unlocked=Math.max(state.unlocked,Math.min(missions.length-1,index+1));save();return state;
}
function resetProgress(){state=defaults();save();return state}
window.BadFodderCampaign={missions,futureChapters,get state(){return state},mission,indexOf,current:()=>mission(),setCurrent,complete,resetProgress,save};
save();
})();
