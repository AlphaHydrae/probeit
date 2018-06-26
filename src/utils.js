const { isArray } = require('lodash');

exports.buildMetric = function(value, type, description) {
  return {
    description,
    type,
    value
  };
};

exports.buildMapMetric = function(value, mapKey, mapType, description) {
  return {
    description,
    mapKey,
    mapType,
    type: 'map',
    value
  };
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
