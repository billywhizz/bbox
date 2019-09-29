const { readFile, writeFile, readdir, stat } = require('fs')
const { promisify } = require('util')
const { join } = require('path')
const { spawn } = require('child_process')
const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)

async function run() {
  const fileName = join(__dirname, '../db.json')
  const text = await readFileAsync(fileName)
  let bbc = JSON.parse(text)
  bbc = bbc.filter(v => (v.pid && v.meta && v.meta.categories))
  bbc = bbc.map(v => {
    const { path, size, name, pid, meta } = v
    const record = { path, size, name, pid }
    record.name = meta.name
    record.brand = meta.brand
    record.tags = meta.categories.toLowerCase()
    record.category = meta.category.toLowerCase()
    record.channel = meta.channel
    record.duration = meta.duration
    record.description = meta.desc
    record.episode = meta.episode === '-' ? null: meta.episode
    record.broadcast = meta.firstbcastdate
    record.title = meta.title
    if (record.episode) {
      record.title = `${record.name} / ${record.episode}`
    }
    record.type = meta.type
    record.thumbnail = meta.thumbnail
    return record
  })
	await writeFileAsync(join(__dirname, '../web/bbc.json'), JSON.stringify(bbc, null, '  '))
}

run().catch(err => console.error(err))
