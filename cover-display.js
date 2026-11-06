
/*
 ANIME ATLAS - Cover Display v1

 首页作品与子作品封面
 私人Storage优先
 自动折叠批量缓存工具
 不修改anime数据
*/
(() => {
  "use strict";

  const main = document.querySelector("main");
  if (!main || typeof anime === "undefined") return;

  if (window.__atlasCoverDisplay) return;
  window.__atlasCoverDisplay = true;

  const BUCKET = "anime-media";
  const EXCLUDE = [
    "#manageTools",
    "#animeAutoV2",
    "#smartImportPanel",
    "#atlasQuickTools",
    "#atlasMediaTools"
  ].join(",");

  // 记录临时签名地址，避免反复请求Storage
  const signedCache = new Map();
  const pending = new Map();

  function normalized(value) {
    return String(value || "")
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function bangumiId(obj) {
    const id =
      obj?.meta?.bangumi_id ||
      obj?.bangumi_id;

    return /^[1-9]\d{0,9}$/.test(
      String(id || "")
    ) ? String(id) : "";
  }

  function proxyCover(id) {
    if (!id || typeof CLOUD_URL === "undefined") {
      return "";
    }

    return CLOUD_URL.replace(/\/+$/, "") +
      "/functions/v1/bangumi-cover?id=" +
      encodeURIComponent(id);
  }

  function publicCover(obj) {
    const id = bangumiId(obj);

    // 已验证可用的Bangumi封面中转优先
    if (id) return proxyCover(id);

    const url = obj?.coverUrl;

    if (typeof url !== "string") return "";

    try {
      const u = new URL(url);
      return u.protocol === "https:" ? u.href : "";
    } catch {
      return "";
    }
  }

  async function privateCover(path) {
    if (!path) return "";

    if (
      typeof cloudClient === "undefined" ||
      typeof cloudUser === "undefined" ||
      !cloudUser?.id
    ) {
      throw Error("尚未登录云端");
    }

    // 不读取其他用户目录
    if (!path.startsWith(cloudUser.id + "/")) {
      throw Error("封面不属于当前账户");
    }

    const key = cloudUser.id + "|" + path;
    const cached = signedCache.get(key);

    if (
      cached &&
      cached.expires > Date.now()
    ) {
      return cached.url;
    }

    if (pending.has(key)) {
      return pending.get(key);
    }

    const task = (async () => {
      const {data, error} = await cloudClient.storage
        .from(BUCKET)
        .createSignedUrl(path, 3600);

      if (error) throw error;

      if (!data?.signedUrl) {
        throw Error("未获得封面访问地址");
      }

      signedCache.set(key, {
        url: data.signedUrl,
        // 在真实失效之前重新签名
        expires: Date.now() + 45 * 60 * 1000
      });

      return data.signedUrl;
    })();

    pending.set(key, task);

    try {
      return await task;
    } finally {
      pending.delete(key);
    }
  }

  function recordsByTitle() {
    const result = new Map();
    const duplicates = new Set();

    function add(obj, type) {
      const name = normalized(obj?.name);
      if (!name) return;

      // 同名作品不自动猜测对应哪张封面
      if (result.has(name)) {
        duplicates.add(name);
      } else {
        result.set(name, {obj, type});
      }
    }

    for (const a of anime) {
      add(a, "anime");

      for (const c of a.children || []) {
        add(c, "child");
      }
    }

    for (const name of duplicates) {
      result.delete(name);
    }

    return result;
  }

  function matchingTitleElements(map) {
    const matches = [];

    const root = main.querySelectorAll(
      "h1,h2,h3,h4,h5,span,strong,b,p,div,a"
    );

    for (const el of root) {
      if (el.closest(EXCLUDE)) continue;
      if (el.closest(".atlas-display-cover")) continue;
      if (el.children.length > 0) continue;

      const text = normalized(el.textContent);

      if (map.has(text)) {
        matches.push({
          el,
          record: map.get(text)
        });
      }
    }

    return matches;
  }

  function findCard(titleEl) {
    const selectors = [
      ".anime-card",
      ".anime-item",
      ".work-card",
      ".work-item",
      ".subwork-card",
      ".subwork-item",
      ".card"
    ].join(",");

    let card = titleEl.closest(selectors);

    // 如果旧页面没有统一卡片class，
    // 使用标题的紧邻容器
    if (!card || card === main) {
      card = titleEl.parentElement;
    }

    if (!card || card === main) return null;
    if (card.closest(EXCLUDE)) return null;

    // 避免把整页或整组动漫当作单张卡片
    if (card.textContent.length > 500) {
      card = titleEl.parentElement;
    }

    return card && card !== main ? card : null;
  }

  function createImage(record) {
    const img = document.createElement("img");

    img.className = "atlas-display-cover";
    img.alt = record.obj.name + " 封面";
    img.loading = "lazy";
    img.decoding = "async";

    img.style.width =
      record.type === "anime" ? "78px" : "58px";

    img.style.height =
      record.type === "anime" ? "106px" : "80px";

    img.style.objectFit = "cover";
    img.style.borderRadius = "8px";
    img.style.float = "left";
    img.style.margin = "0 12px 8px 0";
    img.style.background = "#8882";
    img.style.flexShrink = "0";

    img.dataset.atlasRecordId =
      String(record.obj.id || record.obj.name);

    return img;
  }

  async function loadImage(img, record) {
    const obj = record.obj;
    const privatePath = obj.media?.coverPath;
    const fallback = publicCover(obj);

    // 标题在界面重绘后可能已被移除
    if (!img.isConnected) return;

    if (privatePath) {
      try {
        const url = await privateCover(privatePath);

        if (!img.isConnected) return;

        img.onerror = () => {
          img.onerror = null;

          if (fallback) {
            img.src = fallback;
          } else {
            img.remove();
          }
        };

        img.src = url;
        return;

      } catch (e) {
        console.warn(
          "私人封面获取失败：",
          obj.name, e.message
        );
      }
    }

    if (fallback) {
      img.onerror = () => img.remove();
      img.src = fallback;
    } else {
      // 没有封面就保持原卡片布局
      img.remove();
    }
  }

  let observer = null;

  function decorate() {
    if (typeof anime === "undefined") return;

    const map = recordsByTitle();
    const matches = matchingTitleElements(map);

    for (const {el, record} of matches) {
      const card = findCard(el);
      if (!card) continue;

      // 相同卡片只加一张图
if (el.dataset.atlasCoverApplied === "1") {
  continue;
}

el.dataset.atlasCoverApplied = "1";

      if (
        !record.obj.media?.coverPath &&
        !publicCover(record.obj)
      ) continue;

      const img = createImage(record);

      // 加在标题旁边，不改变原卡片的点击事件
      el.before(img);

      observer?.observe(img);

      if (!observer) {
        loadImage(img, record);
      } else {
        // 将数据关联到图片，等待滚动可见后加载
        imageRecords.set(img, record);
      }
    }
  }

  const imageRecords = new WeakMap();

  // 只给进入屏幕附近的封面签名，
  // 避免一次请求数十张私人图片
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          observer.unobserve(entry.target);

          const record = imageRecords.get(
            entry.target
          );

          if (record) {
            loadImage(entry.target, record);
          }
        }
      },
      {rootMargin: "300px"}
    );
  }

  // 收起批量缓存区，仍可随时展开
  function collapseCache() {
    const cache = document.getElementById(
      "atlasCoverCache"
    );

    if (!cache || cache.closest("details")) return;

    const details = document.createElement("details");
    details.id = "atlasCoverCacheFold";
    details.style.marginTop = "12px";

    const summary = document.createElement("summary");
    summary.textContent =
      "🖼️ 批量封面缓存（点击展开）";
    summary.style.cursor = "pointer";
    summary.style.padding = "12px 4px";
    summary.style.fontWeight = "600";

    cache.before(details);
    details.append(summary, cache);
  }

  let timer = null;

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      collapseCache();
      decorate();
    }, 180);
  }

  // 云端登录、列表重绘、打开详情后刷新封面
  const mutation = new MutationObserver(schedule);

  mutation.observe(main, {
    childList: true,
    subtree: true
  });

  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) schedule();
    }
  );

  window.addEventListener("focus", schedule);

  collapseCache();
  decorate();

  console.log(
    "ANIME ATLAS 首页/子作品封面显示模块已加载"
  );
})();
