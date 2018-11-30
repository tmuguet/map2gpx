<?php
function buildContext() {
    $opts = array(
      'http'=>array(
        'method'=>"GET",
        'header'=>"User-Agent: " . $_SERVER['HTTP_USER_AGENT'] . "\r\n" .
                    "Accept: */*\r\n" .
                    "Accept-Language: fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3\r\n" .
                    "DNT: 1\r\n" .
                    "Referer: " . $_SERVER['HTTP_REFERER'] ."\r\n"
      )
    );

    $context = stream_context_create($opts);
    return $context;
}

function error_400($msg) {  // Quick & dirty
    header("HTTP/1.0 400 Bad Request");
    http_response_code(400);
    echo json_encode(array("error" => $msg));
    exit();
}

function error_500($msg) {  // Quick & dirty
    header("HTTP/1.0 500 Internal Server Error");
    http_response_code(500);
    echo json_encode(array("error" => $msg));
    exit();
}

$apikey = filter_input(INPUT_GET, 'apikey', FILTER_VALIDATE_REGEXP, array(
    "options" => array("regexp" => "/[a-zA-Z0-9]+/")
));
if ($apikey === FALSE)
    error_400("Parameter apikey invalid");

$tilematrix = filter_input(INPUT_GET, 'tilematrix', FILTER_VALIDATE_INT);
if ($tilematrix === FALSE)
    error_400("Parameter tilematrix invalid");

$tilerow = filter_input(INPUT_GET, 'tilerow', FILTER_VALIDATE_INT);
if ($tilerow === FALSE)
    error_400("Parameter tilerow invalid");

$tilecol = filter_input(INPUT_GET, 'tilecol', FILTER_VALIDATE_INT);
if ($tilecol === FALSE)
    error_400("Parameter tilemcol invalid");

$lon_dirty = explode('|', $_GET['lon']);
$lat_dirty = explode('|', $_GET['lat']);

$x_dirty = explode('|', $_GET['x']);
$y_dirty = explode('|', $_GET['y']);

if (count($x_dirty) != count($y_dirty) || count($x_dirty) != count($lon_dirty) || count($x_dirty) != count($lat_dirty)) {
    error_400("Parameters x, y, lon, lat invalid");
}

$d = [];

for ($i = 0; $i < count($x_dirty); $i++) {
    $_lon = filter_var($lon_dirty[$i], FILTER_VALIDATE_FLOAT);
    if ($_lon === FALSE)
        error_400("Parameter lon invalid");
    $_lat = filter_var($lat_dirty[$i], FILTER_VALIDATE_FLOAT);
    if ($_lat === FALSE)
        error_400("Parameter lat invalid");
    $_x = filter_var($x_dirty[$i], FILTER_VALIDATE_INT);
    if ($_x === FALSE)
        error_400("Parameter x invalid");
    $_y = filter_var($y_dirty[$i], FILTER_VALIDATE_INT);
    if ($_y === FALSE)
        error_400("Parameter y invalid");

    $d[] = array("lat" => $_lat, "lon" => $_lon, "x" => $_x, "y" => $_y);
}

function isAround($target, $expected) {
    return ($target < $expected+40 && $target > $expected-40);
}

function colorat($im, $x, $y) {
    $rgb = imagecolorat($im, $x, $y);
    $transparency = ($color >> 24) & 0x7F;
    $r = ($rgb >> 16) & 0xFF;
    $g = ($rgb >> 8) & 0xFF;
    $b = $rgb & 0xFF;

    if (isAround($r, 200) && isAround($g, 135) && isAround($b, 187))
        return 45;
    else if (isAround($r, 225) && isAround($g, 15) && isAround($b, 15))
        return 40;
    else if (isAround($r, 243) && isAround($g, 148) && isAround($b, 25))
        return 35;
    else if (isAround($r, 242) && isAround($g, 229) && isAround($b, 15))
        return 30;
    else if ($transparency != 0)
        return 30;
    else
        return 0;
}

try {
    error_reporting(0);

    $file = file_get_contents('https://wxs.ign.fr/' . $apikey . '/geoportail/wmts?service=WMTS&request=GetTile&version=1.0.0&layer=GEOGRAPHICALGRIDSYSTEMS.SLOPES.MOUNTAIN&style=normal&tilematrixset=PM&format=image/png&tilematrix=' . $tilematrix . '&tilerow=' . $tilerow . '&tilecol=' . $tilecol, false, buildContext());
    if ($file === FALSE)
        error_500("Could not fetch data");
    $im = imagecreatefromstring($file);


    $results = [];

    for ($i = 0; $i < count($d); $i++) {
        $color = colorat($im, $d[$i]["x"], $d[$i]["y"]);
        $results[] = array_merge($d[$i], array("slope" => $color));
    }
    echo json_encode(array("results" => $results));
} catch (Exception $e) {
    error_500("Unknown error");
}
