var xirqus = (function() {
	exports = {}
	exports.map_symbols = {}

	exports.init = function() {
		xirqus.map = new google.maps.Map( $("#map")[0], {
			center: xirqus.get_last_location(),
			scrollwheel : false,
			zoom: xirqus.get_last_zoom(),
			mapTypeId: google.maps.MapTypeId.ROADMAP
		})
		xirqus.places = new google.maps.places.PlacesService(xirqus.map)

		google.maps.event.addListener( xirqus.map,'center_changed',
			xirqus.map_center_changed)
		google.maps.event.addListener( xirqus.map,'zoom_changed',
			xirqus.map_zoom_changed )
		google.maps.event.addListener( xirqus.map,'click',function(evt){
			setTimeout(xirqus.map_clicked, 300, xirqus.map.zoom, evt)
		})

		$(window).on('resize orientationChanged', xirqus.adjust_map_bounds)
		xirqus.adjust_map_bounds()

		$('#my_location').on('click',xirqus.get_my_location)
		$('#search').on('submit',xirqus.location_search)

		if ( ! localStorage ) localStorage = {}
	}

	exports.map_clicked = function(zoom,evt) {
		if ( xirqus.map.zoom != zoom ) {
			console.log('double click!!')
			return // double-clicked!
		}
		if ( xirqus.map_window ) xirqus.map_window.close()

		xirqus.map_window = new google.maps.InfoWindow({
			position : evt.latLng,
			content : $('#searchWindow')[0]
		})
		xirqus.map_window.open(xirqus.map)

		$('#searchWindow .searching').show()

		xirqus.places.nearbySearch(
				{ location : evt.latLng, 
					radius: 200 }, 
				xirqus.places_result )

		$('#places').show()
	}

	exports.places_result = function(places,stat) {
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

		for ( i in places ) {
			var place = places[i]
			console.log( place )
			resultList.append( ich.searchResultItem( place ) )
			if ( i > 6 ) break
		}
		xirqus.map_window.setContent($('#searchWindow')[0])
	}

	exports.location_search = function(evt) {
		evt.preventDefault()
		$('#searchWindow .searching').show()

		xirqus.places.nearbySearch(
			{ location : xirqus.map_window.position, 
				name : $('#searchBox').val(),
				radius: 200 }, 
			xirqus.places_result )
	}

	exports.map_center_changed = function() {
		center = xirqus.map.center
		localStorage['last_loc.lat'] = center.lat()
		localStorage['last_loc.lng'] = center.lng()
	}

	exports.get_last_location = function() {
		if( localStorage['last_loc.lat'] ) {
			var loc = [ 
				localStorage['last_loc.lat'],
				localStorage['last_loc.lng'] ]
		}
		else var loc = [41.817, 288.59]

		return new google.maps.LatLng(loc[0],loc[1])
	}

	exports.map_zoom_changed = function() {
		localStorage['last_loc.z'] = xirqus.map.zoom
	}

	exports.get_last_zoom = function() {
		return parseInt(localStorage['last_loc.z']) || 8
	}

	exports.get_my_location = function() {
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
								map: xirqus.map,
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
						map: xirqus.map, 
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

				xirqus.map.panTo(position)

				console.debug('location done.')
			}, 

			function(err) {
				console.log('location error! Code: ' + err.code)
				app.showMsg('msg_location_err')
			})

		console.debug('Asking for location...')
	}

	exports.adjust_map_bounds = function() {
		var map = $('#map')
		map.height( map.height() - 50 + 
				(window.innerHeight - $(document.body).height()) )
		map.width = $(document.body).width()
	}

	exports.get_location = function() {
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

				var symbols = xirqus.map_symbols 
				if ( pos.coords.accuracy ) { // draw accuracy circle:
					if ( ! symbols.myLocAccuracy ) {
						symbols.myLocAccuracy = new google.maps.Circle({
								map: xirqus.map,
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

				xirqus.map.panTo(position)

				console.debug('location done.')
			}, 
			function(err) {
				console.log('location error! Code: ' + err.code)
				app.showMsg('msg_location_err')
			})
		console.debug('Asking for location...')
	}

	return exports
})()
