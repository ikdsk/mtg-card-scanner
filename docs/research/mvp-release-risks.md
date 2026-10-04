# MTG Card Scanner — 独立 release-risk review

確認日: **2026-10-04（JST）**。対象: CollectorVision WASM → Scryfall 日本語情報・USD価格 → Frankfurter USD/JPY の Web MVP。

**結論: 自分だけのローカル検証は継続可能と考えられるが、第三者への配信は権利・表示・API制御のゲートを通すまで保留。private GitHub repository であることは、AGPL の配信／ネットワーク義務の免除ではない。** 以下は一次資料に基づく実務レビューであり、法的適合の保証や法律意見ではない。

既存 `docs/research/recognition.md` を読んで、同資料の CollectorVision 固定revisionとモデルカードを直接再取得した。実装コードの監査・実機通信検証は今回の範囲外。したがって以下の「ブロッカー」は未解消のリリース条件であり、実装に違反が存在すると認定するものではない。コード変更、外部への問い合わせ、公開デプロイ、契約・課金、ユーザーデータアクセスはしていない。

## 1. ユーザーが判断すること

1. **AGPL準拠で対象ソースを受領者・利用者へ提供するか、別ライセンスの正式grantを得るか。** 無料の非商用ライセンスという案内はあるが、自動適用される免除ではない。現時点で個別grant取得の証跡は本レビューに提示されていない。金額・交渉成立・将来の無料提供を約束しない。[1]
2. **第三者向け公開範囲と収益化の有無。** CollectorVisionを商用契約しても、ScryfallデータやWizards画像への課金まで許されるわけではない。公開MVPは匿名で無料のカード情報閲覧を基本案とする。別の有料機能は別途検討。[7][12]
3. **モデル／カタログの不明な権利範囲を解消してから配布するか、認識方式を変更するか。** 作者への確認が必要なら、質問案・対象資産を整理したうえでユーザーが連絡を承認する。今回は連絡していない。

## 2. CollectorVision — 四つの権利を分離

| 対象 | 一次資料で確認できたこと | 公開前の不足・実務対応 |
|---|---|---|
| コード・ブラウザー用ライブラリ | CollectorVision公開既定はAGPL-3.0。別非商用／商用経路は存在するが、権利は別途のlicense grantから生じる。[1][2] | 実際に流用・改変・結合したファイルとビルド成果物を棚卸し。AGPL対象範囲、著作権表示、変更日、ライセンス本文、Corresponding Sourceの提供経路を決める |
| Cornelius / Milo 重み | 固定モデルカードの両方が `license: agpl-3.0`。Corneliusは `9280009f5a66f75f952820d9dadb894909b759b7`、Miloは `9bcc5e809e936b8c5630d1e7101aae1de1e76621`。[3][4] | ONNXの配布・量子化等の変換・再ホストを含む権利と、モデルにとっての「改変に適した形」の範囲を確認。モデルカード表示だけで学習素材や基盤モデルの権利連鎖まで保証されたとは扱わない |
| カタログのソフトウェアと配布データ | CatalogのLICENSEはMITで「Software」を対象とし、著作権・許諾表示の保持を要求。feedはMTGをScryfall default cards由来の英語優先paper printingsと明記。[5][19] | 埋め込みとrecordsの利用・キャッシュ・再配布を、MITの一語だけで包括的に許諾済みとしない。データ専用の明示条件、Scryfall由来データの条件、派生埋め込みの位置付けは未確認。無断の汎用ミラーを作らない |
| カード画像・文字情報 | Scryfall API利用条件とWizards Fan Content Policyが別に適用される。[7][12] | AGPL/MIT/商用モデル契約はカード画像の権利ではない。画面表示、内部前処理、学習・特徴量生成、再配布を分けて判断。今回取得した資料では埋め込み生成／配布を明示的に許諾する条項は確認できなかった |

### ローカル、限定共有、Web配信の境界

