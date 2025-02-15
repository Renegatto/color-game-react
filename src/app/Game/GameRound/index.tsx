import { FC, ReactElement } from "react"
import * as Basics from "../../basics"
import { Div, Empty, Fold, Str } from "../../basics"
import { colorPicker, ColorPicker } from "../ColorPicker"
import { Color, colorToCode, Current, eachIsClose, None, Some } from "../../Utils"
import { DifficultyState, GameStateState, GuessedColorState, Outcome, PickedColorState } from ".."
import { difficultyPicker, DifficultyPicker } from "../DifficultyPicker"
import { infoBar, InfoBar } from "../InfoBar"
import { ColoredBackground, coloredBackground } from "./ColoredBackground"

export type GameRoundProps = {
  restartGame: () => void,
  state: GameRoundState,
  difficulty: number,
}

export type GameRoundState = DifficultyState
  & GameStateState
  & PickedColorState
  & Current<GuessedColorState>

export const GameRound: FC<GameRoundProps> = ({state,restartGame,difficulty}) => {
  return GameRoundFT<GameRoundState>(restartGame,state,difficulty)({
    ...Basics.Elements.basic,
    RestartBtn: restartGame => <RestartBtn restartGame={restartGame}/>,
    PickColorBtn: onPickColor => <PickColorBtn onPickColor={onPickColor}/>,
    ...colorPicker,
    ...difficultyPicker,
    ...coloredBackground,
    ...Elements.colorsComparison,
    ...infoBar,
  })
}

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


// colors comparison

type ColorsComparison<A> = {
  ColorsComparison: (actual: Color, picked: Color) => A,
}
const ColorsComparison: FC<{actual: Color,picked: Color}> =
  ({actual,picked}) => ColorsComparisonFT(actual,picked)({
    ...Basics.Elements.basic,
    ...coloredBackground,
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

// difficulty picker


namespace Elements {

  export const colorsComparison: ColorsComparison<ReactElement> = {
    ColorsComparison: (actual,picked) =>
      <ColorsComparison actual={actual} picked={picked}/>
  }

}