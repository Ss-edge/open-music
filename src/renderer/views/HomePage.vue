<template>
  <div class="home-page">
    <div class="home-filters" aria-label="发现音乐">
      <button class="selected" aria-current="page">全部</button>
      <button @click="toExplore('playlist')">{{ $t('nav.playlist') }}</button>
      <button @click="toExplore('artist')">{{ $t('nav.artist') }}</button>
    </div>
    <header class="home-heading">
      <h1>现在，听点喜欢的</h1>
      <p>在熟悉的旋律里，找到自己的节奏。</p>
    </header>
    <div v-if="recommendPlaylist.length" class="quick-picks">
      <router-link
        v-for="item in recommendPlaylist.slice(0, 6)"
        :key="`${item.pluginId}:${item.id}`"
        :to="`/Playlist/${item.pluginId}/${encodeURIComponent(JSON.stringify(item.sourceContext))}`"
        class="quick-pick"
      >
        <img :src="item.picUrl" alt="" loading="lazy" />
        <span>{{ item.name }}</span>
        <SvgIcon icon-class="arrow-right" />
      </router-link>
    </div>
    <div v-else class="home-shortcuts">
      <router-link to="/library" class="home-shortcut"
        ><SvgIcon icon-class="library" /><span>你的音乐库</span><SvgIcon icon-class="arrow-right"
      /></router-link>
      <button class="home-shortcut" @click="toExplore('chart')"
        ><SvgIcon icon-class="explore" /><span>{{ $t('home.charts') }}</span
        ><SvgIcon icon-class="arrow-right"
      /></button>
      <button class="home-shortcut" @click="toExplore('newAlbum')"
        ><SvgIcon icon-class="local-music" /><span>{{ $t('home.newAlbum') }}</span
        ><SvgIcon icon-class="arrow-right"
      /></button>
    </div>
    <div v-if="pluginId" class="index-row personal-row">
      <div class="section-heading"><h2>为你而来</h2></div>
      <div class="for-you-row"
        ><DailyTracksCard :key="pluginId" :plugin="pluginId" /><FMCard
      /></div>
    </div>
    <div v-if="loading" class="loading-shelves" role="status" aria-label="正在加载推荐音乐">
      <span>正在为你寻找音乐…</span>
      <div class="skeleton-row" aria-hidden="true"
        ><div v-for="index in 5" :key="index" class="skeleton-cover"></div
      ></div>
    </div>
    <div v-if="recommendPlaylist.length" class="index-row">
      <div class="section-heading"
        ><h2>{{ $t('home.recommendPlaylist') }}</h2
        ><button @click="toExplore('playlist', '推荐歌单')">{{ $t('home.seeMore') }}</button></div
      >
      <CoverRow :items="recommendPlaylist" type="Playlist" sub-text="copywriter" />
    </div>
    <div v-if="recommendArtists.length" class="index-row">
      <div class="section-heading"
        ><h2>{{ $t('home.recommendArtist') }}</h2
        ><button @click="toExplore('artist')">{{ $t('home.seeMore') }}</button></div
      >
      <CoverRow :items="recommendArtists" type="Artist" :colunm-number="6" />
    </div>
    <div v-if="newReleasesAlbum.items.length" class="index-row">
      <div class="section-heading"
        ><h2>{{ $t('home.newAlbum') }}</h2
        ><button @click="toExplore('newAlbum')">{{ $t('home.seeMore') }}</button></div
      >
      <CoverRow :items="newReleasesAlbum.items" type="Album" sub-text="artist" />
    </div>
    <div v-if="topList.items.length" class="index-row">
      <div class="section-heading"
        ><h2>{{ $t('home.charts') }}</h2
        ><button @click="toExplore('chart')">{{ $t('home.seeMore') }}</button></div
      >
      <CoverRow :items="topList.items" type="Playlist" sub-text="copywriter" />
    </div>
    <section v-if="!loading && !hasRecommendations" class="home-empty">
      <SvgIcon icon-class="local-music" />
      <div
        ><h2>{{ pluginId ? '更多好音乐，等你发现' : '从你的音乐开始' }}</h2
        ><p>{{
          pluginId
            ? '暂时没有获取到推荐。你可以浏览发现页，或切换音乐来源后重试。'
            : '添加音乐来源，或打开本地音乐，把喜欢的歌带到这里。'
        }}</p></div
      >
      <div class="empty-actions">
        <button v-if="pluginId" class="primary-action" @click="loadData">重新加载</button>
        <router-link v-else to="/settings" class="primary-action">添加音乐来源</router-link>
        <router-link v-if="pluginMusicStore.enableLocal && isElectron" to="/localMusic"
          >本地音乐</router-link
        >
        <button v-else @click="toExplore('playlist')">发现音乐</button>
      </div>
    </section>
    <section v-if="general.showBanner && banner.length" class="banner-shelf" aria-label="音乐动态">
      <button v-for="item in banner.slice(0, 2)" :key="item.id" @click="handleBannerClick(item)"
        ><img :src="item.picUrl" :alt="item.typeTitle || '音乐推荐'" loading="lazy"
      /></button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import CoverRow from '../components/CoverRow.vue'
