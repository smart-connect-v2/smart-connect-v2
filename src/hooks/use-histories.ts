import { useEffect, useMemo, useState } from 'react'
import useIoBrokerConnection from '../contexts/iobroker-connection'
import closestMinute from '../helpers/closest-minute'
import Device from '../types/device'

const useHistories = (
  device: Device,
  states: string[],
  from: number,
  to: number,
  dataPointsCount: number,
  aggregate: 'average' | 'min' | 'max' | 'total' | 'minmax' = 'minmax'
) => {
  const { connection } = useIoBrokerConnection()

  const [history, setHistory] = useState<
    {
      ts: number
      [state: string]: any
    }[]
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const intervalMs = useMemo(
    () => (to - from) / dataPointsCount,
    [from, to, dataPointsCount]
  )

  useEffect(() => {
    if (!connection || !states.length || !dataPointsCount) {
      return
    }

    const abortController = new AbortController()

    const fetchHistory = async () => {
      setLoading(true)
      setError(false)

      const stateHistories = await Promise.all(
        states.map(
          (state) =>
            connection.getHistory(`${device.id}.${state}`, {
              instance: 'influxdb.0',
              start: from,
              end: to,
              from: false,
              ack: false,
              q: false,
              addID: false,
              aggregate,
              returnNewestEntries: true,
              count: dataPointsCount,
            }) as Promise<{ val: any; ts: number }[]>
        )
      )

      if (abortController.signal.aborted) {
        return
      }

      const data = Object.fromEntries(
        states.map((state, index) => [state, stateHistories[index]])
      )

      const result = Array<{
        ts: number
        [state: string]: any
      }>(dataPointsCount)
        .fill(null as any)
        .map((_, i) => {
          const ts = closestMinute(new Date(from + i * intervalMs)).getTime()

          return {
            ts,
          }
        })

      for (const [i, entry] of Object.entries(result)) {
        for (const state of states) {
          const stateDataPoints = data[state]

          if (!stateDataPoints) {
            setError(true)
            setLoading(false)
            return
          }

          const { ts: entryTs } = entry
          const stateAtTs = stateDataPoints.find(
            ({ ts: dataPointTs }) => dataPointTs >= entryTs
          )

          if (!stateAtTs) {
            continue
          }

          // @ts-ignore
          result[i][state] = stateAtTs.val
        }
      }

      setHistory(result)
      setLoading(false)
      setError(false)
    }

    fetchHistory()

    return () => {
      abortController.abort()
    }
  }, [device.id, from, to, , states, dataPointsCount, aggregate])

  return [history, loading, error] as const
}

export default useHistories
