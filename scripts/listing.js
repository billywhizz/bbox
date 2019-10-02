const { readFile, writeFile, readdir, stat } = require('fs')
const { promisify } = require('util')
const { join } = require('path')
const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)

function sortByTitle(a, b) {
  if (a.title < b.title) return -1
  if (a.title > b.title) return 1
  return 0
}

async function run() {
  const fileName = join(__dirname, '../db.json')
  const text = await readFileAsync(fileName)
  let bbc = JSON.parse(text)
  const pids = {}
  bbc = bbc.filter(v => {
    if (v.pid) {
      if (!v.meta) return false
      if (pids[v.pid] && pids[v.pid].subtitles) return true
      pids[v.pid] = v
      return true
    }
    return false
  })
  bbc = Object.keys(pids).map(v => pids[v]).map(v => {
    const { path, size, name, pid, meta } = v
    const record = { path, size, name, pid }
    record.name = meta.name
    record.brand = meta.brand
    record.tags = meta.categories ? meta.categories.toLowerCase() : ''
    record.category = meta.category ? meta.category.toLowerCase() : ''
    record.channel = meta.channel
    record.duration = meta.duration
    record.description = meta.desc
    record.episode = meta.episode === '-' ? null: meta.episode
    record.broadcast = meta.firstbcastdate
    record.title = meta.title || ''
    if (record.episode) {
      record.title = `${record.name} / ${record.episode}`
    }
    record.type = meta.type
    record.thumbnail = meta.thumbnail
    return record
  })
  bbc.sort(sortByTitle)
	await writeFileAsync(join(__dirname, '../web/bbc.json'), JSON.stringify(bbc, null, '  '))
}

run().catch(err => console.error(err))
