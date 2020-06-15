const bbc = require('./bbc.json')
const repl = require('repl').start('> ')
repl.context.bbc = bbc
const rxClean = /[_.-]/g
repl.context.get = (path) => {
  return bbc[path]  
}
function sortByName (a, b) {
  if (a.name.toLowerCase() < b.name.toLowerCase()) return -1
  if (a.name.toLowerCase() > b.name.toLowerCase()) return 1
  return 0
}
repl.context.find = term => {
  const rx = new RegExp(`(.+)?${term}(.+)?`, 'i')
  let found = Object.keys(bbc).map(k => bbc[k]).filter(v => v.name.match(rx)).sort(sortByName)
  found = found.map(v => v.path)
  return found
}
