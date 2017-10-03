// Rounds to 8 decimals (IGN API does not support/give more precise data)
Math.roundE8 = function (value) {
    return Math.round(value * Math.pow(10, 8)) / Math.pow(10, 8);
};

// Converts from degrees to radians.
Math.radians = function (degrees) {
    return degrees * Math.PI / 180;
};

// Converts from radians to degrees.
Math.degrees = function (radians) {
    return radians * 180 / Math.PI;
};

// Can't use L.LatLng.include() because not defined
L.LatLng.prototype.roundE8 = function () {
    return L.latLng(Math.roundE8(this.lat), Math.roundE8(this.lng));
};

// from https://stackoverflow.com/a/40986574
L.LatLng.prototype.toTilePixel = function (crs, zoom, tileSize, pixelOrigin) {
    const layerPoint = crs.latLngToPoint(this, zoom).floor();
    const tile = layerPoint.divideBy(tileSize).floor();
    const tileCorner = tile.multiplyBy(tileSize).subtract(pixelOrigin);
    const tilePixel = layerPoint.subtract(pixelOrigin).subtract(tileCorner);
    return { tile, tilePixel };
};

// from https://gis.stackexchange.com/questions/157693/getting-all-vertex-lat-long-coordinates-every-1-meter-between-two-known-points
L.LatLng.prototype.getDestinationAlong = function (azimuth, distance) {
    const R = 6378137; // Radius of the Earth in m
    const brng = Math.radians(azimuth); // Bearing is degrees converted to radians.
    const lat1 = Math.radians(this.lat); //Current dd lat point converted to radians
    const lon1 = Math.radians(this.lng); //Current dd long point converted to radians
    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance / R) + Math.cos(lat1) * Math.sin(distance / R) * Math.cos(brng));
    var lon2 = lon1 + Math.atan2(
        Math.sin(brng) * Math.sin(distance / R) * Math.cos(lat1),
        Math.cos(distance / R) - Math.sin(lat1) * Math.sin(lat2)
    );

    //convert back to degrees
    lat2 = Math.degrees(lat2);
    lon2 = Math.degrees(lon2);
    return L.latLng(Math.roundE8(lat2), Math.roundE8(lon2));
};

L.LatLng.prototype.bearingTo = function (other) {
    const startLat = Math.radians(this.lat);
    const startLong = Math.radians(this.lng);
    const endLat = Math.radians(other.lat);
    const endLong = Math.radians(other.lng);
    const dPhi = Math.log(Math.tan(endLat / 2.0 + Math.PI / 4.0) / Math.tan(startLat / 2.0 + Math.PI / 4.0));
    var dLong = endLong - startLong;
    if (Math.abs(dLong) > Math.PI) {
        if (dLong > 0.0)
            dLong = -(2.0 * Math.PI - dLong);
        else
            dLong = (2.0 * Math.PI + dLong);
    }

    return (Math.degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
};
