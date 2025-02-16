import { ReactElement } from "react"
import {Option} from "../../Utils"
import styles from "./styles.module.scss"
import { DiffSlider } from "./DiffSlider"

export type Diff<A> = {
  Diff: (
    value: Option<{actual: number, picked: number}>,
    color: 'red' | 'green' | 'blue',
  ) => A,
}

export const diff: Diff<ReactElement> = {
  Diff: (value,color) =>
    value.match({
      some: ({actual,picked}) =>
       <div className={`${styles["slidecontainer"]} ${styles["normal"]}`}>
          <DiffSlider
            actual={actual}
            picked={picked}
            color={color}
            className={styles["slider"]!}
          />
        </div>,
      none: <></>
    })
}