
/*
 ANIME ATLAS - Manage Tools v1
 删除单首歌曲或整个动漫系列
 删除前创建本地备份
 等待 Supabase 确认保存
*/
(() => {
  "use strict";

  const main = document.querySelector("main");
  if (!main || typeof anime === "undefined") return;

  const panel = document.createElement("section");
  panel.className = "panel";
  panel.id = "manageTools";

  panel.innerHTML = `
    <h2>🗂️ 作品与音乐管理</h2>
    <p class="muted">
      删除前会备份当前档案。
      删除成功后会同步到Supabase及其他设备。
    </p>

    <label>选择动漫</label>
    <select id="manageAnime"></select>

    <label>选择歌曲</label>
    <select id="manageSong"></select>

    <div class="controls">
      <button id="deleteSong" class="secondary">
        🗑 删除选中歌曲
      </button>
      <button id="deleteAnime" class="secondary">
        🗑 删除整部作品
      </button>
    </div>

    <div class="controls">
      <button id="refreshManage" class="secondary">
        ↻ 刷新作品列表
      </button>
    </div>

    <p id="manageStatus" class="muted"></p>
  `;

  // 放在页面上方，方便访问
  main.prepend(panel);

  const $ = id => document.getElementById(id);

  const animeSelect = $("manageAnime");
  const songSelect = $("manageSong");
  const deleteSongButton = $("deleteSong");
  const deleteAnimeButton = $("deleteAnime");

  let busy = false;

  function status(text) {
    $("manageStatus").textContent = text;
  }

  function currentAnime() {
    const i = Number(animeSelect.value);

    if (!animeSelect.value ||
        !Number.isInteger(i)) {
      return null;
    }

    return anime[i] || null;
  }

  function currentSong() {
    const a = currentAnime();
    const i = Number(songSelect.value);

    if (!a ||
        !songSelect.value ||
        !Number.isInteger(i)) {
      return null;
    }

    return a.songs?.[i] || null;
  }

  function setBusy(value) {
    busy = value;
    animeSelect.disabled = value;
    songSelect.disabled = value;
    $("refreshManage").disabled = value;
    deleteSongButton.disabled = value;
    deleteAnimeButton.disabled = value;
  }

  function refreshSongs() {
    const a = currentAnime();

    songSelect.replaceChildren();

    if (!a?.songs?.length) {
      const option = new Option(
        "暂无歌曲", ""
      );
      songSelect.add(option);
      songSelect.value = "";
      deleteSongButton.disabled = true;
      return;
    }

    a.songs.forEach((song, i) => {
      songSelect.add(
        new Option(
          song.title +
          (song.artist
            ? " — " + song.artist
            : ""),
          String(i)
        )
      );
    });

    deleteSongButton.disabled = busy;
  }

  function refresh() {
    const previous = currentAnime();
    const previousId = previous?.id;

    animeSelect.replaceChildren();

    anime.forEach((a, i) => {
      animeSelect.add(
        new Option(
          a.name + "（" + a.rating + "）",
          String(i)
        )
      );
    });

    if (previousId != null) {
      const index = anime.findIndex(
        a => a.id === previousId
      );

      if (index >= 0) {
        animeSelect.value = String(index);
      }
    }

    if (!anime.length) {
      animeSelect.add(
        new Option("暂无动漫", "")
      );
      animeSelect.value = "";
    }

    deleteAnimeButton.disabled =
      busy || !anime.length;

    refreshSongs();
  }

  animeSelect.onchange = refreshSongs;

  $("refreshManage").onclick = () => {
    if (busy) return;
    refresh();
    status("列表已刷新");
  };

  function ready() {
    if (
      typeof cloudUser === "undefined" ||
      !cloudUser ||
      typeof cloudSyncEnabled === "undefined" ||
      !cloudSyncEnabled
    ) {
      status(
        "请先登录并确认云端档案已自动读取"
      );
      return false;
    }

    if (typeof queueCloudWrite !== "function") {
      status("未找到云端同步函数，已停止删除");
      return false;
    }

    return true;
  }

  function backup() {
    const key =
      "animeAtlasBeforeDelete_" + Date.now();

    // 备份失败时必须中止删除
    localStorage.setItem(
      key,
      JSON.stringify(anime)
    );

    return key;
  }

  async function saveDeletion() {
    // 本地保存
    save();

    // 清除本次save安排的延迟上传，
    // 改为等待一次明确的云端提交
    if (typeof cloudSaveTimer !== "undefined") {
      clearTimeout(cloudSaveTimer);
    }

    await queueCloudWrite();

    if (typeof showPage === "function") {
      showPage("library");
    }

    renderAnime();

    if (typeof stats === "function") {
      stats();
    }
  }

  deleteSongButton.onclick = async () => {
    if (busy || !ready()) return;

    const a = currentAnime();
    const song = currentSong();

    if (!a || !song) {
      status("请先选择要删除的歌曲");
      return;
    }

    const songIndex = Number(songSelect.value);

    if (!confirm(
      "确认删除这首歌曲？\n\n" +
      "动漫：" + a.name +
      "\n歌曲：" + song.title +
      "\n演唱者：" + (song.artist || "未知") +
      "\n\n删除后将同步到云端。"
    )) return;

    let backupKey;

    try {
      backupKey = backup();
    } catch (e) {
      status(
        "备份失败，已取消删除：" + e.message
      );
      return;
    }

    setBusy(true);

    try {
      a.songs.splice(songIndex, 1);

      await saveDeletion();

      refresh();
      status(
        "✓ 歌曲已删除并保存到云端。" +
        "本地备份：" + backupKey
      );

    } catch (e) {
      status(
        "云端保存未确认：" + e.message +
        "。请勿刷新或在其他设备修改。" +
        "备份：" + backupKey
      );
    } finally {
      setBusy(false);
      refresh();
    }
  };

  deleteAnimeButton.onclick = async () => {
    if (busy || !ready()) return;

    const a = currentAnime();
    if (!a) return;

    const count = a.songs?.length || 0;
    const children = a.children?.length || 0;

    const answer = prompt(
      "即将删除整部动漫：\n\n" +
      a.name +
      "\n关联子作品：" + children +
      "\n歌曲：" + count +
      "\n\n此操作会同步删除云端对应数据。" +
      "\n请输入完整动漫名称确认："
    );

    if (answer !== a.name) {
      status(
        "名称不一致，已取消删除"
      );
      return;
    }

    if (!confirm(
      "最后确认：真的删除《" +
      a.name + "》及全部关联音乐吗？"
    )) return;

    let backupKey;

    try {
      backupKey = backup();
    } catch (e) {
      status(
        "备份失败，已取消删除：" + e.message
      );
      return;
    }

    setBusy(true);

    try {
      const index = anime.findIndex(
        item => item === a
      );

      if (index < 0) {
        throw new Error("作品已不存在");
      }

      anime.splice(index, 1);

      await saveDeletion();

      refresh();
      status(
        "✓ 整部动漫已删除并保存到云端。" +
        "本地备份：" + backupKey
      );

    } catch (e) {
      status(
        "云端保存未确认：" + e.message +
        "。请勿刷新或在其他设备修改。" +
        "备份：" + backupKey
      );
    } finally {
      setBusy(false);
      refresh();
    }
  };

  refresh();

  console.log(
    "ANIME ATLAS 作品与音乐管理已启用"
  );
})();
