const { spawn } = require('child_process')
const { join } = require('path')

const homeDir = '/media/bbc'
const pwd = join(__dirname, '../')

function download(pid) {
	const script = `
PID=${pid}
echo getting $PID
docker run -t --rm -v ${pwd}/config:/data/config -v ${homeDir}:/data/output barwell/get-iplayer ./get_iplayer --ffmpeg /usr/bin/ffmpeg --atomicparsley /usr/bin/AtomicParsley --profile-dir /data/config --output /data/output --subtitles --force --pid $PID 1>$PID.log 2>&1
`
	return new Promise((ok, fail) => {
		const child = spawn('/bin/sh', [ '-c', script ])
		child.stdout.pipe(process.stdout)
		child.stderr.pipe(process.stderr)
		child.on('close', code => {
			if (code !== 0) fail(new Error(`Bad Return Code: ${code}`))
			ok()
		})
	})
}

async function run(args) {
  const [ url ] = args
  const match = url.match(/https?:\/\/www.bbc.co.uk\/iplayer\/episode\/(.+)\/(.+)/)
  if (match && match.length === 3) {
    const [ , pid, name ] = match
    await download(pid)
  }
}

run(process.argv.slice(2)).catch(err => console.error(err))
