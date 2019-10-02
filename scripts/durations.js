const { readFile, writeFile, readdir, stat } = require('fs')
const { promisify } = require('util')
const { join } = require('path')
const { spawn } = require('child_process')
const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)

const sleep = ms => new Promise(ok => setTimeout(ok, ms))

function exifTool(path) {
	const script = `exiftool ${path}`
	return new Promise((ok, fail) => {
		const child = spawn('/bin/sh', [ '-c', script ])
    const chunks = []
		child.stdout.on('data', data => chunks.push(data.toString('utf8')))
		child.on('close', code => {
			if (code !== 0) fail(new Error(`Bad Return Code: ${code}`))
			ok(chunks.join(''))
		})
	})
}

function parseLine(line) {
  const i = line.indexOf(':')
  if (i < 0) return []
  const key = line.slice(0, i).trim()
  const val = line.slice(i + 1).replace(/[\r\n]/g, '').trim()
  return [ key, val ]
}

async function run() {
  const rx = /[ /]/g
  const dbName = join(__dirname, '../db.json')
  const text = await readFileAsync(dbName)
  const bbc = JSON.parse(text)
  for (const record of bbc) {
    if (record.meta) {
      const text = await exifTool(record.path)
      const exif = {}
      text.split('\n').map(parseLine).filter(v => v.length).forEach(v => exif[v[0].replace(rx, '_').toLowerCase()] = v[1])
      record.exif = exif
      record.meta.duration = exif.duration
      console.log(`${record.path} ${record.meta.duration}`)
    }
  }
	await writeFileAsync(dbName, JSON.stringify(bbc, null, '  '))
}

run().catch(err => console.error(err))
