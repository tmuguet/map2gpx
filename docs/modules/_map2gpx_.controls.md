**[Map2gpx](../README.md)**

> [Globals](../README.md) / ["Map2gpx"](_map2gpx_.md) / Controls

# Namespace: Controls

## Index

### Enumerations

* [LayerSwitcherType](../enums/_map2gpx_.controls.layerswitchertype.md)

### Interfaces

* [ChartOptions](../interfaces/_map2gpx_.controls.chartoptions.md)
* [ExportButtonOptions](../interfaces/_map2gpx_.controls.exportbuttonoptions.md)
* [ImportButtonOptions](../interfaces/_map2gpx_.controls.importbuttonoptions.md)
* [ImportExportButtonsOptions](../interfaces/_map2gpx_.controls.importexportbuttonsoptions.md)
* [InfoToolbarOptions](../interfaces/_map2gpx_.controls.infotoolbaroptions.md)
* [Layers](../interfaces/_map2gpx_.controls.layers.md)
* [MapCoordinatesOptions](../interfaces/_map2gpx_.controls.mapcoordinatesoptions.md)
* [TraceModeBarOptions](../interfaces/_map2gpx_.controls.tracemodebaroptions.md)
* [ZoomOptions](../interfaces/_map2gpx_.controls.zoomoptions.md)

### Functions

