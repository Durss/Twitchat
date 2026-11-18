#!/bin/sh
set -e

# Keep old versions' assets for 30 days after they're replaced, so pages opened before
# a deploy (OBS sources, docks) can still load their modules
ASSETS=/opt/twitchat/public/assets
LIVE=/opt/twitchat/data/.assets_live
mkdir -p "$ASSETS"
if [ -f "$LIVE" ]; then
	# check all files listed by .assets_live file that still exist in the public folder.
	# for each one, update the "last modified" to today.
    (cd "$ASSETS" && xargs -r touch -c < "$LIVE") || true
fi

# copy newly built files to the public folder
cp -r /opt/twitchat/assets_build/. "$ASSETS/"

# update the .assets_live with new file list
ls /opt/twitchat/assets_build > "$LIVE"

# delete all files which "last modified" date is older than 30 days
find "$ASSETS" -type f -mtime +30 -delete || true

# /opt/twitchat/data is a bind-mounted volume, so its ownership comes from the host
# and may not be writable by the unprivileged "node" user. When started as root, fix
# the ownership and drop privileges; otherwise just run the command as-is.
if [ "$(id -u)" = "0" ]; then
    chown -R node:node /opt/twitchat/data "$ASSETS"
    exec su-exec node "$@"
fi

exec "$@"
