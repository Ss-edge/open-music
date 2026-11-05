const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const { parse, compileScript } = require('@vue/compiler-sfc')
const ts = require('typescript')
const Vue = require('vue')
const { createRouter, createMemoryHistory } = require('vue-router')

function component(relativePath, router, props = {}) {
  const filename = path.join(__dirname, '..', relativePath)
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
  const script = compileScript(descriptor, { id: 'opaque-route-regression' })
  const code = ts.transpileModule(script.content, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      console,
      window: {},
      require(id) {
        if (id === 'vue') return { ...Vue, onMounted() {}, onBeforeUnmount() {} }
        if (id === 'pinia') return { storeToRefs: (store) => store }
        if (id === 'vue-router') return { useRouter: () => router }
        if (id.includes('store/settings'))
          return { useSettingsStore: () => ({ general: Vue.ref({ showBanner: false }) }) }
        if (id.includes('store/state'))
          return { useNormalStateStore: () => ({ exploreTab: Vue.ref('playlist') }) }
        if (id.includes('store/player'))
          return {
            usePlayerStore: () => ({
              isShuffle: Vue.ref(false),
              addTrackToPlayNext() {},
              replacePlaylist() {}
            })
          }
        if (id.includes('store/pluginMusic')) return { usePluginMusic: () => ({ services: [] }) }
        if (id.endsWith('.vue') || id.endsWith('/utils')) return { default: {} }
        throw new Error(`Unexpected boundary ${id}`)
      }
    },
    { filename }
  )
  return module.exports.default.setup(Vue.reactive(props), { expose() {} })
}

function navigation() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: {} },
      { path: '/Playlist/:pluginId/:sourceContext', name: 'Playlist', component: {} },
      { path: '/album/:pluginId/:sourceContext', name: 'album', component: {} },
      { path: '/Artist/:pluginId/:sourceContext', name: 'ArtistPage', component: {} },
      { path: '/mv/:pluginId/:sourceContext', name: 'mv', component: {} },
      { path: '/:pathMatch(.*)*', redirect: '/' }
    ]
  })
  let last
  return {
    router,
    boundary: {
      push(value) {
        last = router.push(value)
        return last
      }
    },
    finished: () => last
  }
}

const sourceContext = {
  url: 'https://example.test/music/歌曲?id=123&source=a#歌词',
  nested: { path: 'D:/音乐/测试?.flac' }
}
for (const [type, name] of [
  ['Playlist', 'Playlist'],
  ['Album', 'album'],
  ['Artist', 'ArtistPage']
]) {
  test(`${type} cover preserves opaque URL context in one router parameter`, async () => {
    const nav = navigation()
    const state = component('src/renderer/components/CoverBox.vue', nav.boundary, {
      id: 1,
      pluginId: 'source',
      type,
      sourceContext
    })
    state.goTo()
    await nav.finished()
    assert.equal(nav.router.currentRoute.value.name, name)
    assert.equal(nav.router.currentRoute.value.params.sourceContext, JSON.stringify(sourceContext))
    assert.deepEqual(nav.router.currentRoute.value.query, {})
    assert.equal(nav.router.currentRoute.value.hash, '')
  })
}

for (const [type, name] of [
  ['album', 'album'],
  ['playlist', 'Playlist'],
  ['mv', 'mv']
]) {
  test(`${type} home banner preserves opaque URL context in one router parameter`, async () => {
    const nav = navigation()
    const state = component('src/renderer/views/HomePage.vue', nav.boundary)
    state.handleBannerClick({ type, pluginId: 'source', sourceContext })
    await nav.finished()
    assert.equal(nav.router.currentRoute.value.name, name)
    assert.equal(nav.router.currentRoute.value.params.sourceContext, JSON.stringify(sourceContext))
    assert.deepEqual(nav.router.currentRoute.value.query, {})
    assert.equal(nav.router.currentRoute.value.hash, '')
  })
}
