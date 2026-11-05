
/*
 ANIME ATLAS - NARUTO MUSIC PACK v1
 兼容 index.html + cloud.js + upgrade.js + catalog.js
 保留已有爱心、BV号、评级及个人新增歌曲
*/
(() => {
"use strict";

const original = "火影忍者 少年篇";
const shippuden = "火影忍者 疾风传";

const groups = [
{
 work:original, type:"OP",
 lines:`R★O★C★K★S|HOUND DOG
遥か彼方|ASIAN KUNG-FU GENERATION
悲しみをやさしさに|little by little
GO!!!|FLOW
青春狂騒曲|サンボマスター
ノーボーイ・ノークライ|STANCE PUNKS
波風サテライト|シュノーケル
Re:member|FLOW
ユラユラ|Hearts Grow`
},
{
 work:original, type:"ED",
 lines:`Wind|Akeboshi
ハルモニア|RYTHEM
ビバ★ロック ～japanese side～|ORANGE RANGE
ALIVE|雷鼓
今まで何度も|ザ・マスミサイル
流星|TiA
マウンテン・ア・ゴーゴー・ツー|キャプテンストライダム
はじめて君としゃべった|ガガガSP
失くした言葉|No Regret Life
スピード|アナログフィッシュ
そばにいるから|AMADORI
パレード|CHABA
Yellow Moon|Akeboshi
ピノキオ|オレスカバンド
シナリオ|SABOTEN`
},
{
 work:shippuden, type:"OP",
 lines:`Hero's Come Back!!|nobodyknows+
distance|LONG SHOT PARTY
ブルーバード|いきものがかり
CLOSER|井上ジョー
ホタルノヒカリ|いきものがかり
Sign|FLOW
透明だった世界|秦基博
DIVER|NICO Touches the Walls
ラヴァーズ|7!!
newsong|tacica
突撃ロック|ザ・クロマニヨンズ
Moshimo|ダイスケ
ニワカ雨ニモマケズ|NICO Touches the Walls
月の大きさ|乃木坂46
紅蓮|DOES
シルエット|KANA-BOON
風|山猿
LINE|スキマスイッチ
ブラッドサーキュレーター|ASIAN KUNG-FU GENERATION
カラノココロ|Anly`
},
{
 work:shippuden, type:"ED",
 lines:`流れ星 ～Shooting Star～|HOME MADE 家族
道 ～to you all|aluto
キミモノガタリ|little by little
目覚めろ！野性|MATCHY with QUESTION?
素直な虹|surface
Broken Youth|NICO Touches the Walls
Long Kiss Good Bye|HALCALI
バッチコイ！！！|デブパレード
深呼吸|SUPER BEAVER
My ANSWER|SEAMO
おまえだったんだ|氣志團
For You|AZU
自転車|オレスカバンド
うたかた花火|supercell
You can do it!!|DOMINO
真夜中のオーケストラ|Aqua Timez
FREEDOM|HOME MADE 家族
欲望を叫べ！！！！|OKAMOTO'S
Place to Try|TOTALFAT
バイマイサイド|Hemenway
カスケード|UNLIMITS
この声枯らして feat.CHEHON|AISHA
MOTHER|ムック
さよならメモリー|7!!
I Can Hear|DISH//
夢を抱いて～はじまりのクリスロード～|RAKE
ブラックナイトタウン|近藤晃央
虹|真空ホロウ
FLAME|DISH//
Never Change feat.Lyu:Lyu|SHUN
だめだめだ|トミタ栞
Spinning World|ダイアナガーネット
言葉のいらない約束|sana
虹の空|FLOW
トラブルメイカー|KANIKAPILA
そんな君、こんな僕|Thinking Dogs
青のララバイ|黒猫チェルシー
ピノとアメリ|石崎ひゅーい
旅立ちの唄|あゆみくりかまき
絶絶|Swimy`
}
];

// 剧场版主题曲：所属作品与现有目录名称保持一致
const movies = [
["剧场版 大活剧！雪姬忍法帖","Home Sweet Home","YUKI"],
["剧场版 大激突！幻之地底遗迹","Ding! Dong! Dang!","TUBE"],
["剧场版 大兴奋！三日月岛的动物骚动","つぼみ","MARIA"],
["剧场版 鸣人之死","Lie-Lie-Lie","DJ OZMA"],
["剧场版 羁绊","NO RAIN NO RAINBOW","HOME MADE 家族"],
["剧场版 火之意志继承者","誰かが","PUFFY"],
["剧场版 失落之塔","if","西野カナ"],
["剧场版 血狱","雄叫び","遊助"],
["剧场版 忍者之路","それでは、また明日","ASIAN KUNG-FU GENERATION"],
["THE LAST -NARUTO THE MOVIE-","星のうつわ","スキマスイッチ"],
["BORUTO -NARUTO THE MOVIE-","ダイバー","KANA-BOON"]
];

// OST 2003年原声专辑精选
const classicOST = `I Said I'm Naruto|増田俊郎
Nine-Tailed Demon Fox|増田俊郎
Morning|MUSASHI PROJECT
Naruto's Daily Life|増田俊郎
Nervous|MUSASHI PROJECT
The Rising Fighting Spirit|MUSASHI PROJECT
Sadness and Sorrow|MUSASHI PROJECT
Loneliness|MUSASHI PROJECT
Sakura's Theme|増田俊郎
Kakashi's Theme|増田俊郎
Sexiness|増田俊郎
Go Go Naruto!|増田俊郎
Evening|MUSASHI PROJECT
Glued State|MUSASHI PROJECT
Need to Be Strong|MUSASHI PROJECT
Bad Situation|MUSASHI PROJECT
Strong and Strike|MUSASHI PROJECT
Turn Over|MUSASHI PROJECT
Victory|MUSASHI PROJECT
Naruto Main Theme|MUSASHI PROJECT`;

// 疾风传OST第一张原声专辑精选
const shippudenOST = `疾風伝|高梨康治
動天|高梨康治
帰郷|高梨康治
千軍万馬|高梨康治
電光石火|高梨康治
任務|高梨康治
空蝉|高梨康治
出陣|高梨康治
怒り|高梨康治
暁|高梨康治
哀鴻遍野|高梨康治
人柱力|高梨康治
孤独|高梨康治
薄暮|高梨康治
秘めたる闘志|高梨康治
古今無双|高梨康治
落日|高梨康治
百花繚乱|高梨康治
失意|高梨康治
暗雲|高梨康治
形勢逆転|高梨康治
仲間|高梨康治
疾風組曲|高梨康治`;

// 歌曲数据转换
const tracks = [];
function pushLines(work,type,lines){
  lines.trim().split("\n").forEach((line,i)=>{
    const [title,artist]=line.split("|");
    tracks.push({
      work,type,title:title.trim(),
      artist:artist.trim(),order:i+1
    });
  });
}
groups.forEach(g=>pushLines(g.work,g.type,g.lines));
movies.forEach(([work,title,artist])=>{
  tracks.push({
    work,title,artist,type:"剧场版"
  });
});
pushLines(original,"OST",classicOST);
pushLines(shippuden,"OST",shippudenOST);

// 预检查：电视主题曲必须恰好84首
const tvCount=groups.reduce(
  (n,g)=>n+g.lines.trim().split("\n").length,0
);
if(tvCount!==84){
  console.error("火影音乐包主题曲数量错误：",tvCount);
  return;
}

function norm(s){
  return String(s||"").toLowerCase()
    .normalize("NFKC")
    .replace(/[\s　:：・·\-—_～~!！★☆]/g,"");
}
function findSeries(){
  return anime.find(a=>norm(a.name)==="火影忍者");
}
function getChild(a,name){
  if(!Array.isArray(a.children)) a.children=[];
  let child=a.children.find(x=>
    norm(x.name)===norm(name)
  );
  if(!child){
    child={
      id:"sub-"+crypto.randomUUID(),
      name,rating:null
    };
    a.children.push(child);
  }
  return child;
}

// 先预览再导入，不会自动写入
const btn=document.createElement("button");
btn.textContent="🍥 补齐火影忍者音乐专题";
btn.className="secondary";
btn.style.margin="8px 0";

const anchor=document.getElementById("importSongs");
if(anchor) anchor.after(btn);

btn.addEventListener("click",async()=>{
  const a=findSeries();
  if(!a) return alert("未找到火影忍者主系列");
  if(!window.cloudUser||!window.cloudSyncEnabled){
    // 兼容全局 let 声明
    if(typeof cloudUser==="undefined"||
       typeof cloudSyncEnabled==="undefined"||
       !cloudUser||!cloudSyncEnabled){
      alert("请先登录并确认云端自动读取完成");
      return;
    }
  }

  if(!Array.isArray(a.songs)) a.songs=[];

  const existing=new Set(
    a.songs.map(s=>norm(s.title))
  );
  const toAdd=tracks.filter(t=>
    !existing.has(norm(t.title))
  );

  const proceed=confirm(
    "火影音乐专题导入预览：\n"+
    "电视OP/ED目录：84首\n"+
    "剧场版歌曲：11首\n"+
    "原声配乐：43首\n"+
    "当前可能新增："+toAdd.length+"条\n\n"+
    "已有歌曲、爱心、BV号不会覆盖。\n"+
    "确定继续吗？"
  );
  if(!proceed)return;

  // 保存操作前创建本地恢复点
  let backupKey="naruto-backup-"+Date.now();
  try {
    localStorage.setItem(
      backupKey,JSON.stringify(anime)
    );
  } catch(e) {
    alert("本地备份失败，已中止导入："+e.message);
    return;
  }

  btn.disabled=true;
  btn.textContent="正在补充音乐...";

  try {
    const existingKeys=new Set(
      a.songs.map(s=>norm(s.title))
    );

    // 创建电影等子作品，不变更任何现有评级
    const childMap=new Map();
    tracks.forEach(t=>{
      if(!childMap.has(t.work)){
        childMap.set(t.work,getChild(a,t.work));
      }
    });

    let added=0,linked=0;
    tracks.forEach(t=>{
      const key=norm(t.title);
      const child=childMap.get(t.work);

      if(existingKeys.has(key)){
        const previous=a.songs.find(s=>
          norm(s.title)===key
        );

        // 只补充原先空缺的子作品归属
        if(previous&&!previous.childId&&child){
          previous.childId=child.id;
          linked++;
        }
        return;
      }

      a.songs.push({
        id:"naruto-"+crypto.randomUUID(),
        title:t.title,
        artist:t.artist,
        type:t.type,
        childId:child?.id||null,
        bv:"",
        liked:false,
        order:t.order||null,
        source:"naruto-music-v1"
      });
      existingKeys.add(key);
      added++;
    });

    // 使用原站点本地保存 + 云端同步机制
    save();
    if(typeof window.openAnime==="function"){
      const i=anime.indexOf(a);
      window.openAnime(i);
    }

    alert(
      "本地导入完成：\n"+
      "新增歌曲："+added+"\n"+
      "补充旧歌曲归属："+linked+"\n\n"+
      "请确认云端显示保存成功，"+
      "再刷新检查。"
    );

  } catch(e){
    alert("导入失败："+e.message+
      "\n备份键："+backupKey);
  } finally {
    btn.disabled=false;
    btn.textContent="🍥 补齐火影忍者音乐专题";
  }
});

console.log(
  "火影忍者音乐包已加载：",tracks.length,"条"
);
})();
