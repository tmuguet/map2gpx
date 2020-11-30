import { version } from '../../package.json';

require('./leflet.vincenty');
require('./chart');
require('./progress');
require('./jquery.shepherd');
require('./jquery.querystring');
require('./jquery.localstorage');
require('./view');

const { GeoportailProvider, geoportailProvider } = require('./leaflet-geosearch-geoportail');
const { controls } = require('./controls');

const Map2gpx = {
  GeoportailProvider,
  geoportailProvider,
  controls,
  getVersion() {
    return version;
  },
};

module.exports = Map2gpx;
