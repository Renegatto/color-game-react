import { FC, ReactElement } from "react"
import { Exhibit, useDebounce, useExhibitedState } from "../Hooks"
import { PickedColorState } from "../Game"
import { RGBComponentLens } from "."

export type ColorSlider<S,A> = {
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