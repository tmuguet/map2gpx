# map2gpx

## Demo

For the French version, see [map2gpx.fr](https://map2gpx.fr). For the international version, see [map2gpx.eu](https://map2gpx.eu).

## How to rebuild

Pre-requisites:

1. Install [nodejs](https://nodejs.org/en/download/)
2. In the checkout, install the dependencies: `npm install`
3. Run `npm run lrm-graphhopper-fixup`
4. If you are using GeoPortail API, download the autoconf file and put it in this folder under the name _autoconf-https-prod.json_. This can be ignored if not using GeoPortail API.
5. Web-server with PHP installed

Rebuild:

- `npm run pack` runs:
  - [rollup](https://www.rollupjs.org/) to generate the JS library files (can be re-used as-is without all the map2gpx layout) in _dist_ folder
  - [gulp](https://gulpjs.com/) to generate the websites (_dist-www_ for generic assets, _www-fr_ and _www-en_ for the whole map2gpx websites)

## Generated files

Output comes in multiples flavors:

- _dist_ folder exposes the library (available in CommonJS, ES6 and UMD formats), that can be reused directly into your projects
- _www-fr_ to use GeoPortail maps and APIs (only available in France) - driven by _index-fr.html_, source for [map2gpx.fr](https://map2gpx.fr)
  - You will need your own API key if you want to test/run it
- _www-en_ to use services available worldwide (maps from OpenStreetMap, Thunderforest, OpenTopoMap, Hike & Bike, Hillshading and APIs from MapQuest, GrapHopper) - driven by _index-en.html_, source for [map2gpx.eu](https://map2gpx.eu)
  - Thunderforest, MapQuest and GraphHopper requires API keys. Even if the API keys provided here may work for you, please use your own API key if you to test/run it

## Customize

If you want to add more services, feel free to create an issue, submit a pull request, or even fork the project and run it by yourself.
