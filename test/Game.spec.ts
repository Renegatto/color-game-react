import { ColorPickerFT } from "@/app/components/ColorPicker.tsx";
import { DEFAULT_COLOR, GameFT, GameRoundFT, GameState, OngoingGameState, Outcome } from "../src/app/Game.tsx"
import { expect, test} from "@jest/globals"
import { Some } from "@/app/Utils.ts";
import { Div, Empty, Fold, Str } from "@/app/basics.tsx";

const mockGameState = {
  Difficulty: { current: 30, update: () => {} },
  GuessedColor: { current: {r:0,g:0,b:0}, update: () => {} },
  PickedColor: { current: {r:0,g:0,b:0}, update: () => {} },
  GameState: { current: OngoingGameState.playing, update: () => {} }
}
namespace Noop {
  export const div: Div<void> = { div: () => () => {} };
  export const empty: Empty<void> = { empty: undefined };
  export const str: Str<void> = { str: () => {} };
  export const fold: Fold<void> = { fold: () => {} };
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
      GameRoundFT(restart,state)({
        ...Noop.empty,
        ...Noop.div,
        RestartBtn: () => {},
        ColorPicker: () => {},
        ColoredBackground: () => {},
        DifficultyPicker: () => {},
        ColorsComparison: () => {},
        InfoBar: () => {},
        PickColorBtn: onPicked => {handler.value = onPicked}, // this case
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
test("Color picker disables it's sliders when disabled", (): void => {
  return ColorPickerFT(
    Some({actual: DEFAULT_COLOR, outcome: Outcome.victory}),
    {PickedColor: {current: DEFAULT_COLOR, update: () => {}}},
  )({
    ...Noop.div,
    ...Noop.str,
    ...Noop.empty,
    ...Noop.fold,
    ColorSlider: disabled => {
      expect(disabled).toStrictEqual(true)
    },
    GhostSlider: () => {},
  })
})