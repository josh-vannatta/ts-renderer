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