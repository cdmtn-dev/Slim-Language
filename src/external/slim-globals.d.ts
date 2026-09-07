// Runtime globals injected into compiled Slim output.

declare function log(...args: any[]): void
declare function warn(...args: any[]): void
declare function error(...args: any[]): void
declare function info(...args: any[]): void
declare function debug(...args: any[]): void

declare function type(value: any, properties?: any): string

type email = string
type url = string
type uuid = string
type positive = number
type negative = number
type natural = number
type nonempty = string | any[]
declare function onError(handler: (error: any) => void): void
declare function test(name: string, fn: () => void): void
declare function assert(condition: any, message?: string): void
declare function assertEqual(actual: any, expected: any, message?: string): void

declare const PI: number

declare class Struct {}
declare class Component {}
declare class Type {}
declare class HTMLElement {}

declare function __def_struct__(name: string, schema: any, specifications?: any, defaults?: any, extendsName?: any, methods?: any): any
declare function __def_enum__(name: string, schema: any): any
declare function __typed__(value: any, structName: any, returnMethod?: string): any

declare function __typed_variable__<T>(value: T, specification?: any, bindingId?: any, varName?: any): T
declare function __typed_variable_check__<T>(bindingId: any, value: T, varName?: any): T
declare function __typed_pattern__<T>(value: T, typeLabel: any): T
declare function __typed_parameter__(value: any, specification: any, bindingId: any, varName?: any, optional?: any, message?: any): any
declare function __typed_static_field__<T>(owner: any, field: any, value: T, specification?: any, displayName?: any): T
declare function __typed_static_field_check__<T>(owner: any, field: any, value: T, displayName?: any): T

declare function __type_def__(name: string, definition: any, properties?: any): any
declare function __type_ref__(label: string, resolve?: any): any
declare function __type_spec__(...references: any[]): any
declare function __type_spec_all__(...references: any[]): any
declare function __type_matches__(specification: any, value: any): boolean
declare function __type_label__(specification: any): string
declare function __argument_typed__(value: any, expectedType: any): boolean

declare function __sizeof__(value: any): number
declare function __is_empty__(value: any): boolean
declare function __copyof__(value: any): any
declare function __intdiv__(a: number, b: number): number
declare function __match_eq__(subject: any, pattern: any): boolean
declare function __lock_object__<T>(value: T): T

declare function __handle_sync_error__(error: any): void
declare function __handle_async_error__(error: any): void
declare function __html__(...args: any[]): any
declare function __flush_events__(...args: any[]): any
declare function htmlToVdom(...args: any[]): any

declare class StructError extends Error {}
declare class StructPassedError extends Error {}
declare class StructExpectError extends Error {}
declare class ArgumentDeclarationTypeError extends Error {}
