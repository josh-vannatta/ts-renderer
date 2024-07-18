import {  Color, Group, Vector3 } from 'three';
import { Font, FontLoader, GLTF, GLTFLoader } from 'three/examples/jsm/Addons.js';
import { AssetRecord } from '../utils/AssetRegister';
import { MeshUtils } from '../utils/MeshUtils';

export interface AssetOptions { 
    position?: Vector3,
    rotation?: number,
    scale?: Vector3,
    color?: string
}

interface AssetOptionRecord { [asset: string]: AssetOptions }

export class LoadedAssets {
    public static compiled: {
        [asset: string]: Group
    } = {};

    public static options: AssetOptionRecord = {};
    public static requestedAssets: string[] = []
    public static globalAssets: AssetRecord[] = [];

    constructor(public localAssets: AssetRecord = {}) { 
        this.load(localAssets);
        
        LoadedAssets.globalAssets.forEach(assets => {
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
        const instance = new LoadedAssets();

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

    public getAsset(asset: string) {
        const location = this.localAssets[asset]?.location;

        if (location) {
            const clone = LoadedAssets.compiled[location].clone();

            clone["color"] = LoadedAssets.compiled[location]["color"];

            return clone;
        }
    }

    public addAsset(asset: string, location: string, options?: AssetOptions) { 
        this.localAssets[asset] = {
            location,
            ...options
        };

        if (LoadedAssets.requestedAssets.includes(location))
            return;

        LoadedAssets.requestedAssets.push(location);22

        if (options)
            LoadedAssets.options[location] = {
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
        LoadedAssets.compiled[asset] = scene;
    }
}

export interface HasLoadedAssets {
    loadedAssets: LoadedAssets;
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

    private static loadInstance: LoadedAssets = new LoadedAssets();

    public static register(assets: AssetRecord) {
        this.loadInstance.load(assets);
        LoadedAssets.globalAssets.push(assets)
    }

    public static hasLoadedAssets(object: any): object is HasLoadedAssets {
        if (!!object && !!object.loadedAssets)
            return true;
    
        return false;
    }
    
    public loadAssets(): Promise<boolean> {    
        let modelsLoaded = 0;
        const loader = new GLTFLoader();         

        return new Promise((resolve, reject) => {
            if (LoadedAssets.requestedAssets.length == 0) 
                resolve(true);        
                
            let percent = 0;
        
            const handleSuccess = (asset: string) => (loadedAsset: GLTF) => {                         
                const options = LoadedAssets.options[asset];
                const scene = loadedAsset.scene;
                
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
                LoadedAssets.register(asset, scene);                     
                percent = Math.ceil(modelsLoaded / LoadedAssets.requestedAssets.length * 100);   
                
                this.setLoaded(percent, `Loading asset for [${asset}]`);     

                if (percent >= 100)
                    resolve(true);
            }

            const handleNext = (asset) => () => {}

            const handleError = (asset) => (error) => {
                console.error(`Error: Asset "${asset}" ${error.currentTarget?.statusText.toLowerCase()}`);
                this.setLoaded(percent, `Error: Asset "${asset}" ${error.currentTarget?.statusText.toLowerCase()}`);
            }

            LoadedAssets.requestedAssets.forEach(asset => {
                if (asset == "" || !asset){
                    modelsLoaded++;
                    percent = Math.ceil(modelsLoaded / LoadedAssets.requestedAssets.length * 100);  
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