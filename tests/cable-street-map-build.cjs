'use strict';

const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const Builder=require('../tools/cable-street/build-runtime-map.cjs');

const root=path.join(__dirname,'..');

const map={
  key:'cable-street',
  title:'Cable Street',
  width:320,
  height:220,
  roads:[],
  areas:[],
  buildings:[],
  pois:{},
  zones:{},
  vegetation:[],
  spawns:{
    squad:[[40,40],[52,40],[40,52],[52,52]],
    enemies:[],
    civilians:[],
    pickups:[]
  },
  routeRequirements:[],
  historicalObjects:{
    barricades:[{id:'B'}],
    materials:[],
    civilians:[],
    formations:[]
  },
  authoring:{
    productionReady:true,
    runtimeObjectsReady:true
  }
};

const source=Builder.serializeRuntimeMap(map);
assert(source.includes('root.CABLE_STREET_MAP='));
assert(source.includes('"key":"cable-street"'));
assert(source.includes('"squad":[[40,40],[52,40],[40,52],[52,52]]'));

assert.throws(
  ()=>Builder.serializeRuntimeMap({...map,authoring:{...map.authoring,productionReady:false}}),
  /production-ready/
);
assert.throws(
  ()=>Builder.serializeRuntimeMap({...map,authoring:{...map.authoring,runtimeObjectsReady:false}}),
  /approved runtime objects/
);
assert.throws(
  ()=>Builder.serializeRuntimeMap({...map,spawns:{...map.spawns,squad:[[40,40]]}}),
  /four explicit squad spawns/
);

const stub=fs.readFileSync(path.join(root,'cable-street-map.js'),'utf8');
assert(stub.includes('CABLE_STREET_MAP'));
assert(stub.includes('root.CABLE_STREET_MAP='),'Production map must be packaged');

const temp=path.join(os.tmpdir(),'badfodder-cable-map-test-'+process.pid+'.js');
assert.throws(
  ()=>Builder.build(require('./fixtures/cable-street-pending-authoring.cjs')(),temp),
  /not MAP-01 to MAP-06 ready/
);
assert.equal(fs.existsSync(temp),false,'Blocked map build wrote a runtime artifact');

console.log('PASS: Cable Street browser-map builder only serializes production-ready maps with approved runtime objects and four explicit squad spawns.');
console.log('PASS: incomplete authoring package cannot overwrite the production map.');
