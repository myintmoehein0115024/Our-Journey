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

// v7 — owner-backed Google Drive memory cabinet
// The browser never signs into Google. Cloudflare Worker owns the Google OAuth
// session and resolves the private Our-Journey folder on the owner's Drive.
const DRIVE_API_BASE = String(config.DRIVE_API_BASE || "").replace(/\/$/, "");
const DRIVE_FOLDER_HINT = config.DRIVE_FOLDER_ID || "";
let driveFolderId = DRIVE_FOLDER_HINT;
let driveContext = { rootId: DRIVE_FOLDER_HINT, photosId: "", videosId: "", thumbnailsId: "" };
let driveReady = false;
let driveStatusPromise = null;
let driveMemories = [];

const driveStatus = $("driveStatus");
const driveStatusText = $("driveStatusText");
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
  return Boolean(DRIVE_API_BASE && !DRIVE_API_BASE.includes("REPLACE-WITH-YOUR-WORKER"));
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
function workerURL(path){
  if(!workerConfigured()) throw new Error("还没有配置 Google Drive Worker 地址。");
  return `${DRIVE_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
async function workerFetch(path, options={}){
  const response=await fetch(workerURL(path), {...options, cache:"no-store", credentials:"omit"});
  const contentType=response.headers.get("content-type")||"";
  if(!response.ok){
    let message=`云端请求失败：${response.status}`;
    if(contentType.includes("application/json")){
      const data=await response.json().catch(()=>({}));
      message=data.error?.message || data.error_description || data.error || message;
    }else{
      const text=await response.text().catch(()=>""); if(text) message=text.slice(0,220);
    }
    throw new Error(message);
  }
  return response;
}

async function resolveDriveContext(){
  const hint=driveFolderId || DRIVE_FOLDER_HINT;
  const suffix=hint ? `?folderId=${encodeURIComponent(hint)}` : "";
  const response=await workerFetch(`/api/drive/context${suffix}`);
  const data=await response.json();
  if(!data?.rootId) throw new Error("没有找到可访问的 Our-Journey 文件夹。请确认 Owner Google Drive 账号里存在 My Drive / Our-Journey。");
  driveContext={
    rootId:data.rootId,
    photosId:data.photosId||"",
    videosId:data.videosId||"",
    thumbnailsId:data.thumbnailsId||""
  };
  driveFolderId=data.rootId;
  try{ localStorage.setItem("ourJourneyDriveFolderId", driveFolderId); }catch{}
  return driveContext;
}

async function initOwnerDrive(force=false){
  if(!workerConfigured()){
    driveReady=false; setDriveStatus("error","Google Drive Worker not configured");
    if(driveSetupNote) driveSetupNote.hidden=false; return false;
  }
  if(!force && driveStatusPromise) return driveStatusPromise;
  driveStatusPromise=(async()=>{
    try{
      setDriveStatus("busy","Connecting to our private Drive…");
      const status=await workerFetch("/api/owner/status");
      const statusData=await status.json().catch(()=>({}));
      if(!statusData.configured || statusData.token_refresh_ok===false) throw new Error("Owner Google Drive 还没有准备好，请检查 Cloudflare Worker Secret。");
      await resolveDriveContext();
      driveReady=true;
      if(driveSetupNote) driveSetupNote.hidden=true;
      if(driveAddBtn) driveAddBtn.hidden=false;
      if(driveRefreshBtn) driveRefreshBtn.hidden=false;
      setDriveStatus("connected","Google Drive connected");
      await listMemories();
      return true;
    }catch(err){
      driveReady=false;
      if(driveAddBtn) driveAddBtn.hidden=true;
      if(driveRefreshBtn) driveRefreshBtn.hidden=true;
      setDriveStatus("error","Google Drive connection failed");
      showToast(err.message||"Google Drive 连接失败","error");
      return false;
    }finally{ driveStatusPromise=null; }
  })();
  return driveStatusPromise;
}
async function ensureDriveReady(){ return driveReady && driveFolderId ? true : await initOwnerDrive(true); }
function formatBytes(bytes){
  const n=Number(bytes||0); if(!n) return "—"; const units=["B","KB","MB","GB"]; let i=0,v=n;
  while(v>=1024&&i<units.length-1){v/=1024;i++;}
  return `${v.toFixed(v>=10||i===0?0:1)} ${units[i]}`;
}
function memoryCardHTML(item,index){
  const title=escapeHTML(item.appProperties?.oj_title||item.name);
  const date=escapeHTML(item.appProperties?.oj_date||item.createdTime?.slice(0,10)||"");
  const note=escapeHTML(item.appProperties?.oj_note||"");
  const kind=item.mimeType?.startsWith("video/")?"video":"photo";
  const posterId=item.appProperties?.oj_posterId||"";
  const mediaId=kind==="video"?posterId:item.id;
  return `<article class="memory-card" data-memory-index="${index}">
    <button class="memory-visual" type="button" aria-label="Open ${title}">
      <div class="memory-media-shell" data-memory-media data-id="${escapeHTML(mediaId)}" data-kind="${kind}" data-name="${escapeHTML(item.name)}"><span class="memory-loading">♡</span></div>
      ${kind==='video'?'<span class="memory-type">VIDEO</span>':''}
    </button>
    <div class="memory-meta"><div><span>${date}</span><h3>${title}</h3></div><span class="memory-size">${formatBytes(item.size)}</span></div>
    ${note?`<p>${note}</p>`:""}
  </article>`;
}
async function listMemories(){
  if(!memoryGrid||!memoryEmpty) return;
  if(!driveContext.rootId){ await resolveDriveContext(); }
  const ids=[driveContext.rootId,driveContext.photosId,driveContext.videosId].filter(Boolean);
  const qs=ids.map(id=>`folderId=${encodeURIComponent(id)}`).join("&");
  const response=await workerFetch(`/api/drive/list?${qs}`);
  const data=await response.json();
  const all=(data.files||[]).filter(item=>{
    const kind=item.appProperties?.oj_kind;
    return kind==="photo"||kind==="video";
  });
  const seen=new Set();
  driveMemories=all.filter(item=>!seen.has(item.id)&&seen.add(item.id));
  memoryGrid.innerHTML=""; memoryGrid.appendChild(memoryEmpty); memoryEmpty.hidden=!driveMemories.length;
  if(!driveMemories.length) return;
  driveMemories.forEach((item,index)=>memoryGrid.insertAdjacentHTML("beforeend",memoryCardHTML(item,index)));
  await hydrateMemoryMedia();
}
async function fetchDriveBlob(fileId){ if(!fileId) throw new Error("缺少媒体文件 ID。"); return (await workerFetch(`/api/drive/media/${encodeURIComponent(fileId)}`)).blob(); }
async function hydrateMemoryMedia(){
  const nodes=[...document.querySelectorAll("[data-memory-media]")]; if(!nodes.length) return;
  const load=n=>loadMemoryThumb(n).catch(()=>{});
  if(!("IntersectionObserver" in window)){ await Promise.all(nodes.map(load)); return; }
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){observer.unobserve(entry.target);load(entry.target);}}),{rootMargin:"160px"});
  nodes.forEach(n=>observer.observe(n));
}
async function loadMemoryThumb(shell){
  if(shell.dataset.loaded==="1") return; shell.dataset.loaded="1";
  const id=shell.dataset.id; if(!id){shell.innerHTML='<span class="memory-fallback">Video</span>';return;}
  try{const blob=await fetchDriveBlob(id);const url=URL.createObjectURL(blob);shell.innerHTML=`<img src="${url}" alt="Memory" loading="lazy">`;shell.dataset.objectUrl=url;}
  catch{shell.innerHTML='<span class="memory-fallback">♡</span>';}
}
function openMemoryModal(){
  if(!driveReady){showToast("Google Drive 还在连接，请稍等片刻。","error");initOwnerDrive(true);return;}
  if(memoryDate) memoryDate.value=isoToday(); if(memoryTitleInput) memoryTitleInput.value=""; if(memoryNote) memoryNote.value=""; if(memoryFile) memoryFile.value="";
  if(memoryFileName) memoryFileName.textContent="Nothing selected yet"; if(memoryPreview){memoryPreview.hidden=true;memoryPreview.innerHTML="";}
  if(memoryProgress) memoryProgress.hidden=true; memoryModal.hidden=false; memoryModal.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden";
}
function closeMemoryModal(){if(!memoryModal)return;memoryModal.hidden=true;memoryModal.setAttribute("aria-hidden","true");document.body.style.overflow="";if(memoryPreview)memoryPreview.innerHTML="";}
function setProgress(label,value){if(memoryProgress)memoryProgress.hidden=false;if(memoryProgressLabel)memoryProgressLabel.textContent=label;if(memoryProgressValue)memoryProgressValue.textContent=`${Math.round(value)}%`;if(memoryProgressBar)memoryProgressBar.style.width=`${Math.max(0,Math.min(100,value))}%`;}
async function previewSelectedFile(){
  const file=memoryFile.files?.[0];if(!file)return;memoryFileName.textContent=`${file.name} · ${formatBytes(file.size)}`;const url=URL.createObjectURL(file);
  memoryPreview.innerHTML=file.type.startsWith("video/")?`<video src="${url}" controls muted playsinline></video>`:`<img src="${url}" alt="Selected memory">`;memoryPreview.hidden=false;
}
async function prepareImage(file,pastel){
  let source,width,height,cleanup=()=>{};
  if(window.createImageBitmap){const bitmap=await createImageBitmap(file);source=bitmap;width=bitmap.width;height=bitmap.height;cleanup=()=>bitmap.close();}
  else{const url=URL.createObjectURL(file);const img=new Image();img.src=url;await new Promise((r,j)=>{img.onload=r;img.onerror=j;});source=img;width=img.naturalWidth;height=img.naturalHeight;cleanup=()=>URL.revokeObjectURL(url);}
  const maxSide=2560,scale=Math.min(1,maxSide/Math.max(width,height)),w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
  const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;const ctx=canvas.getContext("2d",{alpha:false});if(pastel)ctx.filter="saturate(0.95) brightness(1.015) sepia(0.02)";ctx.drawImage(source,0,0,w,h);cleanup();
  const blob=await new Promise((r,j)=>canvas.toBlob(b=>b?r(b):j(new Error("图片压缩失败")),"image/jpeg",0.9));return new File([blob],file.name.replace(/\.[^.]+$/i,"")+".jpg",{type:"image/jpeg",lastModified:Date.now()});
}
async function createVideoPoster(file){
  const url=URL.createObjectURL(file),video=document.createElement("video");video.preload="metadata";video.muted=true;video.playsInline=true;video.src=url;
  await new Promise((r,j)=>{video.onloadedmetadata=r;video.onerror=()=>j(new Error("无法读取视频预览"));});
  const seekTime=Math.min(1.5,Math.max(0,(video.duration||1)/3));await new Promise((r,j)=>{video.currentTime=seekTime;video.onseeked=r;video.onerror=()=>j(new Error("无法生成视频封面"));});
  const maxSide=1280,scale=Math.min(1,maxSide/Math.max(video.videoWidth,video.videoHeight)),w=Math.max(1,Math.round(video.videoWidth*scale)),h=Math.max(1,Math.round(video.videoHeight*scale));
  const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;canvas.getContext("2d").drawImage(video,0,0,w,h);
  const blob=await new Promise((r,j)=>canvas.toBlob(b=>b?r(b):j(new Error("无法生成视频封面")),"image/jpeg",0.86));URL.revokeObjectURL(url);video.remove();
  return new File([blob],file.name.replace(/\.[^.]+$/i,"")+"-poster.jpg",{type:"image/jpeg",lastModified:Date.now()});
}
async function uploadViaWorker(file,metadata){
  const form=new FormData();form.append("metadata",JSON.stringify(metadata));form.append("file",file,file.name);const response=await workerFetch("/api/drive/upload",{method:"POST",body:form});return response.json();
}
async function deleteViaWorker(fileId){if(!fileId)return;try{await workerFetch(`/api/drive/file/${encodeURIComponent(fileId)}`,{method:"DELETE"});}catch{}}
async function uploadMemory(){
  const file=memoryFile.files?.[0];if(!file){showToast("先选择一张照片或一个视频。","error");return;}if(!memoryDate.value){showToast("请选择日期。","error");return;}if(!await ensureDriveReady())return;
  const kind=file.type.startsWith("video/")?"video":"photo";const targetId=kind==="video"?driveContext.videosId:driveContext.photosId;if(!targetId){showToast(`没有找到 ${kind==='video'?"Videos":"Photos"} 文件夹。` ,"error");return;}
  const title=(memoryTitleInput.value||file.name).trim().slice(0,80),note=memoryNote.value.trim().slice(0,240);memoryUploadBtn.disabled=true;let posterId="";
  try{
    let uploadFile=file;setProgress("Preparing your memory…",6);if(file.type.startsWith("image/"))uploadFile=await prepareImage(file,memorySoftTone.checked);
    if(kind==="video"){
      setProgress("Making a soft video cover…",14);const poster=await createVideoPoster(file);const posterMeta={name:poster.name,parents:[driveContext.thumbnailsId],appProperties:{oj_kind:"poster",oj_parentName:file.name}};
      const posterResult=await uploadViaWorker(poster,posterMeta);posterId=posterResult.id||"";if(!posterId)throw new Error("视频封面上传失败。");
    }
    setProgress("Uploading to our private Google Drive…",24);
    const metadata={name:uploadFile.name,parents:[targetId],appProperties:{oj_kind:kind,oj_date:memoryDate.value,oj_title:title,oj_note:note,oj_posterId:posterId,oj_originalName:file.name}};
    const result=await uploadViaWorker(uploadFile,metadata);if(!result?.id)throw new Error("Google Drive 没有返回文件 ID。");
    setProgress("Saved to our little cabinet",100);showToast(`已保存：${title}`,"success");closeMemoryModal();await listMemories();
  }catch(err){console.error(err);if(posterId)await deleteViaWorker(posterId);showToast(err.message||"保存记忆失败","error");}
  finally{memoryUploadBtn.disabled=false;}
}
function openLightbox(item){
  lightboxMedia.innerHTML='<div class="lightbox-loading">Loading…</div>';
  lightboxCaption.innerHTML=`<strong>${escapeHTML(item.appProperties?.oj_title||item.name)}</strong><span>${escapeHTML(item.appProperties?.oj_date||"")}</span>${item.appProperties?.oj_note?`<p>${escapeHTML(item.appProperties.oj_note)}</p>`:""}`;
  lightbox.hidden=false;lightbox.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";
  (async()=>{try{const kind=item.mimeType?.startsWith("video/")?"video":"photo";const blob=await fetchDriveBlob(item.id);const url=URL.createObjectURL(blob);lightboxMedia.innerHTML=kind==="photo"?`<img src="${url}" alt="Memory">`:`<video src="${url}" controls autoplay playsinline></video>`;}catch{lightboxMedia.innerHTML='<div class="lightbox-error">Unable to open this memory right now.</div>';}})();
}
function closeLightbox(){if(!lightbox)return;lightbox.hidden=true;lightbox.setAttribute("aria-hidden","true");lightboxMedia.innerHTML="";document.body.style.overflow="";}
driveAddBtn?.addEventListener("click",openMemoryModal);
driveRefreshBtn?.addEventListener("click",()=>initOwnerDrive(true));
memoryFile?.addEventListener("change",previewSelectedFile);memoryUploadBtn?.addEventListener("click",uploadMemory);
document.querySelectorAll("[data-memory-close]").forEach(el=>el.addEventListener("click",closeMemoryModal));document.querySelectorAll("[data-lightbox-close]").forEach(el=>el.addEventListener("click",closeLightbox));
memoryGrid?.addEventListener("click",event=>{const card=event.target.closest("[data-memory-index]");if(!card)return;const index=Number(card.dataset.memoryIndex);if(Number.isInteger(index)&&driveMemories[index])openLightbox(driveMemories[index]);});
if(driveSetupNote&&workerConfigured())driveSetupNote.innerHTML='<span>♡</span><div><strong>Private by design</strong><p>This shared memory cabinet uses your private Google Drive through a secure Cloudflare Worker. Visitors do not need to sign in to Google.</p></div>';
setDriveStatus("busy","Connecting to our private Drive…");
window.addEventListener("pageshow",()=>initOwnerDrive(false));
window.addEventListener("focus",()=>{if(!driveReady)initOwnerDrive(false);});
