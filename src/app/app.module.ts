import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { MapComponent } from './map/map.component';
import { HttpClientModule } from '@angular/common/http';
// import { CdkDrag } from '@angular/cdk/drag-drop';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FrameComponentComponent } from './frame-component/frame-component.component';
import { LayerswitcherComponent } from './layerswitcher/layerswitcher.component';
@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    FrameComponentComponent,
    LayerswitcherComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    DragDropModule
],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
