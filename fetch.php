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

$url = filter_input(INPUT_GET, 'url', FILTER_VALIDATE_URL);
if ($url === FALSE)
    error_400("Parameter url invalid");

try {
    error_reporting(0);

    $file = file_get_contents($url, false, buildContext());
    if ($file === FALSE)
        error_500("Could not fetch data");
    echo $file;
} catch (Exception $e) {
    error_500("Unknown error");
}
