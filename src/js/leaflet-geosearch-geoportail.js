import L from 'leaflet';
import Gp from 'geoportal-extensions-leaflet';

export const GeoportailProvider = L.Class.extend({
  options: {},

  initialize(apiKey, options) {
    this._apiKey = apiKey;
    L.Util.setOptions(this, options);
  },

  geocode(query, cb, context) {
    const options = {
      text: query,
      filterOptions: { type: ['StreetAddress', 'PositionOfInterest'] },
      apiKey: this._apiKey,
      onSuccess: (results) => {
        const data = results.suggestedLocations.map((r) => ({
          center: L.latLng(r.position.y, r.position.x),
          name: r.fullText,
          bbox: L.latLngBounds(L.latLng(r.position.y, r.position.x), L.latLng(r.position.y, r.position.x)),
        }));
        cb.call(context, data);
      },
      onFailure: () => {
        cb.call(context, []);
      },
    };
    Gp.Services.autoComplete(options);
  },

  suggest(query, cb, context) {
    return this.geocode(query, cb, context);
  },

  reverse(location, _scale, cb, context) {
    const options = {
      position: { x: location.lng, y: location.lat },
      filterOptions: { type: ['StreetAddress', 'PositionOfInterest'] },
      apiKey: this._apiKey,
      onSuccess: (results) => {
        const data = results.suggestedLocations.map((r) => ({
          center: L.latLng(r.position.y, r.position.x),
          name: r.fullText,
          bbox: L.latLngBounds(L.latLng(r.position.y, r.position.x), L.latLng(r.position.y, r.position.x)),
        }));
        cb.call(context, data);
      },
      onFailure: () => {
        cb.call(context, []);
      },
    };
    Gp.Services.reverseGeocode(options);
  },
});

export function geoportailProvider(apiKey, options) {
  return new GeoportailProvider(apiKey, options);
}
