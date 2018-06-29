import { readFile } from 'fs-extra';
import { safeLoad as parseYaml } from 'js-yaml';
import { has, isArray, isFinite, isInteger, isPlainObject, uniq, values } from 'lodash';
import * as moment from 'moment';
import { extname } from 'path';

const METRIC_TYPES = {
  boolean: {
    description: 'true or false',
    validate: (v: any) => typeof v === 'boolean'
  },
  bytes: {
    description: 'an integer greater than or equal to zero',
    validate: (v: any) => isInteger(v) && v >= 0
  },
  datetime: {
    description: 'a date in ISO-8601 format',
    validate: (v: any) => moment(v).isValid()
  },
  number: {
    description: 'a number with no associated unit of measurement',
    validate: isFinite
  },
  quantity: {
    description: 'an integer greater than or equal to zero representing an amount of something',
    validate: (v: any) => isInteger(v) && v >= 0
  },
  seconds: {
    description: 'a number greater than or equal to zero',
    validate: (v: any) => isFinite(v) && v >= 0
  }
};

export interface Failure {
  actual?: any;
  cause: string;
  description: string;
  expected?: any;
}

export interface BaseMetric {
  description: string;
  name: string;
  tags: { [key: string]: string };
  type: string;
  value: boolean | number | string | null;
}

export interface BooleanMetric extends BaseMetric {
  type: 'boolean';
  value: boolean | null;
}

export interface NumberMetric extends BaseMetric {
  type: 'bytes' | 'number' | 'quantity' | 'seconds';
  value: number | null;
}

export interface DatetimeMetric extends BaseMetric {
  type: 'datetime';
  value: string | null;
}

export type Metric = BooleanMetric | DatetimeMetric | NumberMetric;

export type MetricType = 'boolean' | 'bytes' | 'datetime' | 'number' | 'quantity' | 'seconds';

export interface ProbeResult {
  failures: Failure[];
  metrics: Metric[];
  success: boolean;
}

export function buildMetric(name: string, type: 'datetime', value: string | null, description: string, tags?: { [key: string]: string }): DatetimeMetric;
export function buildMetric(name: string, type: 'boolean', value: boolean | null, description: string, tags?: { [key: string]: string }): BooleanMetric;
export function buildMetric(name: string, type: 'bytes' | 'number' | 'quantity' | 'seconds', value: number | null, description: string, tags?: { [key: string]: string }): NumberMetric;
export function buildMetric(name: string, type: MetricType, value: boolean | number | string | null, description: string, tags: { [key: string]: string } = {}): any {
  if (typeof name !== 'string') {
    throw new Error(`Metric name must be a string, got ${typeof name}`);
  } else if (!name.match(/^[a-z0-9]+(?:[A-Z0-9][a-z0-9]+)*$/)) {
    throw new Error(`Metric name "${name}" is not in camel-case`);
  } else if (!METRIC_TYPES[type]) {
    throw new Error(`Unknown metric type "${type}"; must be one of the following: ${Object.keys(METRIC_TYPES).map(t => `"${t}"`).join(', ')}`);
  } else if (value !== null && !METRIC_TYPES[type].validate(value)) {
    throw new Error(`Invalid metric value ${JSON.stringify(value)} for type "${type}": must be ${METRIC_TYPES[type].description}`);
  } else if (typeof description !== 'string') {
    throw new Error(`Metric description must be a string, got ${typeof description}`);
  } else if (description.match(/^\s*$/)) {
    throw new Error('Metric description cannot be blank');
  } else if (!isPlainObject(tags)) {
    throw new Error(`Metric tags must be a plain object, got ${typeof tags}`);
  } else if (Object.keys(tags).some(key => !key.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/))) {
    throw new Error(`Metric tag keys must contain only letters, digits and underscores, and cannot start with a digit (${Object.keys(tags).sort().join(', ')})`);
  } else if (values(tags).some(tag => typeof tag !== 'boolean' && typeof tag !== 'number' && typeof tag !== 'string')) {
    throw new Error(`Metric tag values must be booleans, numbers or string (${JSON.stringify(tags)})`);
  } else if (values(tags).some(tag => !!String(tag).match(/"/))) {
    throw new Error(`Metric tag values must not contain double quotes (${JSON.stringify(tags)})`);
  }

  return {
    description,
    name,
    tags,
    type,
    value
  };
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

export async function loadConfig(file: string) {
  if (file.match(/\.json$/)) {
    return JSON.parse(await readFile(file, 'utf8'));
  } else if (file.match(/\.ya?ml$/)) {
    return parseYaml(await readFile(file, 'utf8'));
  } else {
    throw new Error(`Unknown config file extension "${extname(file)}"; must be ".json" or ".yml"`);
  }
}

export function parseBooleanParam(value: boolean | number | string | undefined, defaultValue: boolean | null = false): boolean | null {
  if (value === undefined) {
    return defaultValue;
  }

  return typeof value === 'boolean' ? value : !!String(value).match(/^1|y|yes|t|true$/i);
}

export function parseHttpParams(value: string | string[] | undefined, defaultValue = {}) {

  const params = {};

  if (value === undefined) {
    return defaultValue;
  } else if (typeof value === 'string') {
    const [ paramName, paramValue ] = value.split('=', 2);
    appendHttpParam(params, paramName, paramValue || '');
  } else if (isArray(value)) {
    for (const singleValue of value) {
      const [ paramName, paramValue ] = String(singleValue).split('=', 2);
      appendHttpParam(params, paramName, paramValue || '');
    }
  } else {
    throw new Error('HTTP parameter must be a string or an array of strings');
  }

  return params;
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

export function increase(counters: { [key: string]: number | undefined }, key: string, by: number) {
  counters[key] = (counters[key] || 0) + by;
}

function appendHttpParam(params: { [key: string]: string[] }, key: string, value: string) {
  const previous = params[key] || [];
  params[key] = [ ...previous, value ];
}
