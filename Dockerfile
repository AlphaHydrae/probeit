FROM node:10.5.0-alpine

WORKDIR /usr/src/app/

RUN addgroup -S probeit && \
    adduser -S -G probeit probeit && \
    chown probeit:probeit /usr/src/app

USER probeit:probeit

COPY --chown=probeit:probeit package.json package-lock.json /usr/src/app/
RUN npm install --production && \
    npm cache clean --force

COPY --chown=probeit:probeit src/ /usr/src/app/

EXPOSE 3000

CMD [ "npm", "start" ]
