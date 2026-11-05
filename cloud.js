
/*
 * ANIME ATLAS - Supabase cloud sync
 * 仅填写 Project URL 和 Publishable Key
 */

const CLOUD_URL = "https://refyyjtwbmsnksccnmea.supabase.co";
const CLOUD_KEY = "sb_publishable_nE6j2J5Kdnz_n7dlgWqauQ_BrBN7dr5";

const cloudClient = window.supabase.createClient(
  CLOUD_URL,
  CLOUD_KEY
);

let cloudUser = null;
let cloudSyncEnabled = false;
let cloudSaveTimer = null;
let cloudSaveQueue = Promise.resolve();

const cloudBox = document.createElement("section");
cloudBox.className = "panel";
cloudBox.innerHTML = `
  <h2>☁ 云端账户与同步</h2>
  <p id="cloudStatus" class="muted">
    正在检查登录状态...
  </p>

  <div id="cloudLogin">
    <label>邮箱</label>
    <input id="cloudEmail"
      type="email" autocomplete="email"
      placeholder="输入邮箱">

    <label>密码</label>
    <input id="cloudPassword"
      type="password"
      autocomplete="current-password"
      placeholder="至少6位，建议使用强密码">

    <div class="controls">
      <button id="cloudSignUp">注册</button>
      <button id="cloudSignIn">登录</button>
    </div>
  </div>

  <div id="cloudAccount" class="hidden">
    <p id="cloudAccountName"></p>
    <p class="muted">
      首次登录请选择数据方向。
      上传和下载都不会删除浏览器备份。
    </p>

    <div class="controls">
      <button id="cloudUpload">
        ↑ 上传本地档案
      </button>
      <button id="cloudDownload">
        ↓ 读取云端档案
      </button>
      <button id="cloudSignOut" class="secondary">
        退出登录
      </button>
    </div>

    <p id="cloudMode" class="muted">
      尚未开启自动同步
    </p>
  </div>
`;

document.querySelector("main").prepend(cloudBox);

const ce = id => document.getElementById(id);

function cloudStatus(text) {
  ce("cloudStatus").textContent = text;
}

function cloudDisplay(user) {
  cloudUser = user || null;

  ce("cloudLogin").classList.toggle(
    "hidden", !!cloudUser
  );

  ce("cloudAccount").classList.toggle(
    "hidden", !cloudUser
  );

  if (cloudUser) {
    ce("cloudAccountName").textContent =
      "已登录：" + cloudUser.email;

    cloudStatus("云端账户已连接");

  } else {
    cloudSyncEnabled = false;
    ce("cloudMode").textContent =
      "尚未开启自动同步";

    cloudStatus("请注册或登录云端账户");
  }
}

function cloudEnableSync() {
  cloudSyncEnabled = true;
  ce("cloudMode").textContent =
    "✓ 当前页面已开启自动云端保存";
}

async function cloudRegister() {
  const email = ce("cloudEmail").value.trim();
  const password = ce("cloudPassword").value;

  if (!email || password.length < 6) {
    cloudStatus("请输入邮箱和至少6位的密码");
    return;
  }

  cloudStatus("正在注册...");

  const { error } = await cloudClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo:
        window.location.origin +
        window.location.pathname
    }
  });

  cloudStatus(error
    ? "注册失败：" + error.message
    : "注册请求已提交。请查看验证邮件；验证后返回网站登录。"
  );
}

async function cloudLogin() {
  const email = ce("cloudEmail").value.trim();
  const password = ce("cloudPassword").value;

  cloudStatus("正在登录...");

  const { error } =
    await cloudClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    cloudStatus("登录失败：" + error.message);
    return;
  }

  const { data } = await cloudClient.auth.getUser();
  cloudDisplay(data.user);
}

async function cloudLogout() {
  cloudSyncEnabled = false;

  const { error } =
    await cloudClient.auth.signOut();

  if (error) {
    cloudStatus(error.message);
    return;
  }

  cloudDisplay(null);
}

