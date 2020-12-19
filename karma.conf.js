module.exports = function (config) {
  config.set({
    frameworks: ['mocha', 'chai', 'sinon', 'happen'],
    plugins: [
      'karma-mocha',
      'karma-chai',
      'karma-sinon',
      'karma-happen',
      'karma-phantomjs-launcher',
      // 'karma-chrome-launcher',
      // 'karma-safari-launcher',
      'karma-firefox-launcher',
      'karma-coverage',
    ],

    files: [
      'node_modules/jquery/dist/jquery.min.js',
      'node_modules/jquery-ui-dist/jquery-ui.min.js',
      'node_modules/leaflet/dist/leaflet.js',
      'node_modules/leaflet-control-topcenter/dist/leaflet-control-topcenter.js',
      'node_modules/leaflet-minimap/dist/Control.MiniMap.min.js',
      'node_modules/leaflet-easybutton/src/easy-button.js',
      'node_modules/leaflet.awesome-markers/dist/leaflet.awesome-markers.min.js',
      'node_modules/leaflet-routing-machine/dist/leaflet-routing-machine.min.js',
      'node_modules/@tmcw/togeojson/dist/togeojson.umd.js',
      'node_modules/@mapbox/corslite/corslite.js',
      'node_modules/promise-queue/lib/index.js',
      'node_modules/leaflet-filelayer/src/leaflet.filelayer.js',
      'node_modules/lrm-graphhopper/dist/lrm-graphhopper.min.js',
      'node_modules/lrm-straightline/dist/lrm-straightline.min.js',
      'node_modules/leaflet-trackdrawer/dist/leaflet.trackdrawer.umd.js',
      'node_modules/leaflet-trackstats/dist/leaflet.trackstats.umd.js',
      'node_modules/chart.js/dist/Chart.min.js',
      'node_modules/chartjs-plugin-annotation/chartjs-plugin-annotation.min.js',
      'node_modules/file-saver/dist/FileSaver.min.js',
      'node_modules/togpx/togpx.js',
      'node_modules/tokml/tokml.js',
      'node_modules/leaflet-control-geocoder/dist/Control.Geocoder.js',
      'node_modules/tippy.js/dist/tippy.min.js',
      'node_modules/shepherd.js/dist/js/shepherd.min.js',
      'dist/map2gpx.min.js',
      'test/*.js',
      'test/**/*Spec.js',
    ],

    reporters: ['progress', 'coverage'],

    preprocessors: {
      'dist/map2gpx.js': ['coverage'],
    },

    coverageReporter: {
      type: 'html',
      dir: 'coverage/',
    },

    // browsers: ["PhantomJS"],
    browsers: ['Firefox'],

    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 5000,

    // Workaround for PhantomJS random DISCONNECTED error
    browserDisconnectTimeout: 10000, // default 2000
    browserDisconnectTolerance: 1, // default 0

    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: true,
  });
};
