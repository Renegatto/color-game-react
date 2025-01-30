"use client"
import { FC, ReactElement, useEffect, useState } from "react";
import { useDebounce } from "./Hooks";
import { Color, Option, colorToCode, Current, eachIsClose, makeState, randomColor, State, None, Some, Lens, lens } from "./Utils";

type Props = {
  color: Color,
}

type OutcomeAlg<in out A> = {
  victory: A,
  defeat: A,
}
type Outcome = { match: <C>(alg: OutcomeAlg<C>) => C }
const Outcome: OutcomeAlg<Outcome> = {
  victory: { match: alg => alg.victory },
  defeat: { match: alg => alg.defeat },
}

type OngoingGameStateAlg<in out A> = {
  playing: A,
  ended(
    failed: Outcome,
    difference: number,
    withDifficulty: number,
  ): A,
}
type OngoingGameState = {
  match: <A>(alg: OngoingGameStateAlg<A>) => A
}

const displayDifficulty = (difficulty: number): string =>
  `${difficulty}/255`

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
      match: alg => alg.ended(
        matches ? Outcome.victory : Outcome.defeat,
        maxDifference,
        Difficulty.current,
      )
    })
    )
  }
  const roundResult: Option<RoundOutcomeInfo> = GameState.current.match({
    ended: (outcome,difference,difficulty) =>
      Some({
        outcome,
        difference: Math.round(difference),
        difficulty,
      }),
    playing: None(),
  })
  return <div className="game-round">
    <ColorPicker
      disabledWith={
        GameState.current.match({
          ended: outcome => Some({ actual: actualColor, outcome }),
          playing: None()
        })
      }
      state={{PickedColor}}
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

type RoundOutcomeInfo = {
  outcome: Outcome,
  difference: number,
  difficulty: number,
}

export const InfoBar: FC<{
  roundResult: Option<RoundOutcomeInfo>,
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
    <div>Difficulty: {
      displayDifficulty(roundResult.match({
        none: Difficulty.current,
        // we only display difficulty AT THE MOMENT game was over
        some: ({difficulty}) => difficulty,
      }))
    }</div>
  </div>
}

export const ColorsComparison: FC<Props & { color2: Color }> = ({ color, color2 }) =>
  <>
    <div className="colored-background comparison">
      <ColoredBackground color={color} child={<>Actual color {colorToCode(color)}</>} />
    </div>
    <div className="colored-background comparison">
      <ColoredBackground color={color2} child={<>Your color {colorToCode(color2)}</>} />
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
  disabledWith: Option<{ actual: Color, outcome: Outcome }>,
  state: PickedColorState,
  // update: (color: () => Color) => void,
} 


const withR: Lens<Color,number> =
  lens(({r}) => r,({g,b},r) => ({r,g,b}))
const withG: Lens<Color,number> =
  lens(({g}) => g, ({r,b},g) => ({r,g,b}))
const withB: Lens<Color,number> =
  lens(({b}) => b, ({g,r},b) => ({r,g,b}))

const ColorPicker: FC<ColorPickerProps> = ({ disabledWith, state: {PickedColor} }) => {
  const currentColor: Color = PickedColor.current

  const disabled = disabledWith.match({
    some: () => true,
    none: false
  })
  const drawGhostSlider = (component: Lens<Color,number>): ReactElement =>
    <GhostSlider value={disabledWith.match({
      none: None(),
      some: ({actual}) => Some(component.get(actual)),
    })}/>
  const drawColorSlider = (
    component: Lens<Color,number>,
    colorName: string,
  ): ReactElement =>
    <ColorSlider
      disabled={disabled}
      onChange={c =>
        PickedColor.update(() =>
          component.modify(currentColor,c)
        )
      }
      child={<>{colorName}: {component.get(currentColor)}</>}
    />

  const drawSlidersPair = (
    component: Lens<Color,number>,
    colorName: string,
  ): ReactElement =>
    <>
      {drawColorSlider(component, colorName)}
      {drawGhostSlider(component)}
    </>

  const whenDisabled = (child: (subclass: string) => ReactElement): ReactElement =>
    disabledWith.match({
      some: ({outcome}) => 
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
                  debounce(() => Difficulty.update(() => newValue))
                }
              }
              className={`slider difficulty-picker`}
            />
          </div>
      </div>
    </>
  }