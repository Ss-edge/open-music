const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const Vue = require('vue')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { createRouter, createMemoryHistory } = require('vue-router')

// Exercise the real SFC render functions and event bindings with Vue's renderer.
// Only the audio/plugin/native boundaries are replaced; no browser or account is needed.
function mountComponent(
  relativePath,
  { track = { id: 1, name: 'Test track', artists: [] }, opened = false } = {}
) {
  const routeCalls = []
  const player = {
    currentTrack: Vue.ref(track),
    duration: Vue.ref(180),
    seek: Vue.ref(0),
    playing: Vue.ref(false),
    isPersonalFM: Vue.ref(false),
    repeatMode: Vue.ref('off'),
    isShuffle: Vue.ref(false),
    pic: Vue.ref('test-cover'),
    volume: Vue.ref(0.5),
    isLiked: Vue.ref(false),
    lyrics: Vue.ref([]),
    chorus: Vue.ref(0),
    source: Vue.ref('test'),
    hasListSource: Vue.ref(false),
    getListSourcePath: Vue.ref(''),
    lyricOffset: Vue.ref(0),
    noLyric: Vue.ref(true)
  }
  for (const action of [
    'playNext',
    'moveToFMTrash',
    'playPrev',
    'playOrPause',
    'switchRepeatMode',
    'toggleMute'
  ])
    player[action] = () => {}
  const state = {
    showLyrics: Vue.ref(opened),
    enableScrolling: Vue.ref(true),
    modalOpen: Vue.ref(false),
    setThemeModal: Vue.ref(false),
    setConvolverModal: Vue.ref(false),
    setPitchModal: Vue.ref(false),
    setFontModal: Vue.ref(false),
    setPlaybackRateModal: Vue.ref(false),
    backgroundModal: Vue.ref({ show: false }),
    setSaveThemeModal: Vue.ref(false),
    addTrackToPlaylistModal: Vue.ref({ show: false })
  }
  const settings = { general: Vue.ref({ clickToLyric: false, jumpToLyricBegin: false }) }
  const theme = {
    activeTheme: Vue.ref({ theme: { activeLayout: 'Classic' } }),
    activeBG: Vue.ref({ color: 'dark' }),
    senses: Vue.ref({ Classic: { cover: 0, align: 'left', lyric: { translation: 'tlyric' } } }),
    resetTheme: () => {}
  }
  const listeners = new Map()
  const document = {
    activeElement: null,
    body: { focus() {} },
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name)
  }
  const window = {
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name)
  }
  const stub = Vue.defineComponent({
    inheritAttrs: false,
    setup:
      (_, { slots }) =>
      () =>
        Vue.h('span', {}, slots.default?.())
  })
  const buttonStub = Vue.defineComponent({
    setup:
      (_, { attrs, slots }) =>
      () =>
        Vue.h('button', attrs, slots.default?.())
  })
  function loadSfc(filename) {
    const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
    const compiled = compileScript(descriptor, { id: 'player-ui-test', inlineTemplate: true })
    const code = ts.transpileModule(compiled.content, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText
    const exports = {}
    const localRequire = (id) => {
      if (id === 'vue') return { ...Vue, Transition: Vue.BaseTransition }
      if (id === 'pinia') return { storeToRefs: (store) => store }
      if (id === 'vue-router')
        return {
          useRouter: () => ({ push: (value) => routeCalls.push(value), go: () => {} }),
          useRoute: () => ({ name: 'home' })
        }
      if (id.includes('store/playerTheme')) return { usePlayerThemeStore: () => theme }
      if (id.includes('store/player')) return { usePlayerStore: () => player }
      if (id.includes('store/osdLyric'))
        return { useOsdLyricStore: () => ({ show: Vue.ref(false) }) }
      if (id.includes('store/state')) return { useNormalStateStore: () => state }
      if (id.includes('store/settings')) return { useSettingsStore: () => settings }
      if (id.includes('store/pluginMusic')) return { usePluginMusic: () => ({ likeATrack() {} }) }
      if (id.endsWith('ButtonIcon.vue')) return { __esModule: true, default: buttonStub }
      if (id.endsWith('.vue') || id === 'vue-3-slider-component')
        return { __esModule: true, default: stub }
      throw new Error(`Unstubbed boundary: ${id}`)
    }
    vm.runInNewContext(
      code,
      {
        exports,
        require: localRequire,
        window,
        document,
        HTMLElement: class {},
        setTimeout,
        clearTimeout,
        console
      },
      { filename }
    )
    return exports.default
  }
  const node = (type, text = '') =>
    Vue.markRaw({
      type,
      text,
      props: {},
      style: {},
      children: [],
      parent: null,
      focus() {
        document.activeElement = this
      },
      contains(other) {
        for (let current = other; current; current = current.parent) {
          if (current === this) return true
        }
        return false
      },
      getClientRects() {
        return this.style.display === 'none' ? [] : [{}]
      },
      getAttribute(name) {
        return this.props[name] ?? null
      },
      querySelectorAll() {
        const results = []
        const collect = (current) => {
          for (const child of current.children) {
            if (['button', 'a', 'input'].includes(child.type) || Number(child.props.tabindex) >= 0)
              results.push(child)
            collect(child)
          }
        }
        collect(this)
        return results
      },
      addEventListener() {},
      removeEventListener() {}
    })
  const renderer = Vue.createRenderer({
    createElement: (tag) => node(tag),
    createText: (text) => node('#text', text),
    createComment: (text) => node('#comment', text),
    setText: (el, text) => {
      el.text = text
    },
    setElementText: (el, text) => {
      el.text = text
      el.children = []
    },
    patchProp: (el, key, _previous, value) => {
      el.props[key] = value
    },
    insert: (child, parent, anchor) => {
      if (child.parent) {
        const index = child.parent.children.indexOf(child)
        if (index >= 0) child.parent.children.splice(index, 1)
      }
      child.parent = parent
      const index = anchor ? parent.children.indexOf(anchor) : -1
      parent.children.splice(index < 0 ? parent.children.length : index, 0, child)
    },
    remove: (el) => {
      if (el.parent) {
        const index = el.parent.children.indexOf(el)
        if (index >= 0) el.parent.children.splice(index, 1)
      }
    },
    parentNode: (el) => el.parent,
    nextSibling: (el) => el.parent?.children[el.parent.children.indexOf(el) + 1],
    querySelector: () => null,
    setScopeId() {},
    insertStaticContent: () => {
      throw new Error('Unexpected static content')
    }
  })
  const root = node('root')
  const app = renderer.createApp(
    loadSfc(path.resolve(__dirname, '..', relativePath)),
    relativePath.includes('CommonPlayer') ? { show: 'fullLyric' } : undefined
  )
  app.config.globalProperties.$t = (value) => value
  app.component(
    'router-link',
    Vue.defineComponent({
      setup:
        (_, { attrs, slots }) =>
        () =>
          Vue.h('a', attrs, slots.default?.())
    })
  )
  app.mount(root)
  function find(predicate, current = root) {
    if (predicate(current)) return current
    for (const child of current.children) {
      const found = find(predicate, child)
      if (found) return found
    }
  }
  return {
    state,
    player,
    root,
    find,
    routeCalls,
    listeners,
    document,
    unmount: () => app.unmount()
  }
}

