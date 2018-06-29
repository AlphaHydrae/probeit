import { readFile } from 'fs-extra';
import { has, isInteger, merge, pick } from 'lodash';
import { getLogger, Logger } from 'log4js';

import { HttpProbeOptions } from './probes/http';
import { S3ProbeOptions } from './probes/s3';
import { loadConfig } from './utils';

const defaultConfigFile = 'config.yml';

export interface Config extends HttpProbeOptions, S3ProbeOptions {
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  config?: string;
  logLevel?: string;
  port?: number;
  presets?: string;
  pretty?: boolean;
  getLogger(name: string): Logger;
}

export async function load(options: Partial<Config> = {}): Promise<Config> {

  const fromEnvironment = {
    awsAccessKeyId: firstResolvedValue(getEnv('PROBE_AWS_ACCESS_KEY_ID'), getEnv('AWS_ACCESS_KEY_ID')),
    awsSecretAccessKey: firstResolvedValue(getEnv('PROBE_AWS_SECRET_ACCESS_KEY'), getEnv('AWS_SECRET_ACCESS_KEY')),
    config: getEnv('PROBE_CONFIG'),
    logLevel: getEnv('PROBE_LOG_LEVEL'),
    port: firstResolvedValue(getEnv('PROBE_PORT'), getEnv('PORT')).then(parseConfigInt),
    presets: getEnv('PROBE_PRESETS'),
    pretty: getEnv('PROBE_PRETTY')
  };

  const fromFilePromise = loadConfigFile(options.config || await fromEnvironment.config || defaultConfigFile, !options.config && !fromEnvironment.config);

  const fromEnvironmentKeys = Object.keys(fromEnvironment);
  const fromEnvironmentValues = fromEnvironmentKeys.map(k => fromEnvironment[k]);

  const resolved = await Promise.all([ fromFilePromise, ...fromEnvironmentValues ]);
  const fromFile = resolved.shift();

  const resolvedFromEnvironment = fromEnvironmentKeys.reduce((memo, key, i) => ({ ...memo, [key]: resolved[i] }), {});

  const defaults = {
    logLevel: 'INFO',
    port: 3000,
    presets: 'presets/**/*.@(json|yml)'
  };

  const config = merge(
    {},
    validatePartialConfig(defaults),
    validatePartialConfig(fromFile),
    validatePartialConfig(resolvedFromEnvironment),
    validatePartialConfig(options)
  );

  config.getLogger = createLoggerFactory(config);

  if (validateConfig(config)) {
    return config;
  } else {
    throw new Error('Configuration is invalid');
  }
}

export { whitelistConfig as whitelist };

function createLoggerFactory(config: Partial<Config>) {
  return function(name: string) {
    const logger = getLogger(name);
    logger.level = config.logLevel || 'INFO';
    return logger;
  };
}

async function firstResolvedValue<T = any>(...values: Array<T | Promise<T | undefined> | undefined>): Promise<T | undefined> {
  return (await Promise.all(values)).find(value => value !== undefined);
}

function getEnv(varName: string): string | Promise<string> | undefined {
  if (has(process.env, varName)) {
    return process.env[varName];
  }

  const fileVarName = `${varName}_FILE`;
  const file = process.env[fileVarName];
  if (file === undefined) {
    return;
  }

  return readFile(file, 'utf8').then(contents => contents.trim());
}

async function loadConfigFile(file: string, optional: boolean) {
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

async function parseConfigInt(value: string | undefined, defaultValue?: number | null) {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = parseInt(await value, 10);
  if (!isInteger(parsed)) {
    throw new Error(`${value} is not a valid integer`);
  }

  return parsed;
}

function validatePartialConfig(config: Partial<Config>): Partial<Config> {
  return config;
}

function validateConfig(config: Partial<Config>): config is Config {
  return config !== undefined;
}

function whitelistConfig<T extends object = any>(config: T): Partial<Config> {
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
