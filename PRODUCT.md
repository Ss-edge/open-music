# Open Music

<!-- impeccable:product-schema 1 -->

## Platform

web

Vue application inside Electron, with native Windows, macOS and Linux integration. This task targets Windows.

## Product Purpose

A desktop music player combining online plugins, local files, and streaming servers. Preserve existing sources, authentication, library, queue, playback, effects, and synchronized lyrics.

## Operating Context

The user requested a local clone at `D:\open music`. Users listen while working in other applications and need desktop lyrics to remain readable without taking focus.

## Capabilities and Constraints

- Reuse Electron 37, Vue 3, TypeScript, Pinia, existing IPC guards, and plugin contracts.
- Album artwork at the bottom left must open the in-app lyric view regardless of the optional whole-bar click setting.
- In-app and desktop lyrics use existing song/lyric state, including timed and word-by-word lyrics.
- Keep sourceContext opaque and all database operations in the main process.
- Empty and unauthenticated states must offer real recovery actions. Do not invent music, listening history, or account data.

## Brand Commitments

- Local project name: Open Music.
- Confirmed user references: Spotify for the main application UI, NetEase Cloud Music for playback and lyrics. Confirmed through the direction question on 2026-11-05.

## Evidence on Hand

Upstream README, AGENTS.md, architecture docs, existing Vue components and real plugins. No user account credentials or personal music files supplied.
