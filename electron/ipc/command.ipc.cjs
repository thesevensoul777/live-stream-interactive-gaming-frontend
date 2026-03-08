const { ipcMain, app } = require('electron')
const fs = require('fs')
const path = require('path')

const filePath = path.join(app.getPath('userData'), 'commandRequests.json')

ipcMain.handle('add-command', (event, payload) => {
  let data = []

  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {}

  data.push({
    msg: payload.msg,
    action: payload.action,
    tierPoints:payload.tierPoints,
    time: Date.now(),
  })

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  return true
})

ipcMain.handle('get-commands', () => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return []
  }
})
