/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types */
import { parseRef } from "./ref"

type integer = number

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type typeWith<T, _TOptions extends {
    minimum?: number
    exclusiveMinimum?: boolean
    default?: unknown
    format?: string
    uniqueItems?: boolean
    dependencies?: string[]
}> = T
type positiveInteger = typeWith<integer, { minimum: 0 }>
type positiveIntegerDefault0 = positiveInteger | 0

export type SimpleTypes =
    | "array"
    | "boolean"
    | "integer"
    | "null"
    | "number"
    | "object"
    | "string"

export interface JsonSchema {
    id?: string
    $ref?: undefined
    $schema?: string
    title?: string
    description?: string
    default?: unknown
    multipleOf?: typeWith<number, {
        minimum: 0
        exclusiveMinimum: true
    }>
    maximum?: number
    exclusiveMaximum?: typeWith<boolean, { default: false, dependencies: ["maximum"] }>
    minimum?: number
    exclusiveMinimum?: typeWith<boolean, { default: false, dependencies: ["minimum"] }>
    maxLength?: positiveInteger
    minLength?: positiveIntegerDefault0
    pattern?: typeWith<string, { format: "regex" }>
    additionalItems?: typeWith<boolean | JsonSchemaOrRef, { default: {} }>
    items?: typeWith<JsonSchemaOrRef | JsonSchemaArray, { default: {} }>
    maxItems?: positiveInteger
    minItems?: positiveIntegerDefault0
    uniqueItems?: typeWith<boolean, { default: false }>
    maxProperties?: positiveInteger
    minProperties?: positiveIntegerDefault0
    required?: StringArray
    additionalProperties?: typeWith<boolean | JsonSchemaOrRef, { default: {} }>
    definitions?: typeWith<{ [key: string]: JsonSchemaOrRef }, { default: {} }>
    properties?: typeWith<{ [key: string]: JsonSchemaOrRef }, { default: {} }>
    patternProperties?: typeWith<{ [regex: string]: JsonSchemaOrRef }, { default: {} }>
    dependencies?: { [key: string]: JsonSchemaOrRef | StringArray }
    enum?: typeWith<readonly [unknown, ...unknown[]], { uniqueItems: true }>
    type?: SimpleTypes | typeWith<readonly [SimpleTypes, ...SimpleTypes[]], { uniqueItems: true }>
    format?: string
    allOf?: JsonSchemaArray
    anyOf?: JsonSchemaArray
    oneOf?: JsonSchemaArray
    not?: JsonSchemaOrRef
}
export interface JsonSchemaRef {
    $ref: string
    id?: string
}
export type JsonSchemaOrRef =
    | JsonSchema
    | JsonSchemaRef

export type JsonSchemaArray = readonly [JsonSchemaOrRef, ...JsonSchemaOrRef[]]
export type StringArray = typeWith<readonly [string, ...string[]], { uniqueItems: true }>

type Key = string
type Path = readonly Key[]

export interface Failure<TMessage extends string, TPath extends Path> {
    kind: "failure"
    message: TMessage
    path: TPath
}
export interface Success<T> {
    kind: "success"
    value: T
}
export type Result<T, TMessage extends string = string, TPath extends Path = Path> =
    | Success<T>
    | Failure<TMessage, TPath>

type cast<t, u> = t extends u ? t : never

type unionToIntersection<u> = (u extends any ? (_: u) => void : never) extends ((_: infer i) => void) ? i : never

/** @internal */
export type unionToTuple<u> =
    unionToIntersection<(u extends any ? (_: u) => u : never)> extends (_: never) => infer t ?
        [...unionToTuple<Exclude<u, t>>, t] :
    []

/** @internal */
export type tryDeepGet<t, path extends Path, pathLocation extends Path> =
    path extends readonly [infer key, ...infer restPath] ?
        key extends keyof t ?
            tryDeepGet<t[key], cast<restPath, Path>, pathLocation> :
        Failure<`'${cast<key, Key>}' was not found.`, pathLocation> :
    Success<t>

type getOrDefault<t, k, defaultType = undefined> =
    k extends keyof t ? t[k] : defaultType

export interface JsonSchemaFiles {
    readonly [filePath: string]: JsonSchema
}

