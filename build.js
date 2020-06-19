const { readFile, writeFile, readdir, stat } = require('fs')
const { promisify } = require('util')
const { extname, join } = require('path')
const { spawn } = require('child_process')
const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)
const readdirAsync = promisify(readdir)
const statAsync = promisify(stat)

const rxId = /.+((?:b|p|m)0[\d\w]{6})_/
const rxHref = /https?:\/\/www.bbc.co.uk\/iplayer\/.+\/(.+)\/(.+)?/
const rxExif = /[ /]/g

const sleep = ms => new Promise(ok => setTimeout(ok, ms))

function parseLine(line) {
  const i = line.indexOf(':')
  if (i < 0) return []
  const key = line.slice(0, i).trim()
  const val = line.slice(i + 1).replace(/[\r\n]/g, '').trim()
  return [key, val]
}

async function loadIfExists(fileName, format = 'json') {
  try {
    const stat = await statAsync(fileName)
    const buf = await readFileAsync(fileName)
    const text = buf.toString('utf8')
    if (format === 'json') return JSON.parse(text)
    return text
  } catch (err) {
    return null
  }
}

function exifTool(path) {
  const script = `exiftool ${path}`
  return new Promise((ok, fail) => {
    const child = spawn('/bin/sh', ['-c', script])
    const chunks = []
    child.stdout.on('data', data => chunks.push(data.toString('utf8')))
    child.on('close', code => {
      if (code !== 0) fail(new Error(`Bad Return Code: ${code}`))
      const text = chunks.join('')
      const exif = {}
      text.split('\n').map(parseLine).filter(v => v.length).forEach(v => {
        exif[v[0].replace(rxExif, '_').toLowerCase()] = v[1]
      })
      ok(exif)
    })
  })
}

function killGetiPlayer() {
  const script = 'docker kill get-iplayer'
  return new Promise((ok, fail) => {
    const child = spawn('/bin/sh', ['-c', script])
    const chunks = []
    child.stdout.on('data', data => chunks.push(data.toString('utf8')))
    child.on('close', code => {
      if (code !== 0) fail(new Error(`Bad Return Code: ${code}`))
      ok(chunks.join(''))
    })
  })
}

function runGetiPlayer() {
  const script = 'docker run -d --rm --name get-iplayer get-iplayer /bin/watch -n 1 /bin/true'
  return new Promise((ok, fail) => {
    const child = spawn('/bin/sh', ['-c', script])
    const chunks = []
    child.stdout.on('data', data => chunks.push(data.toString('utf8')))
    child.on('close', code => {
      if (code !== 0) fail(new Error(`Bad Return Code: ${code}`))
      ok(chunks.join(''))
    })
  })
}

function getPIDFromXML(path) {
  const script = `cat ${path} | grep -oPm1 "(?<=<pid>)[^<]+"`
  return new Promise((ok, fail) => {
    const child = spawn('/bin/sh', ['-c', script])
    const chunks = []
    child.stdout.on('data', data => chunks.push(data.toString('utf8')))
    child.on('close', code => {
      if (code !== 0) fail(new Error(`Bad Return Code: ${code}`))
      const text = chunks.join('').trim()
      ok(text.split('\n')[0])
    })
  })
}

async function getPIDFromDownloadJSON(path) {
  const json = await loadIfExists(path)
  if (!json) return
  let url
  json.mediaSelection.media.some(media => {
    if (media && media.connection) {
      if (media.connection.href) {
        url = media.connection.href
        return true
      }
      if (media.connection.length) {
        return media.connection.some(connection => {
          if (connection.identifier) {
            url = connection.identifier
            return true
          }
        })
      }
    }
  })
  if (!url) return
  const match = url.match(rxId)
  if (match && match.length > 1) {
    const [, pid] = match
    return pid
  }
}

function getInfo(pid) {
  const script = `docker exec -t get-iplayer ./get_iplayer --info --pid=${pid}`
  return new Promise((ok, fail) => {
    const child = spawn('/bin/sh', ['-c', script])
    const chunks = []
    child.stdout.on('data', data => chunks.push(data.toString('utf8')))
    child.on('close', code => {
      if (code !== 0) fail(new Error(`Bad Return Code: ${code}`))
      ok(chunks.join(''))
    })
  })
}

