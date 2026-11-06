
/*
 ANIME ATLAS - Compact UI v2

 顶部一行：
 云端账户与同步 / 智能建档 / 管理与回收站

 默认收起所有长面板
 每次只展开一个
 不修改任何动漫或云端数据
*/
(() => {
  "use strict";

  const main = document.querySelector("main");
  if (!main) return;

  // 自动定位已有面板
  const cloud = document
    .getElementById("cloudStatus")
    ?.closest("section");

  const auto = document.getElementById(
    "animeAutoV2"
  );

  const manage = document.getElementById(
    "manageTools"
  );

  const panels = [
    cloud,
    auto,
    manage
  ].filter(Boolean);

  if (document.getElementById("atlasQuickTools")) {
    return;
  }

  const bar = document.createElement("section");
  bar.id = "atlasQuickTools";
  bar.className = "panel";
  bar.style.padding = "12px";
  bar.style.marginBottom = "12px";

  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gridTemplateColumns =
    "repeat(3, minmax(0, 1fr))";
  row.style.gap = "8px";

  bar.appendChild(row);

  const cloudLine = document.createElement("p");
  cloudLine.className = "muted";
  cloudLine.style.fontSize = "12px";
  cloudLine.style.marginTop = "8px";

  bar.appendChild(cloudLine);

  main.prepend(bar);

  // 将工具面板放在快捷栏之后
  // 移动DOM节点不会删除其事件处理器
  if (panels.length) {
    bar.after(...panels);
  }

  const buttons = [];

  function closeAll() {
    panels.forEach(panel => {
      panel.style.display = "none";
    });

    buttons.forEach(button => {
      button.setAttribute(
        "aria-expanded", "false"
      );
    });
  }

  function addToggle(panel, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";
    button.style.width = "100%";
    button.style.padding = "10px 4px";
    button.style.fontSize = "12px";
    button.style.whiteSpace = "normal";
    button.textContent = label;
    button.setAttribute(
      "aria-expanded", "false"
    );


if (!panel) {
  button.disabled = false;
  button.textContent = label + " ⚠";

  button.onclick = () => {
    alert(
      "智能建档面板尚未成功加载。\n\n" +
      "请检查 anime-auto.js 是否存在代码错误，" +
      "以及它是否在 compact-ui.js 前加载。\n\n" +
      "其他云端档案和回收站不会受到影响。"
    );
  };

  row.appendChild(button);
  buttons.push(button);
  return;
}


    button.onclick = () => {
      if (!panel) return;

      const opening =
        panel.style.display === "none";

      closeAll();

      if (opening) {
        panel.style.display = "";
        button.setAttribute(
          "aria-expanded", "true"
        );
      }
    };

    row.appendChild(button);
    buttons.push(button);
  }

  addToggle(cloud, "☁ 账户与同步");
  addToggle(auto, "✨ 智能建档");
  addToggle(manage, "🗂 管理与回收站");

  // 显示原有云端状态，不显示邮箱密码
  const originalStatus = document.getElementById(
    "cloudStatus"
  );

  function updateCloudLine() {
    const message =
      originalStatus?.textContent?.trim();

    cloudLine.textContent = message
      ? "☁ " + message
      : "云端状态：请打开账户与同步查看";
  }

  updateCloudLine();

  if (originalStatus) {
    const observer = new MutationObserver(
      updateCloudLine
    );

    observer.observe(originalStatus, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  closeAll();

  console.log(
    "ANIME ATLAS 简洁工具栏 v2 已加载"
  );
})();
