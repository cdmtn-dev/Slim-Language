import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { test } from "node:test"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { transform } from "../src/transform.js"

const root = process.cwd()
const outputDir = path.join(root, "dist", "__destructure_tests__")
const runtimeImport = pathToFileURL(path.join(root, "src", "external", "defaults.js")).href

function runSlim(name, source) {
    mkdirSync(outputDir, { recursive: true })
    const { code } = transform(source, path.join(root, "__destructure_tests__", `${name}.slim`))
    const executable = code.replace(
        /^import\s+[^;]*(?:defaults|core)\.js";$/m,
        `import ${JSON.stringify(runtimeImport)};`
    )
    const outputFile = path.join(outputDir, `${name}.js`)
    writeFileSync(outputFile, executable)
    return spawnSync(process.execPath, ["--no-warnings", outputFile], { cwd: root, encoding: "utf8" })
}

test("object destructuring validates the source against the type", () => {
    const result = runSlim("object", `
        struct User { name: string
            id: int }
        const data = { name: "Alice", id: 5 }
        const { name, id }: User = data
        log(name, id)
    `)
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Alice 5/)
})

test("a destructured source that violates the type is rejected", () => {
    const result = runSlim("object-bad", `
        struct User { name: string
            id: int }
        const { name, id }: User = { name: "x", id: "bad" }
    `)
    assert.notEqual(result.status, 0)
})

test("array destructuring validates against a tuple type", () => {
    const result = runSlim("array", `
        const [a, b]: [int, string] = [1, "two"]
        log(a, b)
    `)
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /1 two/)
})
