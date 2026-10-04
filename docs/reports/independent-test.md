# 独立契約回帰テスト（未統合）

## 対象と独立性

- Branch: `test/independent-regressions`
- 作成基準 SHA: `8ac6be91df807b0c34ea066272e510a8a926697e`
- 専用 worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/test`
- `AGENTS.md`、`docs/development-plan.md`、`docs/contracts.md`、`docs/agent-briefs.md` に従い、契約のみから作成。実装コード・実装者テストは閲覧していない。
- 今回は親からの明示指示により、統合候補ではなく実装未存在の base で独立テストを先行作成。production、root 設定、lockfile は変更しない。fixture は全件合成であり、実価格や認識結果ではない。

## 作成ファイルと対象

- `tests/regression/pricing-contract.test.ts`
  - 欠損とゼロ、空白 trim、通貨表示、不正 USD、桁あふれ。
  - FX 不在・ゼロ・負・非有限値で USD 維持。
  - 閏年・世紀年・存在しない日付・timestamp 内の不正日付の拒否と有効 ISO 日付／timestamp。
  - JPY 半端切上げの上下境界、decimal 積（`100 × 1.005` など）、安全整数の USD cents／JPY 境界と FX のみの overflow。
- `tests/regression/selection-contract.test.ts`
  - 初期状態、認識、値として等しい選択の冪等性、各選択フィールド変更。
  - 誤世代の認識拒否、手動固定、遅い価格応答、同一値の再手動選択でも revision 更新。
  - 次スキャンの reset、同一 revision が再登場しても旧世代 token を拒否、連続 reset。
  - generation/revision の両一致、入力 selection の clone、入力 state 非破壊、token snapshot。
- `docs/reports/independent-test.md`（本報告）。

## 実行したコマンドと実測結果

環境: Node `v24.2.0`、npm `11.3.0`。

1. `npm ci`: exit 0。83 packages added、84 audited、0 vulnerabilities。
2. `npm run check`: exit 1。`tsc --noEmit` が次の TS2307 で停止し、後続 `npm test` は未実行。
   - `tests/regression/pricing-contract.test.ts(2,38)`: `../../src/domain/pricing.js` 未解決。
   - `tests/regression/selection-contract.test.ts(2,105)`: `../../src/domain/selection.js` 未解決。
3. `npm test -- tests/regression`: exit 1。Vitest `v5.0.3`、2 suites failed、`Tests no tests`。同じ両 module の import 解決失敗により収集不能。

**現時点未統合。挙動 assertion は実行されていない。これは挙動検証の RED 成功ではなく、未統合による import blocker である。GREEN／回帰合格は未確認。** 未存在モジュールを stub/mock で代替していない。親が PRICE/STATE と本コミットを候補へ統合し、その固定 SHA で `npm run check` と全テストを再実行する必要がある。統合後の型エラー／挙動差異があれば所有担当へ返す。

## 契約の曖昧さ・親への確認事項

- ISO timestamp の許容範囲（timezone 無し、基本形式、拡張年、24:00、leap second）は未列挙。今回は明白な extended ISO date、Z／数値 offset の通常時刻だけを有効ケースとし、曖昧な形式を断定するテストは作らない。
- USD 文法の `.5`／`1.`／先頭 `+`／先頭ゼロの許否は明示されていないため保留。
- generation/revision の安全整数上限、非整数・NaN の不正入力時の動作は未定義。通常生成される状態だけを対象にし、上限時の例外や reset を勝手に規定しない。
- 契約は参照同一性や no-op 時の新規オブジェクトを要求しないので、状態の値を検証する。token は型が mutable なため返却後の書換えによって元 state が変化しないことを検証。
- 最大安全 USD cents は受理を検証するが、その極大値における小数ラベルの厳密性は追加確認の余地がある（実装の Number 変換による精度落ちに注意）。

## 限界

実 HTTP、Scryfall/FX の鮮度・対象一致、カメラ、UI、実カード認識、端末性能は NOT RUN。bootstrap token はセッション保護であり、実際の価格対象一致の証明ではない。公開や push は行わない。
