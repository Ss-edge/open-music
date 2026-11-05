<template>
  <aside class="side-nav" :aria-label="$t('openMusic.navigation')">
    <router-link class="brand" to="/" aria-label="Open Music">
      <span class="brand-mark"><SvgIcon icon-class="logo" /></span>
      <span class="brand-name">open music<span class="brand-dot">.</span></span>
    </router-link>

    <nav class="primary-nav">
      <button
        v-if="enableLibrary"
        :class="{ active: isCurrentRoute('/') }"
        :aria-current="isCurrentRoute('/') ? 'page' : undefined"
        :title="$t('nav.home')"
        @click="handleRoute('/')"
      >
        <SvgIcon icon-class="home" /><span>{{ $t('nav.home') }}</span>
      </button>
      <button
        v-if="enableLibrary"
        :class="{ active: isCurrentRoute('/explore') }"
        :aria-current="isCurrentRoute('/explore') ? 'page' : undefined"
        :title="$t('nav.explore')"
        @click="handleRoute('/explore')"
      >
        <SvgIcon icon-class="explore" /><span>{{ $t('nav.explore') }}</span>
      </button>
    </nav>

    <nav class="library-nav">
      <button
        v-if="enableLibrary"
        :class="{ active: isCurrentRoute('/library') }"
        :title="$t('nav.library')"
        @click="handleRoute('/library')"
      >
        <SvgIcon icon-class="library" /><span>{{ $t('nav.library') }}</span>
      </button>
      <button
        v-if="enableStream"
        :class="{ active: isCurrentRoute('/stream') }"
        :title="$t('nav.stream')"
        @click="handleRoute('/stream')"
      >
        <SvgIcon icon-class="stream-icon" /><span>{{ $t('nav.stream') }}</span>
      </button>
      <button
        v-if="isElectron && enableLocal"
        :class="{ active: isCurrentRoute('/localMusic') }"
        :title="$t('nav.localMusic')"
        @click="handleRoute('/localMusic')"
      >
        <SvgIcon icon-class="local-music" /><span>{{ $t('nav.localMusic') }}</span>
      </button>
    </nav>

    <div class="saved-library">
      <div v-if="savedPlaylists.length" class="saved-heading">{{ $t('nav.playlist') }}</div>
      <router-link
        v-for="playlist in savedPlaylists"
        :key="playlist.pluginId + ':' + playlist.id"
        class="saved-playlist"
        :to="
          '/Playlist/' +
          playlist.pluginId +
          '/' +
          encodeURIComponent(JSON.stringify(playlist.sourceContext))
        "
        :title="playlist.name"
      >
        <img v-if="playlist.picUrl" :src="playlist.picUrl" alt="" loading="lazy" />
        <span v-else class="playlist-placeholder"><SvgIcon icon-class="list" /></span>
        <span class="playlist-copy"
          ><strong>{{ playlist.name }}</strong
          ><small>{{ $t('nav.playlist') }}</small></span
        >
      </router-link>
      <div v-if="!savedPlaylists.length" class="library-empty">
        <strong>{{ $t('openMusic.makeItYours') }}</strong>
        <p>{{ $t('openMusic.libraryHint') }}</p>
        <button
          class="library-action"
          @click="handleRoute(enableLibrary ? '/library' : '/settings')"
          >{{ $t('openMusic.openLibrary') }}</button
        >
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import SvgIcon from './SvgIcon.vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePluginMusic } from '../store/pluginMusic'
import { storeToRefs } from 'pinia'

const pluginStore = usePluginMusic()
const { enableLibrary, enableStream, enableLocal } = storeToRefs(pluginStore)
const router = useRouter()
const route = useRoute()
const isElectron = window.env?.isElectron || false
const savedPlaylists = computed(() =>
  pluginStore.services
    .filter(
      (service) =>
        service.status === 'login' &&
        (service.type === 'library'
          ? enableLibrary.value
          : service.type === 'stream'
            ? enableStream.value
            : enableLocal.value)
    )
    .flatMap((service) => pluginStore.playlists[service.code]?.data ?? [])
    .slice(0, 16)
)
const handleRoute = (path: string) => router.push(path)
const isCurrentRoute = (path: string) => path === route.path
</script>

<style scoped lang="scss">
.side-nav {
  position: fixed;
  top: calc(var(--open-titlebar-height, 0px) + 8px);
  bottom: var(--open-player-space, 104px);
  left: 8px;
  width: var(--open-sidebar-width);
  display: flex;
  flex-direction: column;
  padding: 24px 12px 12px;
  box-sizing: border-box;
  background: var(--color-body-bg);
  border-radius: 8px;
  z-index: 12;
  user-select: none;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px 24px;
  text-decoration: none;
  white-space: nowrap;
}
.brand-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--color-primary);
  color: #000;
  .svg-icon {
    width: 23px;
    height: 23px;
  }
}
.brand-name {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.035em;
}
.brand-dot {
  color: var(--color-primary);
}
.primary-nav,
.library-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.primary-nav:not(:empty) + .library-nav {
  margin-top: 24px;
}
.side-nav button {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 6px;
  color: var(--color-secondary);
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  -webkit-app-region: no-drag;
  transition:
    background-color 150ms,
    color 150ms;
  .svg-icon {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
  }
  &:hover {
    background: var(--color-secondary-bg);
    color: var(--color-text);
  }
  &.active {
    background: var(--color-secondary-bg);
    color: var(--color-text);
  }
}
.saved-library {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin-top: 16px;
}
.saved-heading {
  padding: 8px 12px;
  color: var(--color-secondary);
  font-size: 12px;
}
.saved-playlist {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px;
  border-radius: 6px;
  text-decoration: none;
  &:hover,
  &.router-link-active {
    background: var(--color-secondary-bg);
  }
  img,
  .playlist-placeholder {
    width: 44px;
    height: 44px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
  }
}
.playlist-placeholder {
  display: grid;
  place-items: center;
  background: var(--color-secondary-bg);
  .svg-icon {
    width: 20px;
    height: 20px;
  }
}
.playlist-copy {
  min-width: 0;
  strong {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 500;
  }
  small {
    display: block;
    margin-top: 4px;
    color: var(--color-secondary);
    font-size: 12px;
  }
}
.library-empty {
  padding: 18px 14px;
  border-radius: 8px;
  background: var(--color-secondary-bg);
  strong {
    font-size: 14px;
  }
  p {
    color: var(--color-secondary);
    font-size: 12px;
    line-height: 1.7;
    margin: 10px 0 18px;
  }
  .library-action {
    width: auto;
    min-height: 32px;
    padding: 7px 16px;
    color: var(--color-primary-contrast);
    background: var(--color-text);
    border-radius: 20px;
    font-size: 12px;
  }
}
@media (max-width: 1000px) {
  .brand-name {
    font-size: 21px;
  }
}

@media (max-height: 760px) {
  .library-empty {
    padding: 14px;
    p {
      display: none;
    }
    .library-action {
      margin-top: 14px;
    }
  }
}
@media (max-width: 820px) {
  .side-nav {
    padding: 20px 6px 10px;
    align-items: center;
  }
  .brand {
    padding: 0 0 22px;
  }
  .brand-name,
  .side-nav button span,
  .saved-library {
    display: none;
  }
  .side-nav button {
    justify-content: center;
    gap: 0;
    padding: 12px;
  }
}
</style>
