import { Box3, Raycaster, Vector2, Vector3 } from 'three';
import { InstanceCollection } from './InstancedEntity';
import { Camera } from './Camera';
import { EventSource } from '../utils/EventSource';
import { IsInteractive, RenderedEntity, ViewInteractions } from './RenderedEntity';
import { VectorUtils } from '../utils/VectorUtils';
import { ViewWorkerProps } from '../workers/view.worker';
import { ObjectUtils } from '../utils/ObjectUtils';

type ViewAction =  'resize' | 'click' |'mousemove' | 'hover' | 'mousedown' | 'mouseup' | 'keydown' | 'keyup' |'scroll';
type ViewCallback = (event?: MouseEvent | KeyboardEvent) => void;


export interface IView {
    on(action: ViewAction, callback: ViewCallback): void;
    remove(action: ViewAction, callback: ViewCallback): void;
}

export type ViewEvents = EventSource<ViewEvent>;

export interface ViewEvent {
    entity: IsInteractive,
    view: Vector3
}   

export class View implements IView {
    public pointer = {
        x: 0,
        y: 0,
        raycaster: new Raycaster(),
        left: false,
        right: false,
        middle: false
    }
    public window: Vector3 = new Vector3();
    public clicked: boolean = false;x
    public keyPresses: string[] = [];
    private canvas: HTMLCanvasElement;
    private worker = new Worker(new URL("../workers/view.worker.ts", import.meta.url), { type: 'module' });

    constructor(private _camera: Camera) {
        this.worker.onmessage = this.onWorkerMessage.bind(this);
    }

    public update() {   
        let height = 2 * Math.tan( this._camera.fov / 2 ) * Math.abs( this._camera.lense.position.z );
        this.window.set(height, height * this._camera.aspect, this._camera.lense.position.z);
    }

    public handleResize() {
        this.onResize.forEach(callback => callback());
    }

    public handleScroll(evt: MouseEvent) {
        this.onScroll.forEach(callback => callback(evt));
    }

    public handleHover(evt: MouseEvent) {
        this.onHover.forEach(callback => callback(evt));
        this.pointer.x = ((evt.clientX - 
            this.canvas.offsetLeft) /
            this.canvas.offsetWidth) * 2 - 1;
        this.pointer.y = -((evt.clientY -
            this.canvas.offsetTop) /
            this.canvas.offsetHeight) * 2 + 1;           
    }

    public handleClick (evt: MouseEvent) {
        this.clicked = true;
        this.onClick.forEach(callback => callback(evt));
    }

    public handleMouseUp(evt: MouseEvent) {
        this.setClickState(evt.which, false);
        this.clicked = false;
        this.onMouseUp.forEach(callback => callback(evt));
    }

    public handleMouseDown(evt: MouseEvent) {
        this.setClickState(evt.which, true);
        this.onMouseDown.forEach(callback => callback(evt));
    }

    public handleKeyUp(evt: KeyboardEvent) {
        this.keyPresses.splice(this.keyPresses.indexOf(evt.key), 1);
        this.onKeyUp.forEach(callback => callback(evt));
    }

    public handleKeyDown(evt: KeyboardEvent) {
        if (this.keyPresses.indexOf(evt.key) < 0)
            this.keyPresses.push(evt.key);
        this.onKeyDown.forEach(callback => callback(evt));
    }

    public setHovered(isHovered: boolean) {
        this.canvas.style.cursor = isHovered ? "pointer" : "default";
    }   

    private getCallbacks(action: ViewAction) {
        let cbArr: ViewCallback[] = [];

        switch (action) {
            case 'resize': cbArr = this.onResize; break;
            case 'click': cbArr = this.onClick; break;
            case 'mousemove': cbArr = this.onHover; break;
            case 'hover': cbArr = this.onHover; break;
            case 'mousedown': cbArr = this.onMouseDown; break;
            case 'mouseup': cbArr = this.onMouseUp; break;
            case 'keydown': cbArr = this.onKeyDown; break;
            case 'keyup': cbArr = this.onKeyUp; break;
            case 'scroll': cbArr = this.onScroll; break;
        }

        return cbArr;
    }

    public on = (action: ViewAction, callback: ViewCallback) => {
        let cbArr: ViewCallback[] = this.getCallbacks(action);

        if (cbArr.includes(callback))
            return;
        else
            cbArr.push(callback);    
    }

    public remove = (action: ViewAction, callback: ViewCallback) => {
        let cbArr: ViewCallback[] = this.getCallbacks(action);

        if (!cbArr.includes(callback))
            return;
        else
            cbArr = cbArr.filter(cb => cb != callback);  
    }

    
    private setClickState(mouse, state) {
        switch (mouse) {
            case 1: this.pointer.left = state; break;
            case 2: this.pointer.middle = state; break;
            case 3: this.pointer.right = state; break;
        }
    }    

