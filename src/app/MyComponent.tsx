"use client"
import { ElementType, FC, ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import { useDebounce } from "./Hooks";
import { Color, Option, colorToCode, Current, eachIsClose, makeState, randomColor, State, None, Some } from "./Utils";

type Props = {
  color: Color,
}

type OutcomeAlg<A> = {
  victory: A,
  defeat: A,
}
type Outcome = { match: <C>(alg: OutcomeAlg<C>) => C }

type OngoingGameStateAlg<A> = {
  playing: A,
  ended(failed: boolean, difference: number): A,
}
type OngoingGameState = {
  match: <A>(alg: OngoingGameStateAlg<A>) => A
}

type DifficultyState = { Difficulty: State<number> }
type GuessedColorState = { GuessedColor: State<Color> }
type PickedColorState = { PickedColor: State<Color> }
type GameStateState = { GameState: State<OngoingGameState> }
type GameState =
  DifficultyState
  & GuessedColorState
  & PickedColorState
  & GameStateState

const DEFAULT_COLOR: Color = { r: 0, g: 0, b: 0 }
const DEFAULT_DIFFICULTY = 10

export const Game: FC = () => {
  // it can not be defined initially since the only way to obtain it is to
  // perform side-effect
  const [guessedColor, setGuessedColor] = useState<Color | undefined>()
  useEffect(
    () => setGuessedColor(randomColor()),
    []
  )
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY)
  const [gameId, setGameId] = useState(0)
  const [gameState, setGameState] = useState<OngoingGameState>(
    () => ({ match: alg => alg.playing })
  )
  const [pickedColor, setPickedColor] = useState<Color>(DEFAULT_COLOR)
  const restartGame = (): void => {
    setGuessedColor(randomColor())
    setPickedColor(DEFAULT_COLOR)
    setGameState({ match: alg => alg.playing })
    setGameId(id => (id + 1) % 2)
  }
  if (!guessedColor) {
    return <></>
  } else {
    const state: GameState = {
      Difficulty: makeState(difficulty, setDifficulty),
      GuessedColor: makeState(guessedColor, setGuessedColor),
      PickedColor: makeState(pickedColor, setPickedColor),
      GameState: makeState(gameState, setGameState),
    }
    return <GameRound
      key={gameId}
      state={state}
      restartGame={restartGame}
    />
  }
}

type GameRoundProps = {
  restartGame: () => void,
  state: DifficultyState
  & GameStateState
  & PickedColorState
  & Current<GuessedColorState>
}
export const GameRound: FC<GameRoundProps> = ({
  restartGame,
  state: {
    Difficulty,
    GameState,
    PickedColor,
    GuessedColor: { current: actualColor },
  },
}) => {
  const onPickColor = (): void => {
    const [matches, maxDifference] = eachIsClose(
      Difficulty.current,
      PickedColor.current,
      actualColor
    )
    GameState.update(() => ({
      match: alg => alg.ended(!matches, maxDifference)
    })
    )
  }
  const roundResult = GameState.current.match({
    playing: None,
    ended: (failed,difference) =>
      Some({
        outcome: { match: alg => failed ? alg.defeat : alg.victory} as Outcome,
        difference: Math.round(difference),
      })
  })
  return <div className="game-round">
    <ColorPicker
      disabledWith={
        GameState.current.match({
          ended: failed => Some({ actual: actualColor, won: !failed }),
          playing: None
        })
      }
      update={PickedColor.update}
    />
    <InfoBar state={{Difficulty}} roundResult={roundResult}/>
    {GameState.current.match({
      playing: <>
        <div className="colored-background">
          <ColoredBackground color={actualColor} child={<></>} />
        </div>
        <button
          className="game submit-btn"
          type="button"
          onClick={onPickColor}
        >
          Pick
        </button>
      </>,
      ended: () => <>
        <div className="colored-background">
          <ColorsComparison color={actualColor} color2={PickedColor.current} />
        </div>
        <div className="game reset-options">
          <button
            className="game reset-options reset-game-btn"
            type="button"
            onClick={restartGame}
          >
            Restart
          </button>
          <DifficultyPicker state={{ Difficulty }} />
        </div>
      </>,
    })}
  </div>
}

