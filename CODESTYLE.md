
## Complex datatypes representation

### Algebras
Complex sum datatypes structures are represented as algebras.
For example the algebra for a datatype representing "either number, or number and string, or both" can be represented as:
```ts
type ThemAlgebra<in out A, in out B, in out T> = {
  this(a: A): T,
  that(b: B): T,
  these(a: A, b: B): T,
}
```
Functions that are intended to return a type, may simply return an algebra instead. This may be done for both performance and simplicity reasons.
For instance, instead of returning `Them` here just to match it:
```ts
// 'These' means they are equal
const compare =
  (x: number, y: number): Them<number,number> =>
    x > y
      ? This(x)
      : x < y ? That(y) : These(x,y)

compare(n,m).match({
  this: a => console.log("n is greater")
  that: b => console.log("m is greater")
  these: (a,b) => console.log("n and m are equal")
})
```
We may just use it directly:
```ts
// 'These' means they are equal
const compare =
  (x: number, y: number) =>
  <A>(alg: ThemAlgebra<number,number,A>): A =>
    x > y
      ? alg.this(x)
      : x < y ? alg.that(y) : alg.these(x,y)

compare(n,m)({
  this: a => console.log("n is greater")
  that: b => console.log("m is greater")
  these: (a,b) => console.log("n and m are equal")
})
```

### Datatypes
If we need to store or pass data around, we make datatype from our algebra:
```ts
type Them<in out A, in out B> = {
  match: <C>(alg: ThemAlgebra<A,B,C>) => C
}
```
The function in the match field is a *Church-encoded* datatype we originally had in mind.

Note that it is an object.
This is because some TS libraries are not respectful to functions and may treat this function as a lazy value, and call it unexpectedly.
For instance `useState` accept initial state as either pure lazy value `() => T` or a plain value `T`.
For instance here:
```ts
const [n,setN] = useState<() => number>(() => 33)
```
`n` is actually of type `number`, but TS thinks it's `() => number`.
To disallow this class of errors we wrap the function in an object.

#### Necessity of variance annotations

Notice also an invariance annotations on type parameters.
This is necessary to enforce TS typechecking be respectful to a types we provide. It's type system is prone to misinfer variance, as the result TS may incorrectly type code and allow runtime errors. This is no surprise as we know that TS type system is *unsound* and doesn't even claim to be.

For example, here is a perfectly valid, hackless ts code:
```ts
type WrapperAlg<B,A> = { val(x: B): A }

export type Wrapper<A> = {
  match: <C>(alg: WrapperAlg<A, C>) => C
}
```
And here we absolutely legally make ts crash:
```ts
const emptyObjectWrapper: Wrapper<{}> = {
  match: alg => alg.val({})
} 
const mistypedWrapper: Wrapper<{str: string}> =
  emptyObjectWrapper

const gonnaCrash: string =
  mistypedWrapper.match({val: x => x}).str
  // here we take property 'str' of undefined
  // which will cause runtime error
```
Making type parameters invariant fixes the issue:
```ts
type WrapperAlg<in out B, in out A> = { val(x: B): A }

export type Wrapper<in out A> = {
  match: <C>(alg: WrapperAlg<A, C>) => C
}
```