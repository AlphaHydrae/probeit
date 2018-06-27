const { probeHttp } = require('./http');
const { probeS3 } = require('./s3');

exports.getProbe = function(target) {
  if (target.match(/^https?:\/\//)) {
    return probeHttp;
  } else if (target.match(/^s3:\/\//)) {
    return probeS3;
  }
};
