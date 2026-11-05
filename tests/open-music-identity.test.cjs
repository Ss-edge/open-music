const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const { pathToFileURL } = require('node:url')
const { test } = require('node:test')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')

function executeTypescript(relativePath, replacements = {}) {
  const filename = path.join(root, relativePath)
  const source = fs
    .readFileSync(filename, 'utf8')
    .replaceAll('import.meta.url', JSON.stringify(pathToFileURL(filename).href))
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  }).outputText
  const nativeRequire = createRequire(filename)
  const module = { exports: {} }
  const context = {
    module,
    exports: module.exports,
    process: { env: {}, platform: process.platform, cwd: () => root },
    require: (name) =>
      Object.hasOwn(replacements, name) ? replacements[name] : nativeRequire(name),
    console
  }
  vm.runInNewContext(compiled, context, { filename })
  return module.exports.default
}

const Constants = executeTypescript('src/main/utils/Constants.ts')

test('Open Music production and development pages share its independent trusted origin', () => {
  assert.equal(Constants.APP_NAME, 'Open Music')
  assert.equal(Constants.ELECTRON_WEB_SERVER_PORT, 41831)
  assert.equal(Constants.ELECTRON_DEV_NETEASE_API_PORT, 40002)
  for (const url of [
    Constants.APP_INDEX_URL_DEV,
    Constants.APP_INDEX_URL_PROD,
    Constants.APP_OSD_URL
  ]) {
    assert.equal(new URL(url).origin, 'http://localhost:41831')
  }
})

test('development Vite origin and every API/asset proxy agree with main-process ports', () => {
  const plugin = () => ({ name: 'test-noop' })
  const configFactory = executeTypescript('vite.config.ts', {
    vite: { defineConfig: (factory) => factory, loadEnv: () => ({}) },
    fs: { ...fs, rmSync: () => {} },
    'vite-plugin-electron': plugin,
    'vite-plugin-electron-renderer': plugin,
    'vite-plugin-eslint': plugin,
    '@vitejs/plugin-vue-jsx': plugin,
    '@vitejs/plugin-vue': plugin,
    'vite-plugin-svg-icons': { createSvgIconsPlugin: plugin }
  })
  const config = configFactory({ mode: 'development' })
  assert.equal(config.server.port, 41831)
  assert.equal(config.server.strictPort, true)
  for (const route of ['/netease', '/local-asset', '/stream-asset', '/lastfm-callback']) {
    assert.equal(new URL(config.server.proxy[route].target).port, '40002')
  }
})

test('packaging uses independent Open Music identity while retaining upstream attribution', () => {
  const filename = path.join(root, 'buildAssets/builder/config.js')
  const module = { exports: {} }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module,
    exports: module.exports,
    require: (name) => (name === 'dotenv' ? { config() {} } : require(name))
  })
  assert.equal(module.exports.productName, 'Open Music')
  assert.equal(module.exports.appId, 'io.local.openmusic')
  const metadata = require('../package.json')
  assert.equal(metadata.name, 'open-music')
  assert.equal(metadata.repository.url, 'https://github.com/stark81/VutronMusic.git')
})

test('local plugin returns artwork on Open Music origin without contacting the existing player', async () => {
  const exports = {}
  vm.runInNewContext(fs.readFileSync(path.join(root, 'src/public/plugin/local.js'), 'utf8'), {
    exports,
    api: {
      db: {
        get: async () => ({ songs: [{ id: 123, name: 'Local test', albumId: 8, artists: [] }] })
      }
    }
  })
  const result = await exports.getAllTracks()
  assert.equal(result.data.length, 1)
  assert.equal(new URL(result.data[0].picUrl).origin, 'http://localhost:41831')
  assert.equal(new URL(result.data[0].album.picUrl).origin, 'http://localhost:41831')
})
