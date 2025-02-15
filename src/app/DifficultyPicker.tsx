import { FC, ReactElement } from "react"
import { DEFAULT_DIFFICULTY, DifficultyState, displayDifficulty } from "./Game"
import * as Basics from "./basics"
import { Exhibit, useExhibitedState } from "./Hooks"
import { Div, Input, Str, UseDebounce } from "./basics"

export type DifficultyPicker<S,A> = {
  DifficultyPicker: (props: { state: S }) => A,
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
      & Basics.UseExhibitedState<A>
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

export const difficultyPicker: DifficultyPicker<DifficultyState,ReactElement> ={
  DifficultyPicker: ({state}) =>
    <DifficultyPicker state={state}/>
}