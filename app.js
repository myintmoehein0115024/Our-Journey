const $ = (id) => document.getElementById(id);
const config = window.OUR_JOURNEY_CONFIG || {};

const backTop = $("backTop");
function updateBackTop() {
  if (!backTop) return;
  if (window.scrollY > 420) backTop.classList.add("show");
  else backTop.classList.remove("show");
}
window.addEventListener("scroll", updateBackTop, {passive:true});
if (backTop) backTop.addEventListener("click", () => window.scrollTo({top:0, behavior:"smooth"}));

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", event => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({behavior:"smooth", block:"start"});
  });
});
const sectionLinks = document.querySelectorAll('a[href^="#"]');
sectionLinks.forEach(link => {
  link.addEventListener("click", () => {
    document.body.classList.add("navigating");
    window.setTimeout(() => document.body.classList.remove("navigating"), 450);
  });
});

// v3 — cross-platform PWA installation
let deferredInstallPrompt = null;
const installTrigger = $("installTrigger");
const installLabel = $("installLabel");
const installModal = $("installModal");
const nativeInstallBox = $("nativeInstallBox");
const nativeInstall = $("nativeInstall");
const installGuide = $("installGuide");

function platformInfo() {
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isIOS;
  const isWindows = /Windows/i.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  return {isIOS,isAndroid,isMac,isWindows,isStandalone};
}
function guideHTML(info) {
  if (info.isIOS) return `<h3>iPhone / iPad</h3><div class="step"><span class="num">1</span><div><strong>Open this page in Safari</strong><p>Use Safari, not an in-app browser.</p></div></div><div class="step"><span class="num">2</span><div><strong>Tap Share</strong><p>Choose <b>Add to Home Screen</b>.</p></div></div><div class="step"><span class="num">3</span><div><strong>Turn on “Open as Web App”</strong><p>Then tap <b>Add</b>.</p></div></div>`;
  if (info.isAndroid) return `<h3>Android</h3><div class="step"><span class="num">1</span><div><strong>Use Chrome or a supported browser</strong><p>If an install button appears above, tap it.</p></div></div><div class="step"><span class="num">2</span><div><strong>Or open the browser menu</strong><p>Choose <b>Install app</b> or <b>Add to Home screen</b>.</p></div></div>`;
  if (info.isMac) return `<h3>Mac</h3><div class="step"><span class="num">1</span><div><strong>Safari · macOS Sonoma 14+</strong><p>Choose <b>Share → Add to Dock</b>.</p></div></div><div class="step"><span class="num">2</span><div><strong>Chrome / Edge</strong><p>Use the browser's <b>Install</b> option when available.</p></div></div>`;
  if (info.isWindows) return `<h3>Windows PC</h3><div class="step"><span class="num">1</span><div><strong>Chrome / Edge</strong><p>Use the <b>Install</b> icon in the address bar or browser menu.</p></div></div>`;
  return `<h3>Install on your device</h3><div class="step"><span class="num">1</span><div><strong>Use your browser's install option</strong><p>Look for <b>Install</b>, <b>Add to Home Screen</b>, or <b>Add to Dock</b>.</p></div></div>`;
}
function updateInstallUI(){
  if (!installTrigger) return;
  const info = platformInfo();
  if (info.isStandalone) { installTrigger.hidden = true; return; }
  installTrigger.hidden = false;
  if (installLabel) installLabel.textContent = info.isIOS ? "Add to Home" : info.isMac ? "Add to Dock" : "Install App";
}
function openInstallModal(){
  const info = platformInfo();
  if (installGuide) installGuide.innerHTML = guideHTML(info);
  if (installModal) { installModal.hidden=false; installModal.setAttribute("aria-hidden","false"); }
  document.body.style.overflow="hidden";
  if (nativeInstallBox) nativeInstallBox.hidden = !(deferredInstallPrompt && !info.isIOS);
}
function closeInstallModal(){
  if (installModal) { installModal.hidden=true; installModal.setAttribute("aria-hidden","true"); }
  document.body.style.overflow="";
}
installTrigger?.addEventListener("click", openInstallModal);
document.querySelectorAll("[data-install-close]").forEach(el => el.addEventListener("click", closeInstallModal));
document.addEventListener("keydown", e => { if (e.key === "Escape") { if (installModal && !installModal.hidden) closeInstallModal(); if (!$("memoryModal")?.hidden) closeMemoryModal(); if (!$("memoryLightbox")?.hidden) closeLightbox(); } });
window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); deferredInstallPrompt=event; updateInstallUI(); });
nativeInstall?.addEventListener("click", async () => { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt=null; closeInstallModal(); updateInstallUI(); });
window.addEventListener("appinstalled", () => { deferredInstallPrompt=null; closeInstallModal(); updateInstallUI(); });
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(()=>{}));
updateInstallUI();

