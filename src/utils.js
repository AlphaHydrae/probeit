const { has, isArray, isFinite, isInteger, isPlainObject, uniq, values } = require('lodash');
const moment = require('moment');

const METRIC_TYPES = {
  boolean: {
    description: 'true or false',
    validate: v => typeof v === 'boolean'
  },
  bytes: {
    description: 'an integer greater than or equal to zero',
    validate: v => isInteger(v) && v >= 0
  },
  datetime: {
    description: 'a date in ISO-8601 format',
    validate: v => moment(v).isValid()
  },
  number: {
    description: 'a number with no associated unit of measurement',
    validate: isFinite
  },
  quantity: {
    description: 'an integer greater than or equal to zero representing an amount of something',
    validate: v => isInteger(v) && v >= 0
  },
  seconds: {
    description: 'a number greater than or equal to zero',
    validate: v => isFinite(v) && v >= 0
  }
};

exports.buildMetric = function(name, type, value, description, tags = {}) {
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
  } else if (values(tags).some(tag => String(tag).match(/"/))) {
    throw new Error(`Metric tag values must not contain double quotes (${JSON.stringify(tags)})`);
  }

  return {
    description,
    name,
    tags,
    type,
    value
  };
};

exports.compareMetrics = function(a, b) {

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
};

exports.parseBooleanQueryParam = function(value, defaultValue = false) {
  return typeof value === 'string' ? !!value.match(/^1|y|yes|t|true$/i) : defaultValue;
};

exports.parseHttpParamsQueryParam = function(value, defaultValue = {}) {

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
};

exports.promisified = function(nodeStyleFunc, context, ...args) {
  return exports.promisify(nodeStyleFunc, context)(...args);
};

exports.promisify = function(nodeStyleFunc, context) {
  return (...args) => new Promise((resolve, reject) => {
    nodeStyleFunc.call(context, ...args, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

exports.toArray = function(value) {
  if (value === undefined) {
    return [];
  }

  return isArray(value) ? value : [ value ];
};

exports.increase = function(counters, key, by) {
  counters[key] = (counters[key] || 0) + by;
};

function appendHttpParam(params, key, value) {
  const previous = params[key] || [];
  params[key] = [ ...previous, value ];
}
