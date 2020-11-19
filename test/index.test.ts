import assert = require("assert")
import { string, number, union, intersection, properties, literal, SchemaTarget } from "../source/index"

describe("Schema", () => {
    const userSchema = properties({
        name: string,
        age: number,
    })
    const documentSchema = properties({
        title: string,
        body: string,
    })
    const schema = union(
        intersection(
            properties({ command: literal("add-user") }),
            userSchema
        ),
        intersection(
            properties({ command: literal("add-document") }),
            documentSchema
        )
    )
    it("validate-failure", () => {
        const r = schema.validate("abc")
        if (r === null) { assert(r !== null) }

        assert.deepStrictEqual(r, [
            {
                path: ["command"],
                schema: literal("add-user")._schema,
                actualValue: undefined,
            },
            {
                path: ["command"],
                schema: literal("add-document")._schema,
                actualValue: undefined,
            },
        ])
    })
    it("validate-success", () => {
        {
            const value: SchemaTarget<typeof schema> = {
                command: "add-user",
                name: "abc",
                age: 123
            }
            assert(schema.validate(value) === null)
        }
        {
            const value: SchemaTarget<typeof schema> = {
                command: "add-document",
                title: "abc",
                body: "xyz"
            }
            assert(schema.validate(value) === null)
        }
    })
    it("validate-deep-failure", () => {
        const r = schema.validate({
            command: "ADD_USER",
            name: "abc",
            age: 123
        })
        assert.deepStrictEqual(r, [
            {
                path: ["command"],
                schema: literal("add-user")._schema,
                actualValue: "ADD_USER",
            },
            {
                path: ["command"],
                schema: literal("add-document")._schema,
                actualValue: "ADD_USER",
            },
        ])
    })
    it("validate-deep-failure-2", () => {
        const r = schema.validate(({
            command: "add-document",
            title: "abc",
            body: 123,
        }))
        assert.deepStrictEqual(r, [
            {
                path: ["command"],
                actualValue: "add-document",
                schema: literal("add-user")._schema,
            },
            {
                path: ["body"],
                schema: string._schema,
                actualValue: 123,
            },
        ])
    })
})
