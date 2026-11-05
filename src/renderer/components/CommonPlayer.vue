<template>
  <div class="play-page">
    <div class="lyric-container" :class="{ isMobile, 'no-lyric': noLyric && show === 'fullLyric' }">
      <div class="left-side">
        <div
          class="cover"
          :class="{
            rotate: senses[activeTheme.theme.activeLayout as 'Classic'].cover === 2,
            circle: senses[activeTheme.theme.activeLayout as 'Classic'].cover === 1,
            paused: !playing
          }"
        >
          <div class="img-wrap">
            <img :src="pic" :alt="currentTrack?.name || '歌曲封面'" />
          </div>
          <div class="shadow" :style="{ backgroundImage: `url(${pic})` }"></div>
        </div>
        <div class="controls">
          <div class="top-part">
            <div class="track-info">
              <div
                :class="['title', { haslist: hasListSource }]"
                :title="source"
                @click="hasListSource && goToList()"
              >
                <span>{{ currentTrack?.name }}</span>
              </div>
              <div class="subtitle">
                <router-link
                  v-if="artist && String(artist.id) !== String(0)"
                  :to="{
                    name: 'ArtistPage',
                    params: {
                      pluginId: artist.pluginId,
                      sourceContext: JSON.stringify(artist.sourceContext)
                    }
                  }"
                  @click="showLyrics = !showLyrics"
                  >{{ artist.name }}
                </router-link>
                <span v-else>{{ artist?.name || '未知艺人' }}</span>
                <span>
                  -
                  <router-link
                    v-if="album && String(album.id) !== String(0)"
                    :to="{
                      name: 'album',
                      params: {
                        pluginId: album.pluginId,
                        sourceContext: JSON.stringify(album.sourceContext)
                      }
                    }"
                    @click="showLyrics = !showLyrics"
                    >{{ album.name }}
                  </router-link>
                  <span v-else>{{ album?.name || '未知专辑' }}</span>
                </span>
              </div>
            </div>
            <div class="top-right">
              <div class="buttons">
                <div class="transPro" @click="switchTransitionMode">
                  <label v-show="hasTLyric" :class="{ active: nTranslationMode === 'tlyric' }"
                    >译</label
                  >
                  <label v-if="hasTLyric && hasRLyric" class="m-label">|</label>
                  <label v-show="hasRLyric" :class="{ active: nTranslationMode === 'rlyric' }"
                    >音</label
                  >
                </div>
                <button-icon :title="$t('player.like')" class="button" @click="likeTrack">
                  <SvgIcon :icon-class="isLiked ? 'heart-solid' : 'heart'" />
                </button-icon>
                <button-icon class="button" @click="addTrackToPlaylist"
                  ><SvgIcon icon-class="plus"
                /></button-icon>
                <button-icon class="button" :prevent-blur="true" @click="showContextMenu">
                  <SvgIcon icon-class="options" />
                </button-icon>
              </div>
            </div>
          </div>
          <div class="progress-bar">
            <div class="time">{{ formatTime(position) || '0:00' }}</div>
            <div class="slider">
              <vue-slider
                v-model="position"
                :min="0"
                :max="Math.max(duration, 1)"
                :dot-size="12"
                :height="4"
                :marks="marks"
                :step-style="{
                  display: 'block',
                  height: '8px',
                  width: '8px',
                  transform: 'translateY(-2px)',
                  backgroundColor: 'var(--color-text)',
                  opacity: 0.8
                }"
                :rail-style="{ backgroundColor: 'rgba(128, 128, 128, 0.18)' }"
                :process-style="{ backgroundColor: 'var(--color-text)', opacity: 0.8 }"
                tooltip="none"
              ></vue-slider>
            </div>
            <div class="time">{{ formatTime(duration) }}</div>
          </div>
          <div class="media-controls">
            <button-icon
              :class="{ active: repeatMode !== 'off' }"
              :title="repeatMode === 'one' ? $t('player.repeatTrack') : $t('player.repeat')"
              @click="switchRepeatMode"
            >
              <svg-icon v-show="repeatMode !== 'one'" icon-class="repeat" />
              <svg-icon v-show="repeatMode === 'one'" icon-class="repeat-1" />
            </button-icon>
            <div class="middle">
              <button-icon v-show="!isPersonalFM" :title="$t('player.previous')" @click="playPrev"
                ><svg-icon icon-class="previous"
              /></button-icon>
              <button-icon
                v-show="isPersonalFM"
                :title="$t('player.moveToFMTrash')"
                @click="moveToFMTrash"
                ><svg-icon icon-class="thumbs-down"
              /></button-icon>
              <button-icon
                id="play"
                :title="$t(playing ? 'player.pause' : 'player.play')"
                :aria-label="$t(playing ? 'player.pause' : 'player.play')"
                @click="playOrPause"
                ><svg-icon :icon-class="playing ? 'pause' : 'play'"
              /></button-icon>
              <button-icon :title="$t('player.next')" @click="playNext(isPersonalFM)"
                ><svg-icon icon-class="next"
              /></button-icon>
            </div>
            <button-icon :class="{ active: shuffle }" @click="shuffle = !shuffle"
              ><svg-icon icon-class="shuffle"
            /></button-icon>
          </div>
          <div class="progress-bar">
            <div class="time"
              ><button-icon @click.stop="toggleMute">
                <svg-icon icon-class="volume-half" /></button-icon
            ></div>
            <div class="slider">
              <VueSlider
                v-model="volume"
                :min="0"
                :max="1"
                :dot-size="12"
                :height="4"
                :rail-style="{ backgroundColor: 'rgba(128, 128, 128, 0.18)' }"
                :process-style="{ backgroundColor: 'var(--color-text)', opacity: 0.8 }"
                tooltip="none"
              />
            </div>
            <div class="time">
              <button-icon> <svg-icon icon-class="volume" /></button-icon
            ></div>
          </div>
        </div>
      </div>
      <div class="right-side" @mouseenter="hover = true" @mouseleave="hover = false">
        <LyricPage
          v-if="show === 'fullLyric'"
          :text-align="isMobile ? 'center' : align"
          :container-width="isMobile ? '85vw' : '100%'"
          container-margin="0 auto"
          :hover="hover"
          :offset-padding="isMobile ? '10vw' : '0'"
          :margin="isMobile ? '12vh' : '34vh'"
        />
        <Comment
          v-else-if="currentTrack"
          :id="currentTrack.id"
          :plugin="currentTrack.pluginId"
          :source-context="currentTrack?.sourceContext || {}"
          type="track"
          :style="{
            width: isMobile ? '50vw' : '100%',
            padding: isMobile ? '0' : '40px 0 10px 4vh'
          }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import ButtonIcon from './ButtonIcon.vue'
