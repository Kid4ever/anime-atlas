
/*
 ANIME ATLAS - Safe Cover Cache v1
 安全扫描、批量确认、私人Storage缓存
 不覆盖现有私人封面
*/
(() => {
  "use strict";

  const host = document.getElementById("atlasMediaTools");
  if (!host || document.getElementById("atlasCoverCache")) {
    return;
  }

  const BUCKET = "anime-media";
  const BATCH = 12;
  const MAX_BYTES = 5 * 1024 * 1024;

  const $ = id => document.getElementById(id);

  const ui = document.createElement("section");
  ui.id = "atlasCoverCache";
  ui.style.borderTop = "1px solid #8885";
  ui.style.marginTop = "18px";
  ui.style.paddingTop = "12px";

  ui.innerHTML = `
    <h3>🖼 安全批量缓存封面</h3>
    <p class="muted">
      先核对作品名称，再选中并缓存。
      已有私人封面不会被覆盖。
    </p>

    <div class="controls">
      <button id="ccScan" class="secondary">
        扫描下一批（12部）
      </button>
      <button id="ccReset" class="secondary">
        重新扫描
      </button>
    </div>

    <div class="controls">
      <button id="ccSelect" class="secondary">
        全选核对通过的候选
      </button>
      <button id="ccUnselect" class="secondary">
        取消全选
      </button>
    </div>

    <div id="ccItems"></div>

    <div class="controls">
      <button id="ccStart">
        ☁ 缓存已勾选的封面
      </button>
      <button id="ccStop" class="secondary" disabled>
        ■ 停止
      </button>
    </div>

    <p id="ccStatus" class="muted"></p>
  `;

  host.appendChild(ui);

  let inventory = [];
  let cursor = 0;
  let candidates = [];
  let busy = false;
  let stopped = false;
  let activeController = null;

  const status = s => {
    $("ccStatus").textContent = s;
  };

  function ready() {
    return (
      typeof cloudUser !== "undefined" &&
      cloudUser?.id &&
      typeof cloudSyncEnabled !== "undefined" &&
      cloudSyncEnabled &&
      typeof cloudClient !== "undefined" &&
      typeof queueCloudWrite === "function" &&
      typeof CLOUD_URL !== "undefined"
    );
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\p{P}\p{S}\s]/gu, "");
  }

  function bgmId(obj) {
    const id = obj.meta?.bangumi_id ||
      obj.bangumi_id;

    return /^[1-9]\d{0,9}$/.test(String(id || ""))
      ? String(id)
      : null;
  }

  function apiUrl(fn, id) {
    return CLOUD_URL.replace(/\/+$/, "") +
      "/functions/v1/" + fn +
      "?id=" + encodeURIComponent(id);
  }

  function exists(ref) {
    const a = anime.find(x => x === ref.parent);
    if (!a) return false;

    return ref.obj === a ||
      (a.children || []).some(c => c === ref.obj);
  }

  function buildInventory() {
    const rows = [];

    for (const a of anime) {
      rows.push({
        obj: a,
        parent: a,
        title: a.name,
        group: "主作品"
      });

      for (const child of a.children || []) {
        rows.push({
          obj: child,
          parent: a,
          title: child.name,
          group: "子作品 · " + a.name
        });
      }
    }

    // 已有私人封面、没有ID的作品都不参与批量缓存
    return rows.filter(ref =>
      !ref.obj.media?.coverPath &&
      bgmId(ref.obj)
    );
  }

  function setBusy(state) {
    busy = state;

    ["ccScan", "ccReset", "ccSelect",
     "ccUnselect", "ccStart"].forEach(id => {
      $(id).disabled = state;
    });

    $("ccStop").disabled = !state;

    $("ccItems")
      .querySelectorAll("input")
      .forEach(input => input.disabled = state);
  }

  async function request(url, timeout = 12000) {
    const controller = new AbortController();
    activeController = controller;

    const timer = setTimeout(
      () => controller.abort(), timeout
    );

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {Accept: "*/*"}
      });

      if (!response.ok) {
        let detail = "HTTP " + response.status;

        try {
          const data = await response.json();
          detail = [
            data.error,
            data.detail
          ].filter(Boolean).join("：") || detail;
        } catch (_) {}

        throw Error(detail);
      }

      return response;

    } catch(e) {
      if (e.name === "AbortError") {
        throw Error("请求中止或超时");
      }
      throw e;

    } finally {
      clearTimeout(timer);
      if (activeController === controller) {
        activeController = null;
      }
    }
  }

  function matches(ref, detail) {
    const title = normalize(ref.title);

    return !!title && [
      detail.name,
      detail.name_cn
    ].some(n => normalize(n) === title);
  }

  function render() {
    const box = $("ccItems");
    box.replaceChildren();

    const summary = document.createElement("p");
    summary.className = "muted";
    summary.textContent =
      "已扫描 " + cursor + "/" +
      inventory.length + " 个候选；" +
      "核对通过 " +
      candidates.filter(x => x.valid).length +
      " 个；已选择 " +
      candidates.filter(x => x.selected).length +
      " 个。";

    box.append(summary);

    for (const c of candidates) {
      const row = document.createElement("div");
      row.style.padding = "10px 0";
      row.style.borderBottom = "1px solid #8885";

      const label = document.createElement("label");
      label.style.display = "flex";
      label.style.alignItems = "flex-start";
      label.style.gap = "8px";

      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = c.selected;
      check.disabled = !c.valid || busy;

      check.onchange = () => {
        c.selected = check.checked;
        render();
      };

      const text = document.createElement("span");
      text.textContent =
        c.ref.group + " · " + c.ref.title +
        "\nBangumi：" +
        (c.detail
          ? (c.detail.name_cn || c.detail.name)
          : "未核实") +
        "（ID " + c.id + "）" +
        "\n" +
        (c.cached
          ? "✓ 已缓存"
          : c.valid
          ? "✓ 名称核对通过"
          : "⚠ " + c.reason);

      text.style.whiteSpace = "pre-line";
      label.append(check, text);
      row.append(label);

      if (c.detail && !c.cached) {
        const link = document.createElement("a");
        link.href = apiUrl("bangumi-cover", c.id);
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "查看封面图片";
        link.style.display = "inline-block";
        link.style.margin = "5px 0 0 26px";
        row.append(link);
      }

      box.append(row);
    }
  }

  async function scan() {
    if (busy || !ready()) {
      return status("请先登录并读取云端档案");
    }

    if (!inventory.length && cursor === 0) {
      inventory = buildInventory();
    }

    if (cursor >= inventory.length) {
      return status(
        "扫描已完成。没有ID的作品需先手动校正。"
      );
    }

    stopped = false;
    setBusy(true);

    const end = Math.min(
      inventory.length, cursor + BATCH
    );

    try {
      while (cursor < end && !stopped) {
        const ref = inventory[cursor++];
        const id = bgmId(ref.obj);

        status(
          "核实 " + cursor + "/" +
          inventory.length + "：" + ref.title
        );

        try {
          const response = await request(
            apiUrl("bangumi-detail", id)
          );

          const detail = await response.json();

          if (detail.type !== 2) {
            throw Error("不是动画条目");
          }

          const valid = matches(ref, detail);

          candidates.push({
            ref, id, detail, valid,
            selected: valid,
            cached: false,
            reason: valid
              ? ""
              : "名称不匹配，请先用封面校正功能确认"
          });

        } catch(e) {
          candidates.push({
            ref, id,
            detail: null,
            valid: false,
            selected: false,
            cached: false,
            reason: e.message
          });
        }

        render();
      }

      status(
        stopped
          ? "已停止扫描，保留现有候选"
          : "本批扫描完成，可检查候选或继续下一批"
      );

    } finally {
      setBusy(false);
      render();
    }
  }

  $("ccScan").onclick = scan;

  $("ccReset").onclick = () => {
    if (busy) return;

    inventory = [];
    candidates = [];
    cursor = 0;

    render();
    status("已清空扫描列表，云端文件没有变化");
  };

  $("ccSelect").onclick = () => {
    if (busy) return;

    candidates.forEach(c => {
      if (c.valid && !c.cached) {
        c.selected = true;
      }
    });

    render();
  };

  $("ccUnselect").onclick = () => {
    if (busy) return;

    candidates.forEach(c => {
      c.selected = false;
    });

    render();
  };

  $("ccStop").onclick = () => {
    stopped = true;
    activeController?.abort();
    status("正在停止，当前上传或保存完成后结束");
  };

  function ext(type) {
    return {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif"
    }[type];
  }

  async function getCoverBlob(id) {
    const response = await request(
      apiUrl("bangumi-cover", id), 25000
    );

    const type = (
      response.headers.get("content-type") || ""
    ).split(";")[0].trim().toLowerCase();

    if (!ext(type)) {
      throw Error("中转没有返回受支持的图片格式");
    }

    const blob = await response.blob();

    if (!blob.size || blob.size > MAX_BYTES) {
      throw Error("封面为空或超过5MB");
    }

    return {blob, type};
  }

  async function saveArchive() {
    save();

    if (typeof cloudSaveTimer !== "undefined") {
      clearTimeout(cloudSaveTimer);
    }

    await queueCloudWrite();
  }

  async function cacheOne(c) {
    const ref = c.ref;
    const obj = ref.obj;

    if (!exists(ref)) {
      throw Error("作品已在扫描后发生变化");
    }

    if (obj.media?.coverPath) {
      throw Error("已经存在私人封面，已跳过");
    }

    if (bgmId(obj) !== c.id) {
      throw Error("Bangumi ID 已变化，请重新扫描");
    }

    const {blob, type} = await getCoverBlob(c.id);

    if (stopped) return;

    const path =
      cloudUser.id + "/covers/" +
      crypto.randomUUID() + "." + ext(type);

    const {error: uploadError} =
      await cloudClient.storage
        .from(BUCKET)
        .upload(path, blob, {
          contentType: type,
          upsert: false
        });

    if (uploadError) throw uploadError;

    // 核实私人文件可生成签名访问链接
    const {data: signed, error: signError} =
      await cloudClient.storage
        .from(BUCKET)
        .createSignedUrl(path, 3600);

    if (signError || !signed?.signedUrl) {
      throw signError ||
        Error("上传成功，但私人文件不可访问");
    }

    obj.media = obj.media || {};
    obj.media.coverPath = path;

    // 同时记录封面原始来源
    obj.media.coverSource = "Bangumi";
    obj.media.coverBangumiId = c.id;

    // 每完成一张封面就保存一次云端档案
    await saveArchive();

    c.cached = true;
    c.selected = false;
  }

  $("ccStart").onclick = async () => {
    if (busy || !ready()) {
      return status("请先登录并确认云端已同步");
    }

    const selected = candidates.filter(c =>
      c.selected && c.valid && !c.cached
    );

    if (!selected.length) {
      return status("请先扫描并勾选要缓存的封面");
    }

    const preview = selected.slice(0, 8)
      .map(c => "• " + c.ref.title)
      .join("\n");

    if (!confirm(
      "确认缓存 " + selected.length +
      " 张封面到私人Storage？\n\n" +
      preview +
      (selected.length > 8
        ? "\n……其余候选也将处理"
        : "") +
      "\n\n已有私人封面不会覆盖。"
    )) return;

    try {
      localStorage.setItem(
        "animeAtlasBeforeCoverCache_" + Date.now(),
        JSON.stringify(anime)
      );
    } catch(e) {
      return status(
        "创建本地备份失败，已取消：" + e.message
      );
    }

    stopped = false;
    setBusy(true);

    let success = 0;
    let failed = 0;
    const failures = [];

    try {
      for (let i = 0; i < selected.length; i++) {
        if (stopped) break;

        const c = selected[i];

        status(
          "缓存 " + (i + 1) + "/" +
          selected.length + "：" + c.ref.title
        );

        try {
          await cacheOne(c);
          success++;
        } catch(e) {
          failed++;

          failures.push(
            c.ref.title + "：" + e.message
          );

          // 如果文件已上传，但云端档案保存失败，
          // 立即停止，防止产生更多不一致记录。
          if (c.ref.obj.media?.coverPath &&
              !c.cached) {
            stopped = true;
          }
        }

        render();
      }

      // 更新当前媒体管理区域的封面预览
      const kind = $("mediaKind");
      const target = kind?.value === "anime"
        ? $("mediaAnime")
        : $("mediaItem");

      target?.dispatchEvent(new Event("change"));

      status(
        "批量缓存结束：成功 " + success +
        " 张，失败 " + failed +
        " 张。" +
        (stopped ? " 已停止。" : "") +
        (failures.length
          ? "\n失败原因：" +
            failures.slice(0, 3).join("；")
          : "")
      );

    } finally {
      setBusy(false);
      render();
    }
  };

  render();
  status("点击扫描，先检查候选再缓存。");

  console.log(
    "ANIME ATLAS Safe Cover Cache v1 loaded"
  );
})();