async function generate(path, homeDir, db) {
  const listing = await readdirAsync(path)
  for (const entry of listing) {
    if (entry !== 'lost+found') {
      const fileName = join(path, entry)
      const fileStat = await statAsync(fileName)
      if (fileStat.isFile()) {
        const ext = extname(entry)
        const name = entry.replace(ext, '')
        if (ext === '.mp4' || ext === '.flv') {
          const record = { path: fileName, size: fileStat.size, name, subtitles: join(path, `${name}.srt`) }
          if (!db[record.path]) {
            const subs = await loadIfExists(record.subtitles, 'text')
            if (!subs) delete record.subtitles
            const info = await loadIfExists(join(homeDir, `.bbc/${name}.info.json`))
            if (info) {
              const { programme } = info
              if (programme) {
                const { pid } = programme
                record.pid = pid
              } else {
                const { playlist } = info
                if (playlist) {
                  const { link } = playlist
                  const { href } = link.filter(v => v.rel === 'self')[0]
                  if (!href) {
                    console.error(JSON.stringify(info, null, '  '))
                  }
                  const match = href.match(rxHref)
                  if (match && match.length > 1) {
                    const [, pid] = match
                    record.pid = pid
                  }
                } else {
                  console.error(JSON.stringify(info, null, '  '))
                  process.exit(1)
                }
              }
            } else {
              const match = name.match(rxId)
              if (match && match.length > 1) {
                const [, pid] = match
                record.pid = pid
              }
            }
            if (!record.pid) {
              let xmlPath = join(homeDir, `.bbc/${name}.info.xml`)
              let xml = await loadIfExists(xmlPath, 'xml')
              if (xml) {
                console.error(`getting pid from xml: ${xmlPath}`)
                record.pid = await getPIDFromXML(xmlPath)
              } else {
                xmlPath = join(homeDir, `.bbc/${name}.xml`)
                xml = await loadIfExists(xmlPath, 'xml')
                if (xml) {
                  console.error(`getting pid from xml: ${xmlPath}`)
                  record.pid = await getPIDFromXML(xmlPath)
                  console.error(`from xml 2: ${record.pid}`)
                }
              }
            }
            if (!record.pid) {
              const downloadPath = join(homeDir, `.bbc/${name}.download.json`)
              console.error(`getting pid from download json: ${downloadPath}`)
              record.pid = await getPIDFromDownloadJSON(downloadPath)
            }
            if (!record.pid) {
              console.error(`\u001b[31mno pid found: ${record.path}\u001b[37m`)
              //process.exit(1)
            }
            try {
              record.exif = await exifTool(record.path)
            } catch (err) {
              console.log(`error getting exif data: ${record.path}`)
            }
            db[record.path] = record
            console.log(`${fileName}: ${record.pid}`)
            await writeFileAsync('./bbc.json', JSON.stringify(db, null, '  '))
          }
        }
      } else if (fileStat.isDirectory()) {
        await generate(join(path, entry), homeDir, db)
      }
    }
  }
}

async function run(args) {
  const [homeDir] = args
  let db = await loadIfExists('./bbc.json')
  if (!db) db = {}
  await generate(homeDir, homeDir, db)
  await writeFileAsync('./bbc.json', JSON.stringify(db, null, '  '))
  await runGetiPlayer()
  await sleep(5000)
  for (const path of Object.keys(db)) {
    const record = db[path]
    if (record.pid && !record.meta) {
      console.log(`getting info for ${record.pid}`)
      record.info = await getInfo(record.pid)
      record.meta = {}
      record.info.split('\n').map(parseLine).filter(v => v.length).filter(v => !v[0].match(/INFO|WARNING/)).forEach(v => (record.meta[v[0]] = v[1]))
      await writeFileAsync('./bbc.json', JSON.stringify(db, null, '  '))
    }
  }
  await killGetiPlayer()
}

run(process.argv.slice(2)).catch(err => console.error(err))
