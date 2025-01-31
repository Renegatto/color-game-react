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

// Algebras

type Div<in out A> = {
  div(attrs: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>): (childs: A[]) => A,
}
type Str<in out A> = {
  str(text: string): A,
}
type Empty<in out A> = {
  empty: A,
}
type Fold<in out A> = {
  fold: (elems: A[]) => A,
}
type UseDebounce<in out A> = {
  useDebounce: (
    delayMs: number,
    cont: (debounce: (delayed: () => void) => void) => A
    ) => A,
}
type Input<in out A> = {
  input: (attrs: InputHTMLAttributes<HTMLInputElement>) => A
}
type Buttons<in out A> = {
  restartBtn: (restartGame: () => void) => A,
  pickColorBtn: (onPickColor: () => void) => A,
}
type Sliders<in out A> = {
  ghostSlider: (value: Option<number>) => A,
  colorSlider: (disabled: boolean, onChange: (m: number) => void, child: A) => A,
}

// Components

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
    return <GameRoundComponent
      key={gameId}
      state={state}
      restartGame={() => {
        restartGame();
        // just for fun, let's print the schema
        console.log(GameRoundSchema({state,restartGame}));
      }}
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
type GameRound<A> = Div<A> & Empty<A> & Str<A> & Fold<A> & Sliders<A> & Buttons<A> & UseDebounce<A> & Input<A>

export const GameRound = ({
  restartGame,
  state: {
    Difficulty,
    GameState,
    PickedColor,
    GuessedColor: { current: actualColor },
  },
}: GameRoundProps) =>
<A,>(alg: GameRound<A>): A => {
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
    ColorPicker(
      GameState.current.match({
        ended: outcome => Some({ actual: actualColor, outcome }),
        playing: None(),
      }),
      { PickedColor },
    )(alg),
    InfoBar({ Difficulty, GameState })(alg),
    alg.div({className: "colored-background"})([
      stillPlaying
        ? ColoredBackground(actualColor,alg.empty)(alg)
        : ColorsComparison(actualColor,PickedColor.current)(alg)
    ]),
    alg.div({className: "game bottom-block"})([
      stillPlaying
        ? alg.pickColorBtn(onPickColor)
        : alg.div({className: "game bottom-block reset-options"})([
            alg.restartBtn(restartGame),
            DifficultyPicker({Difficulty})(alg),
          ])
    ]),
  ]);
}

const PickColorBtn: FC<{ onPickColor: () => void }> = ({onPickColor}) =>
  <button
    className="game bottom-block submit-btn"
    type="button"
    onClick={onPickColor}
  >
    Pick
  </button>

const RestartBtn: FC<{ restartGame: () => void }> = ({restartGame}) =>
  <button
    className="game bottom-block reset-options reset-game-btn"
    type="button"
    onClick={restartGame}
  >
    Restart
  </button>

export const InfoBar =
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

export const ColorsComparison =
  (actual: Color, picked: Color) =>
  <A,>(alg: Div<A> & Str<A> & Fold<A>): A =>
  alg.fold([
    alg.div({className: "colored-background comparison"})([
      ColoredBackground(actual,alg.str(`Actual color ${colorToCode(actual)}`))(alg),
    ]),
    alg.div({className: "colored-background comparison"})([
      ColoredBackground(
        picked,
        alg.str(`Your color ${colorToCode(picked)}`),
      )(alg),
    ]),
  ])

export const ColoredBackground =
  <A,>(color: Color, child: A) =>
  (alg: Div<A>): A =>
  alg.div( {
    className: "colored-background background",
    style: {backgroundColor: colorToCode(color)},
  })
  ([child])
  
const withR: SimpleLens<Color, number> = Lens.property("r")
const withG: SimpleLens<Color, number> = Lens.property("g")
const withB: SimpleLens<Color, number> = Lens.property("b")

const ColorPicker = (
    disabledWith: Option<{ actual: Color, outcome: Outcome }>,
    { PickedColor }: PickedColorState
  ) =>
  <A,>(alg: Div<A> & Str<A> & Empty<A> & Fold<A> & Sliders<A>): A => {
  const currentColor: Color = PickedColor.current

  const disabled = disabledWith.match({
    some: () => true,
    none: false
  })
  const drawGhostSlider = (component: SimpleLens<Color, number>): A =>
    alg.ghostSlider(disabledWith.match({
      none: None(),
      some: ({ actual }) => Some(component.get(actual)),
    }))
  const drawColorSlider = (
    component: SimpleLens<Color, number>,
    colorName: string,
  ): A =>
    alg.colorSlider(
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

const DifficultyPicker =
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
  export const buttonsElements: Buttons<ReactElement> = {
    restartBtn: restartGame => <RestartBtn restartGame={restartGame}/>,
    pickColorBtn: onPickColor => <PickColorBtn onPickColor={onPickColor}/>,
  }
  export const sliderElements: Sliders<ReactElement> = {
    ghostSlider: value => <GhostSlider value={value}/>,
    colorSlider: (disabled, onChange, child) =>
      <ColorSlider disabled={disabled} onChange={onChange} child={child}/>,
  }
  export const useDebounceElement: UseDebounce<ReactElement> = {
    useDebounce: (ms,cont) => {
      const debounce = useDebounce(ms)
      return cont(debounce)
    }
  }
  export const inputElement: Input<ReactElement> = {
    input: props => createElement('input',props)
  }

  const foldText = (xs: string[]): string =>
    xs.reduce((a,b) => `${a}${b}`,'')
  export const stringSchema: GameRound<string> = {
    div: props => childs =>
      `[div props='${JSON.stringify(props)}']${
        foldText(childs)
      }[end div]`,
    str: text => `'${text}'`,
    empty: '',
    fold: foldText,
    restartBtn: () => '[RestartBtn]',
    useDebounce: (ms, cont) =>
      `[useDebounce ${ms}]${ cont(_ => {}) }[end useDebounce]`,
    pickColorBtn: () => '[PickColorBtn]',
    ghostSlider: (disabledWith: Option<number>) =>
      disabledWith.match({
        some: n => `[GhostSlider n=${n}]`,
        none: '[GhostSlider]'
      }),
    input: props => `[input props=${JSON.stringify(props)}]`,
    colorSlider: (disabled, _, child) =>
      `[ColorSlider ${disabled ? 'disabled' : ''}]${child}[end ColorSlider]`,
  }
}

const gameRoundElements: GameRound<ReactElement> = {
  ...Algebras.divElement,
  ...Algebras.strElement,
  ...Algebras.emptyElement,
  ...Algebras.foldElements,
  ...Algebras.inputElement,
  ...Algebras.useDebounceElement,
  ...Algebras.buttonsElements,
  ...Algebras.sliderElements,
}

// normal GameRound
const GameRoundComponent: FC<GameRoundProps> = (props) =>
  GameRound(props)(gameRoundElements)


const capitalized = <A,Alg>(
  items: (alg: Alg & Str<A>) => A,
  alg: Alg & Str<A>,
): A => items({...alg, str: text => alg.str(text.toUpperCase())})

const capitalizedGameRound = (props: GameRoundProps) =>
  <A,>(alg: GameRound<A>) => capitalized(GameRound(props), alg)

// capitalized GameRound
const CapGameRoundComponent: FC<GameRoundProps> = (props) =>
  capitalizedGameRound(props)(gameRoundElements)

// GameRound schema
const GameRoundSchema = (props: GameRoundProps): string =>
  GameRound(props)(Algebras.stringSchema)
