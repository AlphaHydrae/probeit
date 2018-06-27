const aws = require('aws-sdk');
const { last } = require('lodash');
const moment = require('moment');
const { parse: parseUrl } = require('url');

const { parseBooleanQueryParam, promisified, toArray } = require('../utils');

exports.probeS3 = async function(target, ctx) {

  const s3Url = parseUrl(target);

  const Bucket = s3Url.host;
  const Prefix = s3Url.pathname;

  const accessKeyId = s3Url.auth ? s3Url.auth.replace(/:.*/, '') : process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = s3Url.auth && s3Url.auth.match(/:.+/) ? s3Url.auth.replace(/[^:]+:/, '') : process.env.AWS_SECRET_ACCESS_KEY;

  const s3 = new aws.S3({ accessKeyId, secretAccessKey });

  const result = {
    failures: [],
    metrics: []
  };

  const probeVersions = parseBooleanQueryParam(ctx.query.probeVersions);

  const objectsPromise = listAllObjects(s3, { Bucket, Prefix });
  const versionsPromise = probeVersions ? listAllObjectVersions(s3, { Bucket, Prefix }) : Promise.resolve();

  const [ objects, versions ] = await Promise.all([ objectsPromise, versionsPromise ]);

  const aggregationPrefixes = toArray(ctx.query.s3ByPrefix);
  const globalTags = {};

  if (aggregationPrefixes.length) {
    globalTags.prefix = '';

    for (const prefix of aggregationPrefixes) {
      const tags = { prefix };
      const matchingObjects = objects.filter(o => o.Key.indexOf(prefix) === 0);
      const matchingVersions = probeVersions ? versions.filter(v => v.Key.indexOf(prefix) === 0) : undefined;
      addS3Metrics(result.metrics, tags, matchingObjects, matchingVersions);
    }
  }

  addS3Metrics(result.metrics, globalTags, objects, versions);

  result.success = true;

  return result;
};

function addS3Metrics(metrics, tags, objects, versions) {

  const objectsSortedByDate = objects.sort((a, b) => a.LastModified.getTime() - b.LastModified.getTime());

  metrics.push({
    description: 'The earliest modification date of objects',
    name: 's3FirstObjectModificationDate',
    tags,
    type: 'datetime',
    value: objectsSortedByDate.length ? moment(objectsSortedByDate[0].LastModified).format() : null
  });

  metrics.push({
    description: 'The latest modification date of objects',
    name: 's3LastObjectModificationDate',
    tags,
    type: 'datetime',
    value: objectsSortedByDate.length ? moment(last(objectsSortedByDate).LastModified).format() : null
  });

  metrics.push({
    description: 'Number of objects',
    name: 's3ObjectsCount',
    tags,
    type: 'quantity',
    value: objects.length
  });

  const objectSizes = objects.map(o => o.Size);

  metrics.push({
    description: 'The size of the smallest object in bytes',
    name: 's3SmallestObjectSize',
    tags,
    type: 'bytes',
    value: objectSizes.length ? Math.min(Number.MAX_SAFE_INTEGER, ...objectSizes) : null
  });

  metrics.push({
    description: 'The size of the largest object in bytes',
    name: 's3LargestObjectSize',
    tags,
    type: 'bytes',
    value: objectSizes.length ? Math.max(0, ...objectSizes) : null
  });

  metrics.push({
    description: 'Total size of objects',
    name: 's3ObjectsTotalSize',
    tags,
    type: 'bytes',
    value: objects.reduce((memo, object) => memo + object.Size, 0)
  });

  if (versions) {
    const versionsSortedByDate = versions.sort((a, b) => a.LastModified.getTime() - b.LastModified.getTime());

    metrics.push({
      description: 'The earliest modification date of object versions',
      name: 's3FirstObjectVersionModificationDate',
      tags,
      type: 'datetime',
      value: versionsSortedByDate.length ? moment(versionsSortedByDate[0].LastModified).format() : null
    });

    metrics.push({
      description: 'The latest modification date of object versions',
      name: 's3LastObjectVersionModificationDate',
      tags,
      type: 'datetime',
      value: versionsSortedByDate.length ? moment(last(versionsSortedByDate).LastModified).format() : null
    });

    metrics.push({
      description: 'Number of object versions',
      name: 's3ObjectVersionsCount',
      tags,
      type: 'quantity',
      value: versions.length
    });
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
