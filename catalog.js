
/*
 ANIME ATLAS - 批量目录扩充 v1
 不覆盖原评级、爱心、BV号
 每条音乐：曲名 ^ 歌手 ^ 类型 ^ 子作品
 每个子作品用 | 分隔
*/
(() => {
"use strict";

function entry(name, works, tracks) {
  return {
    name,
    works: works.split("|").filter(Boolean),
    tracks: tracks.split(";").filter(Boolean)
      .map(line => {
        const [title, artist, type, work] =
          line.split("^");
        return {title,artist,type,work};
      })
  };
}

const catalog = [

entry("火影忍者",
"火影忍者 少年篇|火影忍者 疾风传|博人传：火影忍者新时代|李洛克的青春全力忍传|剧场版 大活剧！雪姬忍法帖|剧场版 大激突！幻之地底遗迹|剧场版 大兴奋！三日月岛的动物骚动|剧场版 鸣人之死|剧场版 羁绊|剧场版 火之意志继承者|剧场版 失落之塔|剧场版 血狱|剧场版 忍者之路|THE LAST -NARUTO THE MOVIE-|BORUTO -NARUTO THE MOVIE-",
"R★O★C★K★S^HOUND DOG^OP^火影忍者 少年篇;遥か彼方^ASIAN KUNG-FU GENERATION^OP^火影忍者 少年篇;悲しみをやさしさに^little by little^OP^火影忍者 少年篇;GO!!!^FLOW^OP^火影忍者 少年篇;青春狂騒曲^サンボマスター^OP^火影忍者 少年篇;ノーボーイ・ノークライ^STANCE PUNKS^OP^火影忍者 少年篇;波風サテライト^シュノーケル^OP^火影忍者 少年篇;Re:member^FLOW^OP^火影忍者 少年篇;ユラユラ^Hearts Grow^OP^火影忍者 少年篇;Wind^Akeboshi^ED^火影忍者 少年篇;ハルモニア^RYTHEM^ED^火影忍者 少年篇;ALIVE^雷鼓^ED^火影忍者 少年篇;Hero's Come Back!!^nobodyknows+^OP^火影忍者 疾风传;distance^LONG SHOT PARTY^OP^火影忍者 疾风传;ブルーバード^いきものがかり^OP^火影忍者 疾风传;CLOSER^井上ジョー^OP^火影忍者 疾风传;ホタルノヒカリ^いきものがかり^OP^火影忍者 疾风传;Sign^FLOW^OP^火影忍者 疾风传;透明だった世界^秦基博^OP^火影忍者 疾风传;DIVER^NICO Touches the Walls^OP^火影忍者 疾风传;ラヴァーズ^7!!^OP^火影忍者 疾风传;newsong^tacica^OP^火影忍者 疾风传;突撃ロック^ザ・クロマニヨンズ^OP^火影忍者 疾风传;Moshimo^ダイスケ^OP^火影忍者 疾风传;ニワカ雨ニモマケズ^NICO Touches the Walls^OP^火影忍者 疾风传;月の大きさ^乃木坂46^OP^火影忍者 疾风传;紅蓮^DOES^OP^火影忍者 疾风传;シルエット^KANA-BOON^OP^火影忍者 疾风传;風^山猿^OP^火影忍者 疾风传;LINE^スキマスイッチ^OP^火影忍者 疾风传;ブラッドサーキュレーター^ASIAN KUNG-FU GENERATION^OP^火影忍者 疾风传;カラノココロ^Anly^OP^火影忍者 疾风传;流れ星 ～Shooting Star～^HOME MADE 家族^ED^火影忍者 疾风传;Broken Youth^NICO Touches the Walls^ED^火影忍者 疾风传;Long Kiss Good Bye^HALCALI^ED^火影忍者 疾风传;For You^AZU^ED^火影忍者 疾风传;うたかた花火^supercell^ED^火影忍者 疾风传"),

entry("死亡笔记",
"死亡笔记 TV动画|Relight 1 幻视之神|Relight 2 L的继承者",
"the WORLD^ナイトメア^OP^死亡笔记 TV动画;アルミナ^ナイトメア^ED^死亡笔记 TV动画;What's up, people?!^MAXIMUM THE HORMONE^OP^死亡笔记 TV动画;絶望ビリー^MAXIMUM THE HORMONE^ED^死亡笔记 TV动画;L's Theme^原声配乐^OST^死亡笔记 TV动画;Light's Theme^原声配乐^OST^死亡笔记 TV动画"),

entry("命运石之门",
"STEINS;GATE 本篇|本篇OVA|剧场版 负荷领域的既视感|境界面上的缺失之环 23β|STEINS;GATE 0|STEINS;GATE 0 OVA",
"Hacking to the Gate^いとうかなこ^OP^STEINS;GATE 本篇;刻司ル十二ノ盟約^ファンタズム^ED^STEINS;GATE 本篇;スカイクラッドの観測者^いとうかなこ^特殊ED^STEINS;GATE 本篇;あなたの選んだこの時を^いとうかなこ^剧场版^剧场版 负荷领域的既视感;いつもこの場所で^彩音^剧场版^剧场版 负荷领域的既视感;ファティマ^いとうかなこ^OP^STEINS;GATE 0;LAST GAME^Zwei^ED^STEINS;GATE 0;World-Line^今井麻美^ED^STEINS;GATE 0;Gate of Steiner^阿保剛^OST^STEINS;GATE 本篇"),

entry("名侦探柯南",
"名侦探柯南 TV动画|剧场版 引爆摩天楼|剧场版 第十四个目标|剧场版 世纪末的魔术师|剧场版 瞳孔中的暗杀者|剧场版 通往天国的倒计时|剧场版 贝克街的亡灵|剧场版 迷宫的十字路口|剧场版 银翼的魔术师|剧场版 水平线上的阴谋|剧场版 侦探们的镇魂歌|剧场版 绀碧之棺|剧场版 战栗的乐谱|剧场版 漆黑的追踪者|剧场版 天空的遇难船|剧场版 沉默的十五分钟|剧场版 第十一个前锋|剧场版 绝海的侦探|剧场版 异次元的狙击手|剧场版 业火的向日葵|剧场版 纯黑的噩梦|剧场版 唐红的恋歌|剧场版 零的执行人|剧场版 绀青之拳|剧场版 绯色的弹丸|剧场版 万圣节的新娘|剧场版 黑铁的鱼影|剧场版 百万美元的五棱星|剧场版 独眼的残像|零的日常|犯人犯泽先生|魔术快斗1412",
"胸がドキドキ^THE HIGH-LOWS^OP^名侦探柯南 TV动画;謎^小松未歩^OP^名侦探柯南 TV动画;運命のルーレット廻して^ZARD^OP^名侦探柯南 TV动画;TRUTH ～A Great Detective of Love～^TWO-MIX^OP^名侦探柯南 TV动画;ギリギリchop^B'z^OP^名侦探柯南 TV动画;恋はスリル、ショック、サスペンス^愛内里菜^OP^名侦探柯南 TV动画;Secret of my heart^倉木麻衣^ED^名侦探柯南 TV动画;夏の幻^GARNET CROW^ED^名侦探柯南 TV动画;Time after time ～花舞う街で～^倉木麻衣^剧场版^剧场版 迷宫的十字路口;零 -ZERO-^福山雅治^剧场版^剧场版 零的执行人;永遠の不在証明^東京事変^剧场版^剧场版 绯色的弹丸;クロノスタシス^BUMP OF CHICKEN^剧场版^剧场版 万圣节的新娘;美しい鰭^スピッツ^剧场版^剧场版 黑铁的鱼影;相思相愛^aiko^剧场版^剧场版 百万美元的五棱星"),

entry("暗杀教室",
"暗杀教室 第一季|暗杀教室 第二季|课外授业篇|剧场版 365日的时间|杀老师Q！",
"青春サツバツ論^3年E組うた担^OP^暗杀教室 第一季;自力本願レボリューション^3年E組うた担^OP^暗杀教室 第一季;Hello, shooting-star^moumoon^ED^暗杀教室 第一季;QUESTION^3年E組うた担^OP^暗杀教室 第二季;バイバイ YESTERDAY^3年E組うた担^OP^暗杀教室 第二季;欠けた月^宮脇詩音^ED^暗杀教室 第二季;また君に会える日^宮脇詩音^ED^暗杀教室 第二季;旅立ちのうた^3年E組^插入曲^暗杀教室 第二季"),

entry("龙珠",
"龙珠 初代|龙珠Z|龙珠GT|龙珠改|龙珠超|龙珠DAIMA|龙珠超 布罗利|龙珠超 超级英雄|超级龙珠英雄|龙珠系列旧剧场版",
"魔訶不思議アドベンチャー!^高橋洋樹^OP^龙珠 初代;ロマンティックあげるよ^橋本潮^ED^龙珠 初代;CHA-LA HEAD-CHA-LA^影山ヒロノブ^OP^龙珠Z;WE GOTTA POWER^影山ヒロノブ^OP^龙珠Z;僕達は天使だった^影山ヒロノブ^ED^龙珠Z;DAN DAN 心魅かれてく^FIELD OF VIEW^OP^龙珠GT;ひとりじゃない^DEEN^ED^龙珠GT;Don't you see!^ZARD^ED^龙珠GT;Blue Velvet^工藤静香^ED^龙珠GT;Dragon Soul^谷本貴義^OP^龙珠改;超絶☆ダイナミック!^吉井和哉^OP^龙珠超;限界突破×サバイバー^氷川きよし^OP^龙珠超;究極の聖戦^串田アキラ^插入曲^龙珠超;ジャカ☆ジャ～ン^Zedd feat. C&K^OP^龙珠DAIMA;NAKAMA^Zedd feat. AI^ED^龙珠DAIMA"),

entry("齐木楠雄的灾难",
"齐木楠雄的灾难 第一季|齐木楠雄的灾难 第二季|齐木楠雄的灾难 完结篇|齐木楠雄的灾难 始动篇",
"青春は残酷じゃない^花江夏樹^OP^齐木楠雄的灾难 第一季;最Ψ最好調！^でんぱ組.inc^OP^齐木楠雄的灾难 第一季;Ψです I LIKE YOU^でんぱ組.inc^ED^齐木楠雄的灾难 第一季;Ψレントプリズナー^斉木ックラバー^OP^齐木楠雄的灾难 第二季;お手上げサイキクス^Shiggy Jr.^OP^齐木楠雄的灾难 第二季;Ψ発見伝！^でんぱ組.inc^ED^齐木楠雄的灾难 第二季"),

entry("辉夜大小姐想让我告白",
"辉夜大小姐 第一季|辉夜大小姐 第二季|辉夜大小姐 第三季|初吻不会结束|辉夜大小姐 特别篇",
"ラブ・ドラマティック^鈴木雅之^OP^辉夜大小姐 第一季;センチメンタルクライシス^halca^ED^辉夜大小姐 第一季;チカっとチカ千花っ♡^小原好美^特殊ED^辉夜大小姐 第一季;DADDY! DADDY! DO!^鈴木雅之^OP^辉夜大小姐 第二季;風に吹かれて^福原遥^ED^辉夜大小姐 第二季;GIRI GIRI^鈴木雅之^OP^辉夜大小姐 第三季;ハートはお手上げ^鈴木愛理^ED^辉夜大小姐 第三季;My Nonfiction^白銀御行＆藤原千花^特殊ED^辉夜大小姐 第三季;Love is Show^鈴木雅之^OP^初吻不会结束;heart notes^鈴木愛理^ED^初吻不会结束"),

entry("赛马娘 第二季",
"赛马娘 第一季|赛马娘 第二季|赛马娘 第三季|ROAD TO THE TOP|新时代之门|灰发的灰姑娘|BNW的誓言|赛马娘 Q版短篇",
"ユメヲカケル！^Spica^OP^赛马娘 第二季;木漏れ日のエール^东海帝王＆目白麦昆^ED^赛马娘 第二季;winning the soul^东海帝王^插入曲^赛马娘 第二季;ささやかな祈り^米浴^插入曲^赛马娘 第二季"),

entry("Fate/Zero",
"Fate/Zero 第一季|Fate/Zero 第二季|关联 Fate/stay night|关联 Unlimited Blade Works|关联 Heaven's Feel|关联 Fate/Grand Order",
"oath sign^LiSA^OP^Fate/Zero 第一季;MEMORIA^藍井エイル^ED^Fate/Zero 第一季;to the beginning^Kalafina^OP^Fate/Zero 第二季;空は高く風は歌う^春奈るな^ED^Fate/Zero 第二季;満天^Kalafina^特殊ED^Fate/Zero 第二季"),

entry("爆漫王。",
"爆漫王 第一季|爆漫王 第二季|爆漫王 第三季",
"Blue Bird^コブクロ^OP^爆漫王 第一季;BAKUROCK ～未来の輪郭線～^YA-KYIM^ED^爆漫王 第一季;Dream of Life^伊藤祥平^OP^爆漫王 第二季;monochrome rainbow^Tommy heavenly6^ED^爆漫王 第二季;もしもの話^nano.RIPE^OP^爆漫王 第三季;23時40分^ヒャダイン feat. Base Ball Bear^OP^爆漫王 第三季;夢スケッチ^JAM Project^ED^爆漫王 第三季"),

entry("灌篮高手",
"灌篮高手 TV动画|旧版剧场版系列|THE FIRST SLAM DUNK",
"君が好きだと叫びたい^BAAD^OP^灌篮高手 TV动画;ぜったいに 誰も^ZYYG^OP^灌篮高手 TV动画;あなただけ見つめてる^大黒摩季^ED^灌篮高手 TV动画;世界が終るまでは…^WANDS^ED^灌篮高手 TV动画;煌めく瞬間に捕われて^MANISH^ED^灌篮高手 TV动画;マイ フレンド^ZARD^ED^灌篮高手 TV动画;LOVE ROCKETS^The Birthday^剧场版^THE FIRST SLAM DUNK;第ゼロ感^10-FEET^剧场版^THE FIRST SLAM DUNK"),

entry("灵能百分百",
"灵能百分百 第一季|灵能百分百 第二季|灵能百分百 第三季|灵能百分百 OVA",
"99^MOB CHOIR^OP^灵能百分百 第一季;リフレインボーイ^ALL OFF^ED^灵能百分百 第一季;99.9^MOB CHOIR^OP^灵能百分百 第二季;メモセピア^sajou no hana^ED^灵能百分百 第二季;1^MOB CHOIR^OP^灵能百分百 第三季;コバルト^MOB CHOIR^ED^灵能百分百 第三季;Exist^MOB CHOIR^特殊ED^灵能百分百 第三季"),

entry("寄生兽：生命的准则",
"寄生兽：生命的准则 TV动画",
"Let Me Hear^Fear, and Loathing in Las Vegas^OP^寄生兽：生命的准则 TV动画;IT'S THE RIGHT TIME^三浦大知^ED^寄生兽：生命的准则 TV动画"),

entry("排球少年！！",
"排球少年 第一季|排球少年 第二季|排球少年 第三季|排球少年 TO THE TOP|OVA 陆VS空|剧场版 垃圾场的决战",
"イマジネーション^SPYAIR^OP^排球少年 第一季;Ah Yeah!!^スキマスイッチ^OP^排球少年 第一季;天地ガエシ^NICO Touches the Walls^ED^排球少年 第一季;LEO^tacica^ED^排球少年 第一季;アイム・ア・ビリーバー^SPYAIR^OP^排球少年 第二季;FLY HIGH!!^BURNOUT SYNDROMES^OP^排球少年 第二季;ヒカリアレ^BURNOUT SYNDROMES^OP^排球少年 第三季;マシ・マシ^NICO Touches the Walls^ED^排球少年 第三季;PHOENIX^BURNOUT SYNDROMES^OP^排球少年 TO THE TOP;突破口^SUPER BEAVER^OP^排球少年 TO THE TOP;決戦スピリット^CHiCO with HoneyWorks^ED^排球少年 TO THE TOP;One Day^SPYAIR^ED^排球少年 TO THE TOP;オレンジ^SPYAIR^剧场版^剧场版 垃圾场的决战"),

entry("为美好的世界献上祝福！",
"为美好的世界献上祝福 第一季|为美好的世界献上祝福 第二季|为美好的世界献上祝福 第三季|剧场版 红传说|爆焰外传",
"fantastic dreamer^Machico^OP^为美好的世界献上祝福 第一季;ちいさな冒険者^角色声优组合^ED^为美好的世界献上祝福 第一季;TOMORROW^Machico^OP^为美好的世界献上祝福 第二季;おうちに帰りたい^角色声优组合^ED^为美好的世界献上祝福 第二季;Growing Up^Machico^OP^为美好的世界献上祝福 第三季;あの日のままのぼくら^角色声优组合^ED^为美好的世界献上祝福 第三季;1ミリ Symphony^Machico^剧场版^剧场版 红传说;STAY FREE^Machico^OP^爆焰外传;JUMP IN^惠惠与悠悠^ED^爆焰外传"),

entry("Re：从零开始的异世界生活",
"Re:0 第一季|Re:0 第二季|Re:0 第三季|OVA Memory Snow|OVA 冰结之绊",
"Redo^鈴木このみ^OP^Re:0 第一季;Paradisus-Paradoxum^MYTH & ROID^OP^Re:0 第一季;STYX HELIX^MYTH & ROID^ED^Re:0 第一季;Stay Alive^高橋李依^ED^Re:0 第一季;Wishing^水瀬いのり^插入曲^Re:0 第一季;Realize^鈴木このみ^OP^Re:0 第二季;Long shot^前島麻由^OP^Re:0 第二季;Memento^nonoc^ED^Re:0 第二季;Believe in you^nonoc^ED^Re:0 第二季;Reweave^鈴木このみ^OP^Re:0 第三季;NOX LUX^MYTH & ROID^ED^Re:0 第三季"),

entry("精灵宝可梦",
"宝可梦 无印|宝可梦 AG|宝可梦 DP|宝可梦 BW|宝可梦 XY与XYZ|宝可梦 日月|宝可梦 旅途|目标是宝可梦大师|宝可梦 地平线|宝可梦 剧场版系列",
"めざせポケモンマスター^松本梨香^OP^宝可梦 无印;ライバル！^松本梨香^OP^宝可梦 无印;OK!^松本梨香^OP^宝可梦 无印;Ready Go!^田村直美^OP^宝可梦 无印;タイプ:ワイルド^松本梨香^ED^宝可梦 无印;アドバンス・アドベンチャー^GARDEN^OP^宝可梦 AG;チャレンジャー!!^松本梨香^OP^宝可梦 AG;バトルフロンティア^高屋亜希那^OP^宝可梦 AG;Together^あきよしふみえ^OP^宝可梦 DP;ハイタッチ！^松本梨香＆豊口めぐみ^OP^宝可梦 DP;ベストウイッシュ！^松本梨香^OP^宝可梦 BW;ゲッタバンバン^佐香智久^OP^宝可梦 XY与XYZ;XY&Z^松本梨香^OP^宝可梦 XY与XYZ;アローラ!!^松本梨香^OP^宝可梦 日月;1・2・3^After the Rain^OP^宝可梦 旅途;ドキメキダイアリー^asmi feat. Chinozo^OP^宝可梦 地平线"),

entry("数码宝贝",
"数码宝贝大冒险|数码宝贝大冒险02|数码宝贝驯兽师|数码宝贝无限地带|数码宝贝拯救者|数码宝贝合体战争|数码宝贝宇宙应用怪兽|数码宝贝大冒险tri.|数码宝贝大冒险 最后的进化|数码宝贝幽灵游戏|数码宝贝BEATBREAK",
"Butter-Fly^和田光司^OP^数码宝贝大冒险;brave heart^宮﨑歩^插入曲^数码宝贝大冒险;I wish^前田愛^ED^数码宝贝大冒险;keep on^前田愛^ED^数码宝贝大冒险;ターゲット～赤い衝撃～^和田光司^OP^数码宝贝大冒险02;Break up!^宮﨑歩^插入曲^数码宝贝大冒险02;Beat Hit!^宮﨑歩^插入曲^数码宝贝大冒险02;The Biggest Dreamer^和田光司^OP^数码宝贝驯兽师;SLASH!!^太田美知彦^插入曲^数码宝贝驯兽师;One Vision^谷本貴義^插入曲^数码宝贝驯兽师;FIRE!!^和田光司^OP^数码宝贝无限地带;With The Will^和田光司^插入曲^数码宝贝无限地带;The last element^アユミ^插入曲^数码宝贝无限地带;ヒラリ^和田光司^OP^数码宝贝拯救者;Believer^Ikuo^插入曲^数码宝贝拯救者"),

entry("CLANNAD",
"CLANNAD 第一季|CLANNAD AFTER STORY|CLANNAD 番外篇|CLANNAD 另一世界篇|CLANNAD 剧场版",
"メグメル ～cuckool mix 2007～^eufonius^OP^CLANNAD 第一季;だんご大家族^茶太^ED^CLANNAD 第一季;時を刻む唄^Lia^OP^CLANNAD AFTER STORY;TORCH^Lia^ED^CLANNAD AFTER STORY;小さなてのひら^riya^插入曲^CLANNAD AFTER STORY"),

entry("NO GAME NO LIFE 游戏人生",
"游戏人生 TV动画|剧场版 游戏人生 零",
"This game^鈴木このみ^OP^游戏人生 TV动画;オラシオン^茅野愛衣^ED^游戏人生 TV动画;THERE IS A REASON^鈴木このみ^剧场版^剧场版 游戏人生 零"),

entry("Angel Beats!",
"Angel Beats! TV动画|Angel Beats! 特别篇|Girls Dead Monster 关联音乐",
"My Soul, Your Beats!^Lia^OP^Angel Beats! TV动画;Brave Song^多田葵^ED^Angel Beats! TV动画;Crow Song^Girls Dead Monster^插入曲^Angel Beats! TV动画;Alchemy^Girls Dead Monster^插入曲^Angel Beats! TV动画;My Song^Girls Dead Monster^插入曲^Angel Beats! TV动画;一番の宝物^Girls Dead Monster^插入曲^Angel Beats! TV动画"),

entry("赛博朋克：边缘行者 第一季",
"赛博朋克 边缘行者 第一季",
"This Fffire^Franz Ferdinand^OP^赛博朋克 边缘行者 第一季;Let You Down^Dawid Podsiadło^ED^赛博朋克 边缘行者 第一季;I Really Want to Stay at Your House^Rosa Walton & Hallie Coggins^插入曲^赛博朋克 边缘行者 第一季"),

entry("间谍过家家",
"间谍过家家 第一季前半|间谍过家家 第一季后半|间谍过家家 第二季|间谍过家家 第三季|剧场版 CODE: White",
"ミックスナッツ^Official髭男dism^OP^间谍过家家 第一季前半;喜劇^星野源^ED^间谍过家家 第一季前半;SOUVENIR^BUMP OF CHICKEN^OP^间谍过家家 第一季后半;色彩^yama^ED^间谍过家家 第一季后半;クラクラ^Ado^OP^间谍过家家 第二季;トドメの一撃^Vaundy feat. Cory Wong^ED^间谍过家家 第二季;SOULSOUP^Official髭男dism^剧场版^剧场版 CODE: White"),

entry("笨蛋·测验·召唤兽",
"笨蛋测验召唤兽 第一季|OVA 祭|笨蛋测验召唤兽 第二季",
"Perfect-area complete!^麻生夏子^OP^笨蛋测验召唤兽 第一季;バカ・ゴー・ホーム^milktub^ED^笨蛋测验召唤兽 第一季;君+謎+私でJUMP!!^Larval Stage Planning^OP^笨蛋测验召唤兽 第二季;エウレカベイビー^麻生夏子^ED^笨蛋测验召唤兽 第二季"),

entry("绝园的暴风雨",
"绝园的暴风雨 TV动画",
"Spirit Inspiration^Nothing's Carved In Stone^OP^绝园的暴风雨 TV动画;大好きなのに^Kylee^OP^绝园的暴风雨 TV动画;happy endings^花澤香菜^ED^绝园的暴风雨 TV动画;僕たちの歌^佐香智久^ED^绝园的暴风雨 TV动画"),

entry("四月是你的谎言",
"四月是你的谎言 TV动画|四月是你的谎言 OVA",
"光るなら^Goose house^OP^四月是你的谎言 TV动画;七色シンフォニー^コアラモード.^OP^四月是你的谎言 TV动画;キラメキ^wacci^ED^四月是你的谎言 TV动画;オレンジ^7!!^ED^四月是你的谎言 TV动画"),

entry("三月的狮子",
"三月的狮子 第一季|三月的狮子 第二季",
"アンサー^BUMP OF CHICKEN^OP^三月的狮子 第一季;ファイター^BUMP OF CHICKEN^ED^三月的狮子 第一季;さよならバイスタンダー^YUKI^OP^三月的狮子 第一季;orion^米津玄師^ED^三月的狮子 第一季;フラッグを立てろ^YUKI^OP^三月的狮子 第二季;カフネ^Brian the Sun^ED^三月的狮子 第二季;春が来てぼくら^UNISON SQUARE GARDEN^OP^三月的狮子 第二季;I AM STANDING^RUANN^ED^三月的狮子 第二季"),

entry("来自新世界",
"来自新世界 TV动画",
"割れたリンゴ^種田梨沙^ED^来自新世界 TV动画;雪に咲く花^花澤香菜^ED^来自新世界 TV动画"),

entry("进击的巨人",
"进击的巨人 第一季|进击的巨人 第二季|进击的巨人 第三季前半|进击的巨人 第三季后半|进击的巨人 最终季Part1|进击的巨人 最终季Part2|进击的巨人 最终篇|进击的巨人 OVA",
"紅蓮の弓矢^Linked Horizon^OP^进击的巨人 第一季;自由の翼^Linked Horizon^OP^进击的巨人 第一季;美しき残酷な世界^日笠陽子^ED^进击的巨人 第一季;great escape^cinema staff^ED^进击的巨人 第一季;心臓を捧げよ！^Linked Horizon^OP^进击的巨人 第二季;夕暮れの鳥^神聖かまってちゃん^ED^进击的巨人 第二季;Red Swan^YOSHIKI feat. HYDE^OP^进击的巨人 第三季前半;暁の鎮魂歌^Linked Horizon^ED^进击的巨人 第三季前半;憧憬と屍の道^Linked Horizon^OP^进击的巨人 第三季后半;Name of Love^cinema staff^ED^进击的巨人 第三季后半;僕の戦争^神聖かまってちゃん^OP^进击的巨人 最终季Part1;衝撃^安藤裕子^ED^进击的巨人 最终季Part1;The Rumbling^SiM^OP^进击的巨人 最终季Part2;悪魔の子^ヒグチアイ^ED^进击的巨人 最终季Part2;UNDER THE TREE^SiM^插入曲^进击的巨人 最终篇;最後の巨人^Linked Horizon^OP^进击的巨人 最终篇;いってらっしゃい^ヒグチアイ^ED^进击的巨人 最终篇"),

entry("未闻花名",
"未闻花名 TV动画|未闻花名 剧场版",
"青い栞^Galileo Galilei^OP^未闻花名 TV动画;secret base ～君がくれたもの～（10 years after Ver.）^茅野愛衣・戸松遥・早見沙織^ED^未闻花名 TV动画;サークルゲーム^Galileo Galilei^剧场版^未闻花名 剧场版"),

entry("Vivy -Fluorite Eye's Song-",
"Vivy TV动画|Vivy 特别节目",
"Sing My Pleasure^Vivy^OP^Vivy TV动画;Fluorite Eye's Song^Vivy^插入曲^Vivy TV动画;Happy Together^Vivy^插入曲^Vivy TV动画;Ensemble for Polaris^エステラ＆エリザベス^插入曲^Vivy TV动画"),

entry("ODDTAXI 奇巧计程车",
"ODDTAXI TV动画|剧场版 ODDTAXI In the Woods",
"ODDTAXI^スカートとPUNPEE^OP^ODDTAXI TV动画;シュガーレス・キッス^三森すずこ^ED^ODDTAXI TV动画"),

entry("电玩咖！",
"电玩咖 TV动画",
"GAMERS!^天道花憐・星ノ守千秋・亜玖璃^OP^电玩咖 TV动画;Fight on!^Luce Twinkle Wink☆^ED^电玩咖 TV动画"),

entry("银魂",
"银魂 TV第一期|银魂'|银魂' 延长战|银魂°|银魂.|银魂 银之魂篇|剧场版 新译红樱篇|剧场版 永远的万事屋|剧场版 THE FINAL|银魂 OVA及特别篇",
"Pray^Tommy heavenly6^OP^银魂 TV第一期;銀色の空^redballoon^OP^银魂 TV第一期;曇天^DOES^OP^银魂 TV第一期;修羅^DOES^ED^银魂 TV第一期;桃源郷エイリアン^serial TV drama^OP^银魂';サムライハート (Some Like It Hot!!)^SPYAIR^ED^银魂';サクラミツツキ^SPYAIR^OP^银魂' 延长战;現状ディストラクション^SPYAIR^剧场版^剧场版 永远的万事屋;轍～Wadachi～^SPYAIR^剧场版^剧场版 THE FINAL"),

entry("心理测量者",
"心理测量者 第一季|心理测量者 第二季|心理测量者 第三季|剧场版 PSYCHO-PASS|Sinners of the System Case.1|Sinners of the System Case.2|Sinners of the System Case.3|剧场版 PROVIDENCE",
"abnormalize^凛として時雨^OP^心理测量者 第一季;Out of Control^Nothing's Carved In Stone^OP^心理测量者 第一季;名前のない怪物^EGOIST^ED^心理测量者 第一季;All Alone With You^EGOIST^ED^心理测量者 第一季;Enigmatic Feeling^凛として時雨^OP^心理测量者 第二季;Fallen^EGOIST^ED^心理测量者 第二季;Q-vism^Who-ya Extended^OP^心理测量者 第三季;bullet^Cö shu Nie^ED^心理测量者 第三季"),

entry("魔法少女小圆",
"魔法少女小圆 TV动画|剧场版 起始的物语|剧场版 永远的物语|剧场版 叛逆的物语|魔法少女小圆 关联外传动画",
"コネクト^ClariS^OP^魔法少女小圆 TV动画;Magia^Kalafina^ED^魔法少女小圆 TV动画;また あした^悠木碧^特殊ED^魔法少女小圆 TV动画;ルミナス^ClariS^剧场版^剧场版 起始的物语;ひかりふる^Kalafina^剧场版^剧场版 永远的物语;カラフル^ClariS^剧场版^剧场版 叛逆的物语;君の銀の庭^Kalafina^剧场版^剧场版 叛逆的物语"),

entry("未来日记",
"未来日记 TV动画|OVA 未来日记 Redial",
"空想メソロギヰ^妖精帝國^OP^未来日记 TV动画;Dead END^飛蘭^OP^未来日记 TV动画;Blood teller^飛蘭^ED^未来日记 TV动画;filament^妖精帝國^ED^未来日记 TV动画;狂気沈殿^妖精帝國^ED^OVA 未来日记 Redial")

];

// 一些作品此前在个人档案中有别名
const aliases = {
  "火影忍者":["NARUTO"],
  "赛马娘 第二季":["赛马娘2"],
  "寄生兽：生命的准则":["寄生兽"],
  "Re：从零开始的异世界生活":["RE从零开始的异世界生活"],
  "NO GAME NO LIFE 游戏人生":["nogamenolife"],
  "赛博朋克：边缘行者 第一季":["赛博朋克边缘行者1"],
  "来自新世界":["自新世界"],
  "ODDTAXI 奇巧计程车":["odd taxi"],
  "CLANNAD":["CLANNED"]
};

function normalize(s) {
  return String(s||"")
    .toLowerCase()
    .replace(/[\s:：!！·・\-—_。]/g,"");
}

function findAnime(record) {
  const names = [
    record.name,
    ...(aliases[record.name]||[])
  ].map(normalize);

  return anime.find(a=>
    names.includes(normalize(a.name))
  );
}

function addCatalog() {
  if (typeof cloudSyncEnabled === "undefined" ||
      !cloudSyncEnabled || !cloudUser) {
    alert("请先登录并完成云端读取");
    return;
  }

  const missing = catalog.filter(c=>!findAnime(c));

  if (missing.length) {
    alert(
      "有作品名称没有匹配成功，已停止导入：\n"+
      missing.map(c=>c.name).join("\n")+
      "\n请先检查这些作品在你的榜单中的名称。"
    );
    return;
  }

  if (!confirm(
    "确认扩充38部动漫的子作品和音乐资料？"+
    "不会修改原评级、爱心和BV号。"
  )) return;

  try {
    localStorage.setItem(
      "animeAtlasBeforeBatch_"+Date.now(),
      JSON.stringify(anime)
    );
  } catch(e) {
    alert("本地备份失败，已取消导入："+e.message);
    return;
  }

  let childCount=0, songCount=0;

  catalog.forEach(c=>{
    const a=findAnime(c);

    if (!Array.isArray(a.children)) {
      a.children=[];
    }
    if (!Array.isArray(a.songs)) {
      a.songs=[];
    }

    const childMap=new Map(
      a.children.map(child=>[
        normalize(child.name),child
      ])
    );

    c.works.forEach(name=>{
      const key=normalize(name);
      if (childMap.has(key)) return;

      const child={
        id:"sub-"+crypto.randomUUID(),
        name,
        rating:null
      };

      a.children.push(child);
      childMap.set(key,child);
      childCount++;
    });

    const known=new Set(
      a.songs.map(s=>normalize(s.title))
    );

    c.tracks.forEach(t=>{
      const key=normalize(t.title);
      if (known.has(key)) return;

      const child=t.work
        ?childMap.get(normalize(t.work))
        :null;

      a.songs.push({
        id:"catalog-"+crypto.randomUUID(),
        title:t.title,
        artist:t.artist,
        type:t.type,
        childId:child?.id||null,
        bv:"",
        liked:false
      });
      known.add(key);
      songCount++;
    });
  });

  save();

  if (typeof selected!=="undefined" &&
      typeof window.openAnime==="function") {
    window.openAnime(selected);
  } else {
    renderAnime();
  }

  alert(
    "批量补录完成！\n"+
    "新增子作品："+childCount+"\n"+
    "新增歌曲："+songCount+"\n"+
    "已有记录没有被删除。\n"+
    "请确认云端自动保存成功。"
  );
}

// 在现有扩充音乐按钮旁边增加新按钮
const oldButton=document.getElementById("importSongs");

if(oldButton){
  const button=document.createElement("button");
  button.textContent="📚 批量补齐38部动漫资料";
  button.className="secondary";
  button.style.margin="8px 0";
  button.onclick=addCatalog;
  oldButton.after(button);
}

console.log(
  "ANIME ATLAS catalog loaded:",
  catalog.length,"series"
);
})();
