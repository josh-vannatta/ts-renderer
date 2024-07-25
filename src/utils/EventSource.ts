export class EventObserver<T = any> {
    public simple: boolean = false;
    private _onUpdate: (event: T) => void = () => {};
    private _onDestroy: () => void = () => {};

    constructor(public id: string) {}

    public onUpdate(handler: (event: T) => void ) {
        this._onUpdate = handler;

        return this;
    }

    public onDestroy(handler: () => void) {
        this._onDestroy = handler;

        return this;
    }

    public update(event: T) {
        if (this._onUpdate)
            this._onUpdate(event);
    }

    public destroy() {
        if (this._onDestroy)
            this._onDestroy();
    }
}

export class EventSource<T = any> {
    private _observers: EventObserver<T>[];
    private _record: EventRecord<T>;

    constructor() {
        this._observers = [];
        this._record = {};
    }

    public clear() {
        Object.values(this._observers).forEach(observer => {
            this.removeObserver(observer);
        })
    }

    public addObserver(observer: EventObserver<T>) {
        if (!this._record[observer.id]) 
            this._record[observer.id] = [];

        this._observers.push(observer);
        this._record[observer.id].push(observer);
    }

    public removeObservers(id: string) {
        this._record[id].forEach(o => o.destroy());
        this._observers = this._observers.filter(o => o.id != id);
        delete this._record[id];
    }

    public removeObserver(observer: EventObserver<T>) {
        observer.destroy();
        
        this._observers = this._observers.filter(o => o != observer);
        
        if (this._record[observer.id]) 
            this._record[observer.id] = this._record[observer.id].filter(o => o != observer);
    }

    public getObservers(id: string) {
        return this._record[id];
    }

    public notify(event: T, id?: string) {
        this._observers.forEach(observer => {
            if (id && observer.id != id)
                return;

            observer.update(event);
        });
    }

    public onUpdate(id: string, handler: (event: T) => void) {
        const observer = new EventObserver<T>(id);
        
        observer.onUpdate(handler);
        this.addObserver(observer);

        return observer;
    }
}

export type EventRecord<T = any> = {
    [id: string]: EventObserver<T>[]
}