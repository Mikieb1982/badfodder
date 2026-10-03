/* Mission-specific gameplay data for Bad Belzig.
   Geography remains in town-map.js; this file holds spawns, supplies and defender groups. */
(function(){
  'use strict';

  TOWN_MAP.key='bad-belzig';
  TOWN_MAP.title='Belzig';

  TOWN_MAP.spawns={
    squad:[
      [786,1450],[803,1450],[786,1467],[803,1467]
    ],
    enemies:[
      [770,1285],[703.1,1237.4],[550,1190],
      [390,1160],[330,1085],[430,980],[560,965],[735,1000],
      [845,930],[855.5,812.7],[725.1,758.3],[668.7,726.9],[564.9,598.4],[690,540],
      [771.3,463.7],[855,509],[921.9,427.3],[775,291.7],[690,270],[464.1,346.2]
    ],
    civilians:[
      [610,760],[720,830],[870,740],[673.1,422.6],[768.7,538.7],[560,620],
      [950,900],[470,860],[806.5,245.3],[525.9,378.8],[600,1080],[740,1140]
    ],
    pickups:[
      {type:'grenade',x:745.2,y:1203.9,amount:2},
      {type:'med',x:470,y:1115,amount:4},
      {type:'grenade',x:720,y:820,amount:2},
      {type:'med',x:660.9,y:610,amount:4},
      {type:'grenade',x:853.6,y:509,amount:2}
    ]
  };

  TOWN_MAP.defenderGroups={
    // Compulsory defenders stay close enough to their objective to avoid map-wide cleanup hunts.
    post:[0,1,2],
    castle:[3,4,5,6],
    market:[8,9,10,11,12,13,14,15]
  };

  TOWN_MAP.ambientEnemyIndexes=[7,16,17,18,19];
})();