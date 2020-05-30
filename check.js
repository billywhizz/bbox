const bbc = require('./bbc.json')

let missingPIDs = Object.keys(bbc).map(k => bbc[k]).filter(v => !v.pid).map(v => v.path).length
console.log(`Missing PIDs: ${missingPIDs}`)
let missingMeta = Object.keys(bbc).map(k => bbc[k]).filter(record => !record.meta || (record.meta && !record.meta.title) || (record.meta && record.meta.title === 'get_iplayer'))
console.log(`Missing Meta: ${missingMeta.length}`)

Object.keys(bbc).forEach(k => {
  const record = bbc[k]
  if (!record.pid) {
    console.log(`Missing PID: ${record.path} ( ${record.pid} )`)
  }
  if (!record.meta) {
    console.log(`Missing Meta: ${record.path} ( ${record.pid} )`)
  } else {
    if (!record.meta.name) {
      console.log(`Missing Meta.name: ${record.path} ( ${record.pid} )`)
    }
    if (!record.meta.brand) {
      console.log(`Missing Meta.brand: ${record.path} ( ${record.pid} )`)
    }
    if (!record.meta.categories) {
      console.log(`Missing Meta.categories: ${record.path} ( ${record.pid} )`)
    }
    if (!record.meta.category) {
      console.log(`Missing Meta.category: ${record.path} ( ${record.pid} )`)
    }
    if (!record.meta.channel) {
      console.log(`Missing Meta.channel: ${record.path} ( ${record.pid} )`)
    }
    if (!record.meta.desc) {
      console.log(`Missing Meta.desc: ${record.path} ( ${record.pid} )`)
    }
    if (!record.meta.title) {
      console.log(`Missing Meta.title: ${record.path} ( ${record.pid} )`)
    }
    if (!record.meta.type) {
      console.log(`Missing Meta.type: ${record.path} ( ${record.pid} )`)
    }
    if (!record.meta.thumbnail) {
      console.log(`Missing Meta.thumbnail: ${record.path} ( ${record.pid} )`)
    }
  }
  if (!record.exif) {
    console.log(`Missing Exif: ${record.path}`)
  }
})