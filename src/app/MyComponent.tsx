"use client"
import { ElementType, FC, ReactElement, ReactNode, useEffect, useRef, useState } from "react";

type Color = { r: number, g: number, b: number }

type Props = {
  color: Color,
}

const colorToCode = ({r,g,b}: Color): string => {
  const toHex = (x: number) => x.toString(16).padStart(2,'0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

type OngoingGameStateAlg<A> = {
  playing: A,
  ended(failed: boolean, difference: number): A,
}
type OngoingGameState = {
  match: <A>(alg: OngoingGameStateAlg<A>) => A
}

const randomColor = (): Color => {
  const randomComponent = (): number => Math.floor(Math.random() * 0xFF)
  return {
    r: randomComponent(),
    g: randomComponent(),
    b: randomComponent(),
  }
}

export type GameProps = {
  maxDifferenceToWin: number,
}

export const Game: FC<GameProps> = ({maxDifferenceToWin}) => {
  // it can not be defined initially since the only way to obtain it is to
  // perform side-effect
  const [guessedColor, setGuessedColor] = useState<Color | undefined>()
  useEffect(
    () => setGuessedColor(randomColor())
    ,[]
  )

  const [gameId,setGameId] = useState(0)
  const restartGame = (): void => {
    setGuessedColor(randomColor())
    setGameId(id => (id + 1) % 2)
  }
  return <>
    { guessedColor &&
      <GameRound
        key={gameId}
        actualColor={guessedColor}
        restartGame={restartGame}
        maxDifferenceToWin={maxDifferenceToWin}
      />
    }
  </>
}

const eachIsClose = (maxDifference: number, color1: Color, color2: Color): [boolean, number] => {
  const differences = [
    color1.r - color2.r,
    color1.g - color2.g,
    color1.b - color2.b,
  ].map(Math.abs)
  return [
    differences.every(diff => diff <= maxDifference),
    differences.sort()[differences.length]
  ]
}

export const GameRound: FC<{
  actualColor: Color,
  restartGame: () => void,
  maxDifferenceToWin: number,
}> = ({restartGame, actualColor, maxDifferenceToWin}) => {
  const [gameState,setGameState] =
    useState<OngoingGameState>(() => ({ match: alg => alg.playing }))
  const [pickedColor,setPickedColor] = useState<Color>(
    {r:0x88,g:0x88,b:0x88}
  )
  const onPickColor = (): void => {
    const [matches, maxDifference] = eachIsClose(
      maxDifferenceToWin,
      pickedColor,
      actualColor
    )
    setGameState(_ => ({
      match: alg => alg.ended(!matches, maxDifference)})
    )
  }
  return <div className="game-round">
    <ColorPicker
      disabledWith={
        gameState.match({
          ended: failed => ({actual: actualColor, won: !failed}),
          playing: undefined
        })
      }
      update={setPickedColor}
    />
    { gameState.match({
      playing: <>
        <br/>
        <div className="colored-background">
          <ColoredBackground color={actualColor} child={<></>}/>
        </div>
        <button
          className="game submit-btn"
          type="button"
          onClick={onPickColor}
        >
          Pick
        </button>
      </>,
      ended: (failed,difference) => <>
        {failed ? "Wrong!" : "Correct!"} Difference is {Math.round(difference)}<br/>
        <div className="colored-background">
          <ColorsComparison color={actualColor} color2={pickedColor}/>
        </div>
        <button
          className="game reset-game-btn"
          type="button"
          onClick={restartGame}
        >
          Restart
        </button>
      </>,
    })}
  </div>
}

export const ColorsComparison: FC<Props & { color2: Color }> = ({ color, color2 }) =>
  <>
    <div className="colored-background comparison">
      <ColoredBackground color={color} child={<>Color {colorToCode(color)}</>}/>
    </div>
    <div className="colored-background comparison">
      <ColoredBackground color={color2} child={<>Color {colorToCode(color)}</>}/>
    </div>
  </>
export const ColoredBackground: FC<Props & {child: ReactElement}> = ({ color, child }) =>
  <>
    <div className="colored-background background" style={{
      backgroundColor: colorToCode(color),
    }}>
      {child}
    </div>
  </>

type ColorPickerProps = {
  disabledWith?: {actual: Color, won: boolean},
  update: (color: Color) => void,
}

const ColorPicker: FC<ColorPickerProps> = ({disabledWith,update}) => {
  const [r,setR] = useState(0)
  const [g,setG] = useState(0)
  const [b,setB] = useState(0)
  const currentColor: Color = {r,g,b}

  const disabled = disabledWith != undefined

  const drawGhostSlider = (pickColor: (color: Color) => number): ReactElement =>
    <GhostSlider value={disabledWith === undefined ? undefined : pickColor(disabledWith.actual)}/>
  const drawColorSlider = (
    setColor: (color: number) => void,
    colorOf: (color: Color) => number,
    colorName: string,
  ): ReactElement =>
    <ColorSlider
      disabled={disabled}
      onChange={c => { setColor(c); update(currentColor)}}
      child={<>{colorName}: {colorOf(currentColor)}</>}
    />

  const drawSlidersPair = (
    updateColor: (color: number) => void,
    colorOf: (color: Color) => number,
    colorName: string,
  ): ReactElement =>
    <>
      {drawColorSlider(updateColor,colorOf,colorName)}
      {drawGhostSlider(colorOf)}
    </>

  const whenDisabled = (child: (won: boolean) => ReactElement): ReactElement =>
    disabledWith === undefined
      ? <></>
      : child(disabledWith.won)

  const overlayOnDisabled = (won: boolean) =>
    <div className={`color-picker ${
      won ? "overlay-on-victory" : "overlay-on-defeat"
    }`}/>

  return <div className={"color-picker"}>
    {drawSlidersPair(setR, color => color.r, "R")}
    {drawSlidersPair(setG, color => color.g, "G")} 
    {drawSlidersPair(setB, color => color.b, "B")} 
    {whenDisabled(overlayOnDisabled)}
  </div>
}

const useDebounce = (delayMs: number): ((cont: () => void) => void) => {
  const [{cancel},setCancel] = useState({cancel: () => {}})
  const updateWithDelay = (cont: () => void): void => {
    cancel()
    const timeout = setTimeout(
      () => {
        setCancel({ cancel: () => {} })
        cont()
      },
      delayMs
    )
    setCancel({ cancel: () => clearTimeout(timeout) })
  }
  return updateWithDelay
}


const GhostSlider: FC<{value?: number}> = ({value}) =>
  <>
    <div className="slidecontainer ghost">
      <input
        type="range"
        disabled={true}
        style={{visibility: value === undefined ? "hidden" : undefined}}
        min="0"
        max="255"  
        value={value}
        className="slider ghost"
      />
    </div>
  </>

type ColorSliderProps = {
  disabled: boolean,
  onChange: (val: number) => void,
  child: ReactElement,
}

const ColorSlider: FC<ColorSliderProps> = ({disabled,child,onChange}) => {
  const [value,setValue] = useState(0)
  const debounce = useDebounce(10)
  const change = (val: number): void => {
    setValue(val)
    onChange(val)
  }
  return <>
    <div className="slidecontainer normal">
      {child}
      <input
        type="range"
        disabled={disabled}
        min="0"
        max="255"
        defaultValue={0}
        onChange={
          e => {
              const newValue = e.currentTarget.valueAsNumber       
              debounce(() => change(newValue))
          }
        }
        className={`slider ${disabled ? "disabled" : "normal"}`}
      />
    </div>
  </>
}