/** @internal */
export interface ParseFileOptions {
    schemas: JsonSchemaFiles
    pathToDefinition: Path
    currentFileName: Key
}
interface ParseDefinitionOptions extends ParseFileOptions {
    definition: JsonSchema
}
type parseArrayDefinition<items extends JsonSchema["items"], options extends ParseDefinitionOptions> =

    // { type: "array", items: undefined }
    items extends undefined ?
        Success<unknown[]> :

    // { type: "array", items: { … } }
    items extends JsonSchemaOrRef ?
        parseDefinitionOrRef<
            items,
            options["schemas"],
            options["currentFileName"],
            [...options["pathToDefinition"], "items"]
        > extends infer result ?
            result extends Success<infer elementType> ?
                Success<elementType[]> :
            result :
        never :

    // { type: "array", items: [ … ] }
    Failure<`Not implemented.`, [...options["pathToDefinition"], "items"]>

type parseProperty<
    key extends string,
    propertyResult extends Result<unknown>,
    required extends JsonSchema["required"]
> =
    propertyResult extends Success<infer propertyType> ?

        // { properties: { key: …, … }, required: [ … ] }
        required extends readonly [string, ...string[]] ?

            // { properties: { key: …, … }, required: [ … "key", … ] }
            key extends required[number] ? Success<{ [k in key]: propertyType }> :

            Success<{ [k in key]: propertyType | undefined }> :

        Success<{ [k in key]: propertyType | undefined }> :

    propertyResult;

type tryIntersectTypes<results extends readonly Result<unknown>[]> =
    results extends readonly [infer headResult, ...infer restResults] ?
        headResult extends Success<infer headT> ?
            tryIntersectTypes<cast<restResults, readonly Result<unknown>[]>> extends infer restResult ?
                restResult extends Success<infer restT> ?
                    Success<headT & restT> :
                restResult :
            never :
        headResult :
    Success<unknown>;

type tryUnionTypes<results extends readonly Result<unknown>[]> =
    results extends readonly [infer headResult, ...infer restResults] ?
        headResult extends Success<infer headT> ?
            tryUnionTypes<cast<restResults, readonly Result<unknown>[]>> extends infer restResult ?
                restResult extends Success<infer restT> ?
                    Success<headT | restT> :
                restResult :
            never :
        headResult :
    Success<never>

type parseProperties<
    properties extends JsonSchema["properties"],
    keys extends readonly (keyof properties)[],
    options extends ParseDefinitionOptions
> =
    keys extends readonly [infer key, ...infer restKeys] ?
        parseDefinitionOrRef<
            properties[cast<key, keyof properties>],
            options["schemas"],
            options["currentFileName"],
            [...options["pathToDefinition"], "properties", cast<key, string>]
        > extends infer propertyType ?
            parseProperty<cast<key, string>, cast<propertyType, Result<unknown>>, getOrDefault<options["definition"], "required">> extends infer headResult ?
                headResult extends Success<infer headT> ?
                    parseProperties<properties, cast<restKeys, readonly (keyof properties)[]>, options> extends infer restResult ?
                        restResult extends Success<infer restT> ?
                            Success<headT & restT> :
                        restResult :
                    never :
                headResult :
            never :
        never :
    Success<object>

type parseObjectDefinition<
    properties extends JsonSchema["properties"],
    options extends ParseDefinitionOptions
> =
    properties extends undefined ? Success<object> :
    parseProperties<properties, cast<unionToTuple<keyof properties>, readonly (keyof properties)[]>, options>

interface parseSimpleType<options extends ParseDefinitionOptions> {
    boolean: Success<boolean>
    integer: Success<integer>
    null: Success<null>
    number: Success<number>
    string: Success<string>

    array: parseArrayDefinition<getOrDefault<options["definition"], "items">, options>
    object: parseObjectDefinition<getOrDefault<options["definition"], "properties">, options>
}

type parseSimpleTypesToUnion<types extends readonly SimpleTypes[], options extends ParseDefinitionOptions> =
    types extends readonly [infer headType, ...infer restType] ?
        parseSimpleType<options>[cast<headType, SimpleTypes>] extends infer r1 ?
            r1 extends Success<infer t1> ?
                parseSimpleTypesToUnion<cast<restType, readonly SimpleTypes[]>, options> extends infer r2 ?
                    r2 extends Success<infer t2> ?
                        Success<t1 | t2> :
                    r2 :
                never :
            r1 :
        never :
    Success<never>

