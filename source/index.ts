type LiteralOrSuperType = boolean | number | string | bigint
type Literal = null | undefined | LiteralOrSuperType
type LiteralOrNever<T> =
    T extends (null | undefined) ? T :
    T extends LiteralOrSuperType ? LiteralOrSuperType extends T ? never : T :
    never

interface StringSchema {
    readonly kind: "string"
}
interface NumberSchema {
    readonly kind: "number"
}
interface LiteralSchema {
    readonly kind: "literal"
    readonly value: Literal
}
interface UnknownSchema {
    readonly kind: "unknown"
}
interface PropertySchema {
    readonly valueSchema: ValueSchema
}
interface PropertiesSchema {
    readonly kind: "properties"
    readonly propertySchemas: ReadonlyMap<string, PropertySchema>
}
interface UnionSchema {
    readonly kind: "union"
    readonly schemas: readonly ValueSchema[]
}
interface IntersectionSchema {
    readonly kind: "intersection"
    readonly schemas: readonly ValueSchema[]
}
type ValueSchema =
    | UnknownSchema
    | LiteralSchema
    | StringSchema
    | NumberSchema
    | PropertiesSchema
    | UnionSchema
    | IntersectionSchema

interface ValidationResult {
    path: Array<string | number>
    schema: ValueSchema
    actualValue: unknown
}
const appendPath = (path: readonly (string | number)[], result: unknown[]) => {
    result.push("$")
    path.forEach(x => {
        switch (typeof x) {
            case "string": result.push(".", x); break
            case "number": result.push("[", String(x), "]"); break
        }
    })
}
const appendValidationErrorMessage = ({ schema, actualValue, path }: ValidationResult, result: unknown[]) => {
    result.push("expected type: `"); appendType(schema, result); result.push("`\n")
    result.push("actual value: ", JSON.stringify(actualValue), "\n")
    result.push("at: "); appendPath(path, result); result.push("\n")
}
export const showValidationErrorMessage = (result: ValidationResult[]): string => {
    const buffer: unknown[] = []
    result.forEach(e => appendValidationErrorMessage(e, buffer))
    return buffer.join("")
}
class ValidationError extends Error {
    constructor (public errors: ValidationResult[]) {
        super(showValidationErrorMessage(errors))
    }
}
export type SchemaTarget<T> = T extends Schema<infer X> ? X : never
const identifierRegex = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/

const appendType = (schema: ValueSchema, result: unknown[]) => {
    switch (schema.kind) {
        case "unknown": return result.push("unknown")
        case "string": return result.push("string")
        case "number": return result.push("number")
        case "literal": {
            const { value } = schema
            switch (value) {
                case null: return result.push("null")
                case undefined: return result.push("undefined")
                default:
                    switch (typeof value) {
                        case "bigint": return result.push(value, "n")
                        case "boolean":
                        case "number": return result.push(value)
                        case "string": return result.push(JSON.stringify(value))
                    }
            }
        }
        case "properties": {
            result.push("{ ")
            const { propertySchemas } = schema
            let count = 0
            for (const [k, v] of propertySchemas.entries()) {
                if (count++ != 0) { result.push("; ") }
                result.push(identifierRegex.test(k) ? k : JSON.stringify(k), ": ")
                appendType(v.valueSchema, result)
            }
            result.push(" }")
            return
        }
        case "union": {
            const { schemas } = schema
            if (schemas.length === 0) { return result.push("never") }
            appendType(schemas[0], result)
            for (let i = 1; i < schemas.length; i++) {
                result.push(" | ")
                appendType(schemas[i], result)
            }
            return
        }
        case "intersection": {
            const { schemas } = schema
            if (schemas.length === 0) { return result.push("unknown") }
            appendType(schemas[0], result)
            for (let i = 1; i < schemas.length; i++) {
                result.push(" & ")
                appendType(schemas[i], result)
            }
            return
        }
    }
}
class Schema<T> {
    _schema: ValueSchema
    constructor(schema: ValueSchema) { this._schema = schema }

