
/*
 ANIME ATLAS RADIO v1
 全站悬浮播放器
 使用已有 song.media.audioPath
 不修改档案或上传文件
*/
(() => {
  "use strict";

  if (document.getElementById("atlasRadio")) return;

  const style = document.createElement("style");
  style.textContent = `
    #atlasRadio {
      position: fixed;
      right: 16px;
      bottom: 18px;
      width: min(330px, calc(100vw - 24px));
      z-index: 9999;
      background: #171b28;
      color: #f7f8ff;
      border: 1px solid #ffffff30;
      border-radius: 16px;
      box-shadow: 0 10px 36px #0008;
      font-family: system-ui, sans-serif;
      overflow: hidden;
    }
    #atlasRadio * { box-sizing: border-box; }
    #arHead {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: #ffffff0d;
      cursor: grab;
      touch-action: none;
      user-select: none;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .6px;
    }
    #arHead:active { cursor: grabbing; }
    #arHead button, #arControls button {
      background: #ffffff16;
      color: inherit;
      border: 0;
      border-radius: 9px;
      cursor: pointer;
    }
    #arHead button { padding: 5px 10px; }
    #arBody { padding: 12px; }
    #arTitle {
      font-weight: 700;
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #arSubtitle {
      font-size: 12px;
      color: #abb4cc;
      margin: 5px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #arControls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      margin: 12px 0;
    }
    #arControls button {
      min-width: 38px;
      min-height: 37px;
      padding: 7px;
      font-size: 17px;
    }
    #arPlay {
      background: #6965f5 !important;
      font-size: 20px !important;
      min-width: 48px !important;
    }
    #arSeek {
      width: 100%;
      accent-color: #a5a1ff;
      cursor: pointer;
    }
    #arBottom {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 11px;
      color: #abb4cc;
    }
    #arHint {
      font-size: 11px;
      color: #d5c99d;
      margin-top: 8px;
      min-height: 14px;
    }
    #atlasRadio button:focus-visible {
      outline: 2px solid #a5a1ff;
    }
  `;
  document.head.append(style);

  const root = document.createElement("aside");
  root.id = "atlasRadio";
  root.setAttribute("aria-label", "ANIME ATLAS 音乐播放器");

  root.innerHTML = `
    <div id="arHead">
      <span>♫ ANIME ATLAS RADIO · 拖动移动</span>
      <button id="arMin" title="收起或展开">−</button>
    </div>
    <div id="arBody">
      <div id="arTitle">正在读取云端曲库…</div>
      <div id="arSubtitle">仅播放已上传音频的歌曲</div>

      <div id="arControls">
        <button id="arMode" title="切换播放模式">🔀</button>
        <button id="arPrev" title="上一首">⏮</button>
        <button id="arPlay" title="播放或暂停">▶</button>
        <button id="arNext" title="下一首">⏭</button>
      </div>

      <input id="arSeek" type="range"
        min="0" max="1000" value="0"
        aria-label="歌曲播放进度">

      <div id="arBottom">
        <span id="arTime">0:00 / 0:00</span>
        <span id="arModeText">随机播放</span>
      </div>

      <div id="arHint"></div>
    </div>
  `;

  document.body.append(root);

  const $ = id => document.getElementById(id);
  const audio = new Audio();
  audio.preload = "metadata";

  let playlist = [];
  let current = -1;
  let mode = "random";
  let generation = 0;
  let initialized = false;
  let minimized = false;

  function hint(text) {
    $("arHint").textContent = text;
  }

  function ready() {
    return (
      typeof anime !== "undefined" &&
      Array.isArray(anime) &&
      typeof cloudUser !== "undefined" &&
      !!cloudUser?.id &&
      typeof cloudClient !== "undefined"
    );
  }

  function buildPlaylist() {
    if (!ready()) return [];

    const songs = [];

    anime.forEach(work => {
      (work.songs || []).forEach(song => {
        const path = song.media?.audioPath;

        if (!path || typeof path !== "string") {
          return;
        }

        // 只播放本账号的私人文件
        if (!path.startsWith(cloudUser.id + "/")) {
          return;
        }

        const child = (work.children || []).find(
          c => String(c.id) === String(song.childId)
        );

        songs.push({
          song,
          path,
          work: work.name,
          child: child?.name || ""
        });
      });
    });

    return songs;
  }

  function randomIndex(exclude = -1) {
    if (!playlist.length) return -1;
    if (playlist.length === 1) return 0;

    let index;
    do {
      index = Math.floor(
        Math.random() * playlist.length
      );
    } while (index === exclude);

    return index;
  }

  function showTrack() {
    const item = playlist[current];

    $("arTitle").textContent = item
      ? item.song.title || "未命名曲目"
      : "暂无可播放歌曲";

    $("arSubtitle").textContent = item
      ? [
          item.song.artist || "演唱者待核实",
          item.child || item.work
        ].join(" · ")
      : "请先为歌曲上传音频";

    document.title = item
      ? "♫ " + item.song.title + " | ANIME ATLAS"
      : "ANIME ATLAS";
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";

    const s = Math.floor(seconds);
    return Math.floor(s / 60) + ":" +
      String(s % 60).padStart(2, "0");
  }

  function updateProgress() {
    const duration = audio.duration || 0;
    const pos = audio.currentTime || 0;

    $("arSeek").value =
      duration && Number.isFinite(duration)
        ? String(Math.round(pos / duration * 1000))
        : "0";

    $("arTime").textContent =
      formatTime(pos) + " / " + formatTime(duration);
  }

  async function loadTrack(index, autoPlay = true) {
    if (!ready()) {
      hint("请先登录云端账户");
      return;
    }

    if (!playlist[index]) {
      hint("还没有可播放的音频");
      return;
    }

    current = index;
    const item = playlist[current];
    const seq = ++generation;

    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    $("arPlay").textContent = "▶";
    $("arSeek").value = "0";

    showTrack();
    hint("正在读取私人音频…");

    try {
      const {data, error} = await cloudClient.storage
        .from("anime-media")
        .createSignedUrl(item.path, 3600);

      // 防止快速切歌时旧请求覆盖新歌曲
      if (seq !== generation) return;

      if (error) throw error;
      if (!data?.signedUrl) {
        throw Error("无法生成音频访问链接");
      }

      audio.src = data.signedUrl;
      audio.load();

      if (autoPlay) {
        try {
          await audio.play();
          if (seq !== generation) return;
          hint("");
        } catch (e) {
          if (seq !== generation) return;

          $("arPlay").textContent = "▶";

          hint(
            e.name === "NotAllowedError"
              ? "浏览器禁止自动播放，请点击 ▶ 开始"
              : "播放失败：" + e.message
          );
        }
      } else {
        hint("已选曲，点击 ▶ 播放");
      }
    } catch (e) {
      if (seq === generation) {
        hint("读取失败：" + e.message);
      }
    }
  }

  async function togglePlay() {
    if (!playlist.length && ready()) {
      playlist = buildPlaylist();
    }

    if (!playlist.length) {
      hint(
        ready()
          ? "曲库没有已关联音频的歌曲"
          : "请先登录并读取云端档案"
      );
      return;
    }

    if (audio.src && !audio.paused) {
      audio.pause();
      return;
    }

    if (!audio.src) {
      await loadTrack(
        current >= 0 ? current : randomIndex()
      );
      return;
    }

    try {
      await audio.play();
      hint("");
    } catch (e) {
      hint("无法播放：" + e.message);
    }
  }

  function next() {
    if (!playlist.length) {
      playlist = buildPlaylist();
    }
    if (!playlist.length) return;

    const index = mode === "random"
      ? randomIndex(current)
      : (current + 1) % playlist.length;

    loadTrack(index);
  }

  function previous() {
    if (!playlist.length) return;

    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const index = mode === "random"
      ? randomIndex(current)
      : (current - 1 + playlist.length) %
        playlist.length;

    loadTrack(index);
  }

  function cycleMode() {
    const modes = ["random", "ordered", "repeat"];
    mode = modes[
      (modes.indexOf(mode) + 1) % modes.length
    ];

    $("arMode").textContent = {
      random: "🔀",
      ordered: "☷",
      repeat: "🔂"
    }[mode];

    $("arModeText").textContent = {
      random: "随机播放",
      ordered: "顺序播放",
      repeat: "单曲循环"
    }[mode];

    hint("模式：" + $("arModeText").textContent);
  }

  $("arPlay").onclick = togglePlay;
  $("arNext").onclick = next;
  $("arPrev").onclick = previous;
  $("arMode").onclick = cycleMode;

  $("arSeek").oninput = () => {
    if (
      Number.isFinite(audio.duration) &&
      audio.duration > 0
    ) {
      audio.currentTime =
        Number($("arSeek").value) / 1000 *
        audio.duration;
    }
  };

  audio.addEventListener(
    "timeupdate", updateProgress
  );

  audio.addEventListener(
    "durationchange", updateProgress
  );

  audio.addEventListener("play", () => {
    $("arPlay").textContent = "⏸";

    // 避免详情页播放器和悬浮播放器同时播放
    document.querySelectorAll("audio").forEach(a => {
      if (a !== audio) a.pause();
    });
  });

  audio.addEventListener("pause", () => {
    $("arPlay").textContent = "▶";
  });

  audio.addEventListener("ended", () => {
    if (mode === "repeat") {
      audio.currentTime = 0;
      audio.play().catch(() => {
        hint("点击 ▶ 继续播放");
      });
    } else {
      next();
    }
  });

  audio.addEventListener("error", () => {
    if (audio.src) {
      hint("音频加载失败，可点击下一首重试");
    }
  });

  // 收起与展开：只保留一条迷你标题栏
  $("arMin").onclick = () => {
    minimized = !minimized;
    $("arBody").hidden = minimized;
    $("arMin").textContent =
      minimized ? "+" : "−";
  };

  // 拖动标题栏，手机和电脑通用
  const head = $("arHead");
  let dragging = null;

  head.addEventListener("pointerdown", e => {
    if (e.target.closest("button")) return;

    const rect = root.getBoundingClientRect();

    dragging = {
      x: e.clientX,
      y: e.clientY,
      left: rect.left,
      top: rect.top
    };

    head.setPointerCapture(e.pointerId);
  });

  head.addEventListener("pointermove", e => {
    if (!dragging) return;

    const x = Math.max(
      0,
      Math.min(
        window.innerWidth - root.offsetWidth,
        dragging.left + e.clientX - dragging.x
      )
    );

    const y = Math.max(
      0,
      Math.min(
        window.innerHeight - root.offsetHeight,
        dragging.top + e.clientY - dragging.y
      )
    );

    root.style.left = x + "px";
    root.style.top = y + "px";
    root.style.right = "auto";
    root.style.bottom = "auto";
  });

  function finishDrag() {
    if (!dragging) return;
    dragging = null;

    try {
      localStorage.setItem(
        "atlasRadioPosition",
        JSON.stringify({
          x: root.offsetLeft,
          y: root.offsetTop
        })
      );
    } catch (_) {}
  }

  head.addEventListener("pointerup", finishDrag);
  head.addEventListener(
    "pointercancel", finishDrag
  );

  // 恢复上次位置
  try {
    const saved = JSON.parse(
      localStorage.getItem("atlasRadioPosition")
    );

    if (
      Number.isFinite(saved?.x) &&
      Number.isFinite(saved?.y)
    ) {
      root.style.left =
        Math.max(0, Math.min(
          saved.x,
          window.innerWidth - root.offsetWidth
        )) + "px";

      root.style.top =
        Math.max(0, Math.min(
          saved.y,
          window.innerHeight - root.offsetHeight
        )) + "px";

      root.style.right = "auto";
      root.style.bottom = "auto";
    }
  } catch (_) {}

  // 登录并读取档案后，自动随机选曲并尝试播放
  function initialize() {
    if (initialized || !ready()) return;

    playlist = buildPlaylist();

    if (!playlist.length) {
      hint("尚未找到已上传的音乐");
      return;
    }

    initialized = true;

    loadTrack(randomIndex(), true);
  }

  // 兼容异步登录与云端档案读取
  const startup = setInterval(() => {
    initialize();

    if (initialized) {
      clearInterval(startup);
    }
  }, 1500);

  // 最多等待45秒，避免永久轮询
  setTimeout(() => {
    clearInterval(startup);

    if (!initialized) {
      hint("请登录云端后点击 ▶ 加载音乐");
    }
  }, 45000);

  console.log("ANIME ATLAS RADIO v1 loaded");
})();