import SvgIcon from './SvgIcon.vue'
import VueSlider from './VueSlider.vue'
import LyricPage from './LyricPage.vue'
import Comment from './CommentPage.vue'
import { usePlayerStore } from '../store/player'
import ContextMenu from './ContextMenu.vue'
import { useSettingsStore } from '../store/settings'
import { useNormalStateStore } from '../store/state'
import { usePlayerThemeStore } from '../store/playerTheme'
import { usePluginMusic } from '../store/pluginMusic'
import { TranslationMode } from '@/types/music.d'

withDefaults(defineProps<{ show: 'fullLyric' | 'pickLyric' | 'comment' }>(), {
  show: 'fullLyric'
})

const router = useRouter()
const playPageContextMenu = inject('playPageContextMenu', ref<InstanceType<typeof ContextMenu>>())

const settingsStore = useSettingsStore()
const { general } = storeToRefs(settingsStore)

const { likeATrack } = usePluginMusic()

const playerStore = usePlayerStore()
const {
  currentTrack,
  seek,
  noLyric,
  lyrics,
  volume,
  duration,
  isPersonalFM,
  playing,
  isShuffle: shuffle,
  isLiked,
  source: rawSource,
  chorus,
  repeatMode,
  pic,
  hasListSource,
  getListSourcePath
} = storeToRefs(playerStore)
const { playPrev, playOrPause, playNext, switchRepeatMode, moveToFMTrash, toggleMute } = playerStore

const playerTheme = usePlayerThemeStore()
const { activeTheme, senses } = storeToRefs(playerTheme)

const stateStore = useNormalStateStore()
const { showLyrics, addTrackToPlaylistModal } = storeToRefs(stateStore)

const isMobile = ref(false)

const align = computed(() => {
  const layout = activeTheme.value.theme.activeLayout
  const sense = senses.value[layout]
  return sense.align
})

const nTranslationMode = computed({
  get: () => {
    const layout = activeTheme.value.theme.activeLayout
    if (layout === 'Classic') {
      const sense = senses.value[layout]
      return sense.lyric.translation
    }
    return 'tlyric'
  },
  set: (value) => {
    const layout = activeTheme.value.theme.activeLayout
    if (layout !== 'Classic') return
    const sense = senses.value[layout]
    sense.lyric.translation = value
  }
})

const hasTLyric = computed(() => lyrics.value.some((l) => l.tlyric))
const hasRLyric = computed(() => lyrics.value.some((l) => l.rlyric))

const artist = computed(() => {
  return currentTrack.value?.artists[0]
})

const album = computed(() => {
  return currentTrack.value?.album
})

const marks = computed(() => {
  const result: Record<string, any> = {}
  if (chorus.value === 0) return result
  result[chorus.value.toString()] = { labelStyle: { display: 'none' } }
  return result
})

const tags = computed(() => {
  const lst = ['none']
  if (hasTLyric.value) {
    lst.splice(1, 0, 'tlyric')
  }
  if (hasRLyric.value) {
    lst.push('rlyric')
  }
  return lst as TranslationMode[]
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
    seek.value = line?.start ?? value
  }
})

const idx = ref(tags.value.indexOf(nTranslationMode.value))
const hover = ref(false)

