const { version } = require('../../package.json');

require('./leflet.vincenty');
require('./chart');
require('./progress');
require('./jquery.shepherd');
require('./jquery.querystring');
require('./jquery.localstorage');
require('./view');

const { GeoportailProvider, geoportailProvider } = require('./leaflet-geosearch-geoportail');
const { controls } = require('./controls');
const i18n = require('./i18n');

const Map2gpx = {
  GeoportailProvider,
  geoportailProvider,
  controls,
  getVersion() {
    return version;
  },
  i18n,
};

module.exports = Map2gpx;
