<template>
  <div class="daily-recommend-card">
    <button class="daily-open" aria-label="打开每日推荐" @click="goToDailyTracks">
      <span class="cover-art"
        ><img v-if="image" :src="image" alt="" loading="lazy" /><svg-icon
          v-else
          icon-class="local-music"
      /></span>
      <span class="daily-info"
        ><strong>每日推荐</strong
        ><span>{{
          loading
            ? '正在寻找适合你的音乐…'
            : tracks.length
              ? `${tracks.length} 首歌曲，为你精选`
              : '打开推荐，发现新的旋律'
        }}</span></span
      >
    </button>
    <button
      class="play-button"
      :disabled="!tracks.length || loading"
      aria-label="播放每日推荐"
      @click="playDailyTracks"
      ><svg-icon icon-class="play"
    /></button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import SvgIcon from './SvgIcon.vue'
import { useRouter } from 'vue-router'
import { useNormalStateStore } from '../store/state'
import { usePlayerStore } from '../store/player'
import { usePluginMusic } from '../store/pluginMusic'
import { storeToRefs } from 'pinia'
import { PluginId } from '@/types/plugin'
import { PlaylistSourceInfo } from '@/types/music'

const props = defineProps<{ plugin: PluginId }>()
const stateStore = useNormalStateStore()
const { dailyTracks } = storeToRefs(stateStore)
const pluginMusic = usePluginMusic()
const { resizeImage, pluginMethodCall } = pluginMusic
const playerStore = usePlayerStore()
const { isShuffle } = storeToRefs(playerStore)
const { replacePlaylist } = playerStore
const tracks = computed(() => dailyTracks.value.filter((track) => track.pluginId === props.plugin))
const firstTrack = computed(() => tracks.value[0] || null)
const image = ref('')
const loading = ref(true)
let active = true
onBeforeUnmount(() => {
  active = false
})
const router = useRouter()
const goToDailyTracks = () =>
  router.push({ name: 'dailySongs', params: { pluginId: props.plugin } })
const playDailyTracks = () => {
  if (!tracks.value.length || loading.value) return
  const source: PlaylistSourceInfo = {
    type: 'DailySongs',
    plugin: props.plugin,
    sourceContext: { id: '/daily/songs' }
  }
  const trackIDs = tracks.value.map((track) => [track.pluginId, track.sourceContext]) as [
    PluginId,
    Record<string, any>
  ][]
  const index = isShuffle.value ? Math.floor(Math.random() * trackIDs.length) : 0
  replacePlaylist(source, trackIDs, index)
}
watch(
  firstTrack,
  async (track) => {
    image.value = track?.picUrl || ''
    if (!track?.picUrl) return
    try {
      const resized = await resizeImage(track.pluginId, track.picUrl, 512)
      if (firstTrack.value === track) image.value = resized
    } catch {
      // Keep the original artwork if the source cannot resize it.
    }
  },
  { immediate: true }
)
onMounted(async () => {
  try {
    const result = await pluginMethodCall(props.plugin, 'getRecommendTracks')
    if (!active) return
    dailyTracks.value = result.data.map((item) => ({
      ...item,
      album: { ...item.album, pluginId: props.plugin },
      artists: item.artists.map((artist) => ({ ...artist, pluginId: props.plugin })),
      albumArtists: item.albumArtists.map((artist) => ({ ...artist, pluginId: props.plugin })),
      pluginId: props.plugin
    }))
  } catch {
    if (active) dailyTracks.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.daily-recommend-card {
  display: flex;
  align-items: center;
  min-width: 0;
  height: 140px;
  border-radius: 8px;
  background: var(--color-secondary-bg-for-transparent);
  padding: 18px;
  gap: 14px;
  transition: background-color 160ms;
  &:hover {
    background: var(--color-secondary-bg);
  }
}
.daily-open {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 18px;
  padding: 0;
  min-width: 0;
  color: var(--color-text);
  text-align: left;
}
.cover-art {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 104px;
  height: 104px;
  background: var(--color-secondary-bg);
  border-radius: 6px;
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .svg-icon {
    width: 36px;
    height: 36px;
    color: var(--color-primary);
  }
}
.daily-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  strong {
    font-size: 20px;
    font-weight: 750;
  }
  > span {
    color: var(--color-secondary);
    font-size: 13px;
    line-height: 1.6;
  }
}
.play-button {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #000;
  .svg-icon {
    width: 18px;
    height: 18px;
    margin-left: 3px;
  }
  &:hover:not(:disabled) {
    transform: scale(1.04);
  }
  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
}
button:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 4px;
}
@media (max-width: 1100px) {
  .daily-recommend-card {
    padding: 14px;
    height: 120px;
  }
  .cover-art {
    width: 84px;
    height: 84px;
  }
  .daily-open {
    gap: 12px;
  }
  .daily-info strong {
    font-size: 18px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .daily-recommend-card,
  .play-button {
    transition: none;
  }
}
</style>
