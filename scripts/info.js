const { readFileSync } = require("fs")
const text = readFileSync("../config/download_history").toString("utf8")
const progs = text.split("\n").map(v => v.split("|").slice(0, -1)).slice(0, -1).map(v => {
  const [ id, series, episode, category, downloaded, format, filename, alternatives, id2, summary, channel, tags, thumb, extra, info, num1, num2 ] = v
  return {
    id,
    series,
    episode,
    category,
    downloaded: new Date(parseInt(downloaded, 10) * 1000),
    format,
    filename: filename.replace(/\/data\/output\//, ''),
    alternatives,
    summary,
    channel,
    tags,
    thumb,
    info
  }
})
console.log(JSON.stringify(progs, null, '  '))