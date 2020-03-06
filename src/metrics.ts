import { isFinite, isInteger, isPlainObject, values as objectValues } from 'lodash';
import moment from 'moment';

const METRIC_TYPES: { [key: string]: any } = {
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

export interface BaseMetric {
  description: string;
  name: string;
  tags: { [key: string]: string };
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

export function buildMetric(name: string, type: 'datetime', value: string | null, description: string, tags?: { [key: string]: string }): DatetimeMetric;
export function buildMetric(name: string, type: 'boolean', value: boolean | null, description: string, tags?: { [key: string]: string }): BooleanMetric;
export function buildMetric(name: string, type: 'bytes' | 'number' | 'quantity' | 'seconds', value: number | null, description: string, tags?: { [key: string]: string }): NumberMetric;
export function buildMetric(name: string, type: MetricType, value: boolean | number | string | null, description: string, tags: { [key: string]: string } = {}): any {
  if (typeof name !== 'string') {
    throw new Error(`Metric name must be a string, got ${typeof name}`);
  } else if (!/^[a-z0-9]+(?:[A-Z0-9][a-z0-9]+)*$/.exec(name)) {
    throw new Error(`Metric name "${name}" is not in camel-case`);
  } else if (!METRIC_TYPES[type]) {
    throw new Error(`Unknown metric type "${type}"; must be one of the following: ${Object.keys(METRIC_TYPES).map(t => `"${t}"`).join(', ')}`);
  } else if (value !== null && !METRIC_TYPES[type].validate(value)) {
    throw new Error(`Invalid metric value ${JSON.stringify(value)} for type "${type}": must be ${METRIC_TYPES[type].description}`);
  } else if (typeof description !== 'string') {
    throw new Error(`Metric description must be a string, got ${typeof description}`);
  } else if (/^\s*$/.exec(description)) {
    throw new Error('Metric description cannot be blank');
  } else if (!isPlainObject(tags)) {
    throw new Error(`Metric tags must be a plain object, got ${typeof tags}`);
  } else if (Object.keys(tags).some(key => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.exec(key))) {
    throw new Error(`Metric tag keys must contain only letters, digits and underscores, and cannot start with a digit (${Object.keys(tags).sort().join(', ')})`);
  } else if (objectValues(tags).some(tag => typeof tag !== 'boolean' && typeof tag !== 'number' && typeof tag !== 'string')) {
    throw new Error(`Metric tag values must be booleans, numbers or string (${JSON.stringify(tags)})`);
  } else if (objectValues(tags).some(tag => !!/"/.exec(String(tag)))) {
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
