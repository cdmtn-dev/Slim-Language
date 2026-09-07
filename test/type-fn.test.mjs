import assert from "node:assert/strict"
import { test } from "node:test"
import { type } from "../src/external/defaults.js"

test("type() reports primitive and built-in object kinds", () => {
    assert.equal(type(10n), "bigint")
    assert.equal(type(Symbol("x")), "symbol")
    assert.equal(type(new Map()), "map")
    assert.equal(type(new Set()), "set")
    assert.equal(type(new Date(0)), "date")
    assert.equal(type(Promise.resolve()), "promise")
    assert.equal(type(/x/), "regexp")
})

test("type() never returns undefined for a defined value", () => {
    for (const value of [10n, Symbol(), new Map(), new WeakMap(), new Date(), /x/, 1, "s", true, [], {}]) {
        assert.notEqual(type(value), undefined)
    }
})
