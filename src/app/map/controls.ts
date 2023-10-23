import { Control } from 'ol/control';
import Bar from 'ol-ext/control/Bar';
import Toggle from 'ol-ext/control/Toggle';

export class CustomActionControl extends Control {
	constructor(options: any, icon: any, tooltip: string, callback: (options: any) => any) {
		const actionElement = document.createElement('button');
		actionElement.innerHTML = `<span title="${tooltip}">${icon}</span>`;

		const element = document.createElement('div');
		element.className = 'custom-control';
		element.appendChild(actionElement);

		super({
			element: element,
			target: options.target,
		});
		actionElement.addEventListener('click', callback);
		const controlId = +this['ol_uid'];
		if(controlId === 6){
			this.element.style.top = '65px';
			return;
		}
		const controlNumber = controlId-6;
		this.element.style.top = ((75+(controlNumber*5)) + (controlNumber * 20)) + 'px';
	}
}

export class CustomActionControl1 extends Control {
	constructor(options: any, icon: any, tooltip: string, callback: (options: any) => any) {
		const actionElement = document.createElement('input');
		actionElement.type = 'file';
		actionElement.id = "input-imageFile";

		const element = document.createElement('div');
		element.className = 'custom-control';
		element.appendChild(actionElement);

		super({
			element: element,
			target: options.target,
		});
		actionElement.addEventListener('change', callback);
		const controlId = +this['ol_uid'];
		if(controlId === 6){
			this.element.style.top = '65px';
			return;
		}
		const controlNumber = controlId-6;
		this.element.style.top = ((75+(controlNumber*5)) + (controlNumber * 20)) + 'px';
	}

}


export class DrawLineStringControl extends CustomActionControl {
	constructor(options: any, callback: (options?: any) => void) {
		super(options, 'Line String', 'Draw Line', callback);
	}
}

export class DrawPolygonControl extends CustomActionControl {
	constructor(options: any, callback: (options?: any) => void) {
		super(options, 'Polygon', 'Draw Polygon', callback);
	}
}

export class SetSubdividingParcelControl extends CustomActionControl {
	constructor(parcelIndex: number, callback: (options?: any) => any) {
		super({}, "Parcel "+(parcelIndex + 1), 'Set Parcel', callback);
	}
}

export class ImageLoadControl extends CustomActionControl1 {
	constructor(options: any, callback: (options?: any) => void) {
		super(options, 'ImageLoad', 'ImageLoad', callback);
	}
}
export class MapPoint extends CustomActionControl {
	constructor(options: any, callback: (options?: any) => void) {
		super(options, 'pick up map', 'map', callback);
	}
}
export class ImagePoint extends CustomActionControl {
	constructor(options: any, callback: (options?: any) => void) {
		super(options, 'pick up image', 'image', callback);
	}
}
export class ImageTransform extends CustomActionControl {
	constructor(options: any, callback: (options?: any) => void) {
		super(options, 'imageTransform', 'transform', callback);
	}
}
export class undoPoint extends CustomActionControl {
	constructor(options: any, callback: (options?: any) => void) {
		super(options, 'undo', 'undo', callback);
	}
}

export const toggleControl = (className: string, iconClass: string, tooltip: string, toggleFn: (active: boolean) => void) => {
	const html = `<i class="${iconClass}" style="cursor: pointer" title="${tooltip || ''}"></i>`;
	return createToggle(html, className, toggleFn);
};
export const lineStringControl = (tooltip: string, toggleFn: (active: boolean) => void) => {
	return toggleControl( 'ol-draw-line-string','fa fa-hand-paper-o',tooltip, toggleFn);
};

export const polygonControl = (tooltip: string, toggleFn: (active: boolean) => void) => {
	return toggleControl('ol-draw-polygon', 'fa fa-hand-paper-o', tooltip, toggleFn);
};
export const subdivisionControl = (tooltip: string, onClickFn: () => void) => {
	return toggleControl('', 'la la-table', tooltip, onClickFn);
};
export const resetControl=(tooltip:string,toggleFn: (active: boolean) => void)=>{
	return toggleControl('', 'la la-refresh', tooltip, toggleFn);
};
/// --------------------------------------
export const dragControl=(tooltip:string, toggleFn: (active: boolean) => void)=>{
	return toggleControl('', 'fa fa-arrows', tooltip, toggleFn);
};
export const scaleControl=(tooltip:string,toggleFn: (active: boolean) => void)=>{
	return toggleControl('', 'fa fa-expand', tooltip, toggleFn);
};
export const rotateControl=(tooltip:string,toggleFn: (active: boolean) => void)=>{
	return toggleControl('', 'fa fa-circle-o-notch', tooltip, toggleFn);
};

