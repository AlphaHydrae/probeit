FROM node:10.5.0-alpine as builder

COPY package.json package-lock.json /usr/src/app/
COPY src/ /usr/src/app/src/

FROM node:10.5.0-alpine

WORKDIR /usr/src/app/

COPY --from=builder /usr/src/app /usr/src/app/

RUN addgroup -S probesrv && \
    adduser -S -G probesrv probesrv && \
    chown -R probesrv:probesrv /usr/src/app && \
    npm install --production && \
    npm cache clean --force

USER probesrv:probesrv

EXPOSE 3000

CMD [ "npm", "start" ]
