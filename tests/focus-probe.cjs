const { app, BrowserWindow } = require('electron')
const path = require('node:path')
const os = require('node:os')
app.setName('Open Music Focus Probe')
app.setPath('userData', path.join(os.tmpdir(), 'open-music-focus-probe'))
app.whenReady().then(async () => {
  const probe = new BrowserWindow({
    title: 'Open Music Focus Probe',
    width: 640,
    height: 360,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
  })
  await probe.loadURL(
    'data:text/html,<title>Focus probe</title><h1>Open Music regression focus probe</h1>'
  )
  probe.focus()
})
app.on('window-all-closed', () => app.quit())
