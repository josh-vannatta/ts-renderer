import React, { useEffect, useRef } from 'react';
import { GLContext } from '../glsl/GLContext';
import { GLRenderable } from '../glsl/GLRenderable';

interface GLCanvasProps {
    renderables: ((gl: GLContext) => GLRenderable)[];
    width?: number;
    height?: number;
}

const GLCanvas: React.FC<GLCanvasProps> = ({ renderables, width = 800, height = 600 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>(0);
    const glContextRef = useRef<GLContext | null>(null);
    const initializedRenderablesRef = useRef<GLRenderable[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Initialize GLContext
        const glContext = new GLContext({ width: canvas.width, height: canvas.height, canvas });
        glContextRef.current = glContext;

        // Initialize each GLRenderable using the provided functions
        initializedRenderablesRef.current = renderables.map(createRenderable => createRenderable(glContext));

        // Animation loop
        const animate = (time: number) => {
            glContext.clear();
            initializedRenderablesRef.current.forEach((renderable) => renderable.render(time));
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        // Start the animation loop
        animationFrameRef.current = requestAnimationFrame(animate);

        // Cleanup
        return () => {
            cancelAnimationFrame(animationFrameRef.current);
            initializedRenderablesRef.current.forEach((renderable) => renderable.dispose());
            initializedRenderablesRef.current = [];
            glContextRef.current = null;
        };
    }, [canvasRef.current, renderables]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
};

export default GLCanvas;
