import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

const mainAvailChannels: string[] = [
  'mouseleave',
  'from-osd',
  'osd-start-resize',
  'osd-stop-resize',
  'get-seek',
  'init-from-osd'
]

const rendererAvailChannels: string[] = [
  'set-isLock',
  'update-osd-playing-status',
  'updateLyricInfo',
  'update-osd-status'
]

contextBridge.exposeInMainWorld('mainApi', {
  send: (channel: string, ...data: any[]): void => {
    if (mainAvailChannels.includes(channel)) {
      ipcRenderer.send.apply(null, [channel, ...data])
    } else {
      throw new Error(`Unknown ipc channel name: ${channel}`)
    }
  },
  on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): void => {
    if (rendererAvailChannels.includes(channel)) {
      ipcRenderer.on(channel, listener)
    } else {
      throw new Error(`Unknown ipc channel name: ${channel}`)
    }
  },
  once: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): void => {
    if (rendererAvailChannels.includes(channel)) {
      ipcRenderer.once(channel, listener)
    } else {
      throw new Error(`Unknown ipc channel name: ${channel}`)
    }
  },
  off: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): void => {
    if (rendererAvailChannels.includes(channel)) {
      ipcRenderer.off(channel, listener)
    } else {
      throw new Error(`Unknown ipc channel name: ${channel}`)
    }
  },
  invoke: async (channel: string, ...data: any[]): Promise<any> => {
    if (mainAvailChannels.includes(channel)) {
      const result = await ipcRenderer.invoke.apply(null, [channel, ...data])
      return result
    }

    throw new Error(`Unknown ipc channel name: ${channel}`)
  }
})

contextBridge.exposeInMainWorld('env', {
  isElectron: true,
  isEnableTitlebar: process.platform === 'win32' || process.platform === 'linux',
  isLinux: process.platform === 'linux',
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32'
})

document.addEventListener('DOMContentLoaded', () => {
  let timeoutId: any = null
  let lastMoveTime: number = 0
  let hideButtonTimeout: any = null
  let lastTrackedPos: { x: number; y: number } | null = null
  let wasInside: boolean | null = null

  const root = document.querySelector('#main') as HTMLElement
  const lockEl = document.querySelector('#osd-lock') as HTMLElement
  if (!root) return

  // 空闲时只隐藏控件。歌词本身必须保持可读，不能随焦点/鼠标停留淡出。
  const hideUnlockButton = () => {
    if (!lockEl) return
    const wasInteractive = lockEl.style.pointerEvents !== 'none'
    lockEl.style.opacity = '0'
    lockEl.style.pointerEvents = 'none'
    // 鼠标可能正停在按钮上，恢复锁定窗口的点击穿透，避免透明控件拦截点击。
    if (wasInteractive) ipcRenderer.send('mouseleave')
  }

  let osdLyricConfig: Record<string, any> = JSON.parse(localStorage.getItem('osdLyric') || '{}')
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === 'osdLyric') {
      osdLyricConfig = JSON.parse(e.newValue || '{}')
      clearTimeout(timeoutId)
      lastTrackedPos = null
      if (osdLyricConfig.showButtonWhenLock === false) hideUnlockButton()
    }
  })

  lockEl?.addEventListener('mouseenter', () => {
    ipcRenderer.send('set-ignore-mouse', false)
  })

  lockEl?.addEventListener('mouseleave', () => {
    ipcRenderer.send('mouseleave')
  })

  ipcRenderer.on(
    'osd-lock-mouse-state',
    (_event, data: { inside: boolean; x: number; y: number }) => {
      const { inside } = data

      if (!root.classList.contains('is-lock')) {
        clearTimeout(timeoutId)
        clearTimeout(hideButtonTimeout)
        hideButtonTimeout = null
        lastTrackedPos = null
        // 未锁定状态：仅当 enter/leave 状态真正变化时才通知 Vue，防止每 50ms 触发重渲染
        if (inside !== wasInside) {
          wasInside = inside
          root.dispatchEvent(new CustomEvent('osd-mouse-enter-leave', { detail: { inside } }))
        }
        return
      }

      const { x, y } = data

      if (!inside) {
        // 光标确实已经离开窗口（基于真实坐标判断，不存在漏检）：
        // 100ms 后隐藏解锁按钮。注意不能在这里 clearTimeout(hideButtonTimeout)：
        // 轮询间隔 50ms 会不断重置定时器导致永远无法触发。
        lastTrackedPos = null
        clearTimeout(timeoutId)
        if (!hideButtonTimeout) {
          hideButtonTimeout = setTimeout(() => {
            hideUnlockButton()
            hideButtonTimeout = null
          }, 100)
        }
        return
      }

      // 光标在窗口内：取消移出后的隐藏计时。
      clearTimeout(hideButtonTimeout)
      hideButtonTimeout = null

      const moved = !lastTrackedPos || lastTrackedPos.x !== x || lastTrackedPos.y !== y
      lastTrackedPos = { x, y }

      if (!moved) return // 静止轮询不能重新显示已经自动隐藏的按钮。

      clearTimeout(timeoutId)
      if (osdLyricConfig.showButtonWhenLock === false) {
        hideUnlockButton()
        return
      }
      if (lockEl) {
        lockEl.style.opacity = '1'
        lockEl.style.pointerEvents = 'auto'
      }
      if (osdLyricConfig?.staticTime === 0) return

      lastMoveTime = Date.now()
      timeoutId = setTimeout(() => {
        if (
          root?.classList?.contains('is-lock') &&
          Date.now() - lastMoveTime >= (osdLyricConfig.staticTime ?? 1500)
        ) {
          hideUnlockButton()
        }
      }, osdLyricConfig.staticTime ?? 1500)
    }
  )
})
