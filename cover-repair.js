
/*
 ANIME ATLAS - Bangumi Cover Repair v1
 核实作品资料、纠正错误ID、检查封面
 不覆盖私人Storage图片
*/
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const host = $("atlasMediaTools");
  if (!host || $("coverRepairPanel")) return;

  const currentAnime = () => {
    const i = $("mediaAnime").value;
    return i === "" ? null : anime[Number(i)];
  };

  const currentObject = () => {
    const a = currentAnime();
    if (!a) return null;

    const kind = $("mediaKind").value;
    if (kind === "anime") return a;

    const i = $("mediaItem").value;
    if (i === "") return null;

    return kind === "child"
      ? a.children?.[Number(i)]
      : a.songs?.[Number(i)];
  };

  const norm = s => String(s || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　:：!！·・\-—_。]/g, "");

  const repair = document.createElement("div");
  repair.id = "coverRepairPanel";
  repair.style.padding = "12px 0";
  repair.innerHTML = `
    <h4>🔎 Bangumi 封面校正</h4>
    <p class="muted">
      如果匹配错误，可重新搜索并指定正确动画。
    </p>
    <input id="coverSearchText"
      placeholder="输入作品中文名或日文名">
    <div class="controls">
      <button id="coverSearchBtn" class="secondary">
        搜索并选择正确封面
      </button>
      <button id="coverCheckBtn" class="secondary">
        检查当前封面来源
      </button>
    </div>
    <div id="coverCandidates"></div>
    <p id="coverDiagnosis" class="muted"></p>
  `;

  $("mediaCoverPreview").before(repair);

  const msg = s => {
    $("coverDiagnosis").textContent = s;
  };

  let running = false;
  let selectionVersion = 0;

  const selectedId = () =>
    currentObject()?.id;

  function isCurrent(obj, version) {
    return version === selectionVersion &&
      currentObject() === obj;
  }

  function getBangumiId(obj) {
    return obj?.meta?.bangumi_id ||
      obj?.bangumi_id || null;
  }

  function currentName(obj) {
    return obj?.name || obj?.title || "";
  }

  function refreshCover() {
    // 触发原媒体模块重新读取封面
    const event = new Event("change");

    if ($("mediaKind").value === "anime") {
      $("mediaAnime").dispatchEvent(event);
    } else {
      $("mediaItem").dispatchEvent(event);
    }
  }

  function setBusy(state) {
    running = state;
    $("coverSearchBtn").disabled = state;
    $("coverCheckBtn").disabled = state;
    $("mediaAutoCover").disabled = state;
  }

  async function getJSON(url, timeout = 10000) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(), timeout
    );

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(
          "HTTP " + response.status +
          " " + response.statusText
        );
      }

      return await response.json();

    } catch (e) {
      if (e.name === "AbortError") {
        throw new Error("请求超过10秒");
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  function cleanImageUrl(raw) {
    if (!raw || typeof raw !== "string") {
      return "";
    }

    try {
      const u = new URL(raw);
      if (
        !["http:", "https:"].includes(u.protocol)
      ) return "";

      // Bangumi官方图片资料可能返回http
      u.protocol = "https:";

      if (
        u.hostname !== "lain.bgm.tv" &&
        u.hostname !== "api.bgm.tv"
      ) return "";

      if (
        u.pathname.includes("no_icon_subject")
      ) return "";

      return u.href;
    } catch (_) {
      return "";
    }
  }

  function imageSource(detail) {
    const images = detail.images || {};

    return cleanImageUrl(
      images.large ||
      images.common ||
      images.medium ||
      images.grid ||
      ""
    );
  }

  
async function loadDetail(id) {
  if (!/^[1-9]\d*$/.test(String(id))) {
    throw new Error("无效的Bangumi数字ID");
  }

  const endpoint =
    CLOUD_URL.replace(/\/+$/, "") +
    "/functions/v1/bangumi-detail?id=" +
    encodeURIComponent(String(id));

  let detail;

  try {
    // 浏览器等待时间略长于服务端9秒超时
    detail = await getJSON(endpoint, 13000);
  } catch (e) {
    throw new Error(
      "作品详情获取失败：" + e.message
    );
  }

  if (detail.type !== 2) {
    throw new Error(
      "Bangumi ID " + id +
      " 对应的不是动画，而是其他类型条目"
    );
  }

  return detail;
}


  function testImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      let finished = false;

      const timer = setTimeout(() => {
        if (finished) return;
        finished = true;
        image.src = "";
        reject(new Error(
          "图片CDN加载超过8秒"
        ));
      }, 8000);

      image.onload = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve(image);
      };

      image.onerror = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        reject(new Error(
          "图片CDN请求失败，可能是网络、403或404"
        ));
      };

      image.referrerPolicy = "no-referrer";
      image.src = url;
    });
  }

  

