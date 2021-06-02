type ValueOf<T> = T[keyof T];
type Falsy = false | '' | 0 | null | undefined;
type NonNullable<T> = Exclude<T, null | undefined>;
type Primitive = string | number | bigint | boolean | symbol | null | undefined;
type Nullish = null | undefined;

type JSONValue =
  | null
  | string
  | number
  | boolean
  | {
      [K in string]?: JSONValue;
    }
  | JSONValue[];

interface JSON {
  /**
   * Converts a JavaScript Object Notation (JSON) string into an object.
   * @param text A valid JSON string.
   * @param reviver A function that transforms the results. This function is called for each member of the object.
   * If a member contains nested objects, the nested objects are transformed before the parent object is.
   */
  parse(text: string, reviver?: (this: JSONValue, key: string, value: JSONValue) => any): JSONValue;
  /**
   * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
   * @param value A JavaScript value, usually an object or array, to be converted.
   * @param replacer A function that transforms the results.
   * @param space Adds indentation, white space, and line break characters to the return-value JSON text to make it easier to read.
   */
  stringify(
    value: JSONValue,
    replacer?: (this: JSONValue, key: string, value: JSONValue) => any,
    space?: string | number,
  ): string;
  /**
   * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
   * @param value A JavaScript value, usually an object or array, to be converted.
   * @param replacer An array of strings and numbers that acts as a approved list for selecting the object properties that will be stringified.
   * @param space Adds indentation, white space, and line break characters to the return-value JSON text to make it easier to read.
   */
  stringify(
    value: JSONValue,
    replacer?: (number | string)[] | null,
    space?: string | number,
  ): string;
}
