import { FC } from "react"
import styles from "./styles.module.scss"
import { Slider } from '@base-ui-components/react/slider';

export const SliderTemplate: FC<{
  disabled: boolean,
  defaultValue: number,
  className: string,
  color: 'red' | 'green' | 'blue';
  onValueChange: (n: number) => void,
}> = ({disabled,color,className,defaultValue,onValueChange}) =>
  <Slider.Root
    className={`${className}`}
    disabled={disabled}
    min={0}
    max={255}
    defaultValue={defaultValue}
    onValueChange={x => onValueChange(Array.isArray(x) ? x[0]! : x)}
  >
    <Slider.Control className={styles["Control"]!}>
      <Slider.Track className={styles["Track"]!}>
        <Slider.Indicator
          className={styles["Indicator"]!}
          style={{ backgroundColor:
            disabled
            ? `color-mix(in srgb, ${color}, grey 50%)`
            : color
          }}
        />
        <Slider.Thumb
          className={
            `${styles["Thumb"]!}\
            \ ${disabled ? styles["disabled"]! : ''}`
          }
          disabled={disabled}
        >
        <Slider.Value className={styles["Value"]!}/>
        </Slider.Thumb>
      </Slider.Track>
    </Slider.Control>
  </Slider.Root>

