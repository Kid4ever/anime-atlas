
/*
 ANIME ATLAS - Compact UI v1
 默认收起管理与智能建档
 保留原有功能及事件
*/

(() => {
  "use strict";

  const main = document.querySelector("main");
  if (!main) return;

  const manage = document.getElementById("manageTools");
  const auto = document.getElementById("animeAutoV2");

  // 防止脚本重复执行
  if (document.getElementById("atlasQuickTools")) {
    return;
  }

  const bar = document.createElement("section");
  bar.id = "atlasQuickTools";
  bar.className = "panel";
  bar.style.padding = "12px";
  bar.style.marginBottom = "12px";

  const row = document.createElement("div");
  row.className = "controls";
  row.style.display = "flex";
  row.style.flexWrap = "wrap";
  row.style.gap = "8px";

  const title = document.createElement("p");
  title.className = "muted";
  title.textContent = "快捷工具 · 不使用时自动收起";

  bar.append(title, row);
  main.prepend(bar);

  function addToggle(panel, label) {
    if (!panel) return;

    // 初次打开时隐藏长面板
    panel.style.display = "none";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";
    button.textContent = label;

    button.setAttribute("aria-expanded", "false");

    button.onclick = () => {
      const opening = panel.style.display === "none";

      // 每次只展开一个工具区
      [manage, auto].forEach(el => {
        if (el) el.style.display = "none";
      });

      row.querySelectorAll("button").forEach(b => {
        b.setAttribute("aria-expanded", "false");
      });

      if (opening) {
        panel.style.display = "";
        button.setAttribute("aria-expanded", "true");

        requestAnimationFrame(() => {
          panel.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        });
      }
    };

    row.appendChild(button);
  }

  addToggle(auto, "✨ 智能建档");
  addToggle(manage, "🗂 管理与回收站");

  console.log("ANIME ATLAS 简洁界面已启用");
})();
