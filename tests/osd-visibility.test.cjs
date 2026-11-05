const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const fs = require('node:fs')
const { stripTypeScriptTypes: stripTypes } = require('node:module')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')

const stripTypeScriptTypes =
  stripTypes ||
  ((source) =>
    require('typescript').transpileModule(source, {
      compilerOptions: { target: 99, module: 99 }
    }).outputText)

// Execute the real preload/window lifecycle with deterministic DOM, Electron,
// and clock boundaries. No Electron process or user profile is needed.
function clock() {
  let now = 0
  let nextId = 0
  const timers = new Map()
  return {
    Date: { now: () => now },
    setTimeout(fn, delay) {
      const id = ++nextId
      timers.set(id, { fn, at: now + delay })
      return id
    },
    clearTimeout(id) {
      timers.delete(id)
    },
    advance(duration) {
      now += duration
      for (const [id, timer] of timers) {
        if (timer.at <= now) {
          timers.delete(id)
          timer.fn()
        }
      }
    }
  }
}

function preload(config = {}) {
  const timer = clock()
  const ipc = new EventEmitter()
  const sent = []
  ipc.send = (...args) => sent.push(args)
  const root = {
    locked: true,
    style: { opacity: '1' },
    classList: { contains: () => root.locked },
    dispatchEvent() {}
  }
  const button = {
    style: { opacity: '0', pointerEvents: 'none' },
    addEventListener() {}
  }
  const source = fs
    .readFileSync(path.join(__dirname, '../src/preload/osdWin.ts'), 'utf8')
    .replace(/^import .* from 'electron'\r?\n/m, '')
  vm.runInNewContext(stripTypeScriptTypes(source), {
    ...timer,
    process: { platform: 'win32' },
    contextBridge: { exposeInMainWorld() {} },
    ipcRenderer: ipc,
    document: {
      addEventListener(_event, listener) {
        listener()
      },
      querySelector(selector) {
        return selector === '#main' ? root : button
      }
    },
    window: { addEventListener() {} },
    localStorage: { getItem: () => JSON.stringify(config) },
    CustomEvent: class {}
  })
  return {
    root,
    button,
    sent,
    advance: timer.advance,
    pointer(inside, x = 100, y = 100) {
      ipc.emit('osd-lock-mouse-state', {}, { inside, x, y })
    }
  }
}

test('locked lyrics remain readable while the pointer rests over another app', () => {
  const osd = preload()
  osd.pointer(true)
  osd.advance(1600)
  assert.equal(osd.root.style.opacity, '1')
})

test('idle timeout hides only the unlock button and restores click-through', () => {
  const osd = preload({ staticTime: 1500, showButtonWhenLock: true })
  osd.pointer(true)
  osd.advance(1600)
  assert.equal(osd.button.style.opacity, '0')
  assert.equal(osd.button.style.pointerEvents, 'none')
  assert.ok(osd.sent.some(([channel]) => channel === 'mouseleave'))
  // Polling a stationary pointer must not reveal the idle button again.
  osd.pointer(true)
  assert.equal(osd.button.style.opacity, '0')
  osd.pointer(true, 101)
  assert.equal(osd.button.style.opacity, '1')
  assert.equal(osd.root.style.opacity, '1')
})

test('disabling the unlock button never fades the lyric text', () => {
  const osd = preload({ staticTime: 1500, showButtonWhenLock: false })
  osd.pointer(true)
  osd.advance(1600)
  assert.equal(osd.root.style.opacity, '1')
  assert.equal(osd.button.style.opacity, '0')
})

test('zero timeout keeps the unlock button available without hiding lyrics', () => {
  const osd = preload({ staticTime: 0 })
  osd.pointer(true)
  osd.advance(10000)
  assert.equal(osd.root.style.opacity, '1')
  assert.equal(osd.button.style.opacity, '1')
})

function background({ readyImmediately = true } = {}) {
  const timer = clock()
  const values = new Map([['osdWin.show', true]])
  const windows = []
  class Window extends EventEmitter {
    constructor(options) {
      super()
      this.options = options
      this.destroyed = false
      this.shown = 0
      this.bounds = { x: 10, y: 20, width: 700, height: 140 }
      this.webContents = new EventEmitter()
      this.webContents.send = () => {}
      windows.push(this)
    }
    async loadURL() {
      // These may occur while loadURL is still pending; handlers must already
      // belong to this exact window before loading begins.
      if (readyImmediately) {
        this.webContents.emit('did-finish-load')
        this.emit('ready-to-show')
      }
    }
    isDestroyed() {
      return this.destroyed
    }
    showInactive() {
      this.shown++
      assert.equal(this.options.alwaysOnTop, true)
      assert.equal(this.options.focusable, false)
    }
    setIgnoreMouseEvents() {}
    setVisibleOnAllWorkspaces() {}
    setFocusable() {}
    setAlwaysOnTop() {}
    getBounds() {
      return this.bounds
    }
    close() {
      this.destroyed = true
      this.emit('closed')
    }
  }
  const text = fs.readFileSync(path.join(__dirname, '../src/main/index.ts'), 'utf8')
  const source = text.slice(
    text.indexOf('class BackGround {'),
    text.indexOf('const MAIN_PROCESS_INITIALIZED_KEY')
  )
  const app = vm.runInNewContext(`${stripTypeScriptTypes(source)}; new BackGround()`, {
    ...timer,
    BrowserWindow: Window,
    Constants: { DEFAULT_OSD_PREFERENCES: {}, APP_OSD_URL: 'http://localhost:41831/osdlyric.html' },
    store: { get: (key) => values.get(key), set: (key, value) => values.set(key, value) },
    hardenWindow() {},
    setInterval: () => 1,
    clearInterval() {},
    log: { error() {} }
  })
  return { app, windows, values, advance: timer.advance }
}

test('desktop lyrics are non-focusing and topmost on their first show', async () => {
  const { app, windows } = background()
  app.showOSDWindow('small')
  await Promise.resolve()
  assert.equal(windows[0].shown, 1)
})

test('late events from a closed overlay never reshow a replacement window', async () => {
  const { app, windows } = background({ readyImmediately: false })
  app.showOSDWindow('small')
  await Promise.resolve()
  const first = windows[0]
  app.switchOSDWindow('normal')
  await Promise.resolve()
  const replacement = windows[1]
  const shown = replacement.shown
  first.emit('ready-to-show')
  first.webContents.emit('did-finish-load')
  assert.equal(replacement.shown, shown)
  app.hideOSDWindow()
  assert.doesNotThrow(() => replacement.emit('ready-to-show'))
  assert.equal(app.lyricWin, null)
})

test('closing an overlay cancels its delayed geometry writes', async () => {
  const { app, windows, values, advance } = background()
  app.showOSDWindow('small')
  await Promise.resolve()
  windows[0].emit('move')
  app.switchOSDWindow('normal')
  await Promise.resolve()
  advance(600)
  assert.equal(values.has('osdWin.x2'), false)
  assert.equal(values.has('osdWin.y2'), false)
})
