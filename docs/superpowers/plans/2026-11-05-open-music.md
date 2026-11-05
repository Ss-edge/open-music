# Open Music Implementation Plan

> **For agentic workers:** Use subagent-driven-development to implement isolated tasks and review their integration. Steps use checkbox syntax for tracking.

**Goal:** Deliver the requested working Windows music app with a coherent Spotify-inspired UI and reliable lyrics.

**Architecture:** Preserve the existing player/plugin/store architecture. Replace shared shell and component styling. Repair desktop lyric behavior at its native/preload source, keeping hardened windows and guarded IPC.

**Tech Stack:** Electron 37, Vue 3, TypeScript, Vite, Pinia, SCSS, Playwright.

## Global Constraints

- Work at D:\open music on codex/open-music-ui.
- Preserve opaque sourceContext, main-process-only database access, Zod plugin validation and IPC hardening.
- No invented user data, accounts, or test outcomes.
- Desktop lyrics never steal focus and stay readable when locked and idle.

### Task 1: Desktop lyric repair

Files: src/preload/osdWin.ts, src/main/index.ts, targeted tests.

- [x] Execute locked pointer-idle behavior with controlled timer and record the upstream failure.
- [x] Remove whole-content fade while preserving toolbar behavior/pointer passthrough.
- [x] Set focusability and topmost before showing, capture the created window in lifecycle handlers and verify rapid reopen/mode changes.
- [x] Run behavioral regressions and actual Electron focus/visibility checks.

### Task 2: Playback and lyric UI

Files: PlayerBar.vue, PlayPage.vue, CommonPlayer.vue, LyricPage.vue, locales as needed, playback tests.

- [x] Add failing interaction coverage for artwork-click lyric entry independent of clickToLyric.
- [x] Recompose the bottom player into artwork/controls/progress/utilities while reusing real store actions.
- [x] Style focused lyrics with large cover and synchronized text; add accessible close and empty states.
- [x] Verify queue, seek, volume, lyric entry/exit and no-track behavior.

### Task 3: Application shell and reusable surfaces

Files: App.vue, SideNav.vue, NavBar.vue, CSS tokens/theme, existing shared components.

- [x] Build labeled sidebar, dark panel layout, search/header, and accessible controls.
- [x] Apply common tokens to cards, lists, settings, login and modal surfaces.
- [x] Retain enabled source conditions, routing, native title controls and focus states.
- [x] Verify at normal and minimum desktop window widths.

### Task 4: Home and content presentation

Files: HomePage.vue, CoverRow.vue, CoverBox.vue, DailyTracksCard.vue, FMCard.vue.

- [x] Recompose content into Spotify-like shortcuts and music shelves using actual recommendation data.
- [x] Offer useful empty/unavailable states without synthetic music.
- [x] Retain routing, plugin calls and playback actions.

### Task 5: Integration and delivery

- [x] Run renderer/main type checks, targeted lint/format, production build, existing Playwright tests, and new regressions.
- [x] Capture standard and compact screenshots; independently review changed UI and lyric repair.
- [x] Package runnable Windows output if native dependency/toolchain availability permits.
- [x] Record exact commands/results, remaining external limitations and rollback steps.
