from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing patch target: {label}')
    return text.replace(old, new, 1)


p = Path('index.html')
s = p.read_text()

s = replace_once(
    s,
    '<dt>SQUAD</dt><dd>1–8 / A, or select a squad portrait.</dd>',
    '<dt>SQUAD</dt><dd>1–8 selects one soldier. Tap squad portraits to add/remove soldiers from the active group. A / ALL reunites the squad.</dd>',
    'controls copy',
)
s = replace_once(
    s,
    '<div><strong>Squad:</strong> select a squad portrait or ALL in the HUD. Keyboard: 1–8 or A.</div>',
    '<div><strong>Squad:</strong> tap portraits to build any subgroup (1+3, 2+2, etc.); ALL reunites everyone. Keyboard: 1–8, Shift/Ctrl + number to add/remove, A for all.</div>',
    'help copy',
)

old = """  function selectedUnits(){
    if(commands&&commands.mode!=='local')return commands.units(squad,selection);
    const units=squad.filter((s,i)=>s.alive&&(selection==='all'||selection===i));
    if(units.length)return units;
    return squad.filter(s=>s.alive);
  }
"""
new = """  function selectionContains(index,sel=selection){
    return sel==='all'||sel===index||(Array.isArray(sel)&&sel.includes(index));
  }
  function selectionIds(sel=selection){
    const allowed=squad.map((s,i)=>s.alive&&(!commands||commands.owns(i))?i:-1).filter(i=>i>=0);
    if(sel==='all')return allowed;
    const values=Array.isArray(sel)?sel:[sel];
    return [...new Set(values)].filter(i=>Number.isInteger(i)&&allowed.includes(i));
  }
  function selectedUnits(){
    if(commands&&commands.mode!=='local')return commands.units(squad,selection);
    const ids=new Set(selectionIds());
    const units=squad.filter((s,i)=>s.alive&&ids.has(i));
    if(units.length)return units;
    return squad.filter(s=>s.alive);
  }
"""
s = replace_once(s, old, new, 'selection helpers')

old = """  function rebuildUnitButtons(){
    unitButtons.forEach(b=>b.remove());
    unitButtons=squad.map((s,i)=>{
      const b=document.createElement('button');
      b.className='unitBtn';
      b.dataset.unit=String(i);
      b.type='button';
      b.textContent=(i+1)+' '+s.name;
      b.addEventListener('click',()=>setSelection(i));
      selectAllBtn.parentElement.appendChild(b);
      return b;
    });
  }

  function setSelection(sel){
    if(commands&&commands.mode!=='local'&&sel!=='all'&&!commands.owns(sel))return;
    selection=sel;
    squad.forEach((s,i)=>s.selected=s.alive&&(!commands||commands.owns(i))&&(sel==='all'||sel===i));
    selectAllBtn.classList.toggle('active',sel==='all');
    hudAll.classList.toggle('selected',sel==='all');
    hudAll.setAttribute('aria-pressed',String(sel==='all'));
    unitButtons.forEach((b,i)=>b.classList.toggle('active',sel===i));
    updateRoster();
  }
"""
new = """  function rebuildUnitButtons(){
    unitButtons.forEach(b=>b.remove());
    unitButtons=squad.map((s,i)=>{
      const b=document.createElement('button');
      b.className='unitBtn';
      b.dataset.unit=String(i);
      b.type='button';
      b.textContent=(i+1)+' '+s.name;
      b.addEventListener('click',evt=>(evt.shiftKey||evt.ctrlKey||evt.metaKey)?toggleSelection(i):setSelection(i));
      selectAllBtn.parentElement.appendChild(b);
      return b;
    });
  }

  function setSelection(sel){
    const next=sel==='all'?'all':selectionIds(sel);
    if(next!=='all'&&!next.length)return;
    if(squadFormation.active)clearSquadFormation();
    selection=next;
    const ids=new Set(selectionIds());
    squad.forEach((s,i)=>s.selected=s.alive&&(!commands||commands.owns(i))&&ids.has(i));
    const all=selection==='all';
    selectAllBtn.classList.toggle('active',all);
    hudAll.classList.toggle('selected',all);
    hudAll.setAttribute('aria-pressed',String(all));
    unitButtons.forEach((b,i)=>b.classList.toggle('active',ids.has(i)));
    updateRoster(true);
  }

  function toggleSelection(index){
    if(!squad[index]?.alive||(commands&&commands.mode!=='local'&&!commands.owns(index)))return;
    const available=selectionIds('all');
    if(selection==='all'){setSelection([index]);return;}
    const current=selectionIds();
    if(current.includes(index)){
      if(current.length===1){
        const others=available.filter(i=>i!==index);
        setSelection(others.length?others:current);
      }else setSelection(current.filter(i=>i!==index));
      return;
    }
    setSelection([...current,index].sort((a,b)=>a-b));
  }
"""
s = replace_once(s, old, new, 'selection UI')

