import { Vector3, Clock, Color } from 'three';
import { InstanceCollection, InstancedEntity } from '../../renderer/InstancedEntity';
import { ExplosionParticle } from './ExplosionParticle';
import { Particle, ParticleFactory, ParticleSystem } from '../../physics/Particles';
import { VectorUtils } from '../../utils/VectorUtils';



export class ExplosionParticleFactory implements ParticleFactory {
    createParticle(position: Vector3, velocity: Vector3, lifespan: number, color: Color): Particle {
        return new ExplosionParticle({position, velocity, lifespan, color});
    }
}

export class ExplosionSystem extends ParticleSystem {
    private explosions: Record<string, InstanceCollection> = {};

    constructor() {
        super(new ExplosionParticleFactory());
    }

    public override onCreate(): void {
        let expired = 0;

        Object.values(this.explosions).forEach(exp => {
            expired = 0;

            exp.entities.forEach(e => {
                let physicsData = e.physicsData;

                if (physicsData.age >= (physicsData?.lifespan ?? 0)) {
                    expired ++;
                }

            })

            if (expired >= exp.entities.length){
                this.remove(exp)
                delete this.explosions[exp.uuid]
            }
        })
    }

    public trigger(position: Vector3, particleCount: number) {
        const particles: ExplosionParticle[] = []

        for (let i = 0; i < particleCount; i++) {
            const velocity = VectorUtils.random(10);
            const lifespan = Math.random() * 5;
            const color = new Color().setFromVector3(VectorUtils.random());
            const particle = this.particleFactory.createParticle(position.clone(), velocity, lifespan, color) as ExplosionParticle;

            this.addParticle(particle);
            particles.push(particle)
        }

        const explosion = new InstanceCollection(particles, ExplosionParticle.Instance)

        this.addEntity(explosion);

        this.explosions[explosion.uuid] = explosion;
        console.log(this.explosions)
    }
}
