import { FC, ReactElement } from "react"
import {Option} from "../../Utils"

export type GhostSlider<A> = {
  GhostSlider: (value: Option<number>) => A,
}
export const GhostSlider: FC<{ value: Option<number> }> = ({ value }) =>
  <>
    <div className="slidecontainer ghost">
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
        className="slider ghost"
      />
    </div>
  </>

export const ghostSlider: GhostSlider<ReactElement> = {
  GhostSlider: value => <GhostSlider value={value}/>,
}