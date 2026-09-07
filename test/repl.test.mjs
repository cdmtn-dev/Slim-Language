import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { test } from "node:test"
import path from "node:path"

const root = process.cwd()
const cli = path.join(root, "src", "bin", "cli.js")

function repl(lines) {
    const result = spawnSync(process.execPath, [cli, "repl"], {
        cwd: root,
        encoding: "utf8",
        input: lines.concat(".exit").join("\n") + "\n"
    })
    return result.stdout + result.stderr
}

test("the REPL persists bindings across lines", () => {
    const out = repl(["let x = 10", "log(x * 2)"])
    assert.match(out, /20/)
})

test("the REPL evaluates Slim constructs (structs, operators, match)", () => {
    const out = repl([
        `struct User { name: string }`,
        `log(User.new({ name: "Bob" }).name)`,
        `log(sizeof [1, 2, 3])`,
        `log(match (2) { 1 => "one", 2 => "two", _ => "?" })`
    ])
    assert.match(out, /Bob/)
    assert.match(out, /3/)
    assert.match(out, /two/)
})
