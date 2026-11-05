<template>
  <div class="fm">
    <button
      class="cover-button"
      :disabled="!track"
      aria-label="打开私人 FM 专辑"
      @click="goToAlbum"
    >
      <img v-if="image" class="cover" :src="image" alt="" loading="lazy" />
      <svg-icon v-else class="cover-placeholder" icon-class="fm" />
    </button>
    <div class="right-part">
      <div class="info"
        ><div class="card-name">私人 FM</div
        ><div class="title">{{ track?.name || '下一首，也许正合心意' }}</div
        ><div class="artist"
          ><ArtistsInLine v-if="artists.length" :artists="artists" /><span v-else
            >开启你的专属电台</span
          ></div
        ></div
      >
      <div class="controls">
        <button-icon title="不喜欢" :disabled="!isPersonalFM || !track" @click="moveToFMTrash"
          ><svg-icon icon-class="thumbs-down"
        /></button-icon>
        <button-icon
          :title="$t(isPlaying ? 'player.pause' : 'player.play')"
          :aria-label="$t(isPlaying ? 'player.pause' : 'player.play')"
          class="play"
          @click="handlePlay"
          ><svg-icon :icon-class="isPlaying ? 'pause' : 'play'"
        /></button-icon>
        <button-icon :title="$t('player.next')" :disabled="!isPersonalFM" @click="playNext(true)"
          ><svg-icon icon-class="next"
        /></button-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonIcon from './ButtonIcon.vue'
import ArtistsInLine from './ArtistsInLine.vue'
import SvgIcon from './SvgIcon.vue'
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '../store/player'
import { usePluginMusic } from '../store/pluginMusic'
import { useRouter } from 'vue-router'

const router = useRouter()
const playerStore = usePlayerStore()
const { moveToFMTrash, playPersonalFM, playNext, playOrPause } = playerStore
const { currentTrack, fmTracks, playing, isPersonalFM } = storeToRefs(playerStore)
const { resizeImage } = usePluginMusic()
const handlePlay = () => {
  if (isPersonalFM.value && playing.value) playOrPause()
  else playPersonalFM(true)
}
const track = computed(() => (isPersonalFM.value ? currentTrack.value : fmTracks.value[0]))
const isPlaying = computed(() => playing.value && isPersonalFM.value)
const artists = computed(() => track.value?.artists || [])
const image = ref('')
const goToAlbum = () => {
  const album = track.value?.album
  if (!album || String(album.id) === '0') return
  router.push(
    `/album/${album.pluginId || track.value?.pluginId}/${encodeURIComponent(JSON.stringify(album.sourceContext))}`
  )
}
watch(
  track,
  async (value) => {
    image.value = value?.picUrl || ''
    if (!value?.picUrl) return
    try {
      const resized = await resizeImage(value.pluginId, value.picUrl, 512)
      if (track.value === value) image.value = resized
    } catch {
      // The original cover is still usable if resizing is unavailable.
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.fm {
  padding: 18px;
  background: var(--color-secondary-bg-for-transparent);
  border-radius: 8px;
  display: flex;
  align-items: center;
  min-width: 0;
  height: 140px;
  box-sizing: border-box;
  gap: 18px;
  transition: background-color 160ms;
  &:hover {
    background: var(--color-secondary-bg);
  }
}
.cover-button {
  height: 104px;
  width: 104px;
  padding: 0;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  background: var(--color-secondary-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  .cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    user-select: none;
  }
  .cover-placeholder {
    width: 38px;
    height: 38px;
    color: var(--color-primary);
  }
}
.right-part {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  min-width: 0;
  gap: 12px;
  color: var(--color-text);
}
.info {
  min-width: 0;
  flex: 1;
}
.card-name {
  margin-bottom: 7px;
  font-size: 13px;
  color: var(--color-secondary);
  font-weight: 600;
}
.title {
  font-size: 18px;
  font-weight: 750;
  margin-bottom: 5px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-height: 1.4;
  word-break: break-word;
}
.artist {
  color: var(--color-secondary);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  .button-icon {
    margin: 0;
    padding: 4px;
    &:disabled {
      opacity: 0.3;
      cursor: default;
    }
  }
  .svg-icon {
    width: 14px;
    height: 14px;
  }
  .play {
    background: var(--color-primary);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    :deep(.svg-icon) {
      width: 16px;
      height: 16px;
      color: #000;
    }
  }
}
button:focus-visible,
:deep(button:focus-visible) {
  outline: 2px solid var(--color-text);
  outline-offset: 4px;
}
@media (max-width: 1100px) {
  .fm {
    padding: 14px;
    height: 120px;
    gap: 12px;
  }
  .cover-button {
    height: 84px;
    width: 84px;
  }
  .title {
    font-size: 16px;
  }
  .card-name {
    margin-bottom: 4px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .fm {
    transition: none;
  }
}
</style>
