"use client"
import { FC, ReactElement } from "react";
import { Color, colorToCode, Current, eachIsClose, State, randomColor, Some, None } from "./Utils";
import { ColorPicker } from "./components/ColorPicker";
import { Div, Empty, Fold, Input, Str, UseDebounce, UseEffect, UseState } from "./basics";
import * as Basics from "./basics"
import { Exhibit, usePeek } from "./Hooks";

export const DEFAULT_COLOR: Color = { r: 0, g: 0, b: 0 }
const DEFAULT_DIFFICULTY = 10

// Outcome datatype
export type Outcome = { match: <C>(alg: OutcomeAlg<C>) => C }
// its constructors
export const Outcome: OutcomeAlg<Outcome> = {
  victory: { match: alg => alg.victory },
  defeat: { match: alg => alg.defeat },
}
// its deconstructor
type OutcomeAlg<in out A> = {
  victory: A,
  defeat: A,
}

// OngoingGameState datatype
export type OngoingGameState = {
  match: <A>(alg: OngoingGameStateAlg<A>) => A
}
type OngoingGameStateAlg<in out A> = {
  playing: A,
  ended(
    failed: Outcome,
    difference: number,
    withPickedColor: Color,
    withDifficulty: number,
  ): A,
}
export const OngoingGameState: OngoingGameStateAlg<OngoingGameState> = {
  playing: {match: alg => alg.playing},
  ended: (failed,difference,withPickedColor,difficulty) => ({
    match: alg => alg.ended(failed,difference,withPickedColor,difficulty)
  })
}

const displayDifficulty = (difficulty: number): string =>
  `${difficulty}/255`

// Shared state

export type DifficultyState = { Difficulty: State<number> }
export type GuessedColorState = { GuessedColor: State<Color> }
export type PickedColorState = { PickedColor: ColorState }
export type GameStateState = { GameState: State<OngoingGameState> }
export type GameState =
  DifficultyState
  & GuessedColorState
  & PickedColorState
  & GameStateState

// Algebras

// Components

export const makeGameState = <A,>(
  alg: UseState<A> & UseEffect<A> & Empty<A> & UseColor<A>,
  cont: (
    state: GameState,
    key: number,
    setKey: (upd: (n: number) => number) => void,
  ) => A,
): A =>
  alg.useState<Color | undefined>(
    undefined,
    ([guessedColor, setGuessedColor]) =>
    // it can not be defined initially since the only way to obtain it is to
    // perform side-effect
      alg.useEffect(
        () => setGuessedColor(randomColor()),
        [],
        () =>
          alg.useState(
          DEFAULT_DIFFICULTY,
          ([difficulty, setDifficulty]) =>
          alg.useState(
          0,
          ([gameId, setGameId]) =>
          alg.useState<OngoingGameState>(
          () => ({ match: alg => alg.playing }),
          ([gameState, setGameState]) =>
          alg.useColor(
          DEFAULT_COLOR,
          colorState => {
            if (!guessedColor) {
              return alg.empty
            } else {
              return cont({
                Difficulty: State(difficulty, setDifficulty),
                GuessedColor: State(guessedColor, setGuessedColor),
                PickedColor: colorState,
                GameState: State(gameState, setGameState),
              },gameId,setGameId)
            }
          }))))))

export const Game: FC = () =>
  GameFT<ReactElement>({
    makeGameState: cont => makeGameState({
      ...Basics.Elements.useEffect,
      ...Basics.Elements.useState,
      ...Basics.Elements.empty,
      useColor: (initial,cont) => cont(useColor(initial)),
    },cont),
    GameRound: (key,state,restart) =>
      <GameRound key={key} state={state} restartGame={restart}/>
  })
export const GameFT = <A,>(
  alg: {
    GameRound: (
      key: number,
      state: GameRoundState,
      restartGame: () => void,
    ) => A,
    makeGameState: (cont: (
      state: GameState,
      key: number,
      setKey: (upd: (n: number) => number) => void,
    ) => A) => A,
  },
) => 
  alg.makeGameState(
    (state,key,setKey) => {
      const restartGame = (): void => {
        state.GuessedColor.update(() => randomColor())
        state.GameState.update(() => ({ match: alg => alg.playing }))
        setKey((id: number) => (id + 1) % 2)
      }
      return alg.GameRound(
        key,
        state,
        () => {
          restartGame();
          // just for fun, let's print the schema
          console.log(GameRoundSchema({state,restartGame}));
        },
      )
    }
  )

// GameRound
type GameRoundProps = {
  restartGame: () => void,
  state: GameRoundState
}
const GameRound: FC<GameRoundProps> = ({state,restartGame}) =>
  GameRoundFT(restartGame,state)({
    ...Basics.Elements.basic,
    RestartBtn: restartGame => <RestartBtn restartGame={restartGame}/>,
    PickColorBtn: onPickColor => <PickColorBtn onPickColor={onPickColor}/>,
    ...Elements.colorPicker,
    ...Elements.difficultyPicker,
    ...Elements.coloredBackground,
    ...Elements.colorsComparison,
    ...Elements.infoBar,
  })

