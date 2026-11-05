<template>
  <section class="player" aria-label="播放控制">
    <div class="controls" @click="switchLyricPage">
      <div class="left">
        <button
          class="artwork-button"
          type="button"
          aria-label="打开歌词"
          title="打开歌词"
          :disabled="!currentTrack"
          @click.stop="openLyrics"
        >
          <img :src="pic" :alt="currentTrack?.name || '歌曲封面'" />
          <span class="artwork-hint"><svg-icon icon-class="arrow-up" /></span>
        </button>
        <div class="track-info">
          <div
            :class="['title', { haslist: hasListSource && currentTrack }]"
            :title="source"
            @click.stop="currentTrack && hasListSource && goToList()"
          >
            <span>{{ currentTrack?.name || '选择一首歌，开始聆听' }}</span>
          </div>
          <div class="albumAndLyric">
            <span v-for="(ar, index) in artists" :key="ar.id" class="artist">
              <span :class="{ ar: ar.id !== 0 }" @click.stop="goToArtist(ar)">{{ ar.name }}</span>
              <span v-if="index !== artists.length - 1">, </span>
            </span>
            <span v-if="!currentTrack">你的音乐，随时在这里</span>
          </div>
        </div>
        <button-icon
          class="like-button"
          :class="{ active: isLiked }"
          :title="$t('player.like')"
          :aria-label="$t('player.like')"
          :disabled="!currentTrack"
          @click.stop="likeTrack"
          ><svg-icon :icon-class="isLiked ? 'heart-solid' : 'heart'"
        /></button-icon>
      </div>
      <div class="middle">
        <div class="transport">
          <button-icon
            :class="{ active: shuffle }"
            :title="$t('player.shuffle')"
            :aria-label="$t('player.shuffle')"
            :aria-pressed="shuffle"
            :disabled="isPersonalFM || !currentTrack"
            @click.stop="shuffle = !shuffle"
            ><svg-icon icon-class="shuffle"
          /></button-icon>
          <button-icon
            v-if="!isPersonalFM"
            :title="$t('player.previous')"
            :aria-label="$t('player.previous')"
            :disabled="!currentTrack"
            @click.stop="playPrev"
            ><svg-icon icon-class="previous"
          /></button-icon>
          <button-icon
            v-else
            :title="$t('player.moveToFMTrash')"
            :aria-label="$t('player.moveToFMTrash')"
            @click.stop="moveToFMTrash"
            ><svg-icon icon-class="thumbs-down"
          /></button-icon>
          <button-icon
            class="play"
            :title="playing ? $t('player.pause') : $t('player.play')"
            :aria-label="playing ? $t('player.pause') : $t('player.play')"
            :disabled="!currentTrack"
            @click.stop="playOrPause"
            ><svg-icon :icon-class="playing ? 'pause' : 'play'"
          /></button-icon>
          <button-icon
            :title="$t('player.next')"
            :aria-label="$t('player.next')"
            :disabled="!currentTrack"
            @click.stop="playNext(isPersonalFM)"
            ><svg-icon icon-class="next"
          /></button-icon>
          <button-icon
            :class="{ active: repeatMode !== 'off' }"
            :title="repeatMode === 'one' ? $t('player.repeatTrack') : $t('player.repeat')"
            :aria-label="repeatMode === 'one' ? $t('player.repeatTrack') : $t('player.repeat')"
            :disabled="isPersonalFM || !currentTrack"
            @click.stop="switchRepeatMode"
            ><svg-icon :icon-class="repeatMode === 'one' ? 'repeat-1' : 'repeat'"
          /></button-icon>
        </div>
        <div class="progress-row" @click.stop>
          <span class="time">{{ formatTime(position) }}</span>
          <div
            class="progress-bar"
            :class="{ 'is-disabled': !currentTrack }"
            role="slider"
            aria-label="播放进度"
            :aria-valuenow="Math.round(position)"
            :aria-valuemin="0"
            :aria-valuemax="Math.round(duration)"
            :aria-disabled="!currentTrack"
            :aria-valuetext="formatTime(position) + ' / ' + formatTime(duration)"
            :tabindex="currentTrack ? 0 : -1"
            @keydown.left.prevent="position = Math.max(0, position - 5)"
            @keydown.right.prevent="position = Math.min(duration, position + 5)"
            @keydown.home.prevent="position = 0"
            @keydown.end.prevent="position = duration"
          >
            <vue-slider
              v-model="position"
              :min="0"
              :max="Math.max(duration, 1)"
              :marks="marks"
              :rail-style="{ backgroundColor: 'var(--open-player-rail)' }"
              :process-style="{ background: 'var(--open-player-progress)' }"
              :tooltip-style="{ background: 'var(--color-secondary-bg)' }"
              :step-style="{
                display: 'block',
                height: '4px',
                width: '4px',
                backgroundColor: 'var(--color-primary)'
              }"
              :height="4"
              :dot-size="10"
              tooltip-pos="hoverValue"
              :tooltip="hoverText"
              @update:hover-position="handleHover"
            />
          </div>
          <span class="time">{{ formatTime(currentTrack ? duration : 0) }}</span>
        </div>
      </div>
      <div class="right">
        <button-icon
          class="lyrics-button"
          :class="{ active: showLyrics }"
          title="打开歌词"
          aria-label="显示歌词"
          :aria-pressed="showLyrics"
          :disabled="!currentTrack"
          @click.stop="openLyrics"
          ><svg-icon icon-class="lyric"
        /></button-icon>
        <button-icon
          :title="$t('player.osdLyrics')"
          :aria-label="$t('player.osdLyrics')"
          :class="{ active: show }"
          :aria-pressed="show"
          @click.stop="show = !show"
          ><svg-icon icon-class="osd-lyrics"
        /></button-icon>
        <button-icon
          :title="$t('player.nextUp')"
          :aria-label="$t('player.nextUp')"
          :class="{ active: route.name === 'next' }"
          :disabled="isPersonalFM"
          @click.stop="goToNextTracksPage"
          ><svg-icon icon-class="list"
        /></button-icon>
        <div class="volume" @wheel="updateVolume" @click.stop>
          <button-icon title="静音" aria-label="静音" @click.stop="toggleMute">
            <svg-icon
              :icon-class="volume === 0 ? 'volume-mute' : volume > 0.5 ? 'volume' : 'volume-half'"
            />
          </button-icon>
          <input
            v-model.number="volume"
            aria-label="音量"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :title="formatVolume + '%'"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import VueSlider from './VueSlider.vue'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '../store/player'
