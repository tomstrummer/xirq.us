self = {} unless self?
@xirqus = self
self.map_symbols = {}
self.feed_markers = []
self.socket = io.connect(window.location.protocol + "//" + window.location.host)

self.socket.on "post", (data) ->
  console.log "post!"
  list = $("#feedWindow .feed")
  list.html ""  if data.length > 1
  lastItem = null
  data.forEach (json, i) -> # iterate over list of posts
    json = JSON.parse(json)
#    console.log json
    listItem = $(ich.feedItem(json))
    if i is 0
      list.prepend listItem
    else
      lastItem.after listItem
    lastItem = listItem
    
    # parse links for embed.ly, only the first link per post
    links = listItem.find("p a").first()
#    console.log("embedly links", links)
    return unless links.length
    
    $.embedly.oembed(links.attr("href")).progress((data) ->
#      console.log "Embedly data!", data
      preview = listItem.find(".preview").first()
      data.thumbnail_url = data.url  if data.type is "photo" and not data.thumbnail_url
      data.preview = "<img class='thumbnail' src='#{data.thumbnail_url}' 
                      title='#{data.title}' />" if data.thumbnail_url
      preview.html ich.embedPreview(data)
      $(links).on "click", (evt) ->
        evt.preventDefault()
        preview.toggle()
        preview.find("img.thumbnail").first().css "max-width", preview.innerWidth()

    ).done (results) ->


self.socket.on "test", (d) ->
  console.log "Socket test!", d


self.send_post = (evt) ->
  evt.preventDefault()
  msg = $("#postBox").val()
  self.socket.emit "post",
    body: msg
    feed_id: self.current_place_id

  $("#postBox").val ""
  console.log "Sent", self.current_place_id, msg


self.show_feed = (place) ->
  dialog = $("#feedWindow").modal()
  dialog.find(".title").text place.name
  dialog.one "hide", (e) ->
    console.log "Unsubscribe from", place.place_id
    self.socket.emit "unsub",
      place_id: place.place_id


  $("#feedWindow .feed").html "<li>loading...</li>" #clear the old list
  self.current_place_id = place.place_id
  self.socket.emit "sub",
    place_id: place.place_id
    uid: self.user.name # this gets the 20 most recent items

  console.log "subscribing to", place.place_id


self.init = ->
  console.log "Init!"
  $("#nav_email").text self.user.name
  self.map = new google.maps.Map($("#map")[0],
    center: self.get_last_location()
    scrollwheel: false
    styles: self.mapStyles
    zoom: self.get_last_zoom()
    mapTypeId: google.maps.MapTypeId.ROADMAP
  )
  self.places = new google.maps.places.PlacesService(self.map)
  google.maps.event.addListener self.map, "dragend", self.map_center_changed
  google.maps.event.addListenerOnce self.map, "tilesloaded", self.map_center_changed
  google.maps.event.addListener self.map, "zoom_changed", self.map_zoom_changed
  google.maps.event.addListener self.map, "click", (evt) ->
    setTimeout self.map_clicked, 300, self.map.zoom, evt

  $(window).on "resize orientationChanged", self.adjust_map_bounds
  self.adjust_map_bounds()
  $("#my_location").on "click", self.get_my_location
  $("#search").on "submit", self.location_search
  $("#postForm").on "submit", self.send_post
  

self.map_clicked = (zoom, evt) ->
  unless self.map.zoom is zoom
    console.log "double click!!"
    return # double-clicked!
  self.map_window.close()  if self.map_window
  self.map_window = new google.maps.InfoWindow(
    position: evt.latLng
    content: $("#searchWindow")[0]
  )
  self.map_window.open self.map
  $("#searchWindow .searching").show()
  self.places.nearbySearch
    location: evt.latLng
    radius: 200
  , self.places_result
  $("#places").show()


self.places_result = (places, stat) ->
  $("#searchWindow .searching").hide()
  resultList = $("#seachResultList")
  resultList.text ""
  resultCodes = google.maps.places.PlacesServiceStatus
  unless stat is resultCodes.OK
    console.log "Places search error!", stat, places
    if stat is resultCodes.ZERO_RESULTS
      resultList.append ich.searchResultItem(
        icon: "about:blank"
        name: "No results found"
      )
    return
  
  #		console.log(places)
  console.log "Places search results:"
  for i of places
    place = places[i]
#    console.log place
    item = ich.searchResultItem(place)
    item.on "click", self.choose_place.curry(place)
    resultList.append item
    break if i > 6
  self.map_window.setContent $("#searchWindow")[0]

self.choose_place = (place, evt) ->
  console.log "Place clicked:", place
  evt.preventDefault()
  loc = place.geometry.location
  $.ajax "/place",
    type: "post"
    dataType: "json"
    contentType: "application/json"
    processData: false
    data: JSON.stringify(
      place_id: place.id
      name: place.name
      loc: [loc.lat(), loc.lng()]
    )
    success: (data, stat, xhr) ->
      console.log "response:", stat, data
      self.map.panTo loc


# TODO drop pin
self.location_search = (evt) ->
  evt.preventDefault()
  $("#searchWindow .searching").show()
  self.places.nearbySearch
    location: self.map_window.position
    name: $("#searchBox").val()
    radius: 200
  , self.places_result


self.map_center_changed = ->
  center = self.map.center
  localStorage["last_loc.lat"] = center.lat()
  localStorage["last_loc.lng"] = center.lng()
  
  # search for active feeds
  b = self.map.getBounds()
  $.ajax "/place",
    data:
      lat1: b.getNorthEast().lat()
      lng1: b.getNorthEast().lng()
      lat2: b.getSouthWest().lat()
      lng2: b.getSouthWest().lng()

    success: (data, stat, xhr) ->
      # clear old markers
      while( item = self.feed_markers.shift() )
        item.setMap null
#      console.log "Places", data
      self.active_places_result data


self.active_places_result = (places) ->
  places.forEach (p, i) ->
#    console.log p, i
    marker = new google.maps.Marker(
      title: p.name
      map: self.map
      position: new google.maps.LatLng(p.loc[0], p.loc[1])
    )
    google.maps.event.addListener marker, "click", self.show_feed.curry(p)
    self.feed_markers.push marker


self.get_last_location = ->
  if localStorage["last_loc.lat"]
    loc = [localStorage["last_loc.lat"], localStorage["last_loc.lng"]]
  else
    loc = [41.817, 288.59]
  new google.maps.LatLng(loc[0], loc[1])

self.map_zoom_changed = ->
  localStorage["last_loc.z"] = self.map.zoom

self.get_last_zoom = ->
  parseInt(localStorage["last_loc.z"]) or 8


self.get_my_location = ->
  if typeof (navigator.geolocation) is "undefined"
    console.warn "No location"
    return

  # TODO don't show my location link
  navigator.geolocation.getCurrentPosition ((pos) ->
    console.debug "location callback!", pos
    position = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude)
    localStorage["last_loc.lat"] = position.lat()
    localStorage["last_loc.lng"] = position.lng()

    if pos.coords.accuracy # draw accuracy circle:
      unless @myLocAccuracy
        @myLocAccuracy = new google.maps.Circle(
          map: self.map
          center: position
          radius: pos.coords.accuracy
          strokeColor: "#0081c6"
          strokeOpacity: 0.8
          strokeWeight: 2
          fillColor: "#0081c6"
          fillOpacity: 0.35
        )
      else
        @myLocAccuracy.setCenter position
        @myLocAccuracy.setRadius pos.coords.accuracy

    unless @myLocMarker # draw marker
      @myLocMarker = new google.maps.Marker(
        position: position
        map: self.map
        icon: new google.maps.MarkerImage("/img/my-loc.png",
          new google.maps.Size(19, 19),
          new google.maps.Point(0, 0),
          new google.maps.Point(10, 10))
        animation: google.maps.Animation.DROP
        title: "Me!"
      )
    else
      @myLocMarker.setPosition position
    self.map.panTo position
    console.debug "location done."
  ),
  (err) ->
    console.log "location error! Code: " + err.code
    # TODO show error message

  console.debug "Asking for location..."

self.adjust_map_bounds = ->
  map = $("#map")
  map.height window.innerHeight - 40
  map.width = $(document.body).width()

self.get_location = ->
  if typeof (navigator.geolocation) is "undefined"
    console.warn "No location"
    return

  navigator.geolocation.getCurrentPosition ((pos) ->
    console.debug "location callback!", pos
    position = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude)
    localStorage["last_loc.lat"] = position.lat()
    localStorage["last_loc.lng"] = position.lng()
    symbols = self.map_symbols

    if pos.coords.accuracy # draw accuracy circle:
      unless symbols.myLocAccuracy
        symbols.myLocAccuracy = new google.maps.Circle(
          map: self.map
          center: position
          radius: pos.coords.accuracy
          strokeColor: "#0081c6"
          strokeOpacity: 0.8
          strokeWeight: 2
          fillColor: "#0081c6"
          fillOpacity: 0.35
        )
      else
        symbols.myLocAccuracy.setCenter position
        symbols.myLocAccuracy.setRadius pos.coords.accuracy

    unless symbols.myLocMarker
      symbols.myLocMarker = new google.maps.Marker(
        position: position
        map: symbols.map
        icon: new google.maps.MarkerImage("/static/img/my-loc.png",
          new google.maps.Size(19, 19),
          new google.maps.Point(0, 0),
          new google.maps.Point(10, 10))
        animation: google.maps.Animation.DROP
        title: "My location" )

    else
      symbols.myLocMarker.setPosition position
      
    self.map.panTo position
    console.debug "location done."

  ), (err) ->
    console.log "location error! Code: " + err.code
    app.showMsg "msg_location_err"

  console.debug "Asking for location..."

self.mapStyles = [
  { featureType: "all", stylers: [ saturation: 50 ] },
  { featureType: 'administrative', stylers: [] },
  { featureType: 'all', elementType: 'labels' },
  { featureType: "road", stylers: [
      { hue: "#00ffee" },
      { lightness: 10 },
      { saturation: -80 }
    ]
  },
  { featureType: "water", stylers: [
      { saturation: -70 },
      { lightness: -50 }
    ]
  },
  { featureType: 'poi', stylers: [
      { saturation: -50 }
    ]
  }
]
