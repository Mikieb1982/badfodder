"""Package generated eight-direction enemy sheets with consistent foot anchors."""
import argparse, json, pathlib, subprocess, tempfile
from PIL import Image
import numpy as np
from scipy.ndimage import label, find_objects, binary_dilation
p=argparse.ArgumentParser();p.add_argument('--german',required=True);p.add_argument('--barcelona',required=True);p.add_argument('--cable',required=True);p.add_argument('--normalizer',required=True);a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[2];out=root/'assets/characters/enemies';out.mkdir(parents=True,exist_ok=True)
for name,source,rows in [('occupation',a.german,4),('barcelona',a.barcelona,4),('cable-street',a.cable,2)]:
 im=Image.open(source).convert('RGBA');pixels=np.array(im);labs,n=label(pixels[:,:,3]>20);boxes={}
 for i,s in enumerate(find_objects(labs),1):
  if s is None or (labs[s]==i).sum()<500:continue
  cy=(s[0].start+s[0].stop)/2;cx=(s[1].start+s[1].stop)/2
  key=(min(rows-1,int(cy/im.height*rows)),min(7,int(cx/im.width*8)))
  if key in boxes:raise ValueError('Merged sprite cell '+str(key))
  boxes[key]=((s[1].start,s[0].start,s[1].stop,s[0].stop),i)
 assert len(boxes)==rows*8,(name,len(boxes))
 atlas=Image.new('RGBA',(2560,rows*256));metadata=[]
 with tempfile.TemporaryDirectory() as tmp:
  tmp=pathlib.Path(tmp)
  for row in range(rows):
   strip=Image.new('RGBA',(8*400,400))
   for col in range(8):
    b,component=boxes[row,col];clean=pixels.copy();clean[:,:,3]=np.where(binary_dilation(labs==component,iterations=1),clean[:,:,3],0);crop=Image.fromarray(clean).crop(b);strip.alpha_composite(crop,(col*400+(400-crop.width)//2,400-crop.height))
   path=tmp/f'row{row}.png';strip.save(path);frames=tmp/f'frames{row}'
   subprocess.run(['python3',a.normalizer,'--input',str(path),'--out-dir',str(frames),'--frames','8','--frame-size','192','--alpha-threshold','20'],check=True)
   rects=[]
   for col in range(8):
    sprite=Image.open(frames/f'{col+1:02d}.png').convert('RGBA')
    alpha=np.array(sprite)[:,:,3];ys,xs=np.where(alpha[160:,:]>20)
    foot=int(np.median(xs)) if len(xs) else 96
    x=col*320+160-foot;y=row*256+64
    assert x>=col*320 and x+192<=(col+1)*320,(name,row,col,foot)
    atlas.alpha_composite(sprite,(x,y));rects.append([col*320,row*256+64,320,192])
   metadata.append(rects)
 atlas.save(out/f'{name}.webp',quality=93,method=6)
 (out/f'{name}.json').write_text(json.dumps({'frames':metadata,'anchor':'bottom-center feet','height':43,'generated':True},indent=2)+'\n')
 print(name,atlas.size,(out/f'{name}.webp').stat().st_size)
