import { createContext, FC, ReactNode, useCallback, useContext } from 'react'
import useIoBrokerConnection from '../iobroker-connection'

type IoBrokerStates = {
  subscribeState(
    id: string,
    cb: (val: any) => void,
    signal: AbortSignal
  ): Promise<void>
  updateState(id: string, val: any): void
}

const IoBrokerStatesContext = createContext<IoBrokerStates>({
  subscribeState: () => {
    throw new Error('State provider not initialized yet')
  },
  updateState: () => {
    throw new Error('State provider not initialized yet')
  },
})

export const IoBrokerStatesProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { connection } = useIoBrokerConnection()

  const updateState = useCallback(
    async function (id: string, value: any) {
      if (!connection) {
        throw new Error('Not connected to ioBroker')
      }

      await connection.setState(id, {
        val: value,
      })
    },
    [connection]
  )

  const subscribeState = useCallback(
    async (id: string, cb: (val: any) => void, signal: AbortSignal) => {
      if (!connection) {
        throw new Error('Not connected to ioBroker')
      }

      const usedCb = (id: string, state: any) => {
        if (!state) {
          return
        }

        cb(state.val)
      }

      try {
        const initialValue = await connection.getState(id)

        if (initialValue && !signal.aborted) {
          cb(initialValue.val)
        }
      } catch (e) {
        throw new Error('Failed to subscribe', {
          cause: e,
        })
      }

      if (signal.aborted) {
        return
      }

      await connection.subscribeState(id, usedCb)

      signal.addEventListener('abort', () => {
        connection.unsubscribeState(id, usedCb)
      })
    },
    [connection]
  )

  return (
    <IoBrokerStatesContext.Provider
      value={{
        subscribeState,
        updateState,
      }}
    >
      {children}
    </IoBrokerStatesContext.Provider>
  )
}

export const useIoBrokerStates = () => useContext(IoBrokerStatesContext)

export default IoBrokerStatesContext
