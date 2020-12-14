import { version } from '../../package.json';

import './leaflet.vincenty';
import './chart';
import './progress';
import './jquery.shepherd';
import './jquery.querystring';
import './jquery.localstorage';
import './view';

import '../css/map2gpx.css';
import '../css/theme.css';

import { GeoportailProvider, geoportailProvider } from './leaflet-geosearch-geoportail';
import controls from './controls';
import { i18n } from './i18n';

const Map2gpx = {
  GeoportailProvider,
  geoportailProvider,
  controls,
  getVersion() {
    return version;
  },
  i18n,
};

export default Map2gpx;
