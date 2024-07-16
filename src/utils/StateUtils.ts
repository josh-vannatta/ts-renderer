import { RenderedEntity } from '../renderer/RenderedEntity';
import { mutate } from './AnimationUtils';
import { Linear } from './Easing';

function overwriteObject(x, y) {
    if (typeof x != 'object' || typeof y != 'object')
        return x;

    let out = { ...x };

    for (let prop in y) {
        if (typeof out[prop] == 'object') 
            out[prop] = overwriteObject(x[prop], y[prop])
        else 
            out[prop] = y[prop]
    }

    return out;
}

type EasingMethod = (k: number) => number;

interface StateProps {
    updates?: any;
    hidden?: any;
    duration?: number;
    hideDuration?: number;
    easing?: EasingMethod;
}

export abstract class State {
    updates: any = {};
    hidden: any = {};
    duration: number = 0;
    hideDuration: number;
    easing: EasingMethod = Linear.None;
    finished: boolean;
    reset: any = {};
    startTime: number = Date.now();

    constructor(props?: StateProps) {
        this.finished = false;
        this.updates = props?.updates ?? {};
        this.hidden = props?.hidden ?? {};
        this.duration = props?.duration ?? 0;
        this.hidden = props?.hideDuration ?? this.duration;
        this.easing = props?.easing ?? Linear.None;
        
        if (!this.hideDuration)
            this.hideDuration = this.duration;
    }

    public onCreate(entity?: RenderedEntity): any {}
    public onEnter(entity?: RenderedEntity) {}
    public onExit(entity?: RenderedEntity) {}    
    public onUpdate(entity?: RenderedEntity){}
    public onFinish(entity?: RenderedEntity){}
    public onHide(entity?: RenderedEntity){}
    public onShow(entity?: RenderedEntity){}

    public getElapsedTime() {
        return Date.now() - this.startTime;
    }

    public mutate(updates: any): State {
        this.updates = overwriteObject(this.updates, updates);
        return this;
    }

    public visibility(visible: boolean) {
        if (!visible)
            this.updates = overwriteObject(this.updates, this.hidden);
        else    
            this.updates = { ...this.reset };               
    }

    public toString() {
        return this.type;
    }

    public get type() {
        return this.constructor.name;
    }
}

export class StateTransition extends State {
    public isTransition: boolean = true;
}

function instanceOfTransition(object: any): object is StateTransition {
    return object.isTransition;
}

export class NullState extends State {}

export class StateMachine {
    public visible: boolean;
    public locked: boolean;
    private _animations: any[] = [];
    private _lastState: State;
    private _state: State;
    private _transition: StateTransition;

    constructor(private entity: RenderedEntity) {
        this.locked = false;
        this.visible = true;
        this._lastState = new NullState();
        this._state = new NullState();
    }

    public get current() {
        return this._state;
    }
    
    public update() {
        if (!this.is(NullState) && !this._state.finished)
            this._state.onUpdate(this.entity);

        if (this._transition && !this._transition.finished)
            this._transition.onUpdate(this.entity);
    }

    public transition(options: StateProps) {
        this.transitionTo(new StateTransition(options));
    }

    private initialize(state: State) {     
        state.updates = overwriteObject(state.updates, state.onCreate(this.entity));
        state.reset = { ...state.updates };
        state.onEnter(this.entity);
        state.startTime = Date.now();
        state.visibility(this.visible);
    }

    private transitionTo(state: StateTransition) {    
        if (this.locked || state.duration <= 0) 
            return;
            
        this.initialize(state);
        this.animate(state);
        this._transition = state;
    }

    public set(state: State) {
        if (this.locked) 
            return;

        if (instanceOfTransition(state))
            return this.transitionTo(state);

        if (!this.is(NullState) && this._state.type == state.type) 
            return;   

        this.initialize(state);
        this.animate(state);

        if (!this.is(NullState))   
            this._state.onExit(this.entity);

        this._lastState = this._state;
        this._state = state;          
    }

    private animate(state: State, duration: number = state.duration, resolve: () => void = () => {}) {
        this._animations.forEach(animation => animation.stop())
        this._animations = [];      

        let animation = mutate(this.entity, state.updates, duration)
            .easing(state.easing)
            .onComplete(()=> { 
                state.finished = true; 
                state.onFinish(this.entity);                
                resolve();
                
                if (this._transition && this._transition.duration > 0) {
                    this._transition.duration -= state.duration;
                    this.transitionTo(this._transition);
                }
            })
            .start();

        this._animations.push(animation)
    }

    public is(State): boolean {
        return this._state instanceof State;
    }

    public get finished() {
        return this._state.finished;   
    }

    public get type() {
        if (this._state != undefined)
            return this._state.toString();

        return 'null';
    }

    public visibility(visible: boolean) {
        if (this.visible == visible)
            return;

        this.visible = visible;
        this._state.visibility(visible);

        if (visible) {
            this.entity.visibleRecursive = true;
            this._state.onShow(this.entity);  
        }

        this.animate(this._state, this._state.hideDuration, () => {        
            if (!visible) {
                this.entity.visibleRecursive = false;
                this._state.onHide(this.entity);  
            }
        });        
    }

    public reset() {        
        if (this._lastState == undefined)
            return;

        if (this._lastState.type == this._state.type)
            return;
            
        this.set(this._lastState);
    }

    public toString() {
        return this.type;
    }
}