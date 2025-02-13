"use client"
import { FC, ReactElement } from "react";
import { Exhibit, useDebounce, useExhibitedState } from "../Hooks";
import { Color, Option, Lens, Some, None } from "../Utils";
import { Outcome, PickedColorState } from "../Game";
import { Div, Empty, Fold, Str } from "../basics";
import * as Basics from "../basics"

type RGB<A> = { r: A, g: A, b: A }
type RGBComponentLens<C extends string> = <A,B>() =>
  Lens<RGB<A>, Omit<RGB<A>, C> & { [key in C]: B; }, A, B>

const withR: RGBComponentLens<'r'> = () =>
  Lens.property("r")
const withG: RGBComponentLens<'g'> = () =>
  Lens.property("g")
const withB: RGBComponentLens<'b'> = () =>
  Lens.property("b")

export type ColorPicker<A> = {
  ColorPicker: (
    props: {disabledWith: Option<{ actual: Color, outcome: Outcome }>},
  ) => A,
}

export const ColorPickerFT = <S,>(
    disabledWith: Option<{ actual: Color, outcome: Outcome }>,
    state: S,
  ) =>
  <A,>(alg: Div<A> & Str<A> & Empty<A> & Fold<A> & ColorSlider<S,A> & GhostSlider<A>): A => {

  const disabled = disabledWith.match({
    some: () => true,
    none: false
  })
  const drawGhostSlider = (component: RGBComponentLens<'r' | 'g' | 'b'>): A =>
    alg.GhostSlider(disabledWith.match({
      none: None(),
      some: ({ actual }) => Some(component<number,number>().get(actual)),
    }))
  const drawColorSlider = (
    component: RGBComponentLens<'r' | 'g' | 'b'>,
    colorName: string,
  ): A =>
    alg.ColorSlider(
      disabled,
      component,
      n => alg.str(`${colorName}: ${n}`),
      state,
    );

  const drawSlidersPair = (
    component: RGBComponentLens<'r' | 'g' | 'b'>,
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
  console.log("color picker update")
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
export const GhostSlider: FC<{ value: Option<number> }> = ({ value }) =>
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

type ColorSlider<S,A> = {
  ColorSlider: (
    disabled: boolean,
    whoami: RGBComponentLens<string>,
    child: (current: number) => A,
    state: S,
  ) => A,
}

type ColorSliderProps<S> = {
  disabled: boolean,
  child: (current: number) => ReactElement,
  state: S,
}

const ColorSlider: FC<ColorSliderProps<{exhibit: Exhibit<number>}>> = ({ disabled, state: {exhibit}, child }) => {
  const [component,setComponent] = useExhibitedState(125, exhibit)
  const debounce = useDebounce(10)
  return <>
    <div className="slidecontainer normal">
      {child(component)}
      <input
        type="range"
        disabled={disabled}
        min="0"
        max="255"
        defaultValue={component}
        onChange={
          e => {
            const newValue = e.currentTarget.valueAsNumber
            debounce(() => setComponent(newValue))
          }
        }
        className={`slider ${disabled ? "disabled" : "normal"}`}
      />
    </div>
  </>
}
export namespace Elements {
  export const ColorPicker: FC<{
    disabledWith: Option<{actual: Color,outcome: Outcome}>,
    state: PickedColorState,
  }> = (
    props: {
      disabledWith: Option<{actual: Color,outcome: Outcome}>,
      state: PickedColorState,
    }
  ) =>
    ColorPickerFT(props.disabledWith,props.state)({
      ...Basics.Elements.basic,
      ...Elements.colorSlider,
      ...Elements.ghostSlider,
    })

  export const ghostSlider: GhostSlider<ReactElement> = {
    GhostSlider: value => <GhostSlider value={value}/>,
  }
  export const colorSlider: ColorSlider<PickedColorState,ReactElement> = {
    ColorSlider: (disabled, whoami, child, {PickedColor}) =>
      <ColorSlider
        disabled={disabled}
        state={{
          exhibit:
            whoami<Exhibit<number>,Exhibit<number>>().get({
              r: PickedColor.exhibitR,
              g: PickedColor.exhibitG,
              b: PickedColor.exhibitB,
            })
        }}
        child={child}
      />,
  }
}