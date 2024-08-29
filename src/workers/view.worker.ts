import { Vector3, Ray, Box3 } from 'three';
import { VectorUtils } from '../utils/VectorUtils';

export type ViewWorkerProps = {
    ray: {
        origin: Partial<Vector3>,
        direction: Partial<Vector3>
    },
    entities: {
        uuid: string,
        boundingBox: { min: Partial<Vector3>, max: Partial<Vector3>}
        position: Partial<Vector3>
    }[]
}

self.onmessage = function(event: { data: ViewWorkerProps }) {
    const { ray, entities } = event.data;

    const rayOrigin = VectorUtils.fromJson(ray.origin);
    const rayDirection = VectorUtils.fromJson(ray.direction);
    const rayInstance = new Ray(rayOrigin, rayDirection);

    const intersectedEntities = entities.map(entity => {
        const min = VectorUtils.fromJson(entity.boundingBox.min);
        const max = VectorUtils.fromJson(entity.boundingBox.max);
        const boundingBox = new Box3(min, max);
        
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
