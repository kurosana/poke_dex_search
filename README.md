# poke_dex_search

`PokeDexSearchTool_PC.py` と同じ操作感のポケモン図鑑検索を、GitHub Pages で開くための静的サイトです。

- ポケモン名 **または** 図鑑説明文を、Enter /「単語検索」で探す
- ヒットしたポケモン名をダブルクリックすると、バージョン別の説明が出る
- 今の検索語を含む説明行だけ `#cefff8` で色が付く

ライブ検索やひらがな・カタカナ変換はしません。原典の pandas `str.contains`（正規表現・大文字小文字無視）と同じ条件です。

## 使い方

1. 入力欄にポケモン名（カタカナ）または説明文中の単語（ひらがな／漢字）を入れる
2. Enter または「単語検索」
3. 一覧の名前をダブルクリック
4. 詳細で行を選んで右クリック「コピー(Ctrl+C)」、または Ctrl+C

## GitHub Pages

リポジトリの Settings → Pages → Build and deployment:

- Source: **Deploy from a branch**
- Branch: **main** / **/ (root)**

公開 URL は `https://<user>.github.io/<repo>/` です。

## 要件定義

原典の分析結果です。実装はこの内容に合わせています。

- [機能要件](docs/01-functional-requirements.md)
- [デザイン要件](docs/02-design-requirements.md)
- [UI / 使い心地要件](docs/03-ux-requirements.md)

## ローカル確認

```bash
python3 -m http.server 8080
```

ブラウザで `http://localhost:8080/` を開きます。検索ロジックのテスト:

```bash
npm test
```