test('artwork opens lyrics with whole-bar lyric clicks disabled and does not navigate to an album', async () => {
  const mounted = mountComponent('src/renderer/components/PlayerBar.vue')
  try {
    const artwork = mounted.find(
      (el) => el.type === 'button' && el.props['aria-label'] === '打开歌词'
    )
    assert.ok(artwork, 'artwork must be an accessible lyric-entry button')
    artwork.props.onClick({ stopPropagation() {} })
    await Vue.nextTick()
    assert.equal(mounted.state.showLyrics.value, true)
    assert.deepEqual(mounted.routeCalls, [])
    artwork.props.onClick({ stopPropagation() {} })
    assert.equal(mounted.state.showLyrics.value, true, 'opening lyrics is idempotent')
  } finally {
    mounted.unmount()
  }
})

test('artwork lyric entry is disabled without a current track', () => {
  const mounted = mountComponent('src/renderer/components/PlayerBar.vue', { track: null })
  try {
    const artwork = mounted.find(
      (el) => el.type === 'button' && el.props['aria-label'] === '打开歌词'
    )
    assert.ok(artwork, 'artwork must remain an accessible button in empty playback state')
    assert.equal(Boolean(artwork.props.disabled), true)
    artwork.props.onClick({ stopPropagation() {} })
    assert.equal(mounted.state.showLyrics.value, false)
  } finally {
    mounted.unmount()
  }
})

