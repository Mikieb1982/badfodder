/* Mission 2: Wigan town centre.
   Key POIs are positioned from current public map/address data; street geometry is
   simplified for play but preserves the real town-centre relationships and routes. */
const WIGAN_MAP=(()=>{
  const width=1160,height=1580;

  const roads=[
    {name:'Wallgate',kind:'tertiary',points:[[60,1370],[170,1308],[285,1225],[360,1135],[405,1050],[470,965],[525,895],[548,815]]},
    {name:'Standishgate',kind:'pedestrian',points:[[548,815],[530,735],[515,655],[505,570],[515,485],[535,385],[555,270],[575,120]]},
    {name:'Market Place',kind:'pedestrian',points:[[470,815],[548,815],[625,810],[680,790]]},
    {name:'Market Street',kind:'tertiary',points:[[335,760],[325,680],[305,605],[315,525],[335,445],[360,340]]},
    {name:'New Market Street',kind:'tertiary',points:[[70,405],[180,410],[280,416],[390,425],[505,438],[610,450]]},
    {name:'Hallgate',kind:'residential',points:[[300,800],[390,790],[470,805],[548,815]]},
    {name:'Millgate',kind:'residential',points:[[548,815],[650,760],[750,725],[838,721],[970,700],[1080,675]]},
    {name:'Library Street',kind:'residential',points:[[548,815],[625,875],[690,930],[744,998],[815,1055]]},
    {name:'King Street',kind:'residential',points:[[520,900],[595,960],[665,1025],[735,1090],[810,1160]]},
    {name:'King Street West',kind:'residential',points:[[300,995],[385,975],[455,955],[520,900]]},
    {name:'Crompton Street',kind:'tertiary',points:[[650,555],[760,575],[865,595],[985,610],[1090,615]]},
    {name:'River Way',kind:'secondary',points:[[1035,130],[1010,300],[995,470],[990,640],[1000,820],[1015,1000],[1040,1190]]},
    {name:'School Lane',kind:'residential',points:[[930,430],[965,500],[995,570]]},
    {name:'Chapel Lane',kind:'residential',points:[[820,1120],[875,1200],[915,1300],[950,1400]]},
    {name:'Queen Street',kind:'residential',points:[[500,1300],[540,1400],[575,1530]]},
    {name:'Dorning Street',kind:'residential',points:[[180,720],[170,820],[185,925],[225,1015]]},
    {name:'Great George Street',kind:'residential',points:[[55,1115],[150,1130],[245,1115],[330,1080]]},
    {name:'Clayton Street',kind:'residential',points:[[35,1180],[135,1190],[240,1175],[335,1145]]},
    {name:'Miry Lane',kind:'residential',points:[[30,1285],[140,1285],[225,1250]]},
    {name:'Parson’s Walk',kind:'path',points:[[220,80],[230,180],[260,275],[290,365],[300,455]]},
    {name:'Railway - Wallgate',kind:'railway',points:[[0,1100],[140,1080],[285,1040],[420,1010],[610,985],[820,970],[1160,950]]},
    {name:'Railway - North Western',kind:'railway',points:[[260,1580],[320,1460],[390,1350],[450,1240],[535,1130],[650,1000],[790,870],[960,710],[1160,560]]}
  ];

  const buildings=[];
  let bi=0;
  const rect=(x,y,w,h,name='')=>{
    buildings.push({name,points:[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]});
  };

  // Requested and major landmarks.
  rect(222,952,142,78,'Wigan Wallgate Station');
  rect(368,1264,120,92,'Wigan North Western Station');
  rect(205,530,174,125,'Wigan Bus Station');
  rect(238,372,88,70,'Tudor House Hotel');
  rect(450,754,72,62,'The Moon Under Water');
  rect(600,784,72,70,'John Bull Chophouse');
  rect(748,610,220,230,'Grand Arcade');
  rect(704,960,88,78,'Wigan Town Hall');
  rect(510,840,72,74,'All Saints Church');

  // Town-centre blocks, arranged around the real street pattern.
  [
    [85,445,105,88],[92,555,90,120],[85,700,120,95],[72,835,135,100],
    [90,950,115,100],[95,1045,105,58],[110,1210,115,58],
    [360,455,110,80],[390,545,95,92],[375,650,110,75],[365,825,85,105],
    [330,1030,80,78],[250,1080,72,80],[250,1190,90,76],[250,1325,92,75],
    [570,480,125,80],[570,575,125,100],[565,685,95,80],[690,805,80,92],
    [605,890,78,72],[800,885,120,75],[820,985,105,82],[840,1085,92,80],
    [690,1165,110,90],[600,1260,95,90],[650,1380,120,90],
    [980,675,88,115],[1010,820,92,105],[1015,955,80,98],[990,1080,92,92],
    [875,315,92,90],[770,390,95,90],[670,330,100,95],[590,235,100,100],
    [420,260,90,90],[320,250,80,90],[175,250,95,95]
  ].forEach(b=>rect(...b,''));

  const areas=[
    {type:'water',points:[[1075,0],[1120,0],[1110,210],[1088,390],[1072,580],[1080,760],[1100,940],[1135,1110],[1160,1220],[1160,1580],[1120,1580],[1095,1390],[1070,1200],[1045,1020],[1030,830],[1035,650],[1045,470],[1060,270],[1075,0]]},
    {type:'grass',points:[[0,0],[190,0],[210,170],[170,260],[70,275],[0,235]]},
    {type:'grass',points:[[0,520],[90,500],[120,620],[80,720],[0,700]]},
    {type:'meadow',points:[[0,1000],[150,970],[220,1040],[170,1110],[0,1130]]},
    {type:'meadow',points:[[930,0],[1160,0],[1160,150],[1010,155]]}
  ];

  const pois={
    wallgate:{x:291.1,y:1011.2},
    northWestern:{x:421.8,y:1319.8},
    busStation:{x:290,y:604.1},
    tudor:{x:280.7,y:416},
    moon:{x:481.4,y:788.3},
    johnBull:{x:629.6,y:819.7},
    grandArcade:{x:838.4,y:721.2},
    formerCentral:{x:938.5,y:855.1},
    market:{x:548.3,y:814.9},
    standishgate:{x:520,y:610},
    townHall:{x:743.5,y:998.2}
  };

  const zones={
    wallgate:{x:291.1,y:1011.2,r:66},
    market:{x:548.3,y:814.9,r:82},
    grandArcade:{x:838.4,y:721.2,r:105}
  };

  const spawns={
    squad:[[360,1435],[392,1458],[330,1462],[420,1480]],
    enemies:[
      [305,1090],[390,1045],[455,980],[370,900],[485,885],
      [520,825],[615,830],[540,730],[450,690],[330,675],
      [300,565],[405,570],[575,610],[690,690],[760,745],
      [845,700],[910,660],[900,790],[790,850],[680,910]
    ],
    civilians:[
      [245,720],[410,735],[500,775],[590,790],[700,760],[780,680],
      [320,470],[510,525],[620,700],[720,920],[520,1040],[340,1160]
    ],
    pickups:[
      {type:'med',x:390,y:1060},{type:'ammo',x:515,y:875},
      {type:'med',x:590,y:700},{type:'ammo',x:790,y:760}
    ]
  };

  const labels=[
    {key:'wallgate',text:'WIGAN WALLGATE',kind:'station'},
    {key:'northWestern',text:'WIGAN NORTH WESTERN',kind:'station'},
    {key:'busStation',text:'BUS STATION',kind:'transport'},
    {key:'tudor',text:'TUDOR HOUSE',kind:'pub'},
    {key:'moon',text:'MOON UNDER WATER',kind:'pub'},
    {key:'johnBull',text:'JOHN BULL',kind:'pub'},
    {key:'grandArcade',text:'GRAND ARCADE',kind:'shopping'},
    {key:'formerCentral',text:'FORMER WIGAN CENTRAL',kind:'historic'},
    {key:'standishgate',text:'STANDISHGATE',kind:'street'}
  ];

  return{
    key:'wigan',
    title:'Wigan Town Centre',
    width,height,nodes:[],edges:[],roads,buildings,areas,pois,zones,spawns,labels,
    landing:[360,1435],exit:[838.4,721.2],
    attribution:'Map layout based on OpenStreetMap and verified public location data.',
    source:'https://www.openstreetmap.org/copyright',
    retrieved:'2026-10-01'
  };
})();