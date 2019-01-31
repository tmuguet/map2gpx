# map2gpx

## Demo

For the French version, see [map2gpx.fr](https://map2gpx.fr). For the international version, see [map2gpx.eu](https://map2gpx.eu).

## How to rebuild

Pre-requisites:

1. Install [nodejs](https://nodejs.org/en/download/)
2. In the checkout, install the dependencies: `npm install`
3. Web-server with PHP installed

Rebuild:

- `gulp pack` just re-bundle and generate _www-fr_ and _www-en_ folders.

## Generated files

Output comes in two flavors:

- _www-fr_ to use GeoPortail maps and APIs (only available in France) - driven by _index-fr.html_
  - You will need your own API key if you want to test/run it
- _www-en_ to use services available worldwide (maps from OpenStreetMap, Thunderforest, OpenTopoMap, Hike & Bike, Hillshading and APIs from MapQuest, GrapHopper) - driven by _index-en.html_
  - Thunderforest, MapQuest and GraphHopper requires API keys. Even if the API keys provided here may work for you, please use your own API key if you to test/run it

## Customize

If you want to add more services, feel free to create an issue, submit a pull request, or even fork the project and run it by yourself.
