const { extname } = require('path')
const { promisify } = require('util')
const { spawn } = require('child_process')
const { readFile, writeFile, readdir, stat, unlink } = require('fs')
const writeFileAsync = promisify(writeFile)
const unlinkAsync = promisify(unlink)

const rxExif = /[ /]/g

function parseLine(line) {
  const i = line.indexOf(':')
  if (i < 0) return []
  const key = line.slice(0, i).trim()
  const val = line.slice(i + 1).replace(/[\r\n]/g, '').trim()
  return [key, val]
}

function convert (src, dest) {
  const script = `sudo ffmpeg -i "${src}" -vcodec copy -acodec copy "${dest}"`
  console.log(script)
  return new Promise((ok, fail) => {
    const child = spawn('/bin/sh', ['-c', script])
    child.stdout.on('data', data => {
      process.stdout.write(data)
    })
    child.stderr.on('data', data => {
      process.stderr.write(data)
    })
    child.on('close', code => {
      if (code !== 0) fail(new Error(`Bad Return Code: ${code}`))
      ok()
    })
  })
}

function exifTool (path) {
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

async function run () {
  const bbc = require('./bbc.json')
  const keys = Object.keys(bbc)
  for (const key of keys) {
    const record = bbc[key]
    const { path, size, name, pid, exif, info, meta } = record
    if (extname(path) === '.flv') {
      const start = Date.now()
      const newFileName = path.replace('.flv', '.mp4')
      console.log(`converting ${path} to ${newFileName}`)
      await convert(path, newFileName)
      record.exif = await exifTool(newFileName)
      record.path = newFileName
      delete record.info
      await unlinkAsync(path)
      delete bbc[path]
      bbc[newFileName] = record
      await writeFileAsync('./bbc.json', JSON.stringify(bbc))
      const elapsed = Math.floor((Date.now() - start) / 10) / 100
      console.log(`${newFileName} converted in ${elapsed} seconds`)
    }
  }
  await writeFileAsync('./bbc.json', JSON.stringify(bbc))
}

run().catch(err => console.error(err))
