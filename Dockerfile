# Production-only dependencies
FROM node:24-alpine AS deps
WORKDIR /src
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# Build stage — full deps available
FROM node:24-alpine AS builder

WORKDIR /src

# tmi.js and vue-select are devDependencies pulled from GitHub. The lockfile pins
# them to git+ssh:// URLs, so npm needs git (absent in alpine) and would clone over
# SSH (no key in the build). Install git and force HTTPS for these public repos.
RUN apk add --no-cache git \
    && git config --global url."https://github.com/".insteadOf "ssh://git@github.com/" \
    && git config --global url."https://github.com/".insteadOf "git@github.com:"

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN npm run build

RUN echo -n prod > env.conf

FROM node:24-alpine

ENV NODE_ENV=production
# Fixed internal listen port read by the app (src_back/bootstrap.ts). Per-environment
# host ports are mapped in docker-compose.yml; this stays constant inside the container.
ENV PORT=3018

# su-exec lets the entrypoint drop from root to the node user after fixing volume perms.
RUN apk add --no-cache su-exec && \
    mkdir -p /opt/twitchat/data && \
    chown -R node:node /opt/twitchat

COPY --from=builder --chown=node:node /src/dist /opt/twitchat/public
COPY --from=builder --chown=node:node /src/server /opt/twitchat
COPY --from=deps    --chown=node:node /src/node_modules /opt/twitchat/node_modules
COPY --from=builder --chown=node:node /src/env.conf /opt/twitchat/env.conf
COPY --chmod=0755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

WORKDIR /opt/twitchat

# No `USER node`: the entrypoint starts as root, fixes ownership of the mounted data
# volume, then drops to the node user via su-exec before running the app.

VOLUME ["/opt/twitchat/data"]

EXPOSE 3018/tcp

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3018/api || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "/opt/twitchat/bootstrap.js"]
