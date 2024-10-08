import { Scene as ThreeScene, GridHelper, Clock, Object3D } from 'three';
import { IsInteractive, RenderedEntity, ViewInteractions } from './RenderedEntity';
import { Lighting } from './Lighting';
import { Loader } from './Loader';

export class Scene {
    public helpers: boolean = false;
    public activeEntities: IsInteractive[] = [];
    public entities: RenderedEntity[] = [];
    private _scene: ThreeScene;

    constructor() { 
        this._scene = new ThreeScene();
    }

    public get instance() {
        return this._scene;
    }

    protected onClear() {

    }

    public clear() {
        this.onClear();
        this._scene.clear();
        this.entities = []
        this.activeEntities = []
    }

    public light(lighting: Lighting) {
        lighting.lights.forEach(light => this._scene.add(light));
    }

    private activate(entity: RenderedEntity) {                    
        if (ViewInteractions.isInstance(entity) &&
            !this.activeEntities.includes(entity))    
            this.activeEntities.push(entity);

        if (Loader.hasLoadedAssets(entity)) {
            entity.onLoad();
        }
        // if (RenderedInstances.isInstance(entity))
        //     entity.renderedEntities.forEach(child => this.activate(child));

        entity.childEntities.forEach(child => this.activate(child));        
    }

    private deactivate(entity: RenderedEntity, deactivated: Set<IsInteractive>) {
        if (ViewInteractions.isInstance(entity))    
            deactivated.add(entity);

        // if (RenderedInstances.isInstance(entity))
        //     entity.renderedEntities.forEach(child => this.deactivate(child, deactivated));

        entity.childEntities.forEach(child => this.deactivate(child, deactivated));    
    }

    public addEntity(entity: (RenderedEntity | IsInteractive | undefined)) {     
        if (!entity || this.entities.includes(entity))
            return;
        
        entity.onCreate();        
        entity.isCreated = true;  

        this._scene.add(entity);
        this.entities.push(entity);                    
        this.activate(entity);
        entity.onAdd(addition => this.activate(addition));
    }

    public add(...objects: (Object3D | RenderedEntity | IsInteractive)[]) {
        objects.forEach(object => {
            if (RenderedEntity.isInstance(object))
                return this.addEntity(object)

            this._scene.add(object);
        })

        return this;
    }

    public removeEntity(entity: RenderedEntity) {
        entity.onDestroy();
        entity.removeObservers();
        const deactivated = new Set<IsInteractive>();
        
        this._scene.remove(entity);
        this.entities = this.entities.filter(e => e != entity);
        this.deactivate(entity, deactivated);
        this.activeEntities = this.activeEntities.filter(e => deactivated.has(e));
    }
    
    public remove(...objects: (Object3D | RenderedEntity | IsInteractive)[]) {
        objects.forEach(object => {
            if (RenderedEntity.isInstance(object))
                return this.removeEntity(object)

            this._scene.remove(object);
        })

        return this;
    }

    public update(clock: Clock) {
        this.entities.forEach(entity => entity.update(clock));        
        this.activeEntities = this.activeEntities.filter(entity => entity.interactions.active);
    }

    public showHelpers(size, divisions) {
        const gridHelper = new GridHelper(size, divisions, 0x003300, 0x003300);
        this.helpers = true;
        this._scene.add( gridHelper );
    }

    public find(callback: ((entity: RenderedEntity | IsInteractive) => boolean))
    {
        return this.entities.find(callback);
    }

}