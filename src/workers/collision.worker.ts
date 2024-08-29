
export type CollissionWorkerProps = {

}

self.onmessage = function(event: { data: CollissionWorkerProps }) {
    self.postMessage({})
}