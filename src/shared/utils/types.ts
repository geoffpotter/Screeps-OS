export type constructorTypeOf<T = any> = new (...args: any[]) => T;
export type AnIdConstructorTypeOf<T = any> = new (id: string, ...args: any[]) => T;
export type OmitFirstArg<F> = F extends new (x: any, ...args: infer P) => infer R ? new (...args: P) => R : never;

export type StaticImplements<I extends new (...args: any[]) => any, C extends I> = InstanceType<I>;

export type ConstructorWrappingFunction<ConstructorType extends AnIdConstructorTypeOf> = (constructor: ConstructorType, id: string, ...args: ConstructorParameters<OmitFirstArg<ConstructorType>>) => InstanceType<ConstructorType>
