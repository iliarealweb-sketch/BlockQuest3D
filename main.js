const {app,BrowserWindow,dialog}=require("electron");
const path=require("path");
const fs=require("fs");
const https=require("https");

const REPO="iliarealweb-sketch/BlockQuest3D";
const VERSION_FILE="desktop-version.json";
const GAME_FILE="game.html";
const REMOTE_VERSION_URL=`https://raw.githubusercontent.com/${REPO}/main/${VERSION_FILE}`;
const USER_DIR=app.getPath("userData");
const USER_GAME=path.join(USER_DIR,GAME_FILE);
const USER_VERSION=path.join(USER_DIR,VERSION_FILE);
let win,updateBusy=false;

function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return fallback;}}
function ensureWritableGame(){
  if(!fs.existsSync(USER_GAME))fs.copyFileSync(path.join(__dirname,GAME_FILE),USER_GAME);
  if(!fs.existsSync(USER_VERSION))fs.copyFileSync(path.join(__dirname,VERSION_FILE),USER_VERSION);
}
function getText(url){
  return new Promise((resolve,reject)=>{
    const req=https.get(url,{headers:{"Cache-Control":"no-cache, no-store","Pragma":"no-cache","User-Agent":"BlockQuest3D-Updater/4.0.1"}},res=>{
      if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){res.resume();return getText(res.headers.location).then(resolve,reject);}
      if(res.statusCode!==200){res.resume();return reject(new Error("HTTP "+res.statusCode));}
      let s="";res.setEncoding("utf8");res.on("data",d=>s+=d);res.on("end",()=>resolve(s));
    });
    req.setTimeout(20000,()=>req.destroy(new Error("Timeout")));req.on("error",reject);
  });
}
function parts(v){return String(v||"0").replace(/^v/,"").split(".").map(x=>parseInt(x,10)||0);}
function isNewer(remote,local){
  const a=parts(remote),b=parts(local);
  for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}
  return false;
}
function localVersion(){
  const a=readJson(USER_VERSION,{}),b=readJson(path.join(__dirname,VERSION_FILE),{});
  return isNewer(b.version,a.version)?String(b.version||"0"):String(a.version||b.version||"0");
}
function createWindow(){
  win=new BrowserWindow({width:1440,height:900,minWidth:960,minHeight:640,title:"BlockQuest 3D — Classic Archive",backgroundColor:"#111",autoHideMenuBar:true,webPreferences:{contextIsolation:true,sandbox:true,nodeIntegration:false}});
  win.loadFile(USER_GAME);
}
async function checkUpdate(){
  if(updateBusy||!win||win.isDestroyed())return;
  updateBusy=true;
  try{
    const remote=readJson(await getText(REMOTE_VERSION_URL+"?cb="+Date.now()),{});
    if(!remote.version||!isNewer(remote.version,localVersion()))return;
    const answer=await dialog.showMessageBox(win,{type:"info",buttons:["Update now","Later"],defaultId:0,cancelId:1,title:"BlockQuest 3D Update",message:"Version "+remote.version+" is available.",detail:remote.notes||"A new version is ready."});
    if(answer.response!==0)return;
    const raw=remote.game_url||remote.url||("https://raw.githubusercontent.com/"+REPO+"/main/"+GAME_FILE);
    const url=raw+((raw.includes("?"))?"&":"?")+"cb="+Date.now();
    const game=await getText(url);
    if(game.length<1000||!game.includes("<html")||!game.includes("BlockQuest"))throw new Error("Downloaded game file is invalid.");
    const tg=USER_GAME+".update",tv=USER_VERSION+".update";
    fs.writeFileSync(tg,game,"utf8");
    fs.writeFileSync(tv,JSON.stringify({version:String(remote.version),game_url:raw},null,2)+"\n","utf8");
    fs.rmSync(USER_GAME,{force:true});fs.renameSync(tg,USER_GAME);
    fs.rmSync(USER_VERSION,{force:true});fs.renameSync(tv,USER_VERSION);
    await dialog.showMessageBox(win,{type:"info",buttons:["Restart"],title:"Update installed",message:"BlockQuest 3D "+remote.version+" is installed."});
    app.relaunch();app.exit(0);
  }catch(e){console.log("BlockQuest updater:",e.message);}
  finally{updateBusy=false;}
}
app.whenReady().then(()=>{
  ensureWritableGame();createWindow();
  setTimeout(()=>checkUpdate(),1200);
  setInterval(()=>checkUpdate(),30*60*1000);
});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit();});
