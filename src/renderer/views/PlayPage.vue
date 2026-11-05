<template>
  <div :data-theme="theme">
    <transition name="slide-up">
      <div
        v-if="showLyrics"
        ref="lyricPanelRef"
        class="player-container"
        role="dialog"
        aria-modal="true"
        aria-label="歌词播放器"
        tabindex="-1"
        @mouseenter="hover = true"
        @mouseleave="hover = false"
      >
        <BackgroundPage />
        <div
          class="buttons-icons"
          :class="{ opacity: activeTheme.theme.activeLayout === 'Creative', hover }"
        >
          <button-icon
            v-show="tabs[tabIdx] !== 'comment'"
            class="player-button theme-button"
            title="播放器主题"
            aria-label="播放器主题"
            @click="setThemeModal = !setThemeModal"
          >
            <SvgIcon icon-class="theme" />
          </button-icon>
          <button-icon
            class="player-button close-button"
            title="收起歌词 (Esc)"
            aria-label="收起歌词"
            @click="showLyrics = false"
          >
            <SvgIcon icon-class="arrow-down" />
          </button-icon>
          <button-icon
            title="重置播放器主题"
            class="player-button reset-button"
            @click="resetTheme"
          >
            <SvgIcon icon-class="reset-theme" />
          </button-icon>
          <button-icon
            title="换场景"
            class="player-button sense-button"
            @click="showSenseSelector = true"
          >
            <SvgIcon icon-class="sense" />
          </button-icon>
          <button-icon
            class="player-button lyric-button-1"
            :title="$t('contextMenu.showLyric')"
            @click="switchCurrentTab"
          >
            <SvgIcon :icon-class="getIcon()" />
          </button-icon>
        </div>
        <CommonPlayer v-if="activeTheme.theme.activeLayout === 'Classic'" :show="tabs[tabIdx]" />
        <CreativePlayer v-else :show="tabs[tabIdx]" :hover-parent="hover" />
      </div>
    </transition>
  </div>
  <div>
    <ConvolverModal />
    <PitchModal />
    <PlaybackModal />
    <PlayerFontModal />
    <PlayerThemeModal />
    <SaveThemeModal />
    <BackgroundModal />
    <SenseSwitch v-model="showSenseSelector" :type="activeTheme.theme.activeLayout" />
    <ContextMenu ref="playPageContextMenu">
      <div
        v-show="activeTheme.theme.activeLayout === 'Creative'"
        class="item"
        @click="addTrackToPlaylist"
        >{{ $t('player.addToPlaylist') }}</div
      >
      <div class="item" @click="setPlaybackRateModal = true">{{
        $t('contextMenu.playBackSpeed')
      }}</div>
      <div class="item" @click="setPitchModal = true">{{ $t('contextMenu.pitch') }}</div>
      <div class="item" @click="setConvolverModal = true">{{ $t('contextMenu.setConvolver') }}</div>
      <hr />
      <div class="item" @click="backgroundModal.show = true">背景设置</div>
      <div class="item" @click="setFontModal = true">歌词设置</div>
      <div class="item" @click="setSaveThemeModal = true">保存播放器主题</div>
    </ContextMenu>
  </div>
</template>

<script setup lang="ts">
import ContextMenu from '../components/ContextMenu.vue'
import ConvolverModal from '../components/ModalConvolver.vue'
import PlaybackModal from '../components/ModalPlayback.vue'
import PitchModal from '../components/ModalPitch.vue'
import PlayerThemeModal from '../components/ModalPlayerTheme.vue'
import PlayerFontModal from '../components/ModalPlayerFont.vue'
import SaveThemeModal from '../components/ModalSaveTheme.vue'
import SenseSwitch from '../components/SenseSwitch.vue'
import BackgroundModal from '../components/ModalBackground.vue'
import CommonPlayer from '../components/CommonPlayer.vue'
import CreativePlayer from '../components/CreativePlayer.vue'
import BackgroundPage from '../components/BackgroundPage.vue'
import ButtonIcon from '../components/ButtonIcon.vue'
import SvgIcon from '../components/SvgIcon.vue'
import { useNormalStateStore } from '../store/state'
import { usePlayerStore } from '../store/player'
import { usePlayerThemeStore } from '../store/playerTheme'
import { storeToRefs } from 'pinia'
import { ref, provide, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const playPageContextMenu = ref<InstanceType<typeof ContextMenu>>()

const stateStore = useNormalStateStore()
const {
  showLyrics,
  setThemeModal,
  setConvolverModal,
  setPitchModal,
  setFontModal,
  setPlaybackRateModal,
  backgroundModal,
  setSaveThemeModal,
  addTrackToPlaylistModal
} = storeToRefs(stateStore)

const playerStore = usePlayerStore()
const { currentTrack } = storeToRefs(playerStore)

const playerThemeStore = usePlayerThemeStore()
const { activeTheme, activeBG } = storeToRefs(playerThemeStore)
const { resetTheme } = playerThemeStore

const showSenseSelector = ref(false)
const tabIdx = ref(0)
const titleIdx = ref(0)
const hover = ref(false)
const lyricPanelRef = ref<HTMLElement>()
let previousFocus: HTMLElement | null = null

const handleKeydown = (event: KeyboardEvent) => {
  if (!showLyrics.value || !['Escape', 'Tab'].includes(event.key) || event.defaultPrevented) return
  if (
    setThemeModal.value ||
    setConvolverModal.value ||
    setPitchModal.value ||
    setFontModal.value ||
    setPlaybackRateModal.value ||
    setSaveThemeModal.value ||
    backgroundModal.value.show ||
    showSenseSelector.value ||
    addTrackToPlaylistModal.value.show
  )
    return
  if (event.key === 'Tab') {
    const panel = lyricPanelRef.value
    if (!panel) return
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(
      (element) =>
        element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true'
    )
    const first = focusable[0]
    const last = focusable.at(-1)
    const active = document.activeElement
    if (!first || !last) {
      event.preventDefault()
      panel.focus()
    } else if (
      event.shiftKey &&
      (active === first || active === panel || !panel.contains(active))
    ) {
      event.preventDefault()
      last.focus()
    } else if (
      !event.shiftKey &&
      (active === last || active === panel || !panel.contains(active))
    ) {
      event.preventDefault()
      first.focus()
    }
    return
  }
  event.preventDefault()
  showLyrics.value = false
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))

