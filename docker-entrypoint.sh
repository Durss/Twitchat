#!/bin/sh
set -e

# /opt/twitchat/data is a bind-mounted volume, so its ownership comes from the host
# and may not be writable by the unprivileged "node" user. When started as root, fix
# the ownership and drop privileges; otherwise just run the command as-is.
if [ "$(id -u)" = "0" ]; then
    chown -R node:node /opt/twitchat/data
    exec su-exec node "$@"
fi

exec "$@"
