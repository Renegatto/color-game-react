"use client"
import { ElementType, FC, ReactElement, ReactNode, useEffect, useRef, useState } from "react";

type SizePx = { x: number, y: number }
type Color = { r: number, g: number, b: number }

type Props = {
  sizePx: SizePx,
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
type OngoingGameState = <A>(alg: OngoingGameStateAlg<A>) => A

const randomColor = (): Color => {
  const randomComponent = (): number => Math.floor(Math.random() * 0xFF)
  return {
    r: randomComponent(),
    g: randomComponent(),
    b: randomComponent(),
  }
}

export type GameProps = {
  sizePx: SizePx,
  maxDifferenceToWin: number,
}

export const Game: FC<GameProps> = ({sizePx, maxDifferenceToWin}) => {
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
        sizePx={sizePx}
        actualColor={guessedColor}
        restartGame={restartGame}
        maxDifferenceToWin={maxDifferenceToWin}
      />
    }
  </>
}

const closeTo = (maxDistance: number, color1: Color, color2: Color): [boolean, number] => {
  const sq = (a: number, b: number): number => Math.pow(a - b,2);
  const distance = Math.sqrt(
    sq(color1.r, color2.r)
    + sq(color1.g, color2.g)
    + sq(color1.b, color2.g)
  )
  return [maxDistance >= distance, distance]
}

export const GameRound: FC<{
  sizePx: SizePx,
  actualColor: Color,
  restartGame: () => void,
  maxDifferenceToWin: number,
}> = ({sizePx, restartGame, actualColor, maxDifferenceToWin}) => {
  const [gameState,setGameState] =
    useState<OngoingGameState>(() => <A,>(alg: OngoingGameStateAlg<A>): A => alg.playing)
  const [pickedColor,setPickedColor] = useState<Color>(
    {r:0x88,g:0x88,b:0x88}
  )
  const onPickColor = (): void => {
    const [matches, difference] = closeTo(
      maxDifferenceToWin,
      pickedColor,
      actualColor
    )
    setGameState((_: OngoingGameState) => <A,>(alg: OngoingGameStateAlg<A>): A =>
        alg.ended(!matches, difference)
    )
    // } else {
    //   setGameState((_: OngoingGameState) => <A,>(alg: OngoingGameStateAlg<A>): A =>
    //     alg.ended(true, difference))
    // }
  }
  return <div>
    <ColorPicker
      disabledWith={gameState({ended: () => actualColor, playing: undefined})}
      update={setPickedColor}
    />
    { gameState({
      playing: <>
        <br/>
        <ColoredBackground color={actualColor} sizePx={sizePx}/>
        <button type="button" style={{
          border:"2px solid black",
          backgroundColor: "#aa8888",

        }} onClick={onPickColor}>Pick</button>
      </>,
      ended: (failed,difference) => <>
        {failed ? "Wrong!" : "Correct!"} difference is {Math.round(difference)}<br/>
        <ColorsComparison color={actualColor} color2={pickedColor} sizePx={sizePx}/>
        <button type="button" style={{
          border:"2px solid black",
          backgroundColor: "#aa8888",
        }} onClick={restartGame}>Restart</button>
      </>,
    })}
  </div>
}

export const ColorsComparison: FC<Props & { color2: Color }> = ({ color, color2, sizePx }) =>
  <>
    <ColoredBackground color={color} sizePx={{x: sizePx.x, y: sizePx.y / 2}}/>
    <ColoredBackground color={color2} sizePx={{x: sizePx.x, y: sizePx.y / 2}}/>
  </>
export const ColoredBackground: FC<Props> = ({ color, sizePx }: Props) =>
  <>
    <div style={{
      width: `${sizePx.x}px`,
      height: `${sizePx.y}px`,
      position: "relative",
      backgroundColor: colorToCode(color),
    }}> Color {colorToCode(color)}
    </div>
  </>

const ColorPicker: FC<{disabledWith?: Color, update: (color: Color) => void}> = ({disabledWith,update}) => {
  const [r,setR] = useState(0)
  const [g,setG] = useState(0)
  const [b,setB] = useState(0)
  const currentColor: Color = {r,g,b}

  const disabled = disabledWith != undefined

  const drawGhostSlider = (pickColor: (color: Color) => number): ReactElement =>
    <GhostSlider value={disabledWith === undefined ? undefined : pickColor(disabledWith)}/>
  const drawColorSlider = (setColor: (color: number) => void): ReactElement =>
    <ColorSlider disabled={disabled} onChange={c => { setColor(c); update(currentColor) }}/>

  const drawSlidersPair = (
    updateColor: (color: number) => void,
    colorOf: (color: Color) => number,
    colorName: string,
  ): ReactElement =>
    <>
      {`${colorName}: `} 
      {drawColorSlider(updateColor)}
      {drawGhostSlider(colorOf)}
    </>

  const whenDisabled = (child: (actualColor: Color) => ReactElement): ReactElement =>
    disabledWith === undefined ? <></> : child(disabledWith)

  const overlayOnDisabled =
    <div style={{
      backgroundColor: "#88888888",
      width:"100%",
      height: "100%",
      position: "absolute",
    }}/>

  return <div style={{width: "100%", height: "100%", overflow: "hidden", position: "relative"}}>
    {whenDisabled(_ => overlayOnDisabled)}
    {drawSlidersPair(setR, color => color.r, "R")}
    {drawSlidersPair(setG, color => color.g, "G")} 
    {drawSlidersPair(setB, color => color.b, "B")} 
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
    <div className="slidecontainer" style={{width: "100%", height: "100%", overflow: "hidden", position: "relative"}}>
      <input
        type="range"
        disabled={true}
        style={{visibility: value === undefined ? "hidden" : undefined}}
        min="0"
        max="255"
        value={value}
        className="ghostslider"
      />
    </div>
  </>

const ColorSlider: FC<{disabled: boolean, onChange: (val: number) => void}> = ({disabled,onChange}) => {
  const [value,setValue] = useState(0)
  const debounce = useDebounce(10)
  const change = (val: number): void => {
    setValue(val)
    onChange(val)
  }
  return <>{value}
    <div className="slidecontainer">
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
        className="slider"
        id="myRange"
      />
    </div>
  </>
}