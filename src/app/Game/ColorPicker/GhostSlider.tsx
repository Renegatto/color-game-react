import { FC, ReactElement } from "react"
import {Option} from "../../Utils"
import styles from "./styles.module.scss"

export type GhostSlider<A> = {
  GhostSlider: (
    value: Option<number>,
    child: (n: number) => A,
  ) => A,
}
type GhostSliderProps = {
  value: Option<number>,
  child: (n: number) => ReactElement,
}
export const GhostSlider: FC<GhostSliderProps> = ({ value, child }) =>
  <>
    <div className={`${styles["slidecontainer"]} ${styles["ghost"]}`}>
      <div>
        { value.match({
            none: <></>,
            some: n => child(n)
          })
        }
      </div>
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
        className={`${styles["slider"]} ${styles["ghost"]}`}
      />
    </div>
  </>

export const ghostSlider: GhostSlider<ReactElement> = {
  GhostSlider: (value,child) => <GhostSlider value={value} child={child}/>,
}