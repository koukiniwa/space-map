# 月面探査機マップ

月に着陸した探査機・着陸船の位置をインタラクティブな3Dマップで可視化するWebアプリ。

## テクスチャのセットアップ（必須）

Three.jsの月球体にはNASAのテクスチャが必要です。以下の手順でダウンロードし、`public/textures/` に配置してください。

### 月面テクスチャ（moon.jpg）

NASA CGI Moon Kit からダウンロードします。

1. https://svs.gsfc.nasa.gov/4720 を開く
2. **"Moon_1k"** または解像度 **1024x1024** の `lroc_color_poles_1k.jpg` をダウンロード
3. `public/textures/moon.jpg` として保存

### バンプマップ（moon-bump.jpg）

同じページから高度データのグレースケール画像をダウンロードします。

1. 同ページの **"Elevation"** セクションから `ldem_3_8bit.jpg`（または同等の1kグレースケール）をダウンロード
2. `public/textures/moon-bump.jpg` として保存

### ファイル構成

```
public/
  textures/
    moon.jpg       ← カラーテクスチャ（1024x1024）
    moon-bump.jpg  ← バンプマップ（1024x1024、グレースケール）
```

> テクスチャが存在しない場合でもアプリは動作しますが、月は灰色のベタ塗りになります。

---

## 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開くと自動的に `/moon` にリダイレクトされます。

## 操作方法

- **ドラッグ** — 月を回転
- **スクロール** — ズームイン・アウト
- **マーカークリック** — 探査機の詳細情報を表示

## デプロイ

Vercel へのデプロイ時は、`public/textures/` のテクスチャファイルもリポジトリに含めるか、別途ホスティングして参照してください。
