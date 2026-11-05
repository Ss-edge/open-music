const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')
const { parse, compileScript } = require('@vue/compiler-sfc')
const ts = require('typescript')
const vue = require('vue')

function component(name, injected, stores, globals = {}) {
  const filename = path.join(__dirname, `../src/renderer/components/${name}.vue`)
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'))
  const script = compileScript(descriptor, { id: name })
  const compiled = ts.transpileModule(script.content, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  }).outputText
  const mounted = []
  const emitted = []
  const module = { exports: {} }
  const observers = []
  class Observer {
    constructor(callback) {
      this.callback = callback
      observers.push(this)
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require(id) {
      if (id === 'vue')
        return {
          ...vue,
          inject: (key, fallback) => injected[key] ?? fallback,
          onMounted: (listener) => mounted.push(listener),
          onUnmounted() {},
          onBeforeUnmount() {},
          onUpdated() {},
          onActivated() {},
          onDeactivated() {}
        }
      if (id === 'pinia') return { storeToRefs: (store) => vue.toRefs(store) }
      if (id === '../store/state') return { useNormalStateStore: () => stores }
      if (id === '../store/settings')
        return { useSettingsStore: () => vue.reactive({ general: { useCustomTitlebar: true } }) }
      if (id === 'vue-router') return { useRouter: () => ({ beforeEach() {} }) }
      if (id === '../utils/eventBus')
        return { on() {}, off() {}, emit: (...args) => emitted.push(args) }
      if (id.endsWith('.vue')) return {}
      throw new Error(`Unexpected import: ${id}`)
    },
    window: {
      innerHeight: 720,
      addEventListener() {},
      removeEventListener() {},
      getComputedStyle: () => ({ paddingTop: '24px', paddingBottom: '32px' })
    },
    document: { addEventListener() {}, removeEventListener() {} },
    IntersectionObserver: Observer,
    ResizeObserver: Observer,
    setTimeout: () => 1,
    clearTimeout() {},
    ...globals
  })
  return { definition: module.exports.default, mounted, observers, emitted }
}

test('scrollbar thumb reaches the end of its panel for a long nested list', () => {
  const stores = vue.reactive({
    scrollbar: {
      active: 'list',
      instances: { list: { scrollTop: 19600, containerHeight: 400, listHeight: 20000 } }
    }
  })
  const fixture = component('ScrollBar', { mainRef: vue.ref({ clientHeight: 500 }) }, stores)
  const state = fixture.definition.setup({}, { expose() {} })
  fixture.mounted.forEach((listener) => listener())
  assert.equal(state.thumbStyle.value.height, '30px')
  assert.equal(state.thumbStyle.value.transform, 'translateY(470px)')
})

test('dragging a minimum-size scrollbar thumb maps exactly to the list range', () => {
  const stores = vue.reactive({
    scrollbar: {
      active: 'list',
      instances: { list: { scrollTop: 0, containerHeight: 400, listHeight: 20000 } }
    }
  })
  const fixture = component('ScrollBar', { mainRef: vue.ref({ clientHeight: 500 }) }, stores)
  const state = fixture.definition.setup({}, { expose() {} })
  fixture.mounted.forEach((listener) => listener())
  state.handleDragStart({ clientY: 0 })
  state.handleDragMove({ clientY: 470 })
  const update = fixture.emitted.find(([name]) => name === 'update-scroll-bar')
  assert.equal(update[1].offset, 19600)
})

test('virtual lists fit the real content panel and cap explicit heights', async () => {
  const main = vue.ref({ clientHeight: 504 })
  const stores = vue.reactive({
    enableScrolling: true,
    virtualScrolling: false,
    registerInstance() {},
    unregisterInstance() {},
    updateScroll() {}
  })
  const fixture = component(
    'VirtualScrollNoHeight',
    { mainRef: main, hasCustomTitleBar: vue.ref(true) },
    stores
  )
  const props = vue.reactive({
    list: Array.from({ length: 100 }, (_, id) => ({ id })),
    itemSize: 50,
    columnNumber: 1,
    aboveValue: 2,
    belowValue: 2,
    paddingBottom: 64,
    showPosition: false,
    isEnd: true,
    showFooter: false,
    gap: 4,
    height: 0,
    enableVirtualScroll: true,
    frozen: false,
    loadMore() {}
  })
  const state = fixture.definition.setup(props, { expose() {} })
  state.listRef.value = { style: {}, getBoundingClientRect: () => ({ top: 136 }) }
  fixture.mounted.forEach((listener) => listener())
  await vue.nextTick()
  assert.equal(state.containerHeight.value, 448)
  props.height = 900
  assert.equal(state.containerHeight.value, 448)
  props.height = 240
  assert.equal(state.containerHeight.value, 240)
  props.height = 0
  main.value.clientHeight = 404
  fixture.observers.at(-1).callback()
  assert.equal(state.containerHeight.value, 348)
  props.enableVirtualScroll = false
  assert.equal(state.containerHeight.value, 5064)
})
