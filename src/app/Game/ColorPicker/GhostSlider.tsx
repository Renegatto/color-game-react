import { FC, ReactElement } from "react"
import {Option} from "../../Utils"
import styles from "./styles.module.scss"
import { DiffSlider } from "./DiffSlider"

export type Diff<A> = {
  Diff: (
    value: Option<{actual: number, picked: number}>,
    color: 'red' | 'green' | 'blue',
  ) => A,
}
type GhostSliderProps = {
  value: Option<number>,
  child: (n: number) => ReactElement,
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
// export const GhostSlider: FC<GhostSliderProps> = ({ value, child }) =>
//   <>
//     <div className={`${styles["slidecontainer"]} ${styles["ghost"]}`}>
//       <div>
//         { value.match({
//             none: <></>,
//             some: n => child(n)
//           })
//         }
//       </div>
//       <input
//         type="range"
//         disabled={true}
//         style={{
//           visibility: value.match({
//             none: "hidden",
//             some: _ => undefined
//           })
//         }}
//         min="0"
//         max="255"
//         value={value.match({ some: x => x, none: -1 })}
//         className={`${styles["slider"]} ${styles["ghost"]}`}
//       />
//     </div>
//   </>

// export const ghostSlider: GhostSlider<ReactElement> = {
//   GhostSlider: (value,child) => <GhostSlider value={value} child={child}/>,
// }
