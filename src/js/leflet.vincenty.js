import L from 'leaflet';

// Google-like toRad()
Number.prototype.toRad = function () {
  return this * Math.PI / 180;
};

// adapted for LeafLet Vincenty’s formula
// details: http://www.movable-type.co.uk/scripts/latlong-vincenty.html
// Source: https://github.com/bullvinkle/Leflet.Vincenty

function distVincenty() {
  if (arguments.length == 2) { // support different versions of LeafLet
    var lat1 = arguments[0].lat;
    var lon1 = arguments[0].lng;
    var lat2 = arguments[1].lat;
    var lon2 = arguments[1].lng;
  } else if (arguments.length == 1) {
    var lat1 = this.lat;
    var lon1 = this.lng;
    var lat2 = arguments[0].lat;
    var lon2 = arguments[0].lng;
  }

  const a = 6378137; const b = 6356752.314245; const
    f = 1 / 298.257223563; // WGS-84 ellipsoid params
  const L = (lon2 - lon1).toRad();
  const U1 = Math.atan((1 - f) * Math.tan(lat1.toRad()));
  const U2 = Math.atan((1 - f) * Math.tan(lat2.toRad()));
  const sinU1 = Math.sin(U1); const
    cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2); const
    cosU2 = Math.cos(U2);

  let lambda = L; let lambdaP; let
    iterLimit = 100;
  do {
    const sinLambda = Math.sin(lambda); const
      cosLambda = Math.cos(lambda);
    var sinSigma = Math.sqrt((cosU2 * sinLambda) * (cosU2 * sinLambda) + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda));
    if (sinSigma == 0) {
      return 0;
    }
    var cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    var sigma = Math.atan2(sinSigma, cosSigma);
    const sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
    var cosSqAlpha = 1 - sinAlpha * sinAlpha;
    var cos2SigmaM = cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha;
    if (isNaN(cos2SigmaM)) {
      cos2SigmaM = 0;
    } // equatorial line: cosSqAlpha=0 (ยง6)
    const C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    lambdaP = lambda;
    lambda = L + (1 - C) * f * sinAlpha
      * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
  }
  while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);

  if (iterLimit == 0) {
    // formula failed to converge
    return NaN;
  }

  const uSq = cosSqAlpha * (a * a - b * b) / (b * b);
  const A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)
    - B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
  let s = b * A * (sigma - deltaSigma);

  s = s.toFixed(3); // round to 1mm precision
  return parseFloat(s);
}

L.LatLng.prototype.distanceTo = distVincenty;