// v4 — live relationship day counter
(function(){
  const start = new Date("2024-03-20T00:00:00");
  const el = $("storyDays");
  if (!el) return;
  const diff = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
  el.textContent = `${diff.toLocaleString()} days together`;
})();

// v5 — private Google Drive memory cabinet
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
let googleCodeClient = null;
let driveAccessToken = null;
let driveTokenExpiresAt = 0;
let driveFolderId = localStorage.getItem("ourJourneyDriveFolderId") || "";
let driveUserEmail = "";
let driveMemories = [];

const driveStatus = $("driveStatus");
const driveStatusText = $("driveStatusText");
const driveConnectBtn = $("driveConnectBtn");
const driveAddBtn = $("driveAddBtn");
const driveRefreshBtn = $("driveRefreshBtn");
const driveSetupNote = $("driveSetupNote");
const memoryGrid = $("memoryGrid");
const memoryEmpty = $("memoryEmpty");
const memoryModal = $("memoryModal");
const memoryFile = $("memoryFile");
const memoryFileName = $("memoryFileName");
const memoryPreview = $("memoryPreview");
const memoryDate = $("memoryDate");
const memoryTitleInput = $("memoryTitleInput");
const memoryNote = $("memoryNote");
const memorySoftTone = $("memorySoftTone");
const memoryUploadBtn = $("memoryUploadBtn");
const memoryProgress = $("memoryProgress");
const memoryProgressLabel = $("memoryProgressLabel");
const memoryProgressValue = $("memoryProgressValue");
const memoryProgressBar = $("memoryProgressBar");
const lightbox = $("memoryLightbox");
const lightboxMedia = $("lightboxMedia");
const lightboxCaption = $("lightboxCaption");

