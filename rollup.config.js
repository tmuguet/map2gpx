import { terser } from 'rollup-plugin-terser';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import json from '@rollup/plugin-json';
import postcss from 'rollup-plugin-postcss';
import resolve from '@rollup/plugin-node-resolve';
import pkg from './package.json';

const input = 'src/js/index.js';
const external = [
  '@mapbox/corslite',
  'chart.js',
  'file-saver',
  'geoportal-extensions-leaflet',
  'jquery',
  'leaflet',
  'popper.js',
  'shepherd.js',
  'togpx',
  'tokml',
];
const globals = {
  '@mapbox/corslite': 'corslite',
  'chart.js': 'Chart',
  'file-saver': 'saveAs',
  'geoportal-extensions-leaflet': 'Gp',
  jquery: '$',
  leaflet: 'L',
  'popper.js': 'Popper',
  'shepherd.js': 'Shepherd',
  togpx: 'togpx',
  tokml: 'tokml',
};
const sourcemap = true;

export default [
  // browser-friendly UMD build
  {
    input,
    output: {
      name: 'Map2gpx',
      file: pkg.browser,
      format: 'umd',
      sourcemap,
      globals,
    },
    plugins: [
      json(),
      postcss({
        extensions: ['.css'],
        extract: true,
        minimize: true,
      }),
      resolve(),
      commonjs(),
      babel({
        exclude: ['node_modules/**'],
        babelHelpers: 'bundled',
      }),
      terser(),
      copy({
        targets: [
          { src: ['fetch.php', 'slope.php'], dest: 'dist' },
        ],
      }),
    ],
    external,
  },
  {
    input,
    output: {
      name: 'Map2gpx',
      file: pkg.browser_uncompressed,
      format: 'umd',
      sourcemap,
      globals,
    },
    plugins: [
      json(),
      postcss({
        extensions: ['.css'],
        extract: true,
      }),
      resolve(),
      commonjs(),
      babel({
        exclude: ['node_modules/**'],
        babelHelpers: 'bundled',
      }),
    ],
    external,
  },

  // CommonJS (for Node) and ES module (for bundlers) build.
  {
    input,
    external,
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap,
        globals,
        exports: 'default',
      },
      {
        file: pkg.module, format: 'es', sourcemap, globals,
      },
    ],
    plugins: [
      json(),
      postcss({
        extensions: ['.css'],
        extract: true,
      }),
    ],
  },
];
