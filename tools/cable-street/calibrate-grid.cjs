#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');

function finitePair(value,label){
  if(!Array.isArray(value)||value.length<2||!Number.isFinite(value[0])||!Number.isFinite(value[1])){
    throw new Error(label+' must be a finite [x,y] pair.');
  }
  return[value[0],value[1]];
}

function solve3x3(matrix,vector){
  const a=matrix.map((row,i)=>[...row,vector[i]]);
  for(let col=0;col<3;col++){
    let pivot=col;
    for(let row=col+1;row<3;row++)if(Math.abs(a[row][col])>Math.abs(a[pivot][col]))pivot=row;
    if(Math.abs(a[pivot][col])<1e-12)throw new Error('Control points are degenerate; choose well-separated non-collinear controls.');
    if(pivot!==col)[a[col],a[pivot]]=[a[pivot],a[col]];
    const divisor=a[col][col];
    for(let j=col;j<4;j++)a[col][j]/=divisor;
    for(let row=0;row<3;row++){
      if(row===col)continue;
      const factor=a[row][col];
      for(let j=col;j<4;j++)a[row][j]-=factor*a[col][j];
    }
  }
  return[a[0][3],a[1][3],a[2][3]];
}

function normalEquations(controls,targetIndex){
  const m=[[0,0,0],[0,0,0],[0,0,0]];
  const v=[0,0,0];
  for(const control of controls){
    const [x,y]=finitePair(control.image,'Control '+control.id+' image');
    const grid=finitePair(control.grid,'Control '+control.id+' grid');
    const row=[x,y,1],target=grid[targetIndex];
    for(let i=0;i<3;i++){
      v[i]+=row[i]*target;
      for(let j=0;j<3;j++)m[i][j]+=row[i]*row[j];
    }
  }
  return{m,v};
}

function fitAffine(controls){
  if(!Array.isArray(controls)||controls.length<3)throw new Error('At least three control points are required.');
  const ids=new Set();
  for(let i=0;i<controls.length;i++){
    const control=controls[i]||{};
    const id=typeof control.id==='string'&&control.id?control.id:'control-'+(i+1);
    if(ids.has(id))throw new Error('Duplicate control id: '+id);
    ids.add(id);
    finitePair(control.image,'Control '+id+' image');
    finitePair(control.grid,'Control '+id+' grid');
  }
  const e=normalEquations(controls,0),n=normalEquations(controls,1);
  const [a,b,c]=solve3x3(e.m,e.v);
  const [d,e2,f]=solve3x3(n.m,n.v);
  return{
    type:'affine-2d',
    equation:{
      easting:'E = a*x + b*y + c',
      northing:'N = d*x + e*y + f'
    },
    coefficients:{a,b,c,d,e:e2,f}
  };
}

function applyTransform(transform,image){
  const [x,y]=finitePair(image,'Image coordinate');
  const k=transform&&transform.coefficients;
  if(!k||![k.a,k.b,k.c,k.d,k.e,k.f].every(Number.isFinite))throw new Error('Invalid affine transform.');
  return[
    k.a*x+k.b*y+k.c,
    k.d*x+k.e*y+k.f
  ];
}

function residualFor(control,transform){
  const observed=finitePair(control.grid,'Control '+control.id+' grid');
  const predicted=applyTransform(transform,control.image);
  const de=predicted[0]-observed[0],dn=predicted[1]-observed[1];
  return{
    id:control.id,
    predicted,
    observed,
    delta:[de,dn],
    errorMetres:Math.hypot(de,dn)
  };
}

function summarizeResiduals(rows){
  if(!rows.length)return{count:0,rmsMetres:null,maxMetres:null,meanMetres:null};
  const errors=rows.map(r=>r.errorMetres);
  return{
    count:errors.length,
    rmsMetres:Math.sqrt(errors.reduce((s,e)=>s+e*e,0)/errors.length),
    maxMetres:Math.max(...errors),
    meanMetres:errors.reduce((s,e)=>s+e,0)/errors.length
  };
}

function fitCalibrationRecord(record){
  if(!record||typeof record!=='object')throw new Error('Calibration record is required.');
  const controls=record.controls||[];
  const checks=record.checkControls||[];
  const transform=fitAffine(controls);
  const controlResiduals=controls.map(c=>residualFor(c,transform));
  const checkResiduals=checks.map(c=>residualFor(c,transform));
  return{
    ...record,
    status:'calibrated',
    transform,
    residuals:{
      controls:controlResiduals,
      checks:checkResiduals,
      controlSummary:summarizeResiduals(controlResiduals),
      checkSummary:summarizeResiduals(checkResiduals)
    }
  };
}

function main(argv){
  const input=argv[2];
  if(!input){
    process.stderr.write('Usage: node tools/cable-street/calibrate-grid.cjs <input.json> [output.json]\n');
    process.exitCode=2;return;
  }
  const output=argv[3]||input;
  const record=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));
  const fitted=fitCalibrationRecord(record);
  fs.writeFileSync(path.resolve(output),JSON.stringify(fitted,null,2)+'\n');
  process.stdout.write(JSON.stringify({
    status:fitted.status,
    controls:fitted.residuals.controlSummary,
    checks:fitted.residuals.checkSummary,
    output:path.resolve(output)
  },null,2)+'\n');
}

if(require.main===module)main(process.argv);

module.exports={
  solve3x3,fitAffine,applyTransform,residualFor,summarizeResiduals,fitCalibrationRecord
};
