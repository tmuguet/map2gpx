import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';
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
      resolve(),
      commonjs(),
      babel({
        exclude: ['node_modules/**'],
        babelHelpers: 'bundled',
      }),
      terser(),
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
    external: ['ms'] + external,
    output: [
      {
        file: pkg.main, format: 'cjs', sourcemap, globals,
      },
      {
        file: pkg.module, format: 'es', sourcemap, globals,
      },
    ],
    plugins: [json()],
  },
];
