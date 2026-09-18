# poke_dex_search

ポケモンの図鑑説明文を、名前または本文の単語で探すサイトです。

検索の手触りは元の PC ツールと同じです。入力中には動かず、Enter /「単語検索」のときだけ探します。見た目は Ku6-3naツール や ねらいうちゲーム と同じ系統の、丸ゴシックとやわらかい色で整えています。

## 使い方

1. カタカナのポケモン名、または図鑑に出てくるひらがな／漢字を入れる
2. Enter または「単語検索」
3. 名前をクリックすると、バージョン別の説明が出る
4. 今の検索語を含む説明はミント色。コピーボタン、または Ctrl+C で説明文だけコピー

ライブ検索や、ひらがな↔カタカナ変換はありません。ゲームタイトルでは探せません。

## GitHub Pages

Settings → Pages → Deploy from a branch → **main** / **/ (root)**

## 要件定義

- [機能要件](docs/01-functional-requirements.md)
- [デザイン要件](docs/02-design-requirements.md)
- [UI / 使い心地要件](docs/03-ux-requirements.md)

## ローカル確認

```bash
python3 -m http.server 8080
npm test
```
