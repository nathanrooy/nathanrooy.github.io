var year_index = {
	7 : '1898',
    6 : '1886',
    5 : '1877',
    4 : '1867',
    3 : '1853',
	2 : '1840',
    1 : '1819',
	0 : '1815',
};

$(document).ready(function () {

    // initialize starting value for map year
	var year_output = document.getElementById("selected_year");
	year_output.innerHTML = year_index[7];

    var map = L.map('map').setView([39.0973, -84.5134], 15);
    map.addControl(new L.Control.Fullscreen());

    var hash = new L.Hash(map);

    // load openstreetmap base layer for left pane
  	var osmLayer = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		minZoom: 11,
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  	}).addTo(map);

    // load second openstreetmap base layer for right pane
    var osmLayer2 = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		minZoom: 11,
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  	}).addTo(map);

    // load georeferenced raster map
    var new_raster = L.tileLayer('https://georeferenced-cincinnati-maps.s3.us-east-2.amazonaws.com/1898/{z}/{x}/{y}.png', {
        minZoom: 11,
        maxZoom: 18,
        tms: true,
    }).addTo(map);

    var sideBySide = L.control.sideBySide([], []).addTo(map);
    sideBySide.setLeftLayers([new_raster]);
    sideBySide.setRightLayers([osmLayer]);

    // date slider
	$("#date_slider").slider({
		value: 7,
		orientation: "vertical",
		min: 0,
		max: 7,
		step: 1,
		
		start: function (event, ui) {
		    console.log('start');
		},
		
        stop: function (event, ui) {
            console.log('stopped')
        },
        
		slide: function (event, ui) {

			// update year display
			var year = year_index[ui.value];
			year_output.innerHTML = year;

			// update position of date div
			year_output.style.bottom = Math.round((ui.value / 7) * 200) + 'px';
            
            // remove all layers except osm layer
            map.eachLayer(function(layer){
                console.log(layer._leaflet_id)
                if (layer._leaflet_id != osmLayer2._leaflet_id){
                    map.removeLayer(layer);
               };
            })
            
            // create and add new layer
			new_raster = L.tileLayer('https://georeferenced-cincinnati-maps.s3.us-east-2.amazonaws.com/'+year+'/{z}/{x}/{y}.png', {
				minZoom: 11,
				maxZoom: 18,
				tms: true,
			});
            
			map.addLayer(new_raster);
            sideBySide.setLeftLayers([new_raster]);
		}
	});
	
	$('#date_slider').mousedown(function(){
		map.dragging.disable();
	});

	$('#date_slider').mouseup(function(){
		map.dragging.enable();
	});
});