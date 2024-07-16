import { RenderedEntity } from "../renderer/RenderedEntity";
import { Curve, Vector3 } from "three";
import { HasPosition, Connection } from "./Connection";
import { AnyConnection } from "./ConnectionPath";

export const EmissionSpeed: 
    [ number, number, number, number, number, number, number ] = 
    [ .1,     .3,     .5,     1,      2,      3,      5      ];

export enum PathDirection {
    Source = 0,
    Destination = 1,
    Invalid = -1
}

export interface EmissionOptions { 
    speed?: number,
    instanceCount?: number,
    margin?: number, 
    source: HasPosition,
    destination?: HasPosition
}

export class Emission {
    public vector: number;
    public speed: number;
    public direction: PathDirection;
    public connection: Connection<Curve<Vector3>>;
    public margin: number;
    public instanceCount: number;
    public source: HasPosition;
    public isFinal: boolean = true;
    public isFinished: boolean = false;
    public destination?: HasPosition;
    public connections: AnyConnection[] = [];

    // external lifecycle callbacks
    private _onEmit: ((entity: RenderedEntity) => void)[]; 
    private _onUpdate: ((entity: RenderedEntity, vector: number) => void)[];
    private _onDestroy: ((entity: RenderedEntity) => void)[]; 
    private _onNext: ((entity: RenderedEntity) => void)[]; 
    private _hasExpired: boolean; 

    constructor(
        public entity: RenderedEntity, 
        opts: EmissionOptions
    ) {
        this.speed = opts.speed ?? .5;
        this.margin = opts.margin ?? 1;
        this.instanceCount = opts.instanceCount ?? 1;
        this.source = opts.source;
        this.destination = opts.destination;
        this.direction = 1;
        this.vector = 0;
        this._onEmit = [];
        this._onUpdate = [];
        this._onDestroy = [];
        this._onNext = [];
        this._hasExpired = false;
    }

    public clone() {
        const entity = this.entity.clone();
        const emission = new Emission(entity, this);

        entity.state.set(this.entity.state.current);

        this._onUpdate.forEach(update => emission.onUpdate(update));
        this._onDestroy.forEach(destroy => emission.onDestroy(destroy));
        this._onEmit.forEach(emit => emission.onEmit(emit));

        return emission;
    }

    public get hasExpired() {
        return this._hasExpired;
    }

    private tryExpire() {
        this._hasExpired = (
            this.direction && this.vector > this.connection.length ||
            !this.direction && this.vector <= 0
        );

        return this._hasExpired;
    }

    public update() {
        if (this.tryExpire())     
            return this.destroy();

        this.vector += this.direction ? this.speed : -this.speed;
        let position = this.connection.getPoint(this.vector);
        this.entity.position.copy(position);
        this.entity.update();

        this._onUpdate.forEach(update => update(this.entity, this.vector));
    }

    public destroy() {        
        this.isFinished = true;
        this._onDestroy.forEach(destroy => destroy(this.entity));
        this.entity.onDestroy();
        
        this._onNext.forEach(handleNext => handleNext(this.entity));
        this._onNext = [];
    }

    public emit() {
        this.vector = this.direction == 1 ? 0 : this.connection?.length ?? 1;
        this.entity.onCreate();                
        this._onEmit.forEach(emit => emit(this.entity)); 
    }

    public onUpdate(update: (entity: RenderedEntity, vector: number) => void) {
        this._onUpdate.push(update);
    }    

    public removeUpdate(update: (entity: RenderedEntity, vector: number) => void) {
        this._onUpdate = this._onUpdate.filter(u => u != update);
    }

    public onDestroy(update: (entity: RenderedEntity) => void) {
        this._onDestroy.push(update);
    }

    public onNext(update: (entity: RenderedEntity) => void) {
        this._onNext.push(update);
    }

    public onEmit(update: (entity: RenderedEntity) => void) {
        this._onEmit.push(update);
    }

    public get type() {
        return this.entity.constructor.name;
    }
}