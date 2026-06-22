import "./handlers/errorHandler.js"
import fs from "fs"
import path from "path"
import { transform } from "./transform.js"

import { readFile } from 'fs/promises';
import { Debug } from "./defaults.js";

const compiled = new Set()

function resolveSlimPath(raw, fromFile) {
    if (raw.startsWith("@slim/")) {
        const rel = raw.replace("@slim/", "")
        return path.resolve("src/lib", rel + ".slim")
    }

    if (raw.endsWith(".js")) {
        const fromDir = path.dirname(fromFile)
        return path.resolve(fromDir, raw)
    }

    const fromDir = path.dirname(fromFile)
    return path.resolve(fromDir, raw + ".slim")
}

function getDistPath(slimFile) {
    const abs = path.resolve(slimFile)
    const srcRoot = path.resolve("src")
    const projectRoot = path.resolve(".")

    if (abs.startsWith(srcRoot)) {
        const rel = path.relative(srcRoot, abs)
        return path.resolve("dist", rel.replace(/\.slim$/, ".js"))
    }

    const rel = path.relative(projectRoot, abs)
    return path.resolve("dist", rel.replace(/\.slim$/, ".js"))
}

function extractUses(code) {
    const uses = []

    const patterns = [
        /\buse\s+(@slim\/[\w$\/.-]+)\s*;?$/gm,
        /\buse\s+(?:\{[^}]+\}|[\w$]+)\s+from\s+(@slim\/[\w$\/.-]+)\s*;?$/gm,
        /\buse\s+(?:\{[^}]+\}|[\w$]+\s+from\s+)?"([^"]+)"\s*;?$/gm,
    ]

    for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(code)) !== null) {
            const raw = match[1]
            if (raw) uses.push(raw)
        }
    }

    return [...new Set(uses)]
}

function compileFile(slimFile, isEntry = false, mainEntry = null) {
    const hasSilmExtension = slimFile.endsWith(".slim")
    const file = hasSilmExtension ? slimFile : slimFile + ".slim"
    const abs = path.resolve(file)

    if (compiled.has(abs)) return
    compiled.add(abs)

    if (!fs.existsSync(abs)) {
        console.error(`\nError: File not found: ${abs}\n`)
        process.exit(1)
    }

    const code = fs.readFileSync(abs, "utf8")

    const uses = extractUses(code)
    for (const raw of uses) {
        const depPath = resolveSlimPath(raw, abs)
        if (depPath.endsWith(".js")) continue
        if (depPath === abs) {
            console.error(`\nError: Circular dependency detected in ${abs}\n`)
            process.exit(1)
        }
        compileFile(depPath, false, mainEntry)
    }

    const { code: output } = transform(code, abs)

    if (isEntry) {
        fs.mkdirSync("dist", { recursive: true })
        const outputFileName = mainEntry ? `${mainEntry}.js` : `${file}.js`
        fs.writeFileSync(`dist/${outputFileName}`, output)
    } else {
        const distPath = getDistPath(abs)
        fs.mkdirSync(path.dirname(distPath), { recursive: true })
        fs.writeFileSync(distPath, output)
    }
}

function cleanDist(slimFileClear) {
    const keep = new Set([
        path.resolve(`dist/${slimFileClear}.js`),
        path.resolve("dist/mappings.json"),
    ])

    for (const slimFile of compiled) {
        if (slimFile === path.resolve(`${slimFileClear}.slim`)) {
            keep.add(path.resolve(`dist/${slimFileClear}.js`))
        } else {
            keep.add(getDistPath(slimFile))
        }
    }

    function walkAndClean(dir) {
        if (!fs.existsSync(dir)) return

        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.resolve(dir, entry.name)

            if (entry.isDirectory()) {
                walkAndClean(full)

                if (fs.readdirSync(full).length === 0) {
                    fs.rmdirSync(full)
                }
            } else if (!keep.has(full)) {
                fs.rmSync(full)
                Debug.log(`Cleaned: ${path.relative(".", full)}`)
            }
        }
    }

    walkAndClean(path.resolve("dist"))
}

async function main() {
    try {
        const filePath = "slimconfig.json";
        const contents = await readFile(filePath, 'utf8');
        const data = JSON.parse(contents);

        if("main" in data) {
            compileFile(data.main, true, data.main)
            cleanDist(data.main)
        }
    } catch (error) {
        console.error('Error reading or parsing slimconfig.json:', error);
    }
}
main()