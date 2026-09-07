import assert from "node:assert/strict"
import { test } from "node:test"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { parse } from "@babel/parser"
import { transform } from "../src/transform.js"

const root = process.cwd()
const examplesDir = path.join(root, "examples")
const examples = readdirSync(examplesDir).filter(name => name.endsWith(".slim")).sort()

function compile(file, source) {
    const originalExit = process.exit
    const originalError = console.error
    let captured = ""

    console.error = (...args) => { captured += args.join(" ") + "\n" }
    process.exit = () => { throw new Error(captured.trim() || "slim aborted compilation") }

    try {
        return transform(source, file).code
    } finally {
        process.exit = originalExit
        console.error = originalError
    }
}

for (const name of examples) {
    test(`example "${name}" compiles to valid JavaScript`, () => {
        const file = path.join(examplesDir, name)
        const output = compile(file, readFileSync(file, "utf8"))
        const body = output.split("//# sourceMappingURL")[0]

        assert.doesNotThrow(
            () => parse(body, { sourceType: "module", plugins: ["jsx"] }),
            `${name} lowered to invalid JavaScript`
        )
    })
}
