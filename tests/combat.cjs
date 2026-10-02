'use strict';
const assert=require('node:assert/strict');
const geom=require('../combat-geometry.js');

{
  const t=geom.segmentCircleHitT(0,0,100,0,50,0,8);
  assert(t!==null,'Fast bullet segment should hit a character between frames');
  assert(t>0&&t<1);
}

{
  const obstacleAt=(x,y)=>x>=40&&x<=42&&Math.abs(y)<5;
  const wallT=geom.firstObstacleHitT(0,0,100,0,obstacleAt,2,2);
  const target=geom.nearestCharacterHit(0,0,100,0,[{x:80,y:0,alive:true}],8);
  assert(wallT!==null);
  assert(target);
  assert(wallT<target.t,'Nearest wall must resolve before a character behind it');
}

{
  const obstacleAt=(x,y)=>x>=70&&x<=72&&Math.abs(y)<5;
  const wallT=geom.firstObstacleHitT(0,0,100,0,obstacleAt,2,2);
  const target=geom.nearestCharacterHit(0,0,100,0,[{x:30,y:0,alive:true}],8);
  assert(target);
  assert(wallT!==null);
  assert(target.t<wallT,'Character in front of a wall must be hit first');
}

{
  const targets=[
    {x:72,y:0,alive:true,id:'far'},
    {x:28,y:0,alive:true,id:'near'}
  ];
  const hit=geom.nearestCharacterHit(0,0,100,0,targets,7);
  assert.equal(hit.target.id,'near','Nearest character along the segment must win');
}

{
  const obstacleAt=(x,y)=>x>=49.2&&x<=50.1&&Math.abs(y)<3;
  const t=geom.firstObstacleHitT(0,0,120,0,obstacleAt,1,1);
  assert(t!==null,'Thin obstacle must not be skipped by a fast projectile');
  const x=120*t;
  assert(x>=48&&x<=51,'Impact should be refined close to the first obstacle edge');
}

console.log('PASS: swept projectile collision catches between-frame targets and thin obstacles, resolving the nearest hit first.');
