const { has, isArray, uniq } = require('lodash');

exports.METRIC_TYPES = {
  boolean: 'true or false',
  bytes: 'an integer greater than or equal to zero',
  datetime: 'an date in ISO-8601 format',
  number: 'a numerical value with no associated unit of measurement',
  quantity: 'an integer greater than or equal to zero representing an amount of something',
  seconds: 'an integer greater than or equal to zero'
};

exports.buildMetric = function(name, type, value, description, tags = {}) {
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
