FROM node:alpine

ARG DATABASE_URL

ENV PORT ${PORT}
ENV JWT_SECRET ${JWT_SECRET}
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