type parseDefinitionCore<type_ extends JsonSchema["type"], options extends ParseDefinitionOptions> =
    type_ extends SimpleTypes ? parseSimpleTypesToUnion<[type_], options> :
    type_ extends readonly [SimpleTypes, ...SimpleTypes[]] ? parseSimpleTypesToUnion<type_, options> :
    Success<unknown>

type parseEnum<enum_ extends JsonSchema["enum"]> =
    enum_ extends readonly [unknown, ...unknown[]] ?
        Success<enum_[number]> :
    Success<unknown>

type schemasToResults<
    schemas extends JsonSchemaArray,
    schemasPath extends Path,
    options extends ParseDefinitionOptions
> = {
    [index in keyof schemas]: parseDefinitionOrRef<
        schemas[index],
        options["schemas"],
        options["currentFileName"],
        [...schemasPath, cast<index, Key>]
    >
}
type parseAllOf<allOf extends JsonSchema["allOf"], options extends ParseDefinitionOptions> =
    allOf extends JsonSchemaArray ?
        tryIntersectTypes<
            cast<
                schemasToResults<allOf, [...options["pathToDefinition"], "allOf"], options>,
                readonly Result<unknown>[]
            >
        > :
    Success<unknown>

type parseAnyOf<anyOf extends JsonSchema["anyOf"], options extends ParseDefinitionOptions> =
    anyOf extends JsonSchemaArray ?
        tryUnionTypes<
            cast<
                schemasToResults<anyOf, [...options["pathToDefinition"], "anyOf"], options>,
                readonly Result<unknown>[]
            >
        > :
    Success<unknown>

type parseOneOf<oneOf extends JsonSchema["oneOf"], options extends ParseDefinitionOptions> =
    oneOf extends JsonSchemaArray ?
        tryUnionTypes<
            cast<
                schemasToResults<oneOf, [...options["pathToDefinition"], "oneOf"], options>,
                readonly Result<unknown>[]
            >
        > :
    Success<unknown>

type parseDefinition<options extends ParseDefinitionOptions> =
    parseDefinitionCore<options["definition"]["type"], options> extends infer coreResult ?
        parseEnum<options["definition"]["enum"]> extends infer enumResult ?
            parseAllOf<options["definition"]["allOf"], options> extends infer allOfResult ?
                parseAnyOf<options["definition"]["anyOf"], options> extends infer anyOfResult ?
                    parseOneOf<options["definition"]["oneOf"], options> extends infer oneOfResult ?
                        tryIntersectTypes<[
                            cast<coreResult, Result<unknown>>,
                            cast<enumResult, Result<unknown>>,
                            cast<allOfResult, Result<unknown>>,
                            cast<anyOfResult, Result<unknown>>,
                            cast<oneOfResult, Result<unknown>>,
                        ]> :
                    never :
                never :
            never :
        never :
    never

/** @internal */
export type parseDefinitionOrRef<
    definitionOrRef extends JsonSchemaOrRef,
    schemas extends JsonSchemaFiles,
    currentFileName extends Key,
    pathToDefinition extends Path,
> =
    definitionOrRef extends JsonSchemaRef ?
        parseRef<definitionOrRef, {
            schemas: schemas,
            pathToDefinition: pathToDefinition,
            currentFileName: currentFileName,
        }> :

    definitionOrRef extends JsonSchema ?
        parseDefinition<{
            definition: definitionOrRef,
            schemas: schemas,
            pathToDefinition: pathToDefinition,
            currentFileName: currentFileName,
        }> :

    never

export type ParseJsonSchemaFromFiles<schemas extends JsonSchemaFiles, pathToDefinition extends Path> =
    tryDeepGet<schemas, pathToDefinition, []> extends infer result ?
        result extends Success<infer definition> ?
            definition extends JsonSchemaOrRef ?
                parseDefinitionOrRef<definition, schemas, pathToDefinition[0], pathToDefinition> :
            Failure<`The path must point to a schema definition or reference.`, pathToDefinition> :
        result :
    never

type tempSchemaPath = "temp.schema.json"
export type ParseJsonSchema<TSchema extends JsonSchema> =
    ParseJsonSchemaFromFiles<{ [p in tempSchemaPath]: TSchema }, [tempSchemaPath]> extends infer result ?
        result extends Failure<infer message, infer path> ?
            path extends [tempSchemaPath, ...infer restPath] ?
                Failure<message, cast<restPath, Path>> :
            result :
        result :
    never
