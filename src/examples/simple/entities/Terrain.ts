import * as THREE from 'three';
import { ShaderEffect } from '../../../shaders/ShaderEffect';
import { GLSLUniforms, GLSLVaryings } from '../../../shaders/GLSLBuilder';
import { RenderedEntity } from '../../../renderer/RenderedEntity';
import { CompositeShader } from '../../../shaders/CompositeShader';

export class Terrain extends RenderedEntity {
    public onCreate(): void {
        const shader = new CompositeShader(
            new LandscapeShader(),
            // new LightingShader()
        );

        const geometry = new THREE.PlaneGeometry(100, 100, 256, 256); 
        const mesh = new THREE.Mesh(geometry, shader.material);
        mesh.rotation.x = -Math.PI / 2;

        this.add(mesh);
        
    }

    public onUpdate(clock?: THREE.Clock): void {
        
    }
}

export class LandscapeShader extends ShaderEffect {
    constructor() {
        super();
    }

    getVertexShader(): string {
        return `
            vec4 bumpMap = ${this.texture2D("heightMap", "vUv")};
            vec3 displacedPosition = position + normal * bumpMap.r * heightScale;

            ${this.setPosition(`projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0)`)};
        `;
    }

    getFragmentShader(): string {
        return `
            vec4 landscapeColor = ${this.texture2D("landscapeTexture", "vUv")};

            ${this.setColor(`vec4(landscapeColor.rgb, 1.0)`)};
        `;
    }

    getUniforms(): GLSLUniforms {
        const loader = new THREE.TextureLoader();

        return {
            heightMap: { value: loader.load('/textures/terrain_height.png') },
            landscapeTexture: { value: loader.load('/textures/terrain_diffuse.png') },
            heightScale: { value: 70.0 },
        };
    }

    getVaryings(): GLSLVaryings {
        return {};
    }
}


export class LightingShader extends ShaderEffect {
    getVertexShader(): string {
        return `
            vNormal = normalize(normalMatrix * normal);
        `
    }

    getFragmentShader(): string {
        return `
            vec3 lightDir = ${this.normalize('lightPosition - vNormal')};
            float diff = ${this.max(this.dot('vNormal', 'lightDir'), '0.0')};
            vec3 diffuse = diff * lightColor * intensity;

            ${this.setColor('vec4(diffuse, 1.0)')};
        `;
    }

    getUniforms(): GLSLUniforms {
        return {
            lightPosition: { value: new THREE.Vector3(100, 0, 10) },
            lightColor: { value: new THREE.Color(0xffffff) },
            intensity: { value: .1 }
        };
    }

    getVaryings(): GLSLVaryings  {
        return  {}
    }
}
