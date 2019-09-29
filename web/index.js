let db

let vpos = 0 // vertical position on grid
let itemsPerPage = 8 // max items to display per page
let page = 0 // page of results we are on
let pages = 0
let pending = []

function highlight(v) {
  document.body.children[vpos].style.background = 'rgba(0, 0, 0, 0.6)'
  document.body.children[v].style.backgroundColor = '#f54997'
  vpos = v
  localStorage.setItem("vpos", v)
}

function poll() {
  const v = pending
  pending = null
  return v
}

function up() {
  if (vpos === 0) {
    highlight(itemsPerPage - 1)
    return
  }
  highlight(vpos - 1)
}

function down() {
  if (vpos === itemsPerPage - 1) {
    highlight(0)
    return
  }
  highlight(vpos + 1)
}

function left() {
  if (page === 0) {
    page = pages - 1
    displayPage()
    return
  }
  page--
  displayPage()
}

function right() {
  if (page === pages - 1) {
    page = 0
    displayPage()
    return
  }
  page++
  displayPage()
}

function select() {
  const index = (page * itemsPerPage) + vpos
  pending = db[index]
}

function displayPage() {
  for (let i = 0; i < itemsPerPage; i++) {
    const index = (page * itemsPerPage) + i
    const div = document.body.children[i]
    const spTitle = div.children[0]
    const spSubTitle = div.children[1]
    const thumb = div.children[2]
    const spDesc = div.children[3]
    const spChannel = div.children[4]
    const spCategory = div.children[5]
    const spTags = div.children[6]
    const spBroadcast = div.children[7]
    const spDuration = div.children[8]
    if (index > db.length -1) {
      spTitle.innerText = ''
      spSubTitle.innerText = ''
      thumb.style.display = 'none'
      spDesc.innerText = ''
      spCategory.innerText = ''
      spChannel.innerText = ''
      spTags.innerText = ''
      spBroadcast.innerText = ''
      spDuration.innerText = ''
    } else {
      const { name, size, path, brand, duration, tags, category, channel, description, episode, broadcast, title, type, thumbnail } = db[index]
      if (episode) {
        spTitle.innerText = `${name}`
        spSubTitle.innerText = `${episode}`
      } else {
        spTitle.innerText = `${title}`
        spSubTitle.innerText = ''
      }
      if (thumbnail) {
        thumb.src = thumbnail
        thumb.style.display = 'block'
      } else {
        thumb.src = ''
        thumb.style.display = 'none'
      }
      if (description) {
        spDesc.innerText = description
      } else {
        spDesc.innerText = ''
      }
      if (category) {
        spCategory.innerText = category
      } else {
        spCategory.innerText = ''
      }
      if (channel) {
        spChannel.innerText = channel
      } else {
        spChannel.innerText = ''
      }
      if (tags) {
        spTags.innerText = tags
      } else {
        spTags.innerText = ''
      }
      if (broadcast) {
        spBroadcast.innerText = broadcast
      } else {
        spBroadcast.innerText = ''
      }
      if (duration) {
        spDuration.innerText = `${Math.ceil(duration / 60)} min`
      } else {
        spDuration.innerText = ''
      }
    }
  }
  const spPage = document.body.children[itemsPerPage]
  spPage.innerText = `${page + 1} / ${pages}`
  localStorage.setItem("page", page)
}

