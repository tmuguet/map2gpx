/* global window */
import $ from 'jquery';

/* from https://stackoverflow.com/a/3855394 */
$.QueryString = (function (paramsArray) {
  const params = {};

  for (let i = 0; i < paramsArray.length; i += 1) {
    const param = paramsArray[i].split('=', 2);
    if (param.length === 2) {
      params[param[0]] = decodeURIComponent(param[1].replace(/\+/g, ' '));
    }
  }

  return params;
}(window.location.search.substr(1).split('&')));
