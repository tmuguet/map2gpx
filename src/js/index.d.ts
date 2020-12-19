import * as Geocoder from 'leaflet-control-geocoder';
import * as L from 'leaflet';
import * as TrackStats from 'leaflet-trackstats';
import * as EasyButton from 'leaflet-easybutton';
/**
   * Map2gpx
   *
   * Usage sample:
   * ```html
<div id="map"></div>
<div id="chart"></div>
```
   * ```javascript
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
   */
declare module 'Map2gpx' {
  interface GeoportailProviderOptions {}

  /**
   * Geocoder for Leaflet Control Geocoder using Geoportail data
   */
  class GeoportailProvider implements Geocoder.IGeocoder {
    /**
     * Creates a new instance.
     *
     * @param apiKey Geoportail API key
     * @param options Options
     */
    constructor(apiKey: string, options?: GeoportailProviderOptions);
  }
  function geoportailProvider(apiKey: string, options?: GeoportailProviderOptions): GeoportailProvider;

  module Controls {
    interface Layers {
      [Key: string]: L.Layer;
    }
    enum LayerSwitcherType {
      'native',
      'geoportail',
      'none',
    }

    function addLayers(
      map: L.Map,
      visibleBaseLayers: Layers,
      visibleOverlays: Layers,
      hiddenBaseLayers: Layers,
      hiddenOverlays: Layers,
      controlType: LayerSwitcherType,
    ): L.Control;

    interface ZoomOptions extends L.Control.ZoomOptions {
      zoomInTitle?: string;
      zoomOutTitle?: string;
    }
    function addZoom(map: L.Map, options?: ZoomOptions): L.Control;

    function addScale(map: L.Map, options?: L.Control.ScaleOptions): L.Control;

    function addGeocoder(map: L.Map, options?: Geocoder.GeocoderControlOptions): L.Control;

    function addTrackDrawer(map: L.Map, fetcher: L.TrackStats.IFetcher, geocoder: Geocoder.IGeocoder): L.TrackDrawer;

    interface ImportButtonOptions extends EasyButtonOptions {}
    function addImportButton(map: L.Map, track: L.TrackDrawer, options?: ImportButtonOptions): L.Control;
    interface ExportButtonOptions extends EasyButtonOptions {}
    function addExportButton(map: L.Map, track: L.TrackDrawer, options?: ExportButtonOptions): L.Control;
    interface ImportExportButtonsOptions {
      optionsImport?: ImportButtonOptions;
      optionsExport?: ExportButtonOptions;
    }
    function addImportExportButtons(map: L.Map, track: L.TrackDrawer, options?: ImportExportButtonsOptions): L.Control;

    interface MapCoordinatesOptions extends EasyButtonOptions {}
    function addMapCoordinatesButton(map: L.Map, options?: MapCoordinatesOptions): L.Control;

    function addTrackDrawerToolbar(map: L.Map, track: L.TrackDrawer, options?: L.TrackDrawer.ToolBarOptions): L.Control;
    interface TraceModeBarOptions extends L.TrackDrawer.TraceModeBarOptions {
      routerAuto: L.Routing.IRouter;
    }
    function addTrackDrawerTracebar(
      map: L.Map,
      track: L.TrackDrawer,
      options?: L.TrackDrawer.TraceModeBarOptions,
    ): L.Control;

    function addMinimap(map: L.Map, layer: L.Layer, options?: MinimapOptions): L.Control;
    interface InfoToolbarOptions {
      aboutDialog: string;
      position: L.ControlPosition;
    }
    function addInfoToolbar(map: L.Map, options?: MinimapOptions): L.Control;
    interface ChartOptions {}
    function addChart(item: string, map: L.Map, track: L.TrackDrawer, options?: ChartOptions): null;
    function addTour(track: L.TrackDrawer): null;
  }
}
