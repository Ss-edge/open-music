---
name: Open Music
description: A desktop listening workspace with a persistent library and immersive synchronized lyrics.
colors:
  primary: 'rgba(30, 215, 96, 1)'
  app: '#000000'
  surface: '#121212'
  raised: '#1f1f1f'
  text: '#ffffff'
  muted: '#b3b3b3'
  border: 'rgba(255, 255, 255, 0.1)'
  tile: 'rgba(255, 255, 255, 0.08)'
  light-app: '#e8e8e8'
  light-surface: '#ffffff'
  light-raised: '#f5f5f7'
  light-text: '#000000'
  light-muted: '#7a7a7b'
  light-border: 'rgba(0, 0, 0, 0.2)'
typography:
  headline:
    fontSize: '30px'
    fontWeight: 750
    lineHeight: 1.25
    letterSpacing: '-0.025em'
  title:
    fontSize: '23px'
    fontWeight: 750
    lineHeight: 1.35
    letterSpacing: '-0.025em'
  body:
    fontFamily: "'Segoe UI Variable', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: '14px'
    lineHeight: 1.5
  label:
    fontSize: '12px'
rounded:
  artwork-small: '4px'
  control: '6px'
  panel: '8px'
  pill: '24px'
  circle: '50%'
spacing:
  compact: '4px'
  gutter: '8px'
  small: '12px'
  regular: '16px'
  medium: '20px'
  large: '24px'
  content: '28px'
  section: '32px'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.light-text}'
    rounded: '{rounded.pill}'
    padding: '12px 18px'
  button-inverse:
    backgroundColor: '{colors.text}'
    textColor: '{colors.app}'
    rounded: '20px'
    padding: '7px 16px'
  chip:
    backgroundColor: '{colors.tile}'
    textColor: '{colors.text}'
    rounded: '{rounded.pill}'
    padding: '8px 16px'
  chip-selected:
    backgroundColor: '{colors.text}'
    textColor: '{colors.surface}'
    rounded: '{rounded.pill}'
    padding: '8px 16px'
  navigation-item:
    textColor: '{colors.muted}'
    rounded: '{rounded.control}'
    padding: '10px 12px'
  search-field:
    backgroundColor: '{colors.raised}'
    textColor: '{colors.text}'
    rounded: '{rounded.pill}'
    height: '44px'
  shortcut-card:
    backgroundColor: '{colors.tile}'
    textColor: '{colors.text}'
    rounded: '{rounded.control}'
  shell-player:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    height: '96px'
---

# Design System: Open Music

## Overview

**Creative North Star: "Spotify shell, NetEase playback and lyrics"**

Use the confirmed references as a direction for a working desktop music player: a quiet, dense library shell around music artwork, with a separate, spacious playback and lyric view. The interface uses tonal panels, restrained green signals, strong headings, and compact controls.

This is a record of the current implementation, reviewed on 2026-11-05. Source authority: `src/renderer/App.vue`, `main.ts`, `assets/css/global.scss`, `assets/css/open-music.scss`, `components/{SideNav,NavBar,PlayerBar,CommonPlayer,CoverRow}.vue`, `views/HomePage.vue`, and `store/settings.ts`. The existing final screenshots corroborate the dark shell and lyric composition; screenshots containing synthetic test tracks are visual evidence only, not product content.

**Key Characteristics:**

- Persistent navigation and transport around a separately scrolling content panel.
- One selectable accent; dark is the fresh-install default, with light, automatic, and custom appearance retained.
- Album artwork and timed lyric state drive the listening view.

## Colors

### Primary

Green is the default selectable accent for brand marks, action buttons, active playback states, and progress hover. The frontmatter records the default palette, not a mandate to override saved user preferences. Blue, purple, orange, cyan, and custom selections remain supported by the settings store.

### Neutral

App black separates the main surface from the surrounding frame. Raised charcoal marks hover, selected navigation, fields, and nested content. White carries primary information; muted silver carries supporting metadata. Translucent tile and border colors provide quiet separation. Light appearance substitutes the corresponding light tokens through the same CSS variables.

**The Theme Variable Rule.** New shell surfaces use `--color-*` variables; palette values in this document describe defaults. Playback backgrounds and lyric foregrounds also have their own existing theme settings.

## Typography

The shared UI uses the body stack in frontmatter, selected for native Windows text and CJK fallbacks. `open-music.scss` follows `global.scss` in `main.ts`, so it supersedes the older Barlow declaration for the app and inherited form controls. There is no separate display-font commitment.

Headlines and section titles use the recorded hierarchy. The homepage headline is a local variant (800 weight, -0.03em tracking), reducing to 27px below 1100px; section titles reduce to 21px below 840px. Playback track titles use 26px/700/1.3, reducing to 23px below 1000px. Navigation uses 14px/600; metadata is commonly 12–13px; time readouts are 11px with tabular numerals. Truncate long song, artist, and playlist labels rather than expanding the fixed shell.

