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
import { DrawLineStringControl, SetSubdividingParcelControl, DrawPolygonControl, ImageLoadControl,
  ImagePoint, MapPoint, ImageTransform
} from './controls';
import GeoJSON from 'ol/format/GeoJSON.js';
import { asArray } from 'ol/color';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import { parcels } from './parcels';
import { HttpClient } from '@angular/common/http';
import { filter } from 'rxjs';


import Transform_ext from 'ol-ext/interaction/Transform';
import layerGeoImage from 'ol-ext/layer/GeoImage';
import sourceGeoImage from 'ol-ext/source/GeoImage';
import { shiftKeyOnly, always } from 'ol/events/condition';
import Point from 'ol/geom/Point';
import { Circle } from 'ol/style';
import { GeoReference } from './georeference';

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
  // scale: [1, 1];
  scale: [number, number] = [1, 1];
  d: [0, 0];

  mapPoints: any[] = [];
  imgPoints: any[] = [];

  vectorLayer: VectorLayer<any>;;
  vectorSource: VectorSource;
  imageVectorySource: VectorSource;

  isImgPoint = false;
  isMapPoint = false;

  transformHelmert: any;

  ngOnInit() {
    this.initMap();
  }

  getParcelControls() {
    return parcels.map((parcel, index) => {
      return new SetSubdividingParcelControl(index, () => this.setSubdividingParcel(parcel));
    })
  }

  initMap() {
    this.vectorSource = new VectorSource();
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      style: new Style({
        image: new Circle({
          radius: 5,
          fill: new Fill({ color: 'red' }),
        }),
      }),
    });

    this.map = new Map({
      controls: defaultControls().extend([
        new DrawLineStringControl({}, this.toggleLineStringDraw), 
        new DrawPolygonControl({}, this.togglePolygonDraw), 
        new ImageLoadControl({}, this.toggleImageLoad),
        new MapPoint({}, this.toggleMapPoint),
        new ImagePoint({}, this.toggleImagePoint),        
        new ImageTransform({}, this.toggleImageTransform),        
        ...this.getParcelControls()]),
      layers: [
        new TileLayer({ source: new OSM() }),
        this.vectorLayer,
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
      enableRotatedTransform: true,
      addCondition: shiftKeyOnly,
      hitTolerance: 2,
      translateFeature: false,
      scale: true,
      rotate: true,
      keepAspectRatio: false,
      translate: true,
      keepRectangle: true,
      stretch: false,
      pointRadius: function (f:any) {
        var radius = f.get('radius') || 10;
        return [radius, radius];
      }
    });

    this.selectInteraction.set('translate', this.selectInteraction.get('translate'));
    this.selectInteraction.on(['rotatestart', 'translatestart', 'scalestart'], this.setAngle);
    this.selectInteraction.on('rotating', this.imageRotate);
    this.selectInteraction.on('translating', this.setTranslate);
    this.selectInteraction.on('scaling', this.setScaling);
    this.selectInteraction.on(['rotateend', 'translateend', 'scaleend'], this.endInteraction);

    this.map.on('click', (event: any) => {
      console.log(event.coordinate);
      this.addPoint(event.coordinate);
    });
    this.transformHelmert = new GeoReference();
  }

  addPoint = (coordinate: [number, number]) => {
    //this.vectorSource.clear(); // Clear previous points

    if (this.isImgPoint) {
      if (this.imageVectorySource) { 
        this.imageVectorySource.addFeature(new Feature(new Point(coordinate))); // Add a new point feature
        this.imgPoints.push(coordinate);
      }
    }
    else if (this.isMapPoint) {
      this.vectorSource.addFeature(new Feature(new Point(coordinate))); // Add a new point feature
      this.mapPoints.push(coordinate);
    }
  }

  toggleMapPoint = () => {
    this.isMapPoint = true;
    this.isImgPoint = false;
  }

  toggleImagePoint = () => {
    this.isMapPoint = false;
    this.isImgPoint = true;
  }

  toggleImageTransform = () => {
    this.isImgPoint = false;
    this.isMapPoint = false;

    this.transformHelmert.setControlPoints(this.imgPoints, this.mapPoints);
    var sc = this.transformHelmert.getScale();
		var a = this.transformHelmert.getRotation();
		// var t = this.transformHelmert.getTranslation();
    var center = this.sourceImage.getCenter();    
    var transformCenter = this.transformHelmert.transform(center);
    if (a) this.sourceImage.setRotation(a);    
    if (sc) this.sourceImage.setScale(sc);
    this.sourceImage.setCenter(transformCenter);
  }

  toggleLineStringDraw = () => {
    
    // this.map.removeLayer(this.imageLayer);
    
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
  resizeImage = (img: any, newWidth, newHeight) => {
    const canvas = document.createElement('canvas');
    // Calculate aspect ratio
    const aspectRatio = img.width / img.height;
    console.log(aspectRatio)
    // If only width or height is provided, calculate the other dimension
    if (newWidth && !newHeight) {
      newHeight = newWidth / aspectRatio;
    } else if (!newWidth && newHeight) {
      newWidth = newHeight * aspectRatio;
    }

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    return canvas.toDataURL();
  }

  // upload image
  toggleImageLoad = (event: any) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const imageUrl = e.target.result;
      

      this.map.removeLayer(this.imageLayer);
      const image = new Image();
      
      image.onload = () => {
        const width = image.width;
        const height = image.height;
        // const resizedDataUrl = this.resizeImage(image, 200, 10);
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
      imageScale: this.scale,
      imageRotate: this.startangle,      
      // projection: 'EPSG:3857',
    });

    console.log(this.sourceImage.getExtent());

    this.imageLayer = new layerGeoImage({
      name: "Georef",
      opacity: 1,
      source: this.sourceImage,
      
    });

    this.map.addLayer(this.imageLayer);
    
    const tmpextent = this.imageLayer.getExtent();
    console.log(tmpextent);

    // Create a polygon geometry from the extent
    // const polygon = fromExtent([tmpextent[1], tmpextent[0], tmpextent[3], tmpextent[2]]);
    const minX = tmpextent[0];
    const minY = tmpextent[1];
    const maxX = tmpextent[2];
    const maxY = tmpextent[3];
    
    const polygon = new Polygon([[
      [minX,    maxY],
      [minX,    minY],
      [maxX,    minY],
      [maxX,    maxY],
      [minX,    maxY],
    ]]);

    // Create a feature from the polygon geometry
    const feature = new Feature({
      geometry: polygon
    })
    this.imageVectorySource = new VectorSource({
      features: [feature],
    });

    this.imageVectorLayer = new VectorLayer({
      source: this.imageVectorySource,
      projection: 'EPSG:3857',
      // style: new Style({
      //   image: new Circle({
      //     radius: 5,
      //     fill: new Fill({ color: 'blue' }),
      //   }),
      // }),
      displayInLayerSwitcher: false
    } as any);

    this.map.addLayer(this.imageVectorLayer);
    this.map.addInteraction(this.selectInteraction);
  }

  ///

  public endInteraction = (e: any) => {
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
  }

  public setTranslate = (e: any) => {
    this.mapCenter[0] += e.delta[0];
    this.mapCenter[1] += e.delta[1];
    this.sourceImage.setCenter(this.mapCenter);
  }

  getLengthPoints(point1: any, point2: any) {
    
    const x1 = point1[0];
    const y1 = point1[1];
    const x2 = point2[0];
    const y2 = point2[1];

    let distance = Math.sqrt((x1-x2)*(x1-x2) + (y2-y1)*(y2-y1));
    
    return distance;
  }

  private setScaling = (e: any) => {
    
    this.scale[0] =  e.scale[0];
    this.scale[1] =  e.scale[1];
    const polygonFeature = e.features.getArray()[0].getGeometry().getCoordinates()[0];

    const polygonHeight = this.getLengthPoints(polygonFeature[0], polygonFeature[1]);
    const polygonWidth = this.getLengthPoints(polygonFeature[0], polygonFeature[3]);

    // geoimage size
    const imgWidth = this.sourceImage.getGeoImage().width;
    const imgHeight = this.sourceImage.getGeoImage().height;
    const scaleX = polygonWidth / imgWidth;
    const scaleY = polygonHeight / imgHeight;

    var interiorPoint = e.features.getArray()[0].getGeometry().getInteriorPoint().getCoordinates();
    var center = [interiorPoint[0], interiorPoint[1]];

    this.sourceImage.setCenter(center);
    this.sourceImage.setScale([scaleX, scaleY]);

    if (e.features.getLength() === 1) {
      var feature = e.features.item(0);
      feature.set('radius', this.startRadius * Math.abs(e.scale[0]));
    }
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
  
  setSubdividingParcel = ( parcel ) => {
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