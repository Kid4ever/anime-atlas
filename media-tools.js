
/*
 ANIME ATLAS - Media Tools v1
 封面、音频、视频、外链
 使用 Supabase 私人 Storage
 不覆盖旧评级、歌曲、爱心和BV
*/
(() => {
  "use strict";

  const host = document.getElementById("manageTools");
  if (!host || typeof anime === "undefined") return;

  const BUCKET = "anime-media";
  const MAX_SIZE = 50 * 1024 * 1024;

  const formats = {
    cover: ["image/jpeg", "image/png", "image/webp"],
    audio: [
      "audio/mpeg", "audio/mp4", "audio/ogg",
      "audio/wav", "audio/webm"
    ],
    video: ["video/mp4", "video/webm"]
  };

  const box = document.createElement("section");
  box.id = "atlasMediaTools";
  box.innerHTML = `
    <h3>🖼️ 封面与媒体管理</h3>
    <p class="muted">
      给作品、子作品或歌曲添加文件和外链
    </p>

    <label>选择动漫</label>
    <select id="mediaAnime"></select>

    <label>管理对象</label>
    <select id="mediaKind">
      <option value="anime">整部作品</option>
      <option value="child">子作品 / 季 / 剧场版</option>
      <option value="song">歌曲</option>
    </select>

    <select id="mediaItem"></select>

    <div class="controls">
      <button id="mediaRefresh" class="secondary">
        ↻ 刷新列表
      </button>
      <button id="mediaAutoCover" class="secondary">
        ✨ 自动匹配当前封面
      </button>
      <button id="mediaBatchCover" class="secondary">
        批量补充已有ID的封面
      </button>
    </div>

    <div id="mediaCoverPreview"></div>

    <label>媒体类型</label>
    <select id="mediaType">
      <option value="cover">封面图片</option>
      <option value="audio">音频</option>
      <option value="video">视频</option>
    </select>

    <label>从设备选择文件</label>
    <input id="mediaFile" type="file">

    <div class="controls">
      <button id="mediaLocal" class="secondary">
        ▶ 仅在本设备预览
      </button>
      <button id="mediaUpload">
        ☁ 上传文件并同步
      </button>
    </div>

    <label>外部链接（https://）</label>
    <input id="mediaLink" type="url"
      placeholder="例如B站视频或音乐页面">

    <div class="controls">
      <button id="mediaSaveLink" class="secondary">
        保存外链
      </button>
      <button id="mediaOpenLink" class="secondary">
        打开外链
      </button>
      <button id="mediaPlayCloud" class="secondary">
        ▶ 播放已上传文件
      </button>
    </div>

    <div id="mediaPlayer"></div>
    <p id="mediaStatus" class="muted"></p>
  `;

  host.appendChild(box);

  const $ = id => document.getElementById(id);
  const info = text => {
    $("mediaStatus").textContent = text;
  };

  let busy = false;
  let localPreviewUrl = null;

  const normalize = text =>
    String(text || "").normalize("NFKC")
      .toLowerCase()
      .replace(/[\s　:：!！·・\-—_。]/g, "");

  function loginReady() {
    return typeof cloudUser !== "undefined" &&
      !!cloudUser &&
      typeof cloudSyncEnabled !== "undefined" &&
      cloudSyncEnabled &&
      typeof queueCloudWrite === "function";
  }

  function currentAnime() {
    const i = Number($("mediaAnime").value);
    return Number.isInteger(i) ? anime[i] : null;
  }

  function currentObject() {
    const a = currentAnime();
    if (!a) return null;

    const type = $("mediaKind").value;
    if (type === "anime") return a;

    const i = Number($("mediaItem").value);
    if ($("mediaItem").value === "") return null;

    if (type === "child") return a.children?.[i] || null;
    return a.songs?.[i] || null;
  }

  function refreshAnime() {
    const old = $("mediaAnime").value;
    $("mediaAnime").replaceChildren();

    anime.forEach((a, i) => {
      $("mediaAnime").add(new Option(a.name, String(i)));
    });

    if ([...$("mediaAnime").options]
        .some(o => o.value === old)) {
      $("mediaAnime").value = old;
    }

    refreshItems();
  }

  function refreshItems() {
    const a = currentAnime();
    const kind = $("mediaKind").value;
    const list = kind === "child"
      ? a?.children || []
      : kind === "song"
      ? a?.songs || []
      : [];

    $("mediaItem").replaceChildren();

    if (kind === "anime") {
      $("mediaItem").hidden = true;
    } else {
      $("mediaItem").hidden = false;
      list.forEach((item, i) => {
        $("mediaItem").add(
          new Option(
            kind === "song"
              ? item.title + " — " + (item.artist || "")
              : item.name,
            String(i)
          )
        );
      });
    }

    $("mediaAutoCover").disabled = kind === "song";
    updateView();
  }


function currentCover(obj) {
  if (!obj) return "";

  // 已保存的公开封面链接
  if (
    typeof obj.coverUrl === "string" &&
    /^https:\/\//i.test(obj.coverUrl)
  ) {
    return obj.coverUrl;
  }

  // 新版Bangumi资料ID
  const id =
    obj.meta?.bangumi_id ||
    obj.bangumi_id;

  if (!/^[1-9]\d*$/.test(String(id || ""))) {
    return "";
  }

  // 官方提供封面重定向接口
  return (
    "https://api.bgm.tv/v0/subjects/" +
    encodeURIComponent(String(id)) +
    "/image?type=large"
  );
}


  
let coverPreviewVersion = 0;

async function updateView() {
  const version = ++coverPreviewVersion;
  const obj = currentObject();
  const preview = $("mediaCoverPreview");

  preview.replaceChildren();
  $("mediaPlayer").replaceChildren();
  $("mediaLink").value = obj?.externalUrl || "";

  if (!obj) {
    preview.textContent = "请先选择作品或子作品";
    return;
  }

  const img = document.createElement("img");
  img.alt = "动漫封面";
  img.style.width = "140px";
  img.style.maxWidth = "100%";
  img.style.aspectRatio = "3 / 4";
  img.style.objectFit = "cover";
  img.style.borderRadius = "10px";
  img.style.margin = "12px 0";

  const message = document.createElement("p");
  message.className = "muted";

  preview.append(img, message);

  // 优先显示自己上传的私人封面
  const privatePath = obj.media?.coverPath;

  if (privatePath) {
    try {
      if (
        typeof cloudUser === "undefined" ||
        !cloudUser
      ) {
        throw new Error("请先登录云端账户");
      }

      const {data, error} = await cloudClient.storage
        .from("anime-media")
        .createSignedUrl(privatePath, 3600);

      if (error) throw error;

      // 避免切换作品后显示上一部的封面
      if (version !== coverPreviewVersion) return;

      img.onload = () => {
        message.textContent = "私人云端封面";
      };

      img.onerror = () => {
        message.textContent =
          "私人封面加载失败，请检查Storage文件";
      };

      img.src = data.signedUrl;
      return;

    } catch (e) {
      if (version !== coverPreviewVersion) return;

      message.textContent =
        "读取私人封面失败：" + e.message;
    }
  }

  // 私人封面不存在或无法读取时，
  // 尝试显示Bangumi封面
  const cover = currentCover(obj);

  if (!cover) {
    img.remove();
    if (!privatePath) {
      message.textContent =
        "尚无封面，可点击自动匹配或上传图片";
    }
    return;
  }

  img.onload = () => {
    message.textContent = privatePath
      ? "私人封面不可用，现显示Bangumi封面"
      : "Bangumi封面";
  };

  img.onerror = () => {
    img.remove();
    message.textContent =
      "Bangumi封面加载失败。" +
      "可以尝试手动上传图片。";
  };

  img.src = cover;
}


  $("mediaAnime").onchange = refreshItems;
  $("mediaKind").onchange = refreshItems;
  $("mediaItem").onchange = updateView;
  $("mediaRefresh").onclick = refreshAnime;

  function selectedType() {
    const kind = $("mediaKind").value;
    const type = $("mediaType").value;

    if (kind === "song" && type === "cover") {
      throw new Error("歌曲请先选择音频或视频");
    }
    return type;
  }

  function fileKey(type) {
    return type === "cover"
      ? "coverPath"
      : type === "audio"
      ? "audioPath"
      : "videoPath";
  }

  function clearLocalPreview() {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      localPreviewUrl = null;
    }
  }

  function showMedia(url, type) {
    const target = $("mediaPlayer");
    target.replaceChildren();

    if (type === "cover") {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "封面";
      img.style.maxWidth = "240px";
      img.style.width = "100%";
      img.style.borderRadius = "10px";
      target.appendChild(img);
      return;
    }

    const player = document.createElement(
      type === "audio" ? "audio" : "video"
    );

    player.controls = true;
    player.preload = "metadata";
    player.src = url;
    player.style.width = "100%";

    if (type === "video") {
      player.playsInline = true;
      player.style.maxHeight = "360px";
    }

    target.appendChild(player);
  }

  function checkedFile() {
    const type = selectedType();
    const file = $("mediaFile").files?.[0];

    if (!file) {
      throw new Error("请先选择文件");
    }

    if (!formats[type].includes(file.type)) {
      throw new Error("该文件格式暂不支持：" + file.type);
    }

    if (file.size > MAX_SIZE) {
      throw new Error("文件不能超过50MB");
    }

    return {type, file};
  }

  $("mediaLocal").onclick = () => {
    try {
      const {type, file} = checkedFile();
      clearLocalPreview();
      localPreviewUrl = URL.createObjectURL(file);
      showMedia(localPreviewUrl, type);
      info("本地预览成功，尚未上传云端");
    } catch(e) {
      info(e.message);
    }
  };

  async function saveData() {
    save();
    clearTimeout(cloudSaveTimer);
    await queueCloudWrite();
  }

  $("mediaUpload").onclick = async () => {
    if (busy) return;

    const obj = currentObject();
    if (!obj) return info("请先选择作品或歌曲");
    if (!loginReady()) {
      return info("请先登录并读取云端档案");
    }

    let input;
    try {
      input = checkedFile();
    } catch(e) {
      return info(e.message);
    }

    busy = true;
    $("mediaUpload").disabled = true;

    try {
      const {type, file} = input;

      const extension = file.name
        .split(".").pop().toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      const path = cloudUser.id + "/" +
        crypto.randomUUID() + "." + extension;

      info("正在上传文件...");

      const {error} = await cloudClient.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false
        });

      if (error) throw error;

      // 只保存存储路径，不保存临时签名URL
      obj.media = obj.media || {};
      obj.media[fileKey(type)] = path;

      await saveData();

      info("✓ 文件已上传并保存到云端");
     renderLinkedSongs();
      await playSaved(obj, type);

    } catch(e) {
      info(
        "上传或保存失败：" + e.message +
        "。请检查云端状态后再重试。"
      );
    } finally {
      busy = false;
      $("mediaUpload").disabled = false;
    }
  };

  async function playSaved(obj, type) {
    const path = obj.media?.[fileKey(type)];

    if (!path) {
      throw new Error("当前对象尚未上传该类型文件");
    }

    const {data, error} = await cloudClient.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);

    if (error) throw error;
    clearLocalPreview();
    showMedia(data.signedUrl, type);

    info("已加载云端媒体，可在页面内播放或查看");
  }

  $("mediaPlayCloud").onclick = async () => {
    const obj = currentObject();
    if (!obj || !loginReady()) {
      return info("请先选择对象并登录");
    }

    try {
      await playSaved(obj, selectedType());
    } catch(e) {
      info(e.message);
    }
  };

  function safeLink(value) {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      throw new Error("只支持 https:// 开头的链接");
    }
    return url.href;
  }

  $("mediaSaveLink").onclick = async () => {
    const obj = currentObject();
    if (!obj || !loginReady()) {
      return info("请先选择对象并登录");
    }

    const old = obj.externalUrl || "";
    try {
      const value = $("mediaLink").value.trim();
      obj.externalUrl = value ? safeLink(value) : "";
      await saveData();
      info("✓ 外部链接已保存到云端");
    } catch(e) {
      obj.externalUrl = old;
      info("保存链接失败：" + e.message);
    }
  };

  $("mediaOpenLink").onclick = () => {
    try {
      const obj = currentObject();
      if (!obj?.externalUrl) {
        return info("当前对象还没有外部链接");
      }
      window.open(
        safeLink(obj.externalUrl),
        "_blank",
        "noopener,noreferrer"
      );
    } catch(e) {
      info(e.message);
    }
  };

  // 对已有Bangumi ID的作品直接启用封面
  // 没有ID的作品需要先匹配正确条目
  async function matchCover(obj) {
    if (!obj) throw new Error("没有选择作品");

    let id = obj.meta?.bangumi_id || obj.bangumi_id;

    if (!id) {
      const name = obj.name;
      const endpoint =
        CLOUD_URL.replace(/\/+$/, "") +
        "/functions/v1/bangumi-search?q=" +
        encodeURIComponent(name);

      const response = await fetch(endpoint);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "搜索失败");
      }

      const matches = (result.data || []).filter(x =>
        normalize(x.name) === normalize(name) ||
        normalize(x.name_cn) === normalize(name)
      );

      if (matches.length !== 1) {
        throw new Error(
          "没有唯一的精确匹配，请先在智能建档中确认作品ID"
        );
      }

      const found = matches[0];

      if (!confirm(
        "封面匹配结果：\n" +
        (found.name_cn || found.name) +
        "\n原名：" + found.name +
        "\n确认使用此作品的封面吗？"
      )) {
        return false;
      }

      id = found.id;

      if (obj.meta) {
        obj.meta.bangumi_id = id;
      } else {
        obj.bangumi_id = id;
      }
    }

    obj.coverUrl =
      "https://api.bgm.tv/v0/subjects/" +
      id + "/image?type=large";

    return true;
  }

  $("mediaAutoCover").onclick = async () => {
    const obj = currentObject();

    if (!obj || !loginReady()) {
      return info("请先选择作品并登录");
    }

    try {
      info("正在匹配封面...");
      if (await matchCover(obj)) {
        await saveData();
        updateView();
        info("✓ 封面已关联并保存云端");
      }
    } catch(e) {
      info("匹配失败：" + e.message);
    }
  };

  $("mediaBatchCover").onclick = async () => {
    if (busy || !loginReady()) {
      return info("请先登录并读取云端档案");
    }

    if (!confirm(
      "为已有Bangumi ID的作品和子作品补齐封面？" +
      "\n不会覆盖已上传的封面。"
    )) return;

    busy = true;
    $("mediaBatchCover").disabled = true;

    try {
      let count = 0;

      for (const a of anime) {
        for (const obj of [a, ...(a.children || [])]) {
          const id =
            obj.meta?.bangumi_id || obj.bangumi_id;

          if (!id || obj.media?.coverPath ||
              obj.coverUrl) continue;

          obj.coverUrl =
            "https://api.bgm.tv/v0/subjects/" +
            id + "/image?type=large";

          count++;
        }
      }

      await saveData();
      updateView();
      info("✓ 已补充 " + count + " 个封面关联");
    } catch(e) {
      info("批量关联失败：" + e.message);
    } finally {
      busy = false;
      $("mediaBatchCover").disabled = false;
    }
  };

  $("mediaType").onchange = () => {
    const type = $("mediaType").value;
    $("mediaFile").accept = formats[type].join(",");
  };

  $("mediaType").dispatchEvent(new Event("change"));
  refreshAnime();

