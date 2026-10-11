'use strict';
const {app,BrowserWindow,protocol,net,session,dialog}=require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {ORIGIN,assetPath}=require('./asset-path.cjs');
// A stable local origin keeps saves across launches and installer upgrades.
// The complete game is bundled; no web server or service worker is needed.
protocol.registerSchemesAsPrivileged([{scheme:'rabbits',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true,corsEnabled:true}}]);
let window;
function createWindow(){
 window=new BrowserWindow({width:1280,height:800,minWidth:800,minHeight:450,title:'If I Can Shoot Rabbits',backgroundColor:'#0b100d',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 window.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(ORIGIN+'/'))event.preventDefault()});
 window.loadURL(ORIGIN+'/').catch(error=>dialog.showErrorBox('Unable to start the game',error.message));
 window.on('closed',()=>{window=null});
}
if(!app.requestSingleInstanceLock())app.quit();
else{
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus()}});
 app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((_contents,permission,callback)=>callback(permission==='fullscreen'||permission==='clipboard-sanitized-write'));
  protocol.handle('rabbits',async request=>{
   try{
    const file=assetPath(path.join(__dirname,'game'),request.url);
    // net.fetch preserves native media streaming and byte-range handling.
    return await net.fetch(pathToFileURL(file).href,{headers:request.headers});
   }catch{return new Response('Game asset unavailable',{status:404})}
  });
  createWindow();
  app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow()});
 }).catch(error=>{dialog.showErrorBox('Unable to start the game',error.message);app.quit()});
 app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
}
