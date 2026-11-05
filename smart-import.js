
/*
 ANIME ATLAS - Smart Import v1
 自动搜索动漫、关联作品、OP/ED
 兼容 index.html + cloud.js + upgrade.js
 不覆盖已有评级、爱心、BV号
 数据来源：Jikan / MyAnimeList
*/
(() => {
"use strict";

const API = "https://api.jikan.moe/v4";
const levels = ["TOP1","TOP6","TOP20","S","A","B","C","D"];

const $ = id => document.getElementById(id);
const wait = ms => new Promise(r => setTimeout(r,ms));
const normalize = value =>
  String(value||"").normalize("NFKC").toLowerCase()
    .replace(/[\s　:：!！·・\-—_。]/g,"");

const container = document.createElement("section");
container.className = "panel";
container.id = "smartImportPanel";

container.innerHTML = `
  <h2>✨ 智能动漫资料导入</h2>
  <p class="muted">
    搜索动漫 → 选择匹配作品 → 自动补充关联动画与OP/ED
  </p>

  <label>动漫名称（推荐日文或罗马音）</label>
  <input id="smartQuery"
    placeholder="例如 Bocchi the Rock">

  <div class="controls">
    <button id="smartSearch">🔎 搜索动漫</button>
  </div>

  <div id="smartResults"></div>

  <label>导入目标</label>
  <select id="smartTarget"></select>

  <label>新作品的评级</label>
  <select id="smartGrade"></select>

  <p class="muted" id="smartHint">
    可以新增作品，或为已有38部动漫补充资料。
  </p>

  <button id="smartImport" disabled>
    自动获取并导入资料
  </button>

  <p class="muted" id="smartStatus"></p>
`;

const addPage = $("add");
if (!addPage) return;
addPage.prepend(container);

const results = $("smartResults");
const grade = $("smartGrade");
const target = $("smartTarget");
const status = $("smartStatus");
const importButton = $("smartImport");

let selectedAnime = null;
let searching = false;
let importing = false;

levels.forEach(g => {
  const o = document.createElement("option");
  o.value = g;
  o.textContent = g;
  grade.appendChild(o);
});
grade.value = "A";

function fillTargets() {
  const old = target.value;

  target.replaceChildren();

  const fresh = document.createElement("option");
  fresh.value = "new";
  fresh.textContent = "＋ 新建动漫系列";
  target.appendChild(fresh);

  anime.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = a.name + "（" + a.rating + "）";
    target.appendChild(opt);
  });

  target.value =
    [...target.options].some(o => o.value === old)
      ? old : "new";

  grade.disabled = target.value !== "new";
}

target.onchange = () => {
  grade.disabled = target.value !== "new";
};

fillTargets();

// 公共请求：处理限流与常见网络错误
let lastRequest = 0;

async function request(path) {
  const elapsed = Date.now() - lastRequest;
  if (elapsed < 450) await wait(450-elapsed);

  lastRequest = Date.now();

  const response = await fetch(API + path, {
    headers: { "Accept":"application/json" }
  });

  if (response.status === 429) {
    throw new Error("资料接口请求过于频繁，请稍后重试");
  }

  if (!response.ok) {
    throw new Error("资料接口返回 HTTP " + response.status);
  }

  return response.json();
}

function setStatus(text) {
  status.textContent = text;
}

// 搜索动画
$("smartSearch").onclick = async () => {
  if (searching || importing) return;

  const q = $("smartQuery").value.trim();
  if (!q) return setStatus("请先输入动漫名称");

  searching = true;
  selectedAnime = null;
  importButton.disabled = true;
  results.replaceChildren();
  setStatus("正在搜索动漫资料...");

  try {
    const json = await request(
      "/anime?q=" + encodeURIComponent(q) + "&limit=10"
    );

    const matches = json.data || [];

    if (!matches.length) {
      setStatus(
        "没有匹配结果。请尝试作品日文名、英文名或罗马音。"
      );
      return;
    }

    matches.forEach(item => {
      const b = document.createElement("button");
      b.className = "secondary";
      b.style.display = "block";
      b.style.width = "100%";
      b.style.textAlign = "left";
      b.style.margin = "8px 0";

      b.textContent =
        (item.title || item.title_english || "未命名") +
        " / " + (item.title_japanese || "") +
        " · " + (item.year || "年份未知") +
        " · " + (item.type || "动画");

      b.onclick = () => {
        selectedAnime = item;
        results.querySelectorAll("button").forEach(
          x => x.classList.remove("active")
        );
        b.classList.add("active");
        importButton.disabled = false;

        setStatus(
          "已选择：" + item.title +
          "。请确认导入目标和评级。"
        );
      };

      results.appendChild(b);
    });

    setStatus(
      "找到 " + matches.length +
      " 个结果，请点击正确的作品。"
    );

  } catch (e) {
    setStatus("搜索失败：" + e.message);
  } finally {
    searching = false;
  }
};

