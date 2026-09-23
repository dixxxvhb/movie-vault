import { useEffect, useState } from 'react'

// The room needs the film's cast (headshots, actor names). vault-data.json is
// already cached by the app, so this is a memory hit, not a second download.
const BASE = import.meta.env.BASE_URL || '/'
let dataPromise = null
export function useVaultData() {
  const [d, setD] = useState(null)
  useEffect(() => {
    if (!dataPromise) dataPromise = fetch(BASE + 'vault-data.json').then((r) => r.json()).catch(() => ({}))
    let live = true
    dataPromise.then((x) => { if (live) setD(x) })
    return () => { live = false }
  }, [])
  return d
}
