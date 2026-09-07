// Full runtime for components and Node error frames; pure code uses core.js.

import fs from "fs"
import { setSourceReader } from "./classErrors.js"
import {
    htmlToVdom,
    HTMLElement,
    __html__,
    __flush_events__,
    __bind_events__,
    __lifecycle__,
    __create_host__,
    __adopt_into__,
    __define_element__
} from "./helpers.js"

export * from "./core.js"

// The bare fs import lets client bundles remove source-frame support.
setSourceReader(file => fs.readFileSync(file, "utf8"))

Object.assign(globalThis, {
    htmlToVdom, HTMLElement, __html__, __flush_events__, __bind_events__, __lifecycle__,
    __create_host__, __adopt_into__, __define_element__
})
