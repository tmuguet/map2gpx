const $ = require('jquery');
const L = require('leaflet');

L.Map.include({
  _bindViewEvents() {
    this.on('zoomend', () => {
      console.log('Zoomed to ', this.getZoom());
      $.localStorage.set('view', [this.getCenter().lat, this.getCenter().lng, this.getZoom()]);
    });

    this.on('moveend', () => {
      console.log('Moved to ', this.getCenter());
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
        }
      } catch (e) {
        console.log(e.message);
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
        console.log(e.message);
      }
    }

    if (!hasSetView) this.setView([view[0], view[1]], view[2]);

    this._bindViewEvents(); // Bind events when we're done, so we don't store parameters from query string
  },
});
