<template>
  <div>
    <nav :class="{ 'has-custom-titlebar': useCustomBar || isWin }" :style="navStyle">
      <LinuxTitleBar v-if="useCustomBar" />
      <Win32TitleBar v-if="isWin" />

      <div class="navigation-buttons">
        <button-icon
          :aria-label="$t('openMusic.back')"
          :title="$t('openMusic.back')"
          @click.stop="router.go(-1)"
        >
          <svg-icon icon-class="arrow-left" />
        </button-icon>
        <button-icon
          :aria-label="$t('openMusic.forward')"
          :title="$t('openMusic.forward')"
          @click.stop="router.go(1)"
        >
          <svg-icon icon-class="arrow-right" />
        </button-icon>
      </div>
      <div v-if="route.name === 'search'" class="search-tabs">
        <div
          :class="{ active: searchTab === 'tracks' }"
          class="item"
          @click="searchTab = 'tracks'"
          >{{ $t('nav.track') }}</div
        >
        <div
          :class="{ active: searchTab === 'albums' }"
          class="item"
          @click="searchTab = 'albums'"
          >{{ $t('nav.album') }}</div
        >
        <div
          :class="{ active: searchTab === 'artists' }"
          class="item"
          @click="searchTab = 'artists'"
          >{{ $t('nav.artist') }}</div
        >
        <div
          :class="{ active: searchTab === 'playlists' }"
          class="item"
          @click="searchTab = 'playlists'"
          >{{ $t('nav.playlist') }}</div
        >
        <div :class="{ active: searchTab === 'mvs' }" class="item" @click="searchTab = 'mvs'">{{
          $t('nav.mv')
        }}</div>
      </div>
      <div v-if="route.name === 'explore'" class="search-tabs">
        <div
          class="item"
          :class="{ active: exploreTab === 'playlist' }"
          @click="toExplore('playlist')"
          >{{ $t('nav.playlist') }}</div
        >
        <div class="item" :class="{ active: exploreTab === 'chart' }" @click="toExplore('chart')">{{
          $t('nav.chart')
        }}</div>
        <div
          class="item"
          :class="{ active: exploreTab === 'newTrack' }"
          @click="toExplore('newTrack')"
          >{{ $t('nav.newTrack') }}</div
        >
        <div
          class="item"
          :class="{ active: exploreTab === 'newAlbum' }"
          @click="toExplore('newAlbum')"
          >{{ $t('nav.newAlbum') }}</div
        >
        <div
          class="item"
          :class="{ active: exploreTab === 'artist' }"
          @click="toExplore('artist')"
          >{{ $t('nav.artist') }}</div
        >
      </div>
      <div class="right-part">
        <SearchBox
          ref="searchBoxRef"
          :services="searchSources"
          :default-code="general.searchPlugin"
          :clear-keywords="true"
          :show-input-initially="true"
          :input-width="220"
          :placeholder="$t('openMusic.searchPlaceholder')"
          @keydown-enter="doSearch"
        />
        <button
          class="profile-button"
          :aria-label="$t('openMusic.account')"
          :title="$t('openMusic.account')"
          @click="showUserProfileMenu"
        >
          <img class="avatar" :src="avatarUrl" alt="" loading="lazy" />
        </button>
      </div>
    </nav>
    <ContextMenu ref="userProfileMenu">
      <div v-if="!isLooseLoggedIn" class="item" @click="toLogin">
        <svg-icon icon-class="login" />
        {{ $t('login.login') }}
      </div>
      <div v-if="isLooseLoggedIn" class="item" @click="logout">
        <svg-icon icon-class="logout" />
        {{ $t('library.userProfileMenu.logout') }}
      </div>
      <div class="item" @click="toGitHub">
        <svg-icon icon-class="github" />
        {{ $t('nav.github') }}
      </div>
      <div class="item" @click="openLogFile">
        <svg-icon icon-class="log" />
        {{ $t('nav.log') }}
      </div>
    </ContextMenu>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, onMounted } from 'vue'
import ButtonIcon from './ButtonIcon.vue'
import SvgIcon from './SvgIcon.vue'
import SearchBox from './SearchBox.vue'
import ContextMenu from './ContextMenu.vue'
import LinuxTitleBar from './LinuxTitleBar.vue'
import Win32TitleBar from './Win32TitleBar.vue'
import { useRouter, useRoute } from 'vue-router'
import { useNormalStateStore } from '../store/state'
import { useSettingsStore } from '../store/settings'
import { usePluginMusic } from '../store/pluginMusic'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { openExternal } from '../utils'
import { PluginId } from '@/types/schemas'
import { ExploreTab } from '@/types/plugin.js'

const normalStateStore = useNormalStateStore()
const { searchTab, exploreTab } = storeToRefs(normalStateStore)
const { showToast } = normalStateStore
const { t } = useI18n()
const { general } = storeToRefs(useSettingsStore())
const { useCustomTitlebar } = toRefs(general.value)

const pluginStore = usePluginMusic()
const { services, users, searchSources } = storeToRefs(pluginStore)
const { pluginMethodCall, handleStatusChange } = pluginStore

const router = useRouter()
const route = useRoute()

const searchBoxRef = ref<InstanceType<typeof SearchBox>>()
const keywords = ref('')
const useCustomBar = ref(false)

const activeUser = computed(() => {
  const active = services.value.find((item) => item.active)
  return active ? users.value[active.code] : null
})

const isLooseLoggedIn = computed(() => {
  return activeUser.value ? !!activeUser.value.userId : false
})
const isLinux = computed(() => window.env?.isLinux || false)
const isWin = computed(() => window.env?.isWindows)
const navStyle = computed(() => ({
  '--open-native-bar': isLinux.value || isWin.value ? '32px' : '0px'
}))

