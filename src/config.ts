import { readFile } from 'fs-extra';
import { has, isInteger, merge, pick } from 'lodash';
import * as log4js from 'log4js';

import { loadConfig } from './utils';

const defaultConfigFile = 'config.yml';

exports.load = async function(options = {}) {

  const fromEnvironment = {
    awsAccessKeyId: firstResolvedValue(getEnv('PROBE_AWS_ACCESS_KEY_ID'), getEnv('AWS_ACCESS_KEY_ID')),
    awsSecretAccessKey: firstResolvedValue(getEnv('PROBE_AWS_SECRET_ACCESS_KEY'), getEnv('AWS_SECRET_ACCESS_KEY')),
    config: getEnv('PROBE_CONFIG'),
    logLevel: getEnv('PROBE_LOG_LEVEL'),
    port: firstResolvedValue(parseConfigInt(getEnv('PROBE_PORT')), parseConfigInt(getEnv('PORT'))),
    presets: getEnv('PROBE_PRESETS'),
    pretty: getEnv('PROBE_PRETTY')
  };

  const fromFilePromise = loadConfigFile(options.config || await fromEnvironment.config || defaultConfigFile, !options.config && !fromEnvironment.config);

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
    validateConfig(options, false)
  ));

  config.getLogger = createLoggerFactory(config);

  return config;
};

exports.whitelist = whitelistConfig;

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

function whitelistConfig(config) {
  return pick(
    config,
    // General options
    'awsAccessKeyId', 'awsSecretAccessKey', 'config', 'logLevel', 'port', 'presets', 'pretty',
    // HTTP probe parameters
    'allowUnauthorized', 'followRedirects', 'headers', 'method',
    // HTTP probe expectations
    'expectHttpRedirects', 'expectHttpRedirectTo',
    'expectHttpResponseBodyMatch', 'expectHttpResponseBodyMismatch',
    'expectHttpSecure', 'expectHttpStatusCode', 'expectHttpVersion',
    // S3 probe parameters
    's3AccessKeyId', 's3SecretAccessKey', 's3ByPrefix', 's3Versions'
  );
}
