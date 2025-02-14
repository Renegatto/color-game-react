"use client"
import { Dispatch, FC, ReactElement, SetStateAction } from "react";
import { Color, colorToCode, Current, eachIsClose, State, randomColor, Some, None } from "./Utils";
import { Div, Empty, Fold, Input, Str, UseDebounce, UseEffect, UsePeek, UseState } from "./basics";
import * as Basics from "./basics"
import { Exhibit, useExhibitedState, usePeek } from "./Hooks";
import { ColorPicker } from "./components/ColorPicker";

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

export type DifficultyState = {
  Difficulty: {
    peek: (cont: (difficulty: number) => void) => void,
    exhibit: Exhibit<number>,
  }
}
export type RoundDifficultyState = { RoundDifficulty: State<number> }
export type GuessedColorState = { GuessedColor: State<Color> }
export type PickedColorState = { PickedColor: ColorState }
export type GameStateState = { GameState: State<OngoingGameState> }
export type GameState =
  DifficultyState
  & RoundDifficultyState
  & GuessedColorState
  & PickedColorState
  & GameStateState

// Algebras

// Components

export const makeGameState = <A,>(
  alg: UseState<A> & UseEffect<A> & Empty<A> & UseColor<A> & UsePeek<A>,
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
          ([difficulty,setDifficulty]) =>
          alg.useState(
          0,
          ([gameId, setGameId]) =>
          alg.useState<OngoingGameState>(
          () => ({ match: alg => alg.playing }),
          ([gameState, setGameState]) =>
          alg.usePeek(
          difficulty,
          difficultyState =>
          alg.useColor(
          DEFAULT_COLOR,
          colorState => {
            if (!guessedColor) {
              return alg.empty
            } else {
              return cont({
                Difficulty: difficultyState,
                RoundDifficulty: State(difficulty,setDifficulty),
                GuessedColor: State(guessedColor, setGuessedColor),
                PickedColor: colorState,
                GameState: State(gameState, setGameState),
              },gameId,setGameId)
            }
          })))))))

export const Game: FC = () =>
  GameFT<ReactElement>({
    makeGameState: cont => makeGameState({
      ...Basics.Elements.useEffect,
      ...Basics.Elements.useState,
      ...Basics.Elements.empty,
      useColor: (initial,cont) => cont(useColor(initial)),
      ...Basics.Elements.usePeek,
    },cont),
    GameRound: (key,state,difficulty,restart) =>
      <GameRound key={key} state={state} restartGame={restart} difficulty={difficulty}/>
  })
export const GameFT = <A,>(
  alg: {
    GameRound: (
      key: number,
      state: GameRoundState,
      difficulty: number,
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
        state.Difficulty.peek(difficulty =>
          state.RoundDifficulty.update(() => difficulty)
        )
        setKey((id: number) => (id + 1) % 2)
      }
      return alg.GameRound(
        key,
        state,
        state.RoundDifficulty.current,
        () => {
          restartGame();
          // just for fun, let's print the schema
          console.log(GameRoundSchema({state,restartGame,difficulty: state.RoundDifficulty.current}));
        },
      )
    }
  )

// GameRound
type GameRoundProps = {
  restartGame: () => void,
  state: GameRoundState,
  difficulty: number,
}

const GameRound: FC<GameRoundProps> = ({state,restartGame,difficulty}) => {
  return GameRoundFT<GameRoundState>(restartGame,state,difficulty)({
    ...Basics.Elements.basic,
    RestartBtn: restartGame => <RestartBtn restartGame={restartGame}/>,
    PickColorBtn: onPickColor => <PickColorBtn onPickColor={onPickColor}/>,
    ...Elements.colorPicker,
    ...Elements.difficultyPicker,
    ...Elements.coloredBackground,
    ...Elements.colorsComparison,
    ...Elements.infoBar,
  })
}
type GameRoundState = DifficultyState
  & GameStateState
  & PickedColorState
  & Current<GuessedColorState>

