const { readFile, writeFile, readdir, stat } = require('fs')
const { promisify } = require('util')
const { join } = require('path')
const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)
const { spawn } = require('child_process')

const bbc = require('./bbc.json')

const pids = Object.keys(bbc).map(key => bbc[key].pid).reduce((keys, v) => {
  keys[v] = true
  return keys
}, {})

const homeDir = '/media/seagate/bbc'
const pwd = join(__dirname, './')

function download(pid) {
  const script = `
PID=${pid}
echo getting $PID
docker run -t --rm -v ${pwd}/config:/data/config -v ${homeDir}:/data/output get-iplayer ./get_iplayer --tvmode=good --ffmpeg /usr/bin/ffmpeg --atomicparsley /usr/bin/AtomicParsley --profile-dir /data/config --output /data/output --subtitles --force --pid $PID 1>$PID.log 2>&1
`
  return new Promise((ok, fail) => {
    const child = spawn('/bin/sh', ['-c', script])
    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)
    child.on('close', code => {
      if (code !== 0) fail(new Error(`Bad Return Code: ${code}`))
      ok()
    })
  })
}

async function run(args) {
  const text = await readFileAsync('./bbc.txt')
  const lines = text.toString().split('\n').map(line => line.trim())
  let url = lines.shift().trim()
  while (url) {
    if (url.length) {
      const match = url.match(/https?:\/\/www.bbc.co.uk\/iplayer\/episode\/(.+)\/(.+)/)
      if (match && match.length === 3) {
        const [, pid, name] = match
        if (pids[pid]) {
          console.log(`${pid} for ${name} already exists, skipping`)
        } else {
          console.log(`downloading ${pid}: ${name}, ${url}`)
          try {
            await download(pid)
          } catch (err) {
            console.log(err.message)
            lines.push(url)
          }
        }
      }
    }
    await writeFileAsync('./bbc.txt', lines.join('\n'))
    url = lines.shift().trim()
  }
}

run(process.argv.slice(2)).catch(err => console.error(err))
