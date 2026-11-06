
/*
 ANIME ATLAS - Smart Series Import v2
 Bangumi 系列关联 + AnimeThemes 多季音乐
 保留旧作品评级、歌曲爱心和BV号
*/
(() => {
"use strict";

const old = document.getElementById("animeAutoPanel");
if (old) old.style.display = "none";

const main = document.querySelector("main");
if (!main) return;

const panel = document.createElement("section");
panel.className = "panel";
panel.id = "animeAutoV2";
panel.innerHTML = `
  <h2>✨ 智能建档 · 系列与音乐</h2>
  <p class="muted">
    中文选作品 → 查关联季数 → 预览OP/ED → 一次保存
  </p>

  <label>动漫中文名</label>
  <input id="v2query" placeholder="例如：孤独摇滚">

  <div class="controls">
    <button id="v2search">搜索作品</button>
  </div>
  <div id="v2results"></div>

  <label>保存到</label>
  <select id="v2target"></select>

  <label>新作品评级</label>
  <select id="v2grade"></select>

  <div class="controls">
    <button id="v2relations" disabled>
      查找系列关联及主题曲
    </button>
  </div>

  <div id="v2works"></div>
  <div id="v2preview"></div>

  <div class="controls">
    <button id="v2save" disabled>
      确认导入并保存云端
    </button>
  </div>

  <p class="muted" id="v2status"></p>
`;

if (old) old.before(panel);
else main.prepend(panel);

const $ = id => document.getElementById(id);

const normalize = s => String(s || "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[\s　:：!！·・\-—_。★☆～~]/g, "");

const grades = [
  "TOP1","TOP6","TOP20","S","A","B","C","D"
];

grades.forEach(g => {
  $("v2grade").add(new Option(g, g));
});
$("v2grade").value = "A";

let picked = null;
let works = [];
let busy = false;

function status(s) {
  $("v2status").textContent = s;
}

function action(text, fn) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "secondary";
  b.textContent = text;
  b.style.display = "block";
  b.style.margin = "7px 0";
  b.style.width = "100%";
  b.style.textAlign = "left";
  b.onclick = fn;
  return b;
}

function optionTargets() {
  const selected = $("v2target").value;

  $("v2target").replaceChildren(
    new Option("＋ 新建动漫系列", "new")
  );

  anime.forEach((a, i) => {
    $("v2target").add(
      new Option(
        a.name + "（" + a.rating + "）",
        String(i)
      )
    );
  });

  if ([...$("v2target").options]
      .some(o => o.value === selected)) {
    $("v2target").value = selected;
  }

  $("v2grade").disabled =
    $("v2target").value !== "new";
}

$("v2target").onchange = () => {
  $("v2grade").disabled =
    $("v2target").value !== "new";
};

optionTargets();

function url(fn, params) {
  return CLOUD_URL.replace(/\/+$/, "") +
    "/functions/v1/" + fn + "?" +
    new URLSearchParams(params);
}


async function api(fn, params) {
  const controller = new AbortController();

  // 单次请求最多等待8秒
  const timer = setTimeout(
    () => controller.abort(), 8000
  );

  try {
    const response = await fetch(url(fn, params), {
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        (data.error || "HTTP " + response.status) +
        (data.detail ? "：" + data.detail : "")
      );
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "查询超过8秒，已跳过本次请求"
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}


function resetCandidates() {
  works = [];
  $("v2works").replaceChildren();
  $("v2preview").replaceChildren();
  $("v2save").disabled = true;
}

$("v2search").onclick = async () => {
  if (busy) return;

  const q = $("v2query").value.trim();
  if (!q) return status("请先输入动漫名称");

  busy = true;
  picked = null;
  resetCandidates();
  $("v2relations").disabled = true;
  $("v2results").replaceChildren();
  status("正在搜索Bangumi...");

  try {
    const result = await api("bangumi-search", {q});

    for (const item of result.data || []) {
      $("v2results").append(
        action(
          (item.name_cn || item.name) +
          " / " + item.name +
          " · " + (item.date || "日期未知"),

          () => {
            picked = item;
            resetCandidates();
            $("v2relations").disabled = false;
            $("v2results").replaceChildren();

            const p = document.createElement("p");
            p.textContent =
              "已选择：" +
              (item.name_cn || item.name) +
              " / " + item.name;
            $("v2results").append(p);

            optionTargets();

            const i = anime.findIndex(a =>
              a.meta?.bangumi_id === item.id ||
              normalize(a.name) ===
              normalize(item.name_cn || item.name)
            );

            $("v2target").value =
              i >= 0 ? String(i) : "new";

            $("v2target").dispatchEvent(
              new Event("change")
            );

            status(
              "已选中作品。点击查找系列关联及主题曲。"
            );
          }
        )
      );
    }

    status(
      result.data?.length
        ? "请选择正确的动漫"
        : "未找到条目，请尝试其他名称"
    );

  } catch (e) {
    status("搜索失败：" + e.message);
  } finally {
    busy = false;
  }
};

function chosenWorkItems() {
  return works.filter(w => w.checked);
}

function renderWorks() {
  const el = $("v2works");
  el.replaceChildren();

  const h = document.createElement("h3");
  h.textContent = "关联作品与歌曲预览";
  el.append(h);

  const note = document.createElement("p");
  note.className = "muted";
  note.textContent =
    "只勾选确属这个系列的动画。" +
    "未查询到音乐的版本仍可建立子作品目录。";
  el.append(note);

  // 批量选择工具栏
  const selectBar = document.createElement("div");
  selectBar.className = "controls";
  selectBar.style.display = "flex";
  selectBar.style.flexWrap = "wrap";
  selectBar.style.alignItems = "center";
  selectBar.style.gap = "8px";
  selectBar.style.margin = "12px 0";

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = "secondary";
  allButton.textContent = "☑ 一键全选";

  allButton.onclick = () => {
    works.forEach(w => {
      w.checked = true;
    });
    renderWorks();
    renderPreview();
  };

  const noneButton = document.createElement("button");
  noneButton.type = "button";
  noneButton.className = "secondary";
  noneButton.textContent = "□ 取消全选";

  noneButton.onclick = () => {
    works.forEach(w => {
      w.checked = false;
    });
    renderWorks();
    renderPreview();
  };

  const count = document.createElement("span");
  count.className = "muted";
  count.textContent =
    `已选 ${works.filter(w => w.checked).length}` +
    ` / ${works.length} 部`;

  selectBar.append(allButton, noneButton, count);
  el.appendChild(selectBar);

  // 批量选择工具栏
  const selectBar = document.createElement("div");
  selectBar.className = "controls";
  selectBar.style.display = "flex";
  selectBar.style.flexWrap = "wrap";
  selectBar.style.alignItems = "center";
  selectBar.style.gap = "8px";
  selectBar.style.margin = "12px 0";

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = "secondary";
  allButton.textContent = "☑ 一键全选";

  allButton.onclick = () => {
    works.forEach(w => {
      w.checked = true;
    });
    renderWorks();
    renderPreview();
  };

  const noneButton = document.createElement("button");
  noneButton.type = "button";
  noneButton.className = "secondary";
  noneButton.textContent = "□ 取消全选";

  noneButton.onclick = () => {
    works.forEach(w => {
      w.checked = false;
    });
    renderWorks();
    renderPreview();
  };

  const count = document.createElement("span");
  count.className = "muted";
  count.textContent =
    `已选 ${works.filter(w => w.checked).length}` +
    ` / ${works.length} 部`;

  selectBar.append(allButton, noneButton, count);
  el.appendChild(selectBar);

  works.forEach(w => {
    const row = document.createElement("label");
    row.style.display = "block";
    row.style.padding = "6px 0";

    const c = document.createElement("input");
    c.type = "checkbox";
    c.checked = w.checked;

    c.onchange = () => {
      w.checked = c.checked;
      renderPreview();
    };

    row.append(
      c,
      document.createTextNode(
        " " + w.name +
        " · " + (w.date || "年份未知") +
        " · " + w.tracks.length + "首OP/ED" +
        (w.error ? "（待补）" : "")
      )
    );

    el.append(row);

    // 标题无法自动匹配时，允许手动指定音乐源
    if (w.candidates?.length) {
      el.append(action(
        "手动指定音乐来源（" +
        w.candidates.length + "个候选）",

        async () => {
          const opts = w.candidates.map(
            (x, j) =>
              (j + 1) + ". " + x.name +
              " (" + (x.year || "?") + ")"
          );

          const answer = prompt(
            "请输入正确的动漫编号：\n" +
            opts.join("\n")
          );

          if (answer === null) return;

          const n = Number(answer);

          if (!Number.isInteger(n) ||
              n < 1 || n > opts.length) {
            return alert("编号无效");
          }

          try {
            status("正在获取指定版本歌曲...");

            const selected = w.candidates[n - 1];
            const data = await api(
              "animethemes-proxy",
              {slug: selected.slug}
            );

            w.slug = selected.slug;
            w.tracks = parseThemes(data.anime || {});
            w.error = "";
            w.candidates = [];

            renderWorks();
            renderPreview();

            status(
              "已设置音乐来源：" + selected.name
            );

          } catch (e) {
            status(
              "音乐来源读取失败：" + e.message
            );
          }
        }
      ));
    }
  });
}

function renderPreview() {
  const box = $("v2preview");
  box.replaceChildren();

  const selected = chosenWorkItems();
  const total = selected.reduce(
    (n, w) => n + w.tracks.length, 0
  );

  const p = document.createElement("p");
  p.textContent =
    "选中 " + selected.length +
    " 个动画版本，候选歌曲 " + total +
    " 条。按歌曲和演唱版本去重。";

  box.append(p);

  selected.slice(0, 8).forEach(w => {
    const line = document.createElement("p");
    line.className = "muted";

    line.textContent =
      w.name + "：" +
      w.tracks.slice(0, 3)
        .map(t => t.type + " " + t.title)
        .join("、") +
      (w.tracks.length > 3 ? "…" : "");

    box.append(line);
  });

  $("v2save").disabled =
    !picked || busy || !selected.length;
}

function parseThemes(record) {
  return (record.animethemes || []).flatMap(t => {
    const type = String(
      t.type || ""
    ).toUpperCase();

    if (!["OP", "ED"].includes(type) ||
        !t.song?.title) {
      return [];
    }

    return [{
      title: t.song.title,
      artist: (t.song.artists || [])
        .map(a => a.name)
        .filter(Boolean).join("、") || "待核实",
      type,
      sourceSongId: t.song.id || null,
      sequence: t.sequence || null
    }];
  });
}

function searchTerms(item) {
  return [...new Set(
    [item.name, item.name_cn].filter(Boolean)
  )].slice(0, 2);
}

async function findTheme(item) {
  const all = new Map();

  for (const q of searchTerms(item)) {
    try {
      const j = await api(
        "animethemes-proxy", {q}
      );

      for (const x of j.anime || []) {
        if (x.slug) all.set(x.slug, x);
      }

    } catch (_) {
      // 一个搜索词失败时尝试其他语言
    }
  }

  const exact = [...all.values()].filter(x =>
    searchTerms(item).some(n =>
      normalize(x.name) === normalize(n)
    )
  );

  const year = Number(
    String(item.date || "").slice(0, 4)
  );

  const close = exact.filter(x =>
    !year || !x.year ||
    Math.abs(Number(x.year) - year) <= 1
  );

  // 找不到唯一结果时，不猜测是哪一季
  if (close.length !== 1) {
    return {
      tracks: [],
      error: "需要手动匹配AnimeThemes",
      candidates: [...all.values()].slice(0, 8)
    };
  }

  const detail = await api(
    "animethemes-proxy",
    {slug: close[0].slug}
  );

  return {
    slug: close[0].slug,
    tracks: parseThemes(detail.anime || {}),
    error: ""
  };
}

$("v2relations").onclick = async () => {
  if (busy || !picked) return;

  busy = true;
  $("v2relations").disabled = true;
  resetCandidates();

  status("正在查找Bangumi关联作品...");

  try {
    const discovered = new Map([
      [picked.id, picked]
    ]);

    const queue = [picked.id];
    let count = 0;

    // 本轮最多遍历8个节点、收录20个关联候选
    while (
      queue.length &&
      count < 8 &&
      discovered.size < 20
    ) {
      const id = queue.shift();
      count++;

      let related = [];

      try {
        const result = await api(
          "bangumi-relations", {id}
        );
        related = result.data || [];

      } catch (e) {
        status(
          "部分关联查询失败：" + e.message
        );
      }

      for (const x of related) {
        if (!x?.id ||
            discovered.has(x.id) ||
            discovered.size >= 20) {
          continue;
        }

        discovered.set(x.id, x);
        queue.push(x.id);
      }
    }

    works = [...discovered.values()].map(
      (x, i) => ({
        id: x.id,
        name: x.name_cn || x.name ||
          "未知动画",
        original: x.name || "",
        date: x.date || "",
        checked: i === 0,
        tracks: [],
        slug: null,
        error: ""
      })
    );

    status(
      "已找到 " + works.length +
      " 个关联候选，正在读取主题曲..."
    );

    // 本轮查询前3个动画，其余可后续再补
    for (const w of works) {
      if (works.indexOf(w) >= 3) {
        w.error = "本次未查询";
        continue;
      }

      try {
       status(
  "正在读取主题曲：" +
  (works.indexOf(w) + 1) +
  "/3 · " + w.name
);
        const data = await findTheme({
          name: w.original,
          name_cn: w.name,
          date: w.date
        });

        w.tracks = data.tracks;
        w.slug = data.slug || null;
        w.error = data.error;
        w.candidates = data.candidates || [];

      } catch (e) {
        w.error = e.message;
      }
    }

    renderWorks();
    renderPreview();

    status(
      "候选已就绪。请核对关联作品，" +
      "未匹配音乐的版本可先建目录。"
    );

  } catch (e) {
    status(
      "关联查询失败：" + e.message
    );

  } finally {
    busy = false;
    $("v2relations").disabled = false;
    renderPreview();
  }
};

function childFor(a, w) {
  if (!Array.isArray(a.children)) {
    a.children = [];
  }

  let c = a.children.find(x =>
    x.bangumi_id === w.id ||
    (w.slug && x.animeThemesSlug === w.slug) ||
    normalize(x.name) === normalize(w.name)
  );

  if (!c) {
    c = {
      id: "sub-" + crypto.randomUUID(),
      name: w.name,
      rating: null,
      bangumi_id: w.id
    };
    a.children.push(c);
  }

  if (w.slug && !c.animeThemesSlug) {
    c.animeThemesSlug = w.slug;
  }

  return c;
}

function songKey(title, artist) {
  return normalize(title) + "|" +
    normalize(artist);
}

$("v2save").onclick = async () => {
  if (busy || !picked) return;

  if (!cloudUser || !cloudSyncEnabled) {
    return status(
      "请先登录并读取云端档案"
    );
  }

  const idx = $("v2target").value;
  const isNew = idx === "new";
  const selected = chosenWorkItems();

  const existing = isNew
    ? null
    : anime[Number(idx)];

  if (!isNew && !existing) {
    return status("目标动漫已失效");
  }

  const name =
    picked.name_cn || picked.name;

  if (isNew) {
    const g = $("v2grade").value;
    const caps = {
      TOP1: 1, TOP6: 5, TOP20: 14
    };

    if (
      caps[g] &&
      anime.filter(a => a.rating === g).length
        >= caps[g]
    ) {
      return status(g + "名额已满");
    }

    if (anime.some(a =>
      a.meta?.bangumi_id === picked.id ||
      normalize(a.name) === normalize(name)
    )) {
      return status(
        "已有此作品，请选择补充模式"
      );
    }
  }

  if (!selected.length) {
    return status("请至少勾选一个子作品");
  }

  if (!confirm(
    (isNew ? "新建" : "补充") +
    "《" + (existing?.name || name) + "》" +
    "\n关联作品：" + selected.length + "部" +
    "\n确认后将追加缺失歌曲并上传云端。"
  )) return;

  try {
    localStorage.setItem(
      "animeAtlasBeforeSeriesV2_" + Date.now(),
      JSON.stringify(anime)
    );
  } catch (e) {
    return status(
      "备份失败，取消保存：" + e.message
    );
  }

  busy = true;
  $("v2save").disabled = true;

  try {
    const a = existing || {
      id: "anime-" + crypto.randomUUID(),
      name,
      rating: $("v2grade").value,
      songs: [],
      children: [],
      meta: {}
    };

    a.meta = a.meta || {};
    a.meta.bangumi_id =
      a.meta.bangumi_id || picked.id;

    a.meta.japanese =
      a.meta.japanese || picked.name;

    if (!Array.isArray(a.songs)) {
      a.songs = [];
    }

    let added = 0;
    let childCount = 0;

    for (const w of selected) {
      const before = a.children?.length || 0;
      const child = childFor(a, w);

      if (a.children.length > before) {
        childCount++;
      }

      if (a.rating === "D") continue;

      for (const t of w.tracks) {
        // 同名不同演唱者可以保留不同版本
        // 原记录只去重，不覆盖任何收藏字段
        const duplicate = a.songs.some(s =>
          (
            t.sourceSongId &&
            s.animeThemesSongId === t.sourceSongId
          ) ||
          songKey(s.title, s.artist) ===
          songKey(t.title, t.artist) ||
          (
            normalize(s.title) ===
            normalize(t.title) &&
            (!s.artist ||
              s.artist === "待核实")
          )
        );

        if (duplicate) continue;

        a.songs.push({
          id: "v2-" + crypto.randomUUID(),
          title: t.title,
          artist: t.artist,
          type: t.type,
          liked: false,
          bv: "",
          childId: child.id,
          animeThemesSongId: t.sourceSongId,
          source: "AnimeThemes",
          sourceAnime: w.name,
          sequence: t.sequence
        });

        added++;
      }
    }

    if (isNew) anime.push(a);

    save();
    renderAnime();
    stats();

    if (typeof queueCloudWrite !== "function") {
      throw Error("云端保存函数不可用");
    }

    clearTimeout(cloudSaveTimer);
    await queueCloudWrite();

    optionTargets();

    status(
      "✓ 云端保存成功：新增子作品 " +
      childCount + " 个，新增歌曲 " +
      added + " 首。"
    );

  } catch (e) {
    status(
      "保存未确认：" + e.message +
      "。请勿刷新，先保留当前页面。"
    );

  } finally {
    busy = false;
    renderPreview();
  }
};

console.log(
  "ANIME ATLAS 系列音乐智能导入 v2 已加载"
);
})();
