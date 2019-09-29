const { readFile, writeFile, readdir, stat } = require('fs')
const { promisify } = require('util')
const { join } = require('path')
const { spawn } = require('child_process')
const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)

const sleep = ms => new Promise(ok => setTimeout(ok, ms))

function killGetiPlayer() {
	const script = 'docker kill get-iplayer'
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

function runGetiPlayer() {
	const script = 'docker run -d --rm --name get-iplayer barwell/get-iplayer /bin/sh'
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

function getInfo(pid) {
	const script = `docker exec -t get-iplayer ./get_iplayer --info --pid=${pid}`
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
  const docker = runGetiPlayer()
  await sleep(3000)
  const fileName = join(__dirname, './bbc.json')
  const dbName = join(__dirname, './db.json')
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
	await writeFileAsync(dbName, JSON.stringify(bbc, null, '  '))
  let output = await killGetiPlayer()
  console.log(output)
  output = await docker
  console.log(output)
}

run().catch(err => console.error(err))
