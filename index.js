"use strict"

const { Launcher } = require('chrome-launcher')
const NodeCEC = require('./nodecec')
const chrome = require('chrome-remote-interface')
const { spawn } = require('child_process')

let omx
let cec
let timer

const chromePath = '/usr/bin/chromium-browser'
const homeDir = "/source/bbox/web"
const startingUrl = `file://${homeDir}/index.html`
const tvDir = '/media/blue1/bbc'

const chromeFlags = [
  '--kiosk',
  '--allow-file-access-from-files',
  '--window-size=1920,1080',
  '--window-position=0,0',
  '--disable-web-security',
  '--incognito',
  '--disable-gpu',
  '--noerrdialogs',
  '--disable-translate',
  '--no-first-run',
  '--fast',
  '--fast-start',
  '--disable-infobars',
  '--disable-features=TranslateUI',
  '--disk-cache-dir=/dev/null'
]

function initCEC(protocol) {
  const { Runtime } = protocol
  cec = new NodeCEC()
  cec.on("ready", function (data) {
    console.log("ready...")
  })
  cec.on("status", function (data) {
    console.log("[" + data.id + "] changed from " + data.from + " to " + data.to)
  })
  cec.on("key", async data => {
    switch(data.name) {
      case "pause":
      case "play":
        if(omx) omx.stdin.write("p")
        break
      case "stop":
        if(omx) omx.stdin.write("q")      
        break
      case "select":
        if(omx) {
          omx.stdin.write("s")
        } else {
          await Runtime.evaluate({ expression: 'select()', awaitPromise: true, returnByValue: true })
        }
        break
      case "up":
        if(omx) {
          omx.stdin.write("+")
        } else {
          await Runtime.evaluate({ expression: 'up()', awaitPromise: true, returnByValue: true })
        }
        break
      case "down":
        if(omx) {
          omx.stdin.write("-")
        } else {
          await Runtime.evaluate({ expression: 'down()', awaitPromise: true, returnByValue: true })
        }
        break
      case "left":
        if(omx) {
          omx.stdin.write("\x17[D")
        } else {
          await Runtime.evaluate({ expression: 'left()', awaitPromise: true, returnByValue: true })
        }
        break
      case "right":
        if(omx) {
          omx.stdin.write("\x17[C")
        } else {
          await Runtime.evaluate({ expression: 'right()', awaitPromise: true, returnByValue: true })
        }
        break;
    }
  })
  cec.on("close", function (code) {
    setTimeout(() => {
      initCEC(protocol)
    }, 1000)
  })
  cec.on("error", function (data) {
    console.log("---------------- ERROR ------------------")
    console.log(data);
    console.log("-----------------------------------------")
  })
  cec.start()
}
async function run() {
  let launcher
  let client
  try {
    launcher = new Launcher({
      port: 9222,
      chromePath,
      startingUrl,
      envVars: { DISPLAY: ':0' }, 
      chromeFlags,
      handleSIGINT: true
    })
    await launcher.launch()
    launcher.chrome.on('close', () => {
      console.log('browser closed')
      clearTimeout(timer)
    })
    console.log(`chrome is running on ${launcher.port}`)
    client = await chrome()
    console.log('client acquired')
    const { Network, Page, Runtime } = client
    Network.requestWillBeSent((params) => {
      console.log("loading page: " + params.request.url)
    })
    await Network.enable()
    console.log('network enabled')
    await Page.enable()
    console.log('page enabled')
    await Runtime.enable()
    console.log('runtime enabled')
    console.log('page loaded')
    timer = setInterval(async () => {
      try {
        const pending = await Runtime.evaluate({ expression: 'poll()', awaitPromise: true, returnByValue: true })
        const { result } = pending
        console.dir(result)
        if (result.value && result.value.path) {
          if (omx) omx.stdin.write('q')
          // TODO: wait for quit
          const { path, subtitles } = result.value
          if (subtitles) {
            omx = spawn("/usr/bin/omxplayer.bin", ["-b", "-o", "hdmi", `--subtitles=${subtitles}`, `${tvDir}${path}`])
          } else {
            omx = spawn("/usr/bin/omxplayer.bin", ["-b", "-o", "hdmi", `${tvDir}${path}`])
          }
          omx.once("exit", function () {
            console.log("exit: " + omx.pid)
            omx = null
          })
        }
      } catch (err) {
        console.log(err.message)
      }
    }, 1000)
    await Runtime.evaluate({ expression: 'load()', awaitPromise: true, returnByValue: true })
    initCEC(client)
    process.on('SIGTERM', () => {
      console.log('shutting down')
      if (client) client.close()
      if (launcher) launcher.kill()
      setTimeout(() => process.exit(0), 1000)
    })
    process.on('SIGINT', () => {
      console.log('shutting down')
      if (client) client.close()
      if (launcher) launcher.kill()
      setTimeout(() => process.exit(0), 1000)
    })
  } catch (err) {
    console.error('error opening page')
    if (client) client.close()
    if (launcher) launcher.kill()
    clearTimeout(timer)
    throw(err)
  }
}

run().catch(err => console.error(err))
