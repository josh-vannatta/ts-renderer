import { Force, ForceOptions } from "../physics/Force";
import { Physics, PhysicsOptions, PhysicsWorkerObject } from "../physics/Physics";

let physics = new Physics();

export type PhysicsWorkerMessage = {
    type: "init" | "update",
    options: PhysicsOptions,
    forces: ForceOptions[],
    objects: PhysicsWorkerObject[],
    delta: number
}

export type PhysicsWorkerOutput = {
    delta: number,
    updatedObjects: PhysicsWorkerObject[]
}

self.onmessage = function(event: { data: PhysicsWorkerMessage }) {
    switch(event.data.type) {
        case "init":
            if (!physics.initialized)
                physics.init(event.data.options);

            const forces = Force.deserialize(...event.data.forces);
            const objects = event.data.objects.map(object => Physics.deserialize(object));
            
            physics.add(...objects);
            physics.addForce(...forces);
            break;
        case "update":
            physics.update();

            const message: PhysicsWorkerOutput = {
                delta: event.data.delta,
                updatedObjects: physics.entities.map(entity => Physics.serialize(entity))
            }

            self.postMessage(message);
            break;
    }
}
