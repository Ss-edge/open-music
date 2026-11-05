import { _electron as electron, ElectronApplication, Page } from 'playwright'
import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

let app: ElectronApplication
let page: Page
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'open-music-header-'))
const screenshots = path.resolve('tmp/header-screenshots')

async function capture(name: string) {
  const headerOnly = name.startsWith('search-explore')
  const region = page.locator('nav.has-custom-titlebar')
  const raw = headerOnly
    ? await region.screenshot({ animations: 'disabled', scale: 'css' })
    : await page.screenshot({ animations: 'disabled', scale: 'css' })
  const width = headerOnly
    ? Math.round((await region.boundingBox())!.width)
    : await page.evaluate(() => innerWidth)
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

test.beforeAll(async () => {
  fs.mkdirSync(screenshots, { recursive: true })
  app = await electron.launch({
    args: ['tests/electron-test-launcher.cjs', `--test-user-data-dir=${profile}`]
  })
  page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await expect(page.locator('nav input[type=search]')).toBeVisible()
})

test.afterAll(async () => {
  await app?.close().catch(() => {})
  if (
    path.dirname(profile) !== os.tmpdir() ||
    !path.basename(profile).startsWith('open-music-header-')
  ) {
    throw new Error('Refusing to remove an unexpected test profile')
  }
  fs.rmSync(profile, { recursive: true, force: true })
})

test('search has one visible focus boundary and its input stays inside the capsule', async () => {
  const input = page.locator('nav input[type=search]')
  await page.bringToFront()
  await input.focus()
  await input.press('ArrowRight')
  const style = await input.evaluate((el) => {
    const input = getComputedStyle(el)
    const capsule = el.closest('.search-container')!
    const outer = getComputedStyle(capsule)
    const innerBox = el.getBoundingClientRect()
    const outerBox = capsule.getBoundingClientRect()
    return {
      inputOutline: input.outlineWidth,
      inputShadow: input.boxShadow,
      nativeAppearance: input.appearance,
      capsuleOutline: outer.outlineWidth,
      fits: innerBox.left >= outerBox.left && innerBox.right <= outerBox.right
    }
  })
  expect(style.inputOutline).toBe('0px')
  expect(style.inputShadow).toBe('none')
  expect(style.nativeAppearance).toBe('none')
  expect(parseFloat(style.capsuleOutline)).toBeGreaterThanOrEqual(2)
  expect(style.fits).toBe(true)
  await capture('search-focus-1080')
})

test('settings is beside the avatar and the noninteractive sidebar heading is removed', async () => {
  const settings = page.locator('.right-part').getByRole('button', { name: '设置', exact: true })
  await expect(settings).toBeVisible()
  await expect(page.locator('.side-nav .settings-link')).toHaveCount(0)
  await expect(page.locator('.side-nav .library-heading')).toHaveCount(0)
  await expect(
    page.locator('.library-nav').getByRole('button', { name: '音乐库', exact: true })
  ).toBeVisible()
  const gear = await settings.boundingBox()
  const avatar = await page.locator('.profile-button').boundingBox()
  expect(Math.abs(gear!.y - avatar!.y)).toBeLessThanOrEqual(1)
  expect(gear!.x + gear!.width).toBeLessThanOrEqual(avatar!.x)
  await settings.click()
  await page.waitForURL('**/#/settings')
  await expect(settings).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('.slideBar')).toBeVisible()
})

test('header controls stay separate on home, explore and search at supported desktop sizes', async () => {
  for (const language of ['zh', 'en']) {
    await page.evaluate((language) => {
      const settings = JSON.parse(localStorage.getItem('settings') || '{}')
      settings.general = { ...settings.general, language }
      localStorage.setItem('settings', JSON.stringify(settings))
    }, language)
    await page.reload()
    await expect(page.locator('.settings-button')).toHaveAttribute(
      'aria-label',
      language === 'en' ? 'Settings' : '设置'
    )
    for (const width of [1080, 1440]) {
      await app.evaluate(
        ({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setContentSize(width, 900),
        width
      )
      for (const route of ['/', '/explore', '/search?keywords=Open%20Music&plugin=netease']) {
        await page.goto('http://localhost:41831/#' + route)
        const input = page.locator('nav input[type=search]')
        await expect(input).toBeVisible()
        await input.focus()
        const boxes = await page.evaluate(() => {
          const header = document.querySelector('nav.has-custom-titlebar')!
          const selectors = ['.navigation-buttons', '.search-tabs', '.right-part']
          return {
            header: header.getBoundingClientRect().toJSON(),
            groups: selectors
              .map((s) => header.querySelector(s))
              .filter(Boolean)
              .map((el) => el!.getBoundingClientRect().toJSON()),
            input: header.querySelector('input[type=search]')!.getBoundingClientRect().toJSON(),
            settings: header.querySelector('.settings-button')!.getBoundingClientRect().toJSON(),
            avatar: header.querySelector('.profile-button')!.getBoundingClientRect().toJSON()
          }
        })
        for (let index = 1; index < boxes.groups.length; index++) {
          expect(boxes.groups[index - 1].right).toBeLessThanOrEqual(boxes.groups[index].left + 1)
        }
        expect(boxes.input.width).toBeGreaterThanOrEqual(110)
        expect(boxes.input.right).toBeLessThanOrEqual(boxes.settings.left)
        expect(boxes.settings.right).toBeLessThanOrEqual(boxes.avatar.left)
        expect(boxes.avatar.right).toBeLessThanOrEqual(boxes.header.right)
        if (route === '/' && language === 'zh') {
          await input.blur()
          await capture('home-' + width)
        } else if (route === '/explore' && language === 'zh') {
          await capture('search-explore-' + width)
        }
      }
    }
  }
  await page.evaluate(() => {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}')
    settings.general = { ...settings.general, language: 'zh' }
    localStorage.setItem('settings', JSON.stringify(settings))
  })
  await page.goto('http://localhost:41831/#/')
  await page.reload()
  await page
    .locator('.home-page .loading-shelves')
    .waitFor({ state: 'hidden', timeout: 6000 })
    .catch(() => {})
  await capture('home-1440')
})
