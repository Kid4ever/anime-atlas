
/*
 ANIME ATLAS - Bangumi Fallback v1
 Jikan超时时仍可搜索、建档、云端同步
 不覆盖已有作品、音乐、爱心、BV号
*/
(() => {
  "use strict";

  const panel = document.getElementById("smartImportPanel");
  if (!panel) {
    console.error("请先加载 smart-import.js");
    return;
  }

  const wrap = document.createElement("section");
  wrap.style.margin = "20px 0";
  wrap.innerHTML = `
    <h3>🇨🇳 Bangumi 备用建档</h3>
    <p class="muted">
      不依赖Jikan。可通过中文名建立动漫档案；
      音乐稍后补充。
    </p>
    <label>动漫名称</label>
    <input id="bgmFallbackQuery"
      placeholder="例如：孤独摇滚">
    <div class="controls">
      <button id="bgmFallbackSearch">
        搜索Bangumi
      </button>
    </div>
    <div id="bgmFallbackResults"></div>
    <label>个人评级</label>
    <select id="bgmFallbackGrade">
      <option>TOP1</option>
      <option>TOP6</option>
      <option>TOP20</option>
      <option>S</option>
      <option selected>A</option>
      <option>B</option>
      <option>C</option>
      <option>D</option>
    </select>
    <button id="bgmFallbackImport" disabled>
      确认新增并同步云端
    </button>
    <p id="bgmFallbackStatus" class="muted"></p>
  `;

  panel.appendChild(wrap);

  const $ = id => document.getElementById(id);
  const status = text => {
    $("bgmFallbackStatus").textContent = text;
  };

  const norm = value =>
    String(value || "").normalize("NFKC")
      .toLowerCase()
      .replace(/[\s　:：!！·・\-—_。]/g, "");

  let picked = null;
  let busy = false;

  async function search(keyword) {
    const url =
      CLOUD_URL.replace(/\/+$/, "") +
      "/functions/v1/bangumi-search?q=" +
      encodeURIComponent(keyword);

    const response = await fetch(url);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Bangumi 搜索失败"
      );
    }

    return Array.isArray(result.data)
      ? result.data
      : [];
  }

  $("bgmFallbackSearch").onclick = async () => {
    if (busy) return;

    const keyword =
      $("bgmFallbackQuery").value.trim();

    if (!keyword) {
      status("请先输入动漫名称");
      return;
    }

    busy = true;
    picked = null;
    $("bgmFallbackImport").disabled = true;
    $("bgmFallbackResults").replaceChildren();
    status("正在搜索中文动漫数据库...");

    try {
      const items = await search(keyword);
      const area = $("bgmFallbackResults");

      if (!items.length) {
        status("没有结果，请换一个作品名称");
        return;
      }

      items.forEach(item => {
        const button = document.createElement("button");
        button.className = "secondary";
        button.style.display = "block";
        button.style.width = "100%";
        button.style.margin = "8px 0";

        button.textContent =
          (item.name_cn || item.name) +
          " / " + item.name +
          " · " + (item.date || "日期未知");

        button.onclick = () => {
          picked = item;
          $("bgmFallbackImport").disabled = false;
          status(
            "已选择：" +
            (item.name_cn || item.name)
          );
        };

        area.appendChild(button);
      });

      status("请选择正确的动画条目");

    } catch (error) {
      status("搜索失败：" + error.message);
    } finally {
      busy = false;
    }
  };

  $("bgmFallbackImport").onclick = async () => {
    if (busy || !picked) return;

    if (
      typeof cloudSyncEnabled === "undefined" ||
      !cloudSyncEnabled ||
      !cloudUser
    ) {
      status("请先登录并读取云端档案");
      return;
    }

    const name = picked.name_cn ||
      picked.name || "";

    if (!name) {
      status("所选作品没有有效名称");
      return;
    }

    const duplicate = anime.find(a =>
      norm(a.name) === norm(name) ||
      a.meta?.bangumi_id === picked.id
    );

    if (duplicate) {
      status(
        "已有此作品：" + duplicate.name +
        "，未重复添加。"
      );
      return;
    }

    const grade = $("bgmFallbackGrade").value;
    const limits = { TOP1:1, TOP6:5, TOP20:14 };

    if (
      limits[grade] &&
      anime.filter(a => a.rating === grade).length
        >= limits[grade]
    ) {
      status(grade + "名额已满，请选择其他评级");
      return;
    }

    if (!confirm(
      "新增动漫：" + name +
      "\n评级：" + grade +
      "\n数据来源：Bangumi" +
      "\n本次仅添加基础档案，" +
      "暂不自动收录音乐。\n确定吗？"
    )) return;

    try {
      localStorage.setItem(
        "animeAtlasBeforeBgm_" + Date.now(),
        JSON.stringify(anime)
      );
    } catch (error) {
      status("创建备份失败：" + error.message);
      return;
    }

    busy = true;
    $("bgmFallbackImport").disabled = true;

    let newAnime = null;

    try {
      newAnime = {
        id:"anime-" + crypto.randomUUID(),
        name,
        rating:grade,
        children:[],
        songs:[],
        meta:{
          bangumi_id:picked.id,
          japanese:picked.name || "",
          date:picked.date || "",
          source:"Bangumi"
        }
      };

      anime.push(newAnime);
      save();
      renderAnime();
      stats();

      // 等待实际上传，避免只保存到浏览器
      if (typeof queueCloudWrite === "function") {
        clearTimeout(cloudSaveTimer);
        await queueCloudWrite();
      } else {
        throw new Error("未找到云端保存功能");
      }

      status(
        "✓ 已新增《" + name +
        "》，并成功保存到Supabase。"
      );

    } catch (error) {
      // 保持当前页面和本地数据，不自动删除记录
      status(
        "保存未完成：" + error.message +
        "。请勿刷新；先检查云端状态。"
      );
    } finally {
      busy = false;
      $("bgmFallbackImport").disabled = false;
    }
  };

  console.log("Bangumi备用建档已启用");
})();