import DailyTracksCard from '../components/DailyTracksCard.vue'
import FMCard from '../components/FMCard.vue'
import SvgIcon from '../components/SvgIcon.vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../store/settings'
import { useNormalStateStore } from '../store/state'
import { usePluginMusic } from '../store/pluginMusic'
import { usePlayerStore } from '../store/player'
import { storeToRefs } from 'pinia'
import Utils from '../utils'
import { Album, Artist, Banner, ExploreTab, Playlist, PluginId } from '@/types/plugin'

const { general } = storeToRefs(useSettingsStore())
const { exploreTab } = storeToRefs(useNormalStateStore())
const pluginMusicStore = usePluginMusic()
const { pluginMethodCall } = pluginMusicStore
const { addTrackToPlayNext } = usePlayerStore()
const router = useRouter()
const isElectron = window.env?.isElectron || false
const banner = ref<Banner[]>([])
const loading = ref(false)
let loadRequest = 0
const pluginId = computed(() => {
  const active = pluginMusicStore.services.find((item) => item.active)
  return active?.code ?? ('' as PluginId)
})
const recommendPlaylist = ref<Playlist[]>([])
const recommendArtists = ref<Artist[]>([])
const newReleasesAlbum = ref<{ hasMore: boolean; items: Album[] }>({ hasMore: false, items: [] })
const topList = ref<{ items: Playlist[] }>({ items: [] })
const hasRecommendations = computed(() =>
  Boolean(
    recommendPlaylist.value.length ||
      recommendArtists.value.length ||
      newReleasesAlbum.value.items.length ||
      topList.value.items.length
  )
)
const toExplore = (tab: ExploreTab, category = '全部') => {
  exploreTab.value = tab
  router.push({ name: 'explore', query: { category, tab, type: '全部' } })
}
const handleBannerClick = (item: Banner) => {
  if (item.type === 'track') addTrackToPlayNext([[item.pluginId, item.sourceContext]], true, true)
  else if (item.type === 'album')
    router.push(`/album/${item.pluginId}/${encodeURIComponent(JSON.stringify(item.sourceContext))}`)
  else if (item.type === 'playlist')
    router.push(
      `/playlist/${item.pluginId}/${encodeURIComponent(JSON.stringify(item.sourceContext))}`
    )
  else if (item.type === 'mv')
    router.push(`/mv/${item.pluginId}/${encodeURIComponent(JSON.stringify(item.sourceContext))}`)
  else if (item.url) Utils.openExternal(item.url)
}
const loadData = async () => {
  const request = ++loadRequest
  const plugin = pluginId.value
  recommendPlaylist.value = []
  recommendArtists.value = []
  newReleasesAlbum.value = { hasMore: false, items: [] }
  topList.value.items = []
  banner.value = []
  if (!plugin) {
    loading.value = false
    return
  }
  loading.value = true
  const current = () => request === loadRequest
  await Promise.allSettled([
    pluginMethodCall(plugin, 'getRecommendPlaylist').then((res) => {
      if (current())
        recommendPlaylist.value = res.data.map((item) => ({ ...item, pluginId: plugin }))
    }),
    pluginMethodCall(plugin, 'topArtists', { reset: true, isFull: false }).then((res) => {
      if (current())
        recommendArtists.value = res.data.slice(0, 6).map((item) => ({ ...item, pluginId: plugin }))
    }),
    pluginMethodCall(plugin, 'topAlbums').then((data) => {
      if (!current()) return
      newReleasesAlbum.value = {
        hasMore: data.hasMore,
        items: data.albums.map((item) => ({
          ...item,
          artists: item.artists?.map((artist) => ({ ...artist, pluginId: plugin })),
          pluginId: plugin
        }))
      }
    }),
    pluginMethodCall(plugin, 'rankTop').then((res) => {
      if (current())
        topList.value.items = res.data.slice(0, 5).map((item) => ({ ...item, pluginId: plugin }))
    }),
    ...(general.value.showBanner
      ? [
          pluginMethodCall(plugin, 'getBanner').then((res) => {
            if (current()) banner.value = res.data.map((item) => ({ ...item, pluginId: plugin }))
          })
        ]
      : [])
  ])
  if (current()) loading.value = false
}
watch(pluginId, loadData, { immediate: true })
</script>

