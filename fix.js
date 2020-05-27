const bbc = require('./bbc.json')

const keys = Object.keys(bbc)
for (const key of keys) {
  const record = bbc[key]
  if (record.path.indexOf('/media/andrew/') > -1) {
    console.log(record.path)
    record.path = record.path.replace('/media/andrew/_blue1', '/media/blue1')
    record.subtitles = record.subtitles.replace('/media/andrew/_blue1', '/media/blue1')
    record.exif.directory = record.exif.directory.replace('/media/andrew/_blue1', '/media/blue1')
    console.log(record.path)
  }
}

require('fs').writeFileSync('./bbc2.json', JSON.stringify(bbc))
