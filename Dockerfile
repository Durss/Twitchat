FROM node:24-alpine AS builder

ENV NODE_ENV=production

WORKDIR /src

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN echo -n prod > env.conf

FROM node:24-alpine

ENV NODE_ENV=production

RUN mkdir -p /opt/twitchat/data && \
    chown -R node:node /opt/twitchat

COPY --from=builder --chown=node:node /src/dist /opt/twitchat/public
COPY --from=builder --chown=node:node /src/server /opt/twitchat
COPY --from=builder --chown=node:node /src/node_modules /opt/twitchat/node_modules
COPY --from=builder --chown=node:node /src/env.conf /opt/twitchat/env.conf

WORKDIR /opt/twitchat

USER node

VOLUME ["/opt/twitchat/data"]

EXPOSE 3018/tcp

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3018/api|| exit 1

CMD [ "node", "/opt/twitchat/bootstrap.js" ]
