import { Clock, Object3D } from "three";

interface Gravitation {
    object: Object3D,
    velocity: number
}

export class Gravity {
    public maxVelocity = 100;
    public scalar = 1;

    private _objects: Record<string, Gravitation> = {};

    public add(...objects: Object3D[]) {
        objects.forEach(object => {
            if (!!this._objects[object.uuid])
                return;

            this._objects[object.uuid] = {
                object,
                velocity: 1 * this.scalar
            };
        })
    }

    public update(clock: Clock) {
        let delta = clock.getDelta()

        Object.values(this._objects).forEach(e => {
            
            if (Math.abs(e.velocity) < this.maxVelocity)
                e.velocity += e.velocity * delta

            e.object.position.y -= e.velocity;
        })
    }
}