import { FC, ReactElement } from "react"
import { DifficultyState } from ".."
import { Slider } from "@base-ui-components/react/slider"
import styles from "./styles.module.scss"

export type DifficultyPicker<S,A> = {
  DifficultyPicker: (props: { state: S }) => A,
}

const DifficultyPicker: FC<{state: DifficultyState}> =
  ({state}) =>
    <SliderTemplate
      disabled={false}
      defaultValue={state.Difficulty.exhibit.default}
      className={styles["slider"]!}
      onValueChange={state.Difficulty.exhibit.reportBack} 
    />

export const difficultyPicker: DifficultyPicker<DifficultyState,ReactElement> ={
  DifficultyPicker: ({state}) =>
    <DifficultyPicker state={state}/>
}

export const SliderTemplate: FC<{
  disabled: boolean,
  defaultValue: number,
  className: string,
  onValueChange: (n: number) => void,
}> = ({disabled,className,defaultValue,onValueChange}) =>
  <Slider.Root
    className={`${className}`}
    disabled={disabled}
    min={0}
    max={127}
    defaultValue={defaultValue}
    onValueChange={x => onValueChange(Array.isArray(x) ? x[0]! : x)}
  >
    <Slider.Control className={styles["Control"]!}>
      <Slider.Track className={styles["Track"]!}>
        <Slider.Indicator
          className={styles["Indicator"]!}
        />
        <Slider.Thumb
          className={styles["Thumb"]!}
          disabled={disabled}
        >
        <Slider.Value className={styles["Value"]!}/>
        </Slider.Thumb>
      </Slider.Track>
    </Slider.Control>
  </Slider.Root>

