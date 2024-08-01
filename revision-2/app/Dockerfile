FROM node:18-alpine as build

WORKDIR /tmp/builder
COPY *.json .

COPY src src

RUN npm i --quiet
RUN npm run build

FROM node:18-alpine

USER node

WORKDIR /

COPY --from=build /tmp/builder/dist dist
COPY --from=build /tmp/builder/node_modules dist/node_modules
COPY --from=build /tmp/builder/package.json dist
COPY --from=build /tmp/builder/package-lock.json dist

WORKDIR /dist

EXPOSE 8080

CMD ["node", "server.js"]