type GameRoundState = DifficultyState
  & GameStateState
  & PickedColorState
  & Current<GuessedColorState>

export const GameRoundFT = (
  restartGame: () => void,
  {
    Difficulty,
    GameState,
    PickedColor,
    GuessedColor: { current: actualColor },
  }: GameRoundState
) =>
<A,>(
  alg: Div<A> & Empty<A>
    & PickColorBtn<A>
    & RestartBtn<A>
    & ColorPicker<A>
    & ColoredBackground<A>
    & DifficultyPicker<A>
    & ColorsComparison<A>
    & InfoBar<A>
  ): A => {
  const onPickColor = (): void => {
    const [matches, maxDifference] = eachIsClose(
      Difficulty.current,
      PickedColor.currentColor(),
      actualColor
    )
    GameState.update(() => ({
      match: alg => alg.ended(
        matches ? Outcome.victory : Outcome.defeat,
        maxDifference,
        PickedColor.currentColor(),
        Difficulty.current,
      )
    })
    )
  }
  const stillPlaying: boolean = GameState.current.match({
    playing: true,
    ended: () => false,
  })
  return alg.div({className: "game-round"})([
    alg.ColorPicker(
      GameState.current.match({
        ended: outcome => Some({ actual: actualColor, outcome }),
        playing: None(),
      }),
      {PickedColor},
    ),
    alg.InfoBar({ Difficulty, GameState }),
    alg.div({className: "colored-background"})([
      GameState.current.match({
        playing: alg.ColoredBackground(actualColor,alg.empty),
        ended: (_0,_1,pickedColor) =>
          alg.ColorsComparison(actualColor,pickedColor),
      })
    ]),
    alg.div({className: "game bottom-block"})([
      stillPlaying
        ? alg.PickColorBtn(onPickColor)
        : alg.div({className: "game bottom-block reset-options"})([
            alg.RestartBtn(restartGame),
            alg.DifficultyPicker({Difficulty}),
          ])
    ]),
  ]);
}

// pick color button

type PickColorBtn<A> = {
  PickColorBtn: (onPickColor: () => void) => A,
}
const PickColorBtn: FC<{ onPickColor: () => void }> = ({onPickColor}) =>
  <button
    className="game bottom-block submit-btn"
    type="button"
    onClick={onPickColor}
  >
    Pick
  </button>

// restart button

type RestartBtn<A> = {
  RestartBtn: (restartGame: () => void) => A,
}
const RestartBtn: FC<{ restartGame: () => void }> = ({restartGame}) =>
  <button
    className="game bottom-block reset-options reset-game-btn"
    type="button"
    onClick={restartGame}
  >
    Restart
  </button>

// info bar

type InfoBar<A> = {
  InfoBar: (
    state: Current<DifficultyState> & Current<GameStateState>
  ) => A,
}
const InfoBar: FC<{state: Current<DifficultyState> & Current<GameStateState>}> =
  ({state}) => InfoBarFT(state)(Basics.Elements.basic)
export const InfoBarFT =
  ({ Difficulty, GameState } :
    Current<DifficultyState> & Current<GameStateState>
  ) =>
  <A,>(alg: Div<A> & Str<A>): A =>
  alg.div({className: "info-bar"})([
    GameState.current.match({
      playing: alg.div({hidden: true})([]),
      ended: (outcome, difference, _) =>
        alg.div({})([
          alg.str(outcome.match({
            victory: "Great job!",
            defeat: "Wrong!",
          })),
          alg.str(`Difference is ${Math.round(difference)}`),
        ]),
    }),
    alg.div({})([
      alg.str(`Difficulty: ${
        displayDifficulty(GameState.current.match({
          playing: Difficulty.current,
          // we only display difficulty AT THE MOMENT game was over
          ended: (_out, _diff, _color, difficulty) => difficulty,
        }))
      }`),
    ]),
  ])

// colors comparison

type ColorsComparison<A> = {
  ColorsComparison: (actual: Color, picked: Color) => A,
}
const ColorsComparison: FC<{actual: Color,picked: Color}> =
  ({actual,picked}) => ColorsComparisonFT(actual,picked)({
    ...Basics.Elements.basic,
    ...Elements.coloredBackground,
  })
export const ColorsComparisonFT =
  (actual: Color, picked: Color) =>
  <A,>(
    alg: Div<A> & Str<A> & Fold<A> & ColoredBackground<A>,
  ): A =>
  alg.fold([
    alg.div({className: "colored-background comparison"})([
      alg.ColoredBackground(actual,alg.str(`Actual color ${colorToCode(actual)}`)),
    ]),
    alg.div({className: "colored-background comparison"})([
      alg.ColoredBackground(
        picked,
        alg.str(`Your color ${colorToCode(picked)}`),
      ),
    ]),
  ])