function workerConfigured(){
  return config.DRIVE_API_BASE && !String(config.DRIVE_API_BASE).includes("REPLACE-WITH-YOUR-WORKER");
}
function setDriveStatus(state, text){
  if (driveStatus) driveStatus.dataset.state=state;
  if (driveStatusText) driveStatusText.textContent=text;
}
function showToast(message, kind="normal"){
  let t=document.getElementById("ojToast");
  if(!t){ t=document.createElement("div"); t.id="ojToast"; t.className="oj-toast"; document.body.appendChild(t); }
  t.dataset.kind=kind; t.textContent=message; t.classList.add("show");
  clearTimeout(showToast._timer); showToast._timer=setTimeout(()=>t.classList.remove("show"),3600);
}
function escapeHTML(value){
  return String(value ?? "").replace(/[&<>\"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
}
function isoToday(){ return new Date().toISOString().slice(0,10); }

function initGoogleCodeClient(){
  if (!window.google?.accounts?.oauth2 || !config.GOOGLE_CLIENT_ID) return false;
  googleCodeClient = google.accounts.oauth2.initCodeClient({
    client_id: config.GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPE,
    ux_mode: "popup",
    select_account: true,
    callback: async (response) => {
      if (response?.error) { showToast(`Google 授权未完成：${response.error}`, "error"); return; }
      try { await exchangeCode(response.code); }
      catch (err) { console.error(err); setDriveStatus("error", "Google Drive connection failed"); showToast(err.message || "Google Drive 授权失败", "error"); }
    }
  });
  return true;
}

async function exchangeCode(code){
  if(!workerConfigured()) throw new Error("还没有配置 Google Drive Worker。先把 drive-config.js 里的 Worker 地址换成你的 Cloudflare Worker 地址。");
  setDriveStatus("busy", "Connecting to Google Drive…");
  driveConnectBtn.disabled=true;
  const response=await fetch(`${config.DRIVE_API_BASE.replace(/\/$/,"")}/oauth/code`,{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded","X-Requested-With":"XMLHttpRequest"},
    body:new URLSearchParams({code}),
    credentials:"omit"
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok || !data.access_token) throw new Error(data.error_description || data.error || `授权服务器返回 ${response.status}`);
  driveAccessToken=data.access_token;
  driveTokenExpiresAt=Date.now()+Math.max(30, Number(data.expires_in||3600)-60)*1000;
  driveConnectBtn.hidden=true;
  driveAddBtn.hidden=false;
  driveRefreshBtn.hidden=false;
  if (driveSetupNote) driveSetupNote.hidden=true;
  setDriveStatus("connected", "Google Drive connected");
  showToast("Google Drive 已连接。你的文件保持在自己的 Drive 里。", "success");
  await ensureDriveFolder();
  await listMemories();
  driveConnectBtn.disabled=false;
}

async function refreshAccessTokenIfNeeded(){
  // Access tokens are intentionally memory-only in v1. Reconnect after expiry instead of persisting a refresh token.
  if(!driveAccessToken || Date.now()>=driveTokenExpiresAt) throw new Error("Google Drive 授权已过期，请重新连接 Google Drive。");
  return driveAccessToken;
}
async function driveFetch(url, options={}){
  const token=await refreshAccessTokenIfNeeded();
  const headers=new Headers(options.headers||{});
  headers.set("Authorization", `Bearer ${token}`);
  const response=await fetch(url,{...options,headers});
  if(response.status===401){ driveAccessToken=null; driveTokenExpiresAt=0; setDriveStatus("error","Google Drive authorization expired"); throw new Error("Google Drive 授权已过期，请重新连接 Google Drive。"); }
  return response;
}

async function ensureDriveFolder(){
  if(driveFolderId) return driveFolderId;
  const meta={name:"Our Journey",mimeType:"application/vnd.google-apps.folder",appProperties:{oj_kind:"root"}};
  const response=await driveFetch(DRIVE_API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(meta)});
  if(!response.ok) throw new Error(`无法创建 Our Journey 文件夹：${response.status}`);
  const data=await response.json();
  driveFolderId=data.id;
  localStorage.setItem("ourJourneyDriveFolderId",driveFolderId);
  return driveFolderId;
}

function formatBytes(bytes){
  const n=Number(bytes||0); if(!n) return "—";
  const units=["B","KB","MB","GB"]; let i=0,v=n;
  while(v>=1024 && i<units.length-1){v/=1024;i++;}
  return `${v.toFixed(v>=10||i===0?0:1)} ${units[i]}`;
}
function memoryCardHTML(item,index){
  const title=escapeHTML(item.appProperties?.oj_title || item.name);
  const date=escapeHTML(item.appProperties?.oj_date || item.createdTime?.slice(0,10) || "");
  const note=escapeHTML(item.appProperties?.oj_note || "");
  const kind=item.mimeType?.startsWith("video/")?"video":"photo";
  const posterId=item.appProperties?.oj_posterId || "";
  return `<article class="memory-card" data-memory-index="${index}">
    <button class="memory-visual" type="button" aria-label="Open ${title}">
      <div class="memory-media-shell" data-memory-media data-id="${escapeHTML(kind==='video'?posterId:item.id)}" data-thumb="${escapeHTML(item.thumbnailLink || "")}" data-kind="${kind}" data-name="${escapeHTML(item.name)}"><span class="memory-loading">♡</span></div>
      ${kind==='video'?'<span class="memory-type">VIDEO</span>':''}
    </button>
    <div class="memory-meta"><div><span>${date}</span><h3>${title}</h3></div><span class="memory-size">${formatBytes(item.size)}</span></div>
    ${note?`<p>${note}</p>`:""}
  </article>`;
}

async function listMemories(){
  if(!driveFolderId) return;
  memoryGrid.innerHTML="";
  memoryGrid.appendChild(memoryEmpty);
  memoryEmpty.hidden=false;
  const q=`'${driveFolderId}' in parents and trashed = false`;
  const url=`${DRIVE_API}?q=${encodeURIComponent(q)}&orderBy=createdTime%20desc&pageSize=50&fields=files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,appProperties),nextPageToken`;
  const response=await driveFetch(url);
  const data=await response.json();
  if(!response.ok) throw new Error(data.error?.message || `读取 Drive 记忆失败：${response.status}`);
  driveMemories=(data.files||[]).filter(item => { const kind=item.appProperties?.oj_kind; return kind === "photo" || kind === "video"; });
  if(!driveMemories.length){ memoryEmpty.hidden=false; return; }
  memoryEmpty.hidden=true;
  driveMemories.forEach((item,index)=>memoryGrid.insertAdjacentHTML("beforeend",memoryCardHTML(item,index)));
  await hydrateMemoryMedia();
}

async function fetchDriveBlob(fileId){
  const response=await driveFetch(`${DRIVE_API}/${encodeURIComponent(fileId)}?alt=media`,{method:"GET"});
  if(!response.ok) throw new Error(`读取媒体失败：${response.status}`);
  return response.blob();
}
async function hydrateMemoryMedia(){
  const nodes=[...document.querySelectorAll("[data-memory-media]")];
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){ observer.unobserve(entry.target); loadMemoryThumb(entry.target).catch(()=>{}); }}),{rootMargin:"160px"});
  nodes.forEach(n=>observer.observe(n));
}
async function loadMemoryThumb(shell){
  if(shell.dataset.loaded==="1") return;
  shell.dataset.loaded="1";
  const id=shell.dataset.id; if(!id) { shell.innerHTML='<span class="memory-fallback">Video</span>'; return; }
  try{
    let blob=null;
    const thumb=shell.dataset.thumb;
    if(thumb){
      const response=await driveFetch(thumb);
      if(response.ok) blob=await response.blob();
    }
    if(!blob) blob=await fetchDriveBlob(id);
    const url=URL.createObjectURL(blob);
    shell.innerHTML=`<img src="${url}" alt="Memory" loading="lazy">`;
    shell.dataset.objectUrl=url;
  }catch(err){ shell.innerHTML='<span class="memory-fallback">♡</span>'; }
}

