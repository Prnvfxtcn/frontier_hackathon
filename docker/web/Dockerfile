FROM node:20-bookworm AS build
WORKDIR /app
COPY apps/web/package*.json ./
RUN npm ci
COPY apps/web/ .
ARG NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
ENV NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL
ENV NEXT_PUBLIC_AI_SERVICE_URL=http://ai:8000
RUN npm run build

FROM node:20-bookworm
WORKDIR /app
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public
ENV PORT=3000
ENV NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000
CMD ["npm", "run", "start"]
