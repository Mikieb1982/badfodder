/* If I Can Shoot Rabbits campaign definition and persistent campaign progress. */
(function(){
'use strict';

const KEY='badfodder.campaign.v1';

const missions=[
  {
    id:1,title:'Belzig, 1945',environment:'temperate-town',map:'bad-belzig',squadSize:4,playable:true,
    phases:[
      {type:'secure-zone',zone:'post',defenderGroup:'post',hold:1.0,contestRadius:72,title:'Secure the Postdistanzsäule',brief:'Move up Bahnhofstraße, clear the small Postdistanzsäule patrol, then hold the position.'},
      {type:'secure-zone',zone:'castle',defenderGroup:'castle',hold:1.4,contestRadius:105,title:'Secure Burg Eisenhardt',brief:'Clear the castle defenders, enter the Burg Eisenhardt objective area and hold it briefly.'},
      {type:'eliminate-and-reach',zone:'market',defenderGroup:'market',hold:1.6,contestRadius:100,title:'Take Marktplatz',brief:'Defeat the Marktplatz defenders, reach Rathaus and hold the square to finish the mission.'}
    ]
  },
  {
    id:2,title:'Wigan, 1941',environment:'wigan-town',map:'wigan',squadSize:4,playable:true,
    phases:[
      {type:'secure-zone',zone:'tudor',defenderGroup:'tudor',hold:1.0,contestRadius:75,title:'Tudor Breakout',brief:'Clear the Tudor House opening defenders and hold the New Market Street end of town.'},
      {type:'secure-zone',zone:'grandArcade',defenderGroup:'grandArcade',hold:1.3,contestRadius:95,title:'Town Centre Sweep',brief:'Choose your route through Market Place and the side streets, defeat the Grand Arcade defenders and secure the centre.'},
      {type:'eliminate-and-reach',zone:'wallgate',defenderGroup:'wallgate',hold:1.6,contestRadius:90,title:'Station Run',brief:'Defeat the station defenders, reach the Wallgate and North Western gateway and hold extraction. King Street supplies are optional.'}
    ]
  },
  {
    id:3,title:'Cold Reception',environment:'snow-village',squadSize:4,playable:false,
    phases:[
      {type:'rescue',target:'hostages',title:'Rescue the villagers',brief:'Reach and release the hostages.'},
      {type:'protect',target:'civilians',title:'Hold the village',brief:'Protect the civilian buildings during the counterattack.'}
    ]
  },
  {
    id:4,title:'Thin Ice',environment:'snow-river',squadSize:4,playable:false,
    phases:[
      {type:'reach',zone:'bridge',title:'Cross the frozen river',brief:'Move the squad across the exposed river crossing.'},
      {type:'destroy',target:'bunkers',title:'Break the bunker line',brief:'Destroy the defensive bunkers covering the pass.'},
      {type:'eliminate',title:'Clear the pass',brief:'Eliminate the remaining defenders.'}
    ]
  },
  {
    id:5,title:'Green Hell',environment:'jungle',squadSize:5,playable:false,
    phases:[
      {type:'reach',zone:'camp',title:'Find the camp',brief:'Move through dense jungle and locate the enemy camp.'},
      {type:'eliminate',title:'Clear the camp',brief:'Eliminate enemy troops in the camp.'}
    ]
  },
  {
    id:6,title:'River Rats',environment:'jungle-river',squadSize:5,playable:false,
    phases:[
      {type:'rescue',target:'hostages',title:'Free the prisoners',brief:'Rescue prisoners held beside the river.'},
      {type:'destroy',target:'boats',title:'Destroy the patrol boats',brief:'Destroy enemy river craft before they escape.'},
      {type:'reach',zone:'landing',title:'Reach the landing zone',brief:'Move the squad and rescued prisoners to the landing zone.'}
    ]
  },
  {
    id:7,title:'Canopy Fire',environment:'jungle',squadSize:5,playable:false,
    phases:[
      {type:'protect',target:'village',title:'Protect the village',brief:'Defend civilian structures from the attack.'},
      {type:'destroy',target:'artillery',title:'Silence the guns',brief:'Destroy the artillery position firing on the village.'}
    ]
  },
  {
    id:8,title:'Temple Run',environment:'jungle-ruins',squadSize:5,playable:false,
    phases:[
      {type:'reach',zone:'ruins',title:'Enter the ruins',brief:'Reach the ruined temple complex.'},
      {type:'eliminate',title:'Clear the ruins',brief:'Eliminate defenders inside the ruins.'},
      {type:'rescue',target:'team',title:'Recover the missing team',brief:'Find and rescue the missing reconnaissance team.'}
    ]
  },
  {
    id:9,title:'Broken Road',environment:'temperate-rural',squadSize:5,playable:false,
    phases:[
      {type:'protect',target:'convoy',title:'Escort the convoy',brief:'Protect the convoy along the main road.'},
      {type:'destroy',target:'roadblock',title:'Break the roadblock',brief:'Destroy the fortified roadblock.'}
    ]
  },
  {
    id:10,title:'Town Without Pity',environment:'temperate-town',squadSize:6,playable:false,
    phases:[
      {type:'rescue',target:'civilians',title:'Evacuate civilians',brief:'Reach civilians trapped in the town centre.'},
      {type:'eliminate',title:'Clear the centre',brief:'Eliminate hostile forces occupying the streets.'},
      {type:'protect',target:'civic-building',title:'Protect the civic hall',brief:'Keep the civic building intact during the final attack.'}
    ]
  },
  {
    id:11,title:'Rail Head',environment:'industrial',squadSize:6,playable:false,
    phases:[
      {type:'reach',zone:'rail-yard',title:'Enter the rail yard',brief:'Break into the enemy-controlled rail yard.'},
      {type:'destroy',target:'fuel-depot',title:'Destroy the fuel depot',brief:'Destroy the fuel storage tanks.'},
      {type:'destroy',target:'train',title:'Stop the train',brief:'Disable the enemy supply train.'}
    ]
  },
  {
    id:12,title:'High Ground',environment:'mountain',squadSize:6,playable:false,
    phases:[
      {type:'reach',zone:'summit',title:'Take the summit',brief:'Fight uphill and reach the summit position.'},
      {type:'protect',target:'radio-team',title:'Hold the summit',brief:'Protect the radio team while they transmit.'}
    ]
  },
  {
    id:13,title:'Bog Standard',environment:'marsh',squadSize:6,playable:false,
    phases:[
      {type:'reach',zone:'causeway',title:'Cross the marsh',brief:'Navigate the marsh and reach the raised causeway.'},
      {type:'rescue',target:'downed-crew',title:'Recover the crew',brief:'Find and rescue the downed aircrew.'},
      {type:'reach',zone:'extraction',title:'Extract',brief:'Escort the crew to extraction.'}
    ]
  },
  {
    id:14,title:'Stone Cold',environment:'mountain-fort',squadSize:6,playable:false,
    phases:[
      {type:'destroy',target:'gates',title:'Breach the gates',brief:'Destroy the fortress gates.'},
      {type:'eliminate',title:'Clear the fortress',brief:'Eliminate defenders inside the fortress.'}
    ]
  },
  {
    id:15,title:'Night Shift',environment:'night-industrial',squadSize:6,playable:false,
    phases:[
      {type:'destroy',target:'generators',title:'Cut the power',brief:'Destroy the power generators.'},
      {type:'rescue',target:'hostages',title:'Free the hostages',brief:'Rescue hostages before enemy reinforcements arrive.'},
      {type:'reach',zone:'extraction',title:'Get out',brief:'Reach extraction with the hostages.'}
    ]
  },
  {
    id:16,title:'Dust Up',environment:'desert',squadSize:7,playable:false,
    phases:[
      {type:'reach',zone:'oasis',title:'Reach the oasis',brief:'Cross open ground and secure the oasis.'},
      {type:'eliminate',title:'Clear the patrols',brief:'Eliminate mobile patrols around the oasis.'}
    ]
  },
  {
    id:17,title:'Heat Stroke',environment:'desert-town',squadSize:7,playable:false,
    phases:[
      {type:'protect',target:'water-plant',title:'Protect the water plant',brief:'Prevent the water plant from being destroyed.'},
      {type:'destroy',target:'armour',title:'Destroy enemy armour',brief:'Destroy the vehicles threatening the town.'},
      {type:'eliminate',title:'Clear the town',brief:'Eliminate remaining hostile forces.'}
    ]
  },
  {
    id:18,title:'Long Sand',environment:'desert-dunes',squadSize:7,playable:false,
    phases:[
      {type:'destroy',target:'communications',title:'Destroy communications',brief:'Knock out the desert communications station.'},
      {type:'reach',zone:'rendezvous',title:'Reach rendezvous',brief:'Reach the rendezvous before enemy patrols close in.'}
    ]
  },
  {
    id:19,title:'Fortune Favours',environment:'desert-fort',squadSize:7,playable:false,
    phases:[
      {type:'rescue',target:'prisoners',title:'Release the prisoners',brief:'Free prisoners held inside the desert fort.'},
      {type:'destroy',target:'armoury',title:'Destroy the armoury',brief:'Destroy the ammunition stores.'},
      {type:'reach',zone:'escape',title:'Escape the fort',brief:'Get the squad and prisoners clear of the fort.'}
    ]
  },
  {
    id:20,title:'Black Gold',environment:'desert-industrial',squadSize:7,playable:false,
    phases:[
      {type:'protect',target:'civilian-site',title:'Protect the refinery workers',brief:'Keep the civilian work area intact.'},
      {type:'destroy',target:'enemy-depot',title:'Destroy the military depot',brief:'Destroy the enemy depot without wrecking civilian structures.'}
    ]
  },
  {
    id:21,title:'Home Front',environment:'temperate-city',squadSize:8,playable:false,
    phases:[
      {type:'rescue',target:'civilians',title:'Rescue trapped civilians',brief:'Reach civilians trapped behind enemy lines.'},
      {type:'protect',target:'hospital',title:'Protect the hospital',brief:'Prevent damage to the hospital during the counterattack.'},
      {type:'eliminate',title:'Clear the district',brief:'Eliminate remaining hostile troops.'}
    ]
  },
  {
    id:22,title:'No Way Through',environment:'fortified-valley',squadSize:8,playable:false,
    phases:[
      {type:'destroy',target:'bunkers',title:'Destroy the bunker line',brief:'Destroy the bunker network blocking the valley.'},
      {type:'protect',target:'engineers',title:'Protect the engineers',brief:'Keep the engineers alive while they clear the route.'}
    ]
  },
  {
    id:23,title:'Last Train Out',environment:'industrial-city',squadSize:8,playable:false,
    phases:[
      {type:'rescue',target:'evacuees',title:'Reach the evacuees',brief:'Reach civilians waiting at the station.'},
      {type:'protect',target:'train',title:'Protect the evacuation train',brief:'Defend the train while evacuees board.'},
      {type:'eliminate',title:'Hold the station',brief:'Eliminate the final attacking force.'}
    ]
  },
  {
    id:24,title:'Last Orders',environment:'command-fortress',squadSize:8,playable:false,
    phases:[
      {type:'destroy',target:'command-centre',title:'Destroy command',brief:'Breach and destroy the enemy command centre.'},
      {type:'rescue',target:'prisoners',title:'Free the prisoners',brief:'Release the remaining prisoners.'},
      {type:'eliminate-and-reach',zone:'extraction',title:'Final extraction',brief:'Eliminate resistance and get the surviving squad out.'}
    ]
  }
];

const defaults={current:0,unlocked:0,completed:[]};

function load(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null');
    if(!raw||typeof raw!=='object')return{...defaults,completed:[]};
    return{
      current:Math.max(0,Math.min(missions.length-1,Number(raw.current)||0)),
      unlocked:Math.max(0,Math.min(missions.length-1,Number(raw.unlocked)||0)),
      completed:Array.isArray(raw.completed)?raw.completed.filter(Number.isInteger):[]
    };
  }catch(_){
    return{...defaults,completed:[]};
  }
}

let state=load();

function save(){
  try{localStorage.setItem(KEY,JSON.stringify(state))}catch(_){}
}

function mission(index=state.current){
  return missions[Math.max(0,Math.min(missions.length-1,index))];
}

function setCurrent(index){
  const next=Math.max(0,Math.min(state.unlocked,index|0));
  state.current=next;save();return mission();
}

function complete(index=state.current){
  if(!state.completed.includes(index))state.completed.push(index);
  state.completed.sort((a,b)=>a-b);
  state.unlocked=Math.max(state.unlocked,Math.min(missions.length-1,index+1));
  save();
  return state;
}

function resetProgress(){
  state={...defaults,completed:[]};save();return state;
}

window.BadFodderCampaign={
  missions,
  get state(){return state},
  mission,
  current:()=>mission(state.current),
  setCurrent,
  complete,
  resetProgress,
  save
};
})();
