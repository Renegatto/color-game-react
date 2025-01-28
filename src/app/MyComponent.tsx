"use client"
import { ElementType, FC, ReactElement, ReactNode, useRef, useState } from "react";

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
  ended(failed: boolean): A,
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

export const Game: FC<{sizePx: SizePx}> = ({sizePx}) => {
  const [guessedColor, setGuessedColor] = useState(() => randomColor())
  const [gameId,setGameId] = useState(0)
  const restartGame = (): void => {
    setGuessedColor(randomColor())
    setGameId(id => (id + 1) % 2)
  }
  return <>
    <GameRound key={gameId} sizePx={sizePx} actualColor={guessedColor} restartGame={restartGame}/>
  </>
}

const closeTo = (color1: Color, color2: Color): boolean => null as any

export const GameRound: FC<{sizePx: SizePx, actualColor: Color, restartGame: () => void}> = ({
  sizePx,
  restartGame,
  actualColor
}) => {
  const [gameState,setGameState] =
    useState<OngoingGameState>(() => <A,>(alg: OngoingGameStateAlg<A>): A => alg.playing)
  const [pickedColor,setPickedColor] = useState<Color>(
    {r:0x88,g:0x88,b:0x88}
  )
  const onPickColor = (): void => {
    if (closeTo(pickedColor,actualColor)) {
      setGameState((_: OngoingGameState) => <A,>(alg: OngoingGameStateAlg<A>): A => alg.ended(false))
    } else {
      setGameState((_: OngoingGameState) => <A,>(alg: OngoingGameStateAlg<A>): A => alg.ended(true))
    }
  }
  return <div>
    <ColorPicker disabled={gameState({ended: () => true, playing: false})} update={setPickedColor}/>
    { gameState({
      playing: <>
        <br/>
        <ColoredBackground color={actualColor} sizePx={sizePx}/>
        <button type="button" style={{
          border:"2px solid black",
          backgroundColor: "#aa8888",

        }} onClick={onPickColor}>Pick</button>
      </>,
      ended: failed => <>
        {failed ? "Wrong!" : "Correct!"}<br/>
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
      //order:"2px solid black",
      backgroundColor: colorToCode(color),
    }}> Color {colorToCode(color)}
    </div>
  </>

const ColorPicker: FC<{disabled: boolean, update: (color: Color) => void}> = ({disabled,update}) => {
  const [r,setR] = useState(0)
  const [g,setG] = useState(0)
  const [b,setB] = useState(0)
  const currentColor: Color = {r,g,b}
  return <div style={{width: "100%", height: "100%", overflow: "hidden", position: "relative"}}>
    {disabled ? <div style={{backgroundColor: "#88888888", width:"100%", height: "100%" , position: "absolute"}}></div> : <></>}
    R: <ColorSlider disabled={disabled} onChange={r => { setR(r); update(currentColor) }}/>
    G: <ColorSlider disabled={disabled} onChange={g => { setG(g); update(currentColor) }}/>
    B: <ColorSlider disabled={disabled} onChange={b => { setB(b); update(currentColor) }}/>
  </div>
}

const useDebounce = (delayMs: number): ((cont: () => void) => void) => {
  const [cool,setCool] = useState(true)
  const reset = (): void => {
    setCool(false)
    setTimeout(() => setCool(true),delayMs)
  }
  return cont => {
    if (cool) {
      reset()
      cont()
    }
  }
}

const ColorSlider: FC<{disabled: boolean, onChange: (val: number) => void}> = ({disabled,onChange}) => {
  const [value,setValue] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounce = useDebounce(300)
  const change = (val: number): void => {
    setValue(val)
    onChange(val)
  }
  return <>{value}
    <div className="slidecontainer">
      <input
        ref={inputRef}
        type="range"
        disabled={disabled}
        min="0"
        max="255"
        onInputCapture={
          e => change(e.currentTarget.valueAsNumber)}
        onChange={
          e => debounce(() => change(e.currentTarget.valueAsNumber))
        }
        className="slider"
        id="myRange"
      />
    </div>
  </>
}