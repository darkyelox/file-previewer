#-------------------------------------
#   BASE STEP
#-------------------------------------
FROM node:current-alpine as base

ENV UNOCONV_URL https://raw.githubusercontent.com/dagwieers/unoconv/master/unoconv

# installs needed packages.
RUN apk add --update --no-cache \
        bash \
        curl \
        ffmpeg \
        imagemagick \
        libreoffice \
    &&  curl -Ls $UNOCONV_URL -o /usr/bin/unoconv \
    && chmod +x /usr/bin/unoconv \
    && sed -i 's/env python$/env python3/' /usr/bin/unoconv
#-------------------------------------
#   COPY DATA STEP
#-------------------------------------
FROM base as copy-data

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
COPY yarn.lock ./

# faster NPM packages instalation using yarn.
RUN yarn install

# Bundle app source
COPY service.js ./
COPY no-image-available.png ./
#-------------------------------------
#   CONFIG AND EXPOSE STEP
#-------------------------------------
FROM copy-data AS client

RUN mkdir -p /tmp/files \
    && mkdir -p /tmp/cache \
    && mkdir /storage

VOLUME /tmp/files/
VOLUME /tmp/cache/

EXPOSE 8080

CMD [ "node", "service.js" ]
