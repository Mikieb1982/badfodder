'use strict';

function polygon(id,points){
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  return{
    i:id,solid:true,points,
    minX:Math.min(...xs),maxX:Math.max(...xs),
    minY:Math.min(...ys),maxY:Math.max(...ys)
  };
}

const worldWidth=360,worldHeight=180;
const buildings=[
  polygon('north-wall',[[0,0],[360,0],[360,68],[0,68]]),
  polygon('south-wall',[[0,112],[360,112],[360,180],[0,180]])
];

const points={
  defenderStart:{x:48,y:90},
  defenderRetreat:{x:118,y:90},
  supportAccess:{x:82,y:90},
  policeStart:{x:312,y:90},
  policeApproach:{x:222,y:90},
  farSide:{x:300,y:90}
};

const barricade={
  id:'fixture-barricade-B',
  kind:'barricade',
  solid:true,
  points:[[174,68],[186,68],[186,112],[174,112]]
};

module.exports={worldWidth,worldHeight,buildings,points,barricade};
