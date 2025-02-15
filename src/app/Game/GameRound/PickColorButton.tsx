import { FC } from "react"

export type PickColorButton<A> = {
  PickColorButton: (onPickColor: () => void) => A,
}
export const PickColorButton: FC<{ onPickColor: () => void }> = ({onPickColor}) =>
  <button
    className="game bottom-block submit-btn"
    type="button"
    onClick={onPickColor}
  >
    Pick
  </button>
