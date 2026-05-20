/// <reference types="node" />
/// <reference types="node" />
export declare const subtleCrypto: SubtleCrypto;
/**
 * Converts different types to Uint8Array.
 *
 * @param value - Value to convert. Strings are parsed as hex.
 * @param format - Format of value. Valid options: 'hex'. Defaults to utf-8.
 * @returns Value in Uint8Array form.
 */
export declare function valueToUint8Array(value: Uint8Array | ArrayBuffer | Buffer | string, format?: string): Uint8Array;
/**
 * Merge two arrays.
 *
 * @param arr1 - First array
 * @param arr2 - Second array
 * @returns Concatenated arrays
 */
export declare function concatUint8Arrays(arr1: Uint8Array, arr2: Uint8Array): Uint8Array;
