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
  ImagePoint, MapPoint, ImageTransform, undoPoint,
  createBar, lineStringControl, polygonControl, redoControlButton, resetControl, revertControlButton, saveControlButton,
  coordinateControl,
  dragControl,
  scaleControl,
  rotateControl,
  rockControl,
  resetImage,
  transparentControl,
  removeControl,
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
import LayerSwitcher from 'ol-ext/control/LayerSwitcher';

import Point from 'ol/geom/Point';
import { Circle } from 'ol/style';
import { GeoReference } from './georeference';
import { GeoAffine } from './geoaffine';
import OverviewMap from 'ol/control/OverviewMap';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss', ]
  
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
  mapPointsFeatures: any[] = [];
  imgPoints: any[] = [];
  imgPointsFeatures: any[] = [];

  vectorLayer: VectorLayer<any>;;
  vectorSource: VectorSource;
  imageVectorySource: VectorSource;
  overviewMapControl = null;

  isImgPoint = false;
  isMapPoint = false;
  isTransform = false;

  transformHelmert: any;
  transformAffine: any;

  saveButton = null;
	resetButton = null;
	drawPolygonButton = null;
	drawLineStringButton = null;
	undoButton = null;
	redoButton = null;
	disableBtn = 'ol-disable';
	freezeButtonState = false;
	coordinateSection = null;

  imgMoveButton = null;
  imgScaleButton = null;
  imgRotateButton = null;
  imgLockButton = null;
  imgFreeRotateButton = null;
  imageResetButton = null;
  imgTranparentButton = null;
  imgRemoveButton = null;

  imageOriginWidth = 0;
  imageOriginHeight = 0;

  preMapCenter:  [0, 0];

  drawFeature = null;

  ngOnInit() {
    this.initMap();
  }

  getParcelControls() {
    return parcels.map((parcel, index) => {
      return new SetSubdividingParcelControl(index, () => this.setSubdividingParcel(parcel));
    })
  }

  initMap =()=> {
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
    this.overviewMapControl = new OverviewMap({
      
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      target: "mapOverview",
      collapsed: false,
    });

    this.map = new Map({
      controls: defaultControls().extend([
        // new DrawLineStringControl({}, this.toggleLineStringDraw), 
        new DrawPolygonControl({}, this.togglePolygonDraw), 
        new ImageLoadControl({}, this.toggleImageLoad),
        new MapPoint({}, this.toggleMapPoint),
        new ImagePoint({}, this.toggleImagePoint),
        new undoPoint({}, this.undo),
        new ImageTransform({}, this.toggleImageTransform),
        this.overviewMapControl
        ]),
      layers: [
        new TileLayer({ source: new OSM() }),
        this.vectorLayer,
      ],
      target: 'map',
      view: new View({
        // center: [-115.354, 51.0903],
        zoom: 14,
        // center: [274770, 6243929],
        center: [276319.50657413655, 6248585.696619335],
        projection: 'EPSG:3857'
      }),
    });

    // Create a layer switcher control
    var layerSwitcher = new LayerSwitcher({
      tipLabel: 'map-layerSwitcher', // Optional label for the button
      target: 'map-layerSwitcher',
      className: 'map-layerSwitcher',
      minibar: true
    });

    // Add the layer switcher control to the map
    this.map?.addControl(layerSwitcher);
    
    // Initialize the select interaction
    this.selectInteraction = new Transform_ext({
      enableRotatedTransform: false,
      addCondition: shiftKeyOnly as any,
      hitTolerance: 2,
      translateFeature: false,
      scale: true,
      rotate: false,
      keepAspectRatio: always as any,
      // keepAspectRatio: undefined,
      translate: false,
      keepRectangle: false,
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
    this.selectInteraction.on (['select'], this.selectFeature);
    

    this.map.on('click', (event: any) => {
      console.log(event.coordinate);
      this.addPoint(event.coordinate);
    });
    
    this.transformHelmert = new GeoReference();
    this.transformAffine = new GeoAffine();

    this.addSubdivisionTools();

  }

  selectFeature = (e) => {
    console.log('iii');
    if (e.features && e.features.getLength()) {
      // console.log('iii-1');
      // // this.selectInteraction.setCenter(e.features.getArray()[0].getGeometry().getFirstCoordinate());
      // var interiorPoint = e.features.getArray()[0].getGeometry().getInteriorPoint().getCoordinates();
      // // this.mapCenter = [interiorPoint[0], interiorPoint[1]];    
  
      // this.selectInteraction.setCenter([interiorPoint[0], interiorPoint[1]]);
    }
  }

  addSubdivisionTools() {
    this.imgMoveButton = dragControl('drage Image', (active:boolean) => this.imgMove(active) );
    this.imgScaleButton = scaleControl('Scale Image', (active:boolean) => this.imgScale(active) );
    this.imgRotateButton = rotateControl('Rotate Image', (active:boolean) => this.imgRotate(active) );

    this.imageResetButton = resetImage('Free Rotate Image', (active:boolean) => this.resetImage() );
    this.imgLockButton = rockControl('Lock Image', (active:boolean) => this.imgRock(active) );
    this.imgTranparentButton = transparentControl('make Image Transparents', (active:boolean) => this.imgTransparents(active) );
    this.imgRemoveButton = removeControl('Remove Image', (active:boolean) => this.imgRemove(active) );
		const mainbar = createBar([this.imgMoveButton, this.imgScaleButton, this.imgRotateButton, this.imgLockButton, this.imgTranparentButton, this.imageResetButton, this.imgRemoveButton]);
		mainbar.setPosition('top');
		this.map?.addControl(mainbar);
		// this.disable([this.resetButton, this.saveButton, this.undoButton, this.redoButton]);
	}

  imgMove(active:boolean) {
    console.log('move', active);
    // this.selectInteraction.set('translateFeature', active);
    this.setImageSetting(active, false, false, false);
  }

  imgRock(active: boolean) {    
    if(active) this.selectInteraction.set('translateFeature', false);
    else this.selectInteraction.set('translateFeature', false);
  }

  imgScale(active :boolean) {
    console.log('imgScale', active);
    this.setImageSetting(false, active, false, false);
  }

  imgRotate(active : boolean) {
    console.log('img Rotate', active);
    // this.selectInteraction.set('rotate', active);
    this.setImageSetting(false, false, active, false);
  }

  imgFreeRotate(active : boolean) {
    console.log('free img Rotate', active);
  }

  imgTransparents(active:boolean) {
    if (active) {
      this.imageLayer.setOpacity(0.1);
    } else {
      this.imageLayer.setOpacity(1);
    }
  }

  imgRemove=(active : boolean)=>{
      this.imgPoints = [];      
      this.imgPointsFeatures.forEach((feature)=>{
        this.imageVectorySource.removeFeature(feature);
      });
      this.imgPointsFeatures = [];      
  
      this.mapPoints = [];
      const lastFeature = this.mapPointsFeatures[this.mapPointsFeatures.length - 1];
      this.mapPointsFeatures.forEach((feature)=>{
        this.vectorSource.removeFeature(feature);
      })
      this.mapPointsFeatures = [];
      this.removeImageLayer();
      this.hidenImageToolbar();
      
  }

  setImageSetting(moveActive: boolean, scaleActive: boolean, rotateActive: boolean, rockActive: boolean, ) {
    
    this.selectInteraction.set('rotate', rotateActive);
    this.selectInteraction.set('translateFeature', moveActive);
    this.selectInteraction.set('scale', scaleActive);    
    // this.selectInteraction.set('keepAspectRatio', always);
    
    if (scaleActive) this.selectInteraction.set("keepAspectRatio", always);
    else this.selectInteraction.set("keepAspectRatio", function(e:any){ return e.originalEvent.shiftKey });
    this.selectInteraction.set('translate', this.selectInteraction.get('translate'));
  }

  showImageToolbar() {
    // angular.element()
    const toolbar = document.getElementsByClassName('image-tool-bar') as any;
    toolbar[0].style.display = 'block';    
  }
  
  hidenImageToolbar() {
    const toolbar = document.getElementsByClassName('image-tool-bar') as any;
    toolbar[0].style.display = 'none';
    // const input = document.getElementById("input-imageFile") as any;
    //   // console.log(input)
    //   // input.files = '';
    //   input[0].value = "00000";
  }

  moveImageToolbar(x,y) {

  }

  undo=()=> {
    if (this.isImgPoint) this.undoImagePoint();
    else if(this.isMapPoint) this.undoMapPoint();
  }

  undoImagePoint=()=> {
    this.imgPoints.pop();
    const lastFeature = this.imgPointsFeatures[this.imgPointsFeatures.length - 1];
    this.imageVectorySource.removeFeature(lastFeature);
    this.imgPointsFeatures.pop();
  }

  undoMapPoint=()=> {
    this.mapPoints.pop();
    const lastFeature = this.mapPointsFeatures[this.mapPointsFeatures.length - 1];
    this.vectorSource.removeFeature(lastFeature);
    this.mapPointsFeatures.pop();

  }

  redo() {

  }

  reset(){

  }

  saveSubdivision(){

  }

  disable(buttons: Array<any>): void {
		if (!buttons?.length || this.freezeButtonState) return;
		buttons?.forEach((data) => { if (data?.element) data?.element?.classList?.add(this.disableBtn); });
	}
	enable(buttons: Array<any>): void {
		if (!buttons?.length || this.freezeButtonState) return;
		buttons?.forEach((data) => { if (data?.element) data?.element?.classList?.remove(this.disableBtn); });
	}

  addPoint = (coordinate: [number, number]) => {
    //this.vectorSource.clear(); // Clear previous points

    if (this.isImgPoint) {
      if (this.imageVectorySource) { 
        const feature = new Feature(new Point(coordinate));
        this.imgPointsFeatures.push(feature);
        this.imageVectorySource.addFeature(feature); // Add a new point feature
        this.imgPoints.push(coordinate);
      }
    }
    else if (this.isMapPoint) {
      const feature = new Feature(new Point(coordinate));
      this.mapPointsFeatures.push(feature);
      this.vectorSource.addFeature(feature); // Add a new point feature
      this.mapPoints.push(coordinate);
    } else if (this.isTransform) {
      var transformCenter = this.transformHelmert.transform(coordinate);
      // var transformCenter = this.transformAffine.transform(coordinate);
      console.log('transform', transformCenter);
      const feature = new Feature(new Point(transformCenter));
      this.vectorSource.addFeature(feature);
    }
  }

  toggleMapPoint = () => {
    this.map.removeInteraction(this.selectInteraction);
    this.isMapPoint = true;
    this.isImgPoint = false;
  }

  toggleImagePoint = () => {
    this.map.removeInteraction(this.selectInteraction);
    this.isMapPoint = false;
    this.isImgPoint = true;
  }
  calculateCentroid = (vertices: number[][]) : number[] => {
    const centroid = vertices.reduce((acc, vertex) => {
      acc[0] += vertex[0];
      acc[1] += vertex[1];
      return acc;
    }, [0, 0]);

    centroid[0] /= vertices.length;
    centroid[1] /= vertices.length;

    return centroid;
  }



  toggleImageTransform = () => {
    this.isImgPoint = false;
    this.isMapPoint = false;

    this.transformHelmert.setControlPoints(this.imgPoints, this.mapPoints);
    

    var sc = this.transformHelmert.getScale();
		var a = this.transformHelmert.getRotation();
    console.log("angle", a);
    console.log("scale Affin", sc);
		// var t = this.transformHelmert.getTranslation();
    var center = this.sourceImage.getCenter();    
    var transformCenter = this.transformHelmert.transform(center);

    // geoimage size
    
    const imgWidth = this.sourceImage.getGeoImage().width;
    const imgHeight = this.sourceImage.getGeoImage().height;
    
    const imageurl = this.sourceImage.getGeoImage();
    const extent = this.sourceImage.getExtent();
        

    // const scaleX = polygonWidth * sc[0]  / imgWidth;
    // const scaleY = polygonHeight * sc[1] / imgHeight;


    const polygonCoords = this.drawFeature;


    // for helmert
    var newCoords = polygonCoords.map((coord) => {
      return this.transformHelmert.transform(coord);
    });

    this.vectorSource.addFeature(new Feature(new Point(newCoords[0])));
    this.vectorSource.addFeature(new Feature(new Point(newCoords[1])));
    this.vectorSource.addFeature(new Feature(new Point(newCoords[2])));
    this.vectorSource.addFeature(new Feature(new Point(newCoords[3])));
    var newHeight = this.getLengthPoints(newCoords[0], newCoords[1]);
    var newWidth = this.getLengthPoints(newCoords[0], newCoords[3]);
    var polygonHeight = this.getLengthPoints(polygonCoords[0], polygonCoords[1]);
    var polygonWidth = this.getLengthPoints(polygonCoords[0], polygonCoords[3]);
    
    var scaleX = newHeight / imgWidth;
    var scaleY = newWidth / imgHeight;
    console.log("new scale: ", scaleX, scaleY);

    scaleX = polygonWidth * sc[1]  / imgWidth;
    scaleY = polygonHeight * sc[0] / imgHeight;
    console.log("scale: ", scaleX, scaleY);
    // var imageCenter = this.calculateCentroid(newCoords);
    if (a) this.sourceImage.setRotation(this.endangle + a);

    // if (sc) this.sourceImage.setScale(sc);
    this.sourceImage.setScale([scaleX, scaleY]);
    this.sourceImage.setCenter(transformCenter);
    this.imageLayer.setOpacity(0.5);
    this.isTransform = true;
    this.vectorSource.clear();
    this.imageVectorySource.clear();
    return;  
  }

  toggleImageTransform1 = () => {
    this.isImgPoint = false;
    this.isMapPoint = false;

    this.transformHelmert.setControlPoints(this.imgPoints, this.mapPoints);
    this.transformAffine.setControlPoints(this.imgPoints, this.mapPoints);
    // reprevious
    // var sc = this.transformHelmert.getScale();
		// var a = this.transformHelmert.getRotation();
		// // var t = this.transformHelmert.getTranslation();
    // var center = this.sourceImage.getCenter();    
    // var transformCenter = this.transformHelmert.transform(center);

    // console.log("---helmert---")
    // console.log(this.transformHelmert.getRotation());

    // console.log(this.transformHelmert.getScale());
    // var HelmertScale = this.transformHelmert.getScale();
    // var HelmertRotate = this.transformHelmert.getRotation()
    // console.log("------------")

    var sc = this.transformAffine.getScale();
		var a = this.transformAffine.getRotation();
    console.log("angle", a);
    console.log("scale Affin", sc);
		// var t = this.transformHelmert.getTranslation();
    var center = this.sourceImage.getCenter();    
    var transformCenter = this.transformAffine.transform(center);

    // geoimage size
    
    const imgWidth = this.sourceImage.getGeoImage().width;
    const imgHeight = this.sourceImage.getGeoImage().height;
    
    const imageurl = this.sourceImage.getGeoImage();
    const extent = this.sourceImage.getExtent();
        

    // // Replace 'path/to/your/image.jpg' with the actual path to your image
    const img = new Image();


    img.onload = () => {

      console.log('create new canvas')

      // Create a new canvas element
      const rotatedCanvas = document.createElement('canvas');
      const rotatedCtx = rotatedCanvas.getContext('2d');

      // Set the size of the rotated canvas
      rotatedCanvas.width = img.width*2;
      rotatedCanvas.height = img.height*2;

      // rotatedCanvas.height = Math.abs(extent[1]-extent[3]);
      // rotatedCanvas.width = Math.abs(extent[0]-extent[2]);

      const centerX = rotatedCanvas.width / 2;
      const centerY = rotatedCanvas.height / 2;

      // Rotate the canvas by 45 degrees
      rotatedCtx.translate(centerX, centerY);
      // rotatedCtx.rotate(this.sourceImage.getRotation()); // Rotate by 45 degrees
      // const scale = this.sourceImage.getScale();
      // rotatedCtx.scale(scale[0], scale[1]);
      const coef = this.transformAffine.getMatrix();

      rotatedCtx.transform(coef[0], coef[1], 0, coef[3], coef[4], 0);
      rotatedCtx.translate(-centerX, -centerY);

      
          // Draw the rotated image onto the rotated canvas
          rotatedCtx.drawImage(img, (rotatedCanvas.width - img.width) / 2, (rotatedCanvas.height - img.height) / 2);

      // Get the rotated image as a data URL
      const rotatedImageUrl = rotatedCanvas.toDataURL('image/png'); // You can change the format as needed

      // Use the rotated image URL as needed
      console.log(rotatedImageUrl);
      this.addImage(rotatedImageUrl, rotatedCanvas.width, rotatedCanvas.height);
    }
    img.src = imageurl.src;






    // const scaleX = polygonWidth * sc[0]  / imgWidth;
    // const scaleY = polygonHeight * sc[1] / imgHeight;


    const polygonCoords = this.drawFeature;


    // for helmert
    // var newCoords = polygonCoords.map((coord) => {
    //   return this.transformHelmert.transform(coord);
    // });
    // this.vectorSource.addFeature(new Feature(new Point(newCoords[0])));
    // this.vectorSource.addFeature(new Feature(new Point(newCoords[1])));
    // this.vectorSource.addFeature(new Feature(new Point(newCoords[2])));
    // this.vectorSource.addFeature(new Feature(new Point(newCoords[3])));
    // var newHeight = this.getLengthPoints(newCoords[0], newCoords[1]);
    // var newWidth = this.getLengthPoints(newCoords[0], newCoords[3]);
    // var polygonWidth = this.getLengthPoints(polygonCoords[0], polygonCoords[1]);
    // var polygonHeight = this.getLengthPoints(polygonCoords[0], polygonCoords[3]);
    
    // var scaleX = newHeight / imgWidth;
    // var scaleY = newWidth / imgHeight;
    // console.log("new scale: ", scaleX, scaleY);

    // scaleX = polygonWidth * HelmertScale[1]  / imgWidth;
    // scaleY = polygonHeight * HelmertScale[0] / imgHeight;
    // console.log("scale: ", scaleX, scaleY);
    // var imageCenter = this.calculateCentroid(newCoords);
    // if (a) this.sourceImage.setRotation(this.endangle + HelmertRotate);

    // // if (sc) this.sourceImage.setScale(sc);
    // this.sourceImage.setScale([scaleX, scaleY]);
    // this.sourceImage.setCenter(transformCenter);
    // this.imageLayer.setOpacity(0.5);
    // return;
    // for affine

    
    var newCoords = polygonCoords.map((coord) => {
      return this.transformAffine.transform(coord);
    });

    this.vectorSource.addFeature(new Feature(new Point(newCoords[0])));
    this.vectorSource.addFeature(new Feature(new Point(newCoords[1])));
    this.vectorSource.addFeature(new Feature(new Point(newCoords[2])));
    this.vectorSource.addFeature(new Feature(new Point(newCoords[3])));

    var newHeight = this.getLengthPoints(newCoords[0], newCoords[1]);
    var newWidth = this.getLengthPoints(newCoords[0], newCoords[3]);
    var polygonWidth = this.getLengthPoints(polygonCoords[0], polygonCoords[1]);
    var polygonHeight = this.getLengthPoints(polygonCoords[0], polygonCoords[3]);
    
    var scaleX = newHeight / imgWidth;
    var scaleY = newWidth / imgHeight;
    console.log("new scale: ", scaleX, scaleY);

    scaleX = polygonWidth * sc[1]  / imgWidth;
    scaleY = polygonHeight * sc[0] / imgHeight;
    console.log("scale: ", scaleX, scaleY);
    var imageCenter = this.calculateCentroid(newCoords);

    // get angular for rotating

    var oldCentroid = this.calculateCentroid(polygonCoords.slice(0, 4));
    var newCentroid = this.calculateCentroid(newCoords.slice(0, 4));

    var angle = Math.atan2(newCentroid[1], newCentroid[0]) - Math.atan2(oldCentroid[0], oldCentroid[0]);
    console.log('feature angular ', angle)
    this.vectorSource.addFeature(new Feature(new Point(imageCenter)));

    // this.sourceImage.setRotation(this.endangle + angle);
    if (a) this.sourceImage.setRotation(this.endangle + angle);

    // if (sc) this.sourceImage.setScale(sc);
    this.sourceImage.setScale([scaleX, scaleY]);
    this.sourceImage.setCenter(transformCenter);
    // this.vectorSource.clear();
    // this.imageVectorySource.clear();
    this.imageLayer.setOpacity(0.5);
    this.isTransform = true;

    console.log(sc, a);

  }


  toggleLineStringDraw = () => {   
    
    this.map.removeInteraction(this.selectInteraction);
  }

  togglePolygonDraw = () => {
    this.resetImage();
    let doc = document.getElementsByClassName('image-tool-bar') as any;
    doc[0].style.top = "100px";
    console.log(doc);   
    this.showImageToolbar()
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
    console.log('file')
    this.removeImageLayer();
    const file = event.target.files[0];
    console.log(file);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const imageUrl = e.target.result;     

      this.map.removeLayer(this.imageLayer);
      const image = new Image();
      
      image.onload = () => {
        const width = image.width;
        const height = image.height;
        this.imageOriginWidth = width;
        this.imageOriginHeight = height;
        // const resizedDataUrl = this.resizeImage(image, 200, 10);
        this.addImage(imageUrl, width, height);
      }

      image.src = imageUrl;
    }
    reader.readAsDataURL(file);
  }

  resetImage=()=> {

    this.mapCenter = this.preMapCenter;
  
    this.scale = [1, 1];
    this.startangle = 0;
    this.sourceImage.setCenter(this.preMapCenter);
    this.sourceImage.setScale(this.scale);
    this.sourceImage.setRotation(this.startangle);
    this.map.removeLayer(this.imageVectorLayer);    
    this.map.removeInteraction(this.selectInteraction);
    this.imageVectorLayer = null;
    this.imageVectorySource = null;

    const tmpextent = this.imageLayer.getExtent();
    
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
    });

    this.drawFeature = feature.getGeometry().getCoordinates()[0];

    this.imageVectorySource = new VectorSource({
      features: [feature],
    });

    this.imageVectorLayer = new VectorLayer({
      source: this.imageVectorySource,
      projection: 'EPSG:3857',
      displayInLayerSwitcher: false
    } as any);

    this.map.addLayer(this.imageVectorLayer);
    this.map.addInteraction(this.selectInteraction);

  }

  public addImage=(imageUrl: any, width: any, height: any)=> {
    this.mapCenter = this.map.getView().getCenter();
    this.preMapCenter = this.map.getView().getCenter();
    
    this.scale = [0.5, 0.5];
    this.startangle = 0;

    this.sourceImage = new sourceGeoImage({
      url: imageUrl,
      imageCenter: this.mapCenter,
      imageScale: this.scale,
      imageRotate: this.startangle,      
      // 
      
    });

    this.imageLayer = new layerGeoImage({
      name: "Georef",
      opacity: 1,
      source: this.sourceImage, 
      projection: 'EPSG:3857',
    });

    this.map.addLayer(this.imageLayer);
    
    const tmpextent = this.imageLayer.getExtent();
    
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
    });
    this.drawFeature = feature.getGeometry().getCoordinates()[0];


    this.imageVectorySource = new VectorSource({
      features: [feature],
      wrapX: false
    });

    this.imageVectorLayer = new VectorLayer({
      source: this.imageVectorySource,
      projection: 'EPSG:3857',
      displayInLayerSwitcher: false
    } as any);

    this.map.addLayer(this.imageVectorLayer);
    this.map.addInteraction(this.selectInteraction);
    this.selectInteraction.set('translate', this.selectInteraction.get('translate'));
    this.showImageToolbar();
  }

  ///

  public endInteraction = (e: any) => {
    this.drawFeature = e.features.getArray()[0].getGeometry().getCoordinates()[0];
    }


  public imageRotate = (event: any) => {
    const angle = this.startangle - event.angle;
    this.endangle = angle;
    event.feature.set('angle', angle);
    this.sourceImage.setRotation(angle);
    this.drawFeature = event.features.getArray()[0].getGeometry().getCoordinates()[0];
    }

  public setAngle = (e: any) => {    
    
    // // Rotation
    // this.startangle = e.feature.get('angle') || 0;
    // console.log(this.startangle)
    // // radius
    // this.startRadius = e.feature.get('radius') || 10;
    // // Translation
  }

  public setTranslate = (e: any) => {
    this.mapCenter[0] += e.delta[0];
    this.mapCenter[1] += e.delta[1];
    this.sourceImage.setCenter(this.mapCenter);
    this.drawFeature = e.features.getArray()[0].getGeometry().getCoordinates()[0];
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

    const polygonFeature = e.features.getArray()[0].getGeometry().getCoordinates()[0];
    this.drawFeature = e.features.getArray()[0].getGeometry().getCoordinates()[0];
    const polygonHeight = this.getLengthPoints(polygonFeature[0], polygonFeature[1]);
    const polygonWidth = this.getLengthPoints(polygonFeature[0], polygonFeature[3]);

    // geoimage size
    const imgWidth = this.sourceImage.getGeoImage().width;
    const imgHeight = this.sourceImage.getGeoImage().height;
    
    const scaleX = polygonWidth / imgWidth;
    const scaleY = polygonHeight / imgHeight;

    var interiorPoint = e.features.getArray()[0].getGeometry().getInteriorPoint().getCoordinates();
    this.mapCenter = [interiorPoint[0], interiorPoint[1]];    

    this.sourceImage.setCenter(this.mapCenter);
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

  removeImageLayer = () => {

    this.map.removeLayer(this.imageVectorLayer);    
    this.map.removeInteraction(this.selectInteraction);
    this.imageVectorLayer = null;
    this.imageVectorySource = null;

    this.map.removeLayer(this.imageLayer);
    this.imageLayer = null;
    this.sourceImage = null;

    this.scale = [1, 1];
    this.startangle = 0;
    this.preMapCenter = [0, 0];
    this.mapPoints = [];
    this.imgPoints = [];
    this.mapPointsFeatures = [];
    this.imgPointsFeatures = [];
  }



  subdivide = (geoJson: any) => {
    
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