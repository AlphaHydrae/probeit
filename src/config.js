const { readFile } = require('fs-extra');
const { has, isInteger, merge } = require('lodash');
const log4js = require('log4js');

const { loadConfig } = require('./utils');

const defaultConfigFile = 'config.json';

exports.load = async function(fromArgs) {

  const fromEnvironment = {
    awsAccessKeyId: firstResolvedValue(getEnv('PROBE_AWS_ACCESS_KEY_ID'), getEnv('AWS_ACCESS_KEY_ID')),
    awsSecretAccessKey: firstResolvedValue(getEnv('PROBE_AWS_SECRET_ACCESS_KEY'), getEnv('AWS_SECRET_ACCESS_KEY')),
    config: getEnv('PROBE_CONFIG'),
    logLevel: getEnv('PROBE_LOG_LEVEL'),
    port: firstResolvedValue(parseConfigInt(getEnv('PROBE_PORT')), parseConfigInt(getEnv('PORT'))),
    presets: getEnv('PROBE_PRESETS')
  };

  const fromFilePromise = loadConfigFile(fromArgs.config || await fromEnvironment.config || defaultConfigFile, !fromArgs.config && !fromEnvironment.config);

  const fromEnvironmentKeys = Object.keys(fromEnvironment);
  const fromEnvironmentValues = fromEnvironmentKeys.map(k => fromEnvironment[k]);

  const resolved = await Promise.all([ fromFilePromise, ...fromEnvironmentValues ]);
  const fromFile = resolved.shift();

  for (let i = 0; i < fromEnvironmentKeys.length; i++) {
    fromEnvironment[fromEnvironmentKeys[i]] = resolved[i];
  }

  const defaults = {
    logLevel: 'INFO',
    port: 3000,
    presets: 'presets/**/*.@(json|yml)'
  };

  const config = validateConfig(merge(
    {},
    validateConfig(defaults, false),
    validateConfig(fromFile, false),
    validateConfig(fromEnvironment, false),
    validateConfig(fromArgs, false)
  ));

  config.getLogger = createLoggerFactory(config);

  return config;
};

function createLoggerFactory(config) {
  return function(name) {
    const logger = log4js.getLogger(name);
    logger.level = config.logLevel;
    return logger;
  };
}

async function firstResolvedValue(...values) {
  return (await Promise.all(values)).find(value => value !== undefined);
}

function getEnv(varName) {
  if (has(process.env, varName)) {
    return process.env[varName];
  }

  const fileVarName = `${varName}_FILE`;
  if (!has(process.env, fileVarName)) {
    return undefined;
  }

  return readFile(process.env[fileVarName], 'utf8').trim();
}

async function loadConfigFile(file, optional) {
  try {
    return await loadConfig(file);
  } catch (err) {
    if (err.code === 'ENOENT' && optional) {
      return {};
    } else if (err.code === 'ENOENT') {
      throw new Error(`Configuration file "${file}" does not exist`);
    } else {
      throw err;
    }
  }
}

async function parseConfigInt(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = parseInt(await value, 10);
  if (!isInteger(parsed)) {
    throw new Error(`${value} is not a valid integer`);
  }

  return parsed;
}

function validateConfig(config) {
  return config;
}
