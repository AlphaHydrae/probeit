import { readFile } from 'fs-extra';
import { merge, pick } from 'lodash';

import { LoggerOptions, LogLevel, validateLogLevelOption } from './logger';
import { HttpProbeOptions, parseExpectHttpRedirects, validateHttpProbeOptions } from './probes/http';
import { S3ProbeOptions, validateS3ProbeOptions } from './probes/s3';
import { compactResolved, firstResolved, loadConfig, parseAsyncParam, parseBooleanParam, parseHttpParams, parseIntegerParam, validateBooleanOption, validateNumericOption, validateStringOption } from './utils';

const defaultConfigFile = 'config.yml';

type ConfigValue<T> = T | Promise<T | undefined> | undefined;

export interface GeneralOptions {
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
}

export interface Config extends GeneralOptions, HttpProbeOptions, LoggerOptions, S3ProbeOptions {
  config?: string;
  port?: number;
  presets?: string;
  pretty?: boolean;
}

export async function load(options: Partial<Config> = {}): Promise<Config> {

  const fromEnvironment = {
    // General options
    awsAccessKeyId: firstResolved(getEnv('PROBE_AWS_ACCESS_KEY_ID'), getEnv('AWS_ACCESS_KEY_ID')),
    awsSecretAccessKey: firstResolved(getEnv('PROBE_AWS_SECRET_ACCESS_KEY'), getEnv('AWS_SECRET_ACCESS_KEY')),
    config: getEnv('PROBE_CONFIG'),
    logLevel: getEnv('PROBE_LOG_LEVEL'),
    port: parseAsyncParam(firstResolved(getEnv('PROBE_PORT'), getEnv('PORT')), parseIntegerParam),
    presets: getEnv('PROBE_PRESETS'),
    pretty: getEnv('PROBE_PRETTY'),
    // HTTP probe parameters
    allowUnauthorized: parseAsyncParam(getEnv('PROBE_ALLOW_UNAUTHORIZED'), parseBooleanParam),
    followRedirects: parseAsyncParam(getEnv('PROBE_FOLLOW_REDIRECTS'), parseBooleanParam),
    headers: Promise.resolve(getEnv('PROBE_HEADER')).then(parseHttpParams),
    method: getEnv('PROBE_METHOD'),
    // HTTP probe expectations
    expectHttpRedirects: parseAsyncParam(getEnv('PROBE_EXPECT_HTTP_REDIRECTS'), parseExpectHttpRedirects),
    expectHttpRedirectTo: getEnv('PROBE_EXPECT_HTTP_REDIRECT_TO'),
    expectHttpResponseBodyMatch: compactResolved(getEnv('PROBE_HTTP_RESPONSE_BODY_MATCH')),
    expectHttpResponseBodyMismatch: compactResolved(getEnv('PROBE_HTTP_RESPONSE_BODY_MISMATCH')),
    expectHttpSecure: parseAsyncParam(getEnv('PROBE_EXPECT_HTTP_SECURE'), parseBooleanParam),
    expectHttpStatusCode: getEnv('PROBE_EXPECT_HTTP_STATUS_CODE'),
    expectHttpVersion: getEnv('PROBE_EXPECT_HTTP_VERSION'),
    // S3 probe parameters
    s3AccessKeyId: getEnv('PROBE_S3_ACCESS_KEY_ID'),
    s3SecretAccessKey: getEnv('PROBE_S3_SECRET_ACCESS_KEY'),
    s3ByPrefix: compactResolved(getEnv('PROBE_S3_BY_PREFIX')),
    s3Versions: parseAsyncParam(getEnv('PROBE_S3_VERSIONS'), parseBooleanParam)
  };

  const fromFilePromise = loadConfigFile(options.config || await fromEnvironment.config || defaultConfigFile, !options.config && !fromEnvironment.config);

  const fromEnvironmentKeys = Object.keys(fromEnvironment);
  const fromEnvironmentValues = fromEnvironmentKeys.map(k => fromEnvironment[k]);

  const resolved = await Promise.all([ fromFilePromise, ...fromEnvironmentValues ]);
  const fromFile = resolved.shift();

  const resolvedFromEnvironment = fromEnvironmentKeys.reduce((memo, key, i) => ({ ...memo, [key]: resolved[i] }), {});

  const defaults = {
    logLevel: 'info' as LogLevel,
    port: 3000,
    presets: 'presets/**/*.@(json|yml)'
  };

  const config = merge(
    {},
    validateConfig(defaults),
    validateConfig(fromFile),
    validateConfig(resolvedFromEnvironment),
    validateConfig(options)
  );

  return validateConfig(config);
}

export { whitelistConfig as whitelist };

function getEnv(varName: string): ConfigValue<string> {
  if (process.env[varName] !== undefined) {
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

function validateConfig(config: Partial<Config>): Config {
  validateStringOption(config, 'awsAccessKeyId');
  validateStringOption(config, 'awsSecretAccessKey');
  validateStringOption(config, 'config');
  validateNumericOption(config, 'port', true, 0, 65535);
  validateStringOption(config, 'presets');
  validateBooleanOption(config, 'pretty');
  validateLogLevelOption(config);
  validateHttpProbeOptions(config);
  validateS3ProbeOptions(config);
  return config;
}

function whitelistConfig<T extends object = any>(config: T): Partial<Config> {
  return pick(
    config,
    // General options
    'awsAccessKeyId', 'awsSecretAccessKey',
    'config', 'logLevel', 'port', 'presets', 'pretty',
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
