const {
  src, dest, parallel, series,
} = require('gulp');
const rename = require('gulp-rename');
const concat = require('gulp-concat');
const csso = require('gulp-csso');
const copy = require('gulp-copy');
const htmlcpr = require('gulp-htmlcpr');

const { ENV } = require('./env.json');

function bundleCss() {
  return src(['./src/css/default.css', './src/css/jquery-ui.theme.min.css'])
    .pipe(concat('map2gpx.css'))
    .pipe(dest('./dist-www/css'))
    .pipe(csso())
    .pipe(rename('map2gpx.min.css'))
    .pipe(dest('./dist-www/css'));
}
function bundleImages() {
  return src(['./src/css/images/*']).pipe(copy('./dist-www/css/images', { prefix: 3 }));
}

const htmlcprConfig = {
  blacklistFn: (url) => {
    if (url.startsWith('%')) {
      return true;
    }

    return false;
  },
  skipFn: (url) => {
    if (url === '#default#VML') {
      return true;
    }

    return false;
  },
};

function copyDependenciesFrMain() {
  return src('index-fr.html')
    .pipe(rename('index.html'))
    .pipe(htmlcpr(htmlcprConfig))
    .pipe(dest('./www-fr/'));
}
function copyDependenciesFrOsm() {
  return src('index-fr-osm.html')
    .pipe(rename('osm.html'))
    .pipe(htmlcpr(htmlcprConfig))
    .pipe(dest('./www-fr/'));
}
function copyDependenciesEn() {
  return src('index-en.html')
    .pipe(rename('index.html'))
    .pipe(htmlcpr(htmlcprConfig))
    .pipe(dest('./www-en/'));
}
function copyAssetsCommon() {
  return src(['map2gpx.png', './screenshot.png', './fetch.php'])
    .pipe(dest('./www-fr/'))
    .pipe(dest('./www-en/'));
}
function copyAssetsIgn() {
  return src(['./slope.php']).pipe(dest('./www-fr/'));
}
function copyConfIgn() {
  return src(`./autoconf-https-${ENV}.json`, { allowEmpty: true })
    .pipe(rename('autoconf.json'))
    .pipe(dest('./www-fr/'));
}

exports.pack = series(
  parallel(bundleCss, bundleImages),
  parallel(
    series(copyDependenciesFrMain, copyDependenciesFrOsm),
    copyDependenciesEn,
    copyAssetsCommon,
    copyAssetsIgn,
    copyConfIgn,
  ),
);
