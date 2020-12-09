/* global Blob */
import L from 'leaflet';
import $ from 'jquery';
import { saveAs } from 'file-saver';
import togpx from 'togpx';
import tokml from 'tokml';
import { i18n } from './i18n';

export const ExportButton = L.Control.EasyButton.extend({
  options: { },

  initialize(track, options) {
    this._track = track;
    L.Util.setOptions(this, options);

    const opts = {
      states: [
        {
          icon: 'fa-cloud-download',
          title: i18n.export,
          onClick: () => {
            this._dialog.dialog('open');
          },
        },
      ],
    };

    L.Control.EasyButton.prototype.initialize.call(this, opts);

    this._buildPopup();
  },

  _export(content, mimetype, extension) {
    const filename = this._fieldName.val();
    const blob = new Blob([content], {
      type: mimetype,
    });
    saveAs(blob, `${filename}.${extension}`);
  },

  _buildPopup() {
    /* eslint-disable max-len */
    const content = `
<div id="dialog-export" title="${i18n.export}">
  <form enctype="multipart/form-data">
    <fieldset>
      <label for="export-file">${i18n.file}</label>
      <input type="text" name="export-file" id="export-file" value="track" class="text ui-widget-content ui-corner-all"/>
      <span style="display: block">
        <input type="checkbox" name="export-markers" id="export-markers" class="ui-widget-content ui-corner-all" style="display: inline"/>
        <label for="export-markers" style="display: inline">${i18n.includeWaypoints}</label>
      </span>
      <span style="display: block">
        <input type="checkbox" name="export-single" id="export-single" class="ui-widget-content ui-corner-all" style="display: inline"/>
        <label for="export-single" style="display: inline">${i18n.exportAsSingleTrack}</label>
      </span>
    </fieldset>
    <fieldset>
      <button id="export-gpx-button" class="ui-button ui-corner-all ui-widget">GPX</button>
      <button id="export-kml-button" class="ui-button ui-corner-all ui-widget">KML</button>
      <button id="export-geojson-button" class="ui-button ui-corner-all ui-widget">GeoJSON</button>
    </fieldset>
  </form>
</div>`;
    /* eslint-enable max-len */
    const $content = $(content);

    const buttons = {};
    buttons[i18n.cancel] = () => this._dialog.dialog('close');
    this._dialog = $content.dialog({
      autoOpen: false,
      modal: true,
      buttons,
      close: () => {
        this._form[0].reset();
      },
      classes: {
        'ui-dialog': 'map2gpx',
      },
    });

    this._form = this._dialog.find('form').on('submit', (event) => {
      event.preventDefault();
    });
    this._fieldName = this._form.find('#export-file');

    this._form.find('#export-gpx-button').on('click', (event) => {
      event.preventDefault();

      const filename = this._fieldName.val();

      this._export(
        togpx(this._track.toGeoJSON($('#export-markers').is(':checked'), $('#export-single').is(':checked')), {
          creator: 'map2gpx',
          featureTitle: (p) => ('index' in p ? `${filename}-${p.index}` : ''),
        }),
        'application/gpx+xml;charset=utf-8',
        'gpx',
      );
    });

    this._form.find('#export-kml-button').on('click', (event) => {
      event.preventDefault();

      const filename = this._fieldName.val();
      this._export(
        tokml(this._track.toGeoJSON($('#export-markers').is(':checked'), $('#export-single').is(':checked')), {
          documentName: filename,
        }),
        'application/xml;charset=utf-8',
        'kml',
      );
    });

    this._form.find('#export-geojson-button').on('click', (event) => {
      event.preventDefault();

      this._export(
        JSON.stringify(this._track.toGeoJSON($('#export-markers').is(':checked'), $('#export-single').is(':checked'))),
        'application/json;charset=utf-8',
        'geojson',
      );
    });
  },
});

export function exportButton(track, options) {
  return new ExportButton(track, options);
}
