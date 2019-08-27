import aws from 'aws-sdk';
import { Context } from 'koa';
import { assign, last, merge, pick } from 'lodash';
import moment from 'moment';
import { parse as parseUrl } from 'url';

import { Config, GeneralOptions } from '../config';
import { buildMetric, Metric } from '../metrics';
import { getPresetOptions } from '../presets';
import { ProbeResult, promisified, Raw, toArray, validateBooleanOption, validateStringArrayOption, validateStringOption } from '../utils';

const optionNames = [
  's3AccessKeyId', 's3SecretAccessKey',
  's3ByPrefix', 's3Versions'
];

export interface S3ProbeOptions {
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3ByPrefix?: string[];
  s3Versions?: boolean;
}

export async function getS3ProbeOptions(target: string, config: Config, ctx?: Context): Promise<S3ProbeOptions> {

  const s3Url = parseUrl(target);

  const targetOptions = {
    s3AccessKeyId: s3Url.auth ? s3Url.auth.replace(/:.*/, '') : undefined,
    s3SecretAccessKey: s3Url.auth && s3Url.auth.match(/:.+/) ? s3Url.auth.replace(/[^:]+:/, '') : undefined
  };

  const queryDefaults = {};
  const queryOptions = {};
  if (ctx) {
    assign(queryDefaults, {
      awsAccessKeyId: last(toArray(ctx.query.awsAccessKeyId)),
      awsSecretAccessKey: last(toArray(ctx.query.awsSecretAccessKey))
    });

    assign(queryOptions, {
      s3AccessKeyId: last(toArray(ctx.query.s3AccessKeyId)),
      s3SecretAccessKey: last(toArray(ctx.query.s3SecretAccessKey)),
      s3ByPrefix: toArray(ctx.query.s3ByPrefix),
      s3Versions: last(toArray(ctx.query.s3Versions))
    });
  }

  // TODO: use presets from config
  const selectedPresets = [];
  if (ctx) {
    selectedPresets.push(...toArray(ctx.query.preset).map(String));
  }

  const presetOptions = await getPresetOptions(config, selectedPresets);

  const defaultOptions = {
    ...merge(
      getS3ProbeDefaultOptions(config),
      getS3ProbeDefaultOptions(presetOptions),
      getS3ProbeDefaultOptions(queryDefaults)
    )
  };

  // TODO: fix array merge
  return validateS3ProbeOptions(merge(
    {},
    validateS3ProbeOptions(defaultOptions),
    pick(validateS3ProbeOptions(config), ...optionNames),
    pick(validateS3ProbeOptions(presetOptions), ...optionNames),
    validateS3ProbeOptions(queryOptions),
    validateS3ProbeOptions(targetOptions)
  ));
}

export async function probeS3(target: string, options: S3ProbeOptions): Promise<ProbeResult> {

  const s3Url = parseUrl(target);

  const Bucket = s3Url.host;
  const Prefix = s3Url.pathname;
  if (Bucket === undefined) {
    throw new Error('S3 bucket name is required');
  }

  const s3 = new aws.S3({
    accessKeyId: options.s3AccessKeyId,
    secretAccessKey: options.s3SecretAccessKey
  });

  const result = {
    failures: [],
    metrics: [],
    success: false
  };

  const objectsPromise = listAllObjects(s3, { Bucket, Prefix });
  const versionsPromise = options.s3Versions ? listAllObjectVersions(s3, { Bucket, Prefix }) : Promise.resolve([]);

  const [ objects, versions ] = await Promise.all([ objectsPromise, versionsPromise ]);

  const aggregationPrefixes = options.s3ByPrefix || [];
  const globalTags: { [key: string]: string } = {};

  if (aggregationPrefixes.length) {
    globalTags.prefix = '';

    for (const prefix of aggregationPrefixes) {
      const tags = { prefix };
      const matchingObjects = objects.filter((o: any) => o.Key.indexOf(prefix) === 0);
      const matchingVersions = options.s3Versions ? versions.filter((v: any) => v.Key.indexOf(prefix) === 0) : undefined;
      addS3Metrics(result.metrics, tags, matchingObjects, matchingVersions);
    }
  }

  addS3Metrics(result.metrics, globalTags, objects, versions);

  result.success = true;

  return result;
}

