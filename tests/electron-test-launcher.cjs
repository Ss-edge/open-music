// Set Electron's actual userData path before application stores/database are imported.
// Chromium's --user-data-dir alone does not isolate all Electron application data.
const { app } = require('electron')
const path = require('node:path')

const prefix = '--test-user-data-dir='
const profile = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
if (!profile || !path.isAbsolute(profile)) throw new Error('An absolute test profile is required')
app.setPath('userData', profile)
require('../dist/main/index.js')
