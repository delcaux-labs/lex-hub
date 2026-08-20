FROM node:22-slim

WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .

# NEXT_PUBLIC_* are inlined at build time. In dev, real values are passed as
# build-args. For prod images the defaults are placeholder strings that
# docker-entrypoint.sh replaces at container start with runtime env vars.
ARG NEXT_PUBLIC_SUPABASE_URL=__NEXT_PUBLIC_SUPABASE_URL__
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=__NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY__
ARG NEXT_PUBLIC_API_BASE_URL=__NEXT_PUBLIC_API_BASE_URL__
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN npm run build

# Runtime placeholder replacement (see docker-entrypoint.sh).
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "start"]