function openMemoryModal(){
  if(!driveAccessToken){ showToast("先连接 Google Drive。", "error"); return; }
  if(memoryDate) memoryDate.value=isoToday();
  if(memoryTitleInput) memoryTitleInput.value="";
  if(memoryNote) memoryNote.value="";
  if(memoryFile) memoryFile.value="";
  if(memoryFileName) memoryFileName.textContent="Nothing selected yet";
  if(memoryPreview){ memoryPreview.hidden=true; memoryPreview.innerHTML=""; }
  if(memoryProgress) memoryProgress.hidden=true;
  memoryModal.hidden=false; memoryModal.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden";
}
function closeMemoryModal(){
  if(!memoryModal) return;
  memoryModal.hidden=true; memoryModal.setAttribute("aria-hidden","true"); document.body.style.overflow="";
  if(memoryPreview) memoryPreview.innerHTML="";
}
function setProgress(label,value){
  if(memoryProgress) memoryProgress.hidden=false;
  if(memoryProgressLabel) memoryProgressLabel.textContent=label;
  if(memoryProgressValue) memoryProgressValue.textContent=`${Math.round(value)}%`;
  if(memoryProgressBar) memoryProgressBar.style.width=`${Math.max(0,Math.min(100,value))}%`;
}

async function previewSelectedFile(){
  const file=memoryFile.files?.[0]; if(!file) return;
  memoryFileName.textContent=`${file.name} · ${formatBytes(file.size)}`;
  const url=URL.createObjectURL(file);
  memoryPreview.innerHTML=file.type.startsWith("video/")?`<video src="${url}" controls muted playsinline></video>`:`<img src="${url}" alt="Selected memory">`;
  memoryPreview.hidden=false;
}

