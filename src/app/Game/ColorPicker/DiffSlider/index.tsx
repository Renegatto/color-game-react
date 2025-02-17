import { FC } from "react"
import styles from "./styles.module.scss"
import { Slider } from '@base-ui-components/react/slider';

export const DiffSlider: FC<{
  actual: number,
  picked: number,
  className: string,
  color: 'red' | 'green' | 'blue';
}> = ({color,className,actual,picked}) => {

  const values = [
    Math.min(picked,actual),
    Math.max(picked,actual),
  ]

  const actualFirst = actual <= picked

  const actualThumb =
    <Slider.Thumb
      className={styled(["Thumb","actual"])}
      disabled={true}
    >
      <Slider.Value
        className={styled(['Value','actual'])}
        children={(values) =>
          <>{actualFirst ? values[0]! : values[1]!}</>
        }
      />
    </Slider.Thumb>
  const pickedThumb =
    <Slider.Thumb
      className={styled(["Thumb", "picked"])}
      disabled={true}
    >
      <Slider.Value
        className={styled(['Value','picked'])}
        children={(values) =>
          <>{actualFirst ? values[1]! : values[0]!}</>
        }
      />
    </Slider.Thumb>
  return <Slider.Root
    className={`${className}`}
    disabled={true}
    min={0}
    max={255}
    value={values.map(x => x)}
  >
    <Slider.Control className={styles["Control"]!}>
      <Slider.Track className={styles["Track"]!}>
        <Slider.Indicator
          className={styles["Indicator"]!}
          style={{ backgroundColor:
            `color-mix(in srgb, ${color}, grey 50%)`
          }}
        />
        {actualFirst
          ? <>{actualThumb}{pickedThumb}</>
          : <>{pickedThumb}{actualThumb}</>
        }
      </Slider.Track>
    </Slider.Control>
  </Slider.Root>
}
const styled = (stylesToPick: readonly string[]): string | never => {
  return stylesToPick.map(style => {
    const styleName = styles[style]
    if (styleName == undefined) throw new Error(`Style is missing: ${style}`)
    return styleName
  }).join(' ')
}