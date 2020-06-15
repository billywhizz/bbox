const { Launcher } = require('chrome-launcher')
const NodeCEC = require('./nodecec')
const chrome = require('chrome-remote-interface')
const { join } = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const express = require('express')
const { extname } = path

function initCEC (protocol) {
  const { Runtime } = protocol
  const cec = new NodeCEC()
  cec.on('ready', function (data) {
    console.error('cec.ready')
  })
  cec.on('status', function (data) {
    console.error('cec.ready')
    console.error('[' + data.id + '] changed from ' + data.from + ' to ' + data.to)
  })
  cec.on('key', async data => {
    switch (data.name) {
      case 'pause':
      case 'play':
        if (protocol.omx) protocol.omx.stdin.write('p')
        break
      case 'stop':
        if (protocol.omx) protocol.omx.stdin.write('q')
        break
      case 'select':
        if (protocol.omx) {
          protocol.omx.stdin.write('s')
        } else {
          await Runtime.evaluate({ expression: 'select()', awaitPromise: true, returnByValue: true })
        }
        break
      case 'up':
        if (protocol.omx) {
          protocol.omx.stdin.write('+')
        } else {
          await Runtime.evaluate({ expression: 'up()', awaitPromise: true, returnByValue: true })
        }
        break
      case 'down':
        if (protocol.omx) {
          protocol.omx.stdin.write('-')
        } else {
          await Runtime.evaluate({ expression: 'down()', awaitPromise: true, returnByValue: true })
        }
        break
      case 'left':
        if (protocol.omx) {
          protocol.omx.stdin.write('\x17[D')
        } else {
          await Runtime.evaluate({ expression: 'left()', awaitPromise: true, returnByValue: true })
        }
        break
      case 'right':
        if (protocol.omx) {
          protocol.omx.stdin.write('\x17[C')
        } else {
          await Runtime.evaluate({ expression: 'right()', awaitPromise: true, returnByValue: true })
        }
        break;
    }
  })
  cec.on('close', function (code) {
    console.error('cec.close')
    setTimeout(() => {
      initCEC(protocol)
    }, 1000)
  })
  cec.on('error', function (err) {
    console.error('cec.error')
    console.error(err)
  })
  cec.start()
  return cec
}

async function launch (chromePath, startingUrl, chromeFlags) {
  const launcher = new Launcher({
    port: 9222,
    chromePath,
    startingUrl,
    envVars: { DISPLAY: ':0' },
    chromeFlags,
    handleSIGINT: false,
    ignoreDefaultFlags: true
  })
  await launcher.launch()
  launcher.chrome.on('close', () => {
    clearTimeout(timer)
  })
  const client = await chrome()
  const { Network, Page, Runtime } = client
  const page = Page
  Network.requestWillBeSent((params) => {
    console.log('loading page: ' + params.request.url)
  })
  await Network.enable()
  await Page.enable()
  await Runtime.enable()
  timer = setInterval(async () => {
    try {
      const pending = await Runtime.evaluate({ expression: 'poll()', awaitPromise: true, returnByValue: true })
      const { result } = pending
      if (result.value && result.value.path) {
        if (client.omx) client.omx.stdin.write('q')
        const { path, subtitles } = result.value
        if (subtitles) {
          client.omx = spawn('/usr/bin/omxplayer', [`--subtitles=${subtitles}`, path])
        } else {
          client.omx = spawn('/usr/bin/omxplayer', [path])
        }
        client.omx.once('exit', function () {
          client.omx = null
        })
      }
    } catch (err) {
      console.log(err.message)
    }
  }, 100)
  await Runtime.evaluate({ expression: 'load()', awaitPromise: true, returnByValue: true })
  return { launcher, client, page }
}

