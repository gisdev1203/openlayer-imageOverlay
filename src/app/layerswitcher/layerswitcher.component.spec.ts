import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayerswitcherComponent } from './layerswitcher.component';

describe('LayerswitcherComponent', () => {
  let component: LayerswitcherComponent;
  let fixture: ComponentFixture<LayerswitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LayerswitcherComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LayerswitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
