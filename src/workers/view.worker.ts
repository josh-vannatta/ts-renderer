import * as THREE from 'three';
import { VectorUtils } from '../utils/VectorUtils';

self.onmessage = function(event) {
    const { ray, entities } = event.data;

    // Reconstruct the Ray object
    const rayOrigin = VectorUtils.fromJson(ray.origin);
    const rayDirection = VectorUtils.fromJson(ray.direction);
    const rayInstance = new THREE.Ray(rayOrigin, rayDirection);

    // Array to hold intersected entities with their distances
    const intersectedEntities = entities.map(entity => {
        const min = VectorUtils.fromJson(entity.boundingBox.min);
        const max = VectorUtils.fromJson(entity.boundingBox.max);
        const boundingBox = new THREE.Box3(min, max);
        
        if (rayInstance.intersectsBox(boundingBox)) {
            const position = VectorUtils.fromJson(entity.position);
            const distance = rayOrigin.distanceTo(position);

            return { uuid: entity.uuid, distance };
        }

        return null;
    }).filter(item => item !== null);

    // Sort the intersected entities by distance
    intersectedEntities.sort((a, b) => a.distance - b.distance);

    // Return the sorted UUIDs of the intersected entities
    self.postMessage(intersectedEntities.map(entity => entity.uuid));
};
