FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV ONNXRUNTIME_NODE_INSTALL_CUDA=skip
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV ONNXRUNTIME_NODE_INSTALL_CUDA=skip
COPY --from=build /app/package*.json ./
RUN npm ci
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
COPY --from=build /app/dist ./dist
COPY --from=build /app/data ./data
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:8787/api/ready').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "--import", "tsx", "server/index.ts"]
