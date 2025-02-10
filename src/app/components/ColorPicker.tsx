"use client"
import { FC, ReactElement } from "react";
import { useDebounce } from "../Hooks";
import { Color, Option, Lens, SimpleLens, Some, None } from "../Utils";
import { Outcome, PickedColorState } from "../Game";
import { Div, Empty, Fold, Str } from "../basics";
import * as Basics from "../basics"

const withR: SimpleLens<Color, number> = Lens.property("r")
const withG: SimpleLens<Color, number> = Lens.property("g")
const withB: SimpleLens<Color, number> = Lens.property("b")

export type ColorPicker<A> = {
  ColorPicker: (
    disabledWith: Option<{ actual: Color, outcome: Outcome }>,
    { PickedColor }: PickedColorState,
  ) => A,
}
export const ColorPicker: FC<{
  disabledWith: Option<{
    actual: Color;
    outcome: Outcome;
  }>,
  state: PickedColorState,
}> = ({disabledWith,state}) =>
  ColorPickerFT(disabledWith,state)({
    ...Basics.Elements.basic,
    ...Elements.ghostSlider,
    ...Elements.colorSlider,
  })
export const ColorPickerFT = (
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

type ColorSlider<A> = {
  ColorSlider: (
    disabled: boolean,
    onChange: (m: number) => void,
    child: A,
  ) => A,
}

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
namespace Elements {
  export const ghostSlider: GhostSlider<ReactElement> = {
    GhostSlider: value => <GhostSlider value={value}/>,
  }
  export const colorSlider: ColorSlider<ReactElement> = {
    ColorSlider: (disabled, onChange, child) =>
      <ColorSlider disabled={disabled} onChange={onChange} child={child}/>,
  }
}