- **自分だけのローカル実行・私的改変**: AGPL §2 は非conveyの作成・実行等を許しており、このコードライセンスだけを理由に個人検証を止める必要はない。ただしデータ・画像の別条件や、実際に第三者にコピーを渡したかは別問題。[2]
- **Webクライアント配信**: JS/WASM等の対象コードを他者のブラウザーへ渡す構成では、サーバーで推論していなくても「コピーの配信」を検討する。AGPL §§4–6 の表示とCorresponding Source提供が論点。minified JS／WASMだけ、上流へのリンクだけで自分の改変やビルド手順が欠ける状態は不十分となり得る。[2]
- **ネットワーク提供**: AGPL §13 は「改変した版」とリモートに対話する全利用者に、その版のCorresponding Sourceを無償で取得できる機会を目立つ形で提供することを要求する。インターネット一般公開だけを条件とする文言ではなく、限定公開・LAN・招待制を自動免除とはしない。一方、未改変プログラムのあらゆるネットワーク実行が必ず§13の公開義務を生む、とも断定しない。[2]
- **private repoとの関係**: 義務の基準はリポジトリの可視性ではなく、対象の配信／改変版とのネットワーク対話。private repoを維持しながら適切な対象ソースアーカイブを提供する設計もあり得る。無関係なprivate repo全体を自動的に一般公開する義務と混同しない。ただし結合された一つの対象作品か、独立した集積物かは実装を確認して判断する。worker分離や別URLだけでは独立性の証明にならない。[2]
- **別契約**: sponsorshipやPatreon支払自体は許諾証書ではない。コードだけでなく重み・対象バージョン・ブラウザー再配布・カタログ・更新範囲をgrantに明記できるか確認する。上流の案内には正式な代替ライセンス本文を別途公開する可能性も記されている。[1]

## 3. Scryfall — 実装時に守る条件

### データ利用、画像、attribution

Scryfallは追加のMagicソフトウェアや研究・コミュニティコンテンツのために無料でデータを提供するが、データのpaywall、単なる再包装・再公開・proxy、他ゲーム用への転用、Scryfall公認と誤認させる名称・ロゴ利用を禁止している。スキャナーは付加価値を持つ方向だが、自動的な包括承認ではない。[7]

**Scryfall自身への定型attribution文の必須指定は、取得したAPI本文では確認できなかった。** それでも出典透明性のため「カード情報・参考価格: Scryfall」と該当カードの `scryfall_uri` を表示することを推奨する。ロゴや「公式」表現は使わない。これは推奨UIと、明示された必須条件を区別した判断。[7][10]

画像は著作権・artist名を隠すcrop/clipや、歪み、色変更、独自watermark等が禁止。`art_crop` を使用する場合は同じinterfaceにartist名・copyrightを掲載するか、同じinterfaceに完全なカード画像を置く必要がある。結果カードは原画像の縦横比を維持する案を推奨。端末カメラの一時的な認識用射影補正とScryfall画像の公開加工を同一扱いしないが、学習／内部処理だから無条件に例外とも断定しない。[7]

Wizardsは非公式であることを明記する定型文を提示している。採用するなら、例えばタイトルを差し替えた次の文をabout/creditsに掲示する。[12]

> MTG Card Scanner is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.

Wizards側はFan Contentへの支払・subscription・email registration等の要求を禁止しており、Scryfallが無料アカウントを許す記述だけで全条件を満たすとは限らない。匿名無料公開を基本案にする理由はここにもある。ロゴ、サービス名・ストア説明、第三者IPを含むカード素材は別途確認し、モデルの商用契約で代替しない。[7][12]

### レート制限: 「一律10 requests/sec」は現時点では誤り

確認日の公式hard limitsは次の通り。[15]

| APIメソッド | 上限／間隔 |
|---|---|
| `/cards/search`, `/cards/named`, `/cards/random`, `/cards/collection` | 各2/秒（500ms） |
| `/cards/manifest` | 10/分（6,000ms） |
| その他 | 10/秒（100ms） |

`*.scryfall.io`の直接ファイルoriginには同じrate limitはないが、画像利用条件は残る。429を受けると30秒の制限となり、無視して過負荷を続けるとアプリの一時／永久blockがあり得る。公式は大量のカード名・価格・画像解決にはbulk利用を要求している。[15]

**推奨ゲート**: 検出フレームごとにAPIを発火しない。候補IDの安定化、同一IDの重複排除、検索用500ms以上のキュー、他endpointにも余裕を持った上限制御、429時は最低30秒の停止とbackoffを検証する。ブラウザー・タブ・共有ネットワーク等の合算を考え、hard limit直前を狙わない。HTTPはHTTPS必須、`Accept`と正確な`User-Agent`が必要。ブラウザーJavaScriptではブラウザーのUser-Agentをそのまま使用するのが公式指示で、無理に上書きしない。[7][15]

### キャッシュと価格

- 公式はダウンロードデータの**少なくとも24時間のキャッシュ**を推奨し、価格更新は1日1回、24時間より頻繁に取得しても新価格にならないとしている。ゲーム情報のみなら週1回／セット公開後で十分な場合がある。[15]
- 一方bulk価格は24時間経過後を「dangerously stale」とし、概算や傾向把握用で、店舗販売システムの価格を支えるには更新頻度が不足すると明記する。これは「毎秒再取得」ではなく、適切な日次更新と古さの表示で対処する。[11]
- `prices`は日次情報で `usd` / `usd_foil` / `usd_etched` 等の文字列を持つ。日本語名用のカードと価格対象の版・言語・finishを混同しない。価格欠損を0円として扱わず、手動版選択後の対象も表示する。[10]
- 価格は情報提供用で無保証、最終価格は店舗確認。**「Scryfall USD参考価格」「円換算概算」「国内相場・買取価格・確約価格ではない」**と表示する。取得時刻をScryfall側の価格更新時刻だと偽らない。[16]

