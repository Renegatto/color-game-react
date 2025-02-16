"use client"
import { FC, ReactElement } from "react";
import { Color, Option, Lens, Some, None } from "../../Utils";
import { Outcome, PickedColorState } from "..";
import { Div, Empty, Fold, Str } from "../../basics";
import * as Basics from "../../basics"
import { ColorSlider, colorSlider } from "./ColorSlider";
import { diff, Diff } from "./GhostSlider";

type RGB<A> = { r: A, g: A, b: A }
export type RGBComponentLens<C extends string> = <A,B>() =>
  Lens<RGB<A>, Omit<RGB<A>, C> & { [key in C]: B; }, A, B>

const withR: RGBComponentLens<'r'> = () =>
  Lens.property("r")
const withG: RGBComponentLens<'g'> = () =>
  Lens.property("g")
const withB: RGBComponentLens<'b'> = () =>
  Lens.property("b")

const colorName = (component: RGBComponentLens<'r' | 'g' | 'b'>): 'red' | 'green' | 'blue' =>
  component<'red' | 'green' | 'blue','red' | 'green' | 'blue'>().get({
    r: "red",
    g: "green",
    b: "blue",
  })

export type ColorPicker<S,A> = {
  ColorPicker: (
    props: {
      disabledWith: Option<{ actual: Color, picked: Color, outcome: Outcome }>,
      state: S,
    },
  ) => A,
}
type ColorPickerProps = {
  disabledWith: Option<{actual: Color, picked: Color, outcome: Outcome}>,
  state: PickedColorState,
}
export const ColorPicker: FC<ColorPickerProps> = (
  props: ColorPickerProps
) =>
  ColorPickerFT(props.disabledWith,props.state)({
    ...Basics.Elements.basic,
    ...colorSlider,
    ...diff,
  })

export const ColorPickerFT = <S,>(
    disabledWith: Option<{ actual: Color, picked: Color, outcome: Outcome }>,
    state: S,
  ) =>
  <A,>(alg: Div<A> & Str<A> & Empty<A> & Fold<A> & ColorSlider<S,A> & Diff<A>): A => {

  const disabled = disabledWith.match({
    some: () => true,
    none: false
  })
  const drawDiff = (component: RGBComponentLens<'r' | 'g' | 'b'>): A =>
    alg.Diff(
      disabledWith.match({
      none: None(),
      some: ({ actual, picked }) => Some({
          actual:
            component<number,number>().get(actual),
          picked:
            component<number,number>().get(picked),
        }),
      }),
      colorName(component),
    )
  const drawColorSlider = (
    component: RGBComponentLens<'r' | 'g' | 'b'>,
  ): A =>
    alg.ColorSlider(
      disabled,
      component,
      state,
    );

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
    ...[withR,withG,withB].map(
      component => disabled
      ? drawDiff(component)
      : drawColorSlider(component)
    ),
    whenDisabled(overlayOnDisabled),
  ])
}

export const colorPicker: ColorPicker<PickedColorState,ReactElement> = {
  ColorPicker: ({disabledWith,state}) => <ColorPicker disabledWith={disabledWith} state={state}/>
}