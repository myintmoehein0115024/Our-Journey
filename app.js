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
