"use client"
import { FC, ReactElement, useEffect, useState } from "react";
import { useDebounce } from "./Hooks";
import { Color, Option, colorToCode, Current, eachIsClose, State, randomColor, Lens, SimpleLens, Some, None } from "./Utils";

const DEFAULT_COLOR: Color = { r: 0, g: 0, b: 0 }
const DEFAULT_DIFFICULTY = 10

// Outcome datatype
type Outcome = { match: <C>(alg: OutcomeAlg<C>) => C }
// its constructors
const Outcome: OutcomeAlg<Outcome> = {
  victory: { match: alg => alg.victory },
  defeat: { match: alg => alg.defeat },
}
// its deconstructor
type OutcomeAlg<in out A> = {
  victory: A,
  defeat: A,
}

// OngoingGameState datatype
type OngoingGameState = {
  match: <A>(alg: OngoingGameStateAlg<A>) => A
}
type OngoingGameStateAlg<in out A> = {
  playing: A,
  ended(
    failed: Outcome,
    difference: number,
    withDifficulty: number,
  ): A,
}

const displayDifficulty = (difficulty: number): string =>
  `${difficulty}/255`

// Shared state

type DifficultyState = { Difficulty: State<number> }
type GuessedColorState = { GuessedColor: State<Color> }
type PickedColorState = { PickedColor: State<Color> }
type GameStateState = { GameState: State<OngoingGameState> }
type GameState =
  DifficultyState
  & GuessedColorState
  & PickedColorState
  & GameStateState

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
      Difficulty: State(difficulty, setDifficulty),
      GuessedColor: State(guessedColor, setGuessedColor),
      PickedColor: State(pickedColor, setPickedColor),
      GameState: State(gameState, setGameState),
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
      match: alg => alg.ended(
        matches ? Outcome.victory : Outcome.defeat,
        maxDifference,
        Difficulty.current,
      )
    })
    )
  }
  return <div className="game-round">
    <ColorPicker
      disabledWith={
        GameState.current.match({
          ended: outcome => Some({ actual: actualColor, outcome }),
          playing: None()
        })
      }
      state={{ PickedColor }}
    />
    <InfoBar state={{ Difficulty, GameState }} />
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
          <ColorsComparison actual={actualColor} picked={PickedColor.current} />
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
  state: Current<DifficultyState> & Current<GameStateState>
}> =
  ({ state: { Difficulty, GameState } }) => {
    return <div className="info-bar">
      {GameState.current.match({
        playing: <div style={{ visibility: "hidden" }}></div>,
        ended: (outcome, difference, _) =>
          <div>
            {outcome.match({
              victory: "Great job!",
              defeat: "Wrong!",
            })} Difference is {Math.round(difference)}
          </div>,
      })}
      <div>Difficulty: {
        displayDifficulty(GameState.current.match({
          playing: Difficulty.current,
          // we only display difficulty AT THE MOMENT game was over
          ended: (_out, _diff, difficulty) => difficulty,
        }))
      }</div>
    </div>
  }

export const ColorsComparison: FC<{ actual: Color, picked: Color }> =
  ({ actual, picked }) =>
    <>
      <div className="colored-background comparison">
        <ColoredBackground
          color={actual}
          child={<>Actual color {colorToCode(actual)}</>}
        />
      </div>
      <div className="colored-background comparison">
        <ColoredBackground
          color={picked}
          child={<>Your color {colorToCode(picked)}</>}
        />
      </div>
    </>

export const ColoredBackground: FC<{ color: Color, child: ReactElement }> =
  ({ color, child }) =>
    <>
      <div className="colored-background background" style={{
        backgroundColor: colorToCode(color),
      }}>
        {child}
      </div>
    </>

type ColorPickerProps = {
  disabledWith: Option<{ actual: Color, outcome: Outcome }>,
  state: PickedColorState,
}

const withR: SimpleLens<Color, number> = Lens.property("r")
const withG: SimpleLens<Color, number> = Lens.property("g")
const withB: SimpleLens<Color, number> = Lens.property("b")

const ColorPicker: FC<ColorPickerProps> =
  ({ disabledWith, state: { PickedColor } }) => {

    const currentColor: Color = PickedColor.current

    const disabled = disabledWith.match({
      some: () => true,
      none: false
    })
    const drawGhostSlider = (component: SimpleLens<Color, number>): ReactElement =>
      <GhostSlider value={disabledWith.match({
        none: None(),
        some: ({ actual }) => Some(component.get(actual)),
      })} />
    const drawColorSlider = (
      component: SimpleLens<Color, number>,
      colorName: string,
    ): ReactElement =>
      <ColorSlider
        disabled={disabled}
        onChange={c =>
          PickedColor.update(() =>
            component.modify(currentColor, c)
          )
        }
        child={<>{colorName}: {component.get(currentColor)}</>}
      />

    const drawSlidersPair = (
      component: SimpleLens<Color, number>,
      colorName: string,
    ): ReactElement =>
      <>
        {drawColorSlider(component, colorName)}
        {drawGhostSlider(component)}
      </>

    const whenDisabled = (child: (subclass: string) => ReactElement): ReactElement =>
      disabledWith.match({
        some: ({ outcome }) =>
          child(outcome.match({
            victory: "overlay-on-victory",
            defeat: "overlay-on-defeat",
          })),
        none: <></>,
      })
    const overlayOnDisabled = (subclass: string) =>
      <div className={`color-picker ${subclass}`} />

    return <div className={"color-picker"}>
      {drawSlidersPair(withR, "R")}
      {drawSlidersPair(withG, "G")}
      {drawSlidersPair(withB, "B")}
      {whenDisabled(overlayOnDisabled)}
    </div>
  }

const GhostSlider: FC<{ value: Option<number> }> = ({ value }) =>
  <>
    <div className="slidecontainer ghost">
      <input
        type="range"
        disabled={true}
        style={{
          visibility: value.match({
            none: "hidden",
            some: _ => undefined
          })
        }}
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
  const debounce = useDebounce(10)
  const change = (val: number): void => {
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
      <div className="difficulty-picker">
        <div>
          Restart with difficulty: {
            displayDifficulty(Difficulty.current)
          }
        </div>
        <div>
          <input
            type="range"
            min="0"
            max="100"
            defaultValue={Difficulty.current}
            onChange={
              e => {
                const newValue = e.currentTarget.valueAsNumber
                debounce(() =>
                  Difficulty.update(() => newValue)
                )
              }
            }
            className={`slider difficulty-picker`}
          />
        </div>
      </div>
    </>
  }