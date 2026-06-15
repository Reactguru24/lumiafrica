type Listener = () => void

const listeners = new Set<Listener>()
let dataVersion = 0

export function subscribeLocalData(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function notifyLocalDataChange(): void {
  dataVersion++
  listeners.forEach((listener) => listener())
}

export function getDataVersion(): number {
  return dataVersion
}