export const GameRoundFT = <S,>(
  restartGame: () => void,
  state: S & GameRoundState,
  difficulty: number,
) =>
<A,>(
  alg: Div<A> & Empty<A>
    & PickColorBtn<A>
    & RestartBtn<A>
    & ColorPicker<S,A>
    & ColoredBackground<A>
    & DifficultyPicker<S,A>
    & ColorsComparison<A>
    & InfoBar<A>
  ): A => {
  const {
    Difficulty,
    GameState,
    PickedColor,
    GuessedColor: { current: actualColor },
  } = state
  const onPickColor = (): void => {
    PickedColor.currentColor(currentColor =>
      Difficulty.peek(currentDifficulty => {
        const [matches, maxDifference] = eachIsClose(
          currentDifficulty,
          currentColor,
          actualColor,
        )
        GameState.update(() => ({
          match: alg => alg.ended(
            matches ? Outcome.victory : Outcome.defeat,
            maxDifference,
            currentColor,
            currentDifficulty,
          )
        })
        )
      })
    )
  }
  const stillPlaying: boolean = GameState.current.match({
    playing: true,
    ended: () => false,
  })
  return alg.div({className: "game-round"})([
    alg.ColorPicker({
      disabledWith: GameState.current.match({
        ended: outcome => Some({ actual: actualColor, outcome }),
        playing: None(),
      }),
      state,
    }),
    alg.InfoBar({ GameState }, difficulty),
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
            alg.DifficultyPicker({state}),
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
    state: Current<GameStateState>,
    difficulty: number,
  ) => A,
}
const InfoBar: FC<{state: Current<GameStateState>, difficulty: number}> =
  ({state,difficulty}) => InfoBarFT(state,difficulty)(Basics.Elements.basic)
export const InfoBarFT =
  ({ GameState } : Current<GameStateState>,
    difficulty: number,
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
          playing: difficulty,
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

type DifficultyPicker<S,A> = {
  DifficultyPicker: (props: { state: S }) => A,
}

type UseExhibitedState<A> = {
  useExhibitedState: <B>(
    initial: B,
    exhibit: Exhibit<B>,
    cont: (state: [B,Dispatch<SetStateAction<B>>]) => A
  ) => A,
}

const DifficultyPicker: FC<{state: DifficultyState}> =
  ({state}) => DifficultyPickerFT(state)({
    ...Basics.Elements.basic,
    useExhibitedState: (initial,exhibit,cont) =>
      cont(useExhibitedState(initial,exhibit)),
    extractOwnState: state => state.Difficulty.exhibit
  })

const DifficultyPickerFT = <S,>(state: S) =>
  <A,>(alg: Div<A>
      & Str<A>
      & UseDebounce<A>
      & Input<A>
      & UseExhibitedState<A>
      & { extractOwnState: (state: S) => Exhibit<number> }
    ): A =>
    alg.useExhibitedState(
      DEFAULT_DIFFICULTY,
      alg.extractOwnState(state),
      ([difficulty,setDifficulty]) =>
        alg.useDebounce(10, debounce =>
          alg.div({className: "difficulty-picker"})([
            alg.div({})([
              alg.str(`Restart with difficulty: ${
                displayDifficulty(difficulty)
              }`)
            ]),
            alg.div({})([
              alg.input({
                type: "range",
                min: "0",
                max: "100",
                defaultValue: difficulty,
                onChange: 
                  e => {
                    const newValue = e.currentTarget.valueAsNumber
                    debounce(() =>
                      setDifficulty(() => newValue)
                    )
                  },
                className: 'slider difficulty-picker',
              })
            ])
          ])
        )
    )
    

namespace Elements {
  export const coloredBackground: ColoredBackground<ReactElement> = {
    ColoredBackground: (color,child) =>
    <ColoredBackground color={color} child={child}/>
  }
  export const infoBar: InfoBar<ReactElement> = {
    InfoBar: (state,difficulty) => <InfoBar state={state} difficulty={difficulty}/>
  }
  export const colorsComparison: ColorsComparison<ReactElement> = {
    ColorsComparison: (actual,picked) =>
      <ColorsComparison actual={actual} picked={picked}/>
  }
  export const difficultyPicker: DifficultyPicker<DifficultyState,ReactElement> ={
    DifficultyPicker: ({state}) =>
      <DifficultyPicker state={state}/>
  }
  export const colorPicker: ColorPicker<PickedColorState,ReactElement> = {
    ColorPicker: ({disabledWith,state}) => <ColorPicker disabledWith={disabledWith} state={state}/>
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
const GameRoundSchema = ({state,restartGame,difficulty}: GameRoundProps): string =>
  GameRoundFT(restartGame,state,difficulty)({
    ...Basics.StringSchema.schema,
    PickColorBtn: () => "[PickColorBtn]",
    RestartBtn: () => "[RestartBtn]",
    ColorPicker: () => "[ColorPicker]",
    ColoredBackground: (color,child) =>
      `[ColoredBackground color=${colorToCode(color)}]${child}[end ColoredBackground]`,
    DifficultyPicker: () => `[DifficultyPicker]`,
    ColorsComparison: (actual,picked) =>
      `[ColorsComparison actual=${colorToCode(actual)} picked=${colorToCode(picked)}]`,
    InfoBar: ({ GameState: {current: currentGameState}},difficulty) =>
      `[InfoBar difficulty=${difficulty} gameState=${currentGameState.match({
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
  currentColor: (cont: (c: Color) => void) => void,
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
    currentColor: (cont) => r.peek(r1 =>
      g.peek(g1 =>
        b.peek(b1 => cont({r:r1,g:g1,b:b1}))
      )
    ),
  }
}