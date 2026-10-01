#!/usr/bin/env python3
"""Rebuild Wigan's north-up game map from the checked-in OSM geometry snapshot.
Optional --xml PATH refreshes the snapshot from an OSM API /map download.
No invented streets, rectangular replacement buildings or runtime network calls.
"""
import argparse, json, math, xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BBOX=[53.5422,-2.6385,53.5488,-2.6257] # south, west, north, east
SCALE=1.7; PAD=32; METRES=111320; COS=math.cos(math.radians((BBOX[0]+BBOX[2])/2))
WIDTH=round((BBOX[3]-BBOX[1])*METRES*COS*SCALE+PAD*2)
HEIGHT=round((BBOX[2]-BBOX[0])*METRES*SCALE+PAD*2)
def xy(p):return [round(PAD+(p[1]-BBOX[1])*METRES*COS*SCALE,2),round(PAD+(BBOX[2]-p[0])*METRES*SCALE,2)]
def tags(e):return {t.attrib['k']:t.attrib['v'] for t in e.findall('tag')}
def in_box(p):return BBOX[0]<=p[0]<=BBOX[2] and BBOX[1]<=p[1]<=BBOX[3]
def intersects(p):return min(a[0] for a in p)<=BBOX[2] and max(a[0] for a in p)>=BBOX[0] and min(a[1] for a in p)<=BBOX[3] and max(a[1] for a in p)>=BBOX[1]
KEEP={'name','building','building:levels','building:material','building:colour','roof:shape','roof:material','highway','area','surface','width','lanes','indoor','level','layer','access','foot','tunnel','covered','railway','railway:track_ref','landuse','natural','water','waterway','leisure','amenity','public_transport','shop','entrance','addr:street','addr:housenumber'}
def snapshot(xml):
 r=ET.parse(xml).getroot();nodes={n.attrib['id']:[float(n.attrib['lat']),float(n.attrib['lon'])] for n in r.findall('node')};features=[]
 for e in r.findall('way'):
  t=tags(e)
  if not any(k in t for k in ['building','highway','railway','landuse','natural','waterway','leisure','amenity']):continue
  geom=[nodes[n.attrib['ref']] for n in e.findall('nd')]
  if len(geom)<2 or not intersects(geom):continue
  features.append({'id':int(e.attrib['id']),'tags':{k:v for k,v in t.items() if k in KEEP},'geometry':geom})
 for e in r.findall('node'):
  t=tags(e);geom=nodes[e.attrib['id']]
  if in_box(geom) and (t.get('natural')=='tree' or t.get('railway')=='station' or t.get('shop')=='mall' or t.get('entrance')):features.append({'id':int(e.attrib['id']),'tags':{k:v for k,v in t.items() if k in KEEP},'geometry':[geom]})
 return {'retrieved':'2026-10-01','bbox':BBOX,'source':'https://api.openstreetmap.org/api/0.6/map?bbox=-2.641,53.541,-2.623,53.549','license':'ODbL-1.0','attribution':'© OpenStreetMap contributors','features':sorted(features,key=lambda e:e['id'])}
def clip_poly(poly):
 if poly and poly[0]==poly[-1]:poly=poly[:-1]
 for axis,bound,greater in [(0,0,True),(0,WIDTH,False),(1,0,True),(1,HEIGHT,False)]:
  if not poly:break
  result=[]
  for i,a in enumerate(poly):
   b=poly[(i+1)%len(poly)];ina=a[axis]>=bound if greater else a[axis]<=bound;inb=b[axis]>=bound if greater else b[axis]<=bound
   if ina:result.append(a)
   if ina!=inb:
    t=(bound-a[axis])/(b[axis]-a[axis]);result.append([round(a[0]+(b[0]-a[0])*t,2),round(a[1]+(b[1]-a[1])*t,2)])
  poly=result
 return poly

def clip_line(a,b):
 dx,dy=b[0]-a[0],b[1]-a[1];lo,hi=0.,1.
 for p,q in [(-dx,a[0]),(dx,WIDTH-a[0]),(-dy,a[1]),(dy,HEIGHT-a[1])]:
  if abs(p)<1e-10:
   if q<0:return None
  elif p<0:lo=max(lo,q/p)
  else:hi=min(hi,q/p)
  if lo>hi:return None
 return [[round(a[0]+dx*t,2),round(a[1]+dy*t,2)] for t in [lo,hi]]
def line_parts(poly):
 parts=[]
 for a,b in zip(poly,poly[1:]):
  line=clip_line(a,b)
  if not line or line[0]==line[1]:continue
  if parts and parts[-1][-1]==line[0]:parts[-1].append(line[1])
  else:parts.append(line)
 return parts

