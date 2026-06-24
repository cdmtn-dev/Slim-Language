import MagicString from "magic-string"

export function stripComments(code) {
    let result = ""
    let i = 0

    while (i < code.length) {
        if (code[i] === '"' || code[i] === "'" || code[i] === "`") {
            const quote = code[i]
            result += code[i++]
            while (i < code.length) {
                if (code[i] === "\\" ) { result += code[i++] + code[i++]; continue }
                if (code[i] === quote) { result += code[i++]; break }
                result += code[i++]
            }
            continue
        }

        if (code[i] === "/" && code[i + 1] === "/") {
            while (i < code.length && code[i] !== "\n") i++
            continue
        }

        if (code[i] === "/" && code[i + 1] === "*") {
            i += 2
            while (i < code.length) {
                if (code[i] === "*" && code[i + 1] === "/") { i += 2; break }
                i++
            }
            continue
        }

        result += code[i++]
    }

    return result
}

export function preprocess(code, sourceFile = "input.ps") {
    let preprocessed = stripComments(code)
    preprocessed = replaceOperator(preprocessed, "sizeof", "__sizeof__")
    preprocessed = replaceOperator(preprocessed, "kindof", "type")
    preprocessed = replaceOperator(preprocessed, "empty", "__is_empty__")
    preprocessed = replaceOperator(preprocessed, "lock", "__lock_object__")

    const s = new MagicString(preprocessed)

    const replacements = []

    function collect(pattern, handler) {
        const re = new RegExp(pattern.source,
            pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"
        )
        let match
        while ((match = re.exec(preprocessed)) !== null) {
            replacements.push({
                start: match.index,
                end:   match.index + match[0].length,
                replacement: handler(...match)
            })
        }
    }

    // uses
    collect(
        /use\s+(\*\s+as\s+[\w$]+|\{[^}]+\}|[a-zA-Z_$][\w$]*)\s+from\s+"([^"]+)"\s*;?/g,
        (_, name, source) =>
            `__use__(${JSON.stringify(name.trim())}, ${JSON.stringify(source)})\n`
    )
    collect(
        /use\s+(\*\s+as\s+[\w$]+|\{[^}]+\}|[a-zA-Z_$][\w$]*)\s+from\s+(@slim[\w$\/.-]+)\s*;?/g,
        (_, name, source) =>
            `__use__(${JSON.stringify(name.trim())}, ${JSON.stringify(source)})\n`
    )
    collect(
        /use\s+(@slim[\w$\/.-]+)\s*;?/g,
        (_, source) => `__use_all__(${JSON.stringify(source)})\n`
    )
    collect(
        /use\s+"([^"]+)"\s*;?/g,
        (_, source) => `__use_all__(${JSON.stringify(source)})\n`
    )
    // 

    collect(
        /component\s+([a-zA-Z_$][\w$]*)\s*\{([\s\S]*?)\n\}/g,
        (_, name, body) => {
            const jsxMatch = body.match(/^\s*(<[\s\S]+>[\s\S]*<\/[\s\S]+>|<[^>]+\/>)\s*$/)
            if (jsxMatch) {
                const escaped = jsxMatch[1].trim().replace(/`/g, "\\`")
                return `class ${name} extends Component {
  static render(variables) {
    let HTML = \`${escaped}\`
    Object.keys(variables).forEach(v => {
      HTML = HTML.replaceAll(new RegExp("{" + v + "}", "gm"), variables[v])
    })
    return HTML
  }
}`
            }
            return `class ${name} {${body}\n}`
        }
    )
    collect(
        /struct\s+([A-Z][\w$]*)\s*\{([\s\S]*?)\}/g,
        (_, name, body) => {
            const fields = body
                .split("\n")
                .map(line => line.trim())
                .filter(Boolean)
                .map(line => {
                    const idx = line.indexOf(":")
                    if (idx === -1) return null

                    const field = line.slice(0, idx).trim()
                    const type = line.slice(idx + 1).trim()

                    if (!field || !type) return null

                    return `"${field}": "${type}"`
                })
                .filter(Boolean)
                .join(", ")

            return `__def_struct__("${name}", { ${fields} })`
        }
    )
    collect(
        /enum\s+([A-Z][\w$]*)\s*\{([\s\S]*?)\}/g,
        (_, name, body) => {
            const fields = body
                .split("\n")
                .map(line => line.trim())
                .filter(Boolean)
                .map(line => {
                    const idx = line.indexOf(":")

                    if (idx === -1) {
                        const field = line.trim()
                        return `"${field}": undefined`
                    }
                    const field = line.slice(0, idx).trim()
                    const type = line.slice(idx + 1).trim()

                    if (!field || !type) return null

                    return `"${field}": ${type}`
                })
                .filter(Boolean)
                .join(", ")

            return `__def_enum__("${name}", { ${fields} })`
        }
    )
    collect(
        /\b(let|const|var)\s+([\w$]+)\s*:\s*([A-Z][\w$]*)(?:<([A-Z][\w$]*)>)?\s*=\s*([^\n;]+)/g,
        (_, keyword, name, type, genericType, expr) => {
            if (type === "Result" && genericType) {
                return `${keyword} ${name} = __typed__(${expr.trim()}, "${genericType}", "errorResult")`
            }
            return `${keyword} ${name} = __typed__(${expr.trim()}, "${type}", "${name}")`
        }
    )
    collect(
        /\b(let|const|var)\s+([\w$]+)\s*:\s*([\w$[\]]+(?:<[\w$]+>)?)\s*=\s*([^\n;]+)/gm,
        (_, keyword, name, type, expr) => {
            return `${keyword} ${name} = __typed_default__(${expr.trim()}, "${type}", "${name}")`
        }
    )
    collect(
        /(\w[\w$.]*(?:\[.*?\])?)\s*(?:=>\s*([\w$]+))?\s*\n((?:\s*\|[^\n]+\n?)+)/g,
        (_, source, alias, pipes) => {
            const steps = [...pipes.matchAll(/\|\s*([\w$]+)\(([^)]*)\)/g)]
            const callbackMethods = new Set([
                "map", "filter", "find", "findIndex",
                "some", "every", "flatMap", "forEach",
                "reduce", "reduceRight"
            ])
            const chain = steps.map(([, method, args]) => {
                if (alias) {
                    if (args.includes("=>")) return `.${method}(${args.trim()})`
                    if (callbackMethods.has(method)) return `.${method}(${alias} => ${args.trim()})`
                    return `.${method}(${args.trim()})`
                }
                return `.${method}(${args.trim()})`
            }).join("")
            return `${source}${chain}`
        }
    )

    // classes private method
    collect(
        /class\s+[A-Z][\w$]*\s*\{([\s\S]*?)\}/g,
        (_, body) => {
            const transformed = body.replace(
                /private\s+([A-Za-z_$][\w$]*)\s*\(/g,
                (_, name) => `#${name}(`
            )

            return _.replace(body, transformed)
        }
    )

    // functions declaration
    collect(
        /\basync\s+func\s+([\w$]+)\s*\(([^)]*)\)\s*\{/g,
        (_, name, args) => {
            const parsed = parseTypedArgs(args)
            const { signature, checks } = buildTypedArgsResult(parsed, name)
            if (!checks) return `async function ${name}(${signature}) {`
            return `async function ${name}(${signature}) {\n    ${checks}`
        }
    )
    collect(
        /(?<!static\s+)\basync\s+(?!function[\s(])([\w$]+)\s*\(([^)]*)\)\s*\{/g,
        (_, name, args) => {
            const parsed = parseTypedArgs(args)
            const { signature, checks } = buildTypedArgsResult(parsed, name)
            if (!checks) return `async function ${name}(${signature}) {`
            return `async function ${name}(${signature}) {\n    ${checks}`
        }
    )
    collect(
        /\bfunc\s+([\w$]+)\s*\(([^)]*)\)\s*\{/g,
        (_, name, args) => {
            const parsed = parseTypedArgs(args)
            const { signature, checks } = buildTypedArgsResult(parsed, name)
            if (!checks) return `function ${name}(${signature}) {`
            return `function ${name}(${signature}) {\n    ${checks}`
        }
    )
    //

    // arrow functions
    collect(
        /\bconst\s+([\w$]+)\s*=\s*(async\s*)?\(([^)]*)\)\s*=>\s*\{/g,
        (match, name, asyncKw, args) => {
            const parsed = parseTypedArgs(args)
            const { signature, checks } = buildTypedArgsResult(parsed, name)
            if (!checks) return `const ${name} = ${asyncKw ?? ""}(${signature}) => {`
            return `const ${name} = ${asyncKw ?? ""}(${signature}) => {\n    ${checks}`
        }
    )
    // 

    collect(
        /\bpub\s+/g,
        () => `export `
    )

    replacements.sort((a, b) => a.start - b.start)

    const filtered = []
    let lastEnd = 0

    for (const r of replacements) {
        if (r.start >= lastEnd) {
            filtered.push(r)
            lastEnd = r.end
        }
    }

    for (const { start, end, replacement } of filtered) {
        s.overwrite(start, end, replacement)
    }

    const result = s.toString()
    const map = s.generateMap({
        source: sourceFile,
        includeContent: true,
        hires: true
    })

    return { code: result, map }
}

function extractExpr(str, startPos) {
    let depth = 0
    let i = startPos

    while (i < str.length) {
        const ch = str[i]

        if (ch === '"' || ch === "'" || ch === "`") {
            const quote = ch
            i++
            while (i < str.length) {
                if (str[i] === "\\") { i += 2; continue }
                if (str[i] === quote) { i++; break }
                i++
            }
            continue
        }

        if (ch === "(" || ch === "[" || ch === "{") {
            depth++
            i++
            continue
        }
        if (ch === ")" || ch === "]" || ch === "}") {
            if (depth === 0) break
            depth--
            i++
            continue
        }

        if (depth === 0) {
            const two = str.slice(i, i + 2)
            if (["==", "!=", ">=", "<=", "&&", "||", "??"].includes(two)) break
            if (["+", "-", "*", "/", "%", "<", ">", "?", ":", ";", ",", "\n"].includes(ch)) break
        }

        i++
    }

    return str.slice(startPos, i).trim()
}

function replaceOperator(code, keyword, fn) {
    let result = ""
    let i = 0

    while (i < code.length) {
        const slice = code.slice(i)
        const match = slice.match(new RegExp(`^${keyword}\\s+`))

        if (match) {
            const afterKeyword = i + match[0].length
            const expr = extractExpr(code, afterKeyword)
            result += `${fn}(${expr})`
            i = afterKeyword + expr.length
            continue
        }

        result += code[i]
        i++
    }

    return result
}

function parseTypedArgs(argsStr) {
    const args = []
    let depth = 0
    let current = ""

    for (let i = 0; i < argsStr.length; i++) {
        const ch = argsStr[i]
        if (ch === "(" || ch === "[" || ch === "{") { depth++; current += ch; continue }
        if (ch === ")" || ch === "]" || ch === "}") { depth--; current += ch; continue }
        if (ch === "," && depth === 0) {
            args.push(current.trim())
            current = ""
            continue
        }
        current += ch
    }
    if (current.trim()) args.push(current.trim())

    return args.map(arg => {
        const match = arg.match(/^(\w+)(\?)?\s*(?::\s*(\w+))?\s*(?:=\s*(.+))?$/)
        if (!match) return { raw: arg, name: arg, type: null, optional: false, default: null }

        const [, name, optional, type, def] = match
        return {
            raw: arg,
            name,
            type: type ?? null,
            optional: !!optional,
            default: def ?? null
        }
    })
}

function buildTypedArgsResult(parsedArgs, fnName) {
    const signature = parsedArgs.map(a => {
        if (a.default !== null) return `${a.name} = ${a.default}`
        return a.name
    }).join(", ")

    const checks = parsedArgs
        .filter(a => a.type && a.type !== "any")
        .map(a => {
            if (a.optional) {
                return `if (${a.name} !== undefined && ${a.name} !== null && type(${a.name}) !== "${a.type}") throw new ArgumentDeclarationTypeError(\`${fnName}: argument "${a.name}" expected ${a.type}, got \${type(${a.name})}\`)`
            }
            return `if (type(${a.name}) !== "${a.type}") throw new ArgumentDeclarationTypeError(\`${fnName}: argument "${a.name}" expected ${a.type}, got \${type(${a.name})}\`)`
        })
        .join("\n    ")

    return { signature, checks }
}