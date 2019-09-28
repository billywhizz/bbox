const { readFile, writeFile, readdir, stat } = require('fs')
const { promisify } = require('util')
const { join } = require('path')
const { spawn } = require('child_process')
const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)

function getInfo(pid) {
	const script = `
PID=${pid}
docker exec -t get-iplayer ./get_iplayer --info --pid=$PID
`
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

const isUpperCase = (string) => /^[A-Z]*$/.test(string)

function parseLine(line) {
  const i = line.indexOf(':')
  if (i < 0) return []
  if (isUpperCase(line[0])) return []
  const key = line.slice(0, i).trim()
  const val = line.slice(i + 1).replace(/[\r\n]/g, '').trim()
  return [ key, val ]
}

async function run() {
  const fileName = join(__dirname, '../db.json')
  const text = await readFileAsync(fileName)
  const bbc = JSON.parse(text)
  const timer = setInterval(async () => {
    await writeFileAsync(fileName, JSON.stringify(bbc, null, '  '))
    console.log('saved')
  }, 5000)
  for (const record of bbc) {
    if (record.pid && !record.info) {
      record.info = await getInfo(record.pid)
    }
    if (record.pid && record.info) {
      record.meta = {}
      record.info.split('\n').map(parseLine).filter(v => v.length).filter(v => !v[0].match(/INFO|WARNING/)).forEach(v => (record.meta[v[0]] = v[1]))
    }
  }
  clearTimeout(timer)
	await writeFileAsync(fileName, JSON.stringify(bbc, null, '  '))
}

run().catch(err => console.error(err))
