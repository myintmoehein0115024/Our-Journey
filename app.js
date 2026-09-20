const backTop = document.getElementById("backTop");

function updateBackTop() {
  if (window.scrollY > 420) backTop.classList.add("show");
  else backTop.classList.remove("show");
}

window.addEventListener("scroll", updateBackTop, {passive:true});
backTop.addEventListener("click", () => window.scrollTo({top:0, behavior:"smooth"}));

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", event => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({behavior:"smooth", block:"start"});
  });
});

// Keep internal navigation gentle and close to the top-level "Our Journey" feeling.
const sectionLinks = document.querySelectorAll('a[href^="#"]');
sectionLinks.forEach(link => {
  link.addEventListener("click", () => {
    document.body.classList.add("navigating");
    window.setTimeout(() => document.body.classList.remove("navigating"), 450);
  });
});

// v3 — cross-platform PWA installation
let deferredInstallPrompt = null;
const installTrigger = document.getElementById("installTrigger");
const installLabel = document.getElementById("installLabel");
const installModal = document.getElementById("installModal");
const nativeInstallBox = document.getElementById("nativeInstallBox");
const nativeInstall = document.getElementById("nativeInstall");
const installGuide = document.getElementById("installGuide");
const installIntro = document.getElementById("installIntro");

function platformInfo() {
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isIOS;
  const isWindows = /Windows/i.test(ua);
  const isChrome = /Chrome|CriOS/i.test(ua) && !/Edg/i.test(ua);
  const isEdge = /Edg/i.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  return {isIOS,isAndroid,isMac,isWindows,isChrome,isEdge,isStandalone};
}

function guideHTML(info) {
  if (info.isIOS) {
    return `<h3>iPhone / iPad</h3>
      <div class="step"><span class="num">1</span><div><strong>Open this page in Safari</strong><p>Use Safari, not an in-app browser.</p></div></div>
      <div class="step"><span class="num">2</span><div><strong>Tap Share</strong><p>Choose <b>Add to Home Screen</b>.</p></div></div>
      <div class="step"><span class="num">3</span><div><strong>Turn on “Open as Web App”</strong><p>Then tap <b>Add</b>. The Our Journey icon will appear on your Home Screen.</p></div></div>`;
  }
  if (info.isAndroid) {
    return `<h3>Android</h3>
      <div class="step"><span class="num">1</span><div><strong>Use Chrome or a supported browser</strong><p>If an install button appears above, tap it.</p></div></div>
      <div class="step"><span class="num">2</span><div><strong>Or open the browser menu</strong><p>Choose <b>Install app</b> or <b>Add to Home screen</b>.</p></div></div>`;
  }
  if (info.isMac) {
    return `<h3>Mac</h3>
      <div class="step"><span class="num">1</span><div><strong>Safari · macOS Sonoma 14+</strong><p>Choose <b>Share → Add to Dock</b>.</p></div></div>
      <div class="step"><span class="num">2</span><div><strong>Chrome / Edge</strong><p>Use the browser's <b>Install</b> option when available.</p></div></div>`;
  }
  if (info.isWindows) {
    return `<h3>Windows PC</h3>
      <div class="step"><span class="num">1</span><div><strong>Chrome / Edge</strong><p>Use the <b>Install</b> icon in the address bar or the browser menu.</p></div></div>`;
  }
  return `<h3>Install on your device</h3>
    <div class="step"><span class="num">1</span><div><strong>Use your browser's install option</strong><p>Look for <b>Install</b>, <b>Add to Home Screen</b>, or <b>Add to Dock</b>.</p></div></div>`;
}

function updateInstallUI() {
  const info = platformInfo();
  if (info.isStandalone) {
    installTrigger.hidden = true;
    return;
  }
  installTrigger.hidden = false;
  installLabel.textContent = info.isIOS ? "Add to Home" : info.isMac ? "Add to Dock" : "Install App";
}

function openInstallModal() {
  const info = platformInfo();
  installGuide.innerHTML = guideHTML(info);
  installModal.hidden = false;
  installModal.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
  if (deferredInstallPrompt && !info.isIOS) nativeInstallBox.hidden = false;
  else nativeInstallBox.hidden = true;
}

function closeInstallModal() {
  installModal.hidden = true;
  installModal.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}
installTrigger.addEventListener("click", openInstallModal);
document.querySelectorAll("[data-install-close]").forEach(el => el.addEventListener("click", closeInstallModal));
document.addEventListener("keydown", e => { if (e.key === "Escape" && !installModal.hidden) closeInstallModal(); });

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallUI();
});

nativeInstall.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  closeInstallModal();
  updateInstallUI();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  closeInstallModal();
  updateInstallUI();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
updateInstallUI();
