const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const scope={window:{}};vm.runInNewContext(fs.readFileSync('building-art.js','utf8'),scope);vm.runInNewContext(fs.readFileSync('town-map.js','utf8'),scope);
const {mesh}=scope.window.BadFodderBuildings;
const area=points=>Math.abs(points.reduce((n,a,i)=>{const b=points[(i+1)%points.length];return n+a[0]*b[1]-b[0]*a[1]},0)/2);
const rectangle=[[0,0],[80,0],[80,30],[0,30],[0,0]],original=JSON.stringify(rectangle),m=mesh(rectangle,20);
assert.equal(JSON.stringify(rectangle),original,'Footprints must not be mutated');assert.equal(m.ridges.length,1);assert.equal(m.planes.length,2);assert(m.rise>0);
assert(Math.abs(m.planes.reduce((n,p)=>n+area(p.local.map(a=>[a.u,a.v])),0)-area(rectangle))<1e-6,'Roof slopes retain footprint area');
for(const plane of m.planes)for(const p of plane.local){const [a,b,c,d,e,f]=plane.transform;const q=m.project(p);assert(Math.abs(q[0]-(a*p.u+c*p.v+e))<1e-6);assert(Math.abs(q[1]-(b*p.u+d*p.v+f))<1e-6,'Texture projection must meet roof edges');}
const source=vm.runInNewContext('TOWN_MAP',scope);let count=0;
for(const building of source.buildings){const before=JSON.stringify(building.points),r=mesh(building.points.map(a=>a.map(x=>x*2)),20);assert(r);assert.equal(JSON.stringify(building.points),before);for(const plane of r.planes)for(const p of plane.points)assert(p.every(Number.isFinite));assert(Math.abs(r.planes.reduce((n,p)=>n+area(p.local.map(a=>[a.u,a.v])),0)-area(building.points)*4)<.1);count++;}
console.log('PASS: pitched roof geometry and texture projection; '+count+' real footprints retained with finite roof planes.');
