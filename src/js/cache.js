(function ($) {
    const _altitudes = {}; // Cache of computed altitudes for each points of routes computed so far
    const _slopes = {}; // Cache of computed slopes for each points of routes computed so far

    $.Cache = {};

    const getKey = function (coords) {
        return coords.lng + '/' + coords.lat;
    };

    $.Cache.addAltitude = function (lat, lng, z) {
        _altitudes[lng + '/' + lat] = z;
    };

    $.Cache.getAltitude = function (coords) {
        const key = getKey(coords);
        return (key in _altitudes) ? _altitudes[key] : null;
    };

    $.Cache.hasAltitude = function (coords) {
        return getKey(coords) in _altitudes;
    };

    $.Cache.addSlope = function (lat, lng, slope) {
        _slopes[lng + '/' + lat] = slope;
    };

    $.Cache.getSlope = function (coords) {
        const key = getKey(coords);
        return (key in _slopes) ? _slopes[key] : null;
    };

    $.Cache.hasSlope = function (coords) {
        return getKey(coords) in _slopes;
    };

    $.Cache.getInfos = function (coords) {
        const key = getKey(coords);
        return {
            z: (key in _altitudes) ? _altitudes[key] : null,
            slope: (key in _slopes) ? _slopes[key] : null,
        };
    };

    $.Cache.lengthOfMarkers = function () {
        return $.Track.lengthOfMarkers();
    };

    $.Cache.hasMarkers = function (size = 1) {
        return $.Track.hasMarkers(size);
    };

    $.Cache.getMarker = function (idx) {
    };

    $.Cache.indexOfMarker = function (o) {
    };

    $.Cache.eachMarker = function (callback) {
    };

    $.Cache.addMarker = function (marker) {
    };

    $.Cache.removeMarkerAt = function (idx) {
    };

    $.Cache.resetMarkers = function () {
    };

    $.Cache.lengthOfRoutes = function () {
    };

    $.Cache.hasRoutes = function (n) {
    };

    $.Cache.getRoute = function (idx) {
    };

    $.Cache.getRouteMode = function (idx) {
    };

    $.Cache.eachRoute = function (callback) {
    };

    $.Cache.addRoute = function (track, mode) {
    };

    $.Cache.setRouteAt = function (idx, track, mode) {
    };

    $.Cache.removeRouteAt = function (idx) {
    };

    $.Cache.resetRoutes = function () {
    };
})(jQuery);
