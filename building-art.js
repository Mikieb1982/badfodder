/* Cosmetic pitched roofs. Ground footprints remain the collision source. */
(() => {
 'use strict';
 const EPS=1e-7;
 function mesh(points,height=20){
  const p=points.filter((a,i)=>!i||Math.hypot(a[0]-points[i-1][0],a[1]-points[i-1][1])>EPS).map(a=>a.slice());
  if(p.length>2&&Math.hypot(p[0][0]-p.at(-1)[0],p[0][1]-p.at(-1)[1])<EPS)p.pop();
  if(p.length<3)return null;
  // Minimum-area oriented bounds avoid the long diagonal on irregular houses.
  let box=null;
  for(let i=0;i<p.length;i++){
   const a=p[i],b=p[(i+1)%p.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<EPS)continue;
   const ux=(b[0]-a[0])/length,uy=(b[1]-a[1])/length;
   const us=p.map(a=>a[0]*ux+a[1]*uy),vs=p.map(a=>-a[0]*uy+a[1]*ux);
   const u0=Math.min(...us),u1=Math.max(...us),v0=Math.min(...vs),v1=Math.max(...vs),area=(u1-u0)*(v1-v0);
   if(!box||area<box.area-EPS)box={ux,uy,u0,u1,v0,v1,area};
  }
  let {ux,uy,u0,u1,v0,v1}=box;
  if(v1-v0>u1-u0){[ux,uy]=[-uy,ux];const us=p.map(a=>a[0]*ux+a[1]*uy),vs=p.map(a=>-a[0]*uy+a[1]*ux);u0=Math.min(...us);u1=Math.max(...us);v0=Math.min(...vs);v1=Math.max(...vs);}
  if(ux<0){ux=-ux;uy=-uy;[u0,u1]=[-u1,-u0];[v0,v1]=[-v1,-v0];}
  const cu=(u0+u1)/2,cv=(v0+v1)/2,cx=ux*cu-uy*cv,cy=uy*cu+ux*cv;
  const half=Math.max(1,(v1-v0)/2),length=u1-u0,rise=Math.min(24,Math.max(6,half*.68));
  const local=p.map(a=>({u:a[0]*ux+a[1]*uy-cu,v:-a[0]*uy+a[1]*ux-cv}));
  const lift=v=>rise*Math.max(0,1-Math.abs(v)/half);
  const project=a=>[cx+ux*a.u-uy*a.v,cy+uy*a.u+ux*a.v-height-lift(a.v)];
  const split=(input,sign)=>{
   const result=[];
   input.forEach((a,i)=>{const b=input[(i+1)%input.length],inside=a.v*sign>=-EPS,next=b.v*sign>=-EPS;if(inside)result.push(a);if(inside!==next){const t=a.v/(a.v-b.v);result.push({u:a.u+(b.u-a.u)*t,v:0});}});
   return result;
  };
  const planes=[-1,1].map(sign=>({sign,local:split(local,sign)})).filter(a=>a.local.length>=3).map(a=>({...a,points:a.local.map(project),transform:[ux,uy,-uy,ux+a.sign*rise/half,cx,cy-height-rise]}));
  const walls=local.map((a,i)=>{const b=local[(i+1)%local.length],top=[project(b)];if(a.v*b.v<0){const t=a.v/(a.v-b.v);top.push(project({u:a.u+(b.u-a.u)*t,v:0}));}top.push(project(a));return {a:p[i],b:p[(i+1)%p.length],points:[p[i],p[(i+1)%p.length],...top]};});
  const crossings=[];local.forEach((a,i)=>{const b=local[(i+1)%local.length];if(Math.abs(a.v)<EPS)crossings.push(a.u);if(a.v*b.v<0)crossings.push(a.u+(b.u-a.u)*a.v/(a.v-b.v));});
  crossings.sort((a,b)=>a-b);const unique=crossings.filter((u,i)=>!i||Math.abs(u-crossings[i-1])>EPS),ridges=[];
  for(let i=0;i+1<unique.length;i+=2)ridges.push([project({u:unique[i],v:0}),project({u:unique[i+1],v:0})]);
  return {planes,walls,ridges,project,half,length,rise,cx,cy,ux,uy,height};
 }
 window.BadFodderBuildings={mesh};
})();
