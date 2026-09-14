(function () {
  const links = [
    ["index.html", "Dashboard"],
    ["releases.html", "Releases"],
    ["release-new.html", "New release"],
    ["users.html", "People & orgs"],
    ["../index.html", "View public site"]
  ];
  const file = location.pathname.split("/").pop() || "index.html";
  const el = document.getElementById("aside");
  if (el) {
    el.innerHTML = `
      <a class="logo" href="index.html" style="margin-bottom:20px">
        <img src="../assets/logo/mark.png" alt="" style="height:36px;width:auto">
      </a>
      ${links.map(([href, label]) => `<a href="${href}" class="${file === href ? "active" : ""}">${label}</a>`).join("")}
    `;
  }
  if (window.PMG) window.PMG.icons();
})();
