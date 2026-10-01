/* Native-resolution scenery tiles: bounded memory, no enlarged town bitmap. */
window.BadFodderScenery = class {
  constructor({width,height,size=512,limit=16,gutter=0,paint}) {
    Object.assign(this,{width,height,size,limit,gutter,paint});
    this.tiles=new Map();
  }
  draw(ctx,x,y,width,height) {
    const minX=Math.max(0,Math.floor(x/this.size)),minY=Math.max(0,Math.floor(y/this.size));
    const maxX=Math.min(Math.ceil(this.width/this.size)-1,Math.floor((x+width)/this.size));
    const maxY=Math.min(Math.ceil(this.height/this.size)-1,Math.floor((y+height)/this.size));
    const visible=new Set();
    for(let ty=minY;ty<=maxY;ty++)for(let tx=minX;tx<=maxX;tx++) {
      const key=tx+'|'+ty;visible.add(key);
      let tile=this.tiles.get(key);
      if(!tile){
        const left=tx*this.size,top=ty*this.size;
        tile=this.paint(left-this.gutter,top-this.gutter,Math.min(this.size,this.width-left)+this.gutter*2,Math.min(this.size,this.height-top)+this.gutter*2);
      }
      this.tiles.delete(key);this.tiles.set(key,tile);
      ctx.drawImage(tile,tx*this.size-this.gutter,ty*this.size-this.gutter);
    }
    // Never evict a tile still visible: zoomed-out views must not rebake every frame.
    const target=Math.max(this.limit,visible.size);
    for(const key of this.tiles.keys()) {
      if(this.tiles.size<=target)break;
      if(!visible.has(key))this.tiles.delete(key);
    }
  }
};
