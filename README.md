map2gpx
=======


Set your own IGN API key
------------------------

You must change:
* _index.html_ (around line 84):
```
    <script data-key="<your-own-key>" src="leaflet/GpPluginLeaflet.js"></script>
    <script type="text/javascript">
    var keyIgn = '<your-own-key>';
    </script>
```
* _slope.php_ (around line 94):
```
    $file = file_get_contents('http://wxs.ign.fr/<your-own-key>/geoportail/wmts?...
```


How to rebuild
--------------

Pre-requisites:

1. Install [nodejs](https://nodejs.org/en/download/)
2. Install [gulp](https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md)
3. In the checkout, install the dependencies: `npm install`
4. Web-server with PHP (PHP 5 >= 5.2.0, PHP 7) installed

Rebuild:
* `gulp` to launch checks and re-bundle the javascript and css resources
* `gulp bundle` just to re-bundle
* `gulp watch` to watch for modifications of the javascript files and re-bundle the javascript resources on the fly