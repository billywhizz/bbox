const { readFile, writeFile, readdir, stat } = require('fs')
const { promisify } = require('util')
const { extname, join } = require('path')
const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)
const readdirAsync = promisify(readdir)
const statAsync = promisify(stat)

const rxId = /.+((?:b|p|m)0[\d\w]{6}).+?/
const homeDir = '/media/andrew/_blue1/bbc'

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

async function process(path, db) {
  const listing = await readdirAsync(path)
  for (const entry of listing) {
    const fileName = join(path, entry)
    const fileStat = await statAsync(fileName)
    if (fileStat.isFile()) {
      const ext = extname(entry)
      const name = entry.replace(ext, '')
      if (ext === '.mp4' || ext === '.flv') {
        const record = { path: fileName.replace(homeDir, ''), size: fileStat.size, name, subtitles: join(path, `${name}.srt`) }
        const subs = await loadIfExists(record.subtitles, 'text')
        if (!subs) delete record.subtitles
        const info = await loadIfExists(`${homeDir}/.bbc/${name}.info.json`)
        if (info) {
          const { programme } = info
          const { pid } = programme
          record.pid = pid
        } else {
          const match = name.match(rxId)
          if (match && match.length > 1) {
            const [ , pid ] = match
            record.pid = pid
          }
        }
        db.push(record)
      }
    } else if (fileStat.isDirectory()) {
      console.log(`${join(path, entry)} is a directory`)
      await process(join(path, entry), db)
    }
  }
}

async function run() {
  const db = []
  await process(homeDir, db)
	await writeFileAsync('./web/bbc.json', JSON.stringify(db, null, '  '))
  console.log(db.length)
  const noPids = db.filter(v => !v.pid)
  console.log(noPids.length)
	await writeFileAsync('./web/noPids.json', JSON.stringify(noPids, null, '  '))
}

run().catch(err => console.error(err))