// 从Jikan主题曲原始文字中提取曲名及歌手
function parseTheme(raw, type) {
  const text = String(raw || "").trim();

  // 常见格式：
  // 1: "Song Name" by Artist (eps 1-12)
  const match = text.match(
    /^(?:\d+\s*:\s*)?["“](.+?)["”]\s+by\s+(.+?)(?:\s+\(eps?[\s.)]|$)/i
  );

  if (match) {
    return {
      title: match[1].trim(),
      artist: match[2].trim(),
      type
    };
  }

  const simple = text.match(
    /^(?:\d+\s*:\s*)?["“](.+?)["”]/
  );

  if (simple) {
    return {
      title: simple[1].trim(),
      artist: "待核实",
      type
    };
  }

  // 无法解析则保留原文，标记待核实
  return {
    title: text.replace(/^\d+\s*:\s*/, ""),
    artist: "待核实",
    type,
    needsReview: true
  };
}

function makeChild(a, item) {
  if (!Array.isArray(a.children)) a.children = [];

  let child = a.children.find(
    c => c.mal_id === item.mal_id ||
    normalize(c.name) === normalize(item.name)
  );

  if (!child) {
    child = {
      id:"sub-" + crypto.randomUUID(),
      name:item.name,
      mal_id:item.mal_id,
      rating:null,
      watched:null,
      source:"Jikan"
    };
    a.children.push(child);
  }

  return child;
}

function addThemes(a, child, raw, type) {
  if (!Array.isArray(a.songs)) a.songs = [];

  let count = 0;

  for (const line of raw || []) {
    const song = parseTheme(line, type);
    if (!song.title) continue;

    // 先按同曲名保留旧记录，防止爱心、BV号丢失
    const existing = a.songs.find(
      s => normalize(s.title) === normalize(song.title)
    );

    if (existing) {
      if (!existing.childId && child) {
        existing.childId = child.id;
      }
      continue;
    }

    a.songs.push({
      id:"auto-" + crypto.randomUUID(),
      title:song.title,
      artist:song.artist,
      type:song.type,
      childId:child?.id || null,
      bv:"",
      liked:false,
      needsReview:!!song.needsReview,
      source:"Jikan"
    });

    count++;
  }

  return count;
}

function gradeAvailable(g) {
  const limits = { TOP1:1, TOP6:5, TOP20:14 };
  return !limits[g] ||
    anime.filter(a => a.rating === g).length < limits[g];
}

