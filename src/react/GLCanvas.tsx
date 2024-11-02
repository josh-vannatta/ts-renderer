import React, { useRef, useEffect, useState } from 'react';
import { GLRenderable } from '../glsl/GLRenderable';
import { GLContext } from '../glsl/GLContext';

interface GLCanvasProps {
    renderables: GLRenderable[];
}

const GLCanvas: React.FC<GLCanvasProps> = ({ renderables }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        // Initialize WebGL context
        const glContext = new GLContext({ width: canvas.width, height: canvas.height, canvas });

        // Initialize each renderable with the WebGL context
        renderables.forEach(renderable => renderable.initialize(glContext));

        // Animation loop
        const animate = (time: number) => {
            glContext.clear();  // Clear the canvas before each frame

            renderables.forEach(renderable => {
                renderable.program?.use();  // Use the program for each renderable
                renderable.render(time);    // Render each element independently
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            renderables.forEach(renderable => renderable.dispose());
        };
    }, [renderables]);

    return (
        <canvas
            ref={canvasRef}
            width="800"
            height="600"
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
};

export default GLCanvas;
