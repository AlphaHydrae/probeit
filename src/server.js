const Koa = require('koa');
const { difference, includes, merge, pick, reduce } = require('lodash');

const { load: loadPresets } = require('./presets');
const { getProbe } = require('./probes');
const { toPrometheusMetrics } = require('./prometheus');
const { compareMetrics, parseBooleanQueryParam, toArray } = require('./utils');

exports.start = async function(config) {

  const app = new Koa();
  const logger = config.getLogger('server');
  const presets = await loadPresets(config);

  app.use(async ctx => {
    if (!includes([ '/', '/metrics' ], ctx.path)) {
      ctx.status = 404;
      return;
    }

    const target = ctx.query.target;
    if (!target) {
      ctx.throw(400, 'Query parameter "target" is missing');
    }

    const probe = getProbe(target);
    if (!probe) {
      ctx.throw(400, 'No suitable probe found; target must be an HTTP(S) or an S3 URL (e.g. http://example.com, s3://bucket_name)');
    }

    const presetsToApply = toArray(ctx.query.preset).map(preset => String(preset));
    const unknownPresets = difference(presetsToApply, Object.keys(presets));
    if (unknownPresets.length) {
      ctx.throw(400, `The following presets are not defined: ${unknownPresets.map(preset => `"${preset}"`).join(', ')}`);
    }

    const start = new Date().getTime();
    const combinedPresets = reduce(pick(presets, ...presetsToApply), (memo, preset) => merge(memo, preset), {});

    const result = await probe(target, ctx, combinedPresets, config);

    result.metrics.push({
      description: 'How long the probe took to complete in seconds',
      name: 'duration',
      type: 'seconds',
      value: (new Date().getTime() - start) / 1000
    });

    result.metrics.sort(compareMetrics);

    if (ctx.path === '/metrics') {
      ctx.body = toPrometheusMetrics(result, ctx);
      ctx.set('Content-Type', 'text/plain; version=0.0.4');
    } else if (parseBooleanQueryParam(ctx.query.pretty)) {
      ctx.body = JSON.stringify(result, undefined, 2);
      ctx.set('Content-Type', 'application/json; charset=utf-8');
    } else {
      ctx.body = result;
    }
  });

  app.on('error', err => logger.warn(err.stack));

  app.listen(config.port, err => {
    if (!err) {
      logger.info(`Listening on port ${config.port}`);
    }
  });
};
