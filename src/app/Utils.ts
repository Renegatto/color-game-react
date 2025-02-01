
export type Color = { r: number, g: number, b: number }

export type Current<T extends { [key in string]: State<any> }> = {
  [key in keyof T]: { current: T[key]["current"] }
}
export type Update<T extends { [key in string]: State<any> }> = {
  [key in keyof T]: { update: T[key]["update"] }
}
export type State<T> = {
  current: T;
  update: (updated: () => T) => void,
}
export const State = <T,>(current: T, update: (x: () => T) => void): State<T> =>
  ({ current, update })

export const eachIsClose = (maxDifference: number, color1: Color, color2: Color): [boolean, number] => {
  const differences = [
    color1.r - color2.r,
    color1.g - color2.g,
    color1.b - color2.b,
  ].map(Math.abs)
  return [
    differences.every(diff => diff <= maxDifference),
    differences.sort((a, b) => b - a)[0]!
  ]
}

export const colorToCode = ({ r, g, b }: Color): string => {
  const toHex = (x: number) => x.toString(16).padStart(2, '0')
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
  match: <C>(alg: OptionAlg<A, C>) => C
}
export const Some = <A>(x: A): Option<A> =>
  ({ match: alg => alg.some(x) })
export const None = <T>(): Option<T> =>
  ({ match: alg => alg.none })

// Lenses

/* Lens<S,T,A,B> is a way to access internals of S which is of a type A.
  Outer:
  S - is a 'whole' object
  T - is S after it's A has changed to B
  Inner:
  A - is a part of S the lens targets
  B - is an altered A which if being put in S instead of A produces T

  Another view on this:
  S - outer before
  T - outer after
  A - inner before
  B - inner after
*/
export type Lens<S, T, A, B> = {
  get: (s: S) => A,
  modify: (s: S, a: B) => T,
}

export type SimpleLens<S, A> = Lens<S, S, A, A>

export namespace Lens {
  export const compose =
    <S,A,T = S,B = A>(g: Lens<S,T,A,B>) =>
    <A1,B1 = A1>(f: Lens<A,B,A1,B1>): Lens<S,T,A1,B1> => ({
      get: s => f.get(g.get(s)),
      modify: (s,b1) => g.modify(s,f.modify(g.get(s),b1)) 
    })
  export const lens = <S, T, A, B>(
    get: (s: S) => A,
    modify: (s: S, a: B) => T,
  ): Lens<S, T, A, B> => ({ get, modify })

  export const over = <S, T, A, B>(
    lens: Lens<S, T, A, B>,
    f: (a: A) => B,
  ) => (s: S): T => lens.modify(s, f(lens.get(s)))

  // make lens for a certain object property
  export const property =
    <S,
      B,
      K extends keyof S,
    >(key: K): Lens<S, Omit<S, K> & { [k in K]: B }, S[K], B> =>
      lens(
        s => s[key],
        (s, b) => {
          const q: Omit<S, K> = { ...s, [key]: undefined }
          return { ...q, ...({ [key]: b } as { [k in K]: B }) }
        }
      )
}
