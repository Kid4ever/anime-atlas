
/*
 ANIME ATLAS - 作品与音乐增强模块
 适用于之前建立的 index.html + cloud.js
 不删除旧数据，不自动替换评级
*/
(function () {
  "use strict";

  const grades = [
    "TOP1","TOP6","TOP20","S","A","B","C","D"
  ];

  const host = document.getElementById("detailRating");
  if (!host || typeof anime === "undefined") {
    console.error("ANIME ATLAS 主程序未加载");
    return;
  }

  // 为详情页建立增强控制面板
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML = `
    <h3>📚 子作品管理</h3>
    <p class="muted">
      默认继承系列评级，可以独立修改
    </p>
    <label>当前子作品</label>
    <select id="subworkSelect"></select>
    <label>子作品独立评级</label>
    <select id="subworkGrade">
      <option value="">继承主系列评级</option>
      ${grades.map(g =>
        '<option value="' + g + '">' + g + '</option>'
      ).join("")}
    </select>
    <div class="controls">
      <button id="addSubwork">＋ 新增子作品</button>
      <button id="renameSubwork" class="secondary">
        修改名称
      </button>
    </div>
    <h3>🎵 音乐档案管理</h3>
    <p class="muted">
      在下方歌曲列表中可修改BV号和所属子作品
    </p>
    <button id="importSongs" class="secondary">
      ＋ 导入首批扩充曲目
    </button>
    <p id="upgradeStatus" class="muted"></p>
  `;
  host.parentElement.after(panel);

  const $ = id => document.getElementById(id);
  const status = text => {
    $("upgradeStatus").textContent = text;
  };

  function current() {
    return anime[selected];
  }

  function ensureChildren() {
    const a = current();
    if (!Array.isArray(a.children)) a.children = [];
    return a.children;
  }

  function renderSubworks() {
    const a = current();
    const children = ensureChildren();
    const sel = $("subworkSelect");

    sel.innerHTML = "";

    const base = document.createElement("option");
    base.value = "";
    base.textContent = "整个系列：" + a.name;
    sel.appendChild(base);

    children.forEach(child => {
      const opt = document.createElement("option");
      opt.value = child.id;
      opt.textContent = child.name;
      sel.appendChild(opt);
    });

    sel.value = "";
    $("subworkGrade").value = "";
    $("subworkGrade").disabled = true;
  }

  $("subworkSelect").onchange = function () {
    const child = ensureChildren().find(
      x => x.id === this.value
    );

    $("subworkGrade").disabled = !child;
    $("subworkGrade").value = child?.rating || "";
  };

  $("subworkGrade").onchange = function () {
    const id = $("subworkSelect").value;
    const child = ensureChildren().find(x => x.id === id);
    if (!child) return;

    child.rating = this.value || null;
    save();
    status(
      "已保存：" + child.name + " · " +
      (child.rating || "继承 " + current().rating)
    );
  };

  $("addSubwork").onclick = function () {
    const name = prompt(
      "输入子作品名称，例如：火影忍者 疾风传"
    );
    if (!name?.trim()) return;

    const children = ensureChildren();
    if (children.some(x => x.name === name.trim())) {
      alert("这个子作品已经存在");
      return;
    }

    const child = {
      id: "sub-" + crypto.randomUUID(),
      name: name.trim(),
      rating: null
    };

    children.push(child);
    save();
    renderSubworks();
    $("subworkSelect").value = child.id;
    $("subworkSelect").dispatchEvent(
      new Event("change")
    );
    status("子作品已添加并保存");
  };

  $("renameSubwork").onclick = function () {
    const child = ensureChildren().find(
      x => x.id === $("subworkSelect").value
    );
    if (!child) {
      alert("请先选择具体子作品");
      return;
    }

    const name = prompt("修改子作品名称", child.name);
    if (!name?.trim()) return;

    child.name = name.trim();
    save();
    renderSubworks();
    $("subworkSelect").value = child.id;
    $("subworkSelect").dispatchEvent(
      new Event("change")
    );
  };

  // B站BV号与完整视频网址互相转换
  function parseBV(value) {
    const raw = value.trim();
    if (!raw) return "";

    const match = raw.match(
      /^BV[0-9A-Za-z]{10}$/
    );
    if (match) return raw;

    try {
      const url = new URL(raw);
      if (
        url.protocol !== "https:" ||
        !["www.bilibili.com",
          "m.bilibili.com"].includes(url.hostname)
      ) return null;

      const found = url.pathname.match(
        /^\/video\/(BV[0-9A-Za-z]{10})\/?$/
      );
      return found ? found[1] : null;
    } catch (_) {
      return null;
    }
  }

  function editBV(song) {
    const value = prompt(
      "填写B站BV号或完整视频网址；留空则使用搜索",
      song.bv || ""
    );
    if (value === null) return;

    const bv = parseBV(value);
    if (bv === null) {
      alert("请输入有效的BV号或bilibili.com视频网址");
      return;
    }

    song.bv = bv;
    save();
    renderSongs();
    status(bv ? "BV号已保存" : "已切换为B站搜索");
  }

  function editSongSubwork(song) {
    const children = ensureChildren();

    const choices = [
      "0. 整个系列",
      ...children.map((c,i) =>
        (i+1) + ". " + c.name
      )
    ];

    const answer = prompt(
      "输入歌曲所属子作品编号：\n" +
      choices.join("\n"),
      "0"
    );

    if (answer === null) return;

    const num = Number(answer);
    if (
      !Number.isInteger(num) ||
      num < 0 ||
      num > children.length
    ) {
      alert("编号无效");
      return;
    }

    song.childId = num === 0
      ? null
      : children[num-1].id;

    save();
    renderSongs();
    status("歌曲归属已保存");
  }

  // 保留原有爱心与播放逻辑，增强歌曲编辑入口
  const originalRenderSongs = window.renderSongs;

  window.renderSongs = function () {
    originalRenderSongs();

    const a = current();
    const list = $("songList");
    const rows = list.querySelectorAll(".song");

    rows.forEach((row,i) => {
      const song = a.songs[i];
      if (!song) return;

      const child = ensureChildren().find(
        x => x.id === song.childId
      );

      const info = row.querySelector(".info");
      if (!info) return;

      const sub = document.createElement("div");
      sub.className = "muted";
      sub.style.fontSize = "12px";
      sub.textContent = child
        ? "所属：" + child.name
        : "所属：整个系列";
      info.appendChild(sub);

      const edit = document.createElement("button");
      edit.className = "secondary";
      edit.textContent = "编辑BV号";
      edit.onclick = () => editBV(song);

      const assign = document.createElement("button");
      assign.className = "secondary";
      assign.textContent = "设置归属";
      assign.onclick = () => editSongSubwork(song);

      const tools = document.createElement("div");
      tools.className = "controls";
      tools.append(edit,assign);
      row.appendChild(tools);
    });
  };

  // 切换动漫后刷新子作品列表
  const originalOpenAnime = window.openAnime;

  window.openAnime = function (index) {
    originalOpenAnime(index);
    renderSubworks();
    status("");
  };

  // 新增歌曲时自动关联当前选中的子作品
  const originalAddSong = window.addSong;

  window.addSong = function () {
    const a = current();
    const before = a.songs.length;
    const childId = $("subworkSelect").value || null;

    originalAddSong();

    if (a.songs.length > before) {
      const song = a.songs[a.songs.length-1];
      song.childId = childId;
      save();
      renderSongs();
    }
  };

  // 首批扩充音乐：保留原曲与收藏记录，去重追加
  const additions = [
    [0,"R★O★C★K★S","HOUND DOG","OP"],
    [0,"悲しみをやさしさに","little by little","OP"],
    [0,"青春狂騒曲","サンボマスター","OP"],
    [0,"Hero's Come Back!!","nobodyknows+","OP"],
    [0,"ホタルノヒカリ","いきものがかり","OP"],
    [0,"透明だった世界","秦基博","OP"],
    [0,"DIVER","NICO Touches the Walls","OP"],
    [0,"カラノココロ","Anly","OP"],
    [0,"Wind","Akeboshi","ED"],

    [1,"アルミナ","ナイトメア","ED"],
    [1,"What's up, people?!","MAXIMUM THE HORMONE","OP"],
    [1,"絶望ビリー","MAXIMUM THE HORMONE","ED"],

    [2,"刻司ル十二ノ盟約","ファンタズム","ED"],
    [2,"ファティマ","いとうかなこ","OP"],
    [2,"LAST GAME","Zwei","ED"],
    [2,"Gate of Steiner","阿保剛","OST"],

    [3,"運命のルーレット廻して","ZARD","OP"],
    [3,"Secret of my heart","倉木麻衣","ED"],
    [3,"美しい鰭","スピッツ","剧场版"],
    [3,"相思相愛","aiko","剧场版"],

    [4,"QUESTION","3年E組うた担","OP"],
    [4,"バイバイ YESTERDAY","3年E組うた担","OP"],
    [4,"旅立ちのうた","3年E組","插入曲"],

    [5,"DAN DAN 心魅かれてく","FIELD OF VIEW","OP"],
    [5,"限界突破×サバイバー","氷川きよし","OP"],
    [5,"ロマンティックあげるよ","橋本潮","ED"],

    [6,"最Ψ最好調！","でんぱ組.inc","OP"],
    [6,"Ψです I LIKE YOU","でんぱ組.inc","ED"],

    [7,"DADDY! DADDY! DO!","鈴木雅之","OP"],
    [7,"GIRI GIRI","鈴木雅之","OP"],
    [7,"My Nonfiction","白銀御行＆藤原千花","特殊ED"],

    [8,"木漏れ日のエール","東海帝王＆目白麦昆","ED"],
    [8,"winning the soul","Machico","插入曲"],

    [9,"to the beginning","Kalafina","OP"],
    [9,"MEMORIA","藍井エイル","ED"],
    [9,"満天","Kalafina","特殊ED"],

    [10,"Dream of Life","伊藤祥平","OP"],
    [10,"夢スケッチ","JAM Project","ED"],

    [11,"君が好きだと叫びたい","BAAD","OP"],
    [11,"マイ フレンド","ZARD","ED"],
    [11,"第ゼロ感","10-FEET","剧场版"],

    [12,"99.9","MOB CHOIR","OP"],
    [12,"1","MOB CHOIR","OP"],
    [12,"コバルト","MOB CHOIR","ED"],

    [14,"ヒカリアレ","BURNOUT SYNDROMES","OP"],
    [14,"PHOENIX","BURNOUT SYNDROMES","OP"],
    [14,"オレンジ","SPYAIR","剧场版"],

    [15,"TOMORROW","Machico","OP"],
    [15,"Growing Up","Machico","OP"],

    [16,"STYX HELIX","MYTH & ROID","ED"],
    [16,"Stay Alive","高橋李依","ED"],
    [16,"Wishing","水瀬いのり","插入曲"],

    [17,"Together","あきよしふみえ","OP"],
    [17,"XY&Z","松本梨香","OP"],

    [18,"brave heart","宮﨑歩","插入曲"],
    [18,"The Biggest Dreamer","和田光司","OP"],
    [18,"Break up!","宮﨑歩","插入曲"],

    [19,"だんご大家族","茶太","ED"],
    [19,"TORCH","Lia","ED"],

    [20,"オラシオン","茅野愛衣","ED"],
    [21,"Brave Song","多田葵","ED"],
    [22,"I Really Want to Stay at Your House",
      "Rosa Walton & Hallie Coggins","插入曲"],
    [23,"喜劇","星野源","ED"],
    [24,"エウレカベイビー","麻生夏子","ED"],
    [25,"happy endings","花澤香菜","ED"],
    [26,"オレンジ","7!!","ED"],
    [27,"ファイター","BUMP OF CHICKEN","ED"],
    [28,"割れたリンゴ","種田梨沙","ED"],
    [29,"美しき残酷な世界","日笠陽子","ED"],
    [30,"青い栞","Galileo Galilei","OP"],
    [31,"Fluorite Eye's Song","Vivy","插入曲"],
    [32,"シュガーレス・キッス","三森すずこ","ED"],
    [33,"Fight on!","Luce Twinkle Wink☆","ED"],
    [34,"サムライハート (Some Like It Hot!!)","SPYAIR","ED"],
    [35,"名前のない怪物","EGOIST","ED"],
    [36,"Magia","Kalafina","ED"],
    [37,"Blood teller","飛蘭","ED"]
  ];

  $("importSongs").onclick = function () {
    if (!cloudSyncEnabled || !cloudUser) {
      alert(
        "请先登录并确认云端自动同步已开启，" +
        "避免导入后无法保存。"
      );
      return;
    }

    if (!confirm(
      "将补充一批音乐曲目。已有歌曲和爱心不会删除。" +
      "确定导入吗？"
    )) return;

    let count = 0;

    additions.forEach(([index,title,artist,type]) => {
      const a = anime[index];
      if (!a || !Array.isArray(a.songs)) return;

      const exists = a.songs.some(s =>
        s.title.trim().toLowerCase() ===
        title.toLowerCase()
      );

      if (exists) return;

      a.songs.push({
        id:"import-" + crypto.randomUUID(),
        title,artist,type,
        bv:"",
        liked:false,
        childId:null
      });
      count++;
    });

    save();
    renderSongs();
    stats();
    status("新增 " + count + " 首歌曲，正在同步云端");
  };

  renderSubworks();
  console.log("ANIME ATLAS 升级模块已加载");
})();