test('Escape closes the lyric page and its listener is removed on unmount', async () => {
  const mounted = mountComponent('src/renderer/views/PlayPage.vue', { opened: true })
  const keydown = mounted.listeners.get('keydown')
  try {
    assert.equal(typeof keydown, 'function', 'lyric page should register its Escape handler')
    keydown({ key: 'Escape', preventDefault() {} })
    await Vue.nextTick()
    assert.equal(mounted.state.showLyrics.value, false)
  } finally {
    mounted.unmount()
  }
  assert.equal(mounted.listeners.has('keydown'), false)
})

const opaqueContext = {
  id: 'server/artist#42?x=a&b=中文',
  endpoint: 'https://music.example/a/b?key=x#fragment',
  nested: { values: ['/?#', 17] }
}
function assertOpaqueDestination(destination, routeName) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/artist/:pluginId/:sourceContext', name: 'ArtistPage', component: {} },
      { path: '/album/:pluginId/:sourceContext', name: 'album', component: {} }
    ]
  })
  const resolved = router.resolve(destination)
  assert.equal(resolved.name, routeName)
  assert.equal(resolved.params.pluginId, 'stream-test')
  assert.deepEqual(JSON.parse(resolved.params.sourceContext), opaqueContext)
  assert.deepEqual(resolved.query, {})
  assert.equal(resolved.hash, '')
}

test('bottom-player artist navigation preserves an opaque sourceContext containing URL separators', () => {
  const mounted = mountComponent('src/renderer/components/PlayerBar.vue', {
    track: {
      id: 1,
      name: 'Track',
      artists: [
        { id: 42, name: 'Opaque artist', pluginId: 'stream-test', sourceContext: opaqueContext }
      ]
    }
  })
  try {
    mounted
      .find((el) => el.text === 'Opaque artist' && el.props.onClick)
      .props.onClick({ stopPropagation() {} })
    assertOpaqueDestination(mounted.routeCalls[0], 'ArtistPage')
  } finally {
    mounted.unmount()
  }
})

test('lyric-player artist and album links preserve opaque sourceContext in one route parameter', () => {
  const mounted = mountComponent('src/renderer/components/CommonPlayer.vue', {
    track: {
      id: 1,
      name: 'Track',
      artists: [
        { id: 42, name: 'Opaque artist', pluginId: 'stream-test', sourceContext: opaqueContext }
      ],
      album: { id: 3, name: 'Opaque album', pluginId: 'stream-test', sourceContext: opaqueContext }
    }
  })
  try {
    assertOpaqueDestination(
      mounted.find(
        (el) =>
          el.type === 'a' &&
          (typeof el.props.to === 'string'
            ? el.props.to.startsWith('/artist/')
            : el.props.to?.name === 'ArtistPage')
      ).props.to,
      'ArtistPage'
    )
    assertOpaqueDestination(
      mounted.find(
        (el) =>
          el.type === 'a' &&
          (typeof el.props.to === 'string'
            ? el.props.to.startsWith('/album/')
            : el.props.to?.name === 'album')
      ).props.to,
      'album'
    )
  } finally {
    mounted.unmount()
  }
})

test('lyric dialog wraps Tab and Shift+Tab and leaves nested modal focus alone', () => {
  const mounted = mountComponent('src/renderer/views/PlayPage.vue', { opened: true })
  try {
    const panel = mounted.find((el) => el.props.role === 'dialog')
    const buttons = panel.querySelectorAll('button')
    const first = buttons[0]
    const last = buttons.at(-1)
    const keydown = mounted.listeners.get('keydown')
    let prevented = 0
    const event = {
      key: 'Tab',
      shiftKey: false,
      preventDefault() {
        prevented++
      }
    }
    last.focus()
    keydown(event)
    assert.ok(
      mounted.document.activeElement === first,
      'Tab must wrap the last button to the first'
    )
    first.focus()
    keydown({ ...event, shiftKey: true })
    assert.ok(
      mounted.document.activeElement === last,
      'Shift+Tab must wrap the first button to the last'
    )
    assert.equal(prevented, 2)
    mounted.state.setThemeModal.value = true
    first.focus()
    keydown({ ...event, shiftKey: true })
    assert.ok(mounted.document.activeElement === first, 'nested modal takes over focus handling')
    assert.equal(prevented, 2)
  } finally {
    mounted.unmount()
  }
})
