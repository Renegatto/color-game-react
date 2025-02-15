import { FC } from "react"

export type RestartButton<A> = {
  RestartButton: (restartGame: () => void) => A,
}
export const RestartButton: FC<{ restartGame: () => void }> = ({restartGame}) =>
  <button
    className="game bottom-block reset-options reset-game-btn"
    type="button"
    onClick={restartGame}
  >
    Restart
  </button>