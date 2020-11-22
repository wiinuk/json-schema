/* eslint-disable @typescript-eslint/no-explicit-any */
import { Failure, JsonSchema, JsonSchemaOrRef, JsonSchemaRef, parseDefinitionOrRef, ParseFileOptions, Result, Success, tryDeepGet, unionToTuple } from "./json"
import { parseJsonPointer } from "./pointer"

type Key = string
type Path = readonly Key[]
type cast<t, u> = t extends u ? t : never

interface PointerReferenceFieldMapping {
    fieldId: string | null
    pathToDefinition: string[]
}
/** @internal */
export interface PointerReference<
    TFileId extends PointerReferenceFieldMapping["fieldId"],
    TPathToDefinition extends PointerReferenceFieldMapping["pathToDefinition"]
> {
    kind: "pointer"
    fileId: TFileId
    pathToDefinition: TPathToDefinition
}
/** @internal */
export interface IdReference<TId extends string> {
    kind: "id"
    id: TId
}
/** @internal */
export type Reference =
    | PointerReference<PointerReferenceFieldMapping["fieldId"], PointerReferenceFieldMapping["pathToDefinition"]>
    | IdReference<string>

export type ParseSchemaStringOptions = {
    source: string
    sourcePath: Path
}

/** @internal */
export type parseReference<source extends string, pathToSource extends Path> =
    // /^.*?#\/.*$/
    source extends `${infer file}#/${infer rest}` ?
        parseJsonPointer<`/${rest}`, `${file}#`, { source: source, sourcePath: pathToSource }> extends infer result ?
            result extends Success<infer pointer> ?
                Success<PointerReference<(file extends "" ? null : file), cast<pointer, string[]>>> :
            result :
        never :

    // /^.*?#$/
    source extends `${infer file}#` ?
        Success<PointerReference<(file extends "" ? null : file), cast<[], string[]>>> :

    Success<IdReference<source>>

type ResolveReferenceResult<
    definitionOrRef extends JsonSchemaOrRef,
    fileName extends Key,
    pathToDefinition extends Path
> = {
    definitionOrRef: definitionOrRef
    fileName: fileName
    pathToDefinition: pathToDefinition
}

interface ResolveReferenceOptions extends ParseFileOptions {
    pathToElement: Path
}

type resolvePointerReference<pointer extends PointerReference<string | null, string[]>, options extends ResolveReferenceOptions> =
    (pointer["fileId"] extends string ? pointer["fileId"] : options["currentFileName"]) extends infer fileId ?
        fileId extends keyof options["schemas"] & string ?
            tryDeepGet<
                options["schemas"][fileId],
                pointer["pathToDefinition"],
                options["pathToElement"]
            > extends infer result ?
                result extends Success<infer definitionOrRef> ?
                    Success<ResolveReferenceResult<
                        definitionOrRef,
                        fileId,
                        [fileId, ...pointer["pathToDefinition"]]
                    >> :
                result :
            never :
        Failure<`The file '${cast<fileId, Key>}' was not found.`, options["pathToElement"]> :
    never

interface ResolveIdOptions {
    id: string
    baseId: string
    error: Failure<string, Path>
    currentFileName: string
}

type matchId<baseId extends string, definitionId extends JsonSchema["id"], targetId extends string> =
    definitionId extends string ?
        targetId extends `${baseId}${definitionId}` ?
            true :
        false :
    false

type resolveId<current, path extends Path, options extends ResolveIdOptions> =
    current extends JsonSchemaOrRef ?
        resolveIdFromDefinition<current, path, options> :
    options["error"]

type resolveIdFromDefinitionDescendants<current extends JsonSchema, path extends Path, options extends ResolveIdOptions> =
    resolveIdFromDefinitions<
        current["definitions"],
        cast<unionToTuple<keyof current["definitions"]>, (keyof current["definitions"])[]>,
        [...path, "definitions"],
        options
    > extends infer result ?
        result extends Success<unknown> ? result : options["error"] :
    options["error"]

type resolveIdFromDefinitions<current, keys extends (keyof current)[], path extends Path, options extends ResolveIdOptions> =
    keys extends [infer key, ...infer restKeys] ?
        resolveId<current[cast<key, keyof current>], [...path, cast<key, Key>], options> extends infer result ?
            result extends Success<any> ? result :
            resolveIdFromDefinitions<current, cast<restKeys, (keyof current)[]>, path, options> :
        never :
    options["error"]

type resolveIdFromDefinition<current extends JsonSchemaOrRef, path extends Path, options extends ResolveIdOptions> =
    matchId<options["baseId"], current["id"], options["id"]> extends true ?
        Success<ResolveReferenceResult<
            current,
            options["currentFileName"],
            path
        >> :

    current extends JsonSchema ?
        resolveIdFromDefinitionDescendants<
            current,
            path,
            options
        > :
    options["error"]

type resolveIdReference<id extends IdReference<string>, options extends ResolveReferenceOptions> =
    resolveId<
        options["schemas"][options["currentFileName"]],
        [],
        {
            id: id["id"],
            baseId: "",
            error: Failure<`The ID '${id["id"]}' was not found.`, options["pathToElement"]>,
            currentFileName: options["currentFileName"],
        }
    >

type resolveReference<result extends Result<Reference>, options extends ResolveReferenceOptions> =
    result extends Success<infer reference> ?
        reference extends PointerReference<any, any> ? resolvePointerReference<reference, options> :
        reference extends IdReference<any> ? resolveIdReference<reference, options> :
        Failure<`unreachable: reference extends (PointerReference | IdReference)`, options["pathToDefinition"]> :
    result

/** @internal */
export type parseRef<ref extends JsonSchemaRef, options extends ParseFileOptions> =
    resolveReference<
        parseReference<ref["$ref"], [...options["pathToDefinition"], "$ref"]>,
        {
            schemas: options["schemas"],
            currentFileName: options["currentFileName"],
            pathToDefinition: options["pathToDefinition"],
            pathToElement: [...options["pathToDefinition"], "$ref"],
        }
    > extends infer result ?
        result extends Success<ResolveReferenceResult<
            infer definitionOrRef,
            infer fileName,
            infer pathToDefinition
        >> ?
            parseDefinitionOrRef<definitionOrRef, options["schemas"], fileName, pathToDefinition> :
        result :
    never
