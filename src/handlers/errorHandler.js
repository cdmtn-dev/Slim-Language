import { formatError } from "../external/classErrors.js"

process.on("unhandledRejection", (err, promise) => {
    if (err?.tag) {
        console.error(formatError(
            err.tag,
            err.message,
            err.file       ?? null,
            err.line       ?? null,
            err.col        ?? null,
            err.sourceLine ?? null,
        ))
        process.exit(1)
    }

    console.error(formatError(
        "Error",
        err?.message ?? String(err),
        null, null, null, null
    ))
    process.exit(1)
})

process.on("uncaughtException", (err) => {
    if (err?.tag) {
        console.error(formatError(
            err.tag,
            err.message,
            err.file       ?? null,
            err.line       ?? null,
            err.col        ?? null,
            err.sourceLine ?? null,
        ))
        process.exit(1)
    }

    console.error(formatError(
        "Error",
        err?.message ?? String(err),
        null, null, null, null
    ))
    process.exit(1)
})