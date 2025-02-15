import { ColorPickerFT } from "@/app/Game/ColorPicker/index.tsx";
import { DEFAULT_COLOR, GameFT, GameState, OngoingGameState, Outcome } from "../src/app/Game/index.tsx"
import { expect, test} from "@jest/globals"
import { None, Some } from "@/app/Utils.ts";
import { Basics, Div, Empty, Fold, Input, Str, UseDebounce } from "@/app/basics.tsx";
import { GameRoundFT } from "@/app/Game/GameRound/index.tsx";

const mockGameState: GameState= {
  Difficulty: { peek: cont => cont(0), exhibit: x => x },
  GuessedColor: { current: {r:0,g:0,b:0}, update: () => {} },
  PickedColor: {
    currentColor: cont => cont({r:0,g:0,b:0}),
    exhibitR: x => x,
    exhibitB: x => x,
    exhibitG: x => x,
  },
  RoundDifficulty: { current: 0, update: () => {} },
  GameState: { current: OngoingGameState.playing, update: () => {} }
}
namespace Noop {
  export const div: Div<void> = { div: () => () => {} };
  export const empty: Empty<void> = { empty: undefined };
  export const str: Str<void> = { str: () => {} };
  export const fold: Fold<void> = { fold: () => {} };
  export const useDebounce: UseDebounce<void> = {
    useDebounce: (_,cont) => cont(() => {})
  }
  export const input: Input<void> = { input: () => {} }
  export const basics: Basics<void> = {
    ...div,
    ...str,
    ...empty,
    ...fold,
    ...useDebounce,
    ...input,
  }
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
    GameRound: (_,state,difficulty,restart) => {
      GameRoundFT(restart,state,difficulty)({
        ...Noop.basics,
        RestartButton: () => {},
        ColorPicker: () => {},
        ColoredBackground: () => {},
        DifficultyPicker: () => {},
        ColorsComparison: () => {},
        InfoBar: () => {},
        PickColorButton: onPicked => {handler.value = onPicked}, // this case
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
    ...Noop.basics,
    ColorSlider: disabled => {
      expect(disabled).toStrictEqual(true)
    },
    GhostSlider: () => {},
  })
})
test("Ghost sliders are only shown when the picker is disabled", (): void => {
  var shownOnDisabled = false;
  var shownOnEnabled = false;
  const disabledWith = {actual: DEFAULT_COLOR, outcome: Outcome.victory}
  const state = {PickedColor: {current: DEFAULT_COLOR, update: () => {}}}
  ColorPickerFT(Some(disabledWith),state)({
    ...Noop.basics,
    ColorSlider: () => {},
    GhostSlider: value => {
      value.match({
        some: () => {shownOnDisabled = true;},
        none: undefined
      })
    },
  });
  ColorPickerFT(None(),state)({
    ...Noop.basics,
    ColorSlider: () => {},
    GhostSlider: value => {
      value.match({
        some: () => {shownOnEnabled = true;},
        none: undefined,
      })
    },
  });
  expect(shownOnDisabled).toStrictEqual(true);
  expect(shownOnEnabled).toStrictEqual(false);
})
