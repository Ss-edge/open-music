const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')
const { parse, compileScript } = require('@vue/compiler-sfc')
const ts = require('typescript')
const vue = require('vue')

// Compile and execute the component's real setup code. Replace only the
// lifecycle/DOM/store boundaries; refs, computed values, and watchers are Vue's.
function searchBox(overrides = {}) {
  const filename = path.join(__dirname, '../src/renderer/components/SearchBox.vue')
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'))
  const script = compileScript(descriptor, { id: 'search-box-regression' })
  const compiled = ts.transpileModule(script.content, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  }).outputText
  const module = { exports: {} }
  const scrolling = vue.ref(true)
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require(id) {
      if (id === 'vue') return { ...vue, onMounted() {}, onUnmounted() {} }
      if (id === 'pinia') return { storeToRefs: (store) => store }
      if (id === '../store/state')
        return { useNormalStateStore: () => ({ enableScrolling: scrolling }) }
      if (id.endsWith('.vue')) return {}
      throw new Error(`Unexpected import: ${id}`)
    }
  })
  const props = vue.reactive({
    showInputInitially: true,
    inputWidth: 220,
    placeholder: 'Search music',
    clearKeywords: true,
    services: [{ code: 'netease', name: 'NetEase' }],
    defaultCode: 'netease',
    ...overrides
  })
  const emitted = []
  const state = module.exports.default.setup(props, {
    expose() {},
    emit: (...args) => emitted.push(args)
  })
  let focusCount = 0
  state.inputRef.value = { focus: () => focusCount++, blur() {} }
  state.containerRef.value = { contains: () => false }
  return { state, props, emitted, focused: () => focusCount }
}

test('permanent navigation search stays open after clicking outside', () => {
  const { state } = searchBox()
  state.handleOutside({ target: {} })
  assert.equal(state.showInput.value, true)
  assert.equal(state.showInputWidth.value, 220)
})

test('submitting permanent search clears keywords while preserving usable input', () => {
  const { state, emitted } = searchBox()
  state.keywords.value = 'a song'
  state.doKeydownEnter()
  assert.deepEqual(emitted, [['keydownEnter', 'a song', 'netease']])
  assert.equal(state.keywords.value, '')
  assert.equal(state.showInput.value, true)
  assert.equal(state.showInputWidth.value, 220)
})

test('the permanent search button focuses the input', () => {
  const box = searchBox()
  box.state.toggleInput()
  assert.equal(box.focused(), 1)
  assert.equal(box.state.showInputWidth.value, 220)
})

test('collapsible search retains its open and outside-click behavior', () => {
  const { state } = searchBox({ showInputInitially: false })
  state.toggleInput()
  assert.equal(state.showInput.value, true)
  assert.equal(state.showInputWidth.value, 220)
  state.handleOutside({ target: {} })
  assert.equal(state.showInput.value, false)
  assert.equal(state.showInputWidth.value, 0)
})

test('search channels can arrive asynchronously and recover after removal', async () => {
  const { state, props } = searchBox({ services: [], defaultCode: 'kugou' })
  assert.equal(state.plugin.value, '')
  props.services = [
    { code: 'netease', name: 'NetEase' },
    { code: 'kugou', name: 'Kugou' }
  ]
  await vue.nextTick()
  assert.equal(state.plugin.value, 'kugou')
  props.services = [{ code: 'netease', name: 'NetEase' }]
  await vue.nextTick()
  assert.equal(state.plugin.value, 'netease')
})
