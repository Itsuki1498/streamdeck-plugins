# Codex Neo Deck

Stream Deck Neo向けのCodexプラグインです。Codexの承認操作、稼働状況、使用制限をStream Deckから確認できます。

## 開発

```sh
npm install
npm test
npm run build
npm run validate
npm run pack
```

主なソースは [`codex/`](codex/) にあります。

- `codex/src/`：プラグイン本体
- `codex/plugin/com.itsuki.codex-neo-deck.sdPlugin/`：Stream Deckプラグイン定義
- `codex/tests/`：回帰テスト
- `codex/release/`：配布用 `.streamDeckPlugin`

## セキュリティ

公開前提のため、認証情報・Codexセッション・Stream Deckログ・秘密鍵はリポジトリに含めません。脆弱性の報告方法は [`SECURITY.md`](SECURITY.md) を参照してください。
