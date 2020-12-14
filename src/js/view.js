import $ from 'jquery';
import L from 'leaflet';
import { i18n } from './i18n';

L.Map.include({
  _bindViewEvents() {
    this.on('zoomend', () => {
      $.localStorage.set('view', [this.getCenter().lat, this.getCenter().lng, this.getZoom()]);
    });

    this.on('moveend', () => {
      $.localStorage.setAsJSON('view', [this.getCenter().lat, this.getCenter().lng, this.getZoom()]);
    });
  },

  _geocode(provider, query) {
    return new Promise((resolve) => {
      provider.geocode(query, (results) => {
        resolve(results);
      });
    });
  },

  shouldShowControls() {
    if ('controls' in $.QueryString) {
      return $.QueryString.controls === 'true';
    }
    return true;
  },

  async initView(track, geocoder, options) {
    const opts = $.extend({}, {
      defaultView: [44.96777356135154, 6.06822967529297, 13],
      maxZoom: 17,
      geocoderZoom: 15,
      theme: 'white',
      boundsPadding: [20, 20],
    }, options);

    if ('theme' in $.QueryString) {
      $('body').addClass(`theme-${$.QueryString.theme}`);
    } else {
      $('body').addClass(`theme-${opts.theme}`);
    }

    const view = $.localStorage.getAsJSON('view') || opts.defaultView;
    let hasSetView = false;

    // FIXME Dirty hack to avoid too much zoom
    if (view[2] > opts.maxZoom) view[2] = opts.maxZoom;

    if ('lat' in $.QueryString && 'lng' in $.QueryString) {
      this.setView([$.QueryString.lat, $.QueryString.lng], opts.geocoderZoom);
      hasSetView = true;
    } else if ('loc' in $.QueryString) {
      try {
        const results = await this._geocode(geocoder, $.QueryString.loc);
        if (results && results.length > 0) {
          this.setView(results[0].center, opts.geocoderZoom);
          hasSetView = true;
        } else {
          throw new Error(`${i18n.noResult}`);
        }
      } catch (e) {
        $(`<div id="map2gpx_errordialog" title="${i18n.error}">${i18n.error}: ${e.message}</div>`).dialog({
          appendTo: 'body',
          classes: {
            'ui-dialog': 'map2gpx',
          },
          dialogClass: 'alert',
          draggable: false,
          modal: true,
          buttons: {
            Ok() {
              $(this).dialog('close');
            },
          },
          close() { $('#map2gpx_errordialog').dialog('destroy'); },
        });
      }
    } else if ('url' in $.QueryString) {
      try {
        let editable = true;
        if ('editable' in $.QueryString) {
          editable = $.QueryString.editable === 'true';
        }

        this._imported = true; // FIXME Dirty hack to avoid tour to show up
        await track.loadUrl($.QueryString.url, true, editable);
        this.fitBounds(track.getBounds(), { padding: opts.boundsPadding });
        hasSetView = true;
      } catch (e) {
        $(`<div id="map2gpx_errordialog" title="${i18n.error}">${i18n.error}: ${e.message}</div>`).dialog({
          appendTo: 'body',
          classes: {
            'ui-dialog': 'map2gpx',
          },
          dialogClass: 'alert',
          draggable: false,
          modal: true,
          buttons: {
            Ok() {
              $(this).dialog('close');
            },
          },
          close() { $('#map2gpx_errordialog').dialog('destroy'); },
        });
      }
    }

    if (!hasSetView) this.setView([view[0], view[1]], view[2]);

    this._bindViewEvents(); // Bind events when we're done, so we don't store parameters from query string
  },
});
