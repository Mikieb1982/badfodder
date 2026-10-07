"""Build compact 48-second mission beds from credited CC0 samples (ffmpeg required)."""
import array, hashlib, json, pathlib, subprocess, tempfile, urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[2]
SOURCES={
 'wind':('https://opengameart.org/sites/default/files/wind1.wav','https://opengameart.org/content/wind1','Luke.RUSTLTD'),
 'crowd':('https://opengameart.org/sites/default/files/crowd_shouting_0.ogg','https://opengameart.org/content/crowd-shoutingspeaking-ambience','StarNinjas'),
 'shot':('https://opengameart.org/sites/default/files/gunfire_sfx.wav','https://opengameart.org/content/random-gunfire-sfx','iamoneabe'),
 'boom':('https://opengameart.org/sites/default/files/NenadSimic%20-%20Muffled%20Distant%20Explosion.wav','https://opengameart.org/content/muffled-distant-explosion','NenadSimic')
}
RATE=24000
OUT=ROOT/'assets/audio/ambience'
OUT.mkdir(parents=True,exist_ok=True)
def run(args):
 return subprocess.check_output(['ffmpeg','-v','error','-y',*args])
with tempfile.TemporaryDirectory() as tmp:
 samples={}; manifest={}
 for key,(url,page,author) in SOURCES.items():
  request=urllib.request.Request(url,headers={'User-Agent':'IfICanShootRabbits-CC0-AudioImport/1.0'})
  with urllib.request.urlopen(request,timeout=90) as response: data=response.read(16*1024*1024)
  source=pathlib.Path(tmp)/key; source.write_bytes(data)
  filters='highpass=f=80,lowpass=f=1800' if key in ('shot','boom') else 'highpass=f=90,lowpass=f=3200'
  raw=run(['-i',str(source),'-af',filters,'-ac','1','-ar',str(RATE),'-f','f32le','pipe:1'])
  values=array.array('f'); values.frombytes(raw)
  if not values: raise ValueError('Empty source '+key)
  peak=max(abs(v) for v in values) or 1
  samples[key]=[v/peak for v in values]
  manifest[key]={'source':page,'download':url,'author':author,'license':'CC0-1.0','sha256':hashlib.sha256(data).hexdigest()}
 def layer(mix,key,start,gain,loop=False):
  values=samples[key]; offset=int(start*RATE)
  length=len(mix)-offset if loop else min(len(values),len(mix)-offset)
  for j in range(length): mix[offset+j]+=values[j%len(values)]*gain
 # Sparse distant reports leave nearby gameplay gunfire readable. Cable Street has no gunfire.
 profiles={
  'bad-belzig':(.10,.025,[7,23,37],[18,41]),
  'wigan':(.065,.055,[12,28,42],[33]),
  'cable-street':(.035,.22,[],[]),
  'barcelona':(.035,.14,[6,16,29,39],[22,43])
 }
 for mission,(wind,crowd,shots,booms) in profiles.items():
  mix=[0.0]*(48*RATE)
  layer(mix,'wind',0,wind,True);layer(mix,'crowd',0,crowd,True)
  for t in shots: layer(mix,'shot',t,.12)
  for t in booms: layer(mix,'boom',t,.09)
  # Equal start/end silence with short edge fades prevents clicks when looped.
  edge=int(.65*RATE)
  for j in range(edge):
   mix[j]*=j/edge;mix[-1-j]*=j/edge
  raw=pathlib.Path(tmp)/(mission+'.raw');raw.write_bytes(array.array('f',mix).tobytes())
  for ext,codec,bitrate in [('mp3','libmp3lame','64k'),('webm','libopus','40k')]:
   run(['-f','f32le','-ar',str(RATE),'-ac','1','-i',str(raw),'-c:a',codec,'-b:a',bitrate,str(OUT/(mission+'.'+ext))])
 manifest['notes']='Edited sound-design beds, not historical recordings: filtered, peak-normalised, mixed, faded; 48 s mono loops. Existing music and live action SFX retained.'
 (OUT/'sources.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print('Built all four mission beds')
