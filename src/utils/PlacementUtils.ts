import { Mesh, Object3D, Vector3 } from 'three';
import { ConvexGeometry } from 'three/examples/jsm/Addons.js';

export function pointsOnSphere(n, scalar: number = 1) {
    let vertices: Vector3[] = [];

    let inc = Math.PI * (3 - Math.sqrt(5)),
        offset = 2 / n,
        x, y , z, radius, phi;

    for (let k = 0; k < n; k++) {
        y = (k * offset - 1) + (offset /2);
        radius = Math.sqrt(1 - y * y) ;
        phi = k * inc;
        x = Math.cos(phi) * radius;
        z = Math.sin(phi) * radius;
        
        vertices.push(new Vector3(x, y, z));
    }    

    let geo = new ConvexGeometry(vertices);

    if (scalar <= 0)
        scalar = .001;

    geo.scale(scalar, scalar, scalar);    

    geo.computeBoundingSphere();

    // geo.faces.push(new Face3(0,0,0))
    // geo.computeFaceNormals();
    // geo.computeVertexNormals();
    // geo.normalize();

    return geo;
}

export function getLocationRange(locations: PlaneLocation[], padding: number = 0) {
    let min: any = {  },
        max: any = {  };

    locations.forEach(location => {        
        min.x = !min.x ? location.x : location.x < min.x ? location.x : min.x;
        min.y = !min.y ? location.y :location.y < min.y ? location.y : min.y;
        
        max.x = !max.x ? location.x : location.x > max.x ? location.x : max.x;
        max.y = !max.y ? location.y : location.y > max.y ? location.y : max.y;
    });
    
    min.x = !min.x ? -padding : min.x - padding;
    min.y = !min.y ? -padding : min.y - padding;
    max.x = !max.x ? padding : max.x + padding;
    max.y = !max.y ? padding : max.y + padding; 
    
    return { min, max };    
}


export type PlaneLocation = { x: number, y: number, index?: number };
export type PlaneRange = { min: PlaneLocation, max: PlaneLocation };
export interface HasPlaneLocation {
    location: PlaneLocation
}

type PlaneCallback = (position: Vector3, location: PlaneLocation) => void;
type PlaneSettings = {
    range: PlaneRange,
    pointWidth: number,
    margin: number,
    exceptions?: PlaneLocation[]
}

export function pointsOnPlane(settings: PlaneSettings, callback?: PlaneCallback) {
    let locations: Array<PlaneLocation[]> = [];
    let { range, pointWidth, margin, exceptions } = settings;
    exceptions = exceptions ? exceptions : [];

    let width = pointWidth + margin,    
        sizeX = (range.max.x - range.min.x) * width,
        sizeY = (range.max.y - range.min.y) * width,
        start = { 
            x: sizeX / -2 - width/2, 
            y: sizeY / -2 - width/2 
        },    
        index = 0;    
    
    for (let x = range.min.x, iX = 0; x <= range.max.x; x++) {
        locations[x] = [];

        for (let y = range.min.y, iY = 0; y <= range.max.y; y++) {
            locations[x][y] = { x, y, index };

            if (x == range.min.x && y == range.min.y)
                range.min.index = index;

            if (x == range.max.x && y == range.max.y)
                range.max.index = index;

            index++;

            if (callback) {
                callback(new Vector3(                                              
                    start.x + iX * width, 0, 
                    start.y + (iY * width)
                ), { x, y });
            }
            
            iY++;
        }   
        
        iX++;
    }

    return locations;
}

export function distanceBetween( v1, v2 ) {
    var dx = v1.position.x - v2.position.x;
    var dy = v1.position.y - v2.position.y;
    var dz = v1.position.z - v2.position.z;

    return Math.sqrt( dx * dx + dy * dy + dz * dz );
}

export function getSphereRadius(numberOfNodes: number, radius: number, buffer = 0) {
	let sa = Math.pow(radius + buffer, 2) * 4 * numberOfNodes;
  	return Math.sqrt(sa/(Math.PI*4));
}

// const toWorldCoordinate = (coordinates: Mesh<Geometry>) => (entity: Object3D, index: number) => {
//     if (index >= coordinates.geometry.vertices.length)
//         return;

//     entity.position.copy(coordinates.localToWorld(coordinates.geometry.vertices[index].clone()));
// }

// export { toWorldCoordinate as copyCoordinate }