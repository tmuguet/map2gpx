const gulp = require('gulp');
const rename = require('gulp-rename');

const ENV = 'prod';

// gulp.task('bundle-javascript', () => {
//   const browserify = require('browserify');
//   const babelify = require('babelify');
//   const browserify_shim = require('browserify-shim');
//   const browserify_derequire = require('browserify-derequire');
//   const uglify = require('gulp-uglify');
//   const sourcemaps = require('gulp-sourcemaps');
//   const source = require('vinyl-source-stream');
//   const buffer = require('vinyl-buffer');

//   const b = browserify({
//     entries: './src/js/index.js',
//     debug: true,
//     standalone: 'Map2gpx',
//     transform: [
//       babelify.configure({
//         presets: ['@babel/preset-env'],
//       }),
//       browserify_shim,
//     ],
//     plugin: [browserify_derequire],
//   });

//   return b
//     .bundle()
//     .pipe(source('./src/js/index.js'))
//     .pipe(buffer())
//     .pipe(rename('map2gpx.js')) // Rename the output file
//     .pipe(sourcemaps.init({ loadMaps: true }))
//     .pipe(gulp.dest('./dist/js/'))
//     .pipe(rename('map2gpx.min.js')) // Rename the output file
//     .pipe(uglify())
//     .pipe(sourcemaps.write('./'))
//     .pipe(gulp.dest('./dist/js/'));
// });

gulp.task('bundle-css0', () => {
  const concat = require('gulp-concat');
  const csso = require('gulp-csso');

  return gulp
    .src(['./src/css/default.css', './src/css/jquery-ui.theme.min.css'])
    .pipe(concat('map2gpx.css'))
    .pipe(gulp.dest('./dist/css'))
    .pipe(csso())
    .pipe(rename('map2gpx.min.css'))
    .pipe(gulp.dest('./dist/css'));
});
gulp.task('copy-css', () => {
  const gulpCopy = require('gulp-copy');

  return gulp.src(['./src/css/images/*']).pipe(gulpCopy('./dist/css/images', { prefix: 3 }));
});
gulp.task('bundle-css', gulp.parallel('bundle-css0', 'copy-css'));
gulp.task('bundle', gulp.parallel(/* 'bundle-javascript', */'bundle-css'));

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

gulp.task('copy-dependencies-fr', () => {
  const htmlcpr = require('gulp-htmlcpr');

  return gulp
    .src('index-fr.html')
    .pipe(rename('index.html'))
    .pipe(htmlcpr(htmlcprConfig))
    .pipe(gulp.dest('./www-fr/'));
});

gulp.task('copy-dependencies-fr2', () => gulp
  .src('index-fr-osm.html')
  .pipe(rename('osm.html'))
  .pipe(gulp.dest('./www-fr/')));

gulp.task('copy-dependencies-en', () => {
  const htmlcpr = require('gulp-htmlcpr');

  return gulp
    .src('index-en.html')
    .pipe(rename('index.html'))
    .pipe(htmlcpr(htmlcprConfig))
    .pipe(gulp.dest('./www-en/'));
});

gulp.task('copy-dependencies-others', () => gulp
  .src('./dist/js/map2gpx.min.js.map')
  .pipe(gulp.dest('./www-fr/dist/js'))
  .pipe(gulp.dest('./www-en/dist/js')));

gulp.task('copy-dependencies-others2', () => gulp
  .src(['map2gpx.png', './screenshot.png', './fetch.php'])
  .pipe(gulp.dest('./www-fr/'))
  .pipe(gulp.dest('./www-en/')));

gulp.task('copy-dependencies-ign', () => gulp.src(['./slope.php']).pipe(gulp.dest('./www-fr/')));

gulp.task('copy-dependencies-ign2', () => gulp
  .src(`./autoconf-https-${ENV}.json`)
  .pipe(rename('autoconf.json'))
  .pipe(gulp.dest('./www-fr/')));

gulp.task(
  'copy-dependencies',
  gulp.parallel(
    'copy-dependencies-fr',
    'copy-dependencies-fr2',
    'copy-dependencies-en',
    'copy-dependencies-others',
    'copy-dependencies-others2',
    'copy-dependencies-ign',
    'copy-dependencies-ign2',
  ),
);

gulp.task('lint', () => {
  const eslint = require('gulp-eslint');
  gulp
    .src(['src/js/*.js', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('pack', gulp.series('bundle', 'copy-dependencies'));
