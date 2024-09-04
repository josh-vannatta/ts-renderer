import { ComputeShader } from "../../shaders/ComputeShader";

export class X {
    constructor(public value: number, public other: number) {}
}

export class ComputeXShader extends ComputeShader<X[]> {
    
    protected serialize(data: X[]): Float32Array {
        const floatData = new Float32Array(data.length * 4);  // RGBA format

        data.forEach((x, index) => {
            // Normalize the values to be between 0 and 1
            floatData[index * 4] = x.value;
            floatData[index * 4 + 1] = x.other;
        });

        return floatData;
    }

    protected deserialize(data: Float32Array): X[] {
        const result: X[] = [];
        for (let i = 0; i < data.length; i += 4) {
            // Denormalize the values back to the original range
            result.push(new X(data[i], data[i + 1]));
        }
        return result;
    }

    protected getShader(): string {
        return `
            precision highp float;
            uniform sampler2D u_input;
            varying vec2 v_texCoord;
        
            struct X {
                float value;
                float other;
            };
        
            X decode(vec4 encodedData) {
                X data;
                data.value = encodedData.r;  // Values are already normalized between 0 and 1
                data.other = encodedData.g;
                return data;
            }
        
            vec4 encode(X data) {
                return vec4(data.value, data.other, 0.0, 1.0);
            }
        
            void main() {
                vec4 encodedData = texture2D(u_input, v_texCoord);
                X data = decode(encodedData);
        
                // Modify data (for testing, modify values)
                data.value += 1.0;
                data.other += 1.0;
        
                gl_FragColor = encode(data);
            }
        `;
    }
}