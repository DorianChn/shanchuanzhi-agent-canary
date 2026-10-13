FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY src ./src
COPY FREE_BUILD_VERSION.json ./
RUN npm run build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json FREE_BUILD_VERSION.json LICENSE README.md README.zh-CN.md THIRD_PARTY_NOTICES.md ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

USER node
LABEL org.opencontainers.image.source="https://github.com/DorianChn/shanchuanzhi-agent-canary" \
      org.opencontainers.image.title="Agent Canary 3.0" \
      org.opencontainers.image.description="Open-source MCP and SDK security toolkit for AI agents"

# The CLI supports ordinary terminal use and MCP stdio with `serve --stdio`.
ENTRYPOINT ["node", "dist/competition.js"]
CMD ["--help"]
