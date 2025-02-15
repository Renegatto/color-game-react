import { Color, colorToCode } from "@/app/Utils"
import { FC, ReactElement } from "react"
import { coloredBackground, ColoredBackground } from "./ColoredBackground"
import { Div, Fold, Str } from "@/app/basics"
import * as Basics from "../../basics"

export type ColorsComparison<A> = {
  ColorsComparison: (actual: Color, picked: Color) => A,
}
const ColorsComparison: FC<{actual: Color,picked: Color}> =
  ({actual,picked}) => ColorsComparisonFT(actual,picked)({
    ...Basics.Elements.basic,
    ...coloredBackground,
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

export const colorsComparison: ColorsComparison<ReactElement> = {
  ColorsComparison: (actual,picked) =>
    <ColorsComparison actual={actual} picked={picked}/>
}