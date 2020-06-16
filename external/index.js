(function () {

  "use strict";

  var emptyImage = "/empty.png"

  var $scope = {
      filters: {
          music: true,
          drama: true,
          factual: true,
          star: false
      }
  }

  var $config = {
      api: {
          endpoint: ""
      },
      ui: {
          itemHeight: 70
      }
  }

  var controller = {
      window: {
          display: function() {
              $scope.width = window.innerWidth
              $scope.height = window.innerHeight
              this.addWidgets()
          },
          toggleFilters: function() {
              if($scope.filters.drama) {
                  this.btnDrama.className = "btn btn-lg kwlButton btnDrama btnDramaOn"
              }
              else {
                  this.btnDrama.className = "btn btn-lg kwlButton btnDrama"
              }
              if($scope.filters.music) {
                  this.btnMusic.className = "btn btn-lg kwlButton btnMusic btnMusicOn"
              }
              else {
                  this.btnMusic.className = "btn btn-lg kwlButton btnMusic"
              }
              if($scope.filters.factual) {
                  this.btnFactual.className = "btn btn-lg kwlButton btnFactual btnFactualOn"
              }
              else {
                  this.btnFactual.className = "btn btn-lg kwlButton btnFactual"
              }
              if($scope.filters.star) {
                  this.btnStar.className = "btn btn-lg kwlButton btnStar btnStarOn"
              }
              else {
                  this.btnStar.className = "btn btn-lg kwlButton btnStar"
              }
              localStorage.setItem('filters', JSON.stringify($scope.filters))
              applyFilters($scope.filters)
          },
          addWidgets() {
            let sp
              var _window = this
              var widgets = document.getElementById("widgets")
              var divCount = this.divCount = document.createElement("div")
              divCount.className = 'count'
              widgets.appendChild(divCount)

              var btnMusic = this.btnMusic = document.createElement("a")
              if($scope.filters.music) {
                  btnMusic.className = "btn btn-lg kwlButton btnMusic btnMusicOn"
              }
              else {
                  btnMusic.className = "btn btn-lg kwlButton btnMusic"
              }
              btnMusic.onclick = function () {
                  $scope.filters.music = !$scope.filters.music
                  _window.toggleFilters()
                  controller.programmeList.display()
              }
              sp = document.createElement("span")
              sp.className = "glyphicon glyphicon-music"
              btnMusic.appendChild(sp)
              widgets.appendChild(btnMusic)

              var btnDrama = this.btnDrama = document.createElement("a")
              if($scope.filters.drama) {
                btnDrama.className = "btn btn-lg kwlButton btnDrama btnDramaOn"
              }
              else {
                btnDrama.className = "btn btn-lg kwlButton btnDrama"
              }
              btnDrama.onclick = function () {
                  $scope.filters.drama = !$scope.filters.drama
                  _window.toggleFilters()                    
                  controller.programmeList.display()
              }
              sp = document.createElement("span")
              sp.className = "glyphicon glyphicon-film"
              btnDrama.appendChild(sp)
              widgets.appendChild(btnDrama)

              var btnFactual = this.btnFactual = document.createElement("a")
              if($scope.filters.factual) {
                btnFactual.className = "btn btn-lg kwlButton btnFactual btnFactualOn"
              }
              else {
                btnFactual.className = "btn btn-lg kwlButton btnFactual"
              }
              btnFactual.onclick = function () {
                  $scope.filters.factual = !$scope.filters.factual
                  _window.toggleFilters()                    
                  controller.programmeList.display()
              }
              sp = document.createElement("span")
              sp.className = "glyphicon glyphicon-globe"
              btnFactual.appendChild(sp)
              widgets.appendChild(btnFactual)

              var btnStar = this.btnStar = document.createElement("a")
              if($scope.filters.star) {
                btnStar.className = "btn btn-lg kwlButton btnStar btnStarOn"
              }
              else {
                btnStar.className = "btn btn-lg kwlButton btnStar"
              }
              btnStar.onclick = function () {
                  $scope.filters.star = !$scope.filters.star
                  _window.toggleFilters()                    
                  controller.programmeList.display()
              }
              sp = document.createElement("span")
              sp.className = "glyphicon glyphicon-star"
              btnStar.appendChild(sp)
              widgets.appendChild(btnStar)

              var btnClose = this.btnClose = document.createElement("a")
              btnClose.className = "btn btn-lg kwlButton btnClose"
              btnClose.onclick = function () {btnStar
                detail.style.display = 'none'
                player.src = ''
                player.style.display = 'none'
                player.style.visibility = 'hidden'
                btnClose.style.display = 'none'
              }
              sp = document.createElement("span")
              sp.className = "glyphicon glyphicon-remove"
              btnClose.appendChild(sp)
              widgets.appendChild(btnClose)
          }
      },
      programmeList: null
  }

  function showDetail(programme) {
    const detail = document.getElementById('detail')
    detail.style.display = 'block'
    detail.style.visibility = 'visible'
    detail.style.zIndex = 1000
    const name = detail.getElementsByClassName('detailName')[0]
    const episode = detail.getElementsByClassName('detailEpisode')[0]
    const desc = detail.getElementsByClassName('detailDesc')[0]
    const thumb = detail.getElementsByClassName('detailThumb')[0]
    const duration = detail.getElementsByClassName('detailDuration')[0]
    const image = thumb.children[0]
    name.innerText = programme.name
    episode.innerText = programme.episode
    desc.innerText = programme.description
    image.src = programme.thumbnail
    duration.innerText = `${Math.ceil(programme.duration / 60)} m`
    playVideo(programme.path, false)
  }

  function createProgrammeList() {
      var mainForm = document.getElementById("mainForm")
      var parent = document.createElement("div")
      parent.id = "programmeList"
      parent.className = "programmeList"
      mainForm.appendChild(parent)
      return {
          itemHash: {},
          hide: function() {
              parent.style.display = "none"
          },
          show: function() {
              parent.style.display = "block"
          },
          addItem: function(parent, item) {
              var logo, name, episode, duration, anchor, sp

              logo = item.logo = document.createElement("img")
              logo.loading = 'lazy'
              logo.className = "logo"
              logo.width = '124'
              logo.height = '70'
              item.appendChild(logo)

              name = item.name = document.createElement("div")
              name.className = "name"
              item.appendChild(name)

              episode = item.episode = document.createElement("div")
              episode.className = "episode"
              item.appendChild(episode)

              duration = item.duration = document.createElement("div")
              duration.className = "duration"
              item.appendChild(duration)

              var btnStar = item.btnStar = document.createElement("a")
              btnStar.className = "btn btn-lg btnStarSmall"
              sp = document.createElement("span")
              sp.className = "glyphicon glyphicon-star"
              btnStar.appendChild(sp)
              item.appendChild(btnStar)

              var btnDetail = item.btnDetail = document.createElement("a")
              btnDetail.className = "btn btn-lg btnDetailSmall"
              sp = document.createElement("span")
              sp.className = "glyphicon glyphicon-list-alt"
              btnDetail.appendChild(sp)
              item.appendChild(btnDetail)

              this.items.push(item)
              parent.appendChild(item)
          },
          display: function() {
              var numItems, top, item, silver, next
              var programmeList = this
              if(this.items) {
                  top = 0
                  silver = true
                  this.items.forEach(function(item) {
                      item.style.display = "none"
                  })
                  controller.window.divCount.innerText = $scope.programmes.length
                  const starred = JSON.parse(localStorage.getItem('/starred') || '{}')
                  $scope.programmes.forEach(function(programme) {
                      var item = programmeList.itemHash[programme.pid]
                      item.style.top = `${top}px`
                      if (starred[programme.pid]) {
                        item.btnStar.style.color = '#f54997'
                      } else {
                        item.btnStar.style.color = 'black'
                      }
                      item.style.display = "block"
                      top += $config.ui.itemHeight
                  })
              }
              else {
                  this.items = []
                  numItems = $scope.programmes.length
                  controller.window.divCount.innerText = $scope.programmes.length
                  top = 0
                  next = 0
                  while (numItems--) {
                      item = document.createElement("div")
                      item.className = "listItem"
                      item.style.height = $config.ui.itemHeight
                      item.style.top = `${top}px`
                      item.clear = function() {
                          this.style.display = "none"
                      }
                      item.update = function(programme) {
                          if(this.style.display === "none") this.style.display = "block"
                          programmeList.itemHash[programme.pid] = item
                          this.logo.src = programme.thumbnail
                          if (programme.episode) {
                            this.name.innerText = `${programme.name}: ${programme.episode}`
                          } else {
                            this.name.innerText = programme.name
                          }
                          this.duration.innerText = `${Math.ceil(programme.duration / 60)} m`
                          const starred = JSON.parse(localStorage.getItem('/starred') || '{}')
                          if (starred[programme.pid]) {
                            item.btnStar.style.color = '#f54997'
                          } else {
                            item.btnStar.style.color = 'black'
                          }
                          item.btnStar.onclick = () => {
                            const starred = JSON.parse(localStorage.getItem('/starred') || '{}')
                            starred[programme.pid] = !starred[programme.pid]
                            localStorage.setItem('/starred', JSON.stringify(starred))
                            controller.window.toggleFilters()                    
                            controller.programmeList.display()
                          }
                          item.btnDetail.onclick = () => {
                            showDetail(programme)
                          }
                      }
                      this.addItem(parent, item)
                      item.update($scope.programmes[next++])
                      top += $config.ui.itemHeight
                  }
                  if(parent.style.display !== "block") parent.style.display = "block"
              }
          }
      }
  }


  function apiGet(path) {
      return new Promise(function(ok, fail) {
          $.getJSON($config.api.endpoint + path)
              .done(function(result) {
                  ok(result)
              })
              .fail(fail)
      })
  }

  function getProgrammes() {
      return apiGet(`/bbc.json`)
  }

  function isMP4 (path) {
    return path.split('.').slice(-1)[0] === 'mp4'
  }

  function createList(programmes) {
      $scope._programmes = programmes.filter(v => isMP4(v.path))
      applyFilters({ drama: true, factual: true, music: true })
      return programmes
  }

  function applyFilters(filters) {
    const starred = JSON.parse(localStorage.getItem('/starred') || '{}')
    $scope.programmes = $scope._programmes.filter(function(programme) {
      if (filters.star && !starred[programme.pid]) return false
      return programme.tags.some(tag => filters[tag])
    })
  }

  function displayList() {
    controller.programmeList = createProgrammeList()
    controller.programmeList.display()
    controller.programmeList.show()
  }

  function playVideo (path, play = true) {
    player.src = `${window.location.origin}/play${path}`
    player.style.position = 'absolute'
    player.style.left = '0px'
    player.style.right = '0px'
    player.style.bottom = '0px'
    player.style.width = '100%'
    player.style.display = 'block'
    player.style.visibility = 'visible'
    player.style.maxHeight = '300px'
    player.style.zIndex = 1000
    controller.window.btnClose.style.display = 'block'
    if (play) player.play()
  }

  function bootstrap() {
      controller.window.display()
      try {
        $scope.filters = JSON.parse(localStorage.getItem('filters')) || $scope.filters
      } catch (err) {
        console.error('Filters Not Loaded')
      }
      if($scope.filters.drama) {
        controller.window.btnDrama.className = "btn btn-lg kwlButton btnDrama btnDramaOn"
      }
      else {
        controller.window.btnDrama.className = "btn btn-lg kwlButton btnDrama"
      }
      if($scope.filters.music) {
        controller.window.btnMusic.className = "btn btn-lg kwlButton btnMusic btnMusicOn"
      }
      else {
        controller.window.btnMusic.className = "btn btn-lg kwlButton btnMusic"
      }
      if($scope.filters.factual) {
        controller.window.btnFactual.className = "btn btn-lg kwlButton btnFactual btnFactualOn"
      }
      else {
        controller.window.btnFactual.className = "btn btn-lg kwlButton btnFactual"
      }
      if($scope.filters.star) {
        controller.window.btnStar.className = "btn btn-lg kwlButton btnStar btnStarOn"
      }
      else {
        controller.window.btnStar.className = "btn btn-lg kwlButton btnStar"
      }
      getProgrammes()
          .then(createList)
          .then(displayList)
          .catch(function(err) {
              console.error(err)
          })
  }
  
  window.onload = bootstrap
} ())
