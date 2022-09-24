import { useMemo } from 'react'
import useDeviceState from '../../../hooks/use-device-state'
import DataHook, { DataText } from '../use-data-hook/data-hook'

const useData: DataHook = (device) => {
  const [lux] = useDeviceState(device, 'lux', 0)

  const texts = useMemo<DataText[]>(
    () => [
      {
        id: 'lux',
        text: `${lux} Lux`,
      },
    ],
    [lux]
  )

  return {
    texts,
  }
}

export default useData
