FROM node:lts-alpine as builder

COPY . /src
WORKDIR /src

RUN set -ex \
 && apk --no-cache add \
      rsync \
 && npm ci \
 && npm run build \
 && mkdir /opt/twitchat \
 && rsync -a /src/server/ /opt/twitchat/ \
 && rsync -a /src/dist/ /opt/twitchat/public/ \
 && rsync -a /src/node_modules/ /opt/twitchat/node_modules/ \
 && echo -n "prod" >/opt/twitchat/env.conf \
 && mkdir -p \
      /opt/twitchat/beta \
      /opt/twitchat/credentials \
      /opt/twitchat/donors \
      /opt/twitchat/userData \
 && chown 10001 \
      /opt/twitchat/beta \
      /opt/twitchat/credentials \
      /opt/twitchat/donors \
      /opt/twitchat/userData


FROM node:lts-alpine

COPY --from=builder /opt/twitchat /opt/twitchat
WORKDIR /opt/twitchat

VOLUME ["/opt/twitchat/credentials", "/opt/twitchat/beta", "/opt/twitchat/donors", "/opt/twitchat/userData"]
USER 10001
EXPOSE 3018/tcp

ENTRYPOINT ["node"]
CMD ["bootstrap.js"]

