"use client"
import { createElement, DetailedHTMLProps, FC, HTMLAttributes, InputHTMLAttributes, ReactElement, useEffect, useState } from "react";
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
export type OngoingGameState = {
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
export const OngoingGameState: OngoingGameStateAlg<OngoingGameState> = {
  playing: {match: alg => alg.playing},
  ended: (failed,difference,difficulty) => ({
    match: alg => alg.ended(failed,difference,difficulty)
  })
}

const displayDifficulty = (difficulty: number): string =>
  `${difficulty}/255`

// Shared state

type DifficultyState = { Difficulty: State<number> }
type GuessedColorState = { GuessedColor: State<Color> }
type PickedColorState = { PickedColor: State<Color> }
type GameStateState = { GameState: State<OngoingGameState> }
export type GameState =
  DifficultyState
  & GuessedColorState
  & PickedColorState
  & GameStateState

// Algebras

export type Div<in out A> = {
  div(attrs: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>): (childs: A[]) => A,
}
export type Str<in out A> = {
  str(text: string): A,
}
export type Empty<in out A> = {
  empty: A,
}
export type Fold<in out A> = {
  fold: (elems: A[]) => A,
}
export type UseDebounce<in out A> = {
  useDebounce: (
    delayMs: number,
    cont: (debounce: (delayed: () => void) => void) => A
    ) => A,
}
export type Input<in out A> = {
  input: (attrs: InputHTMLAttributes<HTMLInputElement>) => A
}

export type UseState<in out A> = {
  useState: <S>(
    initialState: S | (() => S),
    andThen: (state: [S, (s: (() => S) | S | ((s0:S) => S)) => void]) => A,
  ) => A,
}
export type UseEffect<in out A> = {
  useEffect: (
    effect: () => void,
    onChangeOf: any[],
    andThen: () => A,
  ) => A,
}

// Components

export const makeGameState = <A,>(
  alg: UseState<A> & UseEffect<A> & Empty<A>,
  cont: (state: GameState, key: number, setKey: (upd: (n: number) => number) => void) => A,
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
          alg.useState<Color>(
          DEFAULT_COLOR,
          ([pickedColor, setPickedColor]) => {
            if (!guessedColor) {
              return alg.empty
            } else {
              return cont({
                Difficulty: State(difficulty, setDifficulty),
                GuessedColor: State(guessedColor, setGuessedColor),
                PickedColor: State(pickedColor, setPickedColor),
                GameState: State(gameState, setGameState),
              },gameId,setGameId)
            }
          }))))))

