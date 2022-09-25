import { useTheme } from '@emotion/react'
import {
  capitalize,
  ButtonGroup,
  Button,
  IconButton,
  LinearProgress,
} from '@mui/material'
import { indigo, purple, pink } from '@mui/material/colors'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
  CartesianGrid,
  Line,
} from 'recharts'
import forwardBaseProps from '../../helpers/forward-base-props'
import useHistories from '../../hooks/use-histories'
import useRect from '../../hooks/use-rect'
import Device from '../../types/device'
import Icon from '../icon'

export type HistoryDetailsProps = {
  device: Device
  states: string[]
}

const availableTimeFrames = [
  '1h',
  '3h',
  '6h',
  '12h',
  '1d',
  '3d',
  '1w',
  '2w',
  '1m',
  '3m',
  '6m',
  '1y',
]

const onlyVisibleOnFullScreen = ['1h', '6h', '12h', '2w', '6m', '1y']

const timeFrameMinutes = {
  '1h': 60,
  '3h': 180,
  '6h': 360,
  '12h': 720,
  '1d': 1440,
  '3d': 4320,
  '1w': 10080,
  '2w': 20160,
  '1m': 43800,
  '3m': 131400,
  '6m': 262800,
  '1y': 525600,
} as {
  [key: AvailableTimeFrame]: number
}

const timeFrameIntervalMinutes = {
  '1h': 1,
  '3h': 2,
  '6h': 5,
  '12h': 5,
  '1d': 5,
  '3d': 30,
  '1w': 60,
  '2w': 3 * 60,
  '1m': 3 * 60,
  '3m': 6 * 60,
  '6m': 12 * 60,
  '1y': 12 * 60,
} as {
  [key: AvailableTimeFrame]: number
}

type AvailableTimeFrame = typeof availableTimeFrames[number]

const dataKeyNames = {
  co2: 'CO2',
  'download-megabits': 'Download',
  'upload-megabits': 'Upload',
}

const tooltipFormatter = (value: number, name: string) => [
  `${Math.round(value * 100) / 100}${
    {
      temperature: '°C',
      humidity: '%',
      co2: 'ppm',
      'download-megabits': 'Mbit/s',
      'upload-megabits': 'Mbit/s',
      power: 'W',
    }[name]
  }`,
  // @ts-ignore
  capitalize(dataKeyNames[name] || name),
]

const HistoryDetails = forwardBaseProps<HistoryDetailsProps>(
  ({ device, states }, baseProps) => {
    const [selectedTimeFrame, setSelectedTimeFrame] =
      useState<AvailableTimeFrame>('3h')

    const [now, setNow] = useState(Date.now())
    const from = useMemo(
      () => now - timeFrameMinutes[selectedTimeFrame] * 60 * 1000,
      [selectedTimeFrame]
    )
    const to = useMemo(() => now, [now])

    const interval = useMemo(
      () => timeFrameIntervalMinutes[selectedTimeFrame] * 60 * 1000,
      [selectedTimeFrame]
    )

    const [isFullscreen, setIsFullscreen] = useState(false)

    const [histories, loading, error] = useHistories(
      device,
      states,
      from,
      to,
      interval
    )

    const setTimeFrameTo = useCallback(
      (timeFrame: AvailableTimeFrame) => () => {
        setSelectedTimeFrame(timeFrame)
        setNow(Date.now())
      },
      [setSelectedTimeFrame]
    )

    const containerRef = useRef<HTMLDivElement>(null)

    const toggleFullScreen = useCallback(async () => {
      try {
        const fullScreenElement = document.fullscreenElement
        if (fullScreenElement) {
          await document.exitFullscreen()
          await screen.orientation.unlock()
          setInterval((prev) => (prev === 60 * 1000 ? prev : prev * 5))
        } else {
          await containerRef.current?.requestFullscreen()
          await screen.orientation.lock('landscape')
          setInterval((prev) => Math.min(60 * 1000, prev / 5))
        }
      } catch {
      } finally {
        setIsFullscreen((prev) => !prev)
      }
    }, [containerRef])
    useEffect(() => {
      const onFullscreenChange = () => {
        if (!document.fullscreenElement) {
          setIsFullscreen(false)
        }
      }
      document.addEventListener('fullscreenchange', onFullscreenChange)
      return () => {
        document.removeEventListener('fullscreenchange', onFullscreenChange)
      }
    }, [])

    const rect = useRect(containerRef)

    const availableFullScreenHeight = useMemo(() => {
      if (!rect) return 320

      const { height } = rect

      return height - 32 - 40 - 16
    }, [rect])

    const theme = useTheme()

    const [hiddenStates, setHiddenStates] = useState<Set<string>>(new Set())

    return (
      <div
        {...baseProps}
        ref={containerRef}
        style={{
          backgroundColor: 'white',
          padding: isFullscreen ? 16 : 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <ButtonGroup>
            {availableTimeFrames
              .filter(
                (timeFrame) =>
                  !onlyVisibleOnFullScreen.includes(timeFrame) || isFullscreen
              )
              .map((timeFrame) => (
                <Button
                  key={timeFrame}
                  onClick={setTimeFrameTo(timeFrame)}
                  variant={
                    selectedTimeFrame === timeFrame ? 'contained' : 'outlined'
                  }
                >
                  {timeFrame}
                </Button>
              ))}
          </ButtonGroup>
          <IconButton onClick={toggleFullScreen}>
            <Icon icon={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} />
          </IconButton>
        </div>
        {error ? (
          <div>Failed to fetch history</div>
        ) : loading ? (
          <LinearProgress />
        ) : (
          <ResponsiveContainer
            width="100%"
            height={isFullscreen ? availableFullScreenHeight : 320}
          >
            <LineChart data={histories || []}>
              <XAxis dataKey="ts" tickCount={100} tick={false} />
              {states.map((state) => (
                <YAxis
                  key={state}
                  yAxisId={state}
                  hide
                  domain={[
                    (dataMin: number) => dataMin * 0.975,
                    (dataMax: number) => dataMax * 1.025,
                  ]}
                />
              ))}
              <Legend
                // @ts-ignore
                formatter={(val) => capitalize(dataKeyNames[val] || val)}
                align="left"
                iconType="plainline"
                onClick={({ dataKey }) => {
                  setHiddenStates((prev) => {
                    const next = new Set(prev)
                    if (next.has(dataKey)) {
                      next.delete(dataKey)
                    } else {
                      next.add(dataKey)
                    }
                    return next
                  })
                }}
              />
              <Tooltip
                labelFormatter={(ts) =>
                  new Date(ts).toLocaleString('de-AT', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                }
                formatter={tooltipFormatter}
                wrapperStyle={{
                  border: 'none',
                  outline: 'none',
                  borderRadius: 8,
                  boxShadow: theme.shadows[2],
                }}
                contentStyle={{
                  outline: 'none',
                  border: 'none',
                  borderRadius: 8,
                }}
                labelStyle={{
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 4,
                  opacity: 0.75,
                }}
              />
              <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
              {states.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={[indigo[500], purple[500], pink[600]].find(
                    (_, i) => i === states.indexOf(key)
                  )}
                  dot={false}
                  yAxisId={key}
                  strokeWidth={2}
                  hide={hiddenStates.has(key)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    )
  }
)

export default HistoryDetails