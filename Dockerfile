FROM ubuntu:22.04

LABEL maintainer="Los Jawa Roleplay"
LABEL description="open.mp Linux Server with MySQL 5.7 support"

ENV DEBIAN_FRONTEND=noninteractive

# ── Install dependensi sistem ────────────────────────────────────────────────
RUN dpkg --add-architecture i386 && \
    apt-get update && apt-get install -y \
        wget \
        curl \
        netcat \
        tar \
        libc6:i386 \
        libstdc++6:i386 \
        libssl3:i386 \
        zlib1g:i386 \
        libatomic1:i386 \
    && rm -rf /var/lib/apt/lists/*

# ── Install libmysqlclient18:i386 secara manual ────────────────────
# mysql.so membutuhkan libmysqlclient.so.18 (MySQL 5.x 32-bit)
COPY libmysqlclient18.deb /tmp/libmysqlclient18.deb
RUN dpkg -x /tmp/libmysqlclient18.deb /tmp/libmysqlclient18 && \
    cp -r /tmp/libmysqlclient18/usr/lib/i386-linux-gnu/* /usr/lib/i386-linux-gnu/ && \
    rm -rf /tmp/libmysqlclient18* /tmp/libmysqlclient18.deb && \
    ldconfig

# ── Buat folder kerja ────────────────────────────────────────────────────────
RUN mkdir -p /samp
WORKDIR /samp

# ── Copy open.mp Server binary & config ───────────────────────────────────────
COPY omp-server           ./omp-server
RUN chmod +x ./omp-server
COPY config.json          ./config.json
COPY components/          ./components/

# ── Copy konfigurasi open.mp ──────────────────────────────────────────────────
COPY bans.json            ./bans.json
COPY artconfig.txt        ./artconfig.txt
COPY rus.txt              ./rus.txt

# ── Copy plugin .so (Linux) ──────────────────────────────────────────────────
COPY plugins/streamer.so            ./plugins/streamer.so
COPY plugins/sscanf.so              ./plugins/sscanf.so
COPY plugins/mysql.so               ./plugins/mysql.so
COPY plugins/Whirlpool.so           ./plugins/Whirlpool.so
COPY plugins/pawnregex.so           ./plugins/pawnregex.so
COPY plugins/discord-connector.so   ./plugins/discord-connector.so
COPY plugins/samp_bcrypt.so         ./plugins/samp_bcrypt.so
COPY plugins/crashdetect.so          ./plugins/crashdetect.so
COPY plugins/pawnregex.cfg          ./plugins/pawnregex.cfg

COPY log-core.so                    ./log-core.so
COPY log-core2.so                   ./log-core2.so

# ── Copy gamemode, filterscripts, scriptfiles, models ───────────────────────
COPY gamemodes/     ./gamemodes/
COPY filterscripts/ ./filterscripts/
COPY scriptfiles/   ./scriptfiles/
COPY models/        ./models/

# ── Copy entrypoint ──────────────────────────────────────────────────────────
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 7777/udp
EXPOSE 7777/tcp

ENTRYPOINT ["/entrypoint.sh"]