/*
  歌曲与上传音频联动区
  直接使用现有 a.songs，不创建重复歌曲
*/
const linkedArea = document.createElement("details");
linkedArea.id = "atlasLinkedSongs";
linkedArea.style.marginTop = "16px";

const linkedTitle = document.createElement("summary");
linkedTitle.textContent = "🎵 音乐关联与播放";
linkedTitle.style.cursor = "pointer";
linkedTitle.style.padding = "12px 4px";
linkedTitle.style.fontWeight = "600";

const linkedList = document.createElement("div");
linkedList.id = "atlasLinkedSongList";

linkedArea.append(linkedTitle, linkedList);
box.appendChild(linkedArea);

function selectLinkedSong(index) {
  // 切换到这首歌的真实数据对象
  $("mediaKind").value = "song";
  refreshItems();

  $("mediaItem").value = String(index);
  updateView();

  $("mediaType").value = "audio";
  $("mediaType").dispatchEvent(
    new Event("change")
  );
}

function renderLinkedSongs() {
  const a = currentAnime();
  linkedList.replaceChildren();

  if (!a?.songs?.length) {
    linkedList.textContent =
      "当前动漫没有歌曲记录，请先补充OP/ED。";
    return;
  }

  const count = a.songs.filter(s =>
    !!s.media?.audioPath
  ).length;

  const summary = document.createElement("p");
  summary.className = "muted";
  summary.textContent =
    `共 ${a.songs.length} 首歌曲，` +
    `已关联音频 ${count} 首`;

  linkedList.appendChild(summary);

  a.songs.forEach((song, index) => {
    const row = document.createElement("div");
    row.style.padding = "10px 0";
    row.style.borderBottom = "1px solid #8885";

    const name = document.createElement("strong");
    name.textContent =
      song.title || "未命名歌曲";

    const detail = document.createElement("p");
    detail.className = "muted";
    detail.textContent =
      (song.artist || "歌手待核实") +
      " · " + (song.type || "音乐") +
      (song.media?.audioPath
        ? " · ✓ 已关联音频"
        : " · 尚未关联音频");

    const controls = document.createElement("div");
    controls.className = "controls";

    const upload = document.createElement("button");
    upload.type = "button";
    upload.className = "secondary";
    upload.textContent = song.media?.audioPath
      ? "更换音频"
      : "关联音频";

    upload.onclick = () => {
      selectLinkedSong(index);
      $("mediaFile").click();

      info(
        "已选中《" + song.title +
        "》。选择音频文件后，" +
        "点击上方「☁ 上传文件并同步」。"
      );
    };

    controls.appendChild(upload);

    if (song.media?.audioPath) {
      const play = document.createElement("button");
      play.type = "button";
      play.className = "secondary";
      play.textContent = "▶ 播放";

      play.onclick = async () => {
        try {
          if (!loginReady()) {
            throw Error("请先登录云端");
          }

          await playSaved(song, "audio");

          $("mediaPlayer").scrollIntoView({
            behavior: "smooth",
            block: "center"
          });

        } catch(e) {
          info("无法播放：" + e.message);
        }
      };

      controls.appendChild(play);
    }

    const link = document.createElement("button");
    link.type = "button";
    link.className = "secondary";
    link.textContent = song.externalUrl
      ? "↗ 打开外链"
      : "＋ 添加外链";

    link.onclick = () => {
      selectLinkedSong(index);

      if (song.externalUrl) {
        try {
          window.open(
            safeLink(song.externalUrl),
            "_blank",
            "noopener,noreferrer"
          );
        } catch(e) {
          info("链接无效：" + e.message);
        }
      } else {
        $("mediaLink").focus();
        info(
          "请在上方输入这首歌的外链，" +
          "然后点击「保存外链」。"
        );
      }
    };

    controls.appendChild(link);

    row.append(name, detail, controls);
    linkedList.appendChild(row);
  });
}

// 切换动漫时更新歌曲列表
$("mediaAnime").addEventListener(
  "change", renderLinkedSongs
);

// 刷新后更新歌曲列表
$("mediaRefresh").addEventListener(
  "click", renderLinkedSongs
);

renderLinkedSongs();

  console.log("ANIME ATLAS Media Tools v1 loaded");
})();
