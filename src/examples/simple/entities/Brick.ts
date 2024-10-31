import { BoxGeometry, Clock, Color, Mesh, Vector2, Vector3 } from "three";
import { IsInteractive, RenderedEntity } from "../../../renderer/RenderedEntity";
import { CompositeShader } from "../../../shaders/CompositeShader";
import { GLSLUniforms, GLSLVaryings } from "../../../shaders/GLSLBuilder";
import { ShaderEffect } from "../../../shaders/ShaderEffect";

export class Brick extends RenderedEntity implements IsInteractive {
    public onCreate(): void {
        const geometry = new BoxGeometry(10,4,4, 2,2,2);
        const shader = new BrickShader()

        const composite = new CompositeShader(
            new BrickShader(),
            new LightingShader(),
        )

        this.add(new Mesh(geometry, composite.material));

        this.physicsData = {
            velocity: new Vector3(),
            mass: 1
        }
    }
    
    public onUpdate(clock?: Clock): void {
        
    }

    onSelect(): void {
        
    }

    onHover(intersections?: Vector3[]): void {
        
    }

    onReset(): void {
        
    }
}

export class BrickShader extends ShaderEffect {
    getVertexShader(): string {
        return `
            vUv = uv;
            ${this.setPosition(`projectionMatrix * modelViewMatrix * vec4(position, 1.0)`)};
        `;
    }

    getFragmentShader(): string {
        return `
            vec2 position = vUv / brickSize;
            vec2 useBrick = ${this.step("brickPct", this.fract("position"))};
            vec3 color = ${this.mix("mortarColor", "brickColor", "useBrick.x * useBrick.y")};

            ${this.setColor('vec4(color, 1.0)')};
        `;
    }

    getUniforms(): GLSLUniforms {
        return {
            brickColor: { value: new Color(0x8B4513) },
            mortarColor: { value: new Color(0xC0C0C0) },
            brickSize: { value: new Vector2(.2, .1) },
            brickPct: { value: new Vector2(0.05, 0.1) },
        };
    }

    getVaryings(): GLSLVaryings {
        return {
            vUv: new Vector2()
        }
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
            vec3 diffuse = diff * lightColor;

            ${this.setColor('vec4(diffuse, 1.0)')};
        `;
    }

    getUniforms(): GLSLUniforms {
        return {
            lightPosition: { value: new Vector3(10, 100, 10) },
            lightColor: { value: new Color(0xaaaaaa) },
        };
    }

    getVaryings(): GLSLVaryings  {
        return  {
            vNormal: new Vector3()
        }
    }
}
