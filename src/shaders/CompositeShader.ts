// CompositeShader.ts
import { ShaderEffect } from './ShaderEffect';
import { GLSLUniforms, GLSLVaryings } from './GLSLBuilder';

export class CompositeShader extends ShaderEffect {
    private effects: ShaderEffect[] = [];

    constructor(...effects: ShaderEffect[]) {
        super();
        this.effects = effects;

        this.effects.forEach((effect, i) => effect.index = i);
        this.index = this.effects.length -1;
        this.init();
    }

    getVertexShader(): string {
        return this.effects.map(effect => `
            // ${effect.constructor.name}
            ${effect.getVertexShader()}
        `)
        .join(`\n`);
    }

    getFragmentShader(): string {
        return this.effects.map(effect => `
            // ${effect.constructor.name}
            ${effect.getFragmentShader()}
        `)
        .join(`\n`);
    }

    getUniforms(): GLSLUniforms {
        return this.effects.reduce((acc, effect) => {
            return { ...acc, ...effect.getUniforms() };
        }, {});
    }

    getVaryings(): GLSLVaryings {
        return this.effects.reduce((acc, effect) => {
            return { ...acc, ...effect.getVaryings() };
        }, {});
    }
}
