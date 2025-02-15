import { FC } from "react"
import * as Basics from "../../basics"
import { Div, Empty } from "../../basics"
import { colorPicker, ColorPicker } from "../ColorPicker"
import { Current, eachIsClose, None, Some } from "../../Utils"
import { DifficultyState, GameStateState, GuessedColorState, Outcome, PickedColorState } from ".."
import { difficultyPicker, DifficultyPicker } from "../DifficultyPicker"
import { infoBar, InfoBar } from "../InfoBar"
import { ColoredBackground, coloredBackground } from "./ColoredBackground"
import { ColorsComparison, colorsComparison } from "./ColorsComparison"
import { PickColorButton } from "./PickColorButton"
import { RestartButton } from "./RestartButton"

export type GameRoundProps = {
  restartGame: () => void,
  state: GameRoundState,
  difficulty: number,
}

export type GameRoundState = DifficultyState
  & GameStateState
  & PickedColorState
  & Current<GuessedColorState>

export const GameRound: FC<GameRoundProps> = ({state,restartGame,difficulty}) =>
  GameRoundFT<GameRoundState>(restartGame,state,difficulty)({
    ...Basics.Elements.basic,
    RestartButton: restartGame => <RestartButton restartGame={restartGame}/>,
    PickColorButton: onPickColor => <PickColorButton onPickColor={onPickColor}/>,
    ...colorPicker,
    ...difficultyPicker,
    ...coloredBackground,
    ...colorsComparison,
    ...infoBar,
  })

export const GameRoundFT = <S,>(
  restartGame: () => void,
  state: S & GameRoundState,
  difficulty: number,
) =>
<A,>(
  alg: Div<A> & Empty<A>
    & PickColorButton<A>
    & RestartButton<A>
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
        ? alg.PickColorButton(onPickColor)
        : alg.div({className: "game bottom-block reset-options"})([
            alg.RestartButton(restartGame),
            alg.DifficultyPicker({state}),
          ])
    ]),
  ]);
}

