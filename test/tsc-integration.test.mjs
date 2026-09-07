import assert from "node:assert/strict"
import { test } from "node:test"
import { spawnSync } from "node:child_process"
import { mkdtempSync, writeFileSync, rmSync, cpSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { transform } from "../src/transform.js"

const root = process.cwd()
const tscBin = path.join(root, "node_modules", "typescript", "bin", "tsc")
const guard = existsSync(tscBin) ? {} : { skip: "typescript not installed" }

const tsconfig = {
    compilerOptions: {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        strict: false,
        skipLibCheck: true,
        target: "es2020",
        module: "esnext",
        moduleResolution: "bundler"
    },
    include: ["index.js", "slim-globals.d.ts"]
}

function typeCheck(source) {
    const dir = mkdtempSync(path.join(tmpdir(), "slim-tsc-"))
    try {
        const { code } = transform(source, path.join(dir, "index.slim"), { jsdoc: true, check: false })
        writeFileSync(path.join(dir, "index.js"), code.replace(/^import\s+[^;]*(?:defaults|core)\.js";$/m, ""))
        writeFileSync(path.join(dir, "tsconfig.json"), JSON.stringify(tsconfig))
        cpSync(path.join(root, "src", "external", "slim-globals.d.ts"), path.join(dir, "slim-globals.d.ts"))

        const result = spawnSync(process.execPath, [tscBin, "-p", path.join(dir, "tsconfig.json")], {
            cwd: dir,
            encoding: "utf8"
        })

        return (result.stdout + result.stderr)
            .split("\n")
            .filter(line => /error TS/.test(line))
    } finally {
        rmSync(dir, { recursive: true, force: true })
    }
}

test("valid typed Slim compiles clean under tsc --checkJs", guard, () => {
    const errors = typeCheck(`struct User {
        name: string
        id: int
    }
    func greet(user: User) { return user.name }
    greet({ name: "a", id: 1 })
    let count: int = 5
    count = 10`)

    assert.deepEqual(errors, [], errors.join("\n"))
})

test("tsc flags a wrong argument, initializer, and reassignment", guard, () => {
    const callSite = typeCheck(`struct User { name: string
        id: int }
        func greet(user: User) { return user.name }
        greet({ name: "a", id: "wrong" })`)
    assert.ok(callSite.some(d => /not assignable/.test(d)), callSite.join("\n"))

    const badInit = typeCheck(`let n: int = "text"`)
    assert.ok(badInit.some(d => /not assignable/.test(d)), badInit.join("\n"))

    const badReassign = typeCheck(`let n: int = 5
        n = "bad"`)
    assert.ok(badReassign.some(d => /not assignable/.test(d)), badReassign.join("\n"))
})
