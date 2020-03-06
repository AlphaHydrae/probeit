import { readFile } from 'fs-extra';
import { safeLoad as parseYaml } from 'js-yaml';
import { has, isArray, isFinite, isInteger, isPlainObject, isString, merge, uniq } from 'lodash';
import nativeRequire from 'native-require';
import { extname, resolve as resolvePath } from 'path';

import { ProbeOptionError } from './errors';
import { Metric } from './metrics';
import { FunctionCommand, ProbeCommand, SystemCommand } from './probes/command';

export interface Failure {
  [key: string]: any;
  actual?: any;
  cause: string;
  description: string;
  expected?: any;
}

export interface HttpParams {
  [key: string]: string[];
}

export interface ProbeResult {
  failures: Failure[];
  metrics: Metric[];
  success: boolean;
}

export type Raw<T> = { [K in keyof T]?: any };

export async function compactResolved<T = any>(...values: Array<T | Promise<T | undefined> | undefined>): Promise<T[]> {
  return (await Promise.all(values)).filter(value => value !== undefined) as T[];
}

export function compareMetrics(a: Metric, b: Metric) {

  const nameComparison = a.name.localeCompare(b.name);
  if (nameComparison !== 0) {
    return nameComparison;
  }

  const tagNames = uniq([ ...Object.keys(a.tags), ...Object.keys(b.tags) ]).sort();
  for (const tagName of tagNames) {
    if (has(a.tags, tagName) && !has(b.tags, tagName)) {
      return -1;
    } else if (!has(a.tags, tagName) && has(b.tags, tagName)) {
      return 1;
    } else {
      const tagValueComparison = String(a.tags[tagName]).localeCompare(b.tags[tagName]);
      if (tagValueComparison !== 0) {
        return tagValueComparison;
      }
    }
  }

  return 0;
}

export async function firstResolved<T = any>(...values: Array<T | Promise<T | undefined> | undefined>): Promise<T | undefined> {
  return (await Promise.all(values)).find(value => value !== undefined);
}

export function increase(counters: { [key: string]: number | undefined }, key: string, by: number) {
  counters[key] = counters[key] ?? 0 + by;
}

export function isFalseString(value: any): boolean {
  return typeof value === 'string' && !!(/^(0|n|no|f|false)$/i).exec(value);
}

export function isTrueString(value: any): boolean {
  return typeof value === 'string' && !!(/^(1|y|yes|t|true)$/i).exec(value);
}

export async function loadConfig(file: string) {
  if (/\.js$/.exec(file)) {
    const config = nativeRequire(resolvePath(file));
    return typeof config === 'function' ? config() : config;
  } else if (/\.json$/.exec(file)) {
    return JSON.parse(await readFile(file, 'utf8'));
  } else if (/\.ya?ml$/.exec(file)) {
    return parseYaml(await readFile(file, 'utf8'));
  } else {
    throw new Error(`Unknown config file extension "${extname(file)}"; must be ".json" or ".yml"`);
  }
}

export async function parseAsyncParam<T>(value: T | string | Promise<T | string | undefined> | undefined, parser: (value: T | string | undefined, defaultValue?: T) => T | undefined, defaultValue?: T): Promise<T | undefined> {
  return parser(await value, defaultValue);
}

// TODO: check if these parse* functions are still used (also in probes)
export function parseBooleanParam(value: boolean | string | undefined, defaultValue?: boolean): boolean | undefined {
  if (value === undefined) {
    return defaultValue;
  }

  return typeof value === 'boolean' ? value : !!(/^1|y|yes|t|true$/i).exec(String(value));
}

export function parseHttpParams(value: string | string[] | undefined): HttpParams {
  if (value === undefined) {
    return {};
  } else if (typeof value === 'string') {
    const [ paramName, paramValue ] = value.split('=', 2);
    return { [paramName]: [ paramValue ] };
  } else if (isArray(value)) {
    return value.reduce((memo, singleValue) => merge(memo, parseHttpParams(singleValue)), {});
  } else {
    throw new Error('HTTP parameter must be a string or an array of strings');
  }
}

export function parseIntegerParam(value: number | string | undefined, defaultValue?: number): number | undefined {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = typeof value === 'number' ? value : parseInt(value, 10);
  if (!isInteger(parsed)) {
    throw new Error(`${value} is not a valid integer`);
  }

  return parsed;
}

export function promisified<T>(nodeStyleFunc: (...args: any[]) => any, ...args: any[]) {
  return promisify<T>(nodeStyleFunc)(...args);
}

