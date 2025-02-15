import { FC, ReactElement } from "react"
import { displayDifficulty, GameStateState } from "./Game"
import { Current } from "./Utils"
import * as Basics from "./basics"
import { Div, Str } from "./basics"

export type InfoBar<A> = {
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

export const infoBar: InfoBar<ReactElement> = {
  InfoBar: (state,difficulty) => <InfoBar state={state} difficulty={difficulty}/>
}