async function prepareImage(file, pastel){
  let source, width, height, cleanup=()=>{};
  if(window.createImageBitmap){
    const bitmap=await createImageBitmap(file); source=bitmap; width=bitmap.width; height=bitmap.height; cleanup=()=>bitmap.close();
  } else {
    const url=URL.createObjectURL(file); const img=new Image(); img.src=url;
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});
    source=img; width=img.naturalWidth; height=img.naturalHeight; cleanup=()=>URL.revokeObjectURL(url);
  }
  const maxSide=2560; const scale=Math.min(1,maxSide/Math.max(width,height));
  const w=Math.max(1,Math.round(width*scale)), h=Math.max(1,Math.round(height*scale));
  const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h;
  const ctx=canvas.getContext("2d",{alpha:false});
  if(pastel) ctx.filter="saturate(0.95) brightness(1.015) sepia(0.02)";
  ctx.drawImage(source,0,0,w,h); cleanup();
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("图片压缩失败")),"image/jpeg",0.9));
  return new File([blob], file.name.replace(/\.[^.]+$/i,"")+".jpg",{type:"image/jpeg",lastModified:Date.now()});
}
async function createVideoPoster(file){
  const url=URL.createObjectURL(file); const video=document.createElement("video");
  video.preload="metadata"; video.muted=true; video.playsInline=true; video.src=url;
  await new Promise((resolve,reject)=>{video.onloadedmetadata=()=>resolve();video.onerror=()=>reject(new Error("无法读取视频预览"));});
  const seekTime=Math.min(1.5, Math.max(0,(video.duration||1)/3));
  await new Promise((resolve,reject)=>{video.currentTime=seekTime;video.onseeked=()=>resolve();video.onerror=()=>reject(new Error("无法生成视频封面"));});
  const maxSide=1280; const scale=Math.min(1,maxSide/Math.max(video.videoWidth,video.videoHeight));
  const w=Math.max(1,Math.round(video.videoWidth*scale)), h=Math.max(1,Math.round(video.videoHeight*scale));
  const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h; canvas.getContext("2d").drawImage(video,0,0,w,h);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",0.86));
  URL.revokeObjectURL(url); video.remove();
  return new File([blob], file.name.replace(/\.[^.]+$/i,"")+"-poster.jpg",{type:"image/jpeg",lastModified:Date.now()});
}

