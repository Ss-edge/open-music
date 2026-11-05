import { _electron as electron, ElectronApplication, Page } from 'playwright'
import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import messages from '../src/renderer/locales/zh-hans.json'

let app: ElectronApplication
let page: Page
let probe: ElectronApplication | undefined
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'open-music-integration-'))
const mediaDir = path.join(profile, 'synthetic-audio')
const screenshots = path.resolve('tmp/screenshots')
const errors: string[] = []

async function capture(name: string) {
  const raw = await page.screenshot({ animations: 'disabled', scale: 'css' })
  const width = await page.evaluate(() => innerWidth)
  const png = await app.evaluate(
    ({ nativeImage }, input) =>
      nativeImage
        .createFromBuffer(Buffer.from(input.base64, 'base64'))
        .resize({ width: input.width })
        .toPNG()
        .toString('base64'),
    { base64: raw.toString('base64'), width }
  )
  fs.writeFileSync(path.join(screenshots, name + '.png'), Buffer.from(png, 'base64'))
}

async function state() {
  return page.evaluate(() => {
    const pinia = (document.querySelector('#app') as any).__vue_app__.config.globalProperties.$pinia
    const player = pinia._s.get('player')
    return { playing: player.playing, lyrics: player.lyrics.length, seek: player.seek }
  })
}

test.beforeAll(async () => {
  fs.mkdirSync(mediaDir)
  fs.mkdirSync(screenshots, { recursive: true })
  const rate = 8000
  const wave = Buffer.alloc(44 + rate * 180 * 2)
  wave.write('RIFF', 0)
  wave.writeUInt32LE(wave.length - 8, 4)
  wave.write('WAVEfmt ', 8)
  wave.writeUInt32LE(16, 16)
  wave.writeUInt16LE(1, 20)
  wave.writeUInt16LE(1, 22)
  wave.writeUInt32LE(rate, 24)
  wave.writeUInt32LE(rate * 2, 28)
  wave.writeUInt16LE(2, 32)
  wave.writeUInt16LE(16, 34)
  wave.write('data', 36)
  wave.writeUInt32LE(wave.length - 44, 40)
  fs.writeFileSync(path.join(mediaDir, 'Open Music 合成回归测试.wav'), wave)
  fs.writeFileSync(
    path.join(mediaDir, 'Open Music 合成回归测试.lrc'),
    '[00:00.00]Open Music · 合成测试歌词\n[00:06.00]点击歌曲封面，打开歌词\n[00:12.00]切换应用，歌词依然可见\n[00:18.00]每一次播放，都有自己的节奏\n[00:24.00]测试完成，继续聆听\n'
  )
  app = await electron.launch({
    args: ['tests/electron-test-launcher.cjs', `--test-user-data-dir=${profile}`],
    timeout: 30000
  })
  page = await app.firstWindow()
  page.on('pageerror', (error) => errors.push(error.stack || String(error)))
  await page.waitForLoadState('domcontentloaded')
})

test.afterAll(async () => {
  await probe?.close().catch(() => {})
  await app?.close().catch(() => {})
  fs.rmSync(profile, { recursive: true, force: true })
})

test('Spotify shell fits both desktop sizes, with a permanently usable search and empty player', async () => {
  await expect(page.locator('.brand')).toHaveText('open music.')
  await expect(page.getByRole('button', { name: '打开歌词', exact: true })).toBeDisabled()
  for (const [width, height] of [
    [1440, 900],
    [1080, 720]
  ]) {
    await app.evaluate(
      ({ BrowserWindow }, size) =>
        BrowserWindow.getAllWindows()[0].setContentSize(size[0], size[1]),
      [width, height]
    )
    const layout = await page.evaluate(() => ({
      main: document.getElementById('main')!.getBoundingClientRect().toJSON(),
      player: document.querySelector('.player')!.getBoundingClientRect().toJSON(),
      overflow: document.body.scrollWidth > innerWidth
    }))
    expect(layout.overflow).toBe(false)
    expect(layout.main.bottom).toBeLessThanOrEqual(layout.player.top)
    const invitation = await page.locator('.library-action').boundingBox()
    const savedArea = await page.locator('.saved-library').boundingBox()
    expect(invitation!.y + invitation!.height).toBeLessThanOrEqual(savedArea!.y + savedArea!.height)
    await capture(`home-${width}-final`)
  }
  const input = page.locator('nav input[type=search]')
  await page.locator('h1').first().click()
  await expect(input).toBeVisible()
  await input.fill('测试')
  await input.press('Enter')
  await expect(input).toBeVisible()
  await expect(input).toHaveValue('')
  await page.locator('.right-part').getByRole('button', { name: '设置', exact: true }).click()
  await page.waitForURL('**/#/settings')
  await expect(page.getByText('绿色', { exact: true })).toBeVisible()
  await capture('settings-1080-final')
})

