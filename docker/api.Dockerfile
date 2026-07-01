# SIGECAT API — PHP 8.4 + Oracle Instant Client + pdo_oci
#
# pdo_oci was removed from PHP core in 8.4, so it is built from PECL against the
# Oracle Instant Client (basiclite + sdk), mirroring setup-pdo-oci.sh. The
# database wallet and config/oci_config.php are NOT baked into the image (they
# are credentials); mount them at runtime — see docker-compose.yml.
FROM php:8.4-cli-bookworm

ARG IC_DIR=/opt/oracle/instantclient_21_12
ARG IC_BASE=https://download.oracle.com/otn_software/linux/instantclient/2112000

# Runtime + build dependencies for the Instant Client and the pdo_oci build.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libaio1 unzip curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Oracle Instant Client: basiclite (runtime) + sdk (headers for the build).
RUN mkdir -p /opt/oracle && cd /opt/oracle \
    && curl -fsSLO "${IC_BASE}/instantclient-basiclite-linux.x64-21.12.0.0.0dbru.zip" \
    && curl -fsSLO "${IC_BASE}/instantclient-sdk-linux.x64-21.12.0.0.0dbru.zip" \
    && unzip -q 'instantclient-*.zip' \
    && rm -f instantclient-*.zip \
    && echo "${IC_DIR}" > /etc/ld.so.conf.d/oracle-instantclient.conf \
    && ldconfig

ENV LD_LIBRARY_PATH=${IC_DIR}

# Build and enable pdo_oci against the Instant Client.
RUN printf 'instantclient,%s\n' "${IC_DIR}" | pecl install pdo_oci \
    && docker-php-ext-enable pdo_oci \
    && php -m | grep -qi pdo_oci

# Composer (from the official image) and PHP dependencies.
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /app/api
COPY api/composer.json api/composer.lock ./
RUN composer install --no-dev --prefer-dist --no-progress --no-interaction --no-scripts

COPY api/ ./

EXPOSE 8000
CMD ["php", "-S", "0.0.0.0:8000", "-t", "/app/api", "/app/api/public/index.php"]
