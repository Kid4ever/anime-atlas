
/*
 ANIME ATLAS - Unified Search v1
 一个按钮搜索中文、日文、英文、罗马音
 复用现有 smart-import.js 的导入机制
 复用已部署的 bangumi-search Edge Function
 不更改数据库或用户收藏
*/
(() => {
  "use strict";

  const input = document.getElementById("smartQuery");
  const button = document.getElementById("smartSearch");
  const results = document.getElementById("smartResults");
  const panel = document.getElementById("smartImportPanel");

  if (!input || !button || !results || !panel) {
    console.error(
      "统一搜索初始化失败：请先加载 smart-import.js"
    );
    return;
  }

  // 保存原有 Jikan 搜索方法
  const originalSearch = button.onclick;

  if (typeof originalSearch !== "function") {
    console.error("没有找到原有 Jikan 搜索函数");
    return;
  }

  button.textContent = "🔎 智能搜索动漫";
  input.placeholder =
    "输入中文、日文或英文番名，例如：孤独摇滚";

  // 中文候选结果区域
  const box = document.createElement("div");
  box.id = "unifiedSearchResults";
  box.style.margin = "12px 0";
  results.before(box);

  const message = document.createElement("p");
  message.className = "muted";
  box.appendChild(message);

  let busy = false;

  function notice(text) {
    message.textContent = text;
  }

  function clearChoices() {
    box.replaceChildren();
    box.appendChild(message);
  }

  function normalize(text) {
    return String(text || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\s　:：!！·・\-—_。]/g, "");
  }

  function hasChinese(text) {
    return /[\u3400-\u9fff]/.test(text);
  }

  // 调用旧的 Jikan 搜索，不需要更改 smart-import.js
  async function searchJikan(keyword, originalTitle) {
    input.value = keyword;

    notice("正在匹配国际动画资料...");

    await originalSearch.call(button);

    const options = Array.from(
      results.querySelectorAll("button")
    );

    // 根据 Bangumi 原名寻找唯一的精确匹配
    if (originalTitle) {
      const exact = options.filter(option => {
        const labels = option.textContent
          .split(" / ")
          .slice(0, 2);

        return labels.some(label =>
          normalize(label) === normalize(originalTitle)
        );
      });

      if (exact.length === 1) {
        exact[0].click();
        notice(
          "✓ 已自动匹配原名，请核对作品信息后导入。"
        );
        return;
      }
    }

    notice(
      options.length
        ? "请从下方结果中确认正确的动画。"
        : "没有找到国际数据库匹配结果，" +
          "可尝试其他标题。"
    );
  }

  // 使用之前创建的 Supabase 中转函数
  async function searchBangumi(keyword) {
    if (typeof CLOUD_URL !== "string") {
      throw new Error("没有找到 Supabase Project URL");
    }

    const endpoint =
      CLOUD_URL.replace(/\/+$/, "") +
      "/functions/v1/bangumi-search?q=" +
      encodeURIComponent(keyword);

    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "中文搜索 HTTP " + response.status
      );
    }

    return Array.isArray(data.data)
      ? data.data
      : [];
  }

  async function chooseBangumi(item) {
    clearChoices();

    const title = item.name || item.name_cn;
    if (!title) {
      notice("该条目没有可用的原始标题");
      return;
    }

    // 把中文搜索结果的原名交给原有 Jikan 搜索
    await searchJikan(title, item.name || title);
  }

  function showBangumiChoices(items) {
    clearChoices();

    notice(
      "找到 " + items.length +
      " 个中文匹配结果，请确认作品。"
    );

    items.slice(0, 10).forEach(item => {
      const choice = document.createElement("button");
      choice.type = "button";
      choice.className = "secondary";

      choice.style.display = "block";
      choice.style.width = "100%";
      choice.style.margin = "8px 0";
      choice.style.textAlign = "left";

      choice.textContent =
        (item.name_cn || item.name || "未知作品") +
        " / " + (item.name || "") +
        " · " + (item.date || "日期未知");

      choice.onclick = async () => {
        choice.disabled = true;

        try {
          await chooseBangumi(item);
        } catch (error) {
          notice("国际资料匹配失败：" + error.message);
        } finally {
          choice.disabled = false;
        }
      };

      box.appendChild(choice);
    });
  }

  // 统一按钮：根据输入语言选择搜索方式
  button.onclick = async () => {
    if (busy) return;

    const keyword = input.value.trim();

    if (!keyword) {
      notice("请先输入动漫名称");
      return;
    }

    busy = true;
    button.disabled = true;

    clearChoices();
    results.replaceChildren();

    try {
      if (hasChinese(keyword)) {
        notice("正在识别中文动漫名称...");

        let items;

        try {
          items = await searchBangumi(keyword);
        } catch (error) {
          notice(
            "中文数据库暂时不可用，" +
            "尝试直接搜索国际资料..."
          );
          await searchJikan(keyword, null);
          return;
        }

        if (!items.length) {
          notice(
            "中文数据库没有匹配，尝试国际数据库..."
          );
          await searchJikan(keyword, null);
          return;
        }

        // 单个候选时，直接进入 Jikan 匹配
        if (items.length === 1) {
          await chooseBangumi(items[0]);
        } else {
          showBangumiChoices(items);
        }
      } else {
        // 日文、英文、罗马音继续使用原搜索
        await searchJikan(keyword, null);
      }

    } catch (error) {
      notice("搜索出现错误：" + error.message);
    } finally {
      busy = false;
      button.disabled = false;
    }
  };

  // 按 Enter 等同点击统一搜索按钮
  input.addEventListener("keydown", event => {
    if (
      event.key === "Enter" &&
      !event.isComposing &&
      event.keyCode !== 229
    ) {
      event.preventDefault();
      button.click();
    }
  });

  console.log("ANIME ATLAS 统一智能搜索已加载");
})();
