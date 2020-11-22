/* eslint-disable @typescript-eslint/ban-types */
import type { Failure, JsonSchema, JsonSchemaFiles, ParseJsonSchemaFromFiles, ParseJsonSchema, Success } from "../source/json"

// from https://github.com/microsoft/TypeScript/issues/27024#issuecomment-421529650
type equals<X, Y> =
    (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ?
        true :
    false

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
const assertT = <_T extends true>(): void => {}

type asConst<t> =
    t extends (undefined | null | boolean | number | string | bigint | symbol | Function) ? t :
    t extends [] ? readonly [] :
    t extends [infer head, ...infer tail] ? readonly [asConst<head>, ...asConst<tail>] :
    t extends (infer e)[] ? readonly asConst<e>[] :
    t extends Map<infer k, infer v> ? ReadonlyMap<asConst<k>, asConst<v>> :
    t extends Set<infer k> ? ReadonlySet<asConst<k>> :
    t extends object ? { readonly [i in keyof t]: asConst<t[i]> } :
    t

type parseJsonSchema<t extends JsonSchema> = ParseJsonSchema<asConst<t>>
type parseJsonSchemaFromFiles<t extends JsonSchemaFiles, path extends readonly [string, ...string[]]> = ParseJsonSchemaFromFiles<asConst<t>, path>

{
    assertT<equals<
        parseJsonSchemaFromFiles<{ "schema.json": {} }, ["_schema.json"]>,
        Failure<`'_schema.json' was not found.`, []>
    >>()
    assertT<equals<
        parseJsonSchemaFromFiles<{ "schema.json": {} }, ["schema.json"]>,
        Success<unknown>
    >>()
    assertT<equals<
        parseJsonSchemaFromFiles<{ "schema.json": { type: "string" } }, ["schema.json", "type"]>,
        Failure<"The path must point to a schema definition or reference.", ["schema.json", "type"]>
    >>()
    assertT<equals<
        parseJsonSchemaFromFiles<{ "schema.json": { anyOf: [ { type: "string" } ] } }, ["schema.json", "anyOf", "0"]>,
        Success<string>
    >>()
}
{
    type x = parseJsonSchemaFromFiles<
        { "schema.json": { anyOf: [ { type: "string" } ] } },
        ["schema.json", "anyOf", "0", "type"]
    >
    assertT<equals<
        x,
        Failure<
            "The path must point to a schema definition or reference.",
            ["schema.json", "anyOf", "0", "type"]
        >>>()
}
{
    assertT<equals<
        parseJsonSchema<{}>,
        Success<unknown>
    >>()
    assertT<equals<
        parseJsonSchema<{
            type: "boolean"
        }>,
        Success<boolean>
    >>()
    assertT<equals<
        parseJsonSchema<{
            type: ["boolean", "string"]
        }>,
        Success<boolean | string>
    >>()
    assertT<equals<
        parseJsonSchema<{
            multipleOf: 5
        }>,
        Success<unknown>
    >>()
    assertT<equals<
        parseJsonSchema<{
            maximum: 5
        }>,
        Success<unknown>
    >>()
    assertT<equals<
        parseJsonSchema<{
            minimum: 5
        }>,
        Success<unknown>
    >>()
    assertT<equals<
        parseJsonSchema<{
            pattern: "[a-z]+"
        }>,
        Success<unknown>
    >>()
    assertT<equals<
        parseJsonSchema<{
            type: "array"
        }>,
        Success<unknown[]>
    >>()
    assertT<equals<
        parseJsonSchema<{
            type: "array",
            items: { type: "number" }
        }>,
        Success<number[]>
    >>()
    assertT<equals<
        parseJsonSchema<{
            type: "array",
            items: [ { type: "number" } ]
        }>,
        Failure<`Not implemented.`, ["items"]>
    >>()
    assertT<equals<
        parseJsonSchema<{
            type: "array",
            items: {
                type: "array",
                items: { type: "number" }
            }
        }>,
        Success<number[][]>
    >>()
    assertT<equals<
        parseJsonSchema<{
            type: "array",
            items: {
                type: "array",
                items: [ { type: "number" } ]
            }
        }>,
        Failure<`Not implemented.`, ["items", "items"]>
    >>()
    assertT<equals<
        parseJsonSchema<{
            uniqueItems: true
        }>,
        Success<unknown>
    >>()
    assertT<equals<
        parseJsonSchema<{
            maxProperties: 5
        }>,
        Success<unknown>
    >>()
    assertT<equals<
        parseJsonSchema<{
            minProperties: 5
        }>,
        Success<unknown>
    >>()
    assertT<equals<
        parseJsonSchema<{
            type: "object",
            properties: {
                x: { type: "number" },
                y: { type: "string" },
            },
            required: ["x"]
        }>,
        Success<
            & object
            & { x: number }
            & { y: string | undefined }
        >
    >>()
    assertT<equals<
        parseJsonSchema<{
            type: "object",
            properties: {
                x: { type: "number" },
                y: {
                    type: "array",
                    items: [ { type: "string" } ]
                },
            },
            required: ["x"]
        }>,
        Failure<`Not implemented.`, ["properties", "y", "items"]>
    >>()
    assertT<equals<
        parseJsonSchema<{
            enum: [1, "A", true]
        }>,
        Success<"A" | 1 | true>
    >>()
    assertT<equals<
        parseJsonSchema<{
            enum: [1, "A", true],
            type: "string"
        }>,
        Success<"A">
    >>()
    assertT<equals<
        parseJsonSchema<{
            enum: [1, "A", true],
            type: "object"
        }>,
        Success<never>
    >>()
    assertT<equals<
        parseJsonSchema<{
            allOf: [ { type: "number" } ]
        }>,
        Success<number>
    >>()
    assertT<equals<
        parseJsonSchema<{
            allOf: [
                { type: "number" },
                { type: "string" }
            ]
        }>,
        Success<never>
    >>()
}
{
    type x = parseJsonSchema<{
        allOf: [
            {
                type: "object",
                properties: {
                    x: { type: "string" }
                },
                required: ["x"]
            },
            {
                type: "object",
                properties: {
                    y: { type: "number" }
                },
                required: ["y"]
            }
        ]
    }>
    assertT<equals<
        x,
        Success<
            & object
            & { x: string }
            & { y: number }
        >
    >>()
}
{
    type x = parseJsonSchema<{
        type: "object",
        properties: {
            x: { type: "string" }
        },
        required: ["x"]
        allOf: [
            {
                type: "object",
                properties: {
                    y: { type: "number" }
                },
                required: ["y"]
            }
        ]
    }>
    assertT<equals<
        x,
        Success<
            & object
            & { x: string }
            & { y: number }
        >
    >>()
}
{
    type x = parseJsonSchema<{
        anyOf: [ { type: "string" } ]
    }>
    assertT<equals<x, Success<string>>>()
}
{
    type x = parseJsonSchema<{
        anyOf: [
            { type: "string" },
            { type: "boolean" },
        ]
    }>
    assertT<equals<x, Success<string | boolean>>>()
}
{
    type x = parseJsonSchema<{
        type: "number",
        anyOf: [
            { type: "string" },
            { type: "number" },
        ]
    }>
    assertT<equals<x, Success<number>>>()
}
{
    type x = parseJsonSchema<{
        definitions: {
            address: { type: "string" }
        },
        anyOf: [ { $ref: "#/definitions/address" } ]
    }>
    assertT<equals<x, Success<string>>>()
}
{
    type x = parseJsonSchema<{
        definitions: {
            "A/B": { type: "string" }
        },
        anyOf: [ { $ref: "#/definitions/A~1B" } ]
    }>
    assertT<equals<x, Success<string>>>()
}
{
    type x = parseJsonSchema<{
        definitions: {
            "A~B": { type: "number" }
        },
        anyOf: [ { $ref: "#/definitions/A~0B" } ]
    }>
    assertT<equals<x, Success<number>>>()
}
{
    type x = parseJsonSchema<{
        anyOf: [ { $ref: "#/INVALID/~TOKEN" } ]
    }>
    assertT<equals<
        x,
        Failure<
            "An error occurred at index 10 on '#/INVALID/~TOKEN'. Requires '~0' or '~1'. '~0' is converted to '~'. '~1' is converted to '/'.",
            ["anyOf", "0", "$ref"]
        >
    >>()
}
{
    type x = parseJsonSchema<{
        definitions: {},
        anyOf: [ { $ref: "#/definitions/MISSING" } ]
    }>
    assertT<equals<x, Failure<"'MISSING' was not found.", ["anyOf", "0", "$ref"]>>>()
}
{
    type x =
        parseJsonSchemaFromFiles<
            {
                "schemaA.json": {
                    anyOf: [ { $ref: "schemaB.json#/definitions/address" } ]
                },
                "schemaB.json": {
                    definitions: {
                        address: { type: "string" }
                    }
                }
            },
            ["schemaA.json"]
        >
    assertT<equals<x, Success<string>>>()
}
{
    type x = parseJsonSchema<{
        anyOf: [
            { $ref: "MISSING_SCHEMA.json#/definitions/address" }
        ]
    }>
    assertT<equals<x, Failure<"The file 'MISSING_SCHEMA.json' was not found.", ["anyOf", "0", "$ref"]>>>()
}
{
    type x = parseJsonSchema<{
        anyOf: [ { $ref: "#addr" } ]
        definitions: {
            address: {
                id: "#addr",
                type: "number"
            }
        }
    }>
    assertT<equals<x, Success<number>>>()
}
{
    type x1 = parseJsonSchema<{
        anyOf: [
            { $ref: "#addr" }
        ]
        definitions: {
            a: { id: "#addr", type: "number" },
            b: { id: "#addr", type: "string" },
        }
    }>
    assertT<equals<x1, Success<number>>>()

    type x2 = parseJsonSchema<{
        anyOf: [ { $ref: "#addr" } ]
        definitions: {
            b: { id: "#addr", type: "string" },
            a: { id: "#addr", type: "number" },
        }
    }>
    assertT<equals<x2, Success<number>>>()
}
{
    type x = parseJsonSchema<{
        anyOf: [ { $ref: "#MISSING_ID" } ]
    }>
    assertT<equals<
        x,
        Failure<"The ID '#MISSING_ID' was not found.", ["anyOf", "0", "$ref"]>
    >>()
}
{
    type x = parseJsonSchema<{
        anyOf: [ { $ref: "#addr" } ],
        definitions: {
            address: {
                anyOf: [
                    { id: "#addr", type: "number" }
                ]
            }
        }
    }>
    assertT<equals<
        x,
        Failure<"The ID '#addr' was not found.", ["anyOf", "0", "$ref"]>
    >>()
}
{
    type x = parseJsonSchema<{
        anyOf: [ { $ref: "#addr" } ],
        definitions: {
            _: {
                definitions: {
                    _: { id: "#addr", type: "number" }
                }
            }
          }
    }>
    assertT<equals<x, Success<number>>>()
}
{
    type x = parseJsonSchemaFromFiles<
        {
            "schemaA.json": {
                type: "number",
                definitions: {
                    address: { $ref: "#" }
                }
            }
        },
        ["schemaA.json", "definitions", "address"]
    >
    assertT<equals<x, Success<number>>>()
}
{
    type x = parseJsonSchemaFromFiles<
        {
            "schemaA.json": {
                anyOf: [ { $ref: "schemaB.json#" } ]
            },
            "schemaB.json": {
                type: "boolean"
            }
        },
        ["schemaA.json"]
    >
    assertT<equals<x, Success<boolean>>>()
}
