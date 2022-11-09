describe('Init', () => {
  let map;

  beforeEach(() => {
    map = L.map('map', {
      center: L.latLng(44.96777356135154, 6.06822967529297),
      zoom: 13,
    });
  });

  afterEach(async () => {
    sinon.restore();
    await map.removeAsPromise();
  });

  it('constructor should correctly initialize structures', () => {
    Map2gpx.i18n.set('fr');

    expect(Map2gpx.i18n.error).to.be.equal('Une erreur est survenue');

    const visibleLayers = {
      'Thunderforest OpenCycleMap': L.tileLayer(
        'https://tile.thunderforest.com/cycle/{z}/{x}/{y}{r}.png?apikey=bcecc6dc7a9a46cca6d1eff04dd595cf',
        {
          maxZoom: 18,
          attribution:
            // eslint-disable-next-line max-len
            'Maps © <a href="http://www.thunderforest.com">Thunderforest</a>, Data © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        },
      ),
    };
    const visibleOverlays = {};
    const hiddenLayers = {
      'Thunderforest Outdoors': L.tileLayer(
        'https://tile.thunderforest.com/outdoors/{z}/{x}/{y}{r}.png?apikey=bcecc6dc7a9a46cca6d1eff04dd595cf',
        {
          maxZoom: 18,
          attribution:
            // eslint-disable-next-line max-len
            'Maps © <a href="http://www.thunderforest.com">Thunderforest</a>, Data © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        },
      ),
      OpenTopoMap: L.tileLayer('https://a.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution:
          // eslint-disable-next-line max-len
          'Map data: &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors | Map display: &copy; <a href="http://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
      }),
      'Hike & Bike': new L.TileLayer('http://{s}.tiles.wmflabs.org/hikebike/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map Data: © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }),
    };
    const hiddenOverlays = {
      HillShading: new L.TileLayer('http://{s}.tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Hillshading: SRTM3 v2 (<a href="http://www2.jpl.nasa.gov/srtm/">NASA</a>)',
      }),
    };
    const layerswitcher = Map2gpx.controls.addLayers(
      map, visibleLayers, visibleOverlays, hiddenLayers, hiddenOverlays, 'native',
    );
    expect(layerswitcher).instanceOf(L.Control.Layers);

    const drawRoute = Map2gpx.controls.addTrackDrawer(
      map,
      L.TrackStats.openElevation(map),
      new L.Control.Geocoder.Nominatim(),
    );

    Map2gpx.controls.addZoom(map);
    Map2gpx.controls.addScale(map);
    Map2gpx.controls.addGeocoder(map);
    Map2gpx.controls.addImportExportButtons(map, drawRoute);
    Map2gpx.controls.addTrackDrawerToolbar(map, drawRoute, { mode: 'add' });
    Map2gpx.controls.addTrackDrawerTracebar(map, drawRoute, {
      routerAuto: L.Routing.graphHopper('29aa5bd4-23a6-489e-9bd0-67f8c9207d77', {
        urlParameters: {
          vehicle: 'foot',
        },
      }),
    });
    Map2gpx.controls.addMinimap(map, L.tileLayer('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'));
    Map2gpx.controls.addMapCoordinatesButton(map);
    Map2gpx.controls.addInfoToolbar(map);

    Map2gpx.controls.addChart($('#chart'), map, drawRoute, {
      showTerrainSlope: false,
    });

    const f = sinon.fake();
    sinon.replace(drawRoute, 'addNode', f);
    happen.click($('#map')[0]);

    expect(f.callCount).to.be.equal(1);
  });
});
