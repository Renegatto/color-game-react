import { Div } from "@/app/basics"
import { Color, colorToCode } from "@/app/Utils"
import { FC, ReactElement } from "react"
import * as Basics from "../../basics"

export type ColoredBackground<A> = {
  ColoredBackground: (color: Color, child: A) => A,
}
const ColoredBackground: FC<{color: Color,child: ReactElement}> =
  ({color,child}) => ColoredBackgroundFT(color,child)(Basics.Elements.basic)

export const ColoredBackgroundFT =
  <A,>(color: Color, child: A) =>
  (alg: Div<A>): A =>
  alg.div( {
    className: "colored-background background",
    style: {backgroundColor: colorToCode(color)},
  })
  ([child])

export const coloredBackground: ColoredBackground<ReactElement> = {
  ColoredBackground: (color,child) =>
  <ColoredBackground color={color} child={child}/>
}