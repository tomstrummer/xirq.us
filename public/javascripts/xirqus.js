var xirqus = (function() {
	exports = {}

	exports.init = function() {
		xirqus.map = new google.maps.Map( $("#map")[0], {
			center: xirqus.get_last_location(),
			scrollwheel : false,
			zoom: xirqus.get_last_zoom(),
			mapTypeId: google.maps.MapTypeId.ROADMAP
		})

		google.maps.event.addListener(xirqus.map,'center_changed',
			xirqus.map_center_changed)
		google.maps.event.addListener(xirqus.map,'zoom_changed',
			xirqus.map_zoom_changed)

		$(window).on('resize orientationChanged', xirqus.adjust_map_bounds)
		xirqus.adjust_map_bounds()

		$('#my_location').on('click',xirqus.get_my_location)

		if ( ! localStorage ) localStorage = {}
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
		return localStorage['last_loc.z'] || 8
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
			console.warn('No location');
			return;
		}
		navigator.geolocation.getCurrentPosition(function(pos) {
				console.debug('location callback!',pos);
				position = new google.maps.LatLng(
					pos.coords.latitude, 
					pos.coords.longitude);
				localStorage['last_loc.lat'] = position.lat();
				localStorage['last_loc.lng'] = position.lng();

				if ( pos.coords.accuracy ) { // draw accuracy circle:
					if ( ! page.myLocAccuracy ) {
						page.myLocAccuracy = new google.maps.Circle({
								map: page.map,
								center: position,
								radius: pos.coords.accuracy,
								strokeColor: "#0081c6",
								strokeOpacity: 0.8,
								strokeWeight: 2,
								fillColor: "#0081c6",
								fillOpacity: 0.35
							});
					}
					else {
						page.myLocAccuracy.setCenter(position);
						page.myLocAccuracy.setRadius(pos.coords.accuracy);
					}
				}
				if ( ! page.myLocMarker ) {
					page.myLocMarker = new google.maps.Marker({
						position: position, 
						map: page.map, 
						icon: new google.maps.MarkerImage(
							'/static/img/my-loc.png',
							new google.maps.Size(19,19),
							new google.maps.Point(0,0),
							new google.maps.Point(10,10)
							),
						animation: google.maps.Animation.DROP,
						title:"My location" });
				}
				else page.myLocMarker.setPosition(position);

				page.map.panTo(position);

				console.debug('location done.');
			}, 
			function(err) {
				console.log('location error! Code: ' + err.code);
				app.showMsg('msg_location_err');
			});
		console.debug('Asking for location...');
	};

	return exports
})()
