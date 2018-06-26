const { red } = require('chalk');
const Koa = require('koa');
const { includes } = require('lodash');

const { probeHttp } = require('./probes/http');
const { toPrometheusMetrics } = require('./prometheus');
const { buildMetric, parseBooleanQueryParam } = require('./utils');

const app = new Koa();

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
    ctx.throw(400, 'No suitable probe found; target must be an HTTP(S) URL');
  }

  const start = new Date().getTime();
  const result = await probe(target, ctx);
  result.duration = buildMetric(
    (new Date().getTime() - start) / 1000,
    'seconds',
    'How long the probe took to complete in seconds'
  );

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

app.on('error', err => console.warn(red(err.stack)));

app.listen(process.env.PORT || 3000);

function getProbe(target) {
  if (target.match(/^https?:/i)) {
    return probeHttp;
  }
}
