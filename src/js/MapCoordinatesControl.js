import L from 'leaflet';
import { i18n } from './i18n';

export const MapCoordinatesButton = L.Control.EasyButton.extend({
  options: { },

  initialize(options) {
    L.Util.setOptions(this, options);

    const opts = {
      states: [
        {
          icon: 'fa-location-arrow',
          title: i18n.coordinates,
          onClick: () => {
            L.popup({ autoPan: false })
              .setLatLng(this._map.getCenter())
              .setContent(`${i18n.coordinates}: ${this._map.getCenter()}<br/>${i18n.zoomLevel}: ${this._map.getZoom()}`)
              .openOn(this._map);
          },
        },
      ],
    };

    L.Control.EasyButton.prototype.initialize.call(this, opts);
  },
});

export function mapCoordinatesButton(options) {
  return new MapCoordinatesButton(options);
}