## 4. Frankfurter — API無料と為替データの権利は別

**重要な更新点**: 確認日の現行v2は複数central banks／official sourcesを既定でblendする。単に「Frankfurter = ECB」と書くのは不正確。v2でECBを根拠とするなら `providers=ecb` または `/v2/providers/ecb/rates` 等を明示的に使う。汎用v2なら `expand=providers` で寄与providerを確認し、各providerの条件を確認する。[9]

| 項目 | 確認事項と対応 |
|---|---|
| 料金・キー | 公開APIはキー不要、商用利用にも無料とのFAQ。ただし将来の提供やSLAを約束するものではない。[9][18] |
| 利用上限 | daily/monthly quotaはないが、不正利用防止のrate limitingはある。「無制限だから連続照会可」としない。高頻度ならcache/self-host等が推奨。[9] |
| 更新 | v1は最新営業日の値、毎日16:00 CET頃更新。v1はdeprecatedだが継続提供とされる。v2一般は日次中心だが非日次providerもあり、blendから除外される。採用endpointに合う説明をする。[9][17] |
| ライセンス | ソフトウェア・docs・DockerはMIT。為替値はproviderの条件が適用され、Frankfurterはprovider以上の権利を与えない。[18] |
| 無保証 | 欠損・遅延・改定があり、blendはFrankfurter独自計算であって特定機関の公式レートではない。[18] |
| ECB限定の場合 | ECB条件は正確な再掲、ECB出典明示、加工した場合の明示を要求。有償文書への掲載には無料で取得できる旨の告知条件もある。[14] |

**MVPへの推奨**: ソース条件を狭めるためECB指定の経路を選び、USD→JPYの基準・対象通貨・provider・応答の `date` と取得時刻を保存する。v1採用の場合も実際のendpointとデータ由来を固定して記録する。今回のレビューでは稼働中実装のendpointは未監査であり、ECB固定済みとは報告しない。

円換算は「USD参考価格に参考為替を掛けたアプリ算出値」とし、FX営業日を表示する。休日に前営業日が返ることと障害によるstale cacheを区別する。日次cacheで同一セッションの全カードに再利用し、失敗時はUSDだけ表示／古いFXであることを明示する。最新レート・実際の決済レート・日本市場の価格とは称さない。これは日次更新と無保証条件を踏まえた推奨設計。[9][17][18]

## 5. 配信・プライバシー上の実務リスク

- **資産の外部ホスト依存**: GitHub Pages／Hugging Face等への直接参照は配信停止・変更・CORS・キャッシュ不整合を考慮する。採用revision・model hash・catalog版を固定し、ライセンス証跡と一緒に記録する。勝手なミラー作成で解決しない。重みとカタログの再配布範囲が不明なままサービスワーカーへ同梱しても問題は解消しない。
- **ソースと第三者データの分離**: ソース公開経路を作る場合、秘密情報・ユーザー撮影画像・配布権未確認の第三者データを混ぜない。AGPL対象の提供範囲と第三者素材の別条件を一覧化する。[2][7]
- **「画像を送らない」と「外部通信ゼロ」は別**: 端末内認識でも、モデル／catalog取得、カードID検索、画像表示、FX取得は外部通信。公開前に実通信を検査し、どのoriginに何を送るか説明する。今回カメラ画像やユーザーデータは参照しておらず、実装が非送信であるとの確認もしていない。
- **供給元停止時の挙動**: 認識・情報・価格・FXを分離し、429／offline／欠損はエラーやstale表示で扱う。架空の価格・レート・認識結果で穴埋めしない。Scryfallにも提供中断・変更と無保証の条件がある。[16]

## 6. 公開前チェックリスト／ブロッカー

以下はすべて公開判断時に証跡を残す。未確認のまま外部デプロイしない。

