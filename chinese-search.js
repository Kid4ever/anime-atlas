
/*
 * ANIME ATLAS - Chinese Search v1
 *
 * 中文动漫名称 -> Bangumi -> Jikan
 * 不修改任何已有动漫、评级或音乐资料
 */

(() => {
  "use strict";

  const searchInput =
    document.getElementById("smartQuery");

  const searchButton =
    document.getElementById("smartSearch");

  if (!searchInput || !searchButton) {
    console.error(
      "中文搜索：请先加载 smart-import.js"
    );
    return;
  }

  // 修改输入提示
  searchInput.placeholder =
    "输入中文名，例如：孤独摇滚、葬送的芙莉莲";

  const chineseButton =
    document.createElement("button");

  chineseButton.textContent = "🇨🇳 中文智能搜索";
  chineseButton.className = "secondary";
  chineseButton.type = "button";

  searchButton.after(chineseButton);

  // 中文搜索候选列表
  const resultBox =
    document.createElement("div");

  resultBox.id = "chineseResults";
  resultBox.style.marginTop = "12px";

  chineseButton.parentElement.after(resultBox);

  const message = text => {
    resultBox.replaceChildren();

    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = text;

    resultBox.appendChild(p);
  };

  let busy = false;

  async function searchBangumi(keyword) {
    const response = await fetch(
      "https://api.bgm.tv/v0/search/subjects?limit=10",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          keyword,
          sort: "match",
          filter: {
            type: [2],
            nsfw: false
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(
        "Bangumi 返回 HTTP " + response.status
      );
    }

    const json = await response.json();

    return Array.isArray(json.data)
      ? json.data
      : [];
  }

  function makeResult(item) {
    const card = document.createElement("div");

    card.style.padding = "10px";
    card.style.margin = "8px 0";
    card.style.border =
      "1px solid var(--border, #555)";
    card.style.borderRadius = "10px";

    const title = document.createElement("strong");
    title.textContent =
      item.name_cn || item.name || "未知标题";

    const original = document.createElement("p");
    original.className = "muted";
    original.textContent =
      "原名：" + (item.name || "未知");

    const info = document.createElement("p");
    info.className = "muted";
    info.textContent =
      "放送日期：" + (item.date || "未知");

    const select = document.createElement("button");
    select.textContent = "使用这个作品继续搜索";
    select.className = "secondary";
    select.type = "button";

    select.onclick = () => {
      // 使用 Bangumi 的原始标题搜索 Jikan
      searchInput.value =
        item.name || item.name_cn || "";

      message(
        "已识别中文标题，正在通过原名搜索动画。" +
        "请在下方 Jikan 结果中选择正确作品。"
      );

      // 触发原本的智能搜索功能
      searchButton.click();

      document.getElementById(
        "smartResults"
      )?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    };

    card.append(title, original, info, select);

    return card;
  }

  chineseButton.onclick = async () => {
    if (busy) return;

    const keyword = searchInput.value.trim();

    if (!keyword) {
      message("请先输入动漫中文名称");
      return;
    }

    busy = true;
    chineseButton.disabled = true;

    message("正在识别中文动漫名称...");

    try {
      const items =
        await searchBangumi(keyword);

      resultBox.replaceChildren();

      if (!items.length) {
        message(
          "没有找到中文匹配。请尝试完整中文标题，" +
          "或使用原有搜索按钮。"
        );
        return;
      }

      const heading =
        document.createElement("p");

      heading.textContent =
        "找到 " + items.length +
        " 个候选结果，请选择正确动画：";

      resultBox.appendChild(heading);

      items.forEach(item => {
        resultBox.appendChild(
          makeResult(item)
        );
      });

    } catch (error) {
      message(
        "中文搜索暂时失败：" +
        error.message +
        "。可以使用原有Jikan搜索。"
      );

    } finally {
      busy = false;
      chineseButton.disabled = false;
    }
  };

  // 在中文输入时按 Enter，触发中文搜索
  searchInput.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Enter" &&
        !event.isComposing &&
        event.keyCode !== 229
      ) {
        event.preventDefault();
        chineseButton.click();
      }
    }
  );

  console.log(
    "ANIME ATLAS 中文智能搜索已启用"
  );
})();