export function validateS3ProbeOptions(options: Raw<S3ProbeOptions>): S3ProbeOptions {
  return {
    s3AccessKeyId: validateStringOption(options, 's3AccessKeyId'),
    s3SecretAccessKey: validateStringOption(options, 's3SecretAccessKey'),
    s3ByPrefix: validateStringArrayOption(options, 's3ByPrefix'),
    s3Versions: validateBooleanOption(options, 's3Versions')
  };
}

function addS3Metrics(metrics: Metric[], tags: { [key: string]: string }, objects: any[], versions?: any[]) {

  const objectsSortedByDate = objects.sort((a, b) => a.LastModified.getTime() - b.LastModified.getTime());

  metrics.push(buildMetric(
    's3FirstObjectModificationDate',
    'datetime',
    objectsSortedByDate.length ? moment(objectsSortedByDate[0].LastModified).format() : null,
    'The modification date of the earliest modified object',
    tags
  ));

  metrics.push(buildMetric(
    's3LastObjectModificationDate',
    'datetime',
    objectsSortedByDate.length ? moment(last(objectsSortedByDate).LastModified).format() : null,
    'The modification date of the most recently modified object',
    tags
  ));

  metrics.push(buildMetric(
    's3ObjectsCount',
    'quantity',
    objects.length,
    'Number of objects',
    tags
  ));

  const objectSizes = objects.map(o => o.Size);

  metrics.push(buildMetric(
    's3SmallestObjectSize',
    'bytes',
    objectSizes.length ? Math.min(Number.MAX_SAFE_INTEGER, ...objectSizes) : null,
    'The size of the smallest object in bytes',
    tags
  ));

  metrics.push(buildMetric(
    's3LargestObjectSize',
    'bytes',
    objectSizes.length ? Math.max(0, ...objectSizes) : null,
    'The size of the largest object in bytes',
    tags
  ));

  metrics.push(buildMetric(
    's3ObjectsTotalSize',
    'bytes',
    objects.map(o => Number(o.Size)).reduce((memo, size) => memo + size, 0),
    'Total size of objects',
    tags
  ));

  if (!versions) {
    return;
  }

  const versionsSortedByDate = versions.sort((a, b) => a.LastModified.getTime() - b.LastModified.getTime());

  metrics.push(buildMetric(
    's3FirstObjectVersionModificationDate',
    'datetime',
    versionsSortedByDate.length ? moment(versionsSortedByDate[0].LastModified).format() : null,
    'The modification date of the earliest modified object version',
    tags
  ));

  metrics.push(buildMetric(
    's3LastObjectVersionModificationDate',
    'datetime',
    versionsSortedByDate.length ? moment(last(versionsSortedByDate).LastModified).format() : null,
    'The modification date of the most recently modified object version',
    tags
  ));

  metrics.push(buildMetric(
    's3ObjectVersionsCount',
    'quantity',
    versions.length,
    'Number of object versions',
    tags
  ));
}

function getS3ProbeDefaultOptions(options: GeneralOptions): S3ProbeOptions {
  return {
    s3AccessKeyId: options.awsAccessKeyId,
    s3SecretAccessKey: options.awsSecretAccessKey
  };
}

async function listAllObjects(s3: aws.S3, options: aws.S3.ListObjectsV2Request, objects: any[] = []): Promise<any[]> {

  const res = await promisified<aws.S3.ListObjectsV2Output>(s3.listObjectsV2.bind(s3), options);
  if (res.Contents) {
    objects.push(...res.Contents);

    if (res.IsTruncated && res.StartAfter) {
      return listAllObjects(s3, { ...options, StartAfter: res.StartAfter }, objects);
    }
  }

  return objects;
}

async function listAllObjectVersions(s3: aws.S3, options: aws.S3.ListObjectVersionsRequest, versions: any[] = []): Promise<any[]> {

  const res = await promisified<aws.S3.ListObjectVersionsOutput>(s3.listObjectVersions.bind(s3), options);
  if (res.Versions) {
    versions.push(...res.Versions);

    if (res.IsTruncated && res.NextKeyMarker && res.NextVersionIdMarker) {
      return listAllObjectVersions(s3, { ...options, KeyMarker: res.NextKeyMarker, VersionIdMarker: res.NextVersionIdMarker }, versions);
    }
  }

  return versions;
}
