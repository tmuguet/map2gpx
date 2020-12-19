**[Map2gpx](../README.md)**

> [Globals](../README.md) / "Map2gpx"

# Module: "Map2gpx"

Map2gpx

Usage sample:
```html
<div id="map"></div>
<div id="chart"></div>
```
```javascript
var map = L.map('map', {
center: L.latLng(44.96777356135154, 6.06822967529297),
zoom: 13,
zoomControl: false,
});
var visibleLayers = {
'Thunderforest OpenCycleMap': L.tileLayer(
'https://tile.thunderforest.com/cycle/{z}/{x}/{y}{r}.png?apikey=bcecc6dc7a9a46cca6d1eff04dd595cf',
{
maxZoom: 18,
attribution:
'Maps © <a href="http://www.thunderforest.com">Thunderforest</a>, Data © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
}
),
};
var visibleOverlays = {};
var hiddenLayers = {
'Thunderforest Outdoors': L.tileLayer(
'https://tile.thunderforest.com/outdoors/{z}/{x}/{y}{r}.png?apikey=bcecc6dc7a9a46cca6d1eff04dd595cf',
{
maxZoom: 18,
attribution:
'Maps © <a href="http://www.thunderforest.com">Thunderforest</a>, Data © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
}
),
OpenTopoMap: L.tileLayer('https://a.tile.opentopomap.org/{z}/{x}/{y}.png', {
attribution:
'Map data: &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors | Map display: &copy; <a href="http://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
}),
'Hike & Bike': new L.TileLayer('http://{s}.tiles.wmflabs.org/hikebike/{z}/{x}/{y}.png', {
maxZoom: 17,
attribution: 'Map Data: © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}),
};
var hiddenOverlays = {
HillShading: new L.TileLayer('http://{s}.tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png', {
maxZoom: 17,
attribution: 'Hillshading: SRTM3 v2 (<a href="http://www2.jpl.nasa.gov/srtm/">NASA</a>)',
}),
};
Map2gpx.controls.addLayers(map, visibleLayers, visibleOverlays, hiddenLayers, hiddenOverlays, 'native');

var drawRoute = Map2gpx.controls.addTrackDrawer(
map,
L.TrackStats.mapquest('<key>', map),
new L.Control.Geocoder.Nominatim()
);
Map2gpx.controls.addZoom(map);
Map2gpx.controls.addTrackDrawerToolbar(map, drawRoute);
Map2gpx.controls.addTrackDrawerTracebar(map, drawRoute, {
routerAuto: L.Routing.graphHopper('<key>', {
urlParameters: {
vehicle: 'foot',
},
}),
});
Map2gpx.controls.addMinimap(map, L.tileLayer('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'));
Map2gpx.controls.addChart($('#chart'), map, drawRoute, {
showTerrainSlope: false,
});
```

## Index

### Namespaces

* [Controls](_map2gpx_.controls.md)

### Classes

* [GeoportailProvider](../classes/_map2gpx_.geoportailprovider.md)

### Interfaces

* [GeoportailProviderOptions](../interfaces/_map2gpx_.geoportailprovideroptions.md)

### Functions

* [geoportailProvider](_map2gpx_.md#geoportailprovider)

## Functions

### geoportailProvider

▸ **geoportailProvider**(`apiKey`: string, `options?`: [GeoportailProviderOptions](../interfaces/_map2gpx_.geoportailprovideroptions.md)): [GeoportailProvider](../classes/_map2gpx_.geoportailprovider.md)

#### Parameters:

Name | Type |
------ | ------ |
`apiKey` | string |
`options?` | [GeoportailProviderOptions](../interfaces/_map2gpx_.geoportailprovideroptions.md) |

**Returns:** [GeoportailProvider](../classes/_map2gpx_.geoportailprovider.md)
