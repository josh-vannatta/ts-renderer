import {  Color, Group, Object3D, Vector3 } from 'three';
import { Font, FontLoader, GLTF, GLTFLoader, SkeletonUtils } from 'three/examples/jsm/Addons.js';
import { AssetRecord } from '../utils/AssetRegister';
import { MeshUtils } from '../utils/MeshUtils';

export interface AssetOptions { 
    position?: Vector3,
    rotation?: number,
    scale?: Vector3,
    color?: string
}

export type LoadedEntity = Object3D | undefined

interface AssetOptionRecord { [asset: string]: AssetOptions }

export class AssetLoader {
    public static compiled: {
        [asset: string]: Group
    } = {};

    public static options: AssetOptionRecord = {};
    public static requestedAssets: string[] = []
    public static globalAssets: AssetRecord[] = [];

    constructor(public localAssets: AssetRecord = {}) { 
        this.load(localAssets);
        
        AssetLoader.globalAssets.forEach(assets => {
            Object.keys(assets).forEach(asset => {
                if (localAssets[asset])
                    return;

                this.addAsset(asset, assets[asset].location, {
                    position: this.convertVector(assets[asset].position),
                    rotation: assets[asset].rotation,
                    scale: this.convertVector(assets[asset].scale),
                    color: assets[asset].color
                })
            })
        })
    }

    public static build(assets: AssetRecord = {}) {
        const instance = new AssetLoader();

        instance.load(assets);

        return instance;
    }

    public load(assets: AssetRecord) {
        Object.keys(assets).forEach(asset => {
            this.addAsset(asset, assets[asset].location, {
                position: this.convertVector(assets[asset].position),
                rotation: assets[asset].rotation,
                scale: this.convertVector(assets[asset].scale),
                color: assets[asset].color
            })
        })
    }

    private convertVector(vector?: { x: number, y: number, z?: number}): Vector3 | undefined {
        if (!vector) return;

        return new Vector3(vector.x, vector.y, vector.z);
    }

    public get(asset: string): LoadedEntity {
        const location = this.localAssets[asset]?.location;

        if (location) {
            const clone = SkeletonUtils.clone(AssetLoader.compiled[location]);

            clone["color"] = AssetLoader.compiled[location]["color"];

            return clone;
        }
    }

    public addAsset(asset: string, location: string, options?: AssetOptions) { 
        this.localAssets[asset] = {
            location,
            ...options
        };

        if (AssetLoader.requestedAssets.includes(location))
            return;

        AssetLoader.requestedAssets.push(location);22

        if (options)
            AssetLoader.options[location] = {
                position: new Vector3(
                    options.position?.x ?? 0, 
                    options.position?.y ?? 0,
                    options.position?.z ?? 0,
                ),
                scale: new Vector3(
                    options.scale?.x ?? 1, 
                    options.scale?.y ?? 1,
                    options.scale?.z ?? 1,),
                rotation: options.rotation ?? 0,
                color: options.color
            };
    }

    public static register(asset: string, scene: Group) {
        AssetLoader.compiled[asset] = scene;
    }
}

export interface HasLoadedAssets {
    onLoad(): void;
}

export class Loader {
    public fontDirectory: string = '';
    private loaded: number = 0;

    public get isLoaded() {
        return this.loaded;
    }

    private loadResponses: ((amount: number, message?: string) => void)[] = [];

    public onLoad(callback: (amount: number, message?: string) => void) {
        this.loadResponses.push(callback);
    }

    public setLoaded(loaded: number, message?: string) {
        this.loaded = (
            loaded >= 100 ? 100 :
            loaded <= 0 ? 0 : loaded
        );
        
        this.loadResponses.forEach(responder => 
            responder(this.loaded, message ? message : '')
        );        
    }

    private static loadInstance: AssetLoader = new AssetLoader();

    public static load(assets: AssetRecord) {
        this.loadInstance.load(assets);
        AssetLoader.globalAssets.push(assets)
    }

    public static hasLoadedAssets(object: any): object is HasLoadedAssets {
        if (!!object && typeof object.onLoad === "function")
            return true;
    
        return false;
    }
    
    public loadAssets(): Promise<boolean> {    
        let modelsLoaded = 0;
        const loader = new GLTFLoader();         

        return new Promise((resolve, reject) => {
            if (AssetLoader.requestedAssets.length == 0) 
                resolve(true);        
                
            let percent = 0;
        
            const handleSuccess = (asset: string) => (loadedAsset: GLTF) => {                         
                const options = AssetLoader.options[asset];
                const scene = loadedAsset.scene;

                scene.animations = loadedAsset.animations;
                
                if (options) {
                    let rotation = options.rotation ?? 0;

                    rotation = rotation * Math.PI / 180;

                    scene.scale.copy(options.scale ?? new Vector3(1,1,1));
                    scene.position.copy(options.position ?? new Vector3(0,0,0));
                    scene.rotateY(rotation ?? 0);

                    if (options.color)
                        MeshUtils.setColor(scene, options.color)
                }                
                
                modelsLoaded++;
                AssetLoader.register(asset, scene);                     
                percent = Math.ceil(modelsLoaded / AssetLoader.requestedAssets.length * 100);   
                
                this.setLoaded(percent, `Loading asset for [${asset}]`);     

                if (percent >= 100)
                    resolve(true);
            }

            const handleNext = (asset) => () => {}

            const handleError = (asset) => (error) => {
                console.error(`Error: Asset "${asset}" ${error.currentTarget?.statusText.toLowerCase()}`);
                this.setLoaded(percent, `Error: Asset "${asset}" ${error.currentTarget?.statusText.toLowerCase()}`);
            }

            AssetLoader.requestedAssets.forEach(asset => {
                if (asset == "" || !asset){
                    modelsLoaded++;
                    percent = Math.ceil(modelsLoaded / AssetLoader.requestedAssets.length * 100);  
                    console.warn(`Warning: Asset "${asset}" is invalid`);
                    return;
                }

                loader.load(asset,
                    handleSuccess(asset),
                    handleNext(asset), 
                    handleError(asset)
                );
            })
        });
    }

    public loadFont(fontName: string) {
          const loader = new FontLoader();
          return new Promise((resolve, reject) => {
            loader.load( `${this.fontDirectory}/${fontName}.typeface.json`, 
                (font: Font) => resolve(font),
                () => console.log(`Loading ${fontName}...`),
                error => reject(error)                
            );
        })
    }
}