- [ ] **BLOCKER — 許諾経路の決定**: AGPL準拠か別grantかをユーザーが選択。private repo継続だけでは解消しない。[1][2]
- [ ] **BLOCKER — 配布資産の権利表**: コード・ONNX重み・埋め込み・records・画像・runtime依存を個別に記録。モデル／カタログの公開配布上の不明点を解消する。これは「違法と確定」ではなくレビュー未完了のブロック。[3][4][5]
- [ ] **AGPL採用時**: 対象作品の範囲、変更表示、ライセンス、ビルド・導入に必要なCorresponding Source、UI上の取得導線を確定し、第三者の視点で取得を検証する。privateな開発履歴全体の公開と混同しない。[2]
- [ ] **Scryfall**: endpoint別hard limit、429の30秒停止、重複排除、24時間cache、欠損・stale表示を実通信とテストで確認。[15]
- [ ] **画面表示**: Scryfall出典リンク（推奨）、Wizards非公式表示、artist/copyright保持、paywallなし、商標・ロゴ誤認なしを確認。[7][12]
- [ ] **価格・FX**: 選択版・言語・finish、参考USD、概算JPY、FX provider/date、取得時刻を明示。日本語メタデータの取得で価格対象を無断変更しない。FX source条件を固定・確認。[9][10][14]
- [ ] **実配信検証**: 実カメラの非送信、外部通信先、資産の固定・更新・削除、障害時の挙動を確認。今回NOT RUN。
- [ ] **公開の明示承認**: 上記証跡を提示してユーザーが承認するまで、公開deploy、ライセンス申込、外部連絡、課金を行わない。

## 7. 調査の限界と取得結果

一次資料は直接HTTP取得。`web_extract`は設定されたsearch-only backendでは使用できず、標準ライブラリによる取得へ切り替えた。一部サイトは既定User-Agentで403だったが、調査用User-AgentとAcceptを付けた正規リクエストで本文を取得できた。Scryfallの想定URL `/docs/terms-of-service` は404で、公式ページ内リンクから `/docs/terms` を発見・確認した。アクセス制御の回避、認証、外部問い合わせはしていない。

固定revisionのCollectorVision条件は今回の採用候補の証跡であり、上流mainの将来変更を保証しない。Catalog/Scryfall/Frankfurter/ECB/Wizardsの可変URLは確認日現在の本文。実際の配布バージョンと公開日の再照合が必要。重み・大容量catalog・カード画像のダウンロードは行わず、モデルカード・feed・条件本文を調べた。モデルのsource範囲、学習素材の権利連鎖、カタログ埋め込みの明示的再配布条件、実装への適用範囲は残課題。

## Sources

[1] https://raw.githubusercontent.com/HanClinto/CollectorVision/2a122d00d25c8d112a90e47bf235a021e0c53b0c/COMMERCIAL_LICENSE.md
    > "the actual software rights come from a separate license grant issued by the
copyright holder."
[2] https://raw.githubusercontent.com/HanClinto/CollectorVision/2a122d00d25c8d112a90e47bf235a021e0c53b0c/LICENSE
    > "You may make, run and propagate covered works that you do not
convey, without conditions so long as your license otherwise remains
in force."
    > "your modified version must prominently offer all users
interacting with it remotely through a computer network"
[3] https://huggingface.co/HanClinto/cornelius/raw/9280009f5a66f75f952820d9dadb894909b759b7/README.md
    > "license: agpl-3.0
library_name: collectorvision"
[4] https://huggingface.co/HanClinto/milo/raw/9bcc5e809e936b8c5630d1e7101aae1de1e76621/README.md
    > "license: agpl-3.0
library_name: collectorvision"
[5] https://raw.githubusercontent.com/HanClinto/CollectorVisionCatalog/main/LICENSE
    > "The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software."
[7] https://scryfall.com/docs/api
    > "You may not simply repackage, republish, or proxy Scryfall data."
    > "Do not cover, crop, or clip off the copyright or artist name on card images."
[9] https://frankfurter.dev
    > "By default, rates are blended across all providers."
    > "There are no quotas. Requests are rate-limited to prevent abuse, but there are no monthly or daily caps."
[10] https://scryfall.com/docs/api/cards
    > "An object containing daily price information for this card"
[11] https://scryfall.com/docs/api/bulk-data
    > "prices should be considered dangerously stale after 24 hours"
[12] https://company.wizards.com/en/legal/fancontentpolicy
    > "You can’t require payments, surveys, downloads, subscriptions, or email registration to access your Fan Content;"
[14] https://www.ecb.europa.eu/services/disclaimer/html/index.en.html
    > "When such information is distributed or reproduced, it must appear accurately and the ECB must be cited as the source."
[15] https://scryfall.com/docs/api/rate-limits
    > "/cards/search — 2/second (500ms)"
    > "We encourage you to cache the data you download from Scryfall or process it locally in your own system, at least for 24 hours."
[16] https://scryfall.com/docs/terms
    > "Price data is for informational purposes only"
[17] https://frankfurter.dev/v1
    > "Fetch the latest working day's rates, updated daily around 16:00 CET."
[18] https://frankfurter.dev/license
    > "Frankfurter doesn't own the rates, so it can't give you rights the provider doesn't."
[19] https://raw.githubusercontent.com/HanClinto/CollectorVisionCatalog/main/catalog-feed-v2.json
    > "English-first paper printings from Scryfall default cards."