async function verify(id) {
  msg("① 正在核实作品详情...");

  const detail = await loadDetail(id);

  const original = imageSource(detail);

  if (!original) {
    throw new Error(
      "Bangumi作品详情正常，但没有真实封面"
    );
  }

  msg(
    "② 已找到《" +
    (detail.name_cn || detail.name) +
    "》，正在通过Supabase读取封面..."
  );

  const url =
    CLOUD_URL.replace(/\/+$/, "") +
    "/functions/v1/bangumi-cover?id=" +
    encodeURIComponent(String(id));

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    24000
  );

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });

    if (!response.ok) {
      let reason = "HTTP " + response.status;

      try {
        const data = await response.json();
        reason = [
          data.error,
          data.detail
        ].filter(Boolean).join("：");
      } catch (_) {}

      throw new Error(reason);
    }

    const type = response.headers.get(
      "content-type"
    ) || "";

    if (!type.startsWith("image/")) {
      throw new Error(
        "中转返回的内容不是图片"
      );
    }

    // 验证返回的数据确实能够解码为图片
    const blob = await response.blob();
    const local = URL.createObjectURL(blob);

    try {
      await testImage(local);
    } finally {
      URL.revokeObjectURL(local);
    }

    msg("③ 封面核实完成，等待确认保存");

    // 保存中转地址，而不是不可访问的CDN地址
    return {detail, url};

  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(
        "图片中转超过24秒，已停止查询"
      );
    }
    throw new Error(
      "图片中转核实失败：" + e.message
    );
  } finally {
    clearTimeout(timer);
  }
}


  async function saveSelection(obj, result) {
    if (
      typeof cloudUser === "undefined" ||
      !cloudUser ||
      !cloudSyncEnabled
    ) {
      throw new Error("请先登录云端档案");
    }

    const before = structuredClone(obj);

    try {
      const {detail, url} = result;

      if (obj.meta) {
        obj.meta.bangumi_id = detail.id;
      } else {
        obj.bangumi_id = detail.id;
      }

      // 保存经过核实的真实图片地址
      obj.coverUrl = url;

      // 保留原始私人图片路径
      // obj.media.coverPath 不作修改

      save();

      if (typeof cloudSaveTimer !== "undefined") {
        clearTimeout(cloudSaveTimer);
      }

      await queueCloudWrite();

    } catch (e) {
      // 保存失败时恢复当前内存数据
      for (const key of Object.keys(obj)) {
        delete obj[key];
      }
      Object.assign(obj, before);
      throw e;
    }
  }

  async function applyCandidate(obj, id) {
    if (running) return;

    const version = ++selectionVersion;
    setBusy(true);
    msg("正在核实Bangumi ID " + id + "...");

    try {
      const result = await verify(id);

      if (!isCurrent(obj, version)) {
        return msg("已切换作品，取消本次应用");
      }

      const detail = result.detail;

      const accepted = confirm(
        "请确认正确的动画：\n\n" +
        "你收藏的作品：" + currentName(obj) +
        "\nBangumi中文名：" +
          (detail.name_cn || "无") +
        "\nBangumi原名：" + detail.name +
        "\nBangumi ID：" + detail.id +
        "\n\n确认绑定此封面吗？"
      );

      if (!accepted) {
        return msg("已取消封面绑定");
      }

      await saveSelection(obj, result);

      refreshCover();
      $("coverCandidates").replaceChildren();

      msg(
        "✓ 已核实并保存封面：" +
        (detail.name_cn || detail.name) +
        "（ID " + detail.id + "）"
      );

    } catch (e) {
      msg("封面核实失败：" + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function search() {
    if (running) return;

    const obj = currentObject();

    if (!obj || $("mediaKind").value === "song") {
      return msg(
        "请选择主作品或子作品，再搜索封面"
      );
    }

    const q = $("coverSearchText").value.trim() ||
      currentName(obj);

    if (!q) {
      return msg("请先输入搜索名称");
    }

    setBusy(true);
    $("coverCandidates").replaceChildren();
    msg("正在搜索Bangumi：" + q);

    try {
      const endpoint = CLOUD_URL.replace(
        /\/+$/, ""
      ) + "/functions/v1/bangumi-search?q=" +
        encodeURIComponent(q);

      const data = await getJSON(endpoint);

      const list = (data.data || [])
        .filter(x => x.id);

      if (!list.length) {
        msg("没有搜索结果，请换用日文名或简称");
        return;
      }

      for (const item of list) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary";
        button.style.display = "block";
        button.style.width = "100%";
        button.style.textAlign = "left";
        button.style.margin = "6px 0";

        button.textContent =
          (item.name_cn || item.name) +
          " / " + item.name +
          " · " + (item.date || "日期未知") +
          " · ID " + item.id;

        button.onclick = () =>
          applyCandidate(obj, item.id);

        $("coverCandidates").appendChild(button);
      }

      msg(
        "找到 " + list.length +
        " 个候选。请选择正确作品；" +
        "系统会再核实封面后才保存。"
      );

    } catch (e) {
      msg("Bangumi搜索失败：" + e.message);
    } finally {
      setBusy(false);
    }
  }

  $("coverSearchBtn").onclick = search;

  $("coverCheckBtn").onclick = async () => {
    if (running) return;

    const obj = currentObject();
    if (!obj || $("mediaKind").value === "song") {
      return msg("请先选择主作品或子作品");
    }

    const id = getBangumiId(obj);

    if (!id) {
      return msg(
        "当前作品没有Bangumi ID。" +
        "请使用搜索功能选择正确条目。"
      );
    }

    setBusy(true);

    try {
      msg("正在检查 ID " + id + "...");
      const result = await verify(id);

      msg(
        "✓ Bangumi接口及图片可访问。" +
        "\n当前ID：" + id +
        "\n实际对应：" +
        (result.detail.name_cn ||
          result.detail.name) +
        "\n如果不是你收藏的动画，请重新搜索。"
      );

    } catch (e) {
      msg(
        "封面检查失败（ID " +
        id + "）：" + e.message
      );
    } finally {
      setBusy(false);
    }
  };

  // 让旧按钮也执行新的核实流程
  $("mediaAutoCover").onclick = async () => {
    const obj = currentObject();

    if (!obj || $("mediaKind").value === "song") {
      return msg("请先选择主作品或子作品");
    }

    const id = getBangumiId(obj);

    if (id) {
      await applyCandidate(obj, id);
    } else {
      $("coverSearchText").value =
        currentName(obj);
      await search();
    }
  };

  // 旧的批量按钮会直接记录未经核实的重定向地址。
  // 暂时停用，避免再次引入错误封面。
  const batch = $("mediaBatchCover");
  if (batch) {
    batch.disabled = true;
    batch.title =
      "封面核实版暂时停用批量猜测，" +
      "请逐部确认后绑定";
    batch.textContent =
      "批量封面（待安全升级）";
  }

  function selectionChanged() {
    ++selectionVersion;
    $("coverCandidates").replaceChildren();
    $("coverDiagnosis").textContent = "";

    const obj = currentObject();
    $("coverSearchText").value =
      obj && $("mediaKind").value !== "song"
        ? currentName(obj)
        : "";
  }

  ["mediaAnime", "mediaKind", "mediaItem"]
    .forEach(id => {
      $(id).addEventListener(
        "change", selectionChanged
      );
    });

  selectionChanged();

  console.log(
    "ANIME ATLAS Bangumi Cover Repair v1 loaded"
  );
})();
