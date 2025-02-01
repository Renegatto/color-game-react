import { GameFT, GameRound, GameState, OngoingGameState } from "../src/app/Game.tsx"
import { test} from "@jest/globals"

const mockGameState = {
  Difficulty: { current: 30, update: () => {} },
  GuessedColor: { current: {r:0,g:0,b:0}, update: () => {} },
  PickedColor: { current: {r:0,g:0,b:0}, update: () => {} },
  GameState: { current: OngoingGameState.playing, update: () => {} }
}
const noopAlg: GameRound<void> = {
  pickColorBtn: _ => {}, // this case
  div: _ => childs => childs.forEach(_ => {}),
  empty: (() => {})(),
  str: _ => {},
  fold: xs => xs.forEach(_ => {}),
  ghostSlider: _ => {},
  colorSlider: _ => {},
  restartBtn: _ => {},
  useDebounce: (_,cont) => cont(delayed => delayed()),
  input: _ => {},
}

test('onPicked should switch game state to "ended"', () => {
  const currentState = { value: OngoingGameState.playing }; 
  const state: GameState = {
    ...mockGameState,
    GameState: {
      current: OngoingGameState.playing,
      update: state => {currentState.value = state()},
    },
  }
  const handler: { value?: () => void } = {};
  GameFT({
    GameRound: (_,state,restart) => {
      GameRound(restart,state)({
        ...noopAlg,
        pickColorBtn: onPicked => {handler.value = onPicked}, // this case
      });
    },
    makeGameState: cont => cont(state,2,() => {}),
  });

  handler.value && handler.value();
  currentState.value.match<() => void>({
    ended: () => () => {},
    playing: () => {
      throw new Error("State does not change for the first time")
    }
  })()

  handler.value && handler.value();
  currentState.value.match<() => void>({
    ended: () => () => {},
    playing: () => {
      throw new Error("State should not change second time")
    }
  })()
})