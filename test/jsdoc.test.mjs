import assert from "node:assert/strict"
import { test } from "node:test"
import { transform } from "../src/transform.js"

function compile(source, options) {
    return transform(source, "app.slim", options).code
}

test("structs emit a top-level @typedef with mapped field types", () => {
    const code = compile(`struct User {
        name: string
        id: int
        *age: int
        roles: string[]
    }`, { jsdoc: true })

    assert.match(code, /@typedef \{\{ name: string, id: number, age\?: number, roles: string\[\] \}\} User/)
})

test("typed function parameters emit @param with mapped and referenced types", () => {
    const code = compile(`struct User { name: string }
        func greet(user: User, times: int) { return user.name }`, { jsdoc: true })

    assert.match(code, /@param \{User\} user/)
    assert.match(code, /@param \{number\} times/)
})

test("typed variables emit @type", () => {
    const code = compile(`let count: int = 0`, { jsdoc: true })
    assert.match(code, /@type \{number\}/)
})

test("union and float labels map to JSDoc unions and number", () => {
    const code = compile(`const add = (x: int | float, flag: bool) => { return x }
        struct Mixed { value: string | int }`, { jsdoc: true })
    assert.match(code, /@param \{number\} x/)
    assert.match(code, /@param \{boolean\} flag/)
    assert.match(code, /value: string \| number/)
})

test("enums and custom types emit typedefs so references resolve", () => {
    const code = compile(`enum Role { Member: 0
        Admin: 2 }
        type Positive(v) { return v > 0 }
        let r: Role = Role.Admin
        let n: Positive = 5`, { jsdoc: true })

    assert.match(code, /@typedef \{number\} Role/)
    assert.match(code, /@typedef \{any\} Positive/)
})

test("jsdoc mode marks output with @ts-check", () => {
    const code = compile(`let n: int = 1`, { jsdoc: true })
    assert.match(code, /^\/\/ @ts-check/m)
})

test("jsdoc emission is opt-in and off by default", () => {
    const code = compile(`struct User { name: string }
        func greet(user: User) { return user.name }`, {})

    assert.doesNotMatch(code, /@typedef/)
    assert.doesNotMatch(code, /@param/)
    assert.doesNotMatch(code, /@ts-check/)
})
