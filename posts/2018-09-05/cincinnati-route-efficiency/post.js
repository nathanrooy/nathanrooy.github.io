// base layer examples: https://leaflet-extras.github.io/leaflet-providers/preview/
// set osm layer
// const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
// 	maxZoom: 19,
// 	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
// }).addTo(map);


// base map: Stadia.AlidadeSmooth
const tiles_default = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.{ext}', {
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	ext: 'png'
});

// base map: Google
const tiles_satellite =  L.tileLayer('https://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}', {
	attribution: '&copy; Google',
	maxZoom: 20
});

// geojson style helper function
const style = (feature) => {
	if (feature.properties.type == 'crow_path') {
		return {
			color: "#00FF00",
			weight: 3,
			fillOpacity: 1
		}
	}
	else {
		return {
			color: "#FF0000",
			weight: 3,
			fillOpacity: 1
		}
	}
};

// geojson info box
const infoBox = (feature, layer) => {
	const infoHTML = `<p style="font-size:1.5rem; margin-top:0.5rem; margin-bottom:0.5rem;">ratio: <b>${feature.properties.ratio}x</b></p><hr style="margin-top:0rem; margin-bottom:0.5rem;">crow distance: <b style="color:green">${feature.properties.crow_dist}</b> (feet)</br> walk distance: <b style="color:red">${feature.properties.walk_dist}</b> (miles)`;
	layer.bindPopup(infoHTML);

	// optional info display for hover events
	// layer.on('mouseover', function(e) {
	// 	if (map.getZoom() < 15) {
	// 		this.openPopup();
	// 	}
	// });
	// layer.on('mouseout', function(e) {
	// 	if (map.getZoom() < 15) {
	// 		this.closePopup();
	// 	}
	// })
};

// geojson linestring layer
const routes = L.geoJSON(gjson, {
	style:style,
});

// construct polygon layer for tooltip hover
const routePolygons = [];
for (const feature of gjson.features) {
	if (feature.properties.type == 'walk_path') {
		routePolygons.push(
			{
				"type": "Feature",
				"properties": {
					"crow_dist": (feature.properties.crow_dist * 3.28084).toFixed(2), 			// convert meters to feet
					"walk_dist": (feature.properties.walk_dist * 3.28084 / 5280).toFixed(2), 	// convert meters to miles
					"ratio": (feature.properties.walk_dist / feature.properties.crow_dist).toFixed(2)
				},
				"geometry": {
					"type": "Polygon",
					"coordinates": [feature.geometry.coordinates]
				}
			}
		)
	}
};

// geojson polygon layer
const routesPoly = L.geoJSON(routePolygons, {
	onEachFeature: infoBox,
	style: {"fillOpacity":0, "weight":0},
});

// establish leaflet map
const map = L.map('map', {
	center: [39.18, -84.49],
	zoom: 11,
	minZoom: 10,
	maxBounds: L.latLngBounds(L.latLng(38.89851, -84.96276), L.latLng(39.40012, -84.05639)),
	layers: [routes, routesPoly, tiles_satellite]
});

// fit map to current screen size
map.fitBounds(routesPoly.getBounds());

// add basemap layer selection to map
const layerControl = L.control.layers({
	"Default": tiles_default,
	"Satellite": tiles_satellite
}).addTo(map);

// add fullscreen control
map.addControl(new L.Control.Fullscreen());
