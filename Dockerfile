FROM node:10.9.0-alpine as builder

ENV WEBPACK_MODE=production

COPY bin/ /usr/src/app/bin/
COPY package.json package-lock.json /usr/src/app/
COPY src/ /usr/src/app/src/
COPY tsconfig.json webpack.js /usr/src/app/

WORKDIR /usr/src/app

RUN npm install && \
    npm run build && \
    rm -fr node_modules src tsconfig.json webpack.js

FROM node:10.9.0-alpine

WORKDIR /usr/src/app/

COPY --from=builder /usr/src/app /usr/src/app/

RUN addgroup -S probeit && \
    adduser -S -G probeit probeit && \
    chown -R probeit:probeit /usr/src/app && \
    npm install --production && \
    npm cache clean --force

USER probeit:probeit

EXPOSE 3000

CMD [ "npm", "start" ]