import { useOsdLyricStore } from '../store/osdLyric'
import { useNormalStateStore } from '../store/state'
import { useSettingsStore } from '../store/settings'
import { usePluginMusic } from '../store/pluginMusic'
import ButtonIcon from './ButtonIcon.vue'
import SvgIcon from './SvgIcon.vue'
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Artist } from '@/types/plugin'

const router = useRouter()
const route = useRoute()

const playerStore = usePlayerStore()
const { playNext, moveToFMTrash, playPrev, playOrPause, switchRepeatMode, toggleMute } = playerStore
const {
  duration,
  currentTrack,
  playing,
  isPersonalFM,
  repeatMode,
  isShuffle: shuffle,
  seek,
  pic,
  volume,
  isLiked,
  lyrics,
  chorus,
  source: rawSource,
  hasListSource,
  getListSourcePath,
  lyricOffset
} = storeToRefs(playerStore)

const hoverText = ref('')

const osdLyric = useOsdLyricStore()
const { show } = storeToRefs(osdLyric)

const settingsStore = useSettingsStore()
const { general } = storeToRefs(settingsStore)

const stateStore = useNormalStateStore()
const { showLyrics, enableScrolling } = storeToRefs(stateStore)

const pluginMusicStore = usePluginMusic()

const formatTime = (time: number) => {
  const seconds = Math.max(0, Math.floor(Number.isFinite(time) ? time : 0))
  return Math.floor(seconds / 60) + ':' + (seconds % 60).toString().padStart(2, '0')
}

const artists = computed(() => {
  return currentTrack.value?.artists ?? []
})

const source = computed(() => {
  return `${currentTrack.value?.name}, 音源：${rawSource.value}`
})

const position = computed({
  get() {
    return seek.value
  },
  set(value) {
    if (!general.value.jumpToLyricBegin) {
      seek.value = value
      return
    }
    const line = lyrics.value.find((l, index) => {
      const nextLine = lyrics.value[index + 1]
      if (nextLine) {
        return nextLine.start > value && l.start <= value
      } else {
        return value >= l.start && value < l.start + 10
      }
    })
    seek.value = line ? line?.start - (lyricOffset.value || 0) : value
  }
})

const marks = computed(() => {
  const result: Record<string, any> = {}
  if (chorus.value === 0) return result
  result[chorus.value] = { labelStyle: { display: 'none' } }
  return result
})

const likeTrack = () => {
  if (!currentTrack.value) return
  pluginMusicStore.likeATrack(currentTrack.value)
}

const goToArtist = (artist: Artist) => {
  if (!artist) return
  router.push({
    name: 'ArtistPage',
    params: {
      pluginId: artist.pluginId,
      sourceContext: JSON.stringify(artist.sourceContext)
    }
  })
}

const openLyrics = () => {
  if (!currentTrack.value) return
  showLyrics.value = true
}

const switchLyricPage = () => {
  const enable = general.value.clickToLyric
  if (!enable || !currentTrack.value) return
  showLyrics.value = !showLyrics.value
}

const goToList = () => {
  const path = getListSourcePath.value
  router.push(path)
}

const updateVolume = (e: WheelEvent) => {
  e.preventDefault()
  const delta = e.deltaY < 0 ? 0.02 : -0.02
  volume.value = Math.min(Math.max(volume.value + delta, 0), 1)
}