def centroid(poly):
 if poly[0]==poly[-1]:poly=poly[:-1]
 area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(poly,poly[1:]+poly[:1]))
 if abs(area)<.001:return [sum(p[0] for p in poly)/len(poly),sum(p[1] for p in poly)/len(poly)]
 return [round(sum((a[j]+b[j])*(a[0]*b[1]-b[0]*a[1]) for a,b in zip(poly,poly[1:]+poly[:1]))/(3*area),2) for j in [0,1]]
def distance(a,b):return math.hypot(a[0]-b[0],a[1]-b[1])
def nearest(p,roads,name):
 candidates=[]
 for r in roads:
  if r['name']!=name or r['kind']=='railway':continue
  for a,b in zip(r['points'],r['points'][1:]):
   dx,dy=b[0]-a[0],b[1]-a[1];length=dx*dx+dy*dy
   t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)) if length else 0
   q=[round(a[0]+dx*t,2),round(a[1]+dy*t,2)];candidates.append((distance(p,q),q))
 if not candidates:raise ValueError('Missing street '+name)
 return min(candidates,key=lambda e:e[0])[1]
def on_street(lat,lon,name,roads):return nearest(xy([lat,lon]),roads,name)
def build(src):
 roads=[];buildings=[];areas=[];platforms=[];trees=[]
 for e in src['features']:
  t=e['tags'];pts=[xy(p) for p in e['geometry']];base={'osmId':e['id'],'name':t.get('name','')}
  if len(pts)==1:
   if t.get('natural')=='tree':trees.append({'x':pts[0][0],'y':pts[0][1],'r':5+(e['id']%4)})
   continue
  if t.get('building') and t['building'] not in ['no','construction']:
   poly=clip_poly(pts)
   if len(poly)>=3:
    levels=max(1,min(5,float(t.get('building:levels','2')) if t.get('building:levels','2').replace('.','',1).isdigit() else 2))
    flat=t.get('roof:shape')=='flat' or t['building'] in ['commercial','retail','industrial','warehouse','roof']
    buildings.append({**base,'points':poly+[poly[0]],'levels':levels,'material':t.get('building:material','brick'),'roofShape':'flat' if flat else 'gable','solid':t['building']!='roof'})
  highway=t.get('highway')
  if highway and t.get('indoor')!='yes' and t.get('access')!='private' and highway not in ['construction','proposed']:
   if t.get('area')=='yes' and pts[0]==pts[-1]:
    poly=clip_poly(pts)
    if len(poly)>2:areas.append({**base,'type':'paving','points':poly})
   else:
    metres={'primary':10,'secondary':9,'tertiary':8,'residential':6,'unclassified':6,'service':4,'pedestrian':7,'footway':2,'path':2,'steps':2,'cycleway':2.5}.get(highway,5)
    try:metres=float(t.get('width',metres))
    except ValueError:pass
    for part in line_parts(pts):roads.append({**base,'kind':highway,'points':part,'width':round(metres*SCALE,2),'surface':t.get('surface','asphalt'),'covered':t.get('covered')=='yes','layer':int(t.get('layer','0')) if t.get('layer','0').lstrip('-').isdigit() else 0})
  if t.get('railway')=='rail':
   for part in line_parts(pts):roads.append({**base,'kind':'railway','points':part,'width':round(2.3*SCALE,2),'layer':int(t.get('layer','0'))})
  if t.get('railway')=='platform' and pts[0]==pts[-1]:
   poly=clip_poly(pts)
   if len(poly)>2:platforms.append({**base,'points':poly})
  kind=None
  if t.get('natural')=='water' or t.get('water'):kind='water'
  elif t.get('landuse') in ['grass','meadow'] or t.get('leisure') in ['park','garden']:kind='grass'
  elif t.get('landuse') in ['forest'] or t.get('natural')=='wood':kind='wood'
  elif t.get('landuse')=='railway':kind='railbed'
  elif t.get('amenity')=='parking':kind='asphalt'
  if kind and pts[0]==pts[-1]:
   poly=clip_poly(pts)
   if len(poly)>2:areas.append({**base,'type':kind,'points':poly})
 byid={b['osmId']:b for b in buildings}
 definitions=[('wallgate',1350051925,'Wigan Wallgate','Wallgate','station'),('northWestern',126406381,'Wigan North Western','Wallgate','station'),('busStation',782427411,'Wigan Bus Station','New Market Street','transport'),('tudor',738652992,'Tudor House','New Market Street','pub'),('moon',941417293,'Moon Under Water','Market Place','pub'),('johnBull',759771131,'John Bull Chophouse','Coopers Row','pub'),('grandArcade',581252033,'Grand Arcade','Standishgate','shopping')]
 pois={};labels=[]
 for key,oid,label,street,kind in definitions:
  b=byid[oid];b['landmark']=key
  if key=='grandArcade':b['roofShape']='flat'
  if key=='johnBull':b['material']='painted-brick'
  if key in ['tudor','moon']:b['levels']=3
  if key=='busStation':b['roofShape']='flat';b['levels']=1
  centre=centroid(b['points']);approach=nearest(centre,roads,street)
  pois[key]={'x':centre[0],'y':centre[1],'approach':approach,'osmId':oid,'street':street,'name':label};labels.append({'key':key,'text':label.upper(),'kind':kind})
 for key,lat,lon,street,label in [('market',53.54615,-2.63205,'Market Place','MARKET PLACE'),('kingStreet',53.54448,-2.63068,'King Street','KING STREET · NIGHTLIFE'),('standishgate',53.5472,-2.6305,'Standishgate','STANDISHGATE')]:
  p=on_street(lat,lon,street,roads);pois[key]={'x':p[0],'y':p[1],'approach':p,'street':street,'name':label};labels.append({'key':key,'text':label,'kind':'street'})
 # Explicit source-frontage objectives avoid sending troops into station/mall roofs.
 z={key:{'x':pois[key]['approach'][0],'y':pois[key]['approach'][1],'r':radius} for key,radius in [('wallgate',70),('market',60),('grandArcade',70)]}
 origin=pois['northWestern']['approach'];squad=[[round(origin[0]+i,2),round(origin[1]+j,2)] for i,j in [(-8,5),(8,5),(-8,21),(8,21)]]
 placements=[(53.5455,-2.6327,'Wallgate'),(53.54525,-2.6329,'Wallgate'),(53.5447,-2.6316,'King Street'),(53.5441,-2.6303,'King Street'),(53.54475,-2.634,'King Street West'),(53.5459,-2.6322,'Wallgate'),(53.5463,-2.6325,'Market Street'),(53.5464,-2.632,'Market Place'),(53.5460,-2.6308,'Millgate'),(53.5453,-2.6308,'Library Street'),(53.5468,-2.6305,'Standishgate'),(53.5471,-2.6305,'Standishgate'),(53.5475,-2.6307,'Standishgate'),(53.5472,-2.6292,'Crompton Street'),(53.5478,-2.6339,'New Market Street'),(53.5474,-2.6331,'Market Street'),(53.5467,-2.6339,'Hallgate'),(53.5465,-2.631,'Coopers Row')]
 enemies=[on_street(lat,lon,street,roads) for lat,lon,street in placements]
 # Keep the opening safe; give defenders room to react after the player starts moving.
 enemies=[p for p in enemies if distance(p,origin)>155]
 civilians=[on_street(lat,lon,street,roads) for lat,lon,street in placements[6::2]]
 pickups=[{'type':kind,'x':pois[key]['approach'][0],'y':pois[key]['approach'][1]} for key,kind in [('tudor','med'),('kingStreet','ammo'),('moon','med'),('grandArcade','ammo')]]
 return {'key':'wigan','title':'Wigan Town Centre','width':WIDTH,'height':HEIGHT,'nodes':[],'edges':[],'roads':roads,'buildings':buildings,'areas':areas,'platforms':platforms,'vegetation':trees,'pois':pois,'zones':z,'spawns':{'squad':squad,'enemies':enemies,'civilians':civilians,'pickups':pickups},'labels':labels,'landing':squad[0],'exit':pois['grandArcade']['approach'],'projection':{'type':'local-equirectangular','northUp':True,'bbox':BBOX,'metresPerDegree':METRES,'cosLatitude':COS,'unitsPerMetre':SCALE,'padding':PAD},'source':src['source'],'retrieved':src['retrieved'],'attribution':'© OpenStreetMap contributors, ODbL 1.0','license':'https://opendatacommons.org/licenses/odbl/1-0/'}
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--xml');args=parser.parse_args();path=ROOT/'data/wigan-geography.json'
 if args.xml:path.write_text(json.dumps(snapshot(args.xml),ensure_ascii=False,separators=(',',':'))+'\n')
 src=json.loads(path.read_text());data=build(src);(ROOT/'wigan-map.js').write_text('/* Real Wigan geometry, generated by tools/import-wigan.py. Map data © OpenStreetMap contributors, ODbL 1.0. */\nconst WIGAN_MAP='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
 print(json.dumps({'roads':len(data['roads']),'buildings':len(data['buildings']),'platforms':len(data['platforms']),'trees':len(data['vegetation']),'pois':data['pois'],'size':[WIDTH,HEIGHT]},indent=2))
if __name__=='__main__':main()
