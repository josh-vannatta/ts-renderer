import { MeshBasicMaterial, DoubleSide, RingGeometry, Mesh, Vector3 } from "three";
import { RenderedEntity } from "../../../renderer/RenderedEntity";

export enum BackgroundSize {
    Near = 1000,
    Moderate = 2000,
    Far = 5000
}

export class Background extends RenderedEntity {
    public static Opacity: number = .03;

    private currentScale: number;
    private segmentsX: Mesh[] = [];
    private segmentsY: Mesh[] = [];
    private segmentsZ: Mesh[] = [];

    public static Segment(size: BackgroundSize) {
        return new Mesh(   
            new RingGeometry(size, size + 1, 4, 1),
            new MeshBasicMaterial({
                color: 'rgb(0,255,255)',
                opacity: this.Opacity,
                transparent: true,
                side: DoubleSide,
                wireframe: true
            }));
    }

    constructor(
        public size: BackgroundSize, 
        public divisions: number) 
    { super(); }

    public onCreate() {
        this.currentScale = 1;
        
        for (let i = 0; i <= this.divisions; i++) {
            let position = i * this.size / this.divisions * 1.415 - this.size * 1.415 / 2;
            let segment = Background.Segment(this.size);

            segment.rotateX(Math.PI / 2);
            segment.rotateZ(Math.PI / 4)
            segment.position.y = position;
            this.add(segment);
            this.segmentsY.push(segment);
            
            segment = Background.Segment(this.size);
            segment.rotateY(Math.PI / 2);
            segment.rotateZ(Math.PI / 4)
            segment.position.x = position;
            this.add(segment);
            this.segmentsX.push(segment);
            
            segment = Background.Segment(this.size);
            segment.rotateZ(Math.PI / 4)
            segment.position.z = position;
            this.add(segment);
            this.segmentsZ.push(segment);
        }      
    }

    public onUpdate() { }

    public setScale(size: number) {
        let scale = size / this.size;

        if (scale == this.currentScale ||  
            size < this.size)
            return;

        this.currentScale = scale;
        this.scale.set(scale, scale, scale);
    }   
}