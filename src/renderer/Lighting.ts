import { HemisphereLight, DirectionalLight, AmbientLight, Light} from 'three';

export class Lighting {
    public readonly BASIC = 'basic';
    public lights: Light[] = [];

    constructor() {}

    public configure(setting): void {
        switch (setting) {
            case this.BASIC:
                this.basicLights();
                break;
        }
    }

    public addLight(light: Light) {
        this.lights.push(light);
    }

    protected basicLights() {        
        const hemisphereLight = new HemisphereLight(0Xaaaaaa, 0X000000, .8);
        const shadowLight = new DirectionalLight(0xffffff, .8);
        const ambientLight = new AmbientLight(0xebf6ff, .5);
  
        shadowLight.position.set(150, 350, 350);
        shadowLight.castShadow = true;
        shadowLight.shadow.camera.left = -400;
        shadowLight.shadow.camera.right = 400;
        shadowLight.shadow.camera.top = 400;
        shadowLight.shadow.camera.bottom = -400;
        shadowLight.shadow.camera.near = 1;
        shadowLight.shadow.camera.far = 10000;
        shadowLight.shadow.mapSize.width = 2048;
        shadowLight.shadow.mapSize.height = 2048;

        this.lights = [
            hemisphereLight,
            shadowLight,
            ambientLight
        ]
    }
}