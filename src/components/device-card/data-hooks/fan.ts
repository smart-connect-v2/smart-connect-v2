import { useMemo } from 'react'
import useDeviceState from '../../../hooks/use-device-state'
import DataHook, { DataText } from '../use-data-hook/data-hook'

const useData: DataHook = (device) => {
  const [on, setOn, , readyState] = useDeviceState(device, 'on', false)

  const texts = useMemo<DataText[]>(
    () => [
      {
        id: 'on',
        text: on ? 'On' : 'Off',
      },
    ],
    [on]
  )

  return {
    texts,
    toggleValue: on,
    onToggleChange: setOn,
    readyState,
  }
}

export default useData
