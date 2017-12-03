
const sources_js = [
    "src/js/jquery.localstorage.js",
    "src/js/jquery.querystring.js",
    "src/js/jquery.shepherd.js",
    "src/js/maths.js",
    "src/js/utils.js",
    "src/js/L.Polyline.find.js",
    "src/js/L.Polyline.Hausdorff.js",
    "src/js/L.Polyline.interpolate.js",
    "src/js/queue.js",
    "src/js/blockingqueue.js",
    "src/js/progress.js",
    "src/js/cache.js",

    "src/js/view.js",
    "src/js/stats.js",
    "src/js/chart.js",

    "src/js/track.js",

    "src/js/map.js",


    "src/js/script.js"
];
const sources_css = [
    "src/css/default.css"
];

const gulp = require('gulp');
const $ = require('gulp-load-plugins')({ lazy: true });
const runSequence = require("run-sequence");
const path  = require("path");
const dest_js = 'js/';
const dest_css = 'css/';

gulp.task("jshint", function () {

    const jshint = require("gulp-jshint");

    return gulp.src(sources_js)
        .pipe($.plumber())
        .pipe(jshint(".jshintrc"))
        .pipe(jshint.reporter("default", { verbose : true }))
        .pipe(jshint.reporter("fail"));
});

gulp.task("jscs", function () {

    const jscs = require("gulp-jscs");

    return gulp.src(sources_js)
        .pipe($.plumber())
        .pipe(jscs())
        .pipe(jscs.reporter())
        .pipe(jscs.reporter("fail"));
});

gulp.task("bundle-js", function() {

    const babel = require('gulp-babel');
    const concat = require('gulp-concat');
    const rename = require('gulp-rename');
    const uglify = require('gulp-uglify');

    return gulp.src(sources_js)
        .pipe(concat('map2gpx.src.js'))
        .pipe(gulp.dest(dest_js))
        .pipe(babel({ presets: ['env'] }))
        .pipe(rename("map2gpx.babel.js"))
        .pipe(gulp.dest(dest_js))
        .pipe(uglify())
        .pipe(rename("map2gpx.min.js"))
        .pipe(gulp.dest(dest_js));
});

gulp.task("bundle-css", function() {

    const concat = require('gulp-concat');
    const rename = require('gulp-rename');
    const csso = require('gulp-csso');

    return gulp.src(sources_css)
        .pipe(concat('map2gpx.src.css'))
        .pipe(gulp.dest(dest_css))
        .pipe(csso())
        .pipe(rename("map2gpx.min.css"))
        .pipe(gulp.dest(dest_css));
});

gulp.task("check", ['jshint', 'jscs']);
gulp.task("bundle", ['bundle-js', 'bundle-css']);

gulp.task("default", function(cb) {
    runSequence("check", "bundle", cb);
});

gulp.task('watch', function () {
  gulp.watch(sources_js, ['bundle-js']);
});
