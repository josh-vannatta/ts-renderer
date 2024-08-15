import { Curve, Vector3 } from "three";
import { RenderedEntity } from "../renderer/RenderedEntity";
import { CurveUtils } from "../utils/CurveUtils";
import { instanceOfInstancedEntity } from "../utils/Instancing";
import { ConnectionNode } from "./ConnectionPath";
import { Emission, PathDirection } from "./Emission";
import { EmissionInstances } from "./EmissionInstances";

export type ConnectionEndpoints = [ HasPosition, HasPosition] ;

export interface HasPosition {
    position: Vector3;
    uuid: string;
}

export abstract class Path<ConnectionCurve extends Curve<Vector3> = Curve<Vector3>> extends RenderedEntity {
    protected maxEmissions: number;
    protected nodes: [ ConnectionNode, ConnectionNode ];
    public curve: ConnectionCurve;
    protected _fidelity: number;
    protected _length: number;
    protected _needsUpdate: boolean;
    private _emissionInstances: EmissionInstances[];
    private _emissions: Emission[];
    private _deltas: [ Vector3, Vector3 ];

    constructor(public readonly endpoints: ConnectionEndpoints) {
        super();
        
        if (endpoints[0] == endpoints[1])
            throw new Error("Cannot create a path between the same entity")

        this._needsUpdate = false;
        this._fidelity = 10;
        this._length = 0;
        this.maxEmissions = 20;
        this._emissionInstances = [];
        this._emissions = [];        
        this._deltas = <[ Vector3, Vector3 ]> endpoints.map(e => e.position.clone());
    }

    protected abstract computeCurve(): ConnectionCurve;

    public static Curves = CurveUtils
    
    public onCreate() {
        this.curve = this.computeCurve();
        this._length = this.curve.getLength();
    }

    public onUpdate() {
        if (this._needsUpdate) {        
            this.curve = this.computeCurve();
            this._length = this.curve.getLength();
            this._needsUpdate = false;
        }
        
        this._emissionInstances.forEach(emissionsList => {
            emissionsList.update()
        });

        this._emissions = this._emissions.filter(emission => {
            emission.update();

            if (emission.hasExpired)
                this.removeEntity(emission.entity);

            return !emission.hasExpired;
        });
    }    

    public afterUpdate() {
        this._deltas = [ 
            this.endpoints[0].position.clone().sub(this._deltas[0]), 
            this.endpoints[1].position.clone().sub(this._deltas[1]) 
        ];

        if (this._deltas[0].length() > 0 || this._deltas[1].length() > 0)
            this.needsUpdate = true;

        this._deltas = [ 
            this.endpoints[0].position.clone(), 
            this.endpoints[1].position.clone() 
        ];
    }

    public get hasEmissions() {
        var activeInstance = this._emissionInstances.findIndex(e => 
            e.emissions.findIndex(i => i && !i.isFinished) != -1);

        if (activeInstance >= 0)
            return true;

        var active = this._emissions.findIndex(e => !e.isFinished);

        if (active >= 0)
            return true;

        return false;
    }

    private getDirection(emission: Emission): PathDirection {
        const { source, destination } = emission;
        const [ start, end ] = this.endpoints;

        if (source == destination || !destination && source == end)
            return PathDirection.Invalid;

        if (!destination || source == start)
            return PathDirection.Destination;

        return PathDirection.Source;
    }

    public emit(emission: Emission) {
        emission.direction = this.getDirection(emission);

        if (emission.direction == PathDirection.Invalid)
            return;

        emission.connection = this;

        if (instanceOfInstancedEntity(emission.entity))    
            return this.emitInstance(emission);  

        if (this.overlapping(emission))
            return;

        this.onEmit(emission);
        this._emissions.push(emission);
        this.addEntity(emission.entity);
        emission.emit();
    }

    protected onEmit(emission: Emission) {}

    private emitInstance(emission: Emission) {
        const origin = emission.direction == 1 ? 0 : 1;
        let list = this._emissionInstances.find(l => l.type === emission.type);
        this.onEmit(emission);   

        if (!list) {
            list = new EmissionInstances(emission);
            this._emissionInstances.push(list);
            this.add(list.instances);
            list.setComparitor(origin, this.endpoints[origin]);
        }

        if (list.overlapping(origin, emission))
            return;

        list.add(emission);   
    }

    private overlapping(emission: Emission) {
        let minDistance = Infinity;

        this._emissions.forEach(e => {
            const dist = e.entity.position.distanceTo(emission.source.position);

            if (dist < minDistance)
                minDistance = dist;
        });

        return minDistance < emission.margin;
    }

    public bindNodes(nodes: [ ConnectionNode, ConnectionNode]) {
        if (nodes[0].entity.uuid != this.endpoints[0].uuid ||
            nodes[1].entity.uuid != this.endpoints[1].uuid)
            return;

        this.nodes = nodes;
    }

    protected calculateTensionPoints(): [ Vector3, Vector3 ] | undefined {
        if (!this.nodes)
            return undefined;

        let upstream: Curve<Vector3>[] = this.nodes[0].upstream.map(c => c.curve);
        let downstream: Curve<Vector3>[] = this.nodes[1].downstream.map(c => c.curve);

        return [
            CurveUtils.getTension(upstream, 0)  ?? this.endpoints[0].position.clone(),
            CurveUtils.getTension(downstream, 1) ?? this.endpoints[1].position.clone()
        ];
    }

    public get positions(): [ Vector3, Vector3 ] {
        return [ this.endpoints[0].position, this.endpoints[1].position]
    }

    public set fidelity(fidelity: number) {
        this._fidelity = fidelity < 3 ? 3 : fidelity;
        this.onCreate();
        this._needsUpdate = true;
    }

    public get fidelity() {
        return this._fidelity;
    }

    public get length() {
        return this._length;
    }

    public set needsUpdate(state: boolean) {        
        this._needsUpdate = state;
    }

    public get source() {
        return this.endpoints[0];
    }

    public get destination() {
        return this.endpoints[1];
    }

    public includes = (entity: HasPosition): boolean => (
        this.source === entity || this.destination === entity
    )

    public matches = (path: [ HasPosition, HasPosition]) => (
        this.source == path[0] && this.destination == path[1] ||
        this.source == path[1] && this.destination == path[0]
    );

    public getPoint(vector: number) {              
        let point = this.curve.getUtoTmapping(0, vector);
        return this.curve.getPoint(point);        
    }
}