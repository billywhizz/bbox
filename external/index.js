(function () {

  "use strict";

  let db = {}
  const version = 3
  const state = {
    filters: {
      music: true,
      drama: true,
      factual: true,
      star: false
    },
    stars: {},
    pages: {},  
    current: 0,
    programmes: {},
    sync: false
  }

  const sleep = ms => new Promise(ok => setTimeout(ok, ms))

  function openAsync (name) {
    return new Promise((ok, fail) => {
      const request = indexedDB.open(name, version)
      request.onerror = fail
      request.onsuccess = event => {
        const db = request.result
        db.onversionchange = function () {
          db.close()
          alert("Database is outdated, please reload the page.")
        }
        ok(request.result)
      }
      request.onupgradeneeded = event => {
        const db = request.result
        const { oldVersion } = event
        if (oldVersion === 0) {
          // initialise a database
        }
        if (!db.objectStoreNames.contains('programmes')) {
          db.createObjectStore('programmes', { keyPath: 'page' })
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'name' })
        }
      }
    })
  }

  function getAsync (os, key) {
    return new Promise((ok, fail) => {
      const request = os.get(key)
      request.onerror = fail
      request.onsuccess = event => {
        ok(event.target.result)
      }
    })
  }

  function putAsync (os, value) {
    return new Promise((ok, fail) => {
      const request = os.put(value)
      request.onerror = fail
      request.onsuccess = event => {
        ok(event.target.result)
      }
    })
  }

  async function getUsageAsync () {
    let quota = {}
    if (navigator.storage && navigator.storage.estimate) {
      quota = await navigator.storage.estimate();
    }
    return quota
  }

  async function getPage (page) {
    let os = db.transaction(["programmes"], "readonly").objectStore('programmes')
    let result = await getAsync(os, page)
    if (result) {
      state.pages[page] = result.programmes
    }
    return state.pages[page]
  }

  async function savePage (page) {
    let os = db.transaction(["programmes"], "readwrite").objectStore('programmes')
    await putAsync(os, { page, programmes: state.pages[page] })
    return state.pages[page]
  }

  async function getFilters () {
    let os = db.transaction(["settings"], "readonly").objectStore('settings')
    let result = await getAsync(os, 'filters')
    if (result) {
      state.filters = result.filters
    }
    return state.filters
  }

  async function saveFilters () {
    let os = db.transaction(["settings"], "readwrite").objectStore('settings')
    await putAsync(os, { name: 'filters', filters: state.filters })
    return state.filters
  }

  async function getStars () {
    let os = db.transaction(["settings"], "readonly").objectStore('settings')
    let result = await getAsync(os, 'stars')
    if (result) {
      state.stars = result.stars
    }
    return state.stars
  }

  async function saveStars () {
    let os = db.transaction(["settings"], "readwrite").objectStore('settings')
    await putAsync(os, { name: 'stars', stars: state.stars })
    return state.stars
  }

  async function getCurrent () {
    let os = db.transaction(["settings"], "readonly").objectStore('settings')
    let current = await getAsync(os, 'current')
    if (current) {
      state.current = current.value
    }
    return state.current
  }

  async function saveCurrent () {
    let os = db.transaction(["settings"], "readwrite").objectStore('settings')
    await putAsync(os, { name: 'current', value: state.current })
    return state.current
  }

  async function fetchPage (page) {
    const res = await fetch(`/bbc.${page}.json`)
    const text = await res.text()
    return JSON.parse(text)
  }

  function playVideo (path, play = true) {
    player.src = `${window.location.origin}/play${path}`
    player.style.width = '100%'
    player.style.bottom = '8px'
    player.style.display = 'block'
    player.style.visibility = 'visible'
    player.style.zIndex = 1000
    btnClose.style.display = 'block'
    if (play) player.play()
  }

  function showDetail(programme) {
    const detail = document.getElementById('detail')
    detail.style.display = 'block'
    detail.style.visibility = 'visible'
    detail.style.zIndex = 1000
    const name = detail.getElementsByClassName('detailName')[0]
    const episode = detail.getElementsByClassName('detailEpisode')[0]
    const desc = detail.getElementsByClassName('detailDesc')[0]
    const descLong = detail.getElementsByClassName('detailDescLong')[0]
    const thumb = detail.getElementsByClassName('detailThumb')[0]
    const duration = detail.getElementsByClassName('detailDuration')[0]
    const image = thumb.children[0]
    name.innerText = programme.name
    episode.innerText = programme.episode
    desc.innerText = programme.description
    image.src = programme.thumbnail
    duration.innerText = `${Math.ceil(programme.duration / 60)} m`
    descLong.innerText = programme.longDescription
    if (programme.notfound) {
      btnClose.style.display = 'block'
    } else {
      playVideo(programme.path, false)
    }
  }

  function loadPage (pageNum, parent, start = 0, end = 1000) {
    const page = state.pages[pageNum]
    for (let index = start; index < end; index++) {
      const item = document.createElement("div")
      item.className = "listItem"
      item.style.height = '70px'
      const logo = document.createElement("img")
      logo.loading = 'lazy'
      logo.className = "logo"
      logo.width = '124'
      logo.height = '70'
      item.appendChild(logo)
      const name = document.createElement("div")
      name.className = "name"
      item.appendChild(name)
      const episode = document.createElement("div")
      episode.className = "episode"
      item.appendChild(episode)
      const duration = document.createElement("div")
      duration.className = "duration"
      item.appendChild(duration)
      const btnStar = document.createElement("a")
      btnStar.className = "btn btn-lg btnStarSmall"
      let sp = document.createElement("span")
      sp.className = "glyphicon glyphicon-star"
      btnStar.appendChild(sp)
      item.appendChild(btnStar)
      const btnDetail = document.createElement("a")
      btnDetail.className = "btn btn-lg btnDetailSmall"
      sp = document.createElement("span")
      sp.className = "glyphicon glyphicon-list-alt"
      btnDetail.onclick = () => showDetail(item.programme)
      btnDetail.appendChild(sp)
      item.appendChild(btnDetail)
      item.hide = () => item.style.display = 'none'
      item.show = () => item.style.display = 'block'
      item.update = programme => {
        item.programme = programme
        name.innerText = programme.name
        logo.src = programme.thumbnail
        if (programme.episode) {
          name.innerText = `${programme.name}: ${programme.episode}`
        } else {
          name.innerText = programme.name
        }
        duration.innerText = `${Math.ceil(programme.duration / 60)} m`
        if (programme.notfound) {
          item.style.backgroundColor = 'silver'
        } else {
          item.style.backgroundColor = '#222222'
        }
        programme.star = state.stars[programme.pid] || false
        if (programme.star) {
          btnStar.style.color = '#f54997'
        } else {
          btnStar.style.color = 'white'
        }
        btnStar.onclick = async () => {
          await starProgramme(programme)
          if (programme.star) {
            btnStar.style.color = '#f54997'
          } else {
            btnStar.style.color = 'white'
            applyFilters()
          }
        }
      }
      if (isVisible(page[index])) {
        item.show()
      } else {
        item.hide()
      }
      parent.appendChild(item)
      item.update(page[index])
    }
    applyFilters()
    displayFilters()
  }

  async function starProgramme (programme) {
    if (programme.star) {
      delete state.stars[programme.pid]
      programme.star = false
    } else {
      state.stars[programme.pid] = true
      programme.star = true
    }
    await saveStars()
  }

  async function sync () {
    state.sync = true
    const pl = document.getElementById('programmeList')
    let start = 0
    let end = 100
    let current = await getCurrent()
    let page = await getPage(current)
    if (!page) {
      try {
        page = await fetchPage(current)
        state.pages[current] = page
        await savePage(current)
      } catch (err) {
        console.log(`page not found: ${current}... rescheduling sync`)
        setTimeout(sync, 1000)
        return
      }
    }
    let nextPage = current
    while (state.sync) {
      loadPage(nextPage, pl, start, end)
      start += 100
      end += 100
      if (end > page.length) {
        end = page.length
      }
      if (start > page.length) {
        if (page.length < 1000) {
          console.log(`end of sync: ${nextPage}`)
          break
        }
        nextPage++
        page = await getPage(nextPage)
        if (!page) {
          try {
            page = await fetchPage(nextPage)
          } catch (err) {
            console.log('page not found')
            break
          }
          state.pages[nextPage] = page
          await savePage(nextPage)
        }
        start = 0
        end = 100
      }
      await sleep(100)
    }
  }

  function isVisible (programme) {
    const { filters } = state
    if (filters.star && !state.stars[programme.pid]) {
      return false
    }
    if (!programme.tags.some(tag => {
      if (tag === 'documentaries') tag = 'factual'
      if (tag === 'films') tag = 'drama'
      if (tag === 'comedy') tag = 'drama'
      if (tag === 'sport') tag = 'drama'
      if (tag === 'news') tag = 'factual'
      if (tag === 'entertainment') tag = 'drama'
      if (tag === 'entertainment & comedy') tag = 'drama'
      if (tag === 'get_iplayer') tag = 'drama'
      if (tag === 'sitcoms') tag = 'drama'
      if (tag === 'spoof') tag = 'drama'
      if (tag === 'learning') tag = 'factual'
      return filters[tag]
    })) {
      return false
    }
    return true
  }

  function applyFilters () {
    const pl = document.getElementById('programmeList')
    let count = pl.children.length
    let visible = 0
    for (let i = 0; i < count; i++) {
      const item = pl.children[i]
      const { programme } = item
      if (isVisible(programme)) {
        item.show()
        visible++
      } else {
        item.hide()
      }
    }
    divCount.innerText = visible
  }

  function displayFilters () {
    if (state.filters.drama) {
      btnDrama.classList.add('btnDramaOn')
    } else {
      btnDrama.classList.remove('btnDramaOn')
    }
    if (state.filters.factual) {
      btnFactual.classList.add('btnFactualOn')
    } else {
      btnFactual.classList.remove('btnFactualOn')
    }
    if (state.filters.music) {
      btnMusic.classList.add('btnMusicOn')
    } else {
      btnMusic.classList.remove('btnMusicOn')
    }
    if (state.filters.star) {
      btnStar.classList.add('btnStarOn')
    } else {
      btnStar.classList.remove('btnStarOn')
    }
  }

  function toggleFilter (name) {
    state.filters[name] = !state.filters[name]
    applyFilters()
    displayFilters()
    saveFilters().catch(err => console.error(err))
  }

  async function bootstrap () {
    db = await openAsync('bbox')
    await getFilters()
    await getStars()
    btnDrama.onclick = () => toggleFilter('drama')
    btnFactual.onclick = () => toggleFilter('factual')
    btnMusic.onclick = () => toggleFilter('music')
    btnStar.onclick = () => toggleFilter('star')
    btnClose.onclick = () => {
      detail.style.display = 'none'
      player.src = ''
      player.style.display = 'none'
      player.style.visibility = 'hidden'
      btnClose.style.display = 'none'
    }
    sync().catch(err => console.error(err))
  }

  window.onload = () => bootstrap().catch(err => console.error(err))

} ())
