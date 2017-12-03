(function ($) {
    const _altitudes = {}; // Cache of computed altitudes for each points of routes computed so far
    const _slopes = {}; // Cache of computed slopes for each points of routes computed so far

    $.Cache = {};

    const getKey = function (coords) {
        return getKeyLatLng(coords.lat, coords.lng);
    };

    const getKeyLatLng = function (lat, lng) {
        return Math.roundE8(lng) + '/' + Math.roundE8(lat);
    };

    $.Cache.addAltitude = function (lat, lng, z) {
        _altitudes[getKeyLatLng(lat, lng)] = z;
    };

    $.Cache.getAltitude = function (coords) {
        const key = getKey(coords);
        return (key in _altitudes) ? _altitudes[key] : null;
    };

    $.Cache.hasAltitude = function (coords) {
        return getKey(coords) in _altitudes;
    };

    $.Cache.addSlope = function (lat, lng, slope) {
        _slopes[getKeyLatLng(lat, lng)] = slope;
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

})(jQuery);
