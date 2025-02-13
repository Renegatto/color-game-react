import { Dispatch, SetStateAction, useRef, useState } from "react"

export type Exhibit<A> =
  (update: Dispatch<SetStateAction<A>>) => Dispatch<SetStateAction<A>>

export const usePeek = <A,>(initial: Exclude<A,Function> ): {
  peek: () => A,
  exhibit: Exhibit<A>,
} => {
  const ref = useRef(initial)
  const exhibit = (setState: Dispatch<SetStateAction<A>>): Dispatch<SetStateAction<A>> => f => {
    setState(old => {
      const s1 = typeof f != 'function' ? f : (f as any)(old)
      ref.current = s1
      return s1
    })
  }
  return {
    exhibit,
    peek: () => ref.current,
  }
}

export const compose = <A,B,C>(g: (b: B) => C, f: (a: A) => B) => (a: A): C =>
  g(f(a))

export const useExhibitedState = <A,>(
  initial: A | (() => A),
  exhibit: Exhibit<A>,
): [A,Dispatch<SetStateAction<A>>] => {
  const [s,setS] = useState(initial)
  return [s,exhibit(setS)]
}
/*

    */
export const useDebounce = (delayMs: number): ((cont: () => void) => void) => {
  const [{cancel},setCancel] = useState({cancel: () => {}})
  const updateWithDelay = (cont: () => void): void => {
    cancel()
    const timeout = setTimeout(
      () => {
        setCancel({ cancel: () => {} })
        cont()
      },
      delayMs
    )
    setCancel({ cancel: () => clearTimeout(timeout) })
  }
  return updateWithDelay
}
