import * as Koa from 'koa';
import { includes } from 'lodash';
import { ValidationErrorBundle } from 'valany';

import { Config } from '../config';
import { getLogger } from '../logger';
import { probe } from '../probe';
import { toPrometheusMetrics } from '../prometheus';
import { parseBooleanParam } from '../utils';

export function startServer(config: Config) {

  const app = new Koa();
  const logger = getLogger('server', config);

  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      if (err instanceof ValidationErrorBundle) {
        ctx.status = 400;
        ctx.body = {
          message: 'Parameter validation failed',
          errors: err.errors.map(e => ({ ...e, message: e.message }))
        };
      } else {
        throw err;
      }
    }
  });

  app.use(async ctx => {
    if (!includes([ '/', '/metrics' ], ctx.path)) {
      ctx.status = 404;
      return;
    }

    const target = ctx.query.target;
    if (!target) {
      ctx.throw(400, 'Query parameter "target" is missing');
    }

    const pretty = parseBooleanParam(ctx.query.pretty, config.pretty);
    const result = await probe(target, config, ctx);

    if (ctx.path === '/metrics') {
      ctx.body = toPrometheusMetrics(result, !!pretty);
      ctx.set('Content-Type', 'text/plain; version=0.0.4');
    } else if (pretty) {
      ctx.body = JSON.stringify(result, undefined, 2);
      ctx.set('Content-Type', 'application/json; charset=utf-8');
    } else {
      ctx.body = result;
    }
  });

  app.on('error', err => logger.warn(err.stack));

  return new Promise(resolve => {
    app.listen(config.port, () => {
      logger.info(`Listening on port ${config.port}`);
      resolve();
    });
  });
}
