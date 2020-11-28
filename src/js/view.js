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

  async initView(track, provider) {
    if ('theme' in $.QueryString) {
      $('body').addClass(`theme-${$.QueryString.theme}`);
    } else {
      $('body').addClass('theme-white');
    }

    const view = $.localStorage.getAsJSON('view') || [44.96777356135154, 6.06822967529297, 13];
    let hasSetView = false;

    if (view[2] > 17) view[2] = 17;

    if ('lat' in $.QueryString && 'lng' in $.QueryString) {
      this.setView([$.QueryString.lat, $.QueryString.lng], 15);
      hasSetView = true;
    } else if ('loc' in $.QueryString) {
      try {
        const results = await this._geocode(provider, $.QueryString.loc);
        if (results && results.length > 0) {
          this.setView(results[0].center, 15);
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
        this.fitBounds(track.getBounds(), { padding: [20, 20] });
        hasSetView = true;
      } catch (e) {
        console.log(e.message);
      }
    }

    if (!hasSetView) this.setView([view[0], view[1]], view[2]);

    this._bindViewEvents(); // Bind events when we're done, so we don't store parameters from query string
  },
});
