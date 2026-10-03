const {app,BrowserWindow,dialog}=require("electron");
const fs=require("fs");
const https=require("https");

const REPO="iliarealweb-sketch/BlockQuest3D";
const VERSION_FILE="desktop-version.json";
const REMOTE_VERSION_URL="https://raw.githubusercontent.com/"+REPO+"/main/"+VERSION_FILE;
const CLASSIC_URL="https://cdn.jsdelivr.net/gh/SajagIN/minecraft-classic@22d79dfae142528bee659fc957fb01a93331b37f/index.html";
const USER_VERSION=app.getPath("userData")+"/"+VERSION_FILE;
let win,updateBusy=false;

function readJson(file,fallback={}){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return fallback;}}
function getText(url){
  return new Promise((resolve,reject)=>{
    const req=https.get(url,{headers:{"Cache-Control":"no-cache, no-store","Pragma":"no-cache","User-Agent":"BlockQuest3D-Updater/4.2.0"}},res=>{
      if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){res.resume();return getText(res.headers.location).then(resolve,reject);}
      if(res.statusCode!==200){res.resume();return reject(new Error("HTTP "+res.statusCode));}
      let s="";res.setEncoding("utf8");res.on("data",d=>s+=d);res.on("end",()=>resolve(s));
    });
    req.setTimeout(20000,()=>req.destroy(new Error("Timeout")));
    req.on("error",reject);
  });
}
function parts(v){return String(v||"0").replace(/^v/,"").split(".").map(x=>parseInt(x,10)||0);}
function isNewer(remote,local){
  const a=parts(remote),b=parts(local);
  for(let i=0;i<3;i++){const aa=a[i]||0,bb=b[i]||0;if(aa!==bb)return aa>bb;}
  return false;
}
function localVersion(){return String(readJson(USER_VERSION,{version:"4.2.0"}).version||"4.2.0");}
function saveVersion(v){fs.writeFileSync(USER_VERSION,JSON.stringify({version:String(v)},null,2)+"\n","utf8");}
function createWindow(){
  win=new BrowserWindow({width:1440,height:900,minWidth:960,minHeight:640,title:"BlockQuest 3D — Minecraft Classic Desktop",backgroundColor:"#111111",autoHideMenuBar:true,fullscreenable:true,webPreferences:{contextIsolation:false,sandbox:false,nodeIntegration:false}});
  win.removeMenu();
  win.webContents.setWindowOpenHandler(()=>({action:"deny"}));
  win.webContents.on("did-fail-load",(_e,code,desc)=>{
    const body="<html><body style=\"margin:0;background:#111;color:#fff;font:16px Arial;text-align:center\"><div style=\"margin-top:18vh\">BlockQuest 3D<br><br>Could not load Minecraft Classic.<br><small>"+String(desc).replace(/</g,"&lt;")+" </small><br><br><button onclick=\"location.href=\\\""+CLASSIC_URL+"\\\"\">Try again</button></div></body></html>";
    if(!win.isDestroyed())win.loadURL("data:text/html;charset=utf-8,"+encodeURIComponent(body));
  });
  win.loadURL(CLASSIC_URL);
}
async function checkUpdate(){
  if(updateBusy||!win||win.isDestroyed())return;
  updateBusy=true;
  try{
    const remote=readJson(await getText(REMOTE_VERSION_URL+"?cb="+Date.now()),{});
    if(!remote.version||!isNewer(remote.version,localVersion()))return;
    const answer=await dialog.showMessageBox(win,{type:"info",buttons:["Update now","Later"],defaultId:0,cancelId:1,title:"BlockQuest 3D Update",message:"Version "+remote.version+" is available.",detail:remote.notes||"A new version is ready."});
    if(answer.response!==0)return;
    saveVersion(remote.version);
    await dialog.showMessageBox(win,{type:"info",buttons:["Restart"],title:"Update installed",message:"BlockQuest 3D "+remote.version+" is installed."});
    app.relaunch();app.exit(0);
  }catch(e){console.log("BlockQuest updater:",e.message);}
  finally{updateBusy=false;}
}
app.whenReady().then(()=>{
  saveVersion(localVersion());
  createWindow();
  setTimeout(()=>checkUpdate(),1200);
  setInterval(()=>checkUpdate(),30*60*1000);
});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit();});
