# Open Music QA inventory

Date: 2026-11-05 (Asia/Shanghai). Upstream baseline: 843f934.

## Required checks

- Local checkout exists at D:\open music, upstream origin retained, feature branch isolated.
- Standard 1440x900 and minimum 1080x720 native Electron windows: labeled sidebar, functioning top search, charcoal surfaces, music shelves or honest empty states, native controls, no clipping/overlap.
- Source/library/local/settings navigation uses existing router guards. No account data fabricated.
- Search remains open after outside click and submit; user can enter another query. Search source refresh/fallback remains usable.
- Artwork button opens in-app lyrics even with general.clickToLyric=false; no-track entry is disabled. Explicit close/Escape returns to previous route without interrupting playback. Inspect loaded lyrics and no-lyrics states.
- Exercise playback/pause, previous/next, volume/mute, seek, repeat/shuffle, queue and desktop lyric toggle with an isolated controlled audio fixture where possible.
- Desktop lyrics: topmost and non-focusable before show, remain visible while another normal app window has focus, locked pointer-idle does not fade text, main minimize preserves overlay, rapid hide/show and mode changes cannot revive old windows.
- Intentional desktop lyric off remains off. Lock preserves pointer passthrough.
- Keyboard focus states, reduced motion, long song titles and compact layouts are checked in affected surfaces.
- Existing security/integration tests and new behavioral regressions, renderer/main type checks, targeted ESLint/Prettier, production build, git diff whitespace.

## Test boundaries

Use isolated temporary profiles, never personal accounts or personal music directories. Any generated audio/lyrics are explicitly synthetic regression fixtures. An external service failure is not evidence that account-specific music features passed. Native window state checks establish behavior for ordinary Windows applications; exclusive fullscreen applications and UAC desktops need separate evidence.

## Results

Results, screenshots, exact commands and limitations are recorded after execution in the delivery report.
