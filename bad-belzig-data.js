/* Mission-specific gameplay data for Bad Belzig.
   Geography remains in town-map.js; this file holds spawns, supplies and defender groups. */
(function(){
  'use strict';

  TOWN_MAP.key='bad-belzig';
  TOWN_MAP.title='Belzig';

  TOWN_MAP.spawns={
    squad:[
      // Begin in the south-east corner so the opening enters town from the lower-right
      // and approaches the first civilians on a short north-west diagonal.
      [970,1438],[988,1438],[970,1456],[988,1456]
    ],
    enemies:[
      [770,1285],[703.1,1237.4],[550,1190],
      [390,1160],[330,1085],[430,980],[560,965],[735,1000],
      [845,930],[855.5,812.7],[725.1,758.3],[668.7,726.9],[564.9,598.4],[690,540],
      [771.3,463.7],[855,509],[921.9,427.3],[775,291.7],[690,270],[464.1,346.2],
      [735,285],[775,290],[760,1040],[810,1050]
    ],
    civilians:[
      [610,760],[720,830],[870,740],[673.1,422.6],[768.7,538.7],[560,620],
      [950,900],[470,860],[806.5,245.3],[525.9,378.8],[600,1080],[740,1140],
      [782,1360],[796,1360],[782,1375],[796,1375],
      [750,235],[770,235],[800,240],[735,285]
    ],
    pickups:[
      {type:'grenade',x:745.2,y:1203.9,amount:2},
      {type:'med',x:470,y:1115,amount:4},
      {type:'grenade',x:720,y:820,amount:2},
      {type:'med',x:660.9,y:610,amount:4},
      {type:'grenade',x:853.6,y:509,amount:2}
    ]
  };

  TOWN_MAP.opening={civilianIndexes:[12,13,14,15],contact:{x:789,y:1368,r:55},postRevealRadius:100};

  TOWN_MAP.crossing={onward:{x:765,y:1160,r:26},minimum:2,holdSeconds:2.5,recoverySeconds:8,contestRadius:72,presenceRadius:130};

  TOWN_MAP.story={refuge:{...TOWN_MAP.pois.marien,r:85},regroup:{x:685,y:196.7,r:45},friedaIndex:16,refugeIndexes:[16,17,18,19],refugeEnemies:[20,21],routeEnemies:[22,23],warningSeconds:120,recoverySeconds:60,
    refugeRoute:[[750,1090],[760,850],[735,605],[740,445]],fallback:[[600,1250],[390,1160],[550,950],[600,750],[740,445],[685,196.7]],
    courtyard:[[750,235],[740,445]],burgSide:[[550,950],[600,750],[740,445]],volunteerPoint:{x:735,y:480,r:40}};

  TOWN_MAP.defenderGroups={
    // Compulsory defenders stay close enough to their objective to avoid map-wide cleanup hunts.
    post:[0,1,2],
    refuge:[20,21],route:[22,23],
    castle:[3,4,5,6],
    market:[8,9,10,11,12,13,14,15]
  };

  TOWN_MAP.ambientEnemyIndexes=[7,16,17,18,19];
})();