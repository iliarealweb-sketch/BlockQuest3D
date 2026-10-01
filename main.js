const {app,BrowserWindow,dialog}=require("electron");
const path=require("path");
const fs=require("fs");
const https=require("https");

const REPO="iliarealweb-sketch/BlockQuest3D";
const VERSION_FILE="desktop-version.json";
const GAME_FILE="game.html";
const CHECK_URL=`https://raw.githubusercontent.com/${REPO}/main/${VERSION_FILE}`;

let win;

function createWindow(){
  win=new BrowserWindow({
    width:1440,height:900,minWidth:960,minHeight:640,
    title:"BlockQuest 3D",backgroundColor:"#101820",
    autoHideMenuBar:true,
    webPreferences:{contextIsolation:true,sandbox:true,nodeIntegration:false}
  });
  win.loadFile(path.join(__dirname,GAME_FILE));
}

function getJson(url){
  return new Promise((resolve,reject)=>{
    https.get(url,res=>{
      if(res.statusCode>=300&&res.statusCode<400&&res.headers.location)
        return getJson(res.headers.location).then(resolve,reject);
      if(res.statusCode!==200) return reject(new Error("HTTP "+res.statusCode));
      let s="";
      res.setEncoding("utf8");
      res.on("data",d=>s+=d);
      res.on("end",()=>{try{resolve(JSON.parse(s))}catch(e){reject(e)}});
    }).on("error",reject);
  });
}

function download(url){
  return new Promise((resolve,reject)=>{
    https.get(url,res=>{
      if(res.statusCode>=300&&res.statusCode<400&&res.headers.location)
        return download(res.headers.location).then(resolve,reject);
      if(res.statusCode!==200) return reject(new Error("HTTP "+res.statusCode));
      let s="";
      res.setEncoding("utf8");
      res.on("data",d=>s+=d);
      res.on("end",()=>resolve(s));
    }).on("error",reject);
  });
}

async function checkUpdate(){
  const localFile=path.join(__dirname,VERSION_FILE);
  let local={version:"1.0.0"};
  try{local=JSON.parse(fs.readFileSync(localFile,"utf8"))}catch{}

  const remote=await getJson(CHECK_URL);
  if(!remote.version||String(remote.version)===String(local.version)) return;

  const answer=await dialog.showMessageBox(win,{
    type:"info",buttons:["Update now","Later"],defaultId:0,cancelId:1,
    title:"BlockQuest 3D Update",
    message:"Version "+remote.version+" is available.",
    detail:remote.notes||"Update the game now?"
  });
  if(answer.response!==0)return;

  const url=remote.game_url ||
    `https://raw.githubusercontent.com/${REPO}/main/${GAME_FILE}`;
  const newGame=await download(url);

  const temp=path.join(__dirname,"game.html.update");
  fs.writeFileSync(temp,newGame,"utf8");
  fs.renameSync(temp,path.join(__dirname,GAME_FILE));

  const vtemp=path.join(__dirname,VERSION_FILE+".update");
  fs.writeFileSync(vtemp,JSON.stringify({
    version:String(remote.version)
  }),"utf8");
  fs.renameSync(vtemp,path.join(__dirname,VERSION_FILE));

  await dialog.showMessageBox(win,{
    type:"info",buttons:["Restart"],title:"Update installed",
    message:"BlockQuest 3D has been updated."
  });
  app.relaunch();
  app.exit(0);
}

app.whenReady().then(()=>{
  createWindow();
  setTimeout(()=>checkUpdate().catch(()=>{}),1800);
  setInterval(()=>checkUpdate().catch(()=>{}),6*60*60*1000);
});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});