const formatTime = (time: number) => {
  time = Math.round(time)
  const minutes = Math.floor(time / 60)
  const remainingSeconds = Math.ceil(time % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const source = computed(() => {
  return `${currentTrack.value?.name}, 音源：${rawSource.value}`
})

const likeTrack = () => {
  if (!currentTrack.value) return
  likeATrack(currentTrack.value)
}

const addTrackToPlaylist = () => {
  if (!currentTrack.value) return
  addTrackToPlaylistModal.value = {
    show: true,
    selectedTrackID: [
      { pluginId: currentTrack.value.pluginId, sourceContext: currentTrack.value.sourceContext }
    ],
    plugin: currentTrack.value.pluginId
  }
}

const switchTransitionMode = () => {
  idx.value = (idx.value + 1) % tags.value.length
  const value = tags.value[idx.value] as TranslationMode
  nTranslationMode.value = value
}

const goToList = () => {
  const path = getListSourcePath.value
  router.push(path)
  showLyrics.value = false
}

const showContextMenu = (e: MouseEvent): void => {
  playPageContextMenu.value?.openMenu(e)
}

const aspect = window.matchMedia('(max-aspect-ratio: 9/10)')
const updateAspect = (event: MediaQueryListEvent) => {
  isMobile.value = event.matches
}
aspect.addEventListener('change', updateAspect)

onMounted(() => {
  isMobile.value = aspect.matches
})

onBeforeUnmount(() => {
  aspect.removeEventListener('change', updateAspect)
})
</script>

<style scoped lang="scss">
.play-page {
  position: absolute;
  inset: 0;
  z-index: 100;
  color: var(--color-text);
  overflow: hidden;
  box-sizing: border-box;
  padding: 76px 8vw 28px;
}
.lyric-container {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(240px, 0.9fr) minmax(300px, 1.1fr);
  gap: 7vw;
  align-items: center;
}
.left-side {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.cover {
  width: min(42vh, 31vw, 420px);
  position: relative;
  .img-wrap {
    aspect-ratio: 1;
    width: 100%;
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 10px;
    object-fit: cover;
    user-select: none;
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
  }
  .shadow {
    display: none;
  }
  &.circle img,
  &.rotate img {
    border-radius: 50%;
  }
  &.rotate .img-wrap {
    animation: circleRotate 20s linear infinite;
  }
  &.paused .img-wrap {
    animation-play-state: paused;
  }
}
.controls {
  width: min(42vh, 31vw, 420px);
  max-width: 100%;
  margin-top: 24px;
  color: var(--color-text);
}
.top-part {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}
.track-info {
  min-width: 0;
}
.title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.haslist {
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
}
.subtitle {
  margin-top: 6px;
  color: color-mix(in srgb, var(--color-text), transparent 25%);
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.top-right .buttons {
  display: flex;
  align-items: center;
  gap: 7px;
  button {
    margin: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
  }
  .svg-icon {
    width: 17px;
    height: 17px;
  }
}
.transPro {
  cursor: pointer;
  display: flex;
  gap: 5px;
  align-items: center;
  padding-right: 6px;
  font-size: 13px;
  label {
    opacity: 0.55;
    cursor: pointer;
  }
  label.active {
    opacity: 1;
    color: var(--color-primary);
  }
}
.progress-bar {
  display: flex;
  align-items: center;
  gap: 9px;
  .slider {
    flex: 1;
    min-width: 0;
  }
  .time {
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: color-mix(in srgb, var(--color-text), transparent 30%);
    min-width: 29px;
  }
  .time:last-child {
    text-align: right;
  }
}
.media-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 15px 0;
  .svg-icon {
    width: 17px;
    height: 17px;
    color: color-mix(in srgb, var(--color-text), transparent 30%);
  }
  .active .svg-icon {
    color: var(--color-primary);
  }
  button {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    margin: 0;
  }
  .middle {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .middle .svg-icon {
    width: 21px;
    height: 21px;
    color: var(--color-text);
  }
  button#play {
    width: 48px;
    height: 48px;
    background: var(--color-primary);
  }
  button#play .svg-icon {
    color: #0b180e;
    width: 23px;
    height: 23px;
  }
}
.right-side {
  height: 100%;
  min-height: 0;
  min-width: 0;
}
.button-icon:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
@media (max-width: 1000px) {
  .play-page {
    padding-inline: 6vw;
  }
  .lyric-container {
    grid-template-columns: minmax(220px, 0.95fr) minmax(250px, 1.05fr);
    gap: 5vw;
  }
  .title {
    font-size: 23px;
  }
  .cover,
  .controls {
    width: min(40vh, 33vw);
  }
}
.lyric-container.isMobile {
  grid-template-columns: 1fr;
  grid-template-rows: auto minmax(160px, 1fr);
  gap: 18px;
  .left-side {
    flex-direction: row;
    align-items: center;
    gap: 24px;
  }
  .cover {
    width: min(24vh, 28vw);
    flex-shrink: 0;
  }
  .controls {
    margin-top: 0;
    width: min(52vw, 390px);
  }
  .top-part {
    gap: 7px;
  }
  .top-right {
    display: none;
  }
  .media-controls {
    margin: 8px 0;
  }
  .right-side {
    height: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .cover.rotate .img-wrap {
    animation: none;
  }
}
@keyframes circleRotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
