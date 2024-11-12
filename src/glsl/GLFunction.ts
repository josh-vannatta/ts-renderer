import { GLBody, GLName, GLParam } from "./GLSchema";
import { GLType } from "./GLProgram";

export class GLFunction {
    public returnType: GLType | string;
    public name: GLName;
    public params: GLParam[];
    public body: GLBody;

    constructor(opts: Partial<GLFunction>) {
        this.returnType = opts.returnType ?? GLType.Void;
        this.name = opts.name ?? new GLName("function");
        this.params = opts.params ?? [];
        this.body = opts.body ?? new GLBody('');
    }

    build(): string {
        const params = this.params.map(param => `${param.type} ${param.name}`).join(', ');
        return `
            ${this.returnType} ${this.name}(${params}) {
                ${this.body}
            }
        `;
    }

    // List-manipulation
    public static get List() {
        return ListHelpers
    }

    // Encoding GLSchema
    // Decoding GLSchema
    // GLSchema access functions
}

class ListHelpers {
    public static findByIndex(texture: string, depth: number) {
        return new GLFunction({
            name: new GLName('findByIndex'),
            params: [GLParam.Float("index")],
            body: new GLBody(`
                float width = 5.0;
                float height = 1.0;
                float texelCapacity = width * height * 4.0; // Each texture holds 4 floats per texel
            
                // Determine which texture holds the specified index
                float textureIndex = floor(index / texelCapacity);
                float localIndex = mod(index, texelCapacity); // Index within the selected texture
            
                // Calculate texel and component within that texture
                float texelIndex = floor(localIndex / 4.0);
                float componentIndex = mod(localIndex, 4.0);
            
                // Calculate normalized UV coordinates for the texel
                float x = mod(texelIndex, width) + 0.5; // Center on the texel
                float y = floor(texelIndex / width) + 0.5;
                vec2 iuv = vec2(x / width, y / height);
            
                // Sample the selected texture at the calculated coordinates
                vec4 texel;
                ${Array.from({ length: depth }, (_, i) => `
                    if (textureIndex == ${i}.0) {
                        texel = texture(${texture}[${i}], iuv);
                    }`).join(" else ")}
                
                // Fallback return in case of out-of-bounds texture index
                if (textureIndex >= ${depth}.0) {
                    return 0.0;
                }
        
                // Return the specific component based on componentIndex
                if (componentIndex == 0.0) return texel.r;
                if (componentIndex == 1.0) return texel.g;
                if (componentIndex == 2.0) return texel.b;
                if (componentIndex == 3.0) return texel.a;
            
                return 0.0; // Fallback, should never reach here
            `),
            returnType: GLType.Float
        });
    }
}