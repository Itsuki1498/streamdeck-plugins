# Stream Deck plugins workspace

このフォルダには、次のプロジェクト領域があります。

- [musescore](musescore/README.md)：MuseScore Studio 操作用
- [codex](codex/README.md)：Codex の承認・状態・使用量表示用
- [icon](icon/README.md)：共通・将来追加するアイコン素材用

各プロジェクト内も `src/`、`scripts/`、`plugin/`、`release/` などの役割別に分離しています。依存関係はルートの `node_modules` で共有します。

MuseScoreプラグインの実体は次の場所です。

```text
musescore/
├─ src/                                  TypeScriptソース
├─ scripts/                              抽出・生成・ビルドスクリプト
├─ config/                               Rollup設定
├─ MusescoreIcon.ttf                     公式アイコンフォントの抽出元
├─ plugin/com.codex.musescore-control.sdPlugin/
│  ├─ manifest.json                      Stream Deckプラグイン定義
│  ├─ bin/plugin.js                      実行ファイル
│  ├─ ui/                                Property Inspectorと生成アイコン
│  └─ static/                            プラグイン画像
└─ release/                              配布用.streamDeckPlugin
```

Stream Deckから参照するのは `musescore/plugin/com.codex.musescore-control.sdPlugin` です。`release/` はインストール用の配布パッケージで、編集対象の本体ではありません。

## 開発

```sh
npm install
npm run build
npm test
```

個別に実行する場合は次を使います。

```sh
npm run build:musescore
npm run build:codex
npm run validate
npm run pack
```
