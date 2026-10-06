/* Mission identities and lightweight persistent character profiles. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BadFodderIdentities=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const scenarioLabels=Object.freeze({fictional:'FICTIONAL SCENARIO',historical:'BASED ON REAL EVENTS'});
const character=(name,role,coat,hat,weapon,extra={})=>({name,role,coat,hat,weapon,...extra});
const missions={
 barcelona:{key:'barcelona',title:'BARCELONA',location:'CATALUNYA / LA RAMBLA, SPAIN',year:1936,date:'1936-07-19',scenario:'historical',loading:'BARCELONA · 19 JULY 1936',
 background:['19 July 1936. Barcelona wakes to an uprising.','Rebel army units move into the city, attempting to seize key streets and buildings. Workers, civilians, police and forces loyal to the Republic begin resisting them. Barricades rise across Barcelona. Gunfire reaches Plaça de Catalunya and the upper Rambla.','Four neighbours find themselves caught in the middle of it.','They are not soldiers. They have no unit, no orders and almost no weapons. But the streets around their homes are being taken, and waiting is no longer an option.','Somewhere ahead, a local contact has rifles. Beyond him, defenders are gathering at a barricade that may decide whether the rebels can push further down the Rambla.','The streets, characters and events are compressed for gameplay, but the uprising and the struggle for Barcelona are historical.'],
 mission:'Reach the junction and get through the rebel patrol. Find the local contact and secure weapons for your group. Move to the barricade and reinforce the defenders before the next attack arrives. Hold the Rambla approach, protect nearby civilians and keep your route of retreat open.',
 objectives:['REACH THE JUNCTION','ACQUIRE RIFLES','REINFORCE THE BARRICADE','HOLD THE APPROACH','RESCUE THE RESIDENTS','DEFEND THE EASTERN ROUTE','SECURE THE JUNCTION'],final:['YOU ARE ONLY FOUR PEOPLE IN A CITY ALREADY FIGHTING BACK.','HOLD YOUR GROUND.'],victory:['THE POSITION IS SECURE','Across Barcelona, workers, civilians and loyal forces continue fighting.'],failure:'THE APPROACH HAS BEEN LOST',
 characters:[character('Joan','Tram worker','#557a83','flat-cap','pistol',{age:37}),character('Mercè','Textile worker','#866b75','headscarf',null,{age:29,scarf:'#b6aa81'}),character('Antoni','Mechanic','#687f87','cap',null,{age:41,build:'broad'}),character('Isabel','Printer','#b08c63','beret',null,{age:24,waistcoat:true})]},
 'cable-street':{key:'cable-street',title:'CABLE STREET',location:'LONDON',year:1936,scenario:'historical',date:'1936-10-04',loading:'LONDON · 1936',
 background:["Europe has not yet gone to war, but the political conflict that will shape the coming years is already visible on the streets. The British Union of Fascists intends to march through London's East End.","Local residents and anti-fascist demonstrators have gathered in large numbers to stop them. Barricades are appearing across the streets. Police have been ordered to clear a route.","The player controls four fictional residents inside the wider confrontation. There are no soldiers coming to help. There are no rifles or grenades. There is only the street, the crowd and whatever can be used to keep the route closed."],
 mission:'Reach the main barricade. Gather materials and strengthen the defences before the police advance reaches them. When the push begins, hold the line. Repair damaged barricades. Assist people caught in the confrontation. Regroup when necessary. Keep the route closed.',
 objectives:['BUILD THE BARRICADE','WITHSTAND THE POLICE PUSH','REGROUP AND REPAIR','HOLD THE ROUTE'],final:[],
 victory:['THE ROUTE HAS HELD','THE MARCH HAS BEEN TURNED AWAY'],failure:'THE ROUTE HAS BEEN BREACHED',
 characters:[character('Jack','Dock worker','#756349','flat-cap',null,{build:'broad',age:42}),character('Rose','Local organiser','#805e66','beret',null,{scarf:'#d7b780',longCoat:true,hair:'#603b28'}),character('Sam','Tailor','#63778a','cap',null,{waistcoat:true,age:25}),character('Ada','Neighbourhood volunteer','#77694e','headscarf',null,{longCoat:true,hair:'#463029',age:48})]},
 wigan:{key:'wigan',title:'WIGAN',location:'LANCASHIRE, ENGLAND',year:1941,scenario:'fictional',loading:'ENGLAND · 1941',
 background:['Britain has been invaded. Enemy German forces have pushed north and taken control of Wigan town centre and its railway connections.','Regular military units are fighting elsewhere. The defence of the town has fallen to a handful of local volunteers. They are veterans, railway workers, factory workers and ordinary residents.','They are not commandos. They know the streets. That will have to be enough.'],
 mission:'Enter the town centre. Break the enemy position around the Tudor House / New Market Street area. Push towards Market Place and Grand Arcade. Use side streets to outflank defensive positions. Supplies around King Street remain optional. Finally advance towards Wigan Wallgate and Wigan North Western. Remove the remaining defenders and secure the railway gateway.',
 objectives:['BREAK THE TUDOR POSITION','SECURE THE GRAND ARCADE','CLEAR THE TOWN CENTRE','TAKE THE STATIONS'],final:['WIGAN NEEDS YOU.','TRY NOT TO SHOOT THE PUBS.'],
 victory:['WIGAN SECURED','THE STATIONS ARE BACK IN LOCAL HANDS','THE PUBS MOSTLY SURVIVED.'],failure:'WIGAN HAS FALLEN',
 characters:[character('Arthur','First World War veteran','#77764e','brodie','lee-enfield',{age:61,moustache:true,webbing:true}),character('Elsie','Railway worker','#44596a','railway-cap','sten',{age:39,scarf:'#b99863',build:'broad'}),character('Tom','Young volunteer','#897652','flat-cap','lee-enfield',{age:20,webbing:true}),character('George','Factory worker','#725347','cap','thompson',{age:46,waistcoat:true,build:'broad'})]},
 belzig:{key:'belzig',title:'BELZIG',location:'BRANDENBURG, GERMANY',year:1945,scenario:'fictional',loading:'GERMANY · 1945',
 background:['The war is ending. The Nazi regime is collapsing. But armed Nazi loyalists still control Belzig. The castle remains occupied. Patrols control the centre.','Four local resistance fighters have decided that they have waited long enough. They are not an army. Some have fought before. Some have not. Their weapons are stolen, captured, hidden or simply whatever they could find.','Their aim is simple: take their town back before the remaining Nazi forces can organise a proper defence.'],
 mission:'Move through Bahnhofstraße and clear the patrol controlling the Postdistanzsäule area. Push towards Burg Eisenhardt and remove the force occupying the castle. Then advance into the town centre. Break the remaining resistance around the Marktplatz and Rathaus. Secure the square.',
 objectives:['SECURE BAHNHOFSTRASSE','TAKE BURG EISENHARDT','LIBERATE THE MARKTPLATZ','HOLD THE RATHAUS'],final:['THIS IS YOUR TOWN.','TAKE IT BACK.'],
 victory:['BELZIG LIBERATED','THE TOWN IS BACK IN THE HANDS OF ITS PEOPLE'],failure:'THE UPRISING HAS FAILED',
 characters:[character('Karl','Former soldier / deserter','#727359','field-cap','kar98',{age:34,webbing:true,scarf:'#aeb2a2'}),character('Otto','Railway worker','#536274','flat-cap','mp40',{age:43,build:'broad',waistcoat:true}),character('Lotte','Civilian resistance member','#895b45','beret','kar98',{age:28,longCoat:true,scarf:'#d5bd8a',hair:'#634331'}),character('Greta','Resistance organiser','#665e54','headscarf','mp40',{age:52,longCoat:true,webbing:true})]}
};
const CHARACTER_TRAITS=Object.freeze(['RUNNER','STEADY','MEDIC','MECHANIC','LOCAL','ORGANISER','STUBBORN']);
const missionTraits={
 barcelona:['LOCAL','MEDIC','MECHANIC','RUNNER'],
 'cable-street':['STUBBORN','ORGANISER','RUNNER','MEDIC'],
 wigan:['STEADY','LOCAL','RUNNER','STUBBORN'],
 belzig:['STEADY','MECHANIC','RUNNER','ORGANISER']
};
const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
for(const [missionKey,mission] of Object.entries(missions))mission.characters.forEach((profile,index)=>{
 profile.id=missionKey+':'+slug(profile.name);
 profile.occupation=profile.role;
 profile.trait=missionTraits[missionKey]?.[index]||'STEADY';
 profile.healthState='FIT';
 profile.experience=0;
 profile.voiceSet='squad/voice-'+(index+1);
 profile.relationships=[];
 profile.alive=true;
});
for(const mission of Object.values(missions)){
 mission.classification=scenarioLabels[mission.scenario];
 for(const [a,b,type] of [[0,1,'NEIGHBOURS'],[2,3,'FRIENDS']]){
  const left=mission.characters[a],right=mission.characters[b];
  left.relationships.push({id:right.id,type});right.relationships.push({id:left.id,type});
 }
}
const enemyStyles={
 barcelona:[character('Army rifleman','Rebel army','#8a8164','field-cap','mauser',{enemyDetail:true,webbing:true,trousers:'#736f59'}),character('Army patrol','Rebel army','#88836a','cap','mauser',{enemyDetail:true,trousers:'#736951'}),character('Army officer','Rebel army officer','#80745b','officer-cap','pistol',{enemyDetail:true,webbing:true}),character('Support gunner','Rebel army support','#787860','field-cap','hotchkiss',{enemyDetail:true,webbing:true,build:'broad'})],
 belzig:[
  character('Rifleman','Infantry','#606851','stahlhelm','kar98',{webbing:true,enemyDetail:true,trousers:'#51584c',gear:'ammo',age:30}),
  character('SMG trooper','Assault infantry','#555f54','field-cap','mp40',{webbing:true,enemyDetail:true,trousers:'#484e47',gear:'magazines',age:24}),
  character('Officer','Occupation officer','#59614f','officer-cap','pistol',{longCoat:true,webbing:true,enemyDetail:true,trousers:'#343b35',gear:'holster',age:46,moustache:true}),
  character('Support soldier','Heavy infantry','#6d6957','stahlhelm','mg34',{webbing:true,enemyDetail:true,trousers:'#535247',gear:'support',build:'broad',age:38})
 ],
 wigan:[
  character('Street patrol','Urban rifleman','#515d60','stahlhelm','kar98',{webbing:true,enemyDetail:true,trousers:'#444e52',gear:'ammo',age:32}),
  character('Station guard','Urban SMG trooper','#4b5057','field-cap','mp40',{webbing:true,enemyDetail:true,trousers:'#635b4e',gear:'magazines',waistcoat:true,age:27}),
  character('Patrol NCO','Urban commander','#58574e','officer-cap','pistol',{longCoat:true,webbing:true,enemyDetail:true,trousers:'#373e44',gear:'holster',age:48,moustache:true}),
  character('Support gunner','Urban heavy soldier','#655b4e','stahlhelm','mg34',{webbing:true,enemyDetail:true,trousers:'#414950',gear:'support',build:'broad',scarf:'#8a8576',age:36})
 ]
};
const defenders=enemyStyles.belzig;
function get(mission){const key=typeof mission==='string'?mission:mission?.map||(mission?.id===1?'bad-belzig':mission?.id===2?'wigan':mission?.id);return missions[key==='bad-belzig'?'belzig':key==='cable-street-1936'?'cable-street':key==='barcelona-1936'?'barcelona':key]||missions.belzig;}
function profile(mission,index=0){const roster=get(mission).characters;return roster[Math.abs(index|0)%roster.length];}
function runtimeCharacter(mission,index=0,state={}){
 const base=profile(mission,index),alive=state.alive===undefined?base.alive:state.alive!==false;
 return{...base,...state,id:base.id,name:base.name,occupation:base.occupation,role:base.role,trait:base.trait,voiceSet:base.voiceSet,relationships:(state.relationships||base.relationships||[]).map(r=>typeof r==='object'&&r?{...r}:r),experience:Number.isFinite(state.experience)?Math.max(0,state.experience):base.experience,healthState:state.healthState||base.healthState,alive};
}
function modifiers(unit={}){
 const practice=Math.min(24,Math.max(0,Number(unit.experience)||0))*.001;
 return{movement:(unit.trait==='RUNNER'?1.06:1)*(1+practice),spread:(unit.trait==='STEADY'?.92:1)*(1-practice),
  suppression:(unit.trait==='STUBBORN'?.9:1)*(1-practice),aid:unit.trait==='MEDIC'?1.15:1,work:unit.trait==='MECHANIC'?1.1:1};
}
function skin(mission,team,index=0,periodRole){const id=get(mission),i=Math.abs(index|0);if(periodRole==='police')return character('Police','Metropolitan police','#293e50','custodian',null,{webbing:true});if(periodRole==='march')return character('Marcher','Fascist marcher','#343331','cap',null);if(team==='squad')return id.characters[i%4];if(team==='resistance')return {...id.characters[i%4],weapon:'mauser'};if(team==='enemy')return (enemyStyles[id.key]||defenders)[i%4];return {...id.characters[i%4],weapon:null,webbing:false,hat:['flat-cap','beret','cap','headscarf'][i%4]};}
return{missions,scenarioLabels,enemyStyles,CHARACTER_TRAITS,get,profile,runtimeCharacter,modifiers,skin,disclaimer:'This game uses real locations and historical settings. Some events are historical, while the main wartime battles and playable characters are fictional or alternate history.'};
});