    showType(): string {
        const result: unknown[] = []
        appendType(this._schema, result)
        return result.join("")
    }
    validate(x: unknown): ValidationResult[] | null {
        const validateBy = (schema: ValueSchema, path: (string | number)[], actualValue: unknown): ValidationResult[] | null => {
            switch (schema.kind) {
                case "unknown": return null
                case "literal":
                    if (actualValue === schema.value) { return null }
                    return [{ path, schema, actualValue }]

                case "string":
                    if (typeof actualValue === "string") { return null }
                    return [{ path, schema, actualValue }]

                case "number":
                    if (typeof actualValue === "number") { return null }
                    return [{ path, schema, actualValue }]

                case "properties": {
                    const { propertySchemas } = schema
                    for (const k of propertySchemas.keys()) {
                        let v: unknown
                        try { v = (actualValue as { [k: string]: unknown })[k] }
                        catch(_) { v = undefined }

                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        const valueSchema = propertySchemas.get(k)!.valueSchema
                        const r = validateBy(valueSchema, [...path, k], v)
                        if (r) { return r }
                    }
                    return null
                }
                case "union": {
                    const { schemas } = schema
                    const errors: ValidationResult[] = []
                    for (let i = 0; i < schemas.length; i++) {
                        const r = validateBy(schemas[i], path, actualValue)
                        if (r === null) { return null }

                        errors.push(...r)
                    }
                    return errors.length === 0 ? [{ path, schema, actualValue }] : errors
                }
                case "intersection": {
                    const { schemas } = schema
                    for (let i = 0; i < schemas.length; i++) {
                        const r = validateBy(schemas[i], path, actualValue)
                        if (r !== null) { return r }
                    }
                    return null
                }
            }
        }
        return validateBy(this._schema, [], x)
    }
    isAssignableFrom(x: unknown): x is T { return !this.validate(x) }
    assert(x: unknown): asserts x is T {
        const r = this.validate(x)
        if (r) { throw new ValidationError(r) }
    }
}

export const never = new Schema<never>({
    kind: "union",
    schemas: [],
})
export const string = new Schema<string>({
    kind: "string",
})
export const number = new Schema<number>({
    kind: "number",
})
export const unknown = new Schema<unknown>({
    kind: "unknown",
})

export const literal = <TLiteral>(value: LiteralOrNever<TLiteral>): Schema<typeof value> => {
    return new Schema({
        kind: "literal",
        value
    })
}
export const properties = <TObject extends { readonly [K in keyof TObject]: Schema<unknown> }>(keyAndValueSchemas: { readonly [K in keyof TObject]: TObject[K] }): Schema<{ [K in keyof TObject]: SchemaTarget<TObject[K]> }> => {
    const propertySchemas = new Map<string, PropertySchema>()
    Object.keys(keyAndValueSchemas).forEach(k =>
        propertySchemas.set(k, { valueSchema: keyAndValueSchemas[k as keyof TObject]._schema })
        )
    return new Schema({
        kind: "properties",
        propertySchemas,
    })
}
export const union = <TSchemas extends Schema<unknown>[]>(...schemas: TSchemas): Schema<SchemaTarget<TSchemas[number]>> => {
    switch (schemas.length) {
        case 0: return never as Schema<SchemaTarget<TSchemas[number]>>
        case 1: return schemas[0] as Schema<SchemaTarget<TSchemas[number]>>
        default:
            return new Schema({
                kind: "union",
                schemas: schemas.map(s => s._schema)
            })
    }
}

type ToParameter1s<TUnion> = TUnion extends unknown ? ((_: TUnion) => never) : never
type ToIntersection<TUnion> = ToParameter1s<TUnion> extends ((_: infer TContravariant) => never) ? TContravariant : never

export const intersection = <TSchemas extends Schema<unknown>[]>(...schemas: TSchemas): Schema<ToIntersection<SchemaTarget<TSchemas[number]>>> => {
    switch (schemas.length) {
        case 0: return unknown as Schema<ToIntersection<SchemaTarget<TSchemas[number]>>>
        case 1: return schemas[1] as Schema<ToIntersection<SchemaTarget<TSchemas[number]>>>
        default:
            return new Schema({
                kind: "intersection",
                schemas: schemas.map(s => s._schema)
            })
    }
}
