const bbc = require('./bbc.json')
const repl = require('repl').start('> ')
repl.context.bbc = bbc
const rxClean = /[_.-]/g
repl.context.find = term => {
  const rx = new RegExp(`(.+)?${term}(.+)?`, 'i')
  let found = Object.keys(bbc).map(k => bbc[k]).filter(v => v.name.match(rx)).sort()
  found = found.map(v => v.path.replace(rxClean, '').toLowerCase()).sort()
  return found
}
