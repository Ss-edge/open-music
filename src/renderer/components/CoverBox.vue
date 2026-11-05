<template>
  <div
    class="cover"
    :class="{ 'cover-hover': coverHover }"
    @mouseover="doHover(true)"
    @mouseleave="doHover(false)"
    @focusin="doHover(true)"
    @focusout="handleFocusOut"
  >
    <div class="cover-container">
      <button
        type="button"
        class="cover-link"
        :aria-label="clickCoverToPlay ? $t('player.play') : imageAlt || $t('home.seeMore')"
        @click="clickCoverToPlay ? play() : goTo()"
      >
        <img :src="imageUrl" :alt="imageAlt" :style="imageStyles" loading="lazy" />
      </button>
      <div v-if="coverHover" class="shade" :class="{ visible: focus }">
        <button
          type="button"
          :aria-label="$t('player.play')"
          class="play-button"
          :style="playButtonStyles"
          @click.stop="play()"
          ><svg-icon icon-class="play" />
        </button>
      </div>
      <Transition v-if="coverHover || alwaysShowShadow" name="fade">
        <div v-show="focus || alwaysShowShadow" class="shadow" :style="shadowStyles"></div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import SvgIcon from './SvgIcon.vue'
import { ref, computed, PropType } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../store/player'
import { usePluginMusic } from '../store/pluginMusic'
import { storeToRefs } from 'pinia'
import { serviceName, CoverType, PlaylistSourceInfo } from '@/types/music.d'
import { PluginId, Track } from '@/types/plugin'

const props = defineProps({
  id: { type: [Number, String], required: true },
  sourceContext: { type: Object as PropType<Record<string, any>>, required: true },
  pluginId: { type: String, required: true },
  type: { type: String as PropType<CoverType>, required: true },
  service: { type: String as PropType<serviceName>, default: '' },
  imageUrl: { type: String, required: true },
  imageAlt: { type: String, default: '' },
  fixedSize: { type: Number, default: 0 },
  playButtonSize: { type: Number, default: 22 },
  coverHover: { type: Boolean, default: true },
  alwaysShowPlayButton: { type: Boolean, default: true },
  alwaysShowShadow: { type: Boolean, default: false },
  clickCoverToPlay: { type: Boolean, default: false },
  shadowMargin: { type: Number, default: 12 },
  radius: { type: Number, default: 6 }
})

const focus = ref(false)
const router = useRouter()

const playerStore = usePlayerStore()
const { isShuffle } = storeToRefs(playerStore)
const { replacePlaylist } = playerStore

const pluginStore = usePluginMusic()
const { getPlaylistDetail, pluginMethodCall } = pluginStore

// const localMusic = storeToRefs(useLocalMusicStore())
// const streamMusic = storeToRefs(useStreamMusicStore())

const playButtonStyles = computed(() => {
  const styles = {
    width: props.playButtonSize + '%',
    height: props.playButtonSize + '%'
  }
  return styles
})

const imageStyles = computed(() => {
  const styles: { [key: string]: string } = { borderRadius: props.radius + 'px' }
  if (props.fixedSize !== 0) {
    styles.width = props.fixedSize + 'px'
    styles.height = props.fixedSize + 'px'
  }
  if (props.type === 'Artist') styles.borderRadius = '50%'
  return styles
})

const shadowStyles = computed(() => {
  const styles = {
    backgroundImage: `url(${props.imageUrl})`,
    borderRadius: props.type === 'Artist' ? '50%' : '0'
  }
  return styles
})

const doHover = (isHover: boolean) => {
  if (props.type === 'User') return
  focus.value = isHover
}

const handleFocusOut = (event: FocusEvent) => {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null))
    doHover(false)
}

const play = async () => {
  const plugin = props.pluginId as PluginId
  const source: PlaylistSourceInfo = {
    type: props.type as Exclude<typeof props.type, 'User'>,
    plugin,
    sourceContext: props.sourceContext
  }

  let tracks = [] as Track[]
  if (props.type === 'Playlist') {
    tracks = await getPlaylistDetail(plugin, { ...props.sourceContext, reset: true }).then(
      (result) => {
        source.sourceContext = result.data?.sourceContext ?? source.sourceContext
        return result.data?.tracks || []
      }
    )
  } else if (props.type === 'Album') {
    tracks = await pluginMethodCall(plugin, 'albumDetail', props.sourceContext).then(
      (result) => result.data?.songs || []
    )
  } else if (props.type === 'Artist') {
    tracks = await pluginMethodCall(plugin, 'artistDetail', props.sourceContext).then(
      (result) => result.songs
    )
  }

  const ids = tracks.map((item) => [plugin, item.sourceContext]) as [
    PluginId,
    Record<string, any>
  ][]
  const idx = isShuffle.value ? Math.floor(Math.random() * tracks.length) : 0
  replacePlaylist(source, ids, idx)
}

const goTo = () => {
  const url = `/${props.type}/${props.pluginId}/${encodeURIComponent(JSON.stringify(props.sourceContext))}`
  router.push(url)
}
</script>

<style scoped lang="scss">
.cover {
  position: relative;
}
.cover-container {
  position: relative;
}
.cover-link {
  padding: 0;
  display: block;
  width: 100%;
  border-radius: 6px;
  &:focus-visible {
    outline: 2px solid var(--color-text);
    outline-offset: 4px;
  }
}
img {
  display: block;
  border-radius: 6px;
  width: 100%;
  user-select: none;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  background: var(--color-secondary-bg);
}

.cover-hover {
  &:hover {
    cursor: pointer;
    /* transform: scale(1.02); */
  }
}

.shade {
  position: absolute;
  top: 0;
  height: 100%;
  width: 100%;
  background: transparent;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  padding: 10px;
  box-sizing: border-box;
  pointer-events: none;
  z-index: 1;
  .play-button {
    opacity: 0;
    transform: translateY(8px);
  }
  &.visible .play-button,
  &:focus-within .play-button {
    opacity: 1;
    transform: translateY(0);
  }
}
.play-button {
  display: flex;
  justify-content: center;
  align-items: center;
  color: #000;
  background: var(--color-primary);
  min-width: 42px;
  min-height: 42px;
  height: 28%;
  width: 28%;
  border-radius: 50%;
  pointer-events: auto;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
  transition:
    opacity 160ms,
    transform 160ms;
  .svg-icon {
    height: 44%;
    margin: {
      left: 4px;
    }
  }
  &:hover {
    transform: scale(1.04) !important;
  }
  &:active {
    transform: scale(0.96) !important;
  }
  &:focus-visible {
    outline: 2px solid var(--color-text);
    outline-offset: 4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .play-button,
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}

.shadow {
  position: absolute;
  top: 12px;
  height: 100%;
  width: 100%;
  filter: blur(16px) opacity(0.6);
  transform: scale(0.92, 0.96);
  z-index: -1;
  background-size: cover;
  border-radius: 0.75em;
  aspect-ratio: 1 / 1;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
</style>
