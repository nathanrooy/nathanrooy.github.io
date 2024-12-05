var southWest = L.latLng(-80.25, -99.75),
    northEast = L.latLng(80.25, 99.75),
    bounds = L.latLngBounds(southWest, northEast);
var map = L.map('map').setView([0, 0], 3);
map.addControl(new L.Control.Fullscreen());

//map.setMaxBounds(map.getBounds());
map.setMaxBounds(bounds);
//map.fitBounds(group.getBounds());

var mytile =L.tileLayer('https://s3.amazonaws.com/movie-poster-tsne/iv3_avgpool_90292_tsnemc_plx30_manhattan_iter50000_lr10_rf90000_300x300_SUPER_TILE_2/tiles/{z}/{x}/{y}.jpg', {
maxBoundsViscosity:1,
maxZoom: 9,
minZoom: 2,
noWrap:true,
tms: true,
}).addTo(map);

console.log(map.getBounds().getSouthWest().toString());
console.log(map.getBounds().getNorthEast().toString());
console.log(map.getCenter());
console.log(map.getBounds().toString());