// 自动导入
importButton.onclick = async () => {
  if (importing || !selectedAnime) return;

  if (typeof cloudSyncEnabled === "undefined" ||
      !cloudSyncEnabled || !cloudUser) {
    return setStatus(
      "请先登录，并确认已自动读取Supabase档案。"
    );
  }

  const isNew = target.value === "new";
  const targetAnime = isNew
    ? null
    : anime.find(a => a.id === target.value);

  if (!isNew && !targetAnime) {
    return setStatus("找不到指定的目标动漫");
  }

  if (isNew && !gradeAvailable(grade.value)) {
    return setStatus(
      grade.value + "名额已满，请选择其他评级。"
    );
  }

  if (isNew && anime.some(a =>
    normalize(a.name) === normalize(selectedAnime.title)
  )) {
    return setStatus(
      "已有同名作品，请选择补充已有档案。"
    );
  }

  const label = isNew
    ? "新增：" + selectedAnime.title
    : "补充：" + targetAnime.name;

  if (!confirm(
    label + "\n" +
    "将尝试读取主要关联动画及其OP/ED。" +
    "\n不会覆盖已有评级、爱心、BV号。" +
    "\n确定导入吗？"
  )) return;

  importing = true;
  importButton.disabled = true;

  try {
    // 先备份完整数据
    localStorage.setItem(
      "animeAtlasBeforeSmart_" + Date.now(),
      JSON.stringify(anime)
    );
  } catch (e) {
    setStatus("备份失败，导入已取消：" + e.message);
    importing = false;
    importButton.disabled = false;
    return;
  }

  try {
    const picked = selectedAnime;

    // 先查询网络，完成后再写入本地档案
    setStatus("正在获取动画详情和主题曲...");

    const details = await request(
      "/anime/" + picked.mal_id + "/full"
    );

    const relations = await request(
      "/anime/" + picked.mal_id + "/relations"
    );

    const related = (relations.data || [])
      .flatMap(r => r.entry || [])
      .filter(e => e.type === "anime")
      .filter(e => e.mal_id !== picked.mal_id);

    const unique = [...new Map(
      related.map(r => [r.mal_id,r])
    ).values()].slice(0,12);

    const candidates = [{
      mal_id:picked.mal_id,
      name:picked.title,
      themes:details.data?.theme || {}
    }];

    let failed = 0;

    for (let i=0; i<unique.length; i++) {
      const r = unique[i];

      setStatus(
        "正在读取关联作品 " +
        (i+1) + "/" + unique.length +
        "：" + r.name
      );

      try {
        const result = await request(
          "/anime/" + r.mal_id + "/themes"
        );

        candidates.push({
          mal_id:r.mal_id,
          name:r.name,
          themes:result.data || {}
        });
      } catch(e) {
        failed++;
        candidates.push({
          mal_id:r.mal_id,
          name:r.name,
          themes:{}
        });
      }
    }

    let a = targetAnime;

    if (isNew) {
      a = {
        id:"anime-" + crypto.randomUUID(),
        name:picked.title,
        rating:grade.value,
        songs:[],
        children:[]
      };
    }

    // 基础资料：不覆盖已有人工填写的内容
    a.meta = a.meta || {};
    a.meta.mal_id = picked.mal_id;
    a.meta.japanese =
      a.meta.japanese || picked.title_japanese;
    a.meta.year = a.meta.year || picked.year;
    a.meta.episodes =
      a.meta.episodes || picked.episodes;
    a.meta.format = a.meta.format || picked.type;
    a.meta.studios =
      a.meta.studios ||
      (picked.studios || []).map(s => s.name);
    a.meta.synopsis =
      a.meta.synopsis || picked.synopsis;
    a.meta.image =
      a.meta.image ||
      picked.images?.jpg?.large_image_url;

    let childrenAdded = 0;
    let songsAdded = 0;

    if (!Array.isArray(a.children)) a.children=[];
    if (!Array.isArray(a.songs)) a.songs=[];

    for (const item of candidates) {
      const before = a.children.length;
      const child = makeChild(a,item);

      if (a.children.length > before) childrenAdded++;

if (a.rating !== "D") {
  songsAdded += addThemes(
    a,child,item.themes.openings,"OP"
  );
  songsAdded += addThemes(
    a,child,item.themes.endings,"ED"
  );
}
    }

    if (isNew) anime.push(a);

    // 由现有cloud.js负责云端同步
    save();
    fillTargets();
    renderAnime();

    // 等待自动保存并报告实际结果
    if (typeof queueCloudWrite === "function") {
      clearTimeout(cloudSaveTimer);
      await queueCloudWrite();
    }

    setStatus(
      "✓ 已导入 " + a.name +
      "；关联子作品新增 " + childrenAdded +
      " 个，歌曲新增 " + songsAdded +
      " 首。" +
      (failed ? " 其中 " + failed +
        " 个关联作品暂未取得音乐数据。" : "") +
      " 数据已提交云端。"
    );

  } catch(e) {
    setStatus(
      "导入未完整完成：" + e.message +
      "。请检查本地备份及云端状态。"
    );
  } finally {
    importing = false;
    importButton.disabled = !selectedAnime;
  }
};

console.log("ANIME ATLAS Smart Import loaded");
})();