export function promisify<T>(nodeStyleFunc: (...args: any[]) => any) {
  return (...args: any[]): Promise<T> => new Promise((resolve, reject) => {
    nodeStyleFunc(...args, (err: Error, result: T) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

export function toArray<T>(value: T | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return isArray(value) ? value : [ value ];
}

export function validateArrayOption<T, O extends Record<string, any>, K extends keyof O>(options: O, name: K, description: string, validator: (value: any) => boolean): T[] | undefined {

  const value = options[name];
  if (value === undefined) {
    return;
  } else if (!isArray(value)) {
    throw new ProbeOptionError(`"${name}" option must be an array of ${description}; got ${typeof value}`);
  } else if (!value.every(validator)) {
    throw new ProbeOptionError(`"${name}" option must be an array of ${description} but it contains other types: ${value.map((v: any) => typeof v)}`);
  }

  return value;
}

export function validateCommand(command: any, name: string): ProbeCommand {
  if (!isPlainObject(command)) {
    throw new ProbeOptionError(`Command "${name}" must be a plain object; got ${typeof command}`);
  } else if (command.type === 'function') {
    return validateFunctionCommand(command, name);
  } else if (command.type === 'system') {
    return validateSystemCommand(command, name);
  } else {
    throw new ProbeOptionError(`Command "${name}" must have a "type" property with the value "function" or "system"; got ${JSON.stringify(command.type)}`);
  }
}

export function validateFunctionCommand(command: any, name: string): FunctionCommand {
  if (typeof command.command !== 'function') {
    throw new ProbeOptionError(`Command "${name}" must have a "command" property that is a function; got ${typeof command.command}`);
  }

  return command;
}

export function validateSystemCommand(command: any, name: string): SystemCommand {
  if (typeof command.command !== 'string') {
    throw new ProbeOptionError(`Command "${name}" must have a "command" property that is a string; got ${typeof command.command}`);
  } else if (command.args !== undefined && !isArray(command.args)) {
    throw new ProbeOptionError(`The "args" property of command "${name}" must be an array; got ${typeof command.args}`);
  } else if (isArray(command.args) && command.args.some((arg: any) => typeof arg !== 'string')) {
    throw new ProbeOptionError(`The "args" array of command "${name}" must contain only strings`);
  } else if (command.cwd !== undefined && typeof command.cwd !== 'string') {
    throw new ProbeOptionError(`The "cwd" property of command "${name}" must be a string; got ${typeof command.cwd}`);
  }

  return command;
}

export function validateBooleanOption<O, K extends keyof O>(options: O, name: K): boolean | undefined {
  const value = options[name];
  if (value === undefined) {
    return;
  } else if (typeof value === 'boolean') {
    return value;
  } else if (isFalseString(value)) {
    return false;
  } else if (isTrueString(value)) {
    return true;
  } else {
    throw new ProbeOptionError(`"${name}" option must be a boolean or a boolean-like string (1/0, y/n, yes/no, t/f or true/false); got ${typeof value}`);
  }
}

export function validateNumericOption<O, K extends keyof O>(options: O, name: K, integer: boolean, min?: number, max?: number): number | undefined {

  const value = options[name];
  if (value === undefined) {
    return;
  } else if (typeof value !== 'number' && typeof value !== 'string') {
    throw new ProbeOptionError(`"${name}" option must be a number or a numeric string; got ${typeof value}`);
  }

  const n = Number(value);
  if (!isFinite(n)) {
    throw new ProbeOptionError(`"${name}" option must be a number or a numeric string; got ${value} (type ${typeof value})`);
  } else if (integer && !isInteger(n)) {
    throw new ProbeOptionError(`"${name}" option must be an integer; got ${value}`);
  } else if (min !== undefined && n < min) {
    throw new ProbeOptionError(`"${name}" option must be greater than or equal to ${min}; got ${value}`);
  } else if (max !== undefined && n > max) {
    throw new ProbeOptionError(`"${name}" option must be smaller than or equal to ${max}; got ${value}`);
  }

  return n;
}

export function validateRegExpArrayOption<O extends Record<string, any>, K extends keyof O>(options: O, name: K): string[] | undefined {
  return validateArrayOption(options, name, 'regular expressions', v => {
    try {
      return new RegExp(v) !== undefined;
    } catch (_) {
      throw new ProbeOptionError(`Value ${JSON.stringify(v)} of option "${name}" is not a valid regular expression`);
    }
  });
}

export function validateStringArrayOption<O extends Record<string, any>, K extends keyof O>(options: O, name: K): string[] | undefined {
  return validateArrayOption(options, name, 'strings', isString);
}

export function validateStringOption<O, K extends keyof O>(options: O, name: K): string | undefined {

  const value = options[name];
  if (value === undefined) {
    return;
  } else if (typeof value !== 'string') {
    throw new ProbeOptionError(`"${name}" option must be a string; got ${typeof value}`);
  }

  return value;
}