* [addChart](_map2gpx_.controls.md#addchart)
* [addExportButton](_map2gpx_.controls.md#addexportbutton)
* [addGeocoder](_map2gpx_.controls.md#addgeocoder)
* [addImportButton](_map2gpx_.controls.md#addimportbutton)
* [addImportExportButtons](_map2gpx_.controls.md#addimportexportbuttons)
* [addInfoToolbar](_map2gpx_.controls.md#addinfotoolbar)
* [addLayers](_map2gpx_.controls.md#addlayers)
* [addMapCoordinatesButton](_map2gpx_.controls.md#addmapcoordinatesbutton)
* [addMinimap](_map2gpx_.controls.md#addminimap)
* [addScale](_map2gpx_.controls.md#addscale)
* [addTour](_map2gpx_.controls.md#addtour)
* [addTrackDrawer](_map2gpx_.controls.md#addtrackdrawer)
* [addTrackDrawerToolbar](_map2gpx_.controls.md#addtrackdrawertoolbar)
* [addTrackDrawerTracebar](_map2gpx_.controls.md#addtrackdrawertracebar)
* [addZoom](_map2gpx_.controls.md#addzoom)

## Functions

### addChart

▸ **addChart**(`item`: string, `map`: L.Map, `track`: L.TrackDrawer, `options?`: [ChartOptions](../interfaces/_map2gpx_.controls.chartoptions.md)): null

#### Parameters:

Name | Type |
------ | ------ |
`item` | string |
`map` | L.Map |
`track` | L.TrackDrawer |
`options?` | [ChartOptions](../interfaces/_map2gpx_.controls.chartoptions.md) |

**Returns:** null

___

### addExportButton

▸ **addExportButton**(`map`: L.Map, `track`: L.TrackDrawer, `options?`: [ExportButtonOptions](../interfaces/_map2gpx_.controls.exportbuttonoptions.md)): L.Control

#### Parameters:

Name | Type |
------ | ------ |
`map` | L.Map |
`track` | L.TrackDrawer |
`options?` | [ExportButtonOptions](../interfaces/_map2gpx_.controls.exportbuttonoptions.md) |

**Returns:** L.Control

___

### addGeocoder

▸ **addGeocoder**(`map`: L.Map, `options?`: Geocoder.GeocoderControlOptions): L.Control

#### Parameters:

Name | Type |
------ | ------ |
`map` | L.Map |
`options?` | Geocoder.GeocoderControlOptions |

**Returns:** L.Control

___

### addImportButton

▸ **addImportButton**(`map`: L.Map, `track`: L.TrackDrawer, `options?`: [ImportButtonOptions](../interfaces/_map2gpx_.controls.importbuttonoptions.md)): L.Control

#### Parameters:

Name | Type |
------ | ------ |
`map` | L.Map |
`track` | L.TrackDrawer |
`options?` | [ImportButtonOptions](../interfaces/_map2gpx_.controls.importbuttonoptions.md) |

**Returns:** L.Control

___

### addImportExportButtons

▸ **addImportExportButtons**(`map`: L.Map, `track`: L.TrackDrawer, `options?`: [ImportExportButtonsOptions](../interfaces/_map2gpx_.controls.importexportbuttonsoptions.md)): L.Control

#### Parameters:

Name | Type |
------ | ------ |
`map` | L.Map |
`track` | L.TrackDrawer |
`options?` | [ImportExportButtonsOptions](../interfaces/_map2gpx_.controls.importexportbuttonsoptions.md) |

**Returns:** L.Control

___

### addInfoToolbar

▸ **addInfoToolbar**(`map`: L.Map, `options?`: MinimapOptions): L.Control

#### Parameters:

Name | Type |
------ | ------ |
`map` | L.Map |
`options?` | MinimapOptions |

**Returns:** L.Control

___

### addLayers

▸ **addLayers**(`map`: L.Map, `visibleBaseLayers`: [Layers](../interfaces/_map2gpx_.controls.layers.md), `visibleOverlays`: [Layers](../interfaces/_map2gpx_.controls.layers.md), `hiddenBaseLayers`: [Layers](../interfaces/_map2gpx_.controls.layers.md), `hiddenOverlays`: [Layers](../interfaces/_map2gpx_.controls.layers.md), `controlType`: [LayerSwitcherType](../enums/_map2gpx_.controls.layerswitchertype.md)): L.Control

#### Parameters:

Name | Type |
------ | ------ |
`map` | L.Map |
`visibleBaseLayers` | [Layers](../interfaces/_map2gpx_.controls.layers.md) |
`visibleOverlays` | [Layers](../interfaces/_map2gpx_.controls.layers.md) |
`hiddenBaseLayers` | [Layers](../interfaces/_map2gpx_.controls.layers.md) |
`hiddenOverlays` | [Layers](../interfaces/_map2gpx_.controls.layers.md) |
`controlType` | [LayerSwitcherType](../enums/_map2gpx_.controls.layerswitchertype.md) |

**Returns:** L.Control

___

### addMapCoordinatesButton

▸ **addMapCoordinatesButton**(`map`: L.Map, `options?`: [MapCoordinatesOptions](../interfaces/_map2gpx_.controls.mapcoordinatesoptions.md)): L.Control

#### Parameters:

Name | Type |
------ | ------ |
`map` | L.Map |
`options?` | [MapCoordinatesOptions](../interfaces/_map2gpx_.controls.mapcoordinatesoptions.md) |

**Returns:** L.Control

___

### addMinimap

▸ **addMinimap**(`map`: L.Map, `layer`: L.Layer, `options?`: MinimapOptions): L.Control

#### Parameters:

Name | Type |
------ | ------ |
`map` | L.Map |
`layer` | L.Layer |
`options?` | MinimapOptions |

**Returns:** L.Control

___

### addScale

▸ **addScale**(`map`: L.Map, `options?`: L.Control.ScaleOptions): L.Control

#### Parameters:

Name | Type |
------ | ------ |
`map` | L.Map |
`options?` | L.Control.ScaleOptions |

**Returns:** L.Control

___

### addTour

▸ **addTour**(`track`: L.TrackDrawer): null

#### Parameters:

Name | Type |
------ | ------ |
`track` | L.TrackDrawer |

**Returns:** null

___

### addTrackDrawer

▸ **addTrackDrawer**(`map`: L.Map, `fetcher`: L.TrackStats.IFetcher, `geocoder`: Geocoder.IGeocoder): L.TrackDrawer

#### Parameters:

Name | Type |
------ | ------ |
`map` | L.Map |
`fetcher` | L.TrackStats.IFetcher |
`geocoder` | Geocoder.IGeocoder |

**Returns:** L.TrackDrawer

___

### addTrackDrawerToolbar

▸ **addTrackDrawerToolbar**(`map`: L.Map, `track`: L.TrackDrawer, `options?`: L.TrackDrawer.ToolBarOptions): L.Control

#### Parameters:

Name | Type |
------ | ------ |
`map` | L.Map |
`track` | L.TrackDrawer |
`options?` | L.TrackDrawer.ToolBarOptions |

**Returns:** L.Control

___

### addTrackDrawerTracebar

▸ **addTrackDrawerTracebar**(`map`: L.Map, `track`: L.TrackDrawer, `options?`: L.TrackDrawer.TraceModeBarOptions): L.Control

#### Parameters:

Name | Type |
------ | ------ |
`map` | L.Map |
`track` | L.TrackDrawer |
`options?` | L.TrackDrawer.TraceModeBarOptions |

**Returns:** L.Control

___

### addZoom

▸ **addZoom**(`map`: L.Map, `options?`: [ZoomOptions](../interfaces/_map2gpx_.controls.zoomoptions.md)): L.Control

#### Parameters:

Name | Type |
------ | ------ |
`map` | L.Map |
`options?` | [ZoomOptions](../interfaces/_map2gpx_.controls.zoomoptions.md) |

**Returns:** L.Control
