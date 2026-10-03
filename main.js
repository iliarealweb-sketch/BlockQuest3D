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

let win;
let updateBusy=false;

function readJson(file,fallback={}) {
  try { return JSON.parse(fs.readFileSync(file,"utf8")); }
  catch { return fallback; }
}

function ensureWritableGame(){
  if(!fs.existsSync(USER_GAME)){
    fs.copyFileSync(path.join(__dirname,GAME_FILE),USER_GAME);
  }
  if(!fs.existsSync(USER_VERSION)){
    fs.copyFileSync(path.join(__dirname,VERSION_FILE),USER_VERSION);
  }
}

function localGamePath(){
  ensureWritableGame();
  return USER_GAME;
}

function createWindow(){
  win=new BrowserWindow({
    width:1440,height:900,minWidth:960,minHeight:640,
    title:"BlockQuest 3D",backgroundColor:"#101820",
    autoHideMenuBar:true,
    webPreferences:{contextIsolation:true,sandbox:true,nodeIntegration:false}
  });
  win.loadFile(localGamePath());
}

function getText(url){
  return new Promise((resolve,reject)=>{
    const req=https.get(url,{
      headers:{
        "Cache-Control":"no-cache, no-store",
        "Pragma":"no-cache",
        "User-Agent":"BlockQuest3D-Updater/3.1.2"
      }
    },res=>{
      if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){
        res.resume();
        return getText(res.headers.location).then(resolve,reject);
      }
      if(res.statusCode!==200){
        res.resume();
        return reject(new Error("HTTP "+res.statusCode));
      }
      let s="";
      res.setEncoding("utf8");
      res.on("data",d=>s+=d);
      res.on("end",()=>resolve(s));
    });
    req.setTimeout(20000,()=>req.destroy(new Error("Timeout")));
    req.on("error",reject);
  });
}

function versionParts(v){
  return String(v||"0").replace(/^v/,"").split(".").map(x=>parseInt(x,10)||0);
}

function isNewer(remote,local){
  const a=versionParts(remote),b=versionParts(local);
  for(let i=0;i<3;i++){
    if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);
  }
  return false;
}

function currentLocalVersion(){
  const user=readJson(USER_VERSION,{});
  const bundled=readJson(path.join(__dirname,VERSION_FILE),{});
  return isNewer(bundled.version,user.version) ? String(bundled.version||"0") : String(user.version||bundled.version||"0");
}

async function checkUpdate(){
  if(updateBusy || !win || win.isDestroyed()) return false;
  updateBusy=true;
  try{
    const localVersion=currentLocalVersion();
    const remote=readJson(
      await getText(REMOTE_VERSION_URL+"?cb="+Date.now()),
      {}
    );

    if(!remote.version || !isNewer(remote.version,localVersion)) return false;

    const answer=await dialog.showMessageBox(win,{
      type:"info",
      buttons:["Update now","Later"],
      defaultId:0,
      cancelId:1,
      title:"BlockQuest 3D Update",
      message:"Version "+remote.version+" is available.",
      detail:remote.notes||"A new version is ready."
    });

    if(answer.response!==0) return false;

    const rawUrl=remote.game_url || remote.url ||
      `https://raw.githubusercontent.com/${REPO}/main/${GAME_FILE}`;
    const url=rawUrl+(rawUrl.includes("?")?"&":"?")+"cb="+Date.now();
    const newGame=await getText(url);

    if(newGame.length<10000 ||
       !newGame.includes("<html") ||
       !newGame.includes("BlockQuest 3D")){
      throw new Error("Downloaded game file is invalid.");
    }

    const tempGame=USER_GAME+".update";
    const tempVersion=USER_VERSION+".update";

    fs.writeFileSync(tempGame,newGame,"utf8");
    fs.writeFileSync(
      tempVersion,
      JSON.stringify({
        version:String(remote.version),
        game_url:remote.game_url||remote.url||undefined
      },null,2)+"\n",
      "utf8"
    );

    fs.rmSync(USER_GAME,{force:true});
    fs.renameSync(tempGame,USER_GAME);
    fs.rmSync(USER_VERSION,{force:true});
    fs.renameSync(tempVersion,USER_VERSION);

    await dialog.showMessageBox(win,{
      type:"info",
      buttons:["Restart"],
      title:"Update installed",
      message:"BlockQuest 3D "+remote.version+" is installed.",
      detail:"The game will restart with the new version."
    });

    app.relaunch();
    app.exit(0);
    return true;
  } finally {
    updateBusy=false;
  }
}

app.whenReady().then(()=>{
  ensureWritableGame();
  createWindow();

  setTimeout(()=>{
    checkUpdate().catch(err=>{
      console.log("BlockQuest updater:",err.message);
    });
  },1200);

  setInterval(()=>{
    checkUpdate().catch(err=>{
      console.log("BlockQuest updater:",err.message);
    });
  },30*60*1000);
});

app.on("window-all-closed",()=>{
  if(process.platform!=="darwin")app.quit();
});