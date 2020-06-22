const { readFile, writeFile, readdir, stat } = require('fs')
const { promisify } = require('util')
const { join } = require('path')
const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)

function sortByTitle(a, b) {
  if (a.title.toLowerCase() < b.title.toLowerCase()) return -1
  if (a.title.toLowerCase() > b.title.toLowerCase()) return 1
  return 0
}

async function run() {
  const fileName = join(__dirname, 'bbc.json')
  const text = await readFileAsync(fileName)
  let bbc = JSON.parse(text)
  const pids = {}
  let notfound = 0
  for (const key of Object.keys(bbc)) {
    const { path } = bbc[key]
    bbc[key].notfound = false
    if (path.indexOf('/media/seagate/') > -1) {
      pids[bbc[key].pid] = bbc[key]
    } else if (path.indexOf('/media/blue1/') > -1) {
      if (!pids[bbc[key].pid]) pids[bbc[key].pid] = bbc[key]
    } else if (path.indexOf('/media/disk2/') > -1) {
      if (!pids[bbc[key].pid]) pids[bbc[key].pid] = bbc[key]
    } else {
      if (!pids[bbc[key].pid]) {
        pids[bbc[key].pid] = bbc[key]
        bbc[key].notfound = true
      }
      console.log(`Not Found: ${path}`)
      notfound++
    }
  }
  console.log(`Total Not Found: ${notfound}`)
  bbc = Object.keys(pids).map(v => pids[v]).map(v => {
    const { path, size, name, pid, meta, exif, notfound } = v
    const record = { path, size, name, pid }
    record.name = meta.name
    record.tags = meta.categories ? meta.categories.toLowerCase().split(',') : ''
    record.channel = meta.channel
    record.duration = 0
    if (exif && exif.duration) {
      const [h, m, s] = exif.duration.split(':').map(v => parseInt(v, 10))
      record.duration = (h * 60 * 60) + (m * 60) + s
    }
    record.description = meta.desc
    record.longDescription = meta.desclong
    record.episode = meta.episode === '-' ? null : meta.episode
    record.broadcast = meta.firstbcastdate
    record.title = meta.title || ''
    record.notfound = notfound
    if (record.episode) {
      record.title = `${record.name} / ${record.episode}`
    }
    record.type = meta.type
    record.thumbnail = meta.thumbnail
    return record
  })
  bbc.sort(sortByTitle)
  for (let i = 0; i < bbc.length; i += 1000) {
    let page = Math.floor(i / 1000)
    console.log(page)
    console.log(i)
    await writeFileAsync(join(__dirname, `./external/bbc.${page}.json`), JSON.stringify(bbc.slice(i, i + 1000)))
  }
  await writeFileAsync(join(__dirname, './web/bbc.json'), JSON.stringify(bbc.filter(v => !v.notfound)))
}

run().catch(err => console.error(err))
