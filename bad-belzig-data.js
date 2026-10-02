/* Mission-specific gameplay data for Bad Belzig.
   Geography remains in town-map.js; this file holds spawns, supplies and defender groups. */
(function(){
  'use strict';

  TOWN_MAP.key='bad-belzig';
  TOWN_MAP.title='Bad Belzig';

  TOWN_MAP.spawns={
    squad:[
      [786,1450],[803,1450],[786,1467],[803,1467]
    ],
    enemies:[
      [770,1285],[703.1,1237.4],[550,1190],
      [390,1160],[330,1085],[430,980],[560,965],[735,1000],
      [845,930],[850,815],[760,735],[672.2,709.2],[592.6,586.9],[690,540],
      [771.3,463.7],[855,509],[901.9,397.4],[795,305],[690,270],[470,345]
    ],
    civilians:[
      [610,760],[720,830],[870,740],[673.1,422.6],[768.7,538.7],[560,620],
      [950,900],[470,860],[830,250],[520,380],[600,1080],[740,1140]
    ],
    pickups:[
      {type:'grenade',x:745.2,y:1203.9,amount:2},
      {type:'med',x:470,y:1115,amount:4},
      {type:'grenade',x:720,y:820,amount:2},
      {type:'med',x:631,y:590,amount:4},
      {type:'grenade',x:852.4,y:503.1,amount:2}
    ]
  };

  TOWN_MAP.defenderGroups={
    post:[0,1,2],
    castle:[3,4,5,6,7],
    market:[8,9,10,11,12,13,14,15,16,17,18,19]
  };
})();