export const Game: FC = () =>
  GameFT<ReactElement>({
    makeGameState: cont => makeGameState({
      ...Algebras.useEffectElement,
      ...Algebras.useStateElement,
      ...Algebras.emptyElement,
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
      setKey: (upd: (n: number) => number) => void
    ) => A) => A,
  },
) => 
  alg.makeGameState(
    (state,key,setKey) => {
      const restartGame = (): void => {
        state.GuessedColor.update(() => randomColor())
        state.PickedColor.update(() => DEFAULT_COLOR)
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
    ...Algebras.basicElements,
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
      { PickedColor },
    ),
    alg.InfoBar({ Difficulty, GameState }),
    alg.div({className: "colored-background"})([
      stillPlaying
        ? alg.ColoredBackground(actualColor,alg.empty)
        : alg.ColorsComparison(actualColor,PickedColor.current)
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
  ({state}) => InfoBarFT(state)(Algebras.basicElements)
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
          ended: (_out, _diff, difficulty) => difficulty,
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
    ...Algebras.basicElements,
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
  ({color,child}) => ColoredBackgroundFT(color,child)(Algebras.basicElements)

export const ColoredBackgroundFT =
  <A,>(color: Color, child: A) =>
  (alg: Div<A>): A =>
  alg.div( {
    className: "colored-background background",
    style: {backgroundColor: colorToCode(color)},
  })
  ([child])
  
// color picker

const withR: SimpleLens<Color, number> = Lens.property("r")
const withG: SimpleLens<Color, number> = Lens.property("g")
const withB: SimpleLens<Color, number> = Lens.property("b")

type ColorPicker<A> = {
  ColorPicker: (
    disabledWith: Option<{ actual: Color, outcome: Outcome }>,
    { PickedColor }: PickedColorState,
  ) => A,
}
const ColorPicker: FC<{
  disabledWith: Option<{
    actual: Color;
    outcome: Outcome;
  }>,
  state: PickedColorState,
}> = ({disabledWith,state}) =>
  ColorPickerFT(disabledWith,state)({
    ...Algebras.basicElements,
    ...Algebras.ghostSliderElements,
    ...Algebras.colorSliderElements,
  })
const ColorPickerFT = (
    disabledWith: Option<{ actual: Color, outcome: Outcome }>,
    { PickedColor }: PickedColorState
  ) =>
  <A,>(alg: Div<A> & Str<A> & Empty<A> & Fold<A> & ColorSlider<A> & GhostSlider<A>): A => {
  const currentColor: Color = PickedColor.current

  const disabled = disabledWith.match({
    some: () => true,
    none: false
  })
  const drawGhostSlider = (component: SimpleLens<Color, number>): A =>
    alg.GhostSlider(disabledWith.match({
      none: None(),
      some: ({ actual }) => Some(component.get(actual)),
    }))
  const drawColorSlider = (
    component: SimpleLens<Color, number>,
    colorName: string,
  ): A =>
    alg.ColorSlider(
      disabled,
      c =>
        PickedColor.update(() =>
          component.modify(currentColor, c)
        ),
      alg.str(`${colorName}: ${component.get(currentColor)}`),
    );

  const drawSlidersPair = (
    component: SimpleLens<Color, number>,
    colorName: string,
  ): A =>
    alg.fold([
      drawColorSlider(component, colorName),
      drawGhostSlider(component),
    ]);

  const whenDisabled = (child: (subclass: string) => A): A =>
    disabledWith.match({
      some: ({ outcome }) =>
        child(outcome.match({
          victory: "overlay-on-victory",
          defeat: "overlay-on-defeat",
        })),
      none: alg.empty,
    })
  const overlayOnDisabled = (subclass: string) =>
    alg.div({className: `color-picker ${subclass}`})([])

  return alg.div({className: "color-picker"})([
    drawSlidersPair(withR, "R"),
    drawSlidersPair(withG, "G"),
    drawSlidersPair(withB, "B"),
    whenDisabled(overlayOnDisabled),
  ])
}

// ghost slider

type GhostSlider<A> = {
  GhostSlider: (value: Option<number>) => A,
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
        value={value.match({ some: x => x, none: -1 })}
        className="slider ghost"
      />
    </div>
  </>

// color slider

type ColorSliderProps = {
  disabled: boolean,
  onChange: (val: number) => void,
  child: ReactElement,
}

type ColorSlider<A> = {
  ColorSlider: (
    disabled: boolean,
    onChange: (m: number) => void,
    child: A,
  ) => A,
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

// difficulty picker

type DifficultyPicker<A> = {
  DifficultyPicker: (state: DifficultyState) => A,
}
const DifficultyPicker: FC<{state: DifficultyState}> =
  ({state}) => DifficultyPickerFT(state)(Algebras.basicElements)

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

namespace Algebras {
  export const divElement: Div<ReactElement> = {
    div: props => childs =>
      createElement('div',props,foldElements.fold(childs)),
  }
  export const strElement: Str<ReactElement> = {
    str: text => <>{text}</>,
  }
  export const emptyElement: Empty<ReactElement> ={
    empty: <></>,
  }
  export const foldElements: Fold<ReactElement> = {
    fold: childs => childs.reduce(
      (acc,x) => <>{acc}{x}</>,
      <></>,
      ),
  }
  export const ghostSliderElements: GhostSlider<ReactElement> = {
    GhostSlider: value => <GhostSlider value={value}/>,
  }
  export const colorSliderElements: ColorSlider<ReactElement> = {
    ColorSlider: (disabled, onChange, child) =>
      <ColorSlider disabled={disabled} onChange={onChange} child={child}/>,
  }
  export const useDebounceElement: UseDebounce<ReactElement> = {
    useDebounce: (ms,cont) => {
      const debounce = useDebounce(ms)
      return cont(debounce)
    }
  }
  export const useEffectElement: UseEffect<ReactElement> = {
    useEffect: (effect,deps,cont) => {
      useEffect(effect,deps)
      return cont()
    }
  }
  export const useStateElement: UseState<ReactElement> = {
    useState: (initial,cont) => {
      const s = useState(initial)
      return cont(s)
    }
  }
  export const inputElement: Input<ReactElement> = {
    input: props => createElement('input',props)
  }
  const foldText = (xs: string[]): string =>
    xs.reduce((a,b) => `${a}${b}`,'')
  export type Basics<A> = 
    & Div<A>
    & Str<A>
    & Empty<A>
    & Fold<A>
    & UseDebounce<A>
    & Input<A>
  export const stringSchema: Basics<string> = {
    div: props => childs =>
      `[div props='${JSON.stringify(props)}']${
        foldText(childs)
      }[end div]`,
    str: text => `'${text}'`,
    empty: '',
    fold: foldText,
    useDebounce: (ms, cont) =>
      `[useDebounce ${ms}]${ cont(_ => {}) }[end useDebounce]`,
    input: props => `[input props=${JSON.stringify(props)}]`,
  }
  export const basicElements: Algebras.Basics<ReactElement> = {
    ...Algebras.divElement,
    ...Algebras.strElement,
    ...Algebras.emptyElement,
    ...Algebras.foldElements,
    ...Algebras.inputElement,
    ...Algebras.useDebounceElement,
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
    ...Algebras.stringSchema,
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
