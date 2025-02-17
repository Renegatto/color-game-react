import { Dispatch, SetStateAction, useCallback, useRef, useState } from "react"

export type Exhibit<A> = {
  reportBack: (a: A) => void,
  default: A,
  // (initial: A, update: Dispatch<SetStateAction<A>>) =>
  //   Dispatch<SetStateAction<A>>
}
export const usePeek = <A,>(initial: A): {
  peek: (use: (a: A) => void) => void,
  exhibit: Exhibit<A>,
} => {
  const ref = useRef(initial)

  // const initAndExhibit: Exhibit<A> = useCallback((initial: A, set) => {
  //   useEffect(() => {
  //     ref.current = initial
  //     console.log('put initial state')
  //   },[])
  //   return exhibit(set) 
  // },[])
  const reportBack = useCallback((a: A)=> ref.current = a,[])
  const peek = useCallback((cont: (a: A) => void) =>
    cont(ref.current),
    [],
  )
  return {
    exhibit: {reportBack,default: initial}, //initAndExhibit,
    peek,
  }
}

export const compose = <A,B,C>(g: (b: B) => C, f: (a: A) => B) => (a: A): C =>
  g(f(a))

export const useExhibitedState = <A,>(
  exhibit: Exhibit<A>,
): [A,Dispatch<SetStateAction<A>>] => {
  const [s,setS] = useState(exhibit.default)
  const doExhibit = (setState: Dispatch<SetStateAction<A>>): Dispatch<SetStateAction<A>> => f => {
    setState(old => {
      const s1 = typeof f != 'function' ? f : (f as any)(old)
      exhibit.reportBack(s1)
      return s1
    })
  }
  // once
  // useEffect(() => {
  //   exhibit.reportBack(initial)
  // },[])
  const setSExhibited = useCallback(doExhibit(setS),[setS])
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
