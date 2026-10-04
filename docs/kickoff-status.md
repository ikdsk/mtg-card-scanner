---
created: 2026-10-04
status: bootstrap-verified-not-mvp
---
# MTG Card Scanner 開発開始記録

関連：[[MTG Card Scanner 開発計画]]、[[MTG Card Scanner マーケティング戦略・議論]]、[[MTG Card Scanner 最新セット対応の確認]]

## 完了した範囲
- GitHub private repository: https://github.com/ikdsk/mtg-card-scanner
- 初期PR: https://github.com/ikdsk/mtg-card-scanner/pull/5
- 作業場所: `/Users/dikeda/workspace/mtg-card-scanner`
- 開発計画、共通契約、担当brief、git worktreeによる作業分離、TypeScript/Vitest、GitHub CIを準備。
- GPT-6.1-SolのPRICE・STATE担当が別worktreeでTDD実装。TESTは契約から独立に回帰テストを作成。QAは別worktree・固定候補でレビュー。
- 純粋なUSD/JPY表示、欠損と0の区別、不正為替・金額丸め・overflow、手動選択保持・世代/revisionによる古い応答排除を実装。

## 検証証拠
- 統合候補 `2a7bbd6510c1ef7b50e8d004f1667042be7356fa`。
- LEAD: 統合checkoutで `npm run check` 成功。
- LEAD: 固定候補のQA worktreeで `npm ci && npm run check` 成功。
- 独立QA: `npm run check` を再実行。型検査・4 files / 103 tests成功。bootstrap限定PASS、MVP公開BLOCKED。
- GitHub CI `quality`: 成功。https://github.com/ikdsk/mtg-card-scanner/actions/runs/37183790094
- QA証拠はrepoの `docs/qa/kickoff-review.md`、`docs/qa/kickoff-verdict.json`。TDD報告は `docs/reports/`。

## 未完了・制約
実カメラ・UI・認識モデル・live Scryfall/FXは未接続。実カード精度、iPhone/Android実機性能、初回・再訪の体感待ち時間は未計測。単体テストfixtureは合成であり、製品性能の証拠ではない。

API adapter接続前にtimestamp文法、世代/revision上限、型外入力検証と価格対象一致・鮮度を明文化する。通常利用で到達しない巨大なrevisionのoverflowは設計保留としてQAに記録されている。

旧Astra実装担当はユーザー指定のSolへの変更時に停止。旧worktreeは途中成果を失わないよう保持し、そのコードは統合していない。Codex CLI更新後のgpt-6.1-sol接続は確認済み。今回のSol実装は先に起動したHermes CLI workerで完了した。

## 次の開発単位
Camera-firstカメラシェル・計測、認識エンジン実機検証、日本語メタデータとScryfall/FX adapterを契約に従い並行開発する。P0成功をMVP完成とみなさず、P1の採用判断と実測へ進む。
