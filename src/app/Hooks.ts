import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react"

export type Exhibit<A> =
  (initial: A, update: Dispatch<SetStateAction<A>>) =>
    Dispatch<SetStateAction<A>>

export const usePeek = <A,>(initial: A): {
  peek: (use: (a: A) => void) => void,
  exhibit: Exhibit<A>,
} => {
  const ref = useRef(initial)
  const exhibit = useCallback((setState: Dispatch<SetStateAction<A>>): Dispatch<SetStateAction<A>> => f => {
    
    setState(old => {
      const s1 = typeof f != 'function' ? f : (f as any)(old)
      ref.current = s1
      return s1
    })
  },[])
  const initAndExhibit: Exhibit<A> = useCallback((initial: A, set) => {
    useEffect(() => {ref.current = initial},[])
    return exhibit(set) 
  },[])
  const peek = useCallback((cont: (a: A) => void) =>
    cont(ref.current),
    [],
  )
  return {
    exhibit: initAndExhibit,
    peek,
  }
}

export const compose = <A,B,C>(g: (b: B) => C, f: (a: A) => B) => (a: A): C =>
  g(f(a))

export const useExhibitedState = <A,>(
  initial: A,
  exhibit: Exhibit<A>,
): [A,Dispatch<SetStateAction<A>>] => {
  const [s,setS] = useState(initial)
  const setSExhibited = useCallback(exhibit(initial,setS),[setS])
  return [s,setSExhibited]
}
/*

    */
export const useDebounce = (delayMs: number): ((cont: () => void) => void) => {
  const [{cancel},setCancel] = useState({cancel: () => {}})
  const updateWithDelay = useCallback((cont: () => void): void => {
    cancel()
    const timeout = setTimeout(
      () => {
        setCancel({ cancel: () => {} })
        cont()
      },
      delayMs
    )
    setCancel({ cancel: () => clearTimeout(timeout) })
  },[])
  return updateWithDelay
}
