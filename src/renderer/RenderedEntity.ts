import { Vector3, Euler, Quaternion, Object3D, Clock, Intersection } from "three";
import { StateMachine } from "../utils/StateUtils";
import { EventSource, EventObserver } from "../utils/EventSource";

interface ListenableProperties {
    position?: Vector3;
    rotation?: Euler;
    quaternion?: Quaternion;
    scale?: Vector3;
}

type EntityCallback<T> = (entity: RenderedEntity) => T;

export abstract class RenderedEntity extends Object3D {
    public state: StateMachine;
    readonly active: boolean = false;
    private _childEntites: RenderedEntity[];
    private _listeners: EventSource<ListenableProperties>;
    private _lastState: ListenableProperties;
    private _additionHandlers: EntityCallback<void>[];
    public isCreated: boolean;

    constructor() {
        super();
        this.state = new StateMachine(this);
        this._childEntites = [];
        this._additionHandlers = [];
        this._listeners = new EventSource<ListenableProperties>();
        this.isCreated = false;
    }
    
    // Lifecycle methods
    public abstract onCreate(): void;
    public beforeUpdate(): void {}
    public afterUpdate(): void {}
    public abstract onUpdate(clock?: Clock): void;
    public onDestroy(): void {}

    public update(clock?: Clock): void {
        this.beforeUpdate();
        this.state.update();
        this.updateListeners(props => this._listeners.notify(props));
        this.onUpdate(clock);
        
        this._childEntites.forEach(child => {
            child.update(clock);
            child.visible = this.visible;
        });

        this.afterUpdate();
    }

    public onAdd(callback: EntityCallback<void>) {
        this._additionHandlers.push(callback);
    }

    public addEntity(...entities: RenderedEntity[]) {
        entities.forEach(entity => {
            if (!entity)
                return;

            if (this._childEntites.includes(entity))
                return;

            this._childEntites.push(entity);
            this.add(entity);               
            entity.onCreate();
            entity.isCreated = true;
            this._additionHandlers.forEach(handleAdd => handleAdd(entity));
        });
    }

    public removeEntity(...entities: RenderedEntity[]) {
        this._childEntites = this._childEntites.filter(child => {
            const removed = entities.find(entity => entity.uuid == child.uuid);

            if (removed && ViewInteractions.hasInstance(child))
                child.interactions.active = false;

            if (removed) {
                child.onDestroy();
                this.remove(child);
                
                return false;
            }
        
            return true;
        })
    }

    private updateListeners(onUpdate?: (state: ListenableProperties) => void) {
        if (!this._lastState)
            return onUpdate && onUpdate({});

        let needsUpdate = false;

        Object.keys(this._lastState).forEach(property => {
            let value = this[property];
        
            if (property == "position")
                value = this.calcWorldPosition(value)

            if (this._lastState[property].equals(value))
                return;              

            needsUpdate = true;
            this._lastState[property] = value;
        });        

        if (needsUpdate && onUpdate)
            onUpdate(this._lastState);
    }
    
    protected containsEntity(entity: RenderedEntity) {
        return this._childEntites.find(e => e.uuid == entity.uuid) != undefined;
    }

    public addObserver(observer: EventObserver<ListenableProperties>) {
        this._listeners.addObserver(observer);       

        if (this._lastState || observer.simple) 
            return;

        this._lastState = {
            position:  this.getWorldPosition(this.position.clone()),
            rotation: this.rotation.clone(),
            scale: this.scale.clone(),
            quaternion: this.quaternion.clone()
        };
    }

    public removeObserver(observer: EventObserver<ListenableProperties> | string) {
        if (!observer)
            return;

        if (typeof observer == "string")
            this._listeners.removeObservers(observer);     
        else
            this._listeners.removeObservers(observer.id);  
    }   

    public apply(props?: ListenableProperties) {
        if (!props)
            return;

        if (props.position)
            this.position.copy(props.position);

        if (props.quaternion)
            this.quaternion.copy(props.quaternion);
        
        if (props.rotation)
            this.rotation.copy(props.rotation);

        if (props.scale)
            this.scale.copy(props.scale);
    }

    public setVisible(visible: boolean) {
        this.state.visibility(visible);

        this._childEntites.forEach(entity => entity.setVisible(visible));
    }

    public set visibleRecursive(opacity: boolean) {                     
        this.visible = opacity;
        this.makeVisible(this.children, opacity);
    }

    public calcWorldPosition = (value = new Vector3()) => this.getWorldPosition(new Vector3().copy(value));

    public get worldPosition() {
        return this.calcWorldPosition();
    }

    public get childEntities() {
        return this._childEntites.slice();
    }

    public get averageScale() {
        return (this.scale.x + this.scale.y + this.scale.z) / 3
    }

    private makeVisible(meshes: Object3D[], opacity: boolean) {    
        meshes.forEach(child => {
            child.visible = opacity;

            this.makeVisible(child.children, opacity);
        })
    }
}

export class ViewInteractions {    
    readonly hasInteractions: boolean = true;
    private _active: boolean = true;
    private _hovered: boolean = false;
    private _selected: boolean = false;
    private _zIndex: number = 0;
    private _cameraDistance: number = Infinity;

    public get active() {
        return this._active;
    }

    public get isHovered() {
        return this._hovered;
    }

    public get isSelected() {
        return this._selected;
    }

    public get zIndex() {
        return this._zIndex;
    }

    public get cameraDistance() {
        return this._cameraDistance;
    }

    public set hovered(hovered: boolean) {
        this._hovered = hovered;
    }

    public set selected(selected: boolean) {
        this._selected = selected;
    }

    public set zIndex(index: number) {
        this._zIndex = index;
    }

    public set active(active: boolean) {
        this._active = active;
    }

    public set cameraDistance(distance: number) {
        this._cameraDistance = distance;
    }

    public static hasInstance(object: any): object is IsInteractive {
        return object.interactions?.hasInteractions;
    }
}

export interface IsInteractive extends RenderedEntity {
    interactions: ViewInteractions;   
    onHover(intersections?: Vector3[]): void;
    onReset(): void;
    onSelect(): void;
}