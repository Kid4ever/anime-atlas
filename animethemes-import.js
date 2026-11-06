
/*
 ANIME ATLAS - AnimeThemes Import v1
 Bangumi建档 + AnimeThemes补歌
 保留原评级、爱心、BV、已录入歌曲
*/
(() => {
  "use strict";

  const panel = document.getElementById(
    "smartImportPanel"
  );

  if (!panel) {
    console.error("未找到智能导入面板");
    return;
  }

  const wrap = document.createElement("section");
  wrap.style.marginTop = "20px";
  wrap.innerHTML = `
    <h3>🎵 AnimeThemes 自动补歌</h3>
    <p class="muted">
      选择已有动漫，自动查找OP、ED和歌手。
      支持刚从Bangumi添加的新作品。
    </p>

    <label>要补充音乐的动漫</label>
    <select id="atTarget"></select>

    <label>搜索标题</label>
    <input id="atQuery"
      placeholder="日文、英文或罗马音">

    <div class="controls">
      <button id="atSearch">
        搜索主题曲
      </button>
    </div>

    <div id="atCandidates"></div>
    <div id="atPreview"></div>

    <button id="atImport" disabled>
      确认追加OP/ED并同步云端
    </button>

    <p id="atStatus" class="muted"></p>
  `;

panel.after(wrap);

  const $ = id => document.getElementById(id);
  const target = $("atTarget");
  const query = $("atQuery");
  const candidates = $("atCandidates");
  const preview = $("atPreview");
  const importButton = $("atImport");

  let selected = null;
  let tracks = [];
  let busy = false;

  const normalize = str =>
    String(str || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\s　:：・·\-—_。!！]/g, "");

  function status(message) {
    $("atStatus").textContent = message;
  }

  function currentAnime() {
    return anime.find(a =>
      String(a.id) === target.value
    );
  }

  function refreshTargets(preferred) {
    target.replaceChildren();

    anime.forEach(a => {
      const option = document.createElement("option");
      option.value = String(a.id);
      option.textContent =
        a.name + "（" + a.rating + "）";
      target.appendChild(option);
    });

    const picked = preferred
      ? anime.find(a =>
          String(a.id) === String(preferred)
        )
      : null;

    if (picked) {
      target.value = String(picked.id);
    }

    updateQuery();
  }

  function updateQuery() {
    const a = currentAnime();

    query.value =
      a?.meta?.japanese ||
      a?.name || "";

    selected = null;
    tracks = [];
    candidates.replaceChildren();
    preview.replaceChildren();
    importButton.disabled = true;
  }

  target.onchange = updateQuery;

  function endpoint(params) {
    return CLOUD_URL.replace(/\/+$/, "") +
      "/functions/v1/animethemes-proxy?" +
      new URLSearchParams(params).toString();
  }

  async function request(params) {
    const res = await fetch(endpoint(params), {
      headers: {Accept:"application/json"}
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(
        (json.error || "请求失败") +
        (json.upstreamStatus
          ? " (" + json.upstreamStatus + ")" : "") +
        (json.detail ? "：" + json.detail : "")
      );
    }

    return json;
  }

  function makeButton(text, click) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";
    button.style.display = "block";
    button.style.width = "100%";
    button.style.margin = "8px 0";
    button.style.textAlign = "left";
    button.textContent = text;
    button.onclick = click;
    return button;
  }

  function parseTracks(record) {
    const list = [];

    for (const theme of record.animethemes || []) {
      const type = String(theme.type || "")
        .toUpperCase();

      if (type !== "OP" && type !== "ED") {
        continue;
      }

      const song = theme.song;
      if (!song?.title) continue;

      const artists = (song.artists || [])
        .map(a => a.name)
        .filter(Boolean)
        .join("、");

      list.push({
        title: song.title,
        artist: artists || "待核实",
        type,
        sequence: theme.sequence || null,
        sourceId: song.id || null
      });
    }

    // 同一曲名+演唱者+类别仅保留一条
    const known = new Set();

    return list.filter(t => {
      const key =
        normalize(t.title) + "|" +
        normalize(t.artist) + "|" + t.type;

      if (known.has(key)) return false;
      known.add(key);
      return true;
    });
  }

  async function choose(item) {
    selected = null;
    tracks = [];
    importButton.disabled = true;
    preview.replaceChildren();

    status("正在获取主题曲和演唱者...");

    const json = await request({
      slug:item.slug
    });

    const record = json.anime;
    if (!record || !Array.isArray(record.animethemes)) {
      throw new Error(
        "该作品暂未返回主题曲资料"
      );
    }

    selected = {
      id:record.id,
      name:record.name,
      slug:item.slug,
      year:record.year
    };

    tracks = parseTracks(record);

    const heading = document.createElement("p");
    heading.textContent =
      "已选择：" + selected.name +
      "（" + (selected.year || "年份未知") + "）";

    preview.appendChild(heading);

    if (!tracks.length) {
      status("该条目暂未收录可识别的OP/ED");
      return;
    }

    const summary = document.createElement("p");
    summary.textContent =
      "找到 " + tracks.length +
      " 首主题曲。预览：";

    preview.appendChild(summary);

    tracks.slice(0, 15).forEach(t => {
      const row = document.createElement("p");
      row.className = "muted";
      row.textContent =
        t.type + " · " +
        t.title + " — " + t.artist;
      preview.appendChild(row);
    });

    if (tracks.length > 15) {
      const more = document.createElement("p");
      more.textContent =
        "另有 " + (tracks.length-15) +
        " 首未在预览区展开";
      preview.appendChild(more);
    }

    importButton.disabled = false;

    status(
      "歌曲预览完成，请核对作品、年份后确认导入。"
    );
  }

  $("atSearch").onclick = async () => {
    if (busy) return;

    const keyword = query.value.trim();

    if (!keyword) {
      status("请填写搜索标题");
      return;
    }

    busy = true;
    $("atSearch").disabled = true;
    selected = null;
    tracks = [];
    importButton.disabled = true;
    candidates.replaceChildren();
    preview.replaceChildren();

    try {
      status("正在查询 AnimeThemes...");

      const json = await request({q:keyword});
      const items = json.anime || [];

      if (!items.length) {
        status(
          "没有找到作品。请尝试日文原名或英文名。"
        );
        return;
      }

      status(
        "找到 " + items.length +
        " 个候选，请核对动画年份与版本。"
      );

      items.forEach(item => {
        const label =
          item.name + " · " +
          (item.year || "年份未知") +
          " · " + (item.media_format || "动画");

        candidates.appendChild(
          makeButton(label, async () => {
            if (busy) return;
            busy = true;

            try {
              await choose(item);
            } catch (error) {
              status("读取音乐失败：" + error.message);
            } finally {
              busy = false;
            }
          })
        );
      });

    } catch (error) {
      status("搜索失败：" + error.message);
    } finally {
      busy = false;
      $("atSearch").disabled = false;
    }
  };

  importButton.onclick = async () => {
    if (busy || !selected || !tracks.length) return;

    const a = currentAnime();

    if (!a) {
      status("请先选择目标动漫");
      return;
    }

    if (
      typeof cloudUser === "undefined" ||
      !cloudUser ||
      typeof cloudSyncEnabled === "undefined" ||
      !cloudSyncEnabled
    ) {
      status("请先登录并读取云端档案");
      return;
    }

    if (a.rating === "D") {
      status("D级作品按照你的规则不自动补歌");
      return;
    }

    if (!confirm(
      "目标作品：" + a.name +
      "\n音乐来源：" + selected.name +
      "\n候选歌曲：" + tracks.length +
      "\n\n请确认这两个作品确实对应。" +
      "\n只追加缺失歌曲，不更改已有收藏。" +
      "\n确定吗？"
    )) return;

    // 写入前备份整个动漫档案
    try {
      localStorage.setItem(
        "animeAtlasBeforeThemes_" + Date.now(),
        JSON.stringify(anime)
      );
    } catch (error) {
      status("备份失败，已取消：" + error.message);
      return;
    }

    busy = true;
    importButton.disabled = true;

    try {
      if (!Array.isArray(a.songs)) a.songs = [];

      // 保留已有同名歌曲的所有字段
      const existing = new Set(
        a.songs.map(s => normalize(s.title))
      );

      let added = 0;

      for (const t of tracks) {
        const key = normalize(t.title);

        if (!key || existing.has(key)) {
          continue;
        }

        a.songs.push({
          id:"at-" + crypto.randomUUID(),
          title:t.title,
          artist:t.artist,
          type:t.type,
          bv:"",
          liked:false,
          childId:null,
          source:"AnimeThemes",
          animeThemesSongId:t.sourceId,
          sequence:t.sequence,
          sourceAnime:selected.name
        });

        existing.add(key);
        added++;
      }

      // 保存本地并调用现有云端队列
      save();
      renderAnime();
      stats();

      if (typeof queueCloudWrite !== "function") {
        throw new Error("未找到云端保存功能");
      }

      clearTimeout(cloudSaveTimer);
      await queueCloudWrite();

      status(
        "✓ 已保存到Supabase。新增歌曲：" +
        added + " 首，原有歌曲保持不变。"
      );

    } catch (error) {
      status(
        "保存未确认：" + error.message +
        "。请勿刷新，先检查云端状态。"
      );

    } finally {
      busy = false;
      importButton.disabled = false;
    }
  };

  // 每次进入“新增作品”页面，可点这里同步最新列表
  const refresh = document.createElement("button");
  refresh.className = "secondary";
  refresh.type = "button";
  refresh.textContent = "↻ 刷新作品列表";
  refresh.onclick = () => {
    const preferred = target.value;
    refreshTargets(preferred);
    status("作品列表已刷新");
  };

  wrap.insertBefore(refresh, target);
  refreshTargets();

  console.log(
    "ANIME ATLAS AnimeThemes导入模块已加载"
  );
})();