## Layout

- The viewport is a desktop workspace with a source minimum width of 768px. This document does not claim a phone layout.
- A fixed sidebar is 252px wide; at widths at or below 1000px it becomes 208px, then an icon rail of 64px at or below 820px. The rail hides sidebar labels and saved playlists, retaining titled navigation controls.
- Shell panels sit 8px from the edges. The content and toolbar begin at sidebar width + 16px. Windows reserves a 32px caption strip; the toolbar beneath it is 72px high. Preserve the caption controls and Electron drag/no-drag regions.
- Main content uses 24px top, 28px horizontal, and at least 32px bottom padding; horizontal padding becomes 20px at 1000px. The main panel scrolls independently.
- The bottom player is 96px high. Panels reserve 104px while it is visible and 8px on routes that hide it (`mv`, `loginAccount`).
- Home shortcuts use three equal columns, then two at 1100px. Paired recommendation/banner rows become a single column at 840px. Cover shelves reduce columns at 1100px and 834px.
- Playback uses a two-column artwork/lyrics composition: `minmax(240px, 0.9fr) minmax(300px, 1.1fr)`, a 7vw gap, and 8vw horizontal padding. Its existing compact mode places artwork and controls above lyrics. Keep lyric size, alignment, motion, and backgrounds bound to the playback theme.

## Elevation & Depth

The shell uses tonal layering rather than resting card shadows. Shortcuts and navigation use the raised surface on hover; cover cards use the translucent tile treatment. The playback artwork is an intentional exception, with a soft shadow (`0 18px 48px rgba(0, 0, 0, 0.28)`). Retain existing artwork-derived or user-selected playback backgrounds without imposing the shell's solid panel color on them.

Most shell transitions are 150–160ms color or opacity changes. Optional rotating artwork uses a 20s linear cycle and pauses with playback. Respect the implemented reduced-motion media query; it suppresses transitions and rotation.

## Shapes

Use small, gentle corners for content and larger rounding for interactive pills: artwork thumbnails use 4–5px, navigation/shortcuts use the control radius, and shell panels use the panel radius. Album covers remain square by default; the existing circle and rotating cover modes remain configurable. Playback artwork uses a 10px corner when square. Navigation history, profile, and transport controls are circles.

## Components

- **Actions:** green pills lead recovery or source setup; inverse pills provide library access. Keep labels short. Disabled controls visibly dim and retain their existing behavior guards. Generic keyboard focus uses a 2px text-colored outline; player controls use an accent outline, with offsets of 3–4px.
- **Filters:** homepage pills have an inverse selected state. Toolbar and settings tabs use the same tonal/inverse idea with their existing dimensions; selected state is not represented by color alone where an active class/label is available.
- **Navigation:** rows have a 44px minimum height, 22px icons, and 16px icon-to-label gaps. Hover and current route share the raised background and primary text. Saved playlists use 44px artwork and truncated two-line metadata.
- **Search:** a 44px-high pill combines the existing source selector and search input. Focus within adds an inset 2px text-colored outline. Preserve source selection and search routing instead of replacing it with a decorative field.
- **Cards:** shortcuts are compact horizontal rows with a 64px minimum height. Cover cards have 10px padding, panel corners, artwork above title/metadata, and translucent hover. Artist artwork remains circular. Use genuine plugin or local artwork; skeletons and empty placeholders are distinct from returned content.
- **Bottom player:** three columns hold track/artwork, transport/progress, and utilities/volume. The cover is 56px, and its button opens lyrics whenever a current track exists, independent of whole-bar click preference. Transport play is a 34px inverse circle; active repeat/shuffle and hovered progress use the accent. At 820px, volume input and like control hide.
- **Playback and lyrics:** use the real shared playback/lyric state. The listening view has a 48px accent play button and separate lyric theming. Desktop lyrics are a separate native window with their own styles; their dimensions and colors are not defined by this shell document.
- **Loading and empty states:** show shelves while loading and real source/library/reload actions when content is absent. Do not fill empty accounts with invented music or listening activity.

## Do's and Don'ts

### Do:

- **Do** preserve the fixed navigation, native caption, independent content scroll, and persistent transport.
- **Do** use shared theme variables and retain saved light, automatic, accent, and playback preferences.
- **Do** preserve keyboard focus, reduced motion, readable metadata, and artwork-to-lyrics access.
- **Do** render real source content or an honest loading/empty state.

### Don't:

- **Don't** extend the shell palette into a replacement for configurable playback or desktop-lyric themes.
- **Don't** turn transient test tracks, loading copy, or unavailable remote recommendations into house content.
- **Don't** infer mobile support or verified contrast across every custom background from these desktop screenshots.
