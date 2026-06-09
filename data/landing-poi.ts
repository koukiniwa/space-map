// Points of Interest for each lunar landing site
// Coordinates are in meters from the lander:
//   x = east (+) / west (-)
//   z = south (+) / north (-)  (Three.js -Z = north)
// type: 'flag' | 'rover' | 'instrument' | 'crater' | 'equipment' | 'lander'

export type POIType = 'flag' | 'rover' | 'instrument' | 'crater' | 'equipment' | 'lander'

export interface LandingPOI {
  id: string
  label: string
  x: number   // meters east
  z: number   // meters south (Three.js +Z)
  type: POIType
  description: string
}

export const landingPOIs: Record<string, LandingPOI[]> = {

  'apollo-11': [
    { id: 'a11-flag',  label: '星条旗',         x:  -2, z: -8,  type: 'flag',       description: '人類初の月面旗立て。アームストロングとオルドリンが設置。' },
    { id: 'a11-alsep', label: 'ALSEP（科学機器）', x: 20, z:  5,  type: 'instrument',  description: '太陽風組成実験・月震計などを含む科学機器パッケージ。' },
    { id: 'a11-tv',    label: 'テレビカメラ',     x: -8, z:  5,  type: 'equipment',   description: '月面着陸の映像を地球に送信したカメラ。LM降下ステージに設置。' },
    { id: 'a11-laser', label: 'レーザー反射板',    x: 18, z:  3,  type: 'instrument',  description: '現在も地球からレーザーを反射し月の距離測定に使われている。' },
    { id: 'a11-lrrr',  label: '月面反射鏡',       x: 19, z:  4,  type: 'instrument',  description: 'Lunar Ranging Retro Reflector。今も現役。' },
    { id: 'a11-boot',  label: '宇宙飛行士の足跡', x:  0, z:  5,  type: 'equipment',   description: '静かの海に刻まれた人類初の月面足跡。' },
  ],

  'apollo-12': [
    { id: 'a12-flag',      label: '星条旗',            x:  -3, z: -10, type: 'flag',       description: 'ピート・コンラッドとアラン・ビーンが設置。' },
    { id: 'a12-alsep',     label: 'ALSEP',              x:  80, z:  10, type: 'instrument',  description: '月震計・熱流量計を含む科学観測パッケージ。' },
    { id: 'a12-surveyor3', label: 'Surveyor 3',         x: 163, z: 180, type: 'lander',      description: '1967年着陸の無人探査機。アポロ12号は徒歩で訪問しカメラを回収した。' },
    { id: 'a12-crater-s',  label: 'サーベイヤー・クレーター', x: 150, z: 160, type: 'crater', description: 'Surveyor 3が内壁に着陸した直径200mほどのクレーター。' },
    { id: 'a12-laser',     label: 'レーザー反射板',      x:  75, z:  8,  type: 'instrument',  description: '月-地球間距離の精密測定に使用。' },
  ],

  'apollo-14': [
    { id: 'a14-flag',   label: '星条旗',          x:  -4, z: -12, type: 'flag',       description: 'アラン・シェパードとエドガー・ミッチェルが設置。' },
    { id: 'a14-alsep',  label: 'ALSEP',            x:  95, z:   0, type: 'instrument',  description: '月震計・熱流量計・荷電粒子検出器などを搭載。' },
    { id: 'a14-mrr',    label: 'マイクロ波反射計',  x: 100, z:   5, type: 'instrument',  description: '月表面下の土壌特性を調査。' },
    { id: 'a14-cart',   label: 'モジュラー機材カート', x:  50, z:  10, type: 'equipment',  description: 'サンプル採取用の手引きカート（MET）。月面車の代わりに使用。' },
    { id: 'a14-cone',   label: 'コーン・クレーター', x: 1050, z: -170, type: 'crater',  description: '直径340mの古いクレーター。シェパードらが到達を試みたが断念した。' },
  ],

  'apollo-15': [
    { id: 'a15-flag',   label: '星条旗',        x:  -3, z: -15, type: 'flag',       description: 'デイビッド・スコットとジェームズ・アーウィンが設置。' },
    { id: 'a15-alsep',  label: 'ALSEP',          x: 110, z:  15, type: 'instrument',  description: '月震計・熱流量計・太陽風分光計などを含む。' },
    { id: 'a15-rover',  label: '月面車 LRV-1',   x:  30, z: -20, type: 'rover',      description: '初めて月面を走行した有人ローバー。総走行距離 約27.9km。' },
    { id: 'a15-hadley', label: 'ハドリー・リル', x:-1200, z: 200, type: 'crater',    description: '長さ約120kmの溶岩流痕跡の谷。LRVで接近し観測した。' },
    { id: 'a15-genesis', label: 'ジェネシス・ロック採取地点', x: 2000, z:-3000, type: 'equipment', description: '約42億年前の斜長石質岩（ジェネシス・ロック）を採取した地点。' },
    { id: 'a15-irene',  label: 'アイリン・クレーター', x: 500, z: 300, type: 'crater', description: 'LRVで訪問した小クレーター。科学的サンプルを採取。' },
  ],

  'apollo-16': [
    { id: 'a16-flag',    label: '星条旗',         x:  -4, z: -15, type: 'flag',       description: 'ジョン・ヤングとチャールズ・デュークが設置。' },
    { id: 'a16-alsep',   label: 'ALSEP',           x:  80, z:  20, type: 'instrument',  description: '月震計・熱流量計・地磁気計を含む。' },
    { id: 'a16-rover',   label: '月面車 LRV-2',    x:  25, z: -18, type: 'rover',      description: '総走行距離 約26.7km。3回のEVAで使用。' },
    { id: 'a16-stone',   label: 'ストーンマウンテン', x: 4500, z: 3500, type: 'crater', description: '高さ約490mの丘。LRVで中腹まで登り多くのサンプルを採取。' },
    { id: 'a16-north',   label: 'ノース・レイ・クレーター', x: 1000, z:-4000, type: 'crater', description: '直径約900mのクレーター。アポロ16号の最大探査地点。' },
    { id: 'a16-cv',      label: 'サウス・レイ・クレーター周辺', x:-2000, z: 3000, type: 'crater', description: '遠方から観測されたクレーター。放出物サンプルを採取。' },
  ],

  'apollo-17': [
    { id: 'a17-flag',    label: '星条旗',           x:  -3, z: -12, type: 'flag',       description: 'ジーン・サーナンとハリソン・シュミットが設置。' },
    { id: 'a17-alsep',   label: 'ALSEP',             x: 160, z:  20, type: 'instrument',  description: '月震計・中性子線プローブ・熱流量計など最大規模のパッケージ。' },
    { id: 'a17-rover',   label: '月面車 LRV-3',      x:  30, z: -25, type: 'rover',      description: '総走行距離 約35.7km（全アポロ最長）。' },
    { id: 'a17-orange',  label: 'オレンジ土採取地点', x: 3600, z:-100, type: 'equipment', description: 'ショーティ・クレーター内でシュミットが発見したオレンジ色の土壌。火山ガラスと判明。' },
    { id: 'a17-shorty',  label: 'ショーティ・クレーター', x: 3700, z: -80, type: 'crater', description: '直径110mのクレーター。オレンジ色の火山性土壌が採取された。' },
    { id: 'a17-ballet',  label: 'バレー・フロア',     x: 1200, z: 400, type: 'crater',   description: 'タウルス・リットロウ谷の底部。玄武岩質の地形が広がる。' },
    { id: 'a17-lrg',     label: 'レーザー反射板',     x: 155, z:  18, type: 'instrument', description: 'アポロ最後の月面レーザー反射鏡。今も観測に使用。' },
  ],

  'luna-9': [
    { id: 'l9-camera',  label: 'パノラマカメラ',   x:  0, z:  0, type: 'equipment',  description: '月面初のパノラマ画像を撮影。4枚の画像を地球に送信した。' },
    { id: 'l9-shell',   label: '着陸シェル',        x:  1, z:  1, type: 'equipment',  description: 'エアバッグで衝撃を吸収した球形着陸カプセルの外殻。' },
  ],

  'change-3': [
    { id: 'ce3-lander', label: '嫦娥3号着陸機',   x:  0, z:  0, type: 'lander',     description: '雨の海北部に着陸。太陽電池パネルを展開し月面で越冬した。' },
    { id: 'ce3-yutu',   label: '玉兔ローバー',     x: 10, z: -5, type: 'rover',      description: '中国初の月面ローバー。総走行距離 約114m。月震・地下レーダー探査を実施。' },
  ],

  'change-4': [
    { id: 'ce4-lander', label: '嫦娥4号着陸機',    x:  0, z:  0, type: 'lander',     description: '月の裏側（フォン・カルマン・クレーター）への史上初の軟着陸。' },
    { id: 'ce4-yutu2',  label: '玉兔2号ローバー',  x: 15, z: -8, type: 'rover',      description: '現在も運用中。総走行距離 1,900m超（2024年現在）。裏側の地形・岩石を精査。' },
    { id: 'ce4-ncam',   label: '地形カメラ',        x:  2, z:  3, type: 'equipment',  description: '着陸機に搭載された地形撮影カメラ。' },
  ],

  'change-5': [
    { id: 'ce5-drill',  label: 'サンプル採取ドリル', x:  3, z:  2, type: 'equipment',  description: '月面下2mまで掘削し1.73kgのサンプルを採取。' },
    { id: 'ce5-flag',   label: '中国国旗',           x: -2, z: -4, type: 'flag',       description: '月面初の中国国旗。離陸前に設置された。' },
  ],

  'change-6': [
    { id: 'ce6-drill',  label: 'サンプル採取ドリル', x:  3, z:  2, type: 'equipment',  description: '月裏側から約1.9kgのサンプルを採取。史上初の裏側サンプルリターン。' },
    { id: 'ce6-flag',   label: '中国国旗',            x: -2, z: -4, type: 'flag',       description: '月の裏側に設置された中国国旗。' },
  ],

  'chandrayaan-3': [
    { id: 'cy3-lander',  label: 'ヴィクラム着陸機',    x:  0, z:  0, type: 'lander',     description: '南極付近への着陸に成功したインドの着陸機。' },
    { id: 'cy3-pragyan', label: 'プラギャン・ローバー', x: 12, z: -6, type: 'rover',      description: 'インド初の月面ローバー。約100m走行し元素組成を分析。硫黄・鉄などを検出。' },
    { id: 'cy3-rambha',  label: 'ランバ（プラズマ計）', x:  5, z:  5, type: 'instrument',  description: '月面付近のプラズマ密度を計測する着陸機搭載機器。' },
  ],

  'slim': [
    { id: 'slim-body',   label: 'SLIM着陸機',       x:  0, z:  0, type: 'lander',     description: '逆さまに着陸したSLIM本体。ピンポイント着陸（誤差3m以内）を達成。' },
    { id: 'slim-sora',   label: 'LEV-1（そら）',    x:  3, z:  2, type: 'rover',      description: 'ホッピング移動型小型探査ロボット。着陸後に分離し月面を撮影。' },
    { id: 'slim-tomi',   label: 'LEV-2（とみ）',    x: -3, z:  3, type: 'rover',      description: '球形変形型小型ローバー（タカラトミー・ソニー共同開発）。' },
    { id: 'slim-solar',  label: '太陽電池パネル',    x:  2, z: -2, type: 'equipment',  description: '着陸姿勢のトラブルにより西向きになった太陽電池。後に発電再開。' },
  ],

  'nova-c-odysseus': [
    { id: 'im1-body',    label: 'Odysseus着陸機',  x:  0, z:  0, type: 'lander',     description: '月の南極付近に横転しながらも着陸成功した民間初の月着陸機。' },
    { id: 'im1-camera',  label: 'EagleCam',        x:  5, z:  3, type: 'equipment',  description: 'Embry-Riddle大学製のキューブサット型カメラ。着陸シーンを撮影予定だったが分離に遅れ。' },
    { id: 'im1-nasa',    label: 'NASAペイロード群',  x:  2, z: -3, type: 'instrument',  description: 'ROLSES（電波観測）・NDL（ナビゲーション）など6つのNASA搭載機器。' },
  ],

}
