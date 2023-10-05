import { Component, OnInit, inject } from '@angular/core';
import { Feature, Map, View } from 'ol';
import { Draw, Snap } from 'ol/interaction';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM.js';
import TileWMS from 'ol/source/TileWMS';
import VectorSource from 'ol/source/Vector';
// import { createBar, lineStringControl } from './controls';
import VectorLayer from 'ol/layer/Vector';
import { extend } from 'ol/extent';
// import GeoJSON from 'ol/format/GeoJSON.js';
import { LineString, LinearRing, MultiLineString, MultiPolygon, Polygon } from 'ol/geom';
import { Control, defaults as defaultControls } from 'ol/control.js';
import { DrawLineStringControl, SetSubdividingParcelControl, DrawPolygonControl, ImageLoadControl } from './controls';
import GeoJSON from 'ol/format/GeoJSON.js';
import { asArray } from 'ol/color';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import { parcels } from './parcels';
import { HttpClient } from '@angular/common/http';
import { filter } from 'rxjs';

import ImageLayer from 'ol/layer/Image';
import Static from 'ol/source/ImageStatic';
import Select from 'ol/interaction/Select';

import Transform_ext from 'ol-ext/interaction/Transform';
import layerGeoImage from 'ol-ext/layer/GeoImage';
import sourceGeoImage from 'ol-ext/source/GeoImage';
import { shiftKeyOnly } from 'ol/events/condition';
import { fromExtent } from 'ol/geom/Polygon';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  // constructor(private http: HttpClient) { }
  view: any;
  map: any;
  drawInteractionRef: Draw;
  private _polygonsLayer!: Feature;
  public get polygonsLayer(): Feature {
    return this._polygonsLayer;
  }
  public set polygonsLayer(value: Feature) {
    this._polygonsLayer = value;
  }
  private _lineStringsLayer!: Feature;
  public get lineStringsLayer(): Feature {
    return this._lineStringsLayer;
  }
  public set lineStringsLayer(value: Feature) {
    this._lineStringsLayer = value;
  }
  polygonVectorLayer!: VectorLayer<any>;
  imageVectorLayer!: VectorLayer<any>;
  lineVectorLayer!: VectorLayer<any>;

  imageLayer: any;
  sourceImage: any;
  selectInteraction: any;
  firstPoint: false;

  startangle: number = 0;
  endangle: number = 0;
  startRadius: number = 10;

  temp: number = 0.1;
  mapCenter: [0, 0];
  d: [0, 0];

  ngOnInit() {
    this.initMap();
  }

  getParcelControls() {
    return parcels.map((parcel, index) => {
      return new SetSubdividingParcelControl(index, () => this.setSubdividingParcel(parcel));
    })
  }

  initMap() {
    this.map = new Map({
      controls: defaultControls().extend([new DrawLineStringControl({}, this.toggleLineStringDraw), new DrawPolygonControl({}, this.togglePolygonDraw), new ImageLoadControl({}, this.toggleImageLoad), ...this.getParcelControls()]),
      layers: [
        new TileLayer({ source: new OSM() })
      ],
      target: 'map',
      view: new View({
        // center: [-115.354, 51.0903],
        zoom: 14,
        center: [274770, 6243929],
        projection: 'EPSG:3857'
      }),
    });
    this.addFeatureGroupLayers();
    // Initialize the select interaction
    this.selectInteraction = new Transform_ext({
      enableRotatedTransform: false,
      addCondition: shiftKeyOnly,
      hitTolerance: 2,
      translateFeature: true,
      scale: true,
      rotate: true,
      keepAspectRatio: false,
      translate: true,
      keepRectangle: true,
      stretch: true,
      // pointRadius: function (f:any) {
      //   var radius = f.get('radius') || 10;
      //   return [radius, radius];
      // }
    });

    this.selectInteraction.set('translate', this.selectInteraction.get('translate'));

    this.selectInteraction.on(['rotatestart', 'translatestart', 'scalestart'], this.setAngle);

    this.selectInteraction.on('rotating', this.imageRotate);

    this.selectInteraction.on('translating', this.setTranslate);
    this.selectInteraction.on('scaling', this.setScaling);

    this.selectInteraction.on(['rotateend', 'translateend', 'scaleend'], this.endInteraction);

  }

  toggleLineStringDraw = () => {
    
    // this.map.removeLayer(this.imageLayer);
    console.log(this.map);
    this.map.removeInteraction(this.selectInteraction);
    // if (this.drawInteractionRef) {
    //   this.stopDrawingInteraction();
    //   return;
    // }
    // this.startDrawingInteraction('LineString', this.subdivide, 'GeoJSON');    
  }

  togglePolygonDraw = () => {
    
    // if (this.drawInteractionRef) {
    //   this.stopDrawingInteraction();
    //   return;
    // }
    // this.startDrawingInteraction('Polygon', this.subdivide, 'GeoJSON');
  }

  // upload image
  toggleImageLoad = (event: any) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const imageUrl = e.target.result;
      console.log(imageUrl);
      this.map.removeLayer(this.imageLayer);
      const image = new Image();

      image.onload = () => {
        const width = image.width;
        const height = image.height;
        this.addImage(imageUrl, width, height);
      }

      image.src = imageUrl;
    }
    reader.readAsDataURL(file);
  }

  public addImage(imageUrl: any, width: any, height: any) {
    this.mapCenter = this.map.getView().getCenter();

    this.sourceImage = new sourceGeoImage({
      url: imageUrl,
      imageCenter: this.mapCenter,
      imageScale: [1, 1],
      imageRotate: this.startangle,
      projection: 'EPSG:3857',
    });

    this.imageLayer = new layerGeoImage({
      name: "Georef",
      opacity: 1,
      source: this.sourceImage,
    });

    this.map.addLayer(this.imageLayer);

    // Create a polygon geometry from the extent
    const polygon = fromExtent(this.imageLayer.getExtent());

    // Create a feature from the polygon geometry
    const feature = new Feature({
      geometry: polygon
    })
    this.imageVectorLayer = new VectorLayer({
      source: new VectorSource({
        features: [feature],
      }),
      displayInLayerSwitcher: false
    } as any);

    this.map.addLayer(this.imageVectorLayer);
    this.map.addInteraction(this.selectInteraction);
  }

  ///

  public endInteraction = (e: any) => {
    this.sourceImage.setRotation(this.endangle);
    //setDrawFeature(e.features.getArray()[0]);
    // setRectCoordinates(e.features.getArray()[0].getGeometry().getCoordinates()[0]);   
  }


  public imageRotate = (event: any) => {
    const angle = this.startangle - event.angle;
    this.endangle = angle;
    event.feature.set('angle', angle);
    this.sourceImage.setRotation(angle);
  }

  public setAngle = (e: any) => {
    // Rotation
    this.startangle = e.feature.get('angle') || 0;
    // radius
    this.startRadius = e.feature.get('radius') || 10;
    // Translation
    // this.d = [0, 0];
  }

  public setTranslate = (e: any) => {
   
    // this.d[0] += e.delta[0];
    // this.d[1] += e.delta[1];
    this.mapCenter[0] += e.delta[0];
    this.mapCenter[1] += e.delta[1];
    this.sourceImage.setCenter(this.mapCenter);

    //   if (this.firstPoint) {
    //      this.selectInteraction.setCenter(e.features.getArray()[0].getGeometry().getFirstCoordinate());      
    // }
  }

  private setScaling = (e: any) => {

    this.sourceImage.setScale([e.scale[0], e.scale[0]]);
    console.log("scale: ", e.scale[1], e.scale[0]);

    // if (this.firstPoint) {
    //   this.selectInteraction.setCenter(e.features.getArray()[0].getGeometry().getFirstCoordinate());
    // }
    // if (e.features.getLength() === 1) {
    //   var feature = e.features.item(0);
    //   feature.set('radius', this.startRadius * Math.abs(e.scale[0]));
    // }    
  }

  ////

  private addFeatureGroupLayers() {

    this.polygonsLayer = new Feature();
    this.lineStringsLayer = new Feature();
    this.polygonVectorLayer = new VectorLayer({
      source: new VectorSource({
        features: [this.polygonsLayer],
      }),
      displayInLayerSwitcher: false
    } as any);

    this.lineVectorLayer = new VectorLayer({
      source: new VectorSource({
        features: [this.lineStringsLayer],
      }),
      displayInLayerSwitcher: false
    } as any);

    this.map?.addLayer(this.polygonVectorLayer);
    this.map?.addLayer(this.lineVectorLayer);
    this.map?.addInteraction(new Snap({ source: this.polygonVectorLayer.getSource() }));
  }
  currentlySubdividingParcel = null;
  drawnLineStrings = [];
  sudbdividedParcels = [];
  newLineStrings = [];
  
  setSubdividingParcel = (parcel) => {
    this.currentlySubdividingParcel = parcel;
    this.drawnLineStrings = [];
    this.sudbdividedParcels = null;
    this.newLineStrings = null;
    this.renderGeoJsonPolygon(parcel);
  }

  // return this.http.post<Polygon[]>(`${url}/api/subdivision`, { polygons: parcelsToSubdivide, lineStrings: [...surveyLines, surveyLineOrPolygon] }).pipe(
  // 	filter(res => res.length > 1),
  // 	tap(res => {
  // 		if (res.length < 2 || res.length === parcelsToSubdivide.length) return;
  // 		this.updateSubdivision(res);
  // 		this.subdivisionStateStore.addSurveyGeometry(surveyLineOrPolygon);
  // 	})
  // );

  subdivide = (geoJson: any) => {
    // this.http.post<any[]>('http://localhost:8080/api/subdivision', {
    //   polygons: this.sudbdividedParcels!=null?this.sudbdividedParcels:[this.currentlySubdividingParcel],
    //   lineStrings: [geoJson]
    // })
    // .pipe(
    //   filter(res => {
    //     return res.length >= 2 && res.length > this.sudbdividedParcels.length;
    //   })
    // )
    // .subscribe(res => {
    //   console.log(res);
    //   this.sudbdividedParcels = res;
    //   this.newLineStrings = res;
    //   this.drawnLineStrings.push(geoJson);
    //   this.renderTurfPolygons(this.sudbdividedParcels);

    //   console.log({
    //     originalParcel: this.currentlySubdividingParcel,
    //     dividingLines: this.drawnLineStrings,
    //     subdivisionResult: this.sudbdividedParcels
    //   })
    // })
  }

  stopDrawingInteraction() {
    if (this.drawInteractionRef) {
      this.map?.removeInteraction(this.drawInteractionRef);
      this.drawInteractionRef = null;
    }
  }

  startDrawingInteraction = (geometryType: string, onDrawSuccessCallback: (geJson: any) => any, outputFormat: 'GeoJSON' | 'WKT' = 'WKT') => {
    if (this.drawInteractionRef) {
      this.map?.removeInteraction(this.drawInteractionRef);
      this.drawInteractionRef = null;
    }
    const vectorSource = new VectorSource();
    if (!this.drawInteractionRef) {
      this.drawInteractionRef = new Draw({
        source: vectorSource,
        type: geometryType as any,
      });
      this.map?.addInteraction(this.drawInteractionRef);
      this.map?.addInteraction(new Snap({ source: this.polygonVectorLayer.getSource() }));
      this.map.on('click', (event: any) => {
        console.log(event.coordinate);
      });
      this.drawInteractionRef.on('drawend', (event: any) => {
        const feature = event.feature;
        const drawnGeometry = feature.getGeometry();
        console.log(drawnGeometry);
        let coordinates = null;
        if (feature.getGeometry()?.getType() === 'Circle') {
          const center = drawnGeometry?.getCenter();
          const radius = drawnGeometry?.getRadius();
          coordinates = [center[0], center[1], radius];
        } else {
          coordinates = drawnGeometry?.getCoordinates();
        }
        if (outputFormat === 'GeoJSON') {
          const geoJson = JSON.parse(new GeoJSON().writeFeature(feature));
          console.log(geoJson?.geometry)
          onDrawSuccessCallback(geoJson?.geometry);
          // this.renderTurfLineStrings([geoJson?.geometry]);
          return;
        }
      }); 

    }
    return;

  }
  fitMapToPolygonFeaturesBounds(features: any[]) {
    const polygons = features.map(feature => buildPolygonFromFeature(feature));
    const mapBounds = polygons.reduce((bounds, polygon) => {
      return extend(bounds, polygon.getExtent());
    }, polygons?.[0]?.getExtent().slice());
    this.fitBounds(mapBounds);
  }

  public fitBounds(boundingBox: any) {
    const view = this.map?.getView();
    view?.fit(boundingBox, { nearest: true });
  }
  public renderPolygonsAsFeatures(polygons: Feature<Polygon>[], options?: any) {
    this.renderPolygonsAsFeature(polygons, options);
  }
  public renderLineStringsAsFeatures(polygons: Feature<LineString>[], options?: any) {
    this.renderLineStringsAsFeature(polygons, options);
  }

  // eslint-disable-next-line unused-imports/no-unused-vars, @typescript-eslint/no-empty-function, no-empty-function
  public renderPolygonsAsFeature(features: Feature<Polygon>[] | Feature<Polygon>, options?: any) {
    if (!features) { return; }
    const polgonStyle = this.getDefaultPolygonStyle();
    const style = options?.style || polgonStyle;
    const layer = options?.layer || this.polygonsLayer;
    if (!layer) { return; }
    if (Array.isArray(features)) {
      const polygons: any[] = features.map(feature => buildPolygonFromFeature(feature));
      layer.setGeometry(new MultiPolygon(polygons));
      layer.setStyle(style);
    } else {
      const polygon: any = buildPolygonFromFeature(features);
      layer.setGeometry(polygon);
      layer.setStyle(style);
    }
  }
  public renderLineStringsAsFeature(features: Feature<LineString>[] | Feature<LineString>, options?: any) {
    if (!features) { return; }
    const lineStringStyle = this.getDefaultLineStringStyle();
    const style = options?.style || lineStringStyle;
    const layer = options?.layer || this.lineStringsLayer;
    if (!layer) { return; }
    if (Array.isArray(features)) {
      const polygons: any[] = features.map(feature => buildLineStringFromFeature(feature));
      layer.setGeometry(new MultiLineString(polygons));
      layer.setStyle(style);
    } else {
      const line: any = buildLineStringFromFeature(features);
      layer.setGeometry(line);
      layer.setStyle(style);
    }
  }
  private getPolygonStyle(color: string) {
    const fillOpacity = 0.3;
    const fillColor = color;
    const fillColorArray = asArray(fillColor);
    fillColorArray[3] = fillOpacity;
    return new Style({
      fill: new Fill({
        color: fillColorArray,
      }),
      stroke: new Stroke({
        color: color,
        width: 2
      })
    });
  }
  private getLineStringStyle(color: string) {
    const fillOpacity = 0.3;
    const fillColor = color;
    const fillColorArray = asArray(fillColor);
    fillColorArray[3] = fillOpacity;
    return new Style({
      // fill: new Fill({
      //   color: fillColorArray,
      // }),
      stroke: new Stroke({
        color: color,
        width: 2
      })
    });
  }

  private getDefaultPolygonStyle() {
    return this.getPolygonStyle('dodgerblue');
  }

  private getDefaultLineStringStyle() {
    return this.getLineStringStyle('red');
  }

  public renderGeoJsonPolygon(polygon: any) {
    const feature = {
      geometry: polygon,
      type: 'Feature',
    } as unknown as Feature<Polygon>;
    this.renderPolygonsAndFitMapToPolygonsBounds([feature]);
  }
  public renderTurfPolygons(polygons: any[]) {
    const features = polygons.map(polygon => {
      return {
        geometry: polygon,
        type: 'Feature'
      } as unknown as Feature<Polygon>;
    });
    this.renderPolygonsAsFeatures(features);
  }
  public renderTurfLineStrings(lineStrins: any[]) {
    const features = lineStrins.map(line => {
      return {
        geometry: line,
        type: 'Feature'
      } as unknown as Feature<LineString>;
    });
    this.renderLineStringsAsFeatures(features);
  }
  public renderPolygonsAndFitMapToPolygonsBounds(parcels: Feature<Polygon>[], options?: any) {
    try {
      console.log(parcels);
      this.renderPolygonsAsFeature(parcels, options);
      this.fitMapToPolygonFeaturesBounds(parcels);
    } catch (e) { console.error(e); }
  }
}

export function buildPolygonFromFeature(polygon: any): Polygon {
  return new Polygon((polygon?.geometry?.coordinates));
}

export function buildLineStringFromFeature(lineString: any): LineString {
  return new LineString((lineString?.geometry?.coordinates));
}