defineExpose({ searchBoxRef })

const toLogin = (): void => {
  const active = services.value.find((item) => item.active)
  if (!active) return
  router.push(`/login/${active.code}/QrCode`)
}

const toGitHub = (): void => {
  openExternal('https://github.com/stark81/VutronMusic')
}

const openLogFile = () => {
  window.mainApi?.send('openLogFile')
}

const toExplore = (Category: ExploreTab) => {
  exploreTab.value = Category
}

const logout = async () => {
  const { showConfirm } = useNormalStateStore()
  if (!(await showConfirm('确定要退出登录吗？'))) return

  const plugin = services.value.find((item) => item.active)!

  if (await showConfirm(`确定登出${plugin.name}吗？`)) {
    pluginMethodCall(plugin.code, 'doLogout').then(({ code }) => {
      if (code === 200) {
        handleStatusChange(plugin.code, 'logout')
      }
    })
  }
}

const avatarUrl = computed(() => {
  return `${activeUser.value?.avatarUrl || 'https://s4.music.126.net/style/web2/img/default/default_avatar.jpg?param=60y60'}`
})

const userProfileMenu = ref<InstanceType<typeof ContextMenu>>()

const showUserProfileMenu = (e: MouseEvent): void => {
  userProfileMenu.value?.openMenu(e)
}

/**
 * 解析实际使用的搜索渠道。
 * 优先级：当前选择 → 上次使用的渠道 → 当前活跃插件 → 列表第一项。
 * 避免插件被删除/重命名后把非法的 plugin 传进搜索页。
 */
const resolveSearchPlugin = (requested?: PluginId): PluginId | undefined => {
  const list = searchSources.value
  const activeCode = services.value.find((item) => item.active)?.code
  return (
    list.find((item) => item.code === requested)?.code ??
    list.find((item) => item.code === general.value.searchPlugin)?.code ??
    list.find((item) => item.code === activeCode)?.code ??
    list[0]?.code
  )
}

const doSearch = (keyword: string, plugin: PluginId) => {
  const trimmed = keyword.trim()
  if (!trimmed) return

  const target = resolveSearchPlugin(plugin)
  if (!target) {
    showToast(t('toast.noSearchChannel'))
    return
  }

  keywords.value = trimmed
  // 持久化最后选择的搜索插件
  general.value.searchPlugin = target
  router.push({
    name: 'search',
    query: { keywords: trimmed, plugin: target }
  })
}

onMounted(() => {
  useCustomBar.value = useCustomTitlebar.value && isLinux.value
})
</script>

<style lang="scss" scoped>
nav {
  position: fixed;
  top: calc(var(--open-titlebar-height, 0px) + 8px);
  right: 8px;
  left: calc(var(--open-sidebar-width) + 16px);
  display: flex;
  align-items: center;
  gap: 16px;
  height: 72px;
  padding: 0 24px;
  box-sizing: border-box;
  background: var(--color-body-bg);
  border-radius: 8px 8px 0 0;
  z-index: 10;
  -webkit-app-region: drag;
}
.navigation-buttons {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  .svg-icon {
    width: 18px;
    height: 18px;
  }
  button {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    margin: 0;
    background: var(--color-secondary-bg);
    -webkit-app-region: no-drag;
    &:hover {
      background: var(--color-secondary-bg-for-transparent);
    }
  }
}
.search-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  .item {
    white-space: nowrap;
    cursor: pointer;
    border-radius: 18px;
    padding: 7px 12px;
    font-size: 12px;
    font-weight: 500;
    background: var(--color-secondary-bg);
    -webkit-app-region: no-drag;
    &:hover {
      background: var(--color-secondary-bg-for-transparent);
    }
  }
  .active {
    background: var(--color-text);
    color: var(--color-primary-contrast);
  }
}
.right-part {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
  min-width: 0;
  -webkit-user-drag: none;
  :deep(.search-container) {
    height: 44px;
    border-radius: 24px;
    background: var(--color-secondary-bg);
  }
  :deep(.search-container:focus-within) {
    outline: 2px solid var(--color-text);
    outline-offset: -2px;
  }
  :deep(.search-icon) {
    width: 42px;
    height: 42px;
  }
  :deep(.search-icon .svg-icon) {
    width: 20px;
    height: 20px;
    opacity: 1;
    color: var(--color-secondary);
  }
  :deep(.search-input) {
    max-width: 22vw;
    font-size: 13px;
  }
  :deep(.custom-select) {
    min-width: 82px;
    max-width: 100px;
  }
}
.profile-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  padding: 0;
  flex-shrink: 0;
  background: var(--color-secondary-bg);
  -webkit-app-region: no-drag;
  .avatar {
    display: block;
    width: 28px;
    height: 28px;
    margin: auto;
    border-radius: 50%;
    object-fit: cover;
    -webkit-user-drag: none;
  }
}
@media (max-width: 1200px) {
  nav {
    gap: 10px;
    padding: 0 20px;
  }
  .search-tabs {
    gap: 4px;
    .item {
      padding: 7px 9px;
    }
  }
  .right-part {
    gap: 10px;
    :deep(.search-input) {
      max-width: 15vw;
    }
  }
}
@media (max-width: 1000px) {
  .search-tabs {
    gap: 2px;
    .item {
      font-size: 11px;
      padding: 7px;
    }
  }
  .navigation-buttons {
    gap: 2px;
  }
  .right-part {
    gap: 8px;
    :deep(.custom-select) {
      min-width: 70px;
      max-width: 70px;
    }
    :deep(.search-input) {
      max-width: 12vw;
    }
  }
}
</style>