export const InfoBar: FC<{
  roundResult: Option<{outcome: Outcome, difference: number}>,
  state: Current<DifficultyState>
}> =
  ({roundResult,state: {Difficulty}}) => {
  return <div className="info-bar">
    {roundResult.match({
      none: <div style={{visibility: "hidden"}}></div>,
      some: ({outcome,difference}) =>
        <div>
          {outcome.match({
            victory: "Great job!",
            defeat: "Wrong!",
          })} Difference is {difference}
        </div>,
    })}
    <div>Difficulty: {Difficulty.current}</div>
  </div>
}

export const ColorsComparison: FC<Props & { color2: Color }> = ({ color, color2 }) =>
  <>
    <div className="colored-background comparison">
      <ColoredBackground color={color} child={<>Color {colorToCode(color)}</>} />
    </div>
    <div className="colored-background comparison">
      <ColoredBackground color={color2} child={<>Color {colorToCode(color2)}</>} />
    </div>
  </>

export const ColoredBackground: FC<Props & { child: ReactElement }> = ({ color, child }) =>
  <>
    <div className="colored-background background" style={{
      backgroundColor: colorToCode(color),
    }}>
      {child}
    </div>
  </>

type ColorPickerProps = {
  disabledWith: Option<{ actual: Color, won: boolean }>,
  update: (color: () => Color) => void,
}

const ColorPicker: FC<ColorPickerProps> = ({ disabledWith, update }) => {
  const [r, setR] = useState(0)
  const [g, setG] = useState(0)
  const [b, setB] = useState(0)
  const currentColor: Color = { r, g, b }

  const disabled = disabledWith.match({
    some: () => true,
    none: false
  })
  const drawGhostSlider = (pickColor: (color: Color) => number): ReactElement =>
    <GhostSlider value={disabledWith.match({
      none: None,
      some: ({actual}) => Some(pickColor(actual)),
    })}/>
  const drawColorSlider = (
    setColor: (color: number) => void,
    colorOf: (color: Color) => number,
    colorName: string,
  ): ReactElement =>
    <ColorSlider
      disabled={disabled}
      onChange={c => { setColor(c); update(() => currentColor) }}
      child={<>{colorName}: {colorOf(currentColor)}</>}
    />

  const drawSlidersPair = (
    updateColor: (color: number) => void,
    colorOf: (color: Color) => number,
    colorName: string,
  ): ReactElement =>
    <>
      {drawColorSlider(updateColor, colorOf, colorName)}
      {drawGhostSlider(colorOf)}
    </>

  const whenDisabled = (child: (won: boolean) => ReactElement): ReactElement =>
    disabledWith.match({
      some: ({won}) => child(won),
      none: <></>,
    })
  const overlayOnDisabled = (won: boolean) =>
    <div className={`color-picker ${won ? "overlay-on-victory" : "overlay-on-defeat"
      }`} />

  return <div className={"color-picker"}>
    {drawSlidersPair(setR, color => color.r, "R")}
    {drawSlidersPair(setG, color => color.g, "G")}
    {drawSlidersPair(setB, color => color.b, "B")}
    {whenDisabled(overlayOnDisabled)}
  </div>
}

const GhostSlider: FC<{ value: Option<number> }> = ({ value }) =>
  <>
    <div className="slidecontainer ghost">
      <input
        type="range"
        disabled={true}
        style={{ visibility: value.match({
          none: "hidden",
          some: _ => undefined
        })}}
        min="0"
        max="255"
        value={value.match({ some: x => x, none: undefined })}
        className="slider ghost"
      />
    </div>
  </>

type ColorSliderProps = {
  disabled: boolean,
  onChange: (val: number) => void,
  child: ReactElement,
}

const ColorSlider: FC<ColorSliderProps> = ({ disabled, child, onChange }) => {
  const [value, setValue] = useState(0)
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

const DifficultyPicker: FC<{ state: DifficultyState }> =
  ({ state: { Difficulty } }) => {
    const debounce = useDebounce(10)
    return <>
      {Difficulty.current}
      <input
        type="range"
        min="0"
        max="100"
        defaultValue={Difficulty.current}
        onChange={
          e => {
            const newValue = e.currentTarget.valueAsNumber
            debounce(() => Difficulty.update(() => newValue))
          }
        }
        className={`slider difficulty-picker`}
      />
    </>
  }