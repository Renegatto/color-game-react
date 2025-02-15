"use client"
import { FC, ReactElement } from "react";
import { Color, colorToCode, State, randomColor } from "../Utils";
import { Empty, UseEffect, UsePeek, UseState } from "../basics";
import * as Basics from "../basics"
import { Exhibit, usePeek } from "../Hooks";
import { GameRound, GameRoundFT, GameRoundProps, GameRoundState } from "./GameRound";

export const DEFAULT_COLOR: Color = { r: 0, g: 0, b: 0 }
export const DEFAULT_DIFFICULTY = 10

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

export const displayDifficulty = (difficulty: number): string =>
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
    PickColorButton: () => "[PickColorBtn]",
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