import TWEEN from '@tweenjs/tween.js';

function stripEntityForProps(mesh, props) {
    let out = {};
    for (const key in props) {
        const value = props[key];
        
        if (!mesh.hasOwnProperty(key))
            continue;

        if (typeof value == 'object' && value !== null){
            out[key] = stripEntityForProps(mesh[key], value);
        } else {
            if (mesh.hasOwnProperty(key))
                out[key] = mesh[key];
        }
    }
    return out;
}

function deflate(source, path: any[] = [], result = {}){
    let key, value, newKey;
    for (const i in source) {
        if (source.hasOwnProperty(i)) {
            key = i;
            value = source[i];
            path.push(key);

            if (typeof value === 'object' && value !== null) {
                result = deflate(value, path, result);
            } else {
                newKey = path.join('.');
                result[newKey] = value;
            }
            path.pop();
        }
    }    
    return result;
};

export function animate(entity, finalState, time) {
    let start = stripEntityForProps(entity, finalState);  
    let deflateStart = deflate(start);
    let deflateEnd = deflate(finalState);

    let tween = new TWEEN.Tween(deflateStart)
        .to(deflateEnd, time)
        .onUpdate(function(this: any) {                      
            for (const key in this._object) {
                let parts = key.split('.');
                
                if (parts.length == 1) 
                    entity[parts[0]] = this._object[key];

                if (parts.length == 2) 
                    entity[parts[0]][parts[1]] = this._object[key];   

                if (parts.length == 3) 
                    entity[parts[0]][parts[1]][parts[2]] = this._object[key]; 

                if (parts.length == 4) 
                    entity[parts[0]][parts[1]]
                        [parts[2]][parts[3]] = this._object[key];     

                if (parts.length == 5) 
                    entity[parts[0]][parts[1]][parts[2]]
                        [parts[3]][parts[4]] = this._object[key]; 

                if (parts.length == 6) 
                    entity[parts[0]][parts[1]][parts[2]]
                        [parts[3]][parts[4]][parts[5]]  = this._object[key];     
                    
                if (parts.length == 7) 
                    entity[parts[0]][parts[1]][parts[2]]
                        [parts[3]][parts[4]][parts[5]][parts[6]] = this._object[key]; 

                if (parts.length == 8) 
                    entity[parts[0]][parts[1]][parts[2]][parts[3]]
                        [parts[4]][parts[5]][parts[6]][parts[7]] = this._object[key]; 

                if (parts.length == 9) 
                    entity[parts[0]][parts[1]][parts[2]][parts[3]]
                        [parts[4]][parts[5]][parts[6]][parts[7]][parts[8]] = this._object[key]; 

                if (parts.length == 10) 
                    entity[parts[0]][parts[1]][parts[2]][parts[3]][parts[4]]
                        [parts[5]][parts[6]][parts[7]][parts[8]][parts[9]] = this._object[key]; 
            }   
        })
    
    return tween;
}

export function update() {    
    TWEEN.update();
}