
export type Color = { r: number, g: number, b: number }

export type Current<T extends {[key in string]: State<any>}> = {
  [key in keyof T]: { current: T[key]["current"] }
}
export type Update<T extends {[key in string]: State<any>}> = {
  [key in keyof T]: { update: T[key]["update"] }
}
export type State<T> = {
  current: T;
  update: (updated: () => T) => void,
}
export const makeState = <T,>(current: T, update: (x: () => T) => void): State<T> =>
  ({ current, update })

export const eachIsClose = (maxDifference: number, color1: Color, color2: Color): [boolean, number] => {
  const differences = [
    color1.r - color2.r,
    color1.g - color2.g,
    color1.b - color2.b,
  ].map(Math.abs)
  return [
    differences.every(diff => diff <= maxDifference),
    differences.sort((a,b) => b - a)[0]!
  ]
}

export const colorToCode = ({r,g,b}: Color): string => {
  const toHex = (x: number) => x.toString(16).padStart(2,'0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export const randomColor = (): Color => {
  const randomComponent = (): number => Math.floor(Math.random() * 0xFF)
  return {
    r: randomComponent(),
    g: randomComponent(),
    b: randomComponent(),
  }
}

type OptionAlg<in out B, in out A> = {
  none: A,
  some(x: B): A,
}
export type Option<in out A> = {
  match: <C>(alg: OptionAlg<A,C>) => C
}
export const Some = <A>(x: A): Option<A> =>
  ({ match: alg => alg.some(x) })
export const None = <T>(): Option<T> => ({ match: alg => alg.none })

export type Lens<S,A> = {
  get: (s: S) => A,
  modify: (s: S, a: A) => S,
}
export const lens = <S,A>(
  get: (s: S) => A,
  modify: (s: S,a: A) => S,
): Lens<S,A> =>
  ({get,modify})