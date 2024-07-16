import { Raycaster, Vector2, Vector3 } from 'three';
import { IsInteractive, ViewInteractions } from './RenderedEntity';
import { Camera } from './Camera';
import { instanceOfInstancedEntity, InstanceCollection } from '../utils/Instancing';

type ViewAction =  'resize' | 'click' |'mousemove' | 'hover' | 'mousedown' | 'mouseup' | 'keydown' | 'keyup' |'scroll';
type ViewCallback = (event?: MouseEvent | KeyboardEvent) => void;


export interface IView {
    on(action: ViewAction, callback: ViewCallback): void;
    remove(action: ViewAction, callback: ViewCallback): void;
}

export class View implements IView {
    public pointer = {
        x: 0,
        y: 0,
        ray: new Raycaster(),
        left: false,
        right: false,
        middle: false
    }
    public window: Vector3 = new Vector3;
    public clicked: boolean = false;
    public keyPresses: string[] = [];
    private canvas: HTMLCanvasElement;

    constructor() { }

    public update(camera: Camera) {   
        let height = 2 * Math.tan( camera.fov / 2 ) * Math.abs( camera.lense.position.z );
        this.window.set(height, height * camera.aspect, camera.lense.position.z);
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

    public intersect(entities: IsInteractive[], camera: Camera): IsInteractive[] 
    {        
        let array: IsInteractive[] = [];
        
        this.pointer.ray.setFromCamera(new Vector2(this.pointer.x, this.pointer.y), camera.lense);

        entities.forEach(entity => {
            let intersections = this.pointer.ray.intersectObject(entity, true).map(i => i.point);
            let doesIntersect = intersections.length > 0;

            if (InstanceCollection.isInstance(entity) && doesIntersect) {
                entity.onHover(intersections);
                entity.interactions.hovered = true;
                
                var intersected = entity.getHoveredInstance(intersections);

                if (intersected && ViewInteractions.hasInstance(intersected))
                    entity = intersected;
            }

            if (doesIntersect) {
                array.push(entity);
                entity.onHover(intersections);
                entity.interactions.hovered = true;
                entity.interactions.cameraDistance = camera.lense.position.distanceTo(entity.worldPosition);
            } else {
                if (entity.interactions.isHovered)
                    entity.onReset();

                entity.interactions.hovered = false;
                entity.interactions.selected = false;
            }
        });

        return array.sort((a, b) => b.interactions.cameraDistance - a.interactions.cameraDistance);
    }

    public getIntersectIndex(objects) {
        let center = undefined;
        objects.some((object, i) => {
            if (this.pointer.ray.ray.distanceToPoint(object.position) < 3) {   
                center = i;
                return true;
            } 
        });           
        return center;
    }    

    public getScreenPosition(entity: IsInteractive, camera: Camera) {
        let vector = entity.worldPosition,
            wHalf = this.canvas.width * .5,
            hHalf = this.canvas.height * .5;     

        vector.project(camera.lense);        

        vector.x = (vector.x * wHalf) + wHalf;
        vector.y = - (vector.y * hHalf) + hHalf;        

        return new Vector3().set(vector.x, vector.y, camera.distanceTo(entity.worldPosition));
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