
/*
 ANIME ATLAS - Auto Import v1
 Bangumi 中文搜索 + AnimeThemes OP/ED + 季数匹配

 需要已存在：
 anime, save(), renderAnime(), stats()
 cloud.js, bangumi-search, animethemes-proxy

 不使用 Jikan，不覆盖已有收藏
*/
(() => {
  "use strict";

  const norm = s => String(s || "")
    .normalize("NFKC").toLowerCase()
    .replace(/[\s　:：・·\-—_。!！]/g, "");

  const grades = [
    "TOP1","TOP6","TOP20","S","A","B","C","D"
  ];

  const host = document.querySelector("main");
  if (!host || typeof anime === "undefined") return;

  const oldPanel =
    document.getElementById("smartImportPanel");

  // 旧工具保留代码，仅隐藏重复的搜索界面
  if (oldPanel) oldPanel.style.display = "none";

  const panel = document.createElement("section");
  panel.className = "panel";
  panel.id = "animeAutoPanel";

  panel.innerHTML = `
    <h2>✨ 一键智能动漫建档</h2>
    <p class="muted">
      中文搜索 → 自动匹配季数 → 补充OP/ED → 云端保存
    </p>

    <label>动漫名称</label>
    <input id="aaQuery"
      placeholder="例如：孤独摇滚、葬送的芙莉莲">

    <div class="controls">
      <button id="aaSearch">🔍 智能搜索</button>
    </div>

    <div id="aaBangumi"></div>

    <label>导入目标</label>
    <select id="aaTarget"></select>

    <label>新作品的个人评级</label>
    <select id="aaGrade"></select>

    <label>AnimeThemes 查曲名称</label>
    <input id="aaMusicQuery"
      placeholder="可用英文、日文或罗马音">

    <div id="aaSeasons"></div>

    <div class="controls">
      <button id="aaFindMusic" class="secondary"
        disabled>重新搜索音乐</button>
      <button id="aaImport" disabled>
        ✅ 一键建档并补歌
      </button>
    </div>

    <p id="aaStatus" class="muted"></p>
  `;

  if (oldPanel) {
    oldPanel.before(panel);
  } else {
    host.prepend(panel);
  }

  const $ = id => document.getElementById(id);
  let chosenBangumi = null;
  let themeCandidates = [];
  let busy = false;
  let searchVersion = 0;

  function status(text) {
    $("aaStatus").textContent = text;
  }

  function endpoint(fn, params) {
    return CLOUD_URL.replace(/\/+$/, "") +
      "/functions/v1/" + fn + "?" +
      new URLSearchParams(params).toString();
  }

  async function get(fn, params) {
    const response = await fetch(endpoint(fn, params), {
      headers: { Accept: "application/json" }
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        (data.error || "HTTP " + response.status) +
        (data.detail ? "：" + data.detail : "")
      );
    }
    return data;
  }

  function button(label, handler) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "secondary";
    b.style.display = "block";
    b.style.width = "100%";
    b.style.margin = "7px 0";
    b.style.textAlign = "left";
    b.textContent = label;
    b.onclick = handler;
    return b;
  }

  function refreshTargets() {
    const old = $("aaTarget").value;
    $("aaTarget").replaceChildren();

    const fresh = document.createElement("option");
    fresh.value = "new";
    fresh.textContent = "＋ 新建动漫系列";
    $("aaTarget").appendChild(fresh);

    anime.forEach((a, i) => {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent =
        a.name + "（" + a.rating + "）";
      $("aaTarget").appendChild(option);
    });

    const valid = [...$("aaTarget").options]
      .some(o => o.value === old);

    $("aaTarget").value = valid ? old : "new";
    $("aaGrade").disabled =
      $("aaTarget").value !== "new";
  }

  grades.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    $("aaGrade").appendChild(opt);
  });
  $("aaGrade").value = "A";

  $("aaTarget").onchange = () => {
    $("aaGrade").disabled =
      $("aaTarget").value !== "new";
    updateImportButton();
  };

  function updateImportButton() {
    $("aaImport").disabled =
      busy || !chosenBangumi;
  }

  function clearMusic() {
    themeCandidates = [];
    $("aaSeasons").replaceChildren();
    updateImportButton();
  }

  function selectExisting() {
    if (!chosenBangumi) return;

    const id = chosenBangumi.id;
    const names = [
      chosenBangumi.name,
      chosenBangumi.name_cn
    ].map(norm);

    const i = anime.findIndex(a =>
      a.meta?.bangumi_id === id ||
      names.includes(norm(a.name))
    );

    $("aaTarget").value =
      i >= 0 ? String(i) : "new";
    $("aaGrade").disabled = i >= 0;
  }

  function animeYear(item) {
    return Number(
      String(item.date || "").slice(0, 4)
    ) || null;
  }

  function musicLabel(item) {
    return [
      item.name,
      item.year || "年份未知",
      item.season || "",
      item.media_format || ""
    ].filter(Boolean).join(" · ");
  }

  function renderSeasons(items) {
    $("aaSeasons").replaceChildren();

    const title = document.createElement("h3");
    title.textContent =
      "🎵 匹配到的动画版本 / 季数";
    $("aaSeasons").appendChild(title);

    if (!items.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent =
        "未找到主题曲数据。仍可建立动漫基础档案。";
      $("aaSeasons").appendChild(p);
      return;
    }

    const help = document.createElement("p");
    help.className = "muted";
    help.textContent =
      "请勾选属于当前系列的季数或剧场版。" +
      "已自动建议匹配项，导入前可以调整。";
    $("aaSeasons").appendChild(help);

    const baseYear = animeYear(chosenBangumi);
    const baseName = norm(chosenBangumi.name);

    items.forEach((item, i) => {
      const label = document.createElement("label");
      label.style.display = "block";
      label.style.margin = "9px 0";

      const check = document.createElement("input");
      check.type = "checkbox";
      check.dataset.index = String(i);

      const itemYear = Number(item.year) || null;
      const nearYear = !baseYear || !itemYear ||
        Math.abs(baseYear - itemYear) <= 1;

      const itemName = norm(item.name);

      const strongName =
        baseName === itemName ||
        (baseName.length >= 5 &&
         itemName.includes(baseName));

      // 只为明显相符的作品默认勾选
      check.checked = strongName && nearYear;

      label.appendChild(check);
      label.appendChild(
        document.createTextNode(" " + musicLabel(item))
      );
      $("aaSeasons").appendChild(label);
    });
  }

  async function searchMusic(title, version) {
    clearMusic();
    status("正在查询 AnimeThemes 季数和主题曲...");

    const data = await get(
      "animethemes-proxy", { q: title }
    );

    if (version !== searchVersion) return;

    themeCandidates = (data.anime || [])
      .filter(x => x.slug && x.name)
      .slice(0, 10);

    renderSeasons(themeCandidates);

    status(
      themeCandidates.length
        ? "已找到 " + themeCandidates.length +
          " 个动画候选，请核对勾选项。"
        : "未找到音乐候选，仍可建立基础档案。"
    );
  }

  async function chooseBangumi(item) {
    chosenBangumi = item;
    refreshTargets();
    selectExisting();

    $("aaMusicQuery").value =
      item.name || item.name_cn || "";

    $("aaBangumi").replaceChildren();

    const p = document.createElement("p");
    p.textContent =
      "已选择：" + (item.name_cn || item.name) +
      " / " + item.name +
      " · " + (item.date || "年份未知");

    $("aaBangumi").appendChild(p);

    $("aaFindMusic").disabled = false;
    updateImportButton();

    // 选中Bangumi条目后自动查找音乐
    const version = ++searchVersion;
    try {
      await searchMusic(
        $("aaMusicQuery").value, version
      );
    } catch (error) {
      if (version === searchVersion) {
        clearMusic();
        status(
          "音乐源暂时不可用：" + error.message +
          "。仍可只建立动漫档案。"
        );
      }
    }
  }

  $("aaSearch").onclick = async () => {
    if (busy) return;

    const keyword = $("aaQuery").value.trim();
    if (!keyword) {
      status("请先输入动漫名称");
      return;
    }

    busy = true;
    chosenBangumi = null;
    ++searchVersion;
    clearMusic();
    $("aaFindMusic").disabled = true;
    $("aaBangumi").replaceChildren();
    $("aaSearch").disabled = true;

    try {
      status("正在通过Bangumi识别动漫...");

      const data = await get(
        "bangumi-search", { q: keyword }
      );

      const items = data.data || [];

      if (!items.length) {
        status("没有找到作品，请尝试其他名称");
        return;
      }

      status(
        "找到 " + items.length +
        " 个候选，请选择正确的作品。"
      );

      items.forEach(item => {
        $("aaBangumi").appendChild(
          button(
            (item.name_cn || item.name) +
            " / " + item.name +
            " · " + (item.date || "年份未知"),
            () => chooseBangumi(item)
          )
        );
      });

    } catch (error) {
      status("搜索失败：" + error.message);
    } finally {
      busy = false;
      $("aaSearch").disabled = false;
      updateImportButton();
    }
  };

  $("aaFindMusic").onclick = async () => {
    if (!chosenBangumi || busy) return;

    const title = $("aaMusicQuery").value.trim();
    if (!title) {
      status("请输入用于查曲的动画标题");
      return;
    }

    const version = ++searchVersion;

    try {
      await searchMusic(title, version);
    } catch (error) {
      status("音乐搜索失败：" + error.message);
    }
  };

  function parseTracks(record) {
    const result = [];

    for (const theme of record.animethemes || []) {
      const type = String(theme.type || "")
        .toUpperCase();

      if (!["OP","ED"].includes(type)) continue;
      if (!theme.song?.title) continue;

      const artist = (theme.song.artists || [])
        .map(x => x.name).filter(Boolean).join("、");

      result.push({
        title: theme.song.title,
        artist: artist || "待核实",
        type,
        sourceSongId: theme.song.id || null
      });
    }

    return result;
  }

  function findChild(a, record) {
    if (!Array.isArray(a.children)) a.children=[];

    let child = a.children.find(c =>
      c.animeThemesSlug === record.slug
    );

    if (!child) {
      child = a.children.find(c =>
        norm(c.name) === norm(record.name)
      );
    }

    if (!child) {
      child = {
        id:"sub-" + crypto.randomUUID(),
        name:record.name +
          (record.year ? " (" + record.year + ")" : ""),
        rating:null,
        animeThemesSlug:record.slug,
        year:record.year || null,
        season:record.season || null,
        format:record.media_format || null
      };
      a.children.push(child);
    } else if (!child.animeThemesSlug) {
      child.animeThemesSlug=record.slug;
    }

    return child;
  }

  function addSongs(a, child, record) {
    if (!Array.isArray(a.songs)) a.songs=[];
    let added = 0;

    for (const song of parseTracks(record)) {
      const exists = a.songs.some(s =>
        norm(s.title) === norm(song.title)
      );
      if (exists) continue;

      a.songs.push({
        id:"at-" + crypto.randomUUID(),
        title:song.title,
        artist:song.artist,
        type:song.type,
        liked:false,
        bv:"",
        childId:child.id,
        animeThemesSongId:song.sourceSongId,
        source:"AnimeThemes",
        sourceAnime:record.name
      });
      added++;
    }

    return added;
  }

  $("aaImport").onclick = async () => {
    if (busy || !chosenBangumi) return;

    if (!cloudUser || !cloudSyncEnabled) {
      status("请先登录并读取Supabase云端档案");
      return;
    }

    const idx = $("aaTarget").value;
    const isNew = idx === "new";
    const grade = $("aaGrade").value;
    const selectedRecords = [...$("aaSeasons")
      .querySelectorAll("input:checked")]
      .map(x => themeCandidates[Number(x.dataset.index)])
      .filter(Boolean);

    if (isNew) {
      const caps = {TOP1:1,TOP6:5,TOP20:14};
      if (
        caps[grade] &&
        anime.filter(a => a.rating === grade).length
          >= caps[grade]
      ) {
        status(grade + "名额已满");
        return;
      }
    }

    const existing = isNew
      ? null : anime[Number(idx)];

    if (!isNew && !existing) {
      status("导入目标已失效，请重新选择");
      return;
    }

    // 防止同一条Bangumi动漫重复建档
    if (isNew && anime.some(a =>
      a.meta?.bangumi_id === chosenBangumi.id ||
      norm(a.name) === norm(
        chosenBangumi.name_cn || chosenBangumi.name
      )
    )) {
      status(
        "此动漫可能已经存在。" +
        "请选择补充已有作品，避免重复。"
      );
      return;
    }

    const name =
      chosenBangumi.name_cn || chosenBangumi.name;

    if (!confirm(
      (isNew ? "新建：" : "补充：") +
      (existing?.name || name) +
      "\n本次选中动画版本：" +
      selectedRecords.length +
      "\n评级：" + (existing?.rating || grade) +
      "\n\n将自动获取OP/ED并云端保存。" +
      "\n现有评级、爱心和BV号不会被覆盖。" +
      "\n确认继续？"
    )) return;

    busy = true;
    $("aaImport").disabled = true;

    try {
      status("正在获取选中季数的OP/ED...");

      // 网络请求阶段不修改任何本地档案
      const records = [];
      let unavailable = 0;

      if (existing?.rating !== "D" &&
          grade !== "D") {
        for (const item of selectedRecords) {
          try {
            const data = await get(
              "animethemes-proxy",
              {slug:item.slug}
            );

            if (data.anime) records.push(data.anime);
            else unavailable++;
          } catch (_) {
            unavailable++;
          }
        }
      }

      // 完成网络查询后，再创建恢复点
      localStorage.setItem(
        "animeAtlasBeforeAuto_" + Date.now(),
        JSON.stringify(anime)
      );

      const a = existing || {
        id:"anime-" + crypto.randomUUID(),
        name,
        rating:grade,
        songs:[],
        children:[],
        meta:{}
      };

      a.meta = a.meta || {};
      if (!a.meta.bangumi_id) {
        a.meta.bangumi_id=chosenBangumi.id;
      }
      if (!a.meta.japanese) {
        a.meta.japanese=chosenBangumi.name || "";
      }
      if (!a.meta.date) {
        a.meta.date=chosenBangumi.date || "";
      }

      let songsAdded=0, childrenAdded=0;

      records.forEach(record => {
        const before = a.children?.length || 0;
        const child=findChild(a,record);

        if (a.children.length > before) {
          childrenAdded++;
        }

        if (a.rating !== "D") {
          songsAdded += addSongs(a,child,record);
        }
      });

      if (isNew) anime.push(a);

      save();
      renderAnime();
      stats();

      if (typeof queueCloudWrite !== "function") {
        throw new Error("找不到云端同步函数");
      }

      clearTimeout(cloudSaveTimer);
      await queueCloudWrite();

      refreshTargets();
      status(
        "✓ 云端保存成功：《" + a.name +
        "》新增子作品 " + childrenAdded +
        " 个、歌曲 " + songsAdded +
        " 首。" +
        (unavailable
          ? " 其中 " + unavailable +
            " 个版本暂未取得音乐。"
          : "")
      );

    } catch (error) {
      status(
        "导入或保存失败：" + error.message +
        "。请不要刷新页面，先检查数据。"
      );
    } finally {
      busy=false;
      updateImportButton();
    }
  };

  refreshTargets();

  console.log(
    "ANIME ATLAS 一体化智能导入已加载"
  );
})();