// 保存当前本地动漫档案到云端
async function cloudWrite() {
  if (!cloudUser) {
    throw new Error("请先登录");
  }

  const payload = {
    user_id: cloudUser.id,
    data: {
      anime: JSON.parse(JSON.stringify(anime))
    }
  };

  const { error } = await cloudClient
    .from("anime_archives")
    .upsert(payload, {
      onConflict: "user_id"
    });

  if (error) throw error;
}

function queueCloudWrite() {
  cloudSaveQueue = cloudSaveQueue
    .catch(() => {})
    .then(() => cloudWrite());

  return cloudSaveQueue;
}

// 首次上传前检查云端是否已有数据
async function cloudUpload() {
  if (!cloudUser) return;

  cloudStatus("正在检查云端档案...");

  const { data, error } = await cloudClient
    .from("anime_archives")
    .select("updated_at")
    .eq("user_id", cloudUser.id)
    .maybeSingle();

  if (error) {
    cloudStatus("检查失败：" + error.message);
    return;
  }

  if (data && !confirm(
    "云端已有档案！继续上传会覆盖云端版本。" +
    "建议先读取云端档案并确认差异。确定覆盖吗？"
  )) {
    cloudStatus("已取消覆盖");
    return;
  }

  try {
    cloudStatus("正在上传...");

    await queueCloudWrite();
    cloudEnableSync();

    cloudStatus("✓ 本地动漫档案已上传云端");
  } catch (err) {
    cloudStatus("上传失败：" + err.message);
  }
}

// 将云端档案读取到浏览器
async function cloudDownload() {
  if (!cloudUser) return;

  cloudStatus("正在读取云端档案...");

  const { data, error } = await cloudClient
    .from("anime_archives")
    .select("data,updated_at")
    .eq("user_id", cloudUser.id)
    .maybeSingle();

  if (error) {
    cloudStatus("读取失败：" + error.message);
    return;
  }

  if (!data) {
    cloudStatus(
      "云端还没有档案，请先点击上传本地档案"
    );
    return;
  }

  if (!Array.isArray(data.data?.anime)) {
    cloudStatus("云端数据格式不正确，已停止");
    return;
  }

  if (!confirm(
    "读取云端将替换当前页面显示的本地档案。" +
    "建议先点击下方【复制数据备份】保存本地数据。" +
    "确定继续吗？"
  )) {
    cloudStatus("已取消读取");
    return;
  }

  cloudSyncEnabled = false;

  anime = data.data.anime;

  localStorage.setItem(
    "animeAtlasData",
    JSON.stringify(anime)
  );

  showPage("library");
  renderAnime();
  stats();

  cloudEnableSync();
  cloudStatus("✓ 云端档案已读取到当前设备");
}

// 原网站每次保存时，同步更新云端
const originalAnimeSave = window.save;

window.save = function () {
  originalAnimeSave();

  if (!cloudSyncEnabled || !cloudUser) return;

  clearTimeout(cloudSaveTimer);

  cloudSaveTimer = setTimeout(async () => {
    try {
      cloudStatus("正在自动保存到云端...");
      await queueCloudWrite();
      cloudStatus("✓ 已自动保存到云端");
    } catch (err) {
      cloudStatus(
        "云端保存失败，本地仍保留：" +
        err.message
      );
    }
  }, 800);
};

ce("cloudSignUp").onclick = cloudRegister;
ce("cloudSignIn").onclick = cloudLogin;
ce("cloudSignOut").onclick = cloudLogout;
ce("cloudUpload").onclick = cloudUpload;
ce("cloudDownload").onclick = cloudDownload;

cloudClient.auth.onAuthStateChange(
  (_event, session) => {
    cloudDisplay(session?.user || null);
  }
);

cloudClient.auth.getUser().then(
  ({ data, error }) => {
    if (error) {
      cloudStatus(
        "登录状态检查失败：" + error.message
      );
      return;
    }

    cloudDisplay(data.user);
  }
);
