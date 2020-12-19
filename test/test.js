L.Map.include({
  loadAsPromise() {
    const _this = this;
    return $.Deferred(function load() {
      _this.on('load', () => this.resolve());
    });
  },

  removeAsPromise() {
    const _this = this;
    return $.Deferred(function remove() {
      _this.on('unload', () => this.resolve());
      _this.remove();
    });
  },
});

$('body').append('<div id="map" style="width: 100%; height: 300px;"></div>');
$('body').append('<div id="chart" style="width: 100%; height: 300px;"></div>');

/* eslint-disable */
const { assert, expect } = chai;