test('local audio and LRC flow into playback; artwork opens synchronized lyrics independently of the bar option', async () => {
  await app.evaluate(({ dialog }, dir) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] })
  }, mediaDir)
  await page.locator('.library-nav button').filter({ hasText: '本地音乐' }).click()
  await page.waitForURL('**/#/login/local/LocalDir')
  await page.getByRole('button', { name: '选择目录', exact: true }).click()
  await page.locator('.confirm .button').click()
  await page.waitForURL('**/#/localMusic')
  await page.locator('.trackitem').first().waitFor({ state: 'visible' })
  await page.locator('.trackitem').first().dblclick()
  await expect(page.locator('.player')).toContainText('Open Music 合成回归测试')
  await expect.poll(async () => (await state()).lyrics, { timeout: 20000 }).toBeGreaterThan(0)
  await page.locator('.player .play').click()
  await expect.poll(async () => (await state()).playing).toBe(false)
  const beforeSeek = (await state()).seek
  await page.locator('.player [role=slider]').press('ArrowRight')
  await expect.poll(async () => (await state()).seek).toBeCloseTo(beforeSeek + 5, 0)
  await page.getByRole('button', { name: '打开歌词', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '歌词播放器' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('点击歌曲封面，打开歌词')
  await page.keyboard.press('Shift+Tab')
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Tab')
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  await expect
    .poll(() => dialog.evaluate((el) => Math.round(el.getBoundingClientRect().top)))
    .toBe(32)
  await capture('lyrics-1080-final')
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1440, 900)
  )
  await capture('lyrics-1440-final')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: '打开歌词', exact: true }).click()
  await page.getByRole('button', { name: '收起歌词', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/#\/localMusic$/)
  await page.locator('.player input[type=range]').fill('0.3')
  await expect(page.locator('.player input[type=range]')).toHaveValue('0.3')
  const shuffle = page
    .locator('.player')
    .getByRole('button', { name: messages.player.shuffle, exact: true })
  await shuffle.click()
  await expect(shuffle).toHaveAttribute('aria-pressed', 'true')
  await shuffle.click()
  await expect(shuffle).toHaveAttribute('aria-pressed', 'false')
  const repeat = page.locator('.player .transport button').last()
  await repeat.click()
  await expect(repeat).toHaveClass(/active/)
  await repeat.click()
  await repeat.click()
  await expect(repeat).not.toHaveClass(/active/)
  const queue = page
    .locator('.player')
    .getByRole('button', { name: messages.player.nextUp, exact: true })
  await queue.click()
  await page.waitForURL('**/#/next')
  await expect(page.locator('#main')).toContainText('Open Music 合成回归测试')
  await queue.click()
  await page.waitForURL('**/#/localMusic')
  await capture('local-player-1440-final')
})

test('desktop lyrics survive another process focus, idle, minimization and rapid mode changes', async () => {
  await page.getByRole('button', { name: messages.player.osdLyrics, exact: true }).click()
  await expect
    .poll(() =>
      app.evaluate(
        ({ BrowserWindow }) =>
          BrowserWindow.getAllWindows().filter((w) => w.webContents.getURL().includes('osdlyric'))
            .length
      )
    )
    .toBe(1)
  const osd = app.windows().find((p) => p.url().includes('osdlyric'))!
  await osd.waitForLoadState('domcontentloaded')
  await page.evaluate(() => {
    const pinia = (document.querySelector('#app') as any).__vue_app__.config.globalProperties.$pinia
    pinia._s.get('osdLyric').$patch({ isLock: true, staticTime: 1500 })
  })
  await app.evaluate(({ BrowserWindow, screen }) => {
    const overlay = BrowserWindow.getAllWindows().find((w) =>
      w.webContents.getURL().includes('osdlyric')
    )!
    const cursor = screen.getCursorScreenPoint()
    overlay.setBounds({ x: cursor.x - 200, y: cursor.y - 70, width: 700, height: 140 })
  })
  probe = await electron.launch({ args: ['tests/focus-probe.cjs'] })
  const other = await probe.firstWindow()
  await other.bringToFront()
  await osd.waitForTimeout(1700)
  const overlayState = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows().find((w) =>
      w.webContents.getURL().includes('osdlyric')
    )!
    return {
      visible: w.isVisible(),
      top: w.isAlwaysOnTop(),
      focusable: w.isFocusable(),
      focused: w.isFocused()
    }
  })
  expect(overlayState).toEqual({ visible: true, top: true, focusable: false, focused: false })
  expect(
    await probe.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFocused())
  ).toBe(true)
  expect(await osd.locator('#main').evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => w.webContents.getURL().includes('/#/'))!
      .minimize()
  )
  expect(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().includes('osdlyric'))!
        .isVisible()
    )
  ).toBe(true)
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => w.webContents.getURL().includes('/#/'))!
      .restore()
  )
  for (const type of ['normal', 'small', 'normal', 'small']) {
    await page.evaluate((type) => window.mainApi?.send('updateOsdState', { type }), type)
  }
  await page.evaluate(() => window.mainApi?.send('updateOsdState', { show: false }))
  await expect
    .poll(() =>
      app.evaluate(
        ({ BrowserWindow }) =>
          BrowserWindow.getAllWindows().filter((w) => w.webContents.getURL().includes('osdlyric'))
            .length
      )
    )
    .toBe(0)
  await page.waitForTimeout(300)
  expect(
    await app.evaluate(
      ({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().filter((w) => w.webContents.getURL().includes('osdlyric'))
          .length
    )
  ).toBe(0)
  expect(errors).toEqual([])
})
