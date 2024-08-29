import { Vector3, Color, Clock, BufferGeometry, SphereGeometry, MeshBasicMaterial } from 'three';
import { RenderedEntity } from '../renderer/RenderedEntity';
import { Instance, InstanceCollection, InstancedEntity, InstanceMaterial } from '../renderer/InstancedEntity';

export class Particle extends RenderedEntity implements InstancedEntity {
    public velocity: Vector3;
    public lifespan: number;
    public age: number = 0;
    public color: Color;
    public instance: Instance = Particle.Instance;

    constructor(options: Partial<Particle>) {
        super();

        this.position.copy(options.position ?? new Vector3());
        this.velocity = options.velocity ?? new Vector3();
        this.lifespan = options.lifespan ?? 1;
        this.color = this.instance.color = options.color ?? new Color(0xffffff);
        // this.instance = options.instance!;
        this.instance.material.color = this.color;
    }

    public onCreate(): void { }

    public onUpdate(clock: Clock): void { }

    public onDestroy(): void {
        this.visible = false; // Hide or remove the particle when it expires
    }

    public static get Instance() {
        const geometry = new SphereGeometry(0.1, 8, 8);
        const material = new MeshBasicMaterial({ color: "rgb(255,255,255)" });
        return new Instance(geometry, material);
    }
}

export class ParticleSystem extends InstanceCollection {
    private maxParticles: number;
    private particles: Particle[] = [];

    constructor(instance: Instance = Particle.Instance, maxParticles: number = 10000) {
        super([], instance, maxParticles);
        this.maxParticles = maxParticles;
    }

    public spawnParticle(options: Partial<Particle>): void {
        if (this.particles.length >= this.maxParticles) {
            console.log("Max particles reached. Cannot add more. ");
            return;
        }

        const particle = new Particle(options);

        this.particles.push(particle);
        this.addInstance(particle);
    }

    public override onUpdate(clock: Clock): void {
        this.particles.forEach((particle, index) => {
            particle.position.addScaledVector(particle.velocity, .025);
            particle.age += .025;
            
            if (particle.age >= particle.lifespan) {
                this.particles.splice(index, 1);
                this.removeInstance(particle);
            }
        });

        super.onUpdate(clock);

    }

    public onDestroy(): void {
        this.particles.forEach(particle => particle.onDestroy());
        this.particles = [];
        super.onDestroy();
    }
}
