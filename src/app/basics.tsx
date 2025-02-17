import { createElement, DetailedHTMLProps, HTMLAttributes, InputHTMLAttributes, ReactElement } from "react"
import * as React from "react"
import * as Hooks from "./Hooks"

export type Div<in out A> = {
  div(attrs: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>): (childs: A[]) => A,
}
export type Str<in out A> = {
  str(text: string): A,
}
export type Empty<in out A> = {
  empty: A,
}
export type Fold<in out A> = {
  fold: (elems: A[]) => A,
}
export type UseDebounce<in out A> = {
  useDebounce: (
    delayMs: number,
    cont: (debounce: (delayed: () => void) => void) => A
    ) => A,
}
export type Input<in out A> = {
  input: (attrs: InputHTMLAttributes<HTMLInputElement>) => A
}

export type UseState<in out A> = {
  useState: <S>(
    initialState: S | (() => S),
    andThen: (state: [S, (s: (() => S) | S | ((s0:S) => S)) => void]) => A,
  ) => A,
}
export type UseEffect<in out A> = {
  useEffect: (
    effect: () => void,
    onChangeOf: any[],
    andThen: () => A,
  ) => A,
}

export type UsePeek<A> = {
  usePeek: <S>(
    initial: S,
    cont: (state: {peek: (cont: (s: S) => void) => void, exhibit: Hooks.Exhibit<S>}) => A,
  ) => A,
}

export type UseExhibitedState<A> = {
  useExhibitedState: <B>(
    exhibit: Hooks.Exhibit<B>,
    cont: (state: [B,React.Dispatch<React.SetStateAction<B>>]) => A
  ) => A,
}

export type Basics<A> = 
  & Div<A>
  & Str<A>
  & Empty<A>
  & Fold<A>
  & UseDebounce<A>
  & Input<A>

export namespace Elements {
  export const div: Div<ReactElement> = {
    div: props => childs =>
      createElement('div',props,fold.fold(childs)),
  }
  export const str: Str<ReactElement> = {
    str: text => <>{text}</>,
  }
  export const empty: Empty<ReactElement> ={
    empty: <></>,
  }
  export const fold: Fold<ReactElement> = {
    fold: childs => childs.reduce(
      (acc,x) => <>{acc}{x}</>,
      <></>,
      ),
  }
  export const useDebounce: UseDebounce<ReactElement> = {
    useDebounce: (ms,cont) => {
      const debounce = Hooks.useDebounce(ms)
      return cont(debounce)
    }
  }
  export const useEffect: UseEffect<ReactElement> = {
    useEffect: (effect,deps,cont) => {
      React.useEffect(effect,deps)
      return cont()
    }
  }
  export const useState: UseState<ReactElement> = {
    useState: (initial,cont) => {
      const s = React.useState(initial)
      return cont(s)
    }
  }
  export const usePeek: UsePeek<ReactElement> = {
    usePeek: (initial,cont) => cont(Hooks.usePeek(initial))
  }
  export const input: Input<ReactElement> = {
    input: props => createElement('input',props)
  }

  export const basic: Basics<ReactElement> = {
    ...div,
    ...str,
    ...empty,
    ...fold,
    ...input,
    ...useDebounce,
  }
}

export namespace StringSchema {
  const foldText = (xs: string[]): string =>
    xs.reduce((a,b) => `${a}${b}`,'')
  export const schema: Basics<string> = {
    div: props => childs =>
      `[div props='${JSON.stringify(props)}']${
        foldText(childs)
      }[end div]`,
    str: text => `'${text}'`,
    empty: '',
    fold: foldText,
    useDebounce: (ms, cont) =>
      `[useDebounce ${ms}]${ cont(_ => {}) }[end useDebounce]`,
    input: props => `[input props=${JSON.stringify(props)}]`,
  }
}