import { Color, useMediaQuery } from '@mui/material'
import { AnimatePresence, motion, MotionProps } from 'framer-motion'
import {
  FC,
  KeyboardEventHandler,
  memo,
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import clamp from '../../helpers/clamp'
import preventDefault from '../../helpers/prevent-default'
import silentObject from '../../helpers/silent-object'
import { ReadyState } from '../../hooks/use-device-state'
import useFocusOnHover from '../../hooks/use-focus-on-hover'
import useRefState from '../../hooks/use-ref-state'
import useSpring from '../../hooks/use-spring'
import Icon from '../icon'
import { AvailableIcon } from '../icon/available-icons'
import {
  Card,
  ColoredIcon,
  ContentContainer,
  Indicators,
  Name,
  PresenceContainer,
  Slider,
  State,
  TextContainer,
} from './device-card-styles'
import { DataText } from './use-data-hook/data-hook'

export type PureDeviceCardProps = {
  icon: AvailableIcon
  accentColor: Color
  name: string
  texts?: DataText[]
  toggleValue?: boolean
  sliderValue?: number
  onToggleChange?: (value: boolean) => void
  onSliderChange?: (value: number) => void
  onContextMenu?: MouseEventHandler<HTMLDivElement>
  lowBattery?: boolean
  visible?: boolean
  notAvailable?: boolean
  readyState: ReadyState
} & MotionProps

const PureDeviceCard: FC<PureDeviceCardProps> = ({
  icon,
  accentColor: color,
  name,
  texts = [],
  toggleValue = true,
  sliderValue = 100,
  onToggleChange,
  onSliderChange: onSliderChangeCb,
  onContextMenu,
  lowBattery = false,
  visible = true,
  notAvailable = false,
  readyState,
}) => {
  const canSlide = useMemo(
    () =>
      !!onSliderChangeCb && sliderValue !== undefined && readyState === 'ready',
    [onSliderChangeCb, readyState]
  )
  const canToggle = useMemo(
    () =>
      !!onToggleChange && toggleValue !== undefined && readyState === 'ready',
    [onToggleChange, readyState]
  )

  const [actualSliderValue, setActualSliderValue, actualSliderValueRef] =
    useRefState(50)
  const [isSliding, setIsSliding, isSlidingRef] = useRefState(false)

  const onCardClick = useCallback(() => {
    if (!canToggle) {
      return
    }

    onToggleChange!(!toggleValue)
  }, [toggleValue, onToggleChange])

  const [lastSlide, setLastSlide] = useState(0)

  const onSliderInput = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (e) => {
      if (!canSlide) {
        return
      }

      setIsSliding(true)
      setLastSlide(Date.now())

      const value = e.target.valueAsNumber
      setActualSliderValue(value)
    },
    [canSlide]
  )

  useEffect(() => {
    if (!isSliding) {
      return
    }

    const timeout = setTimeout(() => {
      setIsSliding(false)
    }, 1500)

    return () => clearTimeout(timeout)
  }, [setIsSliding, isSliding, lastSlide])

  const sliderRef = useRef<HTMLInputElement>(null)

  const onSlideEnd = useCallback(() => {
    if (!canSlide || !isSlidingRef.current) {
      return
    }

    if (actualSliderValueRef.current === sliderValue) {
      return
    }

    onSliderChangeCb!(actualSliderValueRef.current)
  }, [canSlide, onSliderChangeCb, actualSliderValueRef])

  useEffect(() => {
    if (!sliderRef.current) {
      return
    }

    const slider = sliderRef.current

    slider.addEventListener('change', onSlideEnd)

    return () => {
      slider.removeEventListener('change', onSlideEnd)
    }
  }, [onSlideEnd])

  useEffect(() => {
    setActualSliderValue(sliderValue)
  }, [sliderValue])

  const sliderValueSpring = useSpring(
    clamp(actualSliderValue, [0, 100]),
    !isSliding
  )

  const cardRef = useRef<HTMLDivElement>(null)

  const isDesktop = useMediaQuery('(min-width: 600px)')

  useFocusOnHover(cardRef, sliderRef, 1000, 0, isDesktop)

  const [keyDownTimeout, setKeyDownTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null)
  const onKeyDown = useCallback<KeyboardEventHandler<HTMLInputElement>>(
    (e) => {
      if (
        e.key === 'Tab' ||
        !['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)
      ) {
        return
      }

      if (e.key === 'ArrowLeft') {
        setActualSliderValue((prev) => clamp(prev - 5, [0, 100]))
      } else if (e.key === 'ArrowRight') {
        setActualSliderValue((prev) => clamp(prev + 5, [0, 100]))
      } else if (e.key === 'Enter') {
        onContextMenu?.(silentObject())
      } else if (e.key === ' ') {
        e.preventDefault()
        onCardClick()
      }

      if (['ArrowLeft', 'ArrowRight'].includes(e.key) && canSlide) {
        e.preventDefault()
        setIsSliding(true)
        setLastSlide(Date.now())
        if (keyDownTimeout) {
          clearTimeout(keyDownTimeout)
        }
        const newTimeout = setTimeout(() => {
          onSlideEnd()
        }, 1000)

        setKeyDownTimeout(newTimeout)
      }
    },
    [canSlide, onSlideEnd, keyDownTimeout, onContextMenu, onCardClick]
  )

  const onContextMenuHandler = useCallback<MouseEventHandler<HTMLDivElement>>(
    (e) => {
      if (readyState !== 'ready') {
        return
      }

      onContextMenu?.(e)
    },
    [onContextMenu, readyState]
  )

  return (
    <>
      <Card
        onClick={onCardClick}
        accentColor={color}
        active={toggleValue && readyState === 'ready'}
        transition={{
          layout: {
            duration: 0.15,
          },
          opacity: {
            duration: 0.2,
          },
          scale: {
            duration: 0.1,
          },
        }}
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        exit={{
          opacity: 0,
        }}
        whileTap={{
          scale: 0.975,
        }}
        style={{
          opacity: visible ? 1 : 0,
        }}
        layout
        onContextMenu={onContextMenuHandler}
        hidden={!visible}
        ref={cardRef}
      >
        <Slider
          type="range"
          onInput={onSliderInput}
          active={toggleValue && readyState === 'ready'}
          style={{
            backgroundSize: `${
              canSlide
                ? sliderValueSpring
                : toggleValue && readyState === 'ready'
                ? 100
                : 0
            }% 100%`,
          }}
          onPointerDown={preventDefault}
          ref={sliderRef}
          value={sliderValueSpring}
          step={1}
          min={0}
          max={100}
          onKeyDown={onKeyDown}
        />

        <ContentContainer>
          <Indicators>
            {lowBattery && <Icon icon="battery_alert" />}
            {notAvailable && <Icon icon="sensors_off" />}
          </Indicators>

          <AnimatePresence>
            <PresenceContainer>
              <ColoredIcon
                icon={icon}
                filled={toggleValue && readyState === 'ready'}
                key={toggleValue ? 'filled' : 'outlined'}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                }}
                exit={{ opacity: 0 }}
              />
            </PresenceContainer>
          </AnimatePresence>
          <TextContainer>
            <AnimatePresence>
              <PresenceContainer>
                <State
                  key={`${isSliding ? 'sliding' : 'not-sliding'}`}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                  }}
                  exit={{ opacity: 0 }}
                >
                  {!isSliding ? (
                    readyState === 'ready' ? (
                      notAvailable ? (
                        <motion.span
                          key="not-available"
                          initial={{ opacity: 0 }}
                          animate={{
                            opacity: 1,
                          }}
                          exit={{ opacity: 0 }}
                        >
                          Not available
                        </motion.span>
                      ) : (
                        texts.map(({ text, id }) => (
                          <motion.span
                            key={id}
                            initial={{ opacity: 0 }}
                            animate={{
                              opacity: 1,
                            }}
                            exit={{ opacity: 0 }}
                          >
                            {text}
                          </motion.span>
                        ))
                      )
                    ) : readyState === 'init' ? (
                      <motion.span
                        key="init"
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: 1,
                        }}
                        exit={{ opacity: 0 }}
                      >
                        Loading...
                      </motion.span>
                    ) : (
                      <motion.span
                        key="timeout"
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: 1,
                        }}
                        exit={{ opacity: 0 }}
                      >
                        Timed out
                      </motion.span>
                    )
                  ) : (
                    <motion.span
                      key="sliding"
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: 1,
                      }}
                      exit={{ opacity: 0 }}
                    >
                      {`${actualSliderValue}%`}
                    </motion.span>
                  )}
                </State>
              </PresenceContainer>
            </AnimatePresence>
            <Name>{name}</Name>
          </TextContainer>
        </ContentContainer>
      </Card>
    </>
  )
}

export default memo(PureDeviceCard)