function requestHandler (req, res) {
  if (req.path.substring(0, 5) !== '/play') {
    res.status(404)
    res.end()
    return
  } 
  const videoFilePath = req.path.replace('/play', '')
  if (videoFilePath.substring(0, 6) !== '/media') {
    res.status(403)
    res.end()
    return
  }
  if (videoFilePath.length > 1024 || videoFilePath.length < 12) {
    res.status(400)
    res.end()
    return
  }
  try {
    if (!(extname(videoFilePath) === '.mp4' || extname(videoFilePath) === '.flv')) {
      res.status(404)
      res.end()
      return
    }
    const stats = fs.statSync(videoFilePath)
    if (stats.isDirectory()) {
      res.status(400)
      res.end()
      return
    }
    const fileSize = stats.size
    if (fileSize < 1 || fileSize > (4 * 1024 * 1024 * 1024)) {
      res.status(400)
      res.end()
      return
    }
    const { range } = req.headers
    if (!range) {
      res.append('Content-Length', fileSize)
      res.append('Content-Type', 'video/mp4')
      res.status(200)
      const fileStream = fs.createReadStream(videoFilePath)
      fileStream.pipe(res)
      return
    }
    let start = 0
    let end = fileSize - 1
    if (range) {
      const [s, e] = range.replace('bytes=', '').split('-')
      start = Number(s)
      end = Number(e) || fileSize - 1
      res.append('Content-Range', `bytes ${start}-${end}/${fileSize}`)
    }
    res.append('Accept-Ranges', 'bytes')
    res.append('Content-Length', end - start + 1)
    res.append('Content-Type', 'video/mp4')
    res.status(206)
    const fileStream = fs.createReadStream(videoFilePath, { start, end })
    fileStream.pipe(res)
  } catch (err) {
    console.error(err.stack)
    res.status(500)
    res.end()
  }
}

function authMiddleware (users) {
  function authenticateRequest (req, res, next) {
    const { headers } = req
    if (req.path === '/manifest.json') return next()
    if (!req.headers.authorization) {
      res.setHeader('WWW-Authenticate', 'Basic realm=bbox')
      res.status(401)
      res.end()
      return
    }
    const { authorization } = headers
    if (authorization.substring(0, 6) !== 'Basic ') {
      res.setHeader('WWW-Authenticate', 'Basic realm=bbox')
      res.status(401)
      res.end()
      return
    }
    if (authorization.length > 1024) {
      res.setHeader('WWW-Authenticate', 'Basic realm=bbox')
      res.status(401)
      res.end()
      return
    }
    const base64 = authorization.substring(6, 1024)
    if (base64.length < 8) {
      res.setHeader('WWW-Authenticate', 'Basic realm=bbox')
      res.status(401)
      res.end()
      return
    }
    const decoded = Buffer.from(base64, 'base64').toString('utf8')
    const parts = decoded.split(':')
    const [username, password] = parts
    if (!users[username]) {
      res.setHeader('WWW-Authenticate', 'Basic realm=bbox')
      res.status(401)
      res.end()
      return
    }
    if (!(users[username].password === password)) {
      res.setHeader('WWW-Authenticate', 'Basic realm=bbox')
      res.status(401)
      res.end()
      return
    }
    req.username = username
    next()
  }
  return authenticateRequest
}

async function run() {
  let launcher
  let client
  let page
  let shuttingDown = false
  let timer
  let app
  let https
  let chrome
  let cec
  const chromePath = process.env.CHROMEPATH || '/usr/bin/chromium-browser'
  const startingUrl = `file://${join(__dirname, 'web', 'index.html')}`
  const chromeFlags = [
    '--kiosk',
    '--allow-file-access-from-files',
    '--window-size=1920,1080',
    '--window-position=0,0',
    '--disable-gpu',
    '--noerrdialogs',
    '--noerrors',
    '--disable-translate',
    '--no-first-run',
    '--fast',
    '--fast-start',
    '--disable-infobars',
    '--check-for-update-interval=1',
    '--simulate-critical-update',
    '--disable-restore-session-state',
    '--disable-session-crashed-bubble',
    '--disable-features=TranslateUI'
  ]
  const certs = require('./certs.json')
  const users = require('./users.json')
  const tlsOptions = {
    key: certs.privkey,
    cert: `${certs.cert}\n${certs.chain}`
  }

  function shutdown(err) {
    if (err) console.error(err)
    if (shuttingDown) return
    shuttingDown = true
    if (page) page.close()
    if (client) client.close()
    if (launcher) launcher.kill()
    if (https) https.close()
    clearTimeout(timer)
    timer = setTimeout(async () => {
      process.exit(0)
    }, 5000)
    timer.unref()
  }

  try {
    process.on('SIGTERM', () => shutdown())
    process.on('SIGINT', () => shutdown())
    chrome = await launch(chromePath, startingUrl, chromeFlags)
    launcher = chrome.launcher
    client = chrome.client
    page = chrome.page
    cec = initCEC(client)
    app = express()
    https = require('https').createServer(tlsOptions, app)
    app.use(authMiddleware(users))
    app.use(express.static(path.join(__dirname, 'external')))
    app.get('*', requestHandler)
    https.listen(8443, '0.0.0.0', err => {
      if (err) return shutdown(err)
      console.log('Server is up...')
    });
  } catch (err) {
    shutdown(err)
  }
}

run().catch(err => console.error(err))
