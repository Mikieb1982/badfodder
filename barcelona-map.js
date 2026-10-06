/* Compressed, north-up Catalunya / upper Rambla slice. Footprints and barricade placement
   are gameplay approximations, not a cadastral or battle reconstruction. */
(function(root,factory){const map=factory();if(typeof module==='object'&&module.exports)module.exports=map;if(root)root.BARCELONA_MAP=map;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
const block=(name,x,y,w,h,levels=4)=>({name,points:rect(x,y,w,h),solid:true,levels,roofShape:'flat',material:'stucco'});
const buildings=[
 block('Hotel Colón',745,92,150,108,5),block('Telefónica',772,245,124,122,6),
 block('Cafè',68,445,125,52,3),block('Impremta',70,538,118,73,3),
 block('Pelai apartments',62,283,211,124),block('Pelai corner',232,348,63,62),
 block('Rambla apartments',45,652,179,152),block('Rambla shops',433,685,115,146),
 block('Rambla corner',435,527,119,72),block('Portal de l’Àngel',608,543,125,130),
 block('Portal apartments',622,723,115,164),block('Fontanella',917,268,63,133),
 block('Passeig de Gràcia',627,8,73,110),block('Ronda Catalunya',317,18,204,101),
 block('North-west corner',104,100,170,144),block('East corner',856,434,124,87),
 block('Tallers shops',50,840,152,42),block('Santa Anna shops',480,847,74,39)
];
// Narrow courtyards, continuous street edges and chamfered corners suggest apartment blocks.
for(const b of buildings){const [a,c]=[b.points[0],b.points[2]],cut=9;b.points=[[a[0]+cut,a[1]],[c[0]-cut,a[1]],[c[0],a[1]+cut],[c[0],c[1]-cut],[c[0]-cut,c[1]],[a[0]+cut,c[1]],[a[0],c[1]-cut],[a[0],a[1]+cut]];}
const road=(name,points,width=48)=>({name,points,width,kind:'secondary',layer:0});
return{key:'barcelona',title:'Barcelona · 19 July 1936',width:1000,height:900,buildings,
 roads:[road('LA RAMBLA',[[265,900],[325,640],[345,486]],96),road('CARRER DE PELAI',[[0,488],[327,486]],62),
 road('PLAÇA DE CATALUNYA',[[340,475],[720,475],[720,160],[310,160],[310,475]],46),
 road('PASSEIG DE GRÀCIA',[[720,0],[720,175]],58),road('PORTAL DE L’ÀNGEL',[[746,472],[785,900]],54),
 road('FONTANELLA',[[733,410],[1000,410]],46),road('CARRER DE TALLERS',[[0,823],[303,823]],42),
 road('SANTA ANNA',[[310,666],[800,666]],42),road('WEST PASSAGE',[[250,475],[250,818]],34),road('EAST PASSAGE',[[406,490],[406,823]],34)],
 areas:[{type:'square',points:rect(359,204,322,211)}],vegetation:[{x:385,y:225,r:5},{x:646,y:225,r:5},{x:385,y:390,r:5},{x:646,y:390,r:5}],
 pois:{catalunya:{x:515,y:300},colon:{x:820,y:201},telefonica:{x:834,y:374},rambla:{x:325,y:705}},
 zones:{junction:{x:335,y:487,r:48},patrol:{x:310,y:470,r:105},contact:{x:213,y:553,r:38},barricade:{x:345,y:668,r:90},fallback:{x:310,y:765,r:65},residents:{x:577,y:619,r:42},safe:{x:250,y:780,r:55},eastern:{x:575,y:695,r:75},advance:{x:744,y:478,r:65}},
 spawns:{squad:[[268,846],[287,846],[270,866],[289,866]],enemies:[[311,442],[357,474]],civilians:[[222,581],[249,605],[287,798],[389,716]],pickups:[{type:'med',x:230,y:553,amount:4},{type:'med',x:390,y:690,amount:4}]},
 defenderGroups:{patrol:[0,1]},
 rescue:{positions:[[570,606],[583,606],[569,625],[585,625],[570,642],[585,643]]},
 resistance:{starts:[[209,544],[230,570],[218,594]],positions:[[271,642],[416,642],[362,653]],eastern:[[271,642],[571,704],[607,692]],advance:[[271,642],[737,499],[795,520]]},
 barricade:{x:345,y:628,points:rect(289,621,108,14),materials:[{x:245,y:625},{x:421,y:702}]},
 assaultGroups:[
 {label:'PROBE',delay:5,positions:[[310,340],[347,358],[306,368]],roles:['PATROL','RIFLEMAN','FLANKER']},
 {label:'FRONTAL PRESSURE',delay:18,positions:[[310,320],[347,300],[420,340],[415,363]],roles:['SUPPRESSOR','FLANKER','RIFLEMAN','AGGRESSOR']},
 ],
 rescuePressure:{label:'PATROL AT THE CROSSING',delay:8,target:'residents',positions:[[744,410],[830,410]],roles:['PATROL','RIFLEMAN']},
 easternGroups:[
 {label:'EASTERN PROBE',delay:5,target:'eastern',positions:[[785,880],[820,850]],roles:['FLANKER','RIFLEMAN']},
 {label:'FLANKING COLUMN',delay:18,target:'eastern',positions:[[790,880],[835,845],[854,790]],roles:['COMMANDER','SUPPRESSOR','AGGRESSOR']}
 ],
 rearguard:{label:'REARGUARD AT THE JUNCTION',delay:0,target:'advance',positions:[[733,410],[900,410]],roles:['RIFLEMAN','SUPPRESSOR']}};
});
