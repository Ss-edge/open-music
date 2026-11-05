# Open Music design and repair

User-authorized scope: clone upstream into D:\open music, replace the application UI using Spotify as the primary reference, offer an in-app lyric view from the bottom-left artwork, and fix disappearing desktop lyrics. The user explicitly confirmed Spotify for the main UI and NetEase Cloud Music for playback/lyrics on 2026-11-05.

## Design

Use a near-black application background, separate charcoal sidebar/content panels, Spotify green actions, white type, muted secondary text, and compact rounded search/filter controls. Replace floating icon navigation with a persistent labeled library sidebar and Open Music identity. Rebuild the shared shell, top navigation, reusable cards/rows, authentication/settings surfaces, and player bar so all existing routes inherit a coherent system.

The player uses artwork and track information at left, playback controls and progress centrally, queue/desktop lyrics/volume at right. Artwork is a keyboard-accessible button that opens the full lyric view unconditionally when a track exists. The lyric view places substantial artwork and song information beside synchronized lyrics, preserves translations/seek/settings, and supports close/Escape. No lyric available has an honest visible message.

Use existing real data and source availability. Home includes a clear heading and useful entry paths even when recommendations are unavailable. Do not fake a library or account. Support Electron's minimum window and larger desktop sizes; labels may collapse at narrower sizes. Native window controls remain functional and draggable areas do not cover controls.

## Desktop lyric diagnosis and fix criteria

Investigate preload transparency and native window stacking separately. Locked desktop lyrics must remain readable when pointer motion stops, retain pointer passthrough, and never steal another app's focus. Window creation must set focusability/topmost before showing and avoid delayed callbacks accessing a replaced window. Do not reshow a window the user has explicitly hidden.

## Verification

Use a failing regression for locked/idle opacity before fixing, exercise actual Electron window visibility/topmost/focus and rapid mode changes, and test real artwork-click lyric entry plus close behavior. Run renderer/main type checks, targeted lint/format checks, production build, and existing integration/security tests. Inspect desktop screenshots at standard and compact sizes. Separate external account/API limitations from local regressions.

## Scope, effects and rollback

No database schema changes. New default theme affects fresh profiles; retain existing user choices. Keep changes on codex/open-music-ui, with upstream main untouched. Rollback by returning to main or reverting individual commits; do not remove personal user-data directories. Native stacking changes are platform-specific and require Windows runtime evidence. Online playback remains subject to upstream service and account availability.
