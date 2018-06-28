const aws = require('aws-sdk');
const { assign, last, merge, pick } = require('lodash');
const moment = require('moment');
const { parse: parseUrl } = require('url');

const { getPresetOptions } = require('../presets');
const { buildMetric, parseBooleanParam, promisified, toArray } = require('../utils');

const optionNames = [
  'awsAccessKeyId', 'awsSecretAccessKey',
  's3AccessKeyId', 's3SecretAccessKey',
  's3ByPrefix', 's3Versions'
];

exports.getS3ProbeOptions = async function(target, config, ctx) {

  const s3Url = parseUrl(target);

  const targetOptions = {
    s3AccessKeyId: s3Url.auth ? s3Url.auth.replace(/:.*/, '') : undefined,
    s3SecretAccessKey: s3Url.auth && s3Url.auth.match(/:.+/) ? s3Url.auth.replace(/[^:]+:/, '') : undefined
  };

  const queryOptions = {};
  if (ctx) {
    assign(queryOptions, {
      s3AccessKeyId: last(toArray(ctx.query.awsAccessKeyId)),
      s3SecretAccessKey: last(toArray(ctx.query.awsSecretAccessKey)),
      s3ByPrefix: toArray(ctx.query.s3ByPrefix).map(prefix => String(prefix)),
      s3Versions: parseBooleanParam(last(toArray(ctx.query.s3Versions)))
    });
  }

  const selectedPresets = [];
  if (ctx) {
    selectedPresets.push(...toArray(ctx.query.preset).map(preset => String(preset)));
  }

  const presetOptions = await getPresetOptions(config, selectedPresets);

  const configOptions = pick(config, ...optionNames);

  const defaultOptions = {
    s3AccessKeyId: config.awsAccessKeyId,
    s3ByPrefix: [],
    s3SecretAccessKey: config.awsSecretAccessKey
  };

  // TODO: validate
  return merge({}, defaultOptions, configOptions, presetOptions, queryOptions, targetOptions);
};

exports.probeS3 = async function(target, options) {

  const s3Url = parseUrl(target);

  const Bucket = s3Url.host;
  const Prefix = s3Url.pathname;

  const s3 = new aws.S3({
    accessKeyId: options.s3AccessKeyId,
    secretAccessKey: options.s3SecretAccessKey
  });

  const result = {
    failures: [],
    metrics: []
  };

  const objectsPromise = listAllObjects(s3, { Bucket, Prefix });
  const versionsPromise = options.s3Versions ? listAllObjectVersions(s3, { Bucket, Prefix }) : Promise.resolve();

  const [ objects, versions ] = await Promise.all([ objectsPromise, versionsPromise ]);

  const aggregationPrefixes = options.s3ByPrefix;
  const globalTags = {};

  if (aggregationPrefixes.length) {
    globalTags.prefix = '';

    for (const prefix of aggregationPrefixes) {
      const tags = { prefix };
      const matchingObjects = objects.filter(o => o.Key.indexOf(prefix) === 0);
      const matchingVersions = options.s3Versions ? versions.filter(v => v.Key.indexOf(prefix) === 0) : undefined;
      addS3Metrics(result.metrics, tags, matchingObjects, matchingVersions);
    }
  }

  addS3Metrics(result.metrics, globalTags, objects, versions);

  result.success = true;

  return result;
};

function addS3Metrics(metrics, tags, objects, versions) {

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
    objects.reduce((memo, object) => memo + object.Size, 0),
    'Total size of objects',
    tags
  ));

  if (versions) {
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
}

async function listAllObjects(s3, options, objects = []) {

  const res = await promisified(s3.listObjectsV2, s3, options);
  objects.push(...res.Contents);

  if (res.IsTruncated && res.StartAfter) {
    return listAllObjects(s3, { ...options, StartAfter: res.StartAfter }, objects);
  }

  return objects;
}

async function listAllObjectVersions(s3, options, versions = []) {

  const res = await promisified(s3.listObjectVersions, s3, options);
  versions.push(...res.Versions);

  if (res.IsTruncated && res.NextKeyMarker && res.NextVersionIdMarker) {
    return listAllObjectVersions(s3, { ...options, KeyMarker: res.NextKeyMarker, NextVersionIdMarker: res.NextVersionIdMarker }, versions);
  }

  return versions;
}
