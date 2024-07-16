import TWEEN from '@tweenjs/tween.js';

interface EasingFunction {
    In: (k: number) => number;
    Out: (k: number) => number;
    InOut: (k: number) => number;
}

interface BasicEasingFunction {
    None: (k: number) => number;
}

type TweenEasing = {
    Back: EasingFunction, 
    Bounce: EasingFunction, 
    Circular: EasingFunction, 
    Cubic: EasingFunction, 
    Elastic: EasingFunction, 
    Exponential: EasingFunction, 
    Linear: BasicEasingFunction, 
    Quadratic: EasingFunction, 
    Quartic: EasingFunction, 
    Quintic: EasingFunction, 
    Sinusoidal: EasingFunction 
}

const Easing: TweenEasing = TWEEN.Easing;

export const { 
    Back, 
    Bounce, 
    Circular, 
    Cubic, 
    Elastic, 
    Exponential, 
    Linear, 
    Quadratic, 
    Quartic, 
    Quintic, 
    Sinusoidal 
} = Easing;

