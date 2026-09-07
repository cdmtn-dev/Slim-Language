import assert from "node:assert/strict"
import { test } from "node:test"
import { formatSlim } from "../src/format.js"

test("code is reindented by bracket depth", () => {
    const formatted = formatSlim(`struct User {
name: string
    id: int
}`)
    assert.equal(formatted, `struct User {\n    name: string\n    id: int\n}\n`)
})

test("closing brackets align with their opener", () => {
    const formatted = formatSlim(`func f() {
if (a) {
log(1)
}
}`)
    assert.equal(formatted, `func f() {\n    if (a) {\n        log(1)\n    }\n}\n`)
})

test("multiline template content is left untouched", () => {
    const source = "func greet(name) {\nreturn `hello\n   ${name}\nworld`\n}"
    const formatted = formatSlim(source)
    assert.match(formatted, /`hello\n   \$\{name\}\nworld`/)
})

test("formatting is idempotent", () => {
    const once = formatSlim(`struct P {
x: int
}`)
    assert.equal(formatSlim(once), once)
})
