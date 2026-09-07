import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { test } from "node:test"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { transform } from "../src/transform.js"

const root = process.cwd()
const outputDir = path.join(root, "dist", "__validator_tests__")
const runtimeImport = pathToFileURL(path.join(root, "src", "external", "defaults.js")).href

function runSlim(name, source) {
    mkdirSync(outputDir, { recursive: true })
    const { code } = transform(source, path.join(root, "__validator_tests__", `${name}.slim`), { check: false })
    const executable = code.replace(
        /^import\s+[^;]*(?:defaults|core)\.js";$/m,
        `import ${JSON.stringify(runtimeImport)};`
    )
    const outputFile = path.join(outputDir, `${name}.js`)
    writeFileSync(outputFile, executable)
    return spawnSync(process.execPath, ["--no-warnings", outputFile], { cwd: root, encoding: "utf8" })
}

test("built-in validators accept valid values", () => {
    const result = runSlim("valid", `
        let e: email = "user@example.com"
        let u: uuid = "550e8400-e29b-41d4-a716-446655440000"
        let p: positive = 5
        let n: nonempty = [1]
        log("ok")
    `)
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /ok/)
})

test("built-in validators reject invalid values", () => {
    assert.notEqual(runSlim("bad-email", `let e: email = "nope"`).status, 0)
    assert.notEqual(runSlim("bad-positive", `let p: positive = -1`).status, 0)
    assert.notEqual(runSlim("bad-nonempty", `let n: nonempty = ""`).status, 0)
})

test("validators work as struct field types", () => {
    const ok = runSlim("struct-ok", `
        struct Account { email: email
            balance: positive }
        Account.verify({ email: "a@b.com", balance: 10 })
        log("valid")
    `)
    assert.equal(ok.status, 0, ok.stderr)

    const bad = runSlim("struct-bad", `
        struct Account { email: email
            balance: positive }
        Account.verify({ email: "a@b.com", balance: -5 })
    `)
    assert.notEqual(bad.status, 0)
})
