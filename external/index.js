(function () {

  "use strict";

  var emptyImage = "/empty.png"

  var $scope = {
      filters: {
          music: true,
          drama: true,
          factual: true
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
              applyFilters()
          },
          addWidgets() {
            let sp
              var _window = this
              var widgets = document.getElementById("widgets")

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

              var btnClose = this.btnClose = document.createElement("a")
              btnClose.className = "btn btn-lg kwlButton btnClose"
              btnClose.onclick = function () {
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
              var logo, name, episode, duration, anchor

              anchor = item.anchor = document.createElement('a')
              anchor.href = '#'
              logo = item.logo = document.createElement("img")
              logo.loading = 'lazy'
              logo.className = "logo"
              anchor.appendChild(logo)
              item.appendChild(anchor)

              name = item.name = document.createElement("div")
              name.className = "name"
              item.appendChild(name)

              episode = item.episode = document.createElement("div")
              episode.className = "episode"
              item.appendChild(episode)

              duration = item.duration = document.createElement("div")
              duration.className = "duration"
              item.appendChild(duration)

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
                  $scope.programmes.forEach(function(programme) {
                      var item = programmeList.itemHash[programme.pid]
                      item.style.top = top
                      item.style.display = "block"
                      top += $config.ui.itemHeight
                  })
              }
              else {
                  this.items = []
                  numItems = $scope.programmes.length
                  top = 0
                  silver = true
                  next = 0
                  while (numItems--) {
                      item = document.createElement("div")
                      item.className = "listItem"
                      item.style.height = $config.ui.itemHeight
                      silver = !silver
                      item.style.top = top
                      item.clear = function() {
                          this.style.display = "none"
                      }
                      item.update = function(programme) {
                          if(this.style.display === "none") this.style.display = "block"
                          programmeList.itemHash[programme.pid] = item
                          this.logo.src = programme.thumbnail
                          this.anchor.onclick = () => playVideo(programme.path)
                          this.name.innerText = programme.name
                          this.episode.innerText = programme.episode
                          this.duration.innerText = `${Math.ceil(programme.duration / 60)} m`
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
      applyFilters()
      return programmes
  }

  function applyFilters() {
      $scope.programmes = $scope._programmes.filter(function(programme) {
          const { tags } = programme
          return tags.some(tag => $scope.filters[tag])
      })
  }

  function displayList() {
    controller.programmeList = createProgrammeList()
    controller.programmeList.display()
    controller.programmeList.show()
  }

  function playVideo (path) {
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
    player.play()
  }

  function bootstrap() {
      controller.window.display()
      getProgrammes()
          .then(createList)
          .then(displayList)
          .catch(function(err) {
              console.error(err)
          })
  }
  
  $(document).ready(bootstrap)

} ())