const handleHover = (position: number) => {
  const time = formatTime(position)
  if (!lyrics.value.length) {
    hoverText.value = `${time}`
    return
  }

  const lyric = lyrics.value.find((line, index) => {
    const next = lyrics.value[index + 1]
    if (next) {
      return next.start > position && line.start <= position
    } else {
      return position >= line.start && position < duration.value
    }
  })
  hoverText.value = lyric ? `[${time}] ${lyric.lyric.text}` : `${time}`
}

const goToNextTracksPage = () => {
  if (isPersonalFM.value) return
  route.name === 'next' ? router.go(-1) : router.push({ name: 'next' })
}

const formatVolume = computed(() => {
  return Math.round(volume.value * 100).toString()
})

// const heartDisabled = computed(() => {
//   return currentTrack.value?.type === 'local' && !currentTrack.value?.matched
// })

watch(showLyrics, (value) => {
  enableScrolling.value = !value
})
</script>

<style scoped lang="scss">
.player {
  --open-player-rail: #4d4d4d;
  --open-player-progress: #dedede;
  position: fixed;
  inset: auto 0 0;
  height: var(--open-player-height, 96px);
  background: var(--color-body-bg);
  color: var(--color-text);
  z-index: 20;
}
.controls {
  height: 100%;
  padding: 10px 20px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(280px, 1.4fr) minmax(190px, 1fr);
  gap: 20px;
  align-items: center;
}
.left,
.right,
.transport,
.volume,
.progress-row {
  display: flex;
  align-items: center;
}
.left {
  min-width: 0;
  gap: 14px;
}
.artwork-button {
  flex: 0 0 56px;
  width: 56px;
  height: 56px;
  padding: 0;
  position: relative;
  overflow: hidden;
  border-radius: 5px;
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .artwork-hint {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: opacity 160ms ease-out;
    .svg-icon {
      width: 22px;
      height: 22px;
      color: #fff;
    }
  }
  &:hover .artwork-hint,
  &:focus-visible .artwork-hint {
    opacity: 1;
  }
}
.track-info {
  min-width: 0;
}
.title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.haslist,
.ar {
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
}
.albumAndLyric {
  margin-top: 3px;
  font-size: 12px;
  color: var(--color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.like-button {
  flex-shrink: 0;
  margin-left: 3px;
}
.middle {
  min-width: 0;
}
.transport {
  gap: 14px;
  justify-content: center;
  height: 40px;
}
.player .button-icon {
  flex-shrink: 0;
  margin: 0;
  width: 30px;
  height: 30px;
  padding: 6px;
  border-radius: 50%;
  :deep(.svg-icon) {
    width: 16px;
    height: 16px;
    color: var(--color-secondary);
  }
  &:hover :deep(.svg-icon) {
    color: var(--color-text);
  }
  &.active :deep(.svg-icon) {
    color: var(--color-primary);
  }
  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
}
.player .play {
  width: 34px;
  height: 34px;
  background: var(--color-text);
  :deep(.svg-icon) {
    width: 19px;
    height: 19px;
    color: var(--color-body-bg);
  }
  &:hover {
    transform: scale(1.05);
    background: var(--color-text);
  }
  &:hover :deep(.svg-icon) {
    color: var(--color-body-bg);
  }
}
.progress-row {
  gap: 8px;
  width: 100%;
  margin-top: 2px;
}
.progress-bar {
  flex: 1;
  min-width: 0;
  border-radius: 8px;
  &:hover,
  &:focus-visible {
    --open-player-progress: var(--color-primary);
  }
  &.is-disabled {
    pointer-events: none;
    opacity: 0.5;
  }
}
.time {
  color: var(--color-secondary);
  font-size: 11px;
  min-width: 29px;
  font-variant-numeric: tabular-nums;
}
.time:last-child {
  text-align: right;
}
.right {
  justify-content: flex-end;
  gap: 5px;
  min-width: 0;
}
.volume {
  gap: 5px;
  input {
    width: 76px;
    height: 4px;
    margin: 0;
    accent-color: var(--color-text);
    cursor: pointer;
  }
  input:hover {
    accent-color: var(--color-primary);
  }
}
.artwork-button:focus-visible,
.player .button-icon:focus-visible,
.progress-bar:focus-visible,
input:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 4px;
}
@media (max-width: 1080px) {
  .controls {
    grid-template-columns: minmax(160px, 1fr) minmax(240px, 1.4fr) 166px;
    gap: 12px;
    padding-inline: 16px;
  }
  .volume input {
    width: 45px;
  }
  .right {
    gap: 0;
  }
}
@media (max-width: 820px) {
  .controls {
    grid-template-columns: minmax(150px, 1fr) minmax(240px, 1.5fr) 120px;
    gap: 8px;
  }
  .volume input,
  .like-button {
    display: none;
  }
  .transport {
    gap: 10px;
  }
  .left {
    gap: 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .player *,
  .player *::before,
  .player *::after {
    transition: none !important;
  }
}
</style>
