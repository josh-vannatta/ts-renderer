
export type ParticleWorkerProps = {

}

self.onmessage = function(event: { data: ParticleWorkerProps }) {
    self.postMessage({})
}