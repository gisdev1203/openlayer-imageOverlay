import { Control } from "ol/control";
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
		// actionElement.innerHTML = `<span title="${tooltip}">${icon}</span>`;
		actionElement.innerHTML = `<input type="file" >`;

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