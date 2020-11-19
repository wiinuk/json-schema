import assert = require("assert")
import { add } from "../source/index"

describe("index", () => {
    it("add", () => {
        assert(add(2, 3) === 10)
    })
})
