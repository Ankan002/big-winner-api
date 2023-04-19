FROM node:alpine

ARG DATABASE_URL

ENV PORT ${PORT}
ENV JWT_SECRET ${JWT_SECRET}
ENV MICROSERVICE_PASSWORD ${MICROSERVICE_PASSWORD}

ENV MAILGUN_API_KEY ${MAILGUN_API_KEY}
ENV MAILGUN_DOMAIN ${MAILGUN_DOMAIN}
ENV REDIS_CLIENT_PASSWORD ${REDIS_CLIENT_PASSWORD}
ENV REDIS_CLIENT_HOST ${REDIS_CLIENT_HOST}
ENV REDIS_CLIENT_PORT ${REDIS_CLIENT_PORT}

ENV NODE_ENV = "production"

WORKDIR /usr/big-winner-api

COPY yarn.lock .
COPY package.json .

RUN yarn

RUN yarn add -D @swc/cli @swc/core

COPY . .

RUN yarn build

EXPOSE ${PORT}

CMD [ "yarn", "start" ]
