export class ArrayUtils {
    public static flatten<T extends any>(connections: (T | T[])[]): T[] {
        let out: T[] = [];

        connections.forEach(conn => {
            if (Array.isArray(conn))
                out.push(...conn);
            else
                out.push(conn);
        });

        return out;
    }

    public static concatFloat32(...arrays: Float32Array[]): Float32Array {
        // Calculate the total length of the concatenated array
        const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
        
        // Create a new Float32Array with the total length
        const result = new Float32Array(totalLength);
    
        // Set each Float32Array in the result
        let offset = 0;
        for (const arr of arrays) {
            result.set(arr, offset);  // Copy elements of `arr` starting at the `offset`
            offset += arr.length;     // Update the offset for the next array
        }
    
        return result;
    }

    public static subFloat32(arr: Float32Array, x: number): Float32Array[] {
        const result: Float32Array[] = [];
    
        // Number of sub-arrays required
        const numSubArrays = Math.ceil(arr.length / x);
    
        // Iterate through the array and slice sub-arrays
        for (let i = 0; i < numSubArrays; i++) {
            const start = i * x;
            const end = Math.min(start + x, arr.length);
            
            // Slice the Float32Array from start to end and add it to result
            result.push(arr.slice(start, end));
        }
    
        return result;
    }

    public static unique(array: any[]) {        
        const isUnique = (edge, index, self) => 
            self.indexOf(edge) === index;

        return array.filter(isUnique);
    }

    public static combine(set: Set<any>, other: Set<any>) {
        other.forEach(item => {
            if (!set.has(item))
                set.add(item);
        });
    }

    public static forEachRandom<T>(array: Array<T>, callback: (item: T, index: number ) => void) {
        let indices: number [] = [];

        while (indices.length != array.length) {
            let next = Math.floor(Math.random() * array.length);

            if (indices.includes(next))
                continue;

            callback(array[next], next);
            indices.push(next);
        }
    }
}