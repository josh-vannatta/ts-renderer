import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PerspectiveCamera, Vector3 } from 'three';
import { EventSource, EventObserver } from '../utils/EventSource';

type CameraSetup = {
    far?: number,
    focus?: Partial<Vector3>,
    position?: Partial<Vector3>,
    controls?: boolean
}

export class Camera {
    private camera: PerspectiveCamera;
    public controls: OrbitControls;
    public activeControls: boolean = false;
    public aspect: number = 1.33;
    public far: number = 2000;
    public near: number = 5;
    public fov: number = 35;
    public lastPosition: Vector3;
    private _listeners: EventSource<Camera>;
    private canvas: HTMLCanvasElement
    
    constructor() {
        this._listeners = new EventSource<Camera>();
     }

    public bind(canvas: HTMLCanvasElement) {  
        this.aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera = new PerspectiveCamera(
            this.fov,
            this.aspect,
            this.near,
            this.far
        );        
        this.canvas = canvas;
        this.lastPosition = new Vector3().copy(this.position());
        this.controls = new OrbitControls(this.camera, this.canvas);
    }

    public setup(setup: CameraSetup) {
        if (setup.far)
            this.settings.far = 20000;

        if (setup.focus)
            this.camera.lookAt(new Vector3(setup.focus.x, setup.focus.y, setup.focus.z));

        if (setup.position)
            this.camera.position.copy(new Vector3(setup.position.x, setup.position.y, setup.position.z))

        if (setup.controls)
            this.enableControls(); 
    }

    public get settings() {
        return this.camera;
    }

    public get target() {
        return this.controls.target;
    }

    public addObserver(observer: EventObserver<Camera>) {
        this._listeners.addObserver(observer);
    }

    public removeObserver(observer: EventObserver<Camera>) {
        this._listeners.removeObservers(observer.id);
    }

    public update() {
        if (this.activeControls) 
            this.controls.update();

        this.fov = this.camera.fov * Math.PI / 180;
        this.aspect = this.camera.aspect = 
            this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();

        if (!this.lastPosition.equals(this.position())) 
            this._listeners.notify(this);

        this.lastPosition = this.lastPosition.copy(this.position());
    }

    public get lense() {
        return this.camera;
    }

    public position() {
        return this.camera.position;
    }

    public setPosition(position) {
        this.camera.position.set(position.x, position.y, position.z);
    }   

    public lookAt(point) {
        this.camera.lookAt(point)
    }

    public enableControls() {
        this.activeControls = true;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
    }

    public disableControls() {
        this.activeControls = false;
    }

    public setAngleRange(min: number, max: number) {
        this.controls.minPolarAngle = min;
        this.controls.maxPolarAngle = max;
    }

    public distanceTo(position: Vector3): number {
        return this.camera.position.distanceTo(position);
    }
}