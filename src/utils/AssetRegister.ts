type Vector = {
    x: number,
    y: number,
    z?: number
}

export type Asset = {
    location: string,
    name?: string,
    description?: string,
    position?: Vector,
    color?: string,
    scale?: Vector,
    rotation?: number,
    extension?: string
};

export interface AssetRecord {
    [asset: string]: Asset
}

export class AssetRegister<Category extends string> {
    private _assets: Record<Category, AssetRecord>;
    public category: Record<Category, AssetRecord>;

    constructor(value: any, rootDirectory: string = "") {
        this._assets = <Record<Category, AssetRecord>> {};

        Object.keys(value).forEach(category => {
            const record: AssetRecord = {
                default: { location: "" }
            }; 

            Object.keys(value[category]).forEach(asset => {
                if (typeof value[category][asset] == "string") {
                    record[asset] = { location: value[category][asset] }
                    record[asset].extension = this.getExtension(record[asset].location);
                    return;
                } else {
                   record[asset] = value[category][asset];
                }

                record[asset].location = rootDirectory + record[asset].location;
                record[asset].extension = this.getExtension(record[asset].location);
            });

            this._assets[category] = record;
        });

        this.category = this._assets;
    }

    private getExtension(location: string): string | undefined {
        const parts = location.split(".")
                
        return parts.length > 0 ? parts[parts.length - 1] : undefined;
    }

    public static Build<T extends string>(value: any, root: string = ""): AssetRegister<T> {
        return new AssetRegister<T>(value, root);
    }

    public getCategory(category: Category): AssetRecord {
        let cat = this._assets[category];
        
        if (cat != null)
            return cat;

        return {};
    }

    public asset(category: Category, asset: string): Asset {
        let cat = this.getCategory(category);

        if (cat[asset] == null)
            return { location: "" };

        return !!cat[asset] ? cat[asset] : { location: "" };
    }
}

