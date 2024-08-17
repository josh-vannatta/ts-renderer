import { Clock, Color, MeshToonMaterial, SphereGeometry, Vector3 } from "three";
import { Particle, ParticleFactory } from "../../physics/Particles";
import { Instance, InstancedEntity } from "../../renderer/InstancedEntity";
import { RenderedEntity } from "../../renderer/RenderedEntity";

export class ExplosionParticle extends RenderedEntity implements InstancedEntity, Particle {
    public instance: Instance = ExplosionParticle.Instance;
    public velocity: Vector3;
    public lifespan: number;
    public age: number = 0;
    public color: Color;

    constructor(options: Partial<Particle>) {
        super();

        this.position.copy(options.position ?? new Vector3());
        this.velocity = options.velocity ?? new Vector3();
        this.lifespan = options.lifespan ?? 0;
        this.color = options.color ?? new Color();
    }
    
    public onCreate(): void { }

    public onUpdate(clock?: Clock): void {
        const deltaTime = clock?.getDelta() ?? 0;

        // Update the particle's position based on velocity
        this.position.addScaledVector(this.velocity, deltaTime);
        this.instance.needsUpdate = true;

        // Increase the age and check if the particle should be destroyed
        this.age += deltaTime;
        // if (this.age >= this.lifespan) {
        //     this.onDestroy();
        // }
    }

    public onDestroy(): void {
        this.visible = false; // Hide or remove the particle when it expires
    }

    public static get Instance() {
        return new Instance(            
            new SphereGeometry(1,4,4),
            new MeshToonMaterial({
                color: "rgb(200,40,20)"
            })
        );
    }
}
