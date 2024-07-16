import { ArrayUtils } from "../utils/ArrayUtils";
import { Curve, Vector3 } from "three";
import { HasPosition, Connection } from "./Connection";
import { Emission } from "./Emission";

export interface AnyConnection extends Connection<Curve<Vector3>> {}

class Edge {
    constructor(
        public connection: AnyConnection, 
        public source: ConnectionNode,
        public destination: ConnectionNode
    ) { 
        connection.bindNodes([ source, destination ]);
        connection.needsUpdate = true;
    }

    public includes(node: ConnectionNode) {
        return this.source == node || this.destination ==  node;
    }
}

export class ConnectionNode {
    public edges: Edge[];

    constructor(
        public entity: HasPosition, 
        public index: number
    ) {
        this.edges = [];
    }

    public connect(edge: Edge) {        
        if (!this.edges.includes(edge))
            this.edges.push(edge);     
    }

    public get upstream() {
        let upstream: AnyConnection[] = [];
        this.edges.forEach(edge => edge.destination == this && upstream.push(edge.connection));
        return upstream;
    }

    public get downstream() {
        let downstream: AnyConnection[] = [];
        this.edges.forEach(edge => edge.source == this && downstream.push(edge.connection));
        return downstream;
    }

    public get connections() {
        return this.edges.map(e => e.connection);
    }
}

export class ConnectionPath {
    private edges: Edge[];
    private nodes: { [ nodeId: string ]: ConnectionNode };
    private path: Set<Edge>[][];
    public biased: boolean = true;

    constructor() {
        this.edges = [];
        this.nodes = {};
        this.path = [];
    }

    public add(...connections: AnyConnection[]) {
        connections.forEach(connection => this.addEdge(connection));
    }

    public emit(emission: Emission) { 
        emission.emit();

        this.tryEmit(emission, [], emission);
    }

    public findConnection(path: [ HasPosition, HasPosition ]) {
        return this.edges.find(c => c.connection.matches(path))?.connection;
    }    

    public findConnections(path: [ HasPosition, HasPosition ]) {
        let connections: AnyConnection[] = [];

        this.edges.forEach(edge => {
            if (edge.connection.matches(path))
                connections.push(edge.connection);
        })

        return connections;
    }

    public getConnections(): AnyConnection[] {
        return this.edges.map(e => e.connection);
    }

    public getPath(source: HasPosition, destination?: HasPosition) {   
        const path = new ConnectionPath();
        path.add(...this.getPathConnections(source, destination));

        return path;        
    }

    public getPathConnections(source: HasPosition, destination?: HasPosition) {   
        const start = this.nodes[source.uuid];
        const end = this.nodes[destination?.uuid ?? ""]; 

        if (!start || !end) return [];

        let edges = this.path[start.index][end.index];
        let connections: AnyConnection[] = [];

        edges.forEach(edge => connections.push(edge.connection));

        return connections;       
    }

    public update() {        
        this.edges.forEach(e => e.connection.needsUpdate = true);
        // this.rebuild();
    }

    private tryEmit(emission: Emission, previous: Edge[] = [], original: Emission) {
        const start = this.nodes[emission.source.uuid];
        const end = this.nodes[emission.destination?.uuid ?? ""];

        if (!start || emission.destination && !end) 
            return;

        this.nextEdges(start, end, previous).forEach(edge => {                
            if (!edge)
                return;

            const current = emission.clone()
            const { source, destination } = edge.connection;       
            
            current.isFinal = original.destination == destination || original.destination == source;

            current.onNext(() => {
                const next = emission.clone();
                
                next.source = source == start.entity ? destination : source;    
                next.isFinal = original.destination == destination || original.destination == source;
                
                if (next.isFinal || current.isFinal)
                    emission.destroy();
                else                
                    this.tryEmit(next, start.edges, emission);
            });
            
            edge.connection.emit(current);
        });
    }

    private nextEdges(start: ConnectionNode, end?: ConnectionNode, previous: Edge[] = []) {
        if (!end)
            return start.edges.filter(e => !previous.includes(e));

        let edges = this.path[start.index][end.index];      
        let nextEdge: Edge | undefined;

        edges.forEach(edge => {
            if (edge.includes(start)) { 
                nextEdge = edge;
            }
        })

        return [ nextEdge ];
    }

    private addEdge(connection: AnyConnection) {        
        if (this.findConnection(connection.endpoints))
            return;

        let source = this.getNode(connection.source);
        let dest = this.getNode(connection.destination);
        let edge = new Edge(connection, source, dest);

        this.edges.push(edge);
        source.connect(edge);
        dest.connect(edge);
    }

    private getNode(entity: HasPosition) {
        return this.nodes[entity.uuid] ?? this.addNode(entity);
    }

    private addNode(entity: HasPosition) {
        let index = Object.keys(this.nodes).length;
        let node = new ConnectionNode(entity, index);
        this.nodes[entity.uuid] = node;
        this.path[index] = [];

        return node;
    }

    public rebuild() {        
        const nodeIds = Object.keys(this.nodes);
        let node: ConnectionNode,
            path: Set<Edge>,
            paths: Set<Edge>[],
            start: Set<Edge>,
            next: Set<Edge>,
            max: number = Infinity;

        nodeIds.forEach(id => {
            node = this.nodes[id];
            this.path[node.index] = [];

            for (let i = 0; i < nodeIds.length; i++) 
                this.path[node.index].push(new Set<Edge>());  
        });

        this.edges.forEach(edge => {
            const { source, destination } = edge;
            this.path[source.index][destination.index].add(edge);
            this.path[destination.index][source.index].add(edge);
        }); 

        const builtShortestPath = (src: number, dest: number) => {
            paths = [];
            max = Infinity;

            for (let jump = 0; jump < nodeIds.length; jump++) {
                start = this.path[src][jump];
                next = this.path[jump][dest];

                if (start.size + next.size > max)
                    continue;

                if (start.size != 0 && next.size != 0) {
                    path = new Set<Edge>();
                    ArrayUtils.combine(path, start);
                    ArrayUtils.combine(path, next);
                    paths.push(path);
                    max = path.size;
                }
            }

            paths.sort((a, b) => a.size - b.size);
            this.path[src][dest] = paths[0] ?? new Set<Edge>();
        }

        nodeIds.forEach(id => {
            node = this.nodes[id];
            
            for (let dest = 0; dest < nodeIds.length; dest++) {
                path = this.path[node.index][dest];

                if (path.size == 0 && dest != node.index){
                    builtShortestPath(node.index, dest);

                    if (!this.biased)
                        builtShortestPath(dest, node.index);
                }
            }
        });
    }
} 