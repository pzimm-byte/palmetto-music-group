(function () {
  const KEY = "pmg_session";
  const nested = /\/(auth|admin)\//.test(location.pathname) || /(auth|admin)\/[^/]+\.html$/.test(location.href);
  const R = nested ? "../" : "";
  const catalog = [
    { id: "steadfast-love", title: "Steadfast Love", year: "2026", type: "EP", blurb: "Five songs written for the gathered church at Palmetto Baptist.", songs: [
      { id: "s1", title: "Steadfast Love", key: "D", bpm: 72, ccli: "7241001", prices: { chart: 250, lyric: 150, stem: 1500 } },
      { id: "s2", title: "All Our Days", key: "G", bpm: 78, ccli: "7241002", prices: { chart: 250, lyric: 150, stem: 1500 } },
      { id: "s3", title: "Behold the Lamb", key: "C", bpm: 68, ccli: "7241003", prices: { chart: 250, lyric: 150, stem: 1500 } },
      { id: "s4", title: "Hold Fast", key: "E", bpm: 84, ccli: "7241004", prices: { chart: 250, lyric: 150, stem: 1500 } },
      { id: "s5", title: "Doxology (Palmetto)", key: "D", bpm: 70, ccli: "7241005", prices: { chart: 0, lyric: 0, stem: 800 } }
    ]},
    { id: "near-to-us", title: "Near to Us", year: "2025", type: "Single", blurb: "A congregational prayer of God's nearness.", songs: [
      { id: "s6", title: "Near to Us", key: "A", bpm: 74, ccli: "7238801", prices: { chart: 250, lyric: 150, stem: 1500 } }
    ]}
  ];
  function getSession() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } }
  function setSession(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
  function clearSession() { localStorage.removeItem(KEY); }
  function money(cents) { return !cents ? "Free" : "$" + (cents / 100).toFixed(2); }
  function entitled(session) { return session && (session.role === "admin" || session.orgFree); }
  function owns(session, songId, type) { return !!(session && session.purchases && session.purchases.includes(songId + ":" + type)); }
  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2600);
  }
  function header(active) {
    const s = getSession();
    const cta = s
      ? `<a class="btn btn-outline btn-sm" href="${R}account.html">${s.role === "admin" ? "Admin" : s.name || s.email}</a>`
      : `<a class="btn btn-lime btn-sm" href="${R}auth/login.html">Sign in</a>`;
    return `<header class="nav"><div class="nav-inner">
      <a class="logo" href="${R}index.html"><img src="${R}assets/logo/mark.svg" alt="Palmetto mark"><span class="logo-text"><strong>PALMETTO</strong><span>MUSIC GROUP</span></span></a>
      <nav class="nav-links" id="navLinks">
        <a href="${R}music.html" class="${active === "music" ? "active" : ""}">Music</a>
        <a href="${R}resources.html" class="${active === "resources" ? "active" : ""}">Resources</a>
        <a href="${R}about.html" class="${active === "about" ? "active" : ""}">About</a>
        <a href="${R}contact.html" class="${active === "contact" ? "active" : ""}">Contact</a>
      </nav>
      <div class="nav-cta">${s && s.role === "admin" ? `<a class="btn btn-ghost btn-sm" href="${R}admin/index.html">Dashboard</a>` : ""}${cta}
        <button class="nav-toggle" aria-label="Menu" onclick="document.getElementById('navLinks').classList.toggle('open')">☰</button>
      </div></div></header>`;
  }
  function footer() {
    return `<footer><div class="wrap foot">
      <div><a class="logo" href="${R}index.html"><img src="${R}assets/logo/mark.svg" alt="" style="height:40px"><span class="logo-text"><strong>PALMETTO</strong><span>MUSIC GROUP</span></span></a>
        <p class="muted" style="margin-top:12px">Songs for the gathered church — written in Greenville, South Carolina.</p></div>
      <div><strong>Listen</strong><p><a href="${R}music.html">Music</a><br><a href="${R}resources.html">Resources</a></p></div>
      <div><strong>Collective</strong><p><a href="${R}about.html">About</a><br><a href="${R}contact.html">Contact</a><br><a href="${R}auth/login.html">Sign in</a></p></div>
      <div><strong>Church</strong><p>Palmetto Baptist Church<br>Greenville, SC</p></div>
    </div><div class="wrap legal"><span>© ${new Date().getFullYear()} Palmetto Music Group. All rights reserved.</span></div></footer><div class="toast"></div>`;
  }
  window.PMG = { catalog, getSession, setSession, clearSession, money, entitled, owns, toast, header, footer,
    loginDemo(kind) {
      if (kind === "pbc") setSession({ email: "music@palmettobaptist.org", name: "PBC Music Team", role: "church_leader", org: "Palmetto Baptist Church", orgFree: true, purchases: [] });
      else if (kind === "admin") setSession({ email: "admin@palmettomusic.group", name: "Collective Admin", role: "admin", org: "Palmetto Music Group", orgFree: true, purchases: [] });
      else setSession({ email: "guest@example.com", name: "Public account", role: "public", org: null, orgFree: false, purchases: ["s5:chart", "s5:lyric"] });
      location.href = R + "resources.html";
    },
    buy(songId, type, price) {
      const s = getSession();
      if (!s) { location.href = R + "auth/login.html"; return; }
      location.href = R + "checkout.html?sku=" + encodeURIComponent(songId + ":" + type) + "&price=" + price;
    },
    download(label) { toast("Preparing \u201c" + label + "\u201d — signed link mock."); }
  };
  document.addEventListener("DOMContentLoaded", () => {
    const mountH = document.getElementById("site-header");
    const mountF = document.getElementById("site-footer");
    if (mountH) mountH.outerHTML = header(document.body.dataset.page || "");
    if (mountF) mountF.outerHTML = footer();
  });
})();