async function uploadMultipart(file, metadata){
  const boundary=`oj_${crypto.randomUUID()}`;
  const body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify(metadata),`\r\n--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`,file,`\r\n--${boundary}--`],{type:`multipart/related; boundary=${boundary}`});
  const response=await driveFetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id,name,mimeType,size,createdTime,appProperties`,{method:"POST",headers:{"Content-Type":`multipart/related; boundary=${boundary}`},body});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error?.message || `上传失败：${response.status}`);
  return data;
}

async function initiateResumable(file, metadata){
  const response=await driveFetch(`${DRIVE_UPLOAD}?uploadType=resumable`,{method:"POST",headers:{"Content-Type":"application/json; charset=UTF-8","X-Upload-Content-Type":file.type,"X-Upload-Content-Length":String(file.size)},body:JSON.stringify(metadata)});
  if(!response.ok) throw new Error(`无法建立续传会话：${response.status}`);
  const location=response.headers.get("Location"); if(!location) throw new Error("Google Drive 没有返回续传地址。");
  return location;
}
async function uploadResumable(file,metadata,onProgress){
  const uploadUrl=await initiateResumable(file,metadata);
  const chunkSize=8*1024*1024;
  let offset=0;
  while(offset<file.size){
    const end=Math.min(file.size,offset+chunkSize); const chunk=file.slice(offset,end);
    const response=await driveFetch(uploadUrl,{method:"PUT",headers:{"Content-Length":String(chunk.size),"Content-Range":`bytes ${offset}-${end-1}/${file.size}`},body:chunk});
    if(response.status===308){ offset=end; onProgress(offset/file.size*100); continue; }
    if(!response.ok){ const data=await response.json().catch(()=>({})); throw new Error(data.error?.message || `续传失败：${response.status}`); }
    offset=end; onProgress(100); return response.json();
  }
  throw new Error("续传未完成");
}

async function uploadMemory(){
  const file=memoryFile.files?.[0];
  if(!file){ showToast("先选择一张照片或一个视频。","error"); return; }
  if(!memoryDate.value){ showToast("请选择日期。","error"); return; }
  const title=(memoryTitleInput.value||file.name).trim().slice(0,80);
  const note=memoryNote.value.trim().slice(0,240);
  memoryUploadBtn.disabled=true;
  try{
    await ensureDriveFolder();
    let uploadFile=file;
    setProgress("Preparing your memory…",4);
    if(file.type.startsWith("image/")) uploadFile=await prepareImage(file,memorySoftTone.checked);
    const kind=file.type.startsWith("video/")?"video":"photo";
    let posterId="";
    if(kind==="video"){
      setProgress("Making a soft video cover…",10);
      const poster=await createVideoPoster(file);
      const posterMeta={name:poster.name,parents:[driveFolderId],appProperties:{oj_kind:"poster",oj_parentName:file.name}};
      const posterResult=await uploadMultipart(poster,posterMeta); posterId=posterResult.id;
    }
    const metadata={
      name:uploadFile.name,
      parents:[driveFolderId],
      appProperties:{oj_kind:kind,oj_date:memoryDate.value,oj_title:title,oj_note:note,oj_posterId:posterId,oj_originalName:file.name}
    };
    const useResumable=uploadFile.size>5*1024*1024;
    const result=useResumable ? await uploadResumable(uploadFile,metadata,v=>setProgress("Uploading to Google Drive…",15+v*0.82)) : await uploadMultipart(uploadFile,metadata);
    setProgress("Saved to our little cabinet",100);
    showToast(`已保存：${title}`,"success");
    closeMemoryModal();
    await listMemories();
  }catch(err){ console.error(err); showToast(err.message || "保存记忆失败","error"); }
  finally{ memoryUploadBtn.disabled=false; }
}

function openLightbox(item){
  lightboxMedia.innerHTML='<div class="lightbox-loading">Loading…</div>';
  lightboxCaption.innerHTML=`<strong>${escapeHTML(item.appProperties?.oj_title || item.name)}</strong><span>${escapeHTML(item.appProperties?.oj_date||"")}</span>${item.appProperties?.oj_note?`<p>${escapeHTML(item.appProperties.oj_note)}</p>`:""}`;
  lightbox.hidden=false; lightbox.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden";
  (async()=>{
    try{
      const kind=item.mimeType?.startsWith("video/")?"video":"photo";
      if(kind==="photo"){
        const blob=await fetchDriveBlob(item.id); const url=URL.createObjectURL(blob); lightboxMedia.innerHTML=`<img src="${url}" alt="Memory">`;
      } else {
        const blob=await fetchDriveBlob(item.id); const url=URL.createObjectURL(blob); lightboxMedia.innerHTML=`<video src="${url}" controls autoplay playsinline></video>`;
      }
    }catch(err){ lightboxMedia.innerHTML='<div class="lightbox-error">Unable to open this memory right now.</div>'; }
  })();
}
function closeLightbox(){ if(!lightbox) return; lightbox.hidden=true; lightbox.setAttribute("aria-hidden","true"); lightboxMedia.innerHTML=""; document.body.style.overflow=""; }

driveConnectBtn?.addEventListener("click", async ()=>{
  if(!workerConfigured()){ showToast("还差一个设置：把 drive-config.js 里的 Worker 地址替换掉。","error"); return; }
  if(!googleCodeClient){
    const ready=initGoogleCodeClient();
    if(!ready){ showToast("Google 授权组件还没加载完成，请稍等 1 秒再点一次。","error"); return; }
  }
  try{ googleCodeClient.requestCode(); }catch(err){ showToast(err.message||"无法打开 Google 授权","error"); }
});
driveAddBtn?.addEventListener("click",openMemoryModal);
driveRefreshBtn?.addEventListener("click",()=>listMemories().catch(err=>showToast(err.message,"error")));
memoryFile?.addEventListener("change",previewSelectedFile);
memoryUploadBtn?.addEventListener("click",uploadMemory);
document.querySelectorAll("[data-memory-close]").forEach(el=>el.addEventListener("click",closeMemoryModal));
document.querySelectorAll("[data-lightbox-close]").forEach(el=>el.addEventListener("click",closeLightbox));
memoryGrid?.addEventListener("click",event=>{
  const card=event.target.closest("[data-memory-index]"); if(!card) return;
  const index=Number(card.dataset.memoryIndex); if(Number.isInteger(index)&&driveMemories[index]) openLightbox(driveMemories[index]);
});

if(driveSetupNote && workerConfigured()) driveSetupNote.innerHTML='<span>♡</span><div><strong>Private by design</strong><p>Photos and videos stay in your Google Drive. This website never stores your Google password or OAuth Client Secret.</p></div>';
setDriveStatus("idle","Google Drive not connected");
