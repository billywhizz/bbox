"use strict"

const { Launcher } = require('chrome-launcher')
const NodeCEC = require('./nodecec')
const chrome = require('chrome-remote-interface')
const { join } = require('path')
const { spawn } = require('child_process')
const { promisify } = require('util')
const { readFile, writeFile } = require('fs')
const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)
const repl = require('repl')

let omx
let cec
let timer

// todo = look for both
//const chromePath = '/usr/bin/google-chrome-stable'
const chromePath = '/usr/bin/chromium-browser'
const startingUrl = `file://${join(__dirname, 'web', 'index.html')}`
console.log(startingUrl)

const chromeFlags = [
  '--kiosk',
  '--allow-file-access-from-files',
  '--window-size=1920,1080',
  '--window-position=0,0',
  '--disable-web-security',
  '--disable-gpu',
  '--noerrdialogs',
  '--noerrors',
  '--disable-translate',
  '--no-first-run',
  '--fast',
  '--fast-start',
  '--disable-infobars',
  '--disable-restore-session-state',
  '--disable-session-crashed-bubble',
  '--disable-features=TranslateUI',
  `--disk-cache-dir=${join(__dirname, 'Cache')}`,
  `--user-data-dir=${join(__dirname, 'Default')}`
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
  let page
  try {
    launcher = new Launcher({
      port: 9222,
      chromePath,
      startingUrl,
      envVars: { DISPLAY: ':0' }, 
      chromeFlags,
      handleSIGINT: false
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
    page = Page
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
        if (result.value && result.value.path) {
          if (omx) omx.stdin.write('q')
          // TODO: wait for quit
          const { path, subtitles } = result.value
          if (subtitles) {
            omx = spawn("/usr/bin/omxplayer.bin", ["-b", "-o", "hdmi", `--subtitles=${subtitles}`, `${path}`])
          } else {
            omx = spawn("/usr/bin/omxplayer.bin", ["-b", "-o", "hdmi", `${path}`])
          }
          omx.once("exit", function () {
            console.log("exit: " + omx.pid)
            omx = null
          })
        }
      } catch (err) {
        console.log(err.message)
      }
    }, 100)
    //await Page.loadEventFired()
    await Runtime.evaluate({ expression: 'load()', awaitPromise: true, returnByValue: true })
    initCEC(client)
    let shuttingDown = false
    function shutdown() {
      if (shuttingDown) return
      shuttingDown = true
      console.log('shutting down')
      if (page) page.close()
      if (client) client.close()
      if (launcher) launcher.kill()
      clearTimeout(timer)
      setTimeout(async () => {
        //const text = await readFileAsync('./Default/Default/Preferences')
        //const json = JSON.parse(text.toString('utf8'))
        //json.profile['exit_type'] = 'Normal'
        //await writeFileAsync('./Default/Default/Preferences', JSON.stringify(json))
        process.exit(0)
      }, 5000)
    }
    process.on('SIGTERM', () => shutdown())
    process.on('SIGINT', () => shutdown())
/*
    const rl = repl.start('#bbc ')
    rl.context.evaluate = async s => {
      const json = await Runtime.evaluate({ expression: s, awaitPromise: true, returnByValue: true })
      if (!json.result) return null
      return json.result
    }
*/
  } catch (err) {
    console.error('error opening page')
    if (client) client.close()
    if (launcher) launcher.kill()
    clearTimeout(timer)
    throw(err)
  }
}

run().catch(err => console.error(err))