function setupScreen() {
  document.body.innerHTML = ""
  const itemHeight = Math.floor((window.innerHeight - 64) / itemsPerPage) - 8
  let top = 64
  for (let i = 0; i < itemsPerPage; i++) {
    const div = document.createElement('div')
    div.style.color = 'white'
    div.style.position = 'absolute'
    div.style.left = '16px'
    div.style.right = '16px'
    div.style.top = `${top}px`
    div.style.height = `${itemHeight}px`
    div.style.background = 'rgba(0, 0, 0, 0.6)'
    div.style.textOverflow = 'ellipsis'
    div.style.overflow = 'hidden'
    div.style.whiteSpace = 'nowrap'
    document.body.appendChild(div)

    const spTitle = document.createElement('span')
    spTitle.style.position = 'absolute'
    spTitle.style.left = '200px'
    spTitle.style.top = '8px'
    spTitle.style.fontSize = '36px'
    spTitle.style.textOverflow = 'ellipsis'
    spTitle.style.overflow = 'hidden'
    spTitle.style.whiteSpace = 'nowrap'
    spTitle.id = 'spTitle'
    div.appendChild(spTitle)

    const spSubTitle = document.createElement('span')
    spSubTitle.style.position = 'absolute'
    spSubTitle.style.left = '200px'
    spSubTitle.style.top = '44px'
    spSubTitle.style.color = 'yellow'
    spSubTitle.style.width = '792px'
    spSubTitle.style.fontSize = '32px'
    spSubTitle.style.textOverflow = 'ellipsis'
    spSubTitle.style.overflow = 'hidden'
    spSubTitle.style.whiteSpace = 'nowrap'
    div.appendChild(spSubTitle)

    const thumb = document.createElement('img')
    thumb.style.position = 'absolute'
    thumb.style.left = '8px'
    thumb.style.top = '8px'
    thumb.style.width = '184px'
    thumb.style.height = `${itemHeight - 16}px`
    div.appendChild(thumb)

    const spDesc = document.createElement('span')
    spDesc.style.position = 'absolute'
    spDesc.style.display = 'block'
    spDesc.style.whiteSpace = 'normal'
    spDesc.style.wordWrap = 'break-word'
    spDesc.style.left = '1000px'
    spDesc.style.top = '44px'
    spDesc.style.right = '8px'
    spDesc.style.bottom = '8px'
    spDesc.style.fontSize = '24px'
    spDesc.style.textAlign = 'right'
    div.appendChild(spDesc)

    const spChannel = document.createElement('span')
    spChannel.style.position = 'absolute'
    spChannel.style.right = '8px'
    spChannel.style.width = '180px'
    spChannel.style.top = '8px'
    spChannel.style.fontSize = '24px'
    spChannel.style.textAlign = 'right'
    div.appendChild(spChannel)

    const spCategory = document.createElement('span')
    spCategory.style.position = 'absolute'
    spCategory.style.right = '188px'
    spCategory.style.width = '180px'
    spCategory.style.top = '8px'
    spCategory.style.fontSize = '24px'
    spCategory.style.textAlign = 'right'
    div.appendChild(spCategory)

    const spTags = document.createElement('span')
    spTags.style.position = 'absolute'
    spTags.style.left = '200px'
    spTags.style.top = '82px'
    spTags.style.fontSize = '20px'
    spTags.style.textAlign = 'left'
    div.appendChild(spTags)

    const spBroadcast = document.createElement('span')
    spBroadcast.style.position = 'absolute'
    spBroadcast.style.right = '360px'
    spBroadcast.style.width = '180px'
    spBroadcast.style.top = '8px'
    spBroadcast.style.fontSize = '24px'
    spBroadcast.style.textAlign = 'right'
    div.appendChild(spBroadcast)

    const spDuration = document.createElement('span')
    spDuration.style.position = 'absolute'
    spDuration.style.right = '600px'
    spDuration.style.width = '180px'
    spDuration.style.top = '8px'
    spDuration.style.fontSize = '24px'
    spDuration.style.textAlign = 'right'
    div.appendChild(spDuration)

    top += itemHeight + 8
  }
  const spPage = document.createElement('div')
  spPage.style.position = 'absolute'
  spPage.style.right = '16px'
  spPage.style.top = '8px'
  spPage.style.fontSize = '32px'
  spPage.style.textAlign = 'right'
  spPage.style.color = 'white'
  //spPage.style.background = 'rgba(0, 0, 0, 0.6)'
  document.body.appendChild(spPage)
}

function sortList(a, b) {
  if (a.title.toLowerCase() < b.title.toLowerCase()) return -1
  if (a.title.toLowerCase() > b.title.toLowerCase()) return 1
  return 0
}

function loadProgrammes(json) {
  db = json
  vpos = parseInt(localStorage.getItem("vpos") || 0, 10)
  page = parseInt(localStorage.getItem("page") || 0, 10)
  pages = Math.ceil(db.length / itemsPerPage)
  db.sort(sortList)
  setupScreen()
  displayPage()
  highlight(vpos)
}

function loadJSON(file, callback) {
  var rawFile = new XMLHttpRequest();
  rawFile.overrideMimeType("application/json");
  rawFile.open("GET", file, true);
  rawFile.onreadystatechange = function() {
    if (rawFile.readyState === 4 && (rawFile.status === 0 || rawFile.status === 200)) {
      callback(JSON.parse(rawFile.responseText));
    }
  }
  rawFile.send(null);
}

let backgrounds = ['universe.jpg', 'nasa.jpg', 'sunrise.jpg', 'milky-way.jpg', 'milky-way2.jpg']
let currentBackground = 0

function changeBackground() {
  if (currentBackground == backgrounds.length - 1) {
    currentBackground = 0
  }
  document.body.style.backgroundImage = `url('${backgrounds[currentBackground++]}')`
}

//setInterval(() => changeBackground(), 10000)

const load = () => loadJSON("bbc.json", json => loadProgrammes(json))
