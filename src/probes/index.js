const { getHttpProbeOptions, probeHttp } = require('./http');
const { getS3ProbeOptions, probeS3 } = require('./s3');

exports.getProbe = function(target) {
  if (target.match(/^https?:\/\//)) {
    return probeHttp;
  } else if (target.match(/^s3:\/\//)) {
    return probeS3;
  } else {
    throw new Error('No suitable probe found; target must be an HTTP(S) or an S3 URL (e.g. http://example.com, s3://bucket_name)');
  }
};

exports.getProbeOptions = function(target, config, ctx) {
  if (target.match(/^https?:\/\//)) {
    return getHttpProbeOptions(target, config, ctx);
  } else if (target.match(/^s3:\/\//)) {
    return getS3ProbeOptions(target, config, ctx);
  } else {
    return {};
  }
};
