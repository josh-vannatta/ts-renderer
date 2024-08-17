import { Vector3, Color, Object3D, Clock } from 'three';
import { Force } from './Force';
import { Physics, PhysicsData } from './Physics';
import { RenderedEntity } from '../renderer/RenderedEntity';

export interface Particle extends RenderedEntity {
    velocity: Vector3;
    lifespan: number;
    age: number;
    color: Color;
}

export interface ParticleFactory {
    createParticle(position: Vector3, velocity: Vector3, lifespan: number, color: Color): Particle;
}

export class ParticleSystem extends RenderedEntity {
    private particles: Particle[] = [];
    private forces: Force[] = [];
    protected particleFactory: ParticleFactory;

    constructor(particleFactory: ParticleFactory) {
        super();
        this.particleFactory = particleFactory;
    }

    public addParticle(particle: Particle) {
        if (!particle.userData.physicsData) {
            Physics.Init(particle);
        }
        this.particles.push(particle);
    }

    public addForce(force: Force) {
        this.forces.push(force);
    }

    public onCreate(): void { }

    public onUpdate(clock: Clock) {
        const deltaTime = clock.getDelta();
        
        this.particles.forEach((particle, index) => {
            const physicsData = particle.userData.physicsData as PhysicsData;

            // Remove expired particles
            if (physicsData.age >= (physicsData?.lifespan ?? 0)) {
                this.particles.splice(index, 1); // Remove from particles array
                return;
            }

            // Apply all forces to the particle
            this.forces.forEach(force => {
                force.applyForce(particle, deltaTime);
            });

            // Update particle's position, lifespan, etc.
            particle.position.addScaledVector(physicsData.velocity, deltaTime);
            physicsData.age += deltaTime;
            particle.update(clock); // Trigger the update to mark the instance as needing an update
        });
    }

    public spawnParticles(position: Vector3, count: number) {
        for (let i = 0; i < count; i++) {
            const velocity = new Vector3(
                (Math.random() - 0.5) * 2, 
                (Math.random() - 0.5) * 2, 
                (Math.random() - 0.5) * 2
            );

            const lifespan = Math.random() * 5; // Random lifespan between 0 and 5 seconds
            const color = new Color(Math.random(), Math.random(), Math.random());

            const particle = this.particleFactory.createParticle(position.clone(), velocity, lifespan, color);
            this.addParticle(particle);
        }
    }
}
