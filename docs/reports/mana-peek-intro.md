# Mana Peek intro and navigation implementation

Date: 2026-10-05. Sole implementation writer: GPT-6.1-Sol (`gpt-6.1-sol`).
Dedicated worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/mana-peek-intro`.
Branch: `feat/mana-peek-intro`. Base/unchanged HEAD: `48618a5a7a415dccd5e95fb3e7ae2213f5fbd3c9`.
No commit, push or deployment was made. AGENTS.md, development plan, contracts and agent briefs were read before editing. User task explicitly supersedes the older candidate wording/navigation in the contract; contract files were not edited.

## Changes

- Document title and visible small header are Mana Peek. Idle camera space shows the exact requested Japanese introduction. Starting permission and active capture hide it immediately; verified file candidates hide it despite the stopped camera. Stop/no candidate restores it. Camera/model statuses, permission errors and explicit-only camera permission remain separate.
- Bottom navigation has only 名前検索 and 履歴. Top-right gear opens settings. Candidate detail retains 版・言語・加工を変更. History retains row reopening and a visible 選択中のカードを確認 action when a selected card exists, preserving the current manual selection without inventing a hidden navigation button. The existing result route/dialog remains.
- Removed the two duplicated candidate headings and all runtime `もしかして？`. Candidate accessible name is 認識候補; announcement is 候補を確認できます. Seven compact format badges, the single existing SVG scan/stop toggle, detail snapshot, optional save and manual/history flows remain.
- No recognition threshold, provider, worker, capture pipeline, dependencies, package/lock/configuration or contract changes. No additional startup request, image upload or asynchronous startup gate was introduced.

## Sequential TDD evidence

Actual commands were executed in the sequence below. Logs are preserved under ignored `artifacts/mana-peek-intro/`; REDs were expected behavior failures, not infrastructure failures.

1. Intro/title/lifecycle behavior:
   - `npm run build` then `MVP_PORT=4297 npm run test:e2e -- tests/browser/mana-peek-intro.spec.ts --project=desktop`
   - RED: 2 failed, expected Mana Peek title but actual MTG Card Scanner (`red1.log`).
   - Added intro/title and lifecycle visibility; repeated same build/test commands.
   - GREEN: 2 passed (`green1.log`). Synthetic deferred permission tests explicitly verify zero camera permission calls before click, intro hidden during pending permission and restored after stop, header visible at 320/390.
2. Two-entry bottom navigation behavior:
   - `MVP_PORT=4297 npm run test:e2e -- tests/browser/mana-peek-intro.spec.ts --project=desktop --grep 'bottom navigation'`
   - RED: 1 failed, actual four buttons versus expected 名前検索/履歴 (`red2.log`).
   - Removed nav entries, retained routes via gear/detail/history, adapted helper; `npm run build` then same targeted command.
   - GREEN: 1 passed (`green2.log`). Verifies removed buttons have count zero and real gear opens settings.
3. Neutral candidate status behavior:
   - `MVP_PORT=4297 npm run test:e2e -- tests/browser/candidate-immersive.spec.ts --project=desktop --grep 'neutral status'`
   - RED: 2 failed, expected aria-label 認識候補 but actual もしかして？ (`red3.log`).
   - Removed duplicate headings and changed accessible status; `npm run build` then same targeted command.
   - GREEN: 2 passed (`green3.log`). Verifies no phrase in body, neutral status, hidden intro, visible header and seven badges at 320/390 using labeled synthetic worker/provider/camera fixtures.

Existing file-input regression additionally asserts a displayed candidate hides intro while the scan-start button remains visible. Existing test helpers now use the gear, candidate detail/manual action, or history current-card action. Direct settings/result navigation clicks were similarly updated. Old header text assertions were updated to the approved title. No assertion was deleted to mask a behavior regression; no test skip, threshold relaxation or hidden duplicate button was introduced.

## Final validation

- `npm ci`: PASS, 87 packages added, 88 audited, zero vulnerabilities.
- `npm run check`: PASS, TypeScript and 22 test files / 168 tests (`check.log`).
- `npm run build`: PASS (`build-final.log`). Vite: 26 modules; HTML 0.44 kB, CSS 21.85 kB (gzip 4.94), JS 59.34 kB (gzip 20.91). Includes the small header visibility fix for short viewports.
- `MVP_PORT=4297 npm run test:e2e`: final result recorded below.
- `git diff --check`: PASS.

## Screenshots and visual inspection

Full-run desktop Chromium screenshots were copied to ignored artifacts and visually inspected with `view_image`:

- `artifacts/mana-peek-intro/mana-peek-idle320.png`
- `artifacts/mana-peek-intro/mana-peek-idle390.png`
- `artifacts/mana-peek-intro/mana-peek-active-candidate320.png`
- `artifacts/mana-peek-intro/mana-peek-active-candidate390.png`

Additional pending-permission screenshots: `mana-peek-starting320.png` and `mana-peek-starting390.png` in the same directory. Idle copy is legible in the camera area and does not overlap toolbar/status. Active candidate images show small Mana Peek header, single stop toggle, real geometry rendering from synthetic corners, seven compact badges, prices, save/dismiss and exactly two bottom nav controls. Active pixels/card image/prices are labeled SYNTHETIC / TEST ONLY fixtures, not live recognition/provider evidence.

## Limits

Real iPhone Safari, Android devices, real camera/recognition accuracy, live provider behavior and real-device startup/scan latency: NOT RUN. Desktop Chromium mobile viewport emulation is not a phone. Preload/one-inflight/no-permission-until-click regressions pass, but no new real latency claims are made. Independent TEST/QA and pinned committed combined-candidate validation in a separate worktree: NOT RUN in this sole-writer implementation task; no new commit was authorized. No public deployment or image upload. No implementation blocker remains if the final suite below passes.
