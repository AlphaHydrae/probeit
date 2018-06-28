const Koa = require('koa');
const { includes } = require('lodash');

const { probe } = require('../probe');
const { toPrometheusMetrics } = require('../prometheus');
const { parseBooleanQueryParam } = require('../utils');

exports.start = function(config) {

  const app = new Koa();
  const logger = config.getLogger('server');

  app.use(async ctx => {
    if (!includes([ '/', '/metrics' ], ctx.path)) {
      ctx.status = 404;
      return;
    }

    const target = ctx.query.target;
    if (!target) {
      ctx.throw(400, 'Query parameter "target" is missing');
    }

    const result = await probe(target, config, ctx);

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

  return new Promise((resolve, reject) => {
    app.listen(config.port, err => {
      if (err) {
        reject(err);
      } else {
        logger.info(`Listening on port ${config.port}`);
        resolve();
      }
    });
  });
};
