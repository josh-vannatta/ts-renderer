import * as babelParser from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { GLBuilder } from './GLSchema';

export class GLCompiler {
    private glslCode: string[] = [];
    private inVariables: string[] = [];
    private outVariables: string[] = [];
    private uniformVariables: string[] = [];
    private functions: string[] = [];

    constructor(lambdaFunction: Function) {
        const functionString = lambdaFunction.toString();
        const ast = babelParser.parse(functionString, {
            sourceType: "module",
            plugins: ["typescript"]
        });

        this.convertToGLSL(ast);
    }

    private convertToGLSL(ast: t.File) {
        traverse(ast, {
            ArrowFunctionExpression: (path) => {
                // Parse parameters to detect variable declarations
                const params = path.node.params;
                params.forEach(param => this.processParameter(param));

                // Translate function body to GLSL
                path.get("body").traverse({
                    VariableDeclaration: this.processVariableDeclaration.bind(this),
                    BinaryExpression: this.processBinaryExpression.bind(this),
                    IfStatement: this.processIfStatement.bind(this),
                    ForStatement: this.processForStatement.bind(this),
                    WhileStatement: this.processWhileStatement.bind(this),
                    FunctionDeclaration: this.processFunctionDeclaration.bind(this)
                });
            }
        });
    }

    private processParameter(param: t.Identifier | any) {
        if (t.isIdentifier(param)) {
            const name = param.name;
            this.inVariables.push(`in float ${name};`);
        }
    }

    private processVariableDeclaration(path: NodePath<t.VariableDeclaration>) {
        const { node } = path;
        node.declarations.forEach(declaration => {
            const { id, init } = declaration;
            if (t.isIdentifier(id)) {
                const varName = id.name;
                let glslType = "float"; // Default type

                if (t.isNewExpression(init) && init.callee.type === "Identifier") {
                    glslType = this.mapGLSLType(init.callee.name);
                    const args = init.arguments.map(arg => generate(arg).code).join(", ");
                    this.glslCode.push(`${glslType} ${varName} = ${glslType}(${args});`);
                } else if (t.isNumericLiteral(init)) {
                    this.glslCode.push(`${glslType} ${varName} = ${init.value};`);
                }
            }
        });
    }

    private processBinaryExpression(path: NodePath<t.BinaryExpression>) {
        const left = generate(path.node.left).code;
        const right = generate(path.node.right).code;
        const operator = path.node.operator;
        this.glslCode.push(`${left} ${operator} ${right};`);
    }

    private processIfStatement(path: NodePath<t.IfStatement>) {
        const test = generate(path.node.test).code;
        this.glslCode.push(`if (${test}) {`);
        path.get("consequent").traverse({
            enter: childPath => this.glslCode.push(generate(childPath.node).code + ";")
        });
        if (path.node.alternate) {
            this.glslCode.push("} else {");
            path.get("alternate").traverse({
                enter: childPath => this.glslCode.push(generate(childPath.node).code + ";")
            });
        }
        this.glslCode.push("}");
    }

    private processForStatement(path: NodePath<t.ForStatement>) {
        const init = generate(path.node.init!).code;
        const test = generate(path.node.test!).code;
        const update = generate(path.node.update!).code;
        this.glslCode.push(`for (${init} ${test}; ${update}) {`);
        path.get("body").traverse({
            enter: childPath => this.glslCode.push(generate(childPath.node).code + ";")
        });
        this.glslCode.push("}");
    }

    private processWhileStatement(path: NodePath<t.WhileStatement>) {
        const test = generate(path.node.test).code;
        this.glslCode.push(`while (${test}) {`);
        path.get("body").traverse({
            enter: childPath => this.glslCode.push(generate(childPath.node).code + ";")
        });
        this.glslCode.push("}");
    }

    private processFunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
        const funcName = path.node.id!.name;
        const params = path.node.params.map(param => (t.isIdentifier(param) ? `float ${param.name}` : "")).join(", ");
        this.functions.push(`void ${funcName}(${params}) {`);
        path.get("body").traverse({
            enter: childPath => this.functions.push(generate(childPath.node).code + ";")
        });
        this.functions.push("}");
    }

    private mapGLSLType(typeName: string): string {
        switch (typeName) {
            case "Vector2":
                return "vec2";
            case "Vector3":
                return "vec3";
            case "Vector4":
                return "vec4";
            case "Matrix3":
                return "mat3";
            case "Matrix4":
                return "mat4";
            default:
                return "float";
        }
    }

    public generateShader(): string {
        return GLBuilder.autoFormat(`
            #version 300 es
            precision highp float;
            ${this.inVariables.join("\n")}
            ${this.uniformVariables.join("\n")}
            ${this.outVariables.join("\n")}
            ${this.functions.join("\n")}

            void main() {
                ${this.glslCode.join("\n")}
            }
        `);
    }
}
