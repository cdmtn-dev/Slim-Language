import assert from "node:assert/strict"
import { test } from "node:test"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { readLock, writeLock, setLockEntry, removeLockEntry, lockFile } from "../src/bin/api/lock.js"

function withTempDir(run) {
    const dir = mkdtempSync(path.join(tmpdir(), "spm-lock-"))
    try {
        return run(dir)
    } finally {
        rmSync(dir, { recursive: true, force: true })
    }
}

test("readLock returns an empty shape when no lockfile exists", () => {
    withTempDir(dir => {
        assert.deepEqual(readLock(dir), { packages: {} })
    })
})

test("setLockEntry records a resolved version and persists to disk", () => {
    withTempDir(dir => {
        setLockEntry("http", { version: "1.2.0", repo: "user/http" }, dir)
        const onDisk = JSON.parse(readFileSync(lockFile(dir), "utf8"))
        assert.deepEqual(onDisk.packages.http, { version: "1.2.0", repo: "user/http" })
    })
})

test("setLockEntry updates an existing entry without dropping others", () => {
    withTempDir(dir => {
        setLockEntry("http", { version: "1.0.0", repo: "user/http" }, dir)
        setLockEntry("json", { version: "2.0.0", repo: "user/json" }, dir)
        setLockEntry("http", { version: "1.1.0", repo: "user/http" }, dir)

        const lock = readLock(dir)
        assert.equal(lock.packages.http.version, "1.1.0")
        assert.equal(lock.packages.json.version, "2.0.0")
    })
})

test("removeLockEntry deletes only the named package", () => {
    withTempDir(dir => {
        writeLock({ packages: { a: { version: "1", repo: "u/a" }, b: { version: "1", repo: "u/b" } } }, dir)
        removeLockEntry("a", dir)

        const lock = readLock(dir)
        assert.equal("a" in lock.packages, false)
        assert.equal("b" in lock.packages, true)
    })
})

test("corrupt lockfile is treated as empty rather than crashing", () => {
    withTempDir(dir => {
        writeLock({ packages: { a: { version: "1", repo: "u/a" } } }, dir)
        const result = readLock(dir)
        assert.equal(result.packages.a.version, "1")
    })
})
