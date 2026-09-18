# Codex Neo Deck

`com.itsuki.codex-neo-deck.sdPlugin` は、Stream Deck Neo 専用の Codex controller です。

- `Codex Approve` / `Codex Reject`：表示中の approval と thread identity が一致した場合だけ実行
- `Codex Next Approval`：複数 approval を切り替え
- `Codex 5H Usage` / `Codex Weekly Usage`：キーに配置可能。使用量は自動更新
- `Codex Status`：待機時は `0`、稼働時は現在稼働中の作業数だけを標準タイトルで表示。作業完了時は数字が短時間点滅する
- `Git Status`：現在のCodex workspaceからGitリポジトリを解決し、ブランチ、変更数、ahead / behind、conflictを表示
- `Git Focus 1`〜`Git Focus 6`：最近使われたCodex workspaceを番号順に表示し、押したworkspaceをGit操作の対象として選択。キー上は`codex`、`musescore`、`icon`などの短いscopeだけを表示
- `Git Diff` / `Git Review` / `Git Test` / `Git Commit Prep`：現在のリポジトリを `codex exec` の読み取り専用モードで確認し、結果だけをキー状態に反映。commitやpushは実行しない
- 承認が来ると `Codex Approve` は明るい強調状態、`Codex Reject` は警告状態に切り替わる
- StatusはCodex画面の6スロットに加えて、`~/.codex/sessions` の最新rolloutイベントも750ms間隔で監視するため、現在のデスクトップ作業が画面スロットに出ていない場合も稼働数に反映する
- Status/Usageは透明な動的オーバーレイで、Statusは数字だけ、Usageはメーターと％だけを描画する。アイコンや全面プレートは描画せず、キー背景が見える。
- `Codex InfoBar`：Neo用のコードは用意済みですが、7.5.1の公式manifestでは`Neo` controllerが受け付けられないため、安定版パッケージには含めていません
- bridge が offline、stale、または approval 内容を特定できない場合は fail-closed

## 各ボタンの意味

キーは1つの選択肢で切り替えるのではなく、Stream Deck上にそれぞれ独立したアクションとして追加します。

| ボタン | 動作 |
| --- | --- |
| Approve | 現在選択中の承認要求を承認。対象が消えた、threadを特定できない、接続が古い場合は実行しません |
| Reject | 現在選択中の承認要求を拒否。Approveと同じ安全確認を行います |
| Next Approval | 複数の承認要求があるとき、InfoBarで確認する対象を次へ切り替えます |
| 5H Usage | 5時間枠の残量を `5H`、メーター、パーセンテージで表示。自動更新 |
| Weekly Usage | 週間枠の残量を `WEEK`、メーター、パーセンテージで表示。自動更新 |
| Status | 待機時は `0`、稼働時は重複排除した現在稼働中の作業数を表示。作業完了時に外周が点滅します |
| Git Status | 現在のCodex workspaceのGit状態を表示。`M` は変更、`S` はstaged、`U` はuntracked、`↑` / `↓` は追跡branchとの差分です |
| Git Focus 1〜6 | 最近順のworkspaceを短いscope名で表示。押すとGit Status / Diff / Review / Test / Commit Prepの対象を切り替えます |
| Git Diff | Codexに現在の差分の要約を依頼します。commitやpushは実行しません |
| Git Review | Codexに現在の差分のバグ・regression・secret等をレビューさせます |
| Git Test | Codexに読み取り専用で実行可能なtest・lint・buildチェックを判断させます |
| Git Commit Prep | Codexに対象ファイルとcommit messageを生成させます。commit自体は実行しません |

### 画像の変更

Stream Deck 7.5.1の標準画像設定を使えるよう、状態遷移はすべて2以下に整理しています。キーを右クリックして「画像を設定」から、状態0（通常）と状態1（承認待ち／稼働中）へ個別に画像を割り当ててください。プラグインは画像を合成・上書きしません。

- Approve / Reject：状態0が待機、状態1が承認待ち
- Next：状態0が通常、状態1が複数件あり
- Status：状態0が待機、状態1が稼働中。透明オーバーレイに `0` または現在の稼働数だけを表示し、完了時に数字を短時間点滅
- Usage：透明オーバーレイに `5H` / `WEEK`、残量色のメーター、パーセンテージを表示。残量に応じて緑・黄・赤へ自動変化
- Approve / Reject / Next：状態を切り替えるだけで、Stream Deckで選んだ画像がそのまま残ります

Approve / Reject / Nextの標準アイコンは、背景画像を置いても埋もれないよう、黒の控えめなドロップシャドウ付きです。Status/Usageはアイコンを使わず、必要な情報だけを透明オーバーレイに描画します。

既存の Codex launcher / watcher を先に起動してから、ワークスペースのルートで次を実行します。

```sh
npm run build:codex
npm run validate:codex
npm run pack:codex
```

プラグイン本体は `plugin/com.itsuki.codex-neo-deck.sdPlugin`、配布用パッケージは `release/com.itsuki.codex-neo-deck.streamDeckPlugin` です。

現行の安定版は Stream Deck 7.5.1 です。安定版パッケージは7.5.1でインストールできるよう、`Neo` controllerをmanifestから除外しています。Neo InfoBarを正式なプラグインアクションとして追加できるのは、現行SDK仕様で7.6からです。