export const resetImage = (tooltip: string, clickFn: (event: boolean) => void) => {
	return buttonControl('fa fa-history', tooltip, clickFn);
};
export const rockControl=(tooltip:string,toggleFn: (active: boolean) => void)=>{
	return toggleControl('', 'fa fa-lock', tooltip, toggleFn);
};
export const transparentControl=(tooltip:string,toggleFn: (active: boolean) => void)=>{
	return toggleControl('', 'fa fa-tint', tooltip, toggleFn);
};


export const removeControl = (tooltip: string, clickFn: (event: boolean) => void) => {
	return buttonControl('fa fa-trash', tooltip, clickFn);
};

// -------------------------------------------
export const revertControlButton = (tooltip: string, clickFn: (event: any) => void) => {
	return buttonControl('la la-undo', tooltip, clickFn);
};

export const redoControlButton = (tooltip: string, clickFn: (event: any) => void) => {
	return buttonControl('fa fa-hand-paper-o', tooltip, clickFn);
};

export const circleControl = (tooltip: string, toggleFn: (active: boolean) => void) => {
	return toggleControl('ol-draw-circle', 'la la-cercle', tooltip, toggleFn);
};

export const searchControl = (tooltip: string, toggleFn: (active: boolean) => void) => {
	return toggleControl('ol-search', 'la la-search', tooltip, toggleFn);
};

export const measurementControl = (tooltip: string, toggleFn: (active: boolean) => void) => {
	return toggleControl('ol-measurement', 'la la-measure-distance-and-bearings', tooltip, toggleFn);
};

export const printControl = (tooltip: string, toggleFn: (active: boolean) => void) => {
	return toggleControl('ol-print', 'la la-print', tooltip, toggleFn);
};

export const saveControlButton = (tooltip: string, clickFn: (event: any) => void) => {
	return buttonControl('la la-save', tooltip, clickFn);
};
export const addControl = (tooltip: string, clickFn: (active: boolean) => void) => {
	return buttonControl('la la-new-title', tooltip, clickFn);
};

export const cancelControl = (tooltip: string, clickFn: (event: boolean) => void) => {
	return buttonControl('la la-ban', tooltip, clickFn);
};


export const infoControl = (tooltip: string, toggleFn: (active: boolean) => void) => {
	const html = `<span class="star"><i class="la la-info" style="cursor: pointer" title="${tooltip || ''}"></i></span>`;
	const className = 'ol-selected-info';
	return createToggle(html, className, toggleFn);
};

export const coordinateControl = (tooltip: string, toggleFn: (active: boolean) => void) => {
	const html = `<span class="star"><i class="la la-cadastre-configuration" style="cursor: pointer" title="${tooltip || ''}"></i></span>`;
	const className = 'ol-coordinate-control';
	return createToggle(html, className, toggleFn);
};

export const groupControl = (className: string, iconName: string, tooltip: string, subMenu: any) => {
	return new Toggle({
		html: `<i class="${iconName}" style="cursor: pointer" title="${tooltip || ''}"></i>`,
		className: className,
		bar: subMenu,
	});
};

export const createToggle = (html: string, className: string, toggleFn: (active: boolean) => void) => {
	return new Toggle({
		html,
		className,
		onToggle: toggleFn,
	});
};

export const createBar = (controls: Toggle[]) => {
	return new Bar({
		className: 'image-tool-bar',
		toggleOne: true,
		controls: controls
	});
};

export const buttonControl = (iconClass:string, tooltip: string, toggleFn: (event: any) => void) => {
	const div = document.createElement('div');
	div.className = 'ol-toggle ol-button ol-unselectable ol-control';
	div.setAttribute('style','pointer-events: auto');
	const button = document.createElement('button');
	button.type = 'button';
	button.title = tooltip;
	div.appendChild(button);
	const i = document.createElement('i');
	i.setAttribute('style', 'cursor:pointer');
	i.className = iconClass;
	i.title = tooltip;
	button.addEventListener('click', (event) => toggleFn(event));
	button.appendChild(i);
	const buttonControl:any = new Control({element: div});
	buttonControl.disable = () => div.classList.add('ol-disable');
	buttonControl.enable = () => div.classList.remove('ol-disable');
	return buttonControl;
};


export class SurveyToolsControl extends Control {
	/**
	 * @param {Object} [opt_options] Control options.
	 */
	constructor(opt_options) {
	  const options = opt_options || {};

	  const polygonDrawButton = document.createElement('button');
	  polygonDrawButton.innerHTML = '<span class="la la-draw-geometry"></span>';

	  const lineStringDrawButton = document.createElement('button');
	  lineStringDrawButton.innerHTML = '<span class="la la-edit-polygon	">';

	  const element = document.createElement('div');
	  element.className = 'rotate-north ol-unselectable ol-control';
	  element.appendChild(polygonDrawButton);

	  super({
			element: element,
			target: options.target,
	  });

	  polygonDrawButton.addEventListener('click', this.handleRotateNorth.bind(this), false);
	}

	handleRotateNorth() {
	//   this.getMap().getView().setRotation(0);
	}
}


