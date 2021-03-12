console.log('v0.0.1')

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

var opacity_value = 100;

$(document).ready(function () {
	
	// initialize starting values for opacity and map year
	var year_output = document.getElementById("selected_year");
	year_output.innerHTML = year_index[7];

	var opacity_output = document.getElementById("selected_opacity");
	opacity_output.innerHTML = '100%';

	var map = L.map('map').setView([39.102, -84.515], 14);
	map.addControl(new L.Control.Fullscreen());

	// Assuming your map instance is in a variable called map
	var hash = new L.Hash(map);
	
	// load openstreetmaps base layer
  	var baselayer = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		minZoom: 11,
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  	}).addTo(map);
	
	var baselayer_id = baselayer._leaflet_id;
    console.log('> baselayer_id=',baselayer_id);
    
	var new_raster = L.tileLayer('https://georeferenced-cincinnati-maps.s3.us-east-2.amazonaws.com/1898/{z}/{x}/{y}.png', {
		minZoom: 11,
		maxZoom: 18,
		tms: true,
  	}).addTo(map);
	
	// opacity slider
	$("#opacity_slider_").slider({
		//animate: true,
		value: 1,
		orientation: "vertical",
		min: 0,
		max: 1,
		step: 0.05,
		slide: function (event, ui) {
			new_raster.setOpacity(ui.value);
			opacity_value = ui.value;

			// update value of opacity display
			opacity_output.innerHTML = Math.floor(100 * opacity_value) + '%';

			// update position of opacity value
			opacity_output.style.bottom = opacity_value * 100 + 'px';
		}
	});

	$('#opacity_slider_').mousedown(function(){
		map.dragging.disable();
	});

	$('#opacity_slider_').mouseup(function(){
		map.dragging.enable();
	});
    
	// date slider
	$("#date_slider").slider({
		//animate: true,
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
            
            // remove all layers except base layer
            map.eachLayer(function(layer){
                if (layer._leaflet_id != baselayer_id){
                    map.removeLayer(layer);
               };
            })
            
            // create and add new layer
			new_raster = L.tileLayer('https://georeferenced-cincinnati-maps.s3.us-east-2.amazonaws.com/'+year+'/{z}/{x}/{y}.png', {
				minZoom: 11,
				maxZoom: 18,
				tms: true,
			});

			new_raster.setOpacity(opacity_value);
			map.addLayer(new_raster);
		}
	});
	
	$('#date_slider').mousedown(function(){
		map.dragging.disable();
	});

	$('#date_slider').mouseup(function(){
		map.dragging.enable();
	});

});