const theme = computed(() => {
  let appearance = activeBG.value.color
  if (appearance === 'auto' || appearance === undefined) {
    appearance = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return appearance
})

const tabs = computed(() => {
  let result: ('fullLyric' | 'pickLyric' | 'comment')[] = []
  if (activeTheme.value.theme.activeLayout === 'Classic') {
    result = ['fullLyric', 'comment']
  } else {
    result = ['pickLyric', 'fullLyric', 'comment']
  }
  return result
})

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

provide('playPageContextMenu', playPageContextMenu)

const switchCurrentTab = () => {
  tabIdx.value = (tabIdx.value + 1) % tabs.value.length
}

const getIcon = () => {
  if (tabs.value[tabIdx.value] === 'pickLyric') {
    return 'lyric-half'
  } else if (tabs.value[tabIdx.value] === 'fullLyric') {
    return 'lyric'
  } else {
    return 'comment'
  }
}

watch(showLyrics, async (visible) => {
  tabIdx.value = 0
  if (visible) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    lyricPanelRef.value?.focus?.()
  } else {
    previousFocus?.focus()
  }
})

watch(showSenseSelector, () => {
  titleIdx.value = 0
})

watch(
  () => activeTheme.value.theme.activeLayout,
  () => {
    tabIdx.value = 0
    titleIdx.value = 0
  }
)
</script>
<style scoped lang="scss">
.player-container {
  position: fixed;
  top: var(--open-titlebar-height, 0px);
  bottom: 0;
  left: 0;
  width: 100%;
  height: calc(100% - var(--open-titlebar-height, 0px));
  z-index: 20;
  background-color: var(--bg-color, var(--color-body-bg));
  outline: none;
}

.buttons-icons {
  position: fixed;
  inset: 0;
  z-index: 200;
  pointer-events: none;
  color: var(--color-text);
  opacity: 1;
  transition: opacity 0.2s;

  .theme-button {
    position: fixed;
    top: calc(var(--open-titlebar-height, 0px) + 16px);
    right: 24px;
  }

  .close-button {
    position: fixed;
    top: calc(var(--open-titlebar-height, 0px) + 16px);
    left: 24px;
  }

  .sense-button {
    position: fixed;
    bottom: 124px;
    right: 24px;
  }

  .reset-button {
    position: fixed;
    bottom: 190px;
    right: 24px;
  }

  .lyric-button-1 {
    position: fixed;
    bottom: 60px;
    right: 24px;
  }

  .player-button {
    z-index: 300;
    border-radius: 50%;
    height: 44px;
    width: 44px;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0.78;
    pointer-events: auto;
    transition:
      background 0.2s,
      opacity 0.2s;
    -webkit-app-region: no-drag;

    .svg-icon {
      color: var(--color-text);
      height: 22px;
      width: 22px;
    }

    &:hover {
      background: var(--color-secondary-bg-for-transparent);
      opacity: 0.88;
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 3px;
    }
  }
}

.buttons-icons.hover {
  opacity: 1;
}

.buttons-icons.opacity {
  .player-button {
    opacity: 0.88;
  }
}

.sense-modal {
  position: fixed;
  transition: opacity 0.3s ease-in-out;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
}

.sense-content {
  position: fixed;
  bottom: 0;
  left: 0;
  padding-bottom: 10px;
  width: 100%;
  border-radius: 12px 12px 0 0;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(12px) opacity(1);
  color: var(--color-text);
}

[data-theme='dark'] .sense-content {
  background: rgba(36, 36, 36, 0.88);
}

.sense-title {
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  padding: 20px 0;
  color: color-mix(in srgb, var(--color-text), transparent 40%);

  .active {
    color: var(--color-text);
  }

  &.multi span {
    cursor: pointer;

    &:first-child {
      margin-right: 20px;
      padding-right: 20px;
      border-right: 2px solid color-mix(in srgb, var(--color-text), transparent 40%);
    }
  }
}

.sense-list {
  display: flex;
  justify-content: center;
  height: 200px;
  padding: 0 10px;
  overflow: auto hidden;
  scrollbar-width: none;
}

.sense-item {
  height: 100%;
  margin: 0 10px;
  border-radius: 8px;
  text-align: center;
  position: relative;

  img {
    height: 80%;
    border-radius: 8px;
    padding: 4px;
  }

  .sense-active {
    display: none;
    position: absolute;
    top: 0;
    left: 0;
    font-size: 16px;
    border-radius: 8px 0;
    padding: 4px 10px;
  }

  .ani {
    display: flex;
    height: 100%;
    width: 150px;
    box-sizing: border-box;
    justify-content: center;
    align-items: center;
    border: 2px solid var(--color-primary);
    border-radius: 8px;
    user-select: none;
    cursor: pointer;
  }
}

.sense-item.active {
  .sense-active {
    display: block;
    background-color: var(--color-primary);
    color: white;
  }
  img {
    background-color: var(--color-primary);
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
