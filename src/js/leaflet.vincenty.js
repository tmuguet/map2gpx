/* eslint-disable prefer-rest-params */
import L from 'leaflet';

if (typeof Math.rad === 'undefined') {
  // Converts from degrees to radians.
  Math.rad = function rad(degrees) {
    return (degrees * Math.PI) / 180;
  };
}

// adapted for LeafLet Vincenty’s formula
// details: http://www.movable-type.co.uk/scripts/latlong-vincenty.html
// Source: https://github.com/bullvinkle/Leflet.Vincenty

function distVincenty(other) {
  const lat1 = this.lat;
  const lon1 = this.lng;
  const lat2 = other.lat;
  const lon2 = other.lng;

  const a = 6378137;
  const b = 6356752.314245;
  const f = 1 / 298.257223563; // WGS-84 ellipsoid params
  const L0 = Math.rad(lon2 - lon1); // renamed L->L0 to avoid conflict with Leaflet
  const U1 = Math.atan((1 - f) * Math.tan(Math.rad(lat1)));
  const U2 = Math.atan((1 - f) * Math.tan(Math.rad(lat2)));
  const sinU1 = Math.sin(U1);
  const cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2);
  const cosU2 = Math.cos(U2);

  let lambda = L0;
  let lambdaP;
  let iterLimit = 100;

  let sinSigma;
  let cosSigma;
  let sigma;
  let cosSqAlpha;
  let cos2SigmaM;
  do {
    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);

    sinSigma = Math.sqrt(
      (cosU2 * sinLambda) * (cosU2 * sinLambda)
      + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda),
    );
    if (sinSigma === 0) {
      return 0;
    }
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    const sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha;
    cos2SigmaM = cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha;
    if (Number.isNaN(cos2SigmaM)) {
      cos2SigmaM = 0;
    } // equatorial line: cosSqAlpha=0 (ยง6)
    const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    lambdaP = lambda;
    lambda = (
      L0
      + (1 - C) * f * sinAlpha * (
        sigma
        + C * sinSigma * (
          cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)
        )
      ));
  }
  // eslint-disable-next-line no-plusplus
  while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);

  if (iterLimit === 0) {
    // formula failed to converge
    return this.distanceTo_legacy(other);
  }

  const uSq = cosSqAlpha * ((a * a - b * b) / (b * b));
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const deltaSigma = (
    B * sinSigma * (
      cos2SigmaM
      + (B / 4) * (
        cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)
         - (B / 6) * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)
      )
    )
  );
  let s = b * A * (sigma - deltaSigma);

  s = s.toFixed(3); // round to 1mm precision
  return parseFloat(s);
}

L.LatLng.prototype.distanceTo_legacy = L.LatLng.prototype.distanceTo;
L.LatLng.prototype.distanceTo = distVincenty;
