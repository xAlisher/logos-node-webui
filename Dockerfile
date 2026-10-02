# Multi-stage: build the Vite/React bundle, then serve it with nginx and
# reverse-proxy the node HTTP API. Used standalone and by the DAppNode package
# (logos-blockchain-node), which builds this image as its `webui` service.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
# host:port of the node's HTTP API, reachable from this container.
# In the DAppNode package the node service is reachable as `node:8080`.
ENV NODE_UPSTREAM=node:8080
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