<style scoped lang="scss">
.home-page {
  padding-bottom: 24px;
}
.home-filters {
  display: flex;
  gap: 8px;
  margin: 0 0 28px;
  button {
    padding: 8px 16px;
    border-radius: 24px;
    color: var(--color-text);
    background: var(--color-secondary-bg-for-transparent);
    font-size: 14px;
    transition: background-color 160ms;
    &:hover {
      background: var(--color-secondary-bg);
    }
    &.selected {
      background: var(--color-text);
      color: var(--color-body-bg);
    }
  }
}
.home-heading {
  margin-bottom: 24px;
  h1 {
    font-size: 30px;
    line-height: 1.25;
    letter-spacing: -0.03em;
    margin: 0 0 8px;
    font-weight: 800;
  }
  p {
    color: var(--color-secondary);
    font-size: 14px;
    margin: 0;
  }
}
.quick-picks,
.home-shortcuts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.quick-pick,
.home-shortcut {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  overflow: hidden;
  border-radius: 6px;
  background: var(--color-secondary-bg-for-transparent);
  color: var(--color-text);
  text-align: left;
  text-decoration: none;
  font-size: 14px;
  font-weight: 700;
  min-height: 64px;
  padding: 0 14px 0 0;
  transition: background-color 160ms;
  img {
    width: 64px;
    height: 64px;
    object-fit: cover;
    flex-shrink: 0;
  }
  span {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  > .svg-icon:last-child {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: var(--color-secondary);
  }
  &:hover {
    background: var(--color-secondary-bg);
  }
}
.home-shortcut {
  padding-left: 18px;
  > .svg-icon:first-child {
    width: 24px;
    height: 24px;
    color: var(--color-primary);
    flex-shrink: 0;
  }
}
.index-row {
  margin-top: 32px;
}
.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  h2 {
    margin: 0;
    font-size: 23px;
    line-height: 1.35;
    font-weight: 750;
    letter-spacing: -0.025em;
  }
  button {
    padding: 4px 0;
    color: var(--color-secondary);
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    &:hover {
      color: var(--color-text);
      text-decoration: underline;
    }
  }
}
.for-you-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.loading-shelves {
  margin: 32px 0;
  color: var(--color-secondary);
  font-size: 14px;
  .skeleton-row {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 20px;
    margin-top: 20px;
  }
  .skeleton-cover {
    aspect-ratio: 1;
    border-radius: 6px;
    background: var(--color-secondary-bg-for-transparent);
  }
}
.home-empty {
  margin-top: 32px;
  padding: 28px;
  background: var(--color-secondary-bg-for-transparent);
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  > .svg-icon {
    width: 36px;
    height: 36px;
    color: var(--color-secondary);
    flex-shrink: 0;
  }
  > div:not(.empty-actions) {
    flex: 1;
    min-width: 220px;
  }
  h2 {
    margin: 0 0 8px;
    font-size: 20px;
  }
  p {
    margin: 0;
    line-height: 1.7;
    font-size: 14px;
    color: var(--color-secondary);
    max-width: 58ch;
  }
}
.empty-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  font-weight: 700;
  button {
    color: var(--color-text);
  }
  .primary-action {
    background: var(--color-primary);
    color: #000;
    padding: 12px 18px;
    border-radius: 24px;
    text-decoration: none;
  }
}
.banner-shelf {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 36px;
  button {
    padding: 0;
    border-radius: 8px;
    overflow: hidden;
  }
  img {
    display: block;
    width: 100%;
    aspect-ratio: 27 / 10;
    object-fit: cover;
  }
}
button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 4px;
}
@media (max-width: 1100px) {
  .quick-picks,
  .home-shortcuts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .home-shortcuts > :last-child {
    grid-column: 1 / -1;
  }
  .home-empty {
    padding: 22px;
  }
  .home-heading h1 {
    font-size: 27px;
  }
}
@media (max-width: 840px) {
  .for-you-row {
    grid-template-columns: 1fr;
  }
  .banner-shelf {
    grid-template-columns: 1fr;
  }
  .section-heading h2 {
    font-size: 21px;
  }
}
@media (prefers-reduced-motion: reduce) {
  button,
  a {
    transition: none;
  }
}
</style>
