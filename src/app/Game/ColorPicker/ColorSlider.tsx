import { FC, ReactElement } from "react"
import { Exhibit, useDebounce, useExhibitedState } from "../../Hooks"
import { PickedColorState } from ".."
import { RGBComponentLens } from "."
import styles from "./styles.module.scss"
import { SliderTemplate } from "./Slider"

export type ColorSlider<S,A> = {
  ColorSlider: (
    disabled: boolean,
    whoami: RGBComponentLens<string>,
    state: S,
  ) => A,
}

type ColorSliderProps<S> = {
  disabled: boolean,
 // child: (current: number) => ReactElement,
  color: 'red' | 'green' | 'blue',
  state: S,
}

const ColorSlider: FC<ColorSliderProps<{exhibit: Exhibit<number>}>> =
  ({ disabled, state: {exhibit},color }) => {

  const [component,setComponent] = useExhibitedState(125, exhibit)
  const debounce = useDebounce(10)
  return <>
    <div className={`${styles["slidecontainer"]} ${styles["normal"]}`}>
      
      <SliderTemplate
        disabled={disabled}
        defaultValue={component}
        onValueChange={
          n => debounce(() => {
            console.log("set ",n)
            setComponent(n)
          })
        }
        className={styles["slider"]!}
        color={color}
      />
    </div>
  </>
}
type RGBColor = 'red' | 'green' | 'blue'
export const colorSlider: ColorSlider<PickedColorState,ReactElement> = {
  ColorSlider: (disabled, whoami, {PickedColor}) =>
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
      color={whoami<RGBColor,RGBColor>().get({
        r: 'red',
        g: 'green',
        b: 'blue',
      })}
    />,
}