s = replace_once(
    s,
    "chip.addEventListener('click',()=>setSelection(i));hudChips.set(i,chip);hudSquadBar.appendChild(chip);",
    "chip.addEventListener('click',()=>toggleSelection(i));hudChips.set(i,chip);hudSquadBar.appendChild(chip);",
    'HUD toggle',
)

old = """      if(team==='squad'&&selection!=='all'&&squad[selection]===target){
        const living=squad.filter(s=>s.alive);
        if(living.length)setSelection('all');
      }
"""
new = """      if(team==='squad'&&selection!=='all'&&selectionContains(squad.indexOf(target))){
        const remaining=selectionIds();
        if(remaining.length)setSelection(remaining);
        else if(squad.some(s=>s.alive))setSelection('all');
      }
"""
s = replace_once(s, old, new, 'selection death recovery')

old = """    if(units.length===1){
      clearSquadFormation();
      if(!assignPath(units[0],tx,ty))setStatus('No clear route to that position.');
      return;
    }

    clearSquadFormation();
"""
new = """    if(units.length===1){
      clearSquadFormation();
      if(!assignPath(units[0],tx,ty))setStatus('No clear route to that position.');
      return;
    }

    // Explicit subgroups keep independent paths so one group can continue moving
    // while the player switches to and commands another group.
    if(selection!=='all'){
      clearSquadFormation();
      const heading=Math.atan2(ty-units[0].y,tx-units[0].x),rx=-Math.sin(heading),ry=Math.cos(heading);
      let routed=0;
      units.forEach((unit,i)=>{
        const offset=(i-(units.length-1)/2)*26;
        const gx=Math.max(16,Math.min(WORLD_W-16,tx+rx*offset));
        const gy=Math.max(16,Math.min(WORLD_H-16,ty+ry*offset));
        if(assignPath(unit,gx,gy)||assignPath(unit,tx,ty))routed++;
      });
      if(!routed)setStatus('No clear route to that position.');
      return;
    }

    clearSquadFormation();
"""
s = replace_once(s, old, new, 'subgroup movement')

old = """      for(let i=0;i<squad.length;i++){
        const s=squad[i];
        if(s.alive&&Math.hypot(s.x-p.x,s.y-p.y)<22){setSelection(i);return}
      }
"""
new = """      for(let i=0;i<squad.length;i++){
        const s=squad[i];
        if(s.alive&&Math.hypot(s.x-p.x,s.y-p.y)<22){
          if(evt.shiftKey||evt.ctrlKey||evt.metaKey)toggleSelection(i);else setSelection(i);
          return;
        }
      }
"""
s = replace_once(s, old, new, 'canvas subgroup selection')

old = """    if(/^[1-8]$/.test(e.key)){
      const index=Number(e.key)-1;
      if(index<squad.length)setSelection(index);
    }
"""
new = """    if(/^[1-8]$/.test(e.key)){
      const index=Number(e.key)-1;
      if(index<squad.length){
        if(e.shiftKey||e.ctrlKey||e.metaKey)toggleSelection(index);else setSelection(index);
      }
    }
"""
s = replace_once(s, old, new, 'keyboard subgroup selection')

old = "      if(selection!=='all'&&!squad[selection]?.alive)setSelection('all');\n"
new = """      if(selection!=='all'){
        const remaining=selectionIds();
        if(remaining.length)setSelection(remaining);else setSelection('all');
      }
"""
s = replace_once(s, old, new, 'coop selection recovery')

s = s.replace(
    "if(selection==='all')clearSquadFormation();",
    "if(selectedUnits().length>1)clearSquadFormation();",
)
p.write_text(s)

p = Path('player-commands.js')
s = p.read_text()
old = "function units(squad,selection){return squad.filter((s,i)=>s.alive&&(applying?applying.includes(i):owns(i)&&(selection==='all'||selection===i)));}"
new = "function units(squad,selection){return squad.filter((s,i)=>s.alive&&(applying?applying.includes(i):owns(i)&&(selection==='all'||selection===i||(Array.isArray(selection)&&selection.includes(i)))));}"
if old not in s:
    raise SystemExit('missing patch target: player command groups')
p.write_text(s.replace(old, new, 1))

p = Path('tests/browser-contract.cjs')
s = p.read_text()
anchor = "assert(html.includes(\"keyboardFireHeld=true\"),'F-key firing state missing');\n"
extra = """assert(html.includes('function toggleSelection(index)'),'Flexible squad subgroup selection missing');
assert(html.includes("chip.addEventListener('click',()=>toggleSelection(i))"),'HUD portraits do not toggle subgroup membership');
assert(html.includes("if(selection!=='all'){"),'Subgroup movement branch missing');
"""
if anchor not in s:
    raise SystemExit('missing patch target: browser contract')
p.write_text(s.replace(anchor, anchor + extra, 1))

p = Path('tests/browser-lifecycle.cjs')
s = p.read_text()
old = "units:squad.map(s=>({x:s.x,y:s.y,hp:s.hp}))"
new = "units:squad.map(s=>({x:s.x,y:s.y,hp:s.hp,selected:s.selected}))"
if old not in s:
    raise SystemExit('missing patch target: lifecycle state')
s = s.replace(old, new, 1)
anchor = "  const before=await page.evaluate(()=>window.__testGame.state().units[0]);\n"
extra = """  const chips=page.locator('#hudSquadBar .hud-unit');
  await chips.nth(0).click();
  assert.deepEqual(await page.evaluate(()=>window.__testGame.state().units.map(u=>u.selected)),[true,false,false,false],'Portrait tap must isolate one soldier');
  await chips.nth(0).click();
  assert.deepEqual(await page.evaluate(()=>window.__testGame.state().units.map(u=>u.selected)),[false,true,true,true],'Tapping the lone selected soldier must switch to the other three');
  await page.locator('#hudAll').click();await chips.nth(0).click();await chips.nth(1).click();
  assert.deepEqual(await page.evaluate(()=>window.__testGame.state().units.map(u=>u.selected)),[true,true,false,false],'Two-soldier subgroup selection failed');
  const pairBefore=await page.evaluate(()=>window.__testGame.state().units.slice(0,2));
  await page.locator('#game').click({position:await page.evaluate(()=>window.__testGame.moveTarget())});await page.waitForTimeout(500);
  const pairAfter=await page.evaluate(()=>window.__testGame.state().units.slice(0,2));
  assert(pairAfter.every((u,i)=>Math.hypot(u.x-pairBefore[i].x,u.y-pairBefore[i].y)>1),'Selected pair did not move as a subgroup');
  await page.locator('#hudAll').click();
"""
if anchor not in s:
    raise SystemExit('missing patch target: lifecycle subgroup test')
p.write_text(s.replace(anchor, extra + anchor, 1))