// colored background

type ColoredBackground<A> = {
  ColoredBackground: (color: Color, child: A) => A,
}
const ColoredBackground: FC<{color: Color,child: ReactElement}> =
  ({color,child}) => ColoredBackgroundFT(color,child)(Basics.Elements.basic)

export const ColoredBackgroundFT =
  <A,>(color: Color, child: A) =>
  (alg: Div<A>): A =>
  alg.div( {
    className: "colored-background background",
    style: {backgroundColor: colorToCode(color)},
  })
  ([child])

// difficulty picker

type DifficultyPicker<A> = {
  DifficultyPicker: (state: DifficultyState) => A,
}
const DifficultyPicker: FC<{state: DifficultyState}> =
  ({state}) => DifficultyPickerFT(state)(Basics.Elements.basic)

const DifficultyPickerFT =
 ({ Difficulty } : DifficultyState) =>
  <A,>(alg: Div<A> & Str<A> & UseDebounce<A> & Input<A>): A =>
    alg.useDebounce(10, debounce =>
      alg.div({className: "difficulty-picker"})([
        alg.div({})([
          alg.str(`Restart with difficulty: ${
            displayDifficulty(Difficulty.current)
          }`)
        ]),
        alg.div({})([
          alg.input({
            type: "range",
            min: "0",
            max: "100",
            defaultValue: Difficulty.current,
            onChange: 
              e => {
                const newValue = e.currentTarget.valueAsNumber
                debounce(() =>
                  Difficulty.update(() => newValue)
                )
              },
            className: 'slider difficulty-picker',
          })
        ])
      ])
    )

namespace Elements {
  export const coloredBackground: ColoredBackground<ReactElement> = {
    ColoredBackground: (color,child) =>
    <ColoredBackground color={color} child={child}/>
  }
  export const infoBar: InfoBar<ReactElement> = {
    InfoBar: state => <InfoBar state={state}/>
  }
  export const colorsComparison: ColorsComparison<ReactElement> = {
    ColorsComparison: (actual,picked) =>
      <ColorsComparison actual={actual} picked={picked}/>
  }
  export const difficultyPicker: DifficultyPicker<ReactElement> = {
    DifficultyPicker: state => <DifficultyPicker state={state}/>
  }
  export const colorPicker: ColorPicker<ReactElement> = {
    ColorPicker: (disabledWith,state) =>
      <ColorPicker disabledWith={disabledWith} state={state}/>
  }
}

// const capitalized = <A,Alg>(
//   items: (alg: Alg & Str<A>) => A,
//   alg: Alg & Str<A>,
// ): A => items({...alg, str: text => alg.str(text.toUpperCase())})

// const capitalizedGameRound = ({state,restartGame}: GameRoundProps) =>
//   <A,>(alg: GameRound<A>) => capitalized(GameRound(restartGame,state), alg)

// capitalized GameRound
// const CapGameRoundComponent: FC<GameRoundProps> = (props) =>
//   capitalizedGameRound(props)(gameRoundElements)

// GameRound schema
const GameRoundSchema = ({state,restartGame}: GameRoundProps): string =>
  GameRoundFT(restartGame,state)({
    ...Basics.StringSchema.schema,
    PickColorBtn: () => "[PickColorBtn]",
    RestartBtn: () => "[RestartBtn]",
    ColorPicker: () => "[ColorPicker]",
    ColoredBackground: (color,child) =>
      `[ColoredBackground color=${colorToCode(color)}]${child}[end ColoredBackground]`,
    DifficultyPicker: ({Difficulty: {current}}) =>
      `[DifficultyPicker current=${current}]`,
    ColorsComparison: (actual,picked) =>
      `[ColorsComparison actual=${colorToCode(actual)} picked=${colorToCode(picked)}]`,
    InfoBar: ({Difficulty: {current: currentDifficulty}, GameState: {current: currentGameState}}) =>
      `[InfoBar difficulty=${currentDifficulty} gameState=${currentGameState.match({
        playing: "Playing",
        ended: (outcome,difference,withDifficulty) =>
        `'${outcome.match({defeat: 'Lost',victory: 'Won'})}\
        \ with difficulty ${withDifficulty} and difference ${difference}'`
      })}]`,
  })

// game-specific hook

type UseColor<A> = {
  useColor: (color: Color, cont: (s: ColorState) => A) => A,
}
export type ColorState = {
  currentColor: () => Color,
  exhibitR: Exhibit<number>,
  exhibitG: Exhibit<number>,
  exhibitB: Exhibit<number>,
}

const useColor = (initialColor: Color): ColorState => {
  const r = usePeek(initialColor.r)
  const g = usePeek(initialColor.g)
  const b = usePeek(initialColor.b)
  return {
    exhibitR: r.exhibit,
    exhibitG: g.exhibit,
    exhibitB: b.exhibit,
    currentColor: () => ({r: r.peek(), g: g.peek(), b: b.peek()}),
  }
}