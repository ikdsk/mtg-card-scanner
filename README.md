# MTG Card Scanner

日本人フレンドリーなカードスキャン、メタデータ、ScryfallのUSD価格＋概算JPY表示。
起動・スキャンの低レイテンシーをコアバリューとする。印刷版は手動変更できる。

**Status: development kickoff / domain foundation. This is not yet a working scanner.**
実カメラ・モデル・ライブ価格・為替・UIは未接続。テストfixtureは実データの代わりではない。

- [開発計画](docs/development-plan.md)
- [担当とworktree運用](AGENTS.md)
- [インターフェース契約](docs/contracts.md)
- [エージェント起動指示](docs/agent-briefs.md)

## Local validation

Node.js 24 / npm

```sh
npm ci
npm run check
```

ブランチ単位に専用git worktreeを使う。node_modulesもworktreeごとにnpm ciで用意する。
モデル・カタログの採用とライセンスは未決定。privateであることは第三者ライセンス免除を意味しない。
