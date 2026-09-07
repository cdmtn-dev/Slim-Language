import assert from "node:assert/strict"
import { test } from "node:test"
import { transform } from "../src/transform.js"

function declare(source) {
    return transform(source, "lib.slim", { declarations: true, check: false }).declarations
}

test("exported struct emits an interface and a struct value", () => {
    const dts = declare(`export struct User {
        name: string
        id: int
        *age: int
    }`)

    assert.match(dts, /export interface User \{ name: string; id: number; age\?: number \}/)
    assert.match(dts, /export declare const User: SlimStruct<User>/)
})

test("exported enum and custom type emit type aliases", () => {
    const dts = declare(`export enum Role { Member: 0
        Admin: 2 }
        export type Positive(v) { return v > 0 }`)

    assert.match(dts, /export type Role = number/)
    assert.match(dts, /export type Positive = any/)
})

test("exported functions emit signatures with mapped and optional params", () => {
    const dts = declare(`export struct User { name: string }
        export func greet(user: User, times: int) { return user.name }
        export const add = (x: int, y: float = 1.0) => { return x + y }`)

    assert.match(dts, /export declare function greet\(user: User, times: number\): any/)
    assert.match(dts, /export declare function add\(x: number, y\?: number\): any/)
})

test("non-exported declarations stay out of the sidecar", () => {
    const dts = declare(`struct Hidden { secret: string }
        export struct Public { id: int }`)

    assert.match(dts, /export interface Public/)
    assert.doesNotMatch(dts, /Hidden/)
})

test("no declarations are produced without exports or when disabled", () => {
    assert.equal(declare(`struct Local { id: int }`), null)
    assert.equal(transform(`export struct User { id: int }`, "lib.slim", {}).declarations, null)
})
