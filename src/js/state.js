(function ($) {
    var _mode = null;
    var _computing = false;

    $.State = {};

    $.State.setMode = function (mode) {
        _mode = mode;
        $('body').trigger($.Event('map2gpx:modechange', { mode: _mode, computing: _computing }));
    };

    $.State.setComputing = function (computing) {
        _computing = computing;
        $('body').trigger($.Event('map2gpx:computingchange', { mode: _mode, computing: _computing }));
    };

    $.State.triggerMarkersChanged = function () {
        $('body').trigger($.Event('map2gpx:markerschange', { mode: _mode, computing: _computing }));
    };

    $.State.getMode = function () { return _mode; };
    $.State.getComputing = function () { return _computing; };

})(jQuery);
