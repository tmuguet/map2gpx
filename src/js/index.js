import { version } from '../../package.json';

require('./chart');
require('./progress');
require('./jquery.shepherd');
require('./jquery.querystring');
require('./jquery.localstorage');
require('./view');

const ImportButton = require('./ImportButton');
const ExportButton = require('./ExportButton');
const GeoportailProvider = require('./leaflet-geosearch-geoportail');
const controls = require('./controls');

const Map2gpx = {
  ImportButton,
  ExportButton,
  GeoportailProvider,
  controls,
  getVersion() {
    return version;
  },
};

module.exports = Map2gpx;
