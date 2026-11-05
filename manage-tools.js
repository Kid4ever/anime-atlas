
/*
 ANIME ATLAS - Cloud Recycle Bin v2

 删除前：先写入 Supabase 回收站
 删除后：再保存新的动漫档案
 恢复时：先保存档案，再移出回收站

 不自动清空回收站
*/
(() => {
  "use strict";

  if (
    typeof anime === "undefined" ||
    typeof cloudClient === "undefined"
  ) {
    console.error("ANIME ATLAS 主程序尚未加载");
    return;
  }

  const main = document.querySelector("main");
  if (!main) return;

  const panel = document.createElement("section");
  panel.className = "panel";
  panel.id = "manageTools";

  panel.innerHTML = `
    <h2>🗂️ 作品与音乐管理</h2>
    <p class="muted">
      删除前自动进入云端回收站，
      可以在电脑或手机恢复。
    </p>

    <label>选择动漫</label>
    <select id="manageAnime"></select>

    <label>选择歌曲</label>
    <select id="manageSong"></select>

    <div class="controls">
      <button id="deleteSong" class="secondary">
        🗑 移动歌曲到回收站
      </button>
      <button id="deleteAnime" class="secondary">
        🗑 移动整部作品到回收站
      </button>
      <button id="refreshManage" class="secondary">
        ↻ 刷新作品列表
      </button>
    </div>

    <h3>♻️ 云端回收站</h3>
    <p class="muted">
      保存已删除的作品和歌曲。
      不会自动清空。
    </p>

    <button id="refreshTrash" class="secondary">
      ↻ 查看云端回收站
    </button>

    <div id="trashItems"></div>
    <p id="manageStatus" class="muted"></p>
  `;

  main.prepend(panel);

  const $ = id => document.getElementById(id);
  const animeSelect = $("manageAnime");
  const songSelect = $("manageSong");

  let busy = false;
  let trashItems = [];

  const status = message => {
    $("manageStatus").textContent = message;
  };

  function signedIn() {
    if (
      typeof cloudUser === "undefined" ||
      !cloudUser ||
      !cloudSyncEnabled
    ) {
      status("请先登录并成功读取云端档案");
      return false;
    }

    if (typeof queueCloudWrite !== "function") {
      status("找不到云端保存功能");
      return false;
    }

    return true;
  }

  function selectedAnime() {
    const n = Number(animeSelect.value);
    return animeSelect.value !== "" &&
      Number.isInteger(n)
      ? anime[n] || null
      : null;
  }

  function selectedSong() {
    const a = selectedAnime();
    const n = Number(songSelect.value);

    return a &&
      songSelect.value !== "" &&
      Number.isInteger(n)
      ? a.songs?.[n] || null
      : null;
  }

  function setBusy(value) {
    busy = value;

    [
      "manageAnime",
      "manageSong",
      "deleteSong",
      "deleteAnime",
      "refreshManage",
      "refreshTrash"
    ].forEach(id => {
      $(id).disabled = value;
    });

    $("trashItems")
      .querySelectorAll("button")
      .forEach(button => {
        button.disabled = value;
      });
  }

  function refreshSongs() {
    const a = selectedAnime();
    const previous = songSelect.value;

    songSelect.replaceChildren();

    if (a?.songs?.length) {
      a.songs.forEach((s, i) => {
        songSelect.add(
          new Option(
            s.title +
              (s.artist ? " — " + s.artist : ""),
            String(i)
          )
        );
      });

      if ([...songSelect.options]
          .some(o => o.value === previous)) {
        songSelect.value = previous;
      }
    } else {
      songSelect.add(new Option("暂无歌曲", ""));
      songSelect.value = "";
    }

    $("deleteSong").disabled =
      busy || !selectedSong();

    $("deleteAnime").disabled =
      busy || !a;
  }

  function refreshAnime() {
    const previousId = selectedAnime()?.id;

    animeSelect.replaceChildren();

    anime.forEach((a, i) => {
      animeSelect.add(
        new Option(
          a.name + "（" + a.rating + "）",
          String(i)
        )
      );
    });

    if (!anime.length) {
      animeSelect.add(new Option("暂无动漫", ""));
      animeSelect.value = "";
    } else if (previousId != null) {
      const i = anime.findIndex(
        a => String(a.id) === String(previousId)
      );
      if (i >= 0) animeSelect.value = String(i);
    }

    refreshSongs();
  }

  animeSelect.onchange = refreshSongs;

  $("refreshManage").onclick = () => {
    if (busy) return;
    refreshAnime();
    status("作品列表已刷新");
  };

  function backup() {
    const key =
      "animeAtlasBeforeTrash_" + Date.now();

    localStorage.setItem(
      key,
      JSON.stringify(anime)
    );

    return key;
  }

  async function saveArchive() {
    // 继续使用原有的本地保存函数
    save();

    // 用确定完成的云端提交代替延迟提交
    if (typeof cloudSaveTimer !== "undefined") {
      clearTimeout(cloudSaveTimer);
    }

    await queueCloudWrite();

    if (typeof showPage === "function") {
      showPage("library");
    }

    renderAnime();
    stats();
  }

  async function addTrash(item) {
    const { error } = await cloudClient
      .from("anime_trash")
      .insert(item);

    if (error) throw error;
  }

  async function removeTrash(id) {
    const { data, error } = await cloudClient
      .from("anime_trash")
      .delete()
      .eq("id", id)
      .eq("user_id", cloudUser.id)
      .select("id");

    if (error) throw error;

    if (!data?.length) {
      throw new Error("回收站记录未成功移除");
    }
  }

  async function readTrash() {
    const { data, error } = await cloudClient
      .from("anime_trash")
      .select(
        "id,item_type,title,payload," +
        "parent_id,parent_name,original_index," +
        "deleted_at"
      )
      .eq("user_id", cloudUser.id)
      .order("deleted_at", {
        ascending: false
      })
      .limit(200);

    if (error) throw error;
    return data || [];
  }

  async function refreshTrash() {
    if (!signedIn()) return;

    trashItems = await readTrash();
    renderTrash();

    status(
      "云端回收站已更新，共 " +
      trashItems.length + " 条记录" +
      (trashItems.length === 200
        ? "（仅展示最新200条）"
        : "")
    );
  }

  $("refreshTrash").onclick = async () => {
    if (busy || !signedIn()) return;

    setBusy(true);
    try {
      await refreshTrash();
    } catch (e) {
      status("读取回收站失败：" + e.message);
    } finally {
      setBusy(false);
      refreshSongs();
    }
  };

  // 删除歌曲：云端回收站写入成功，才允许删除
  $("deleteSong").onclick = async () => {
    if (busy || !signedIn()) return;

    const a = selectedAnime();
    const song = selectedSong();
    if (!a || !song) return;

    const index = Number(songSelect.value);

    if (!confirm(
      "把歌曲移动到云端回收站？\n\n" +
      a.name + "\n" +
      song.title + " — " + (song.artist || "") +
      "\n\n之后可以恢复爱心和BV号。"
    )) return;

    try {
      backup();
    } catch (e) {
      status("本地备份失败，已取消：" + e.message);
      return;
    }

    setBusy(true);

    try {
      await addTrash({
        user_id: cloudUser.id,
        item_type: "song",
        title: song.title,
        parent_id: String(a.id),
        parent_name: a.name,
        original_index: index,
        payload: structuredClone(song)
      });

      // 只有回收站保存成功，才修改档案
      a.songs.splice(index, 1);

      await saveArchive();
      refreshAnime();
      await refreshTrash();

      status(
        "✓ 歌曲已移入回收站，并保存到云端"
      );

    } catch (e) {
      status(
        "操作未完整完成：" + e.message +
        "。请勿刷新，先检查本地及回收站。"
      );
    } finally {
      setBusy(false);
      refreshSongs();
    }
  };

  // 删除整部动漫：同时保留子作品及全部歌曲
  $("deleteAnime").onclick = async () => {
    if (busy || !signedIn()) return;

    const a = selectedAnime();
    if (!a) return;

    const answer = prompt(
      "将《" + a.name +
      "》及其所有子作品、歌曲移入回收站。" +
      "\n请输入完整作品名称确认："
    );

    if (answer !== a.name) {
      return status("名称不一致，已取消操作");
    }

    try {
      backup();
    } catch (e) {
      status("本地备份失败：" + e.message);
      return;
    }

    setBusy(true);

    try {
      const index = anime.indexOf(a);

      await addTrash({
        user_id: cloudUser.id,
        item_type: "anime",
        title: a.name,
        original_index: index,
        payload: structuredClone(a)
      });

      anime.splice(index, 1);

      await saveArchive();
      refreshAnime();
      await refreshTrash();

      status(
        "✓ 整部作品已移入云端回收站"
      );

    } catch (e) {
      status(
        "操作未完整完成：" + e.message +
        "。请勿刷新，先检查本地及回收站。"
      );
    } finally {
      setBusy(false);
      refreshSongs();
    }
  };

  // 从回收站恢复
  async function restore(item) {
    if (busy || !signedIn()) return;

    if (!confirm(
      "确认恢复？\n\n" + item.title
    )) return;

    let parent = null;

    if (item.item_type === "anime") {
      if (anime.some(a =>
        String(a.id) === String(item.payload?.id)
      )) {
        return status(
          "同ID作品已存在，已停止恢复以避免重复"
        );
      }
    } else {
      parent = anime.find(a =>
        String(a.id) === String(item.parent_id)
      );

      if (!parent) {
        return status(
          "找不到歌曲原来的动漫《" +
          item.parent_name +
          "》。请先恢复整部动漫。"
        );
      }

      if (parent.songs?.some(s =>
        String(s.id) === String(item.payload?.id)
      )) {
        return status(
          "歌曲已经存在，无需再次恢复"
        );
      }
    }

    try {
      backup();
    } catch (e) {
      return status(
        "恢复前备份失败：" + e.message
      );
    }

    setBusy(true);

    try {
      if (item.item_type === "anime") {
        const index = Math.max(
          0,
          Math.min(
            Number(item.original_index) || 0,
            anime.length
          )
        );

        anime.splice(
          index, 0, structuredClone(item.payload)
        );

      } else {
        if (!Array.isArray(parent.songs)) {
          parent.songs = [];
        }

        const index = Math.max(
          0,
          Math.min(
            Number(item.original_index) || 0,
            parent.songs.length
          )
        );

        parent.songs.splice(
          index, 0, structuredClone(item.payload)
        );
      }

      // 先确定原档案已成功恢复到云端
      await saveArchive();

      // 然后从回收站移除
      await removeTrash(item.id);

      refreshAnime();
      await refreshTrash();

      status(
        "✓ 已成功恢复：" + item.title
      );

    } catch (e) {
      status(
        "恢复未完整完成：" + e.message +
        "。请先检查作品是否已恢复，" +
        "不要反复点击。"
      );
    } finally {
      setBusy(false);
      refreshSongs();
    }
  }

  // 永久删除回收站单条记录
  async function permanentlyDelete(item) {
    if (busy || !signedIn()) return;

    const answer = prompt(
      "永久删除《" + item.title + "》？" +
      "\n此操作无法通过回收站恢复。" +
      "\n请输入「永久删除」确认："
    );

    if (answer !== "永久删除") {
      return status("已取消永久删除");
    }

    setBusy(true);

    try {
      await removeTrash(item.id);
      await refreshTrash();

      status("回收站记录已永久删除");

    } catch (e) {
      status("永久删除失败：" + e.message);
    } finally {
      setBusy(false);
      refreshSongs();
    }
  }

  function renderTrash() {
    const box = $("trashItems");
    box.replaceChildren();

    if (!trashItems.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "回收站为空";
      box.appendChild(p);
      return;
    }

    trashItems.forEach(item => {
      const row = document.createElement("div");
      row.style.borderBottom =
        "1px solid var(--border, #555)";
      row.style.padding = "12px 0";

      const name = document.createElement("strong");
      name.textContent =
        (item.item_type === "anime"
          ? "📚 作品 · "
          : "🎵 歌曲 · ") +
        item.title;

      const info = document.createElement("p");
      info.className = "muted";

      info.textContent =
        (item.parent_name
          ? "原所属：" + item.parent_name + " · "
          : "") +
        "删除于 " +
        new Date(item.deleted_at)
          .toLocaleString("zh-CN");

      const restoreButton =
        document.createElement("button");

      restoreButton.className = "secondary";
      restoreButton.textContent = "↩ 恢复";
      restoreButton.onclick = () => restore(item);

      const deleteButton =
        document.createElement("button");

      deleteButton.className = "secondary";
      deleteButton.textContent = "永久删除";
      deleteButton.style.marginLeft = "8px";
      deleteButton.onclick = () =>
        permanentlyDelete(item);

      row.append(
        name, info, restoreButton, deleteButton
      );

      box.appendChild(row);
    });
  }

  refreshAnime();

  // 页面打开后尝试读取回收站。
  // 如果尚未登录，用户登录后可手动刷新。
  if (
    typeof cloudUser !== "undefined" &&
    cloudUser &&
    cloudSyncEnabled
  ) {
    refreshTrash().catch(e => {
      status("回收站读取失败：" + e.message);
    });
  }

  console.log(
    "ANIME ATLAS 云端回收站 v2 已加载"
  );
})();