    public bind(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        canvas.addEventListener('resize', ()=> this.handleResize());
        canvas.addEventListener('click', (event: MouseEvent) => this.handleClick(event));
        canvas.addEventListener('mousemove', (event: MouseEvent) => this.handleHover(event));
        canvas.addEventListener('mousedown', (event: MouseEvent) => this.handleMouseDown(event));
        canvas.addEventListener('mouseup', (event: MouseEvent) => this.handleMouseUp(event));
        canvas.addEventListener('keydown', (event: KeyboardEvent) => this.handleKeyDown(event));
        canvas.addEventListener('keyup', (event: KeyboardEvent) => this.handleKeyUp(event));
        // canvas.addEventListener('scroll', (event: MouseEvent)=> this.handleScroll(event));
    }

    private interactive: Record<string, IsInteractive> = {}
    private intersections: IsInteractive[] = [];

    public intersect(entities: IsInteractive[]) {
        this.interactive = {}
        this.pointer.raycaster.setFromCamera(new Vector2(this.pointer.x, this.pointer.y), this._camera.lense);
        entities.forEach(e => this.interactive[e.uuid] = e);

        const message: ViewWorkerProps = {
            ray: {
                origin: VectorUtils.toJson(this.pointer.raycaster.ray.origin),
                direction: VectorUtils.toJson(this.pointer.raycaster.ray.direction),
            },
            entities: entities.map(ObjectUtils.toJson),
        }

        this.worker.postMessage(message);

        return this.intersections;
    }


    private onWorkerMessage(event) {
        const intersections = event.data;
        
        this.intersections = [];

        intersections.forEach(entityId => {
            let entity = this.interactive[entityId]

            if (InstanceCollection.isInstance(entity)) 
                return;

            if (entity) {
                entity.onHover([]);
                entity.interactions.hovered = true;
                entity.interactions.cameraDistance = this._camera.lense.position.distanceTo(entity.worldPosition);
            }

            this.intersections.push(entity)
        });
    }

    // In Memory implementation
    // public intersect(entities: IsInteractive[]): IsInteractive[] 
    // {        
    //     let array: IsInteractive[] = [];
        
    //     this.pointer.ray.setFromCamera(new Vector2(this.pointer.x, this.pointer.y), this._camera.lense);

    //     entities.forEach(entity => {
    //         let intersections = this.pointer.raycaster.intersectObject(entity, true).map(i => i.point);
    //         let doesIntersect = intersections.length > 0;

    //         if (InstanceCollection.isInstance(entity) && doesIntersect) {
    //             entity.onHover(intersections);
    //             entity.interactions.hovered = true;
                
    //             var intersected = entity.getHoveredInstance(intersections);

    //             if (intersected && ViewInteractions.isInstance(intersected))
    //                 entity = intersected;
    //         }

    //         if (doesIntersect) {
    //             array.push(entity);
    //             entity.onHover(intersections);
    //             entity.interactions.hovered = true;
    //             entity.interactions.cameraDistance = this._camera.lense.position.distanceTo(entity.worldPosition);
    //         } else {
    //             if (entity.interactions.isHovered)
    //                 entity.onReset();

    //             entity.interactions.hovered = false;
    //             entity.interactions.selected = false;
    //         }
    //     });

    //     return array.sort((a, b) => b.interactions.cameraDistance - a.interactions.cameraDistance);
    // }

    public getIntersectIndex(objects) {
        let center = undefined;
        objects.some((object, i) => {
            if (this.pointer.raycaster.ray.distanceToPoint(object.position) < 3) {   
                center = i;
                return true;
            } 
        });           
        return center;
    }    

    public getScreenPosition(entity: IsInteractive): Vector3 {
        let vector = entity.worldPosition,
            wHalf = this.canvas.width * .5,
            hHalf = this.canvas.height * .5;     

        vector.project(this._camera.lense);        

        vector.x = (vector.x * wHalf) + wHalf;
        vector.y = - (vector.y * hHalf) + hHalf;        

        return new Vector3().set(vector.x, vector.y, this._camera.distanceTo(entity.worldPosition));
    }
    
    public onResize: ViewCallback[] = [];
    public onClick: ViewCallback[] = [];
    public onMouseDown: ViewCallback[] = [];
    public onMouseUp: ViewCallback[] = [];
    public onKeyUp: ViewCallback[] = [];
    public onKeyDown: ViewCallback[] = [];
    public onHover: ViewCallback[] = [];
    public onScroll: ViewCallback[] = [];
}