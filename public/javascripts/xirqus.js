var xirqus = (function() {
	var self = {}
	self.map_symbols = {}
	self.feed_markers = []
	self.socket = io.connect(window.location.protocol + "//" + window.location.host)

	self.socket.on('post', function(data) {
		console.log('post!')
		var list = $('#feedWindow .feed')

		data.forEach(function(item,i) {
			item = JSON.parse(item)
			console.log(item)
			var listItem = $(ich.feedItem(item))
			list.prepend(listItem)
			console.log(listItem.find('p a'))
			var item = listItem.find('p a').first()
			if ( ! item.length ) return
			console.log('embedly link',item)
			$.embedly.oembed(item.attr('href')).progress(function(data){
				console.log("Embedly data!",data);
				var preview = listItem.find('.preview').first()
				preview.html(ich.embedPreview(data))
				$(item).on('click',function(evt) {
					evt.preventDefault()
					preview.toggle()
				})
			}).done(function(results){})
		})
	})

	self.socket.on('test',function(d) {
		console.log('Socket test!',d)
	})

	self.send_post = function(evt) {
		evt.preventDefault()

		var msg = $('#postBox').val()
		self.socket.emit('post', {
			from : self.user.name,
			body : msg,
			feed_id : self.current_place_id 
		})

		$('#postBox').val('')
		console.log("Sent",self.current_place_id,msg) 
	}

	self.show_feed = function(place) {
		var dialog = $('#feedWindow').modal()
		dialog.on('hide', function(e) {
			console.log("Unsubscribe from",place.place_id)
			self.socket.emit('unsub',{place_id:place.place_id})
		})
		$('#feedWindow .feed').html('<li>loading...</li>') //clear the old list	
		self.current_place_id = place.place_id
		self.socket.emit('sub', {place_id:place.place_id}) // this gets the 20 most recent items
		console.log('subscribing to',place.place_id)
	}

	// TODO unsubscribe

	self.init = function() {
		console.log('Init!')
		$('#nav_email').text(self.user.name)

		self.map = new google.maps.Map( $("#map")[0], {
			center: self.get_last_location(),
			scrollwheel : false,
			zoom: self.get_last_zoom(),
			mapTypeId: google.maps.MapTypeId.ROADMAP
		})
		self.places = new google.maps.places.PlacesService(self.map)

		google.maps.event.addListener( self.map,'dragend',
			self.map_center_changed)
		google.maps.event.addListener( self.map,'zoom_changed',
			self.map_zoom_changed )
		google.maps.event.addListener( self.map, 'click', function(evt){
			setTimeout(self.map_clicked, 300, self.map.zoom, evt)
		})

		$(window).on('resize orientationChanged', self.adjust_map_bounds)
		self.adjust_map_bounds()

		$('#my_location').on('click',self.get_my_location)
		$('#search').on('submit',self.location_search)
		$('#postForm').on('submit',self.send_post)

		if ( ! localStorage ) localStorage = {}
	}
 
	self.map_clicked = function(zoom,evt) {
		if ( self.map.zoom != zoom ) {
			console.log('double click!!')
			return // double-clicked!
		}
		if ( self.map_window ) self.map_window.close()

		self.map_window = new google.maps.InfoWindow({
			position : evt.latLng,
			content : $('#searchWindow')[0]
		})
		self.map_window.open(self.map)

		$('#searchWindow .searching').show()

		self.places.nearbySearch(
				{ location : evt.latLng, 
					radius: 200 }, 
				self.places_result )

		$('#places').show()
	}

	self.places_result = function(places,stat) {
		$('#searchWindow .searching').hide()
		var resultList = $('#seachResultList')
		resultList.text("")

		var resultCodes = google.maps.places.PlacesServiceStatus;
		if (stat != resultCodes.OK) {
			console.log('Places search error!', stat, places)
			if ( stat == resultCodes.ZERO_RESULTS )
				resultList.append( ich.searchResultItem( { 
					icon : "about:blank", name:'No results found' } ) )
			return
		}
//		console.log(places)

		console.log('Places search results:')
		for ( i in places ) {
			var place = places[i]
			console.log( place )
			var item = ich.searchResultItem( place )
			item.on('click',self.choose_place.curry(place))
			resultList.append( item )
			if ( i > 6 ) break
		}
		self.map_window.setContent($('#searchWindow')[0])
	}

	self.choose_place = function(place,evt) {
		console.log("Place clicked:",place)
		evt.preventDefault()
		
		var loc = place.geometry.location
		$.ajax('/place', {
			type : "post",
			dataType: "json",
			contentType: "application/json",
			processData: false,
			data : JSON.stringify({ 
				place_id : place.id,
				name : place.name,
				loc : [loc.lat(), loc.lng()]
			}),
			success : function(data,stat,xhr) {
				console.log("response:",stat,data)
				self.map.panTo(loc)
				// TODO drop pin
			},
		})
	}

	self.location_search = function(evt) {
		evt.preventDefault()
		$('#searchWindow .searching').show()

		self.places.nearbySearch(
			{ location : self.map_window.position, 
				name : $('#searchBox').val(),
				radius: 200 }, 
			self.places_result )
	}

	self.map_center_changed = function() {
		var center = self.map.center
		localStorage['last_loc.lat'] = center.lat()
		localStorage['last_loc.lng'] = center.lng()

		// search for active feeds
		var b = self.map.getBounds()
		$.ajax('/place', {
			data : {lat1 : b.getNorthEast().lat(),
			        lng1 : b.getNorthEast().lng(),
							lat2 : b.getSouthWest().lat(),
							lng2 : b.getSouthWest().lng()},
			success : function(data,stat,xhr) {
				// clear old markers
				self.feed_markers.forEach(function(item,i) {
					item.setMap(null)
					self.feed_markers[i] = null
				})

				console.log("Places",data)
				self.active_places_result(data)
			}
		})
	}

	self.active_places_result = function(places) {
		places.forEach(function(p,i) {
			console.log(p,i)
			var marker = new  google.maps.Marker({
				title : p.name,
				map : self.map,
				position : new google.maps.LatLng(p.loc[0],p.loc[1]),
			})
			google.maps.event.addListener( marker, 'click', self.show_feed.curry(p))
			self.feed_markers.push(marker)
		})
	}

	self.get_last_location = function() {
		if( localStorage['last_loc.lat'] ) {
			var loc = [ 
				localStorage['last_loc.lat'],
				localStorage['last_loc.lng'] ]
		}
		else var loc = [41.817, 288.59]

		return new google.maps.LatLng(loc[0],loc[1])
	}

	self.map_zoom_changed = function() {
		localStorage['last_loc.z'] = self.map.zoom
	}

	self.get_last_zoom = function() {
		return parseInt(localStorage['last_loc.z']) || 8
	}

	self.get_my_location = function() {
		if (typeof(navigator.geolocation) == 'undefined') {
			console.warn('No location')
			return
		} // TODO don't show my location link

		navigator.geolocation.getCurrentPosition(function(pos) {
				console.debug('location callback!',pos);
				position = new google.maps.LatLng(
					pos.coords.latitude, 
					pos.coords.longitude)

				localStorage['last_loc.lat'] = position.lat()
				localStorage['last_loc.lng'] = position.lng()

				if ( pos.coords.accuracy ) { // draw accuracy circle:
					if ( ! this.myLocAccuracy ) {
						this.myLocAccuracy = new google.maps.Circle({
								map: self.map,
								center: position,
								radius: pos.coords.accuracy,
								strokeColor: "#0081c6",
								strokeOpacity: 0.8,
								strokeWeight: 2,
								fillColor: "#0081c6",
								fillOpacity: 0.35
							})
					}
					else {
						this.myLocAccuracy.setCenter(position)
						this.myLocAccuracy.setRadius(pos.coords.accuracy)
					}
				}

				if ( ! this.myLocMarker ) { // draw marker
					this.myLocMarker = new google.maps.Marker({
						position: position, 
						map: self.map, 
						icon: new google.maps.MarkerImage(
							'/img/my-loc.png',
							new google.maps.Size(19,19),
							new google.maps.Point(0,0),
							new google.maps.Point(10,10)
							),
						animation: google.maps.Animation.DROP,
						title:"Me!" })
				}
				else this.myLocMarker.setPosition(position)

				self.map.panTo(position)

				console.debug('location done.')
			}, 

			function(err) {
				console.log('location error! Code: ' + err.code)
				app.showMsg('msg_location_err')
			})

		console.debug('Asking for location...')
	}

	self.adjust_map_bounds = function() {
		var map = $('#map')
		map.height( map.height() - 50 + 
				(window.innerHeight - $(document.body).height()) )
		map.width = $(document.body).width()
	}

	self.get_location = function() {
		if (typeof(navigator.geolocation) == 'undefined') {
			console.warn('No location')
			return
		}
		navigator.geolocation.getCurrentPosition(function(pos) {
				console.debug('location callback!',pos)
				position = new google.maps.LatLng(
					pos.coords.latitude, 
					pos.coords.longitude);
				localStorage['last_loc.lat'] = position.lat()
				localStorage['last_loc.lng'] = position.lng()

				var symbols = self.map_symbols 
				if ( pos.coords.accuracy ) { // draw accuracy circle:
					if ( ! symbols.myLocAccuracy ) {
						symbols.myLocAccuracy = new google.maps.Circle({
								map: self.map,
								center: position,
								radius: pos.coords.accuracy,
								strokeColor: "#0081c6",
								strokeOpacity: 0.8,
								strokeWeight: 2,
								fillColor: "#0081c6",
								fillOpacity: 0.35
							})
					}
					else {
						symbols.myLocAccuracy.setCenter(position)
						symbols.myLocAccuracy.setRadius(pos.coords.accuracy)
					}
				}
				if ( ! symbols.myLocMarker ) {
					symbols.myLocMarker = new google.maps.Marker({
						position: position, 
						map: symbols.map, 
						icon: new google.maps.MarkerImage(
							'/static/img/my-loc.png',
							new google.maps.Size(19,19),
							new google.maps.Point(0,0),
							new google.maps.Point(10,10)
							),
						animation: google.maps.Animation.DROP,
						title:"My location" })
				}
				else symbols.myLocMarker.setPosition(position)

				self.map.panTo(position)

				console.debug('location done.')
			}, 
			function(err) {
				console.log('location error! Code: ' + err.code)
				app.showMsg('msg_location_err')
			})
		console.debug('Asking for location...')
	}

	return self
})()
