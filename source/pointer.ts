import { Failure, Success } from "./json"
import { ParseSchemaStringOptions } from "./ref"

type cast<t, u> = t extends u ? t : never
type chars<s extends string> =
    s extends `` ? [] :
    s extends `${infer c0}${infer cs}` ? [c0, ...chars<cs>] :
    never

type stringLength<s extends string> = chars<s>["length"]

type EscapeCodeToChar = { "0": "~", "1": "/" }
type EscapeCode = keyof EscapeCodeToChar

type escapedCharRest<escapeCode extends EscapeCode, unescaped extends string, remaining extends string, consumed extends string, options extends ParseSchemaStringOptions> =
    referenceToken<remaining, `${consumed}${unescaped}~${escapeCode}`, options> extends infer result ?
        result extends string ?
            `${unescaped}${EscapeCodeToChar[escapeCode]}${result}` :
        result :
    never

/** @return {string|Failure} */
type referenceToken<remaining extends string, consumed extends string, options extends ParseSchemaStringOptions> =
    remaining extends `${infer unescaped}~${infer rest0}` ?
        rest0 extends `0${infer rest}` ? escapedCharRest<'0', unescaped, rest, consumed, options> :
        rest0 extends `1${infer rest}` ? escapedCharRest<'1', unescaped, rest, consumed, options> :
        Failure<
            `An error occurred at index ${
                cast<stringLength<`${consumed}${unescaped}`>, number>} on '${options["source"]
            }'. Requires '~0' or '~1'. '~0' is converted to '~'. '~1' is converted to '/'.`,
            options["sourcePath"]
        > :
    remaining

type jsonPointerRest<remaining extends string, consumed extends string, options extends ParseSchemaStringOptions> =

    // /^[^/]*\//
    remaining extends `${infer head}/${infer rest}` ?
        referenceToken<head, consumed, options> extends infer headResult ?
            headResult extends string ?
                jsonPointerRest<rest, `${consumed}${head}/`, options> extends infer restResult ?
                    restResult extends Success<infer restTokens> ?
                        Success<[headResult, ...cast<restTokens, string[]>]> :
                    restResult :
                never :
            headResult :
        never :

    // /^[^/]*/
    referenceToken<remaining, consumed, options> extends infer result ?
        result extends string ? Success<[result]> :
        result :

    never

/**
 * @returns {import("./json").Result<string[]>}
 */
export type parseJsonPointer<remaining extends string, consumed extends string, options extends ParseSchemaStringOptions> =
    remaining extends `` ? Success<[]> :
    remaining extends `/${infer rest}` ? jsonPointerRest<rest, `${consumed}/`, options> :
    Failure<
        `An error occurred at index ${stringLength<consumed>} on '${options["source"]
        }'. A '/' is required at the beginning of a non-empty JSON pointer.`,
        options["sourcePath"]
    >
