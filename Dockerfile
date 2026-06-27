# SA-MP Server — Los Jawa Roleplay
# Base: Ubuntu 20.04 dengan multiarch i386 untuk SA-MP binary 32-bit
FROM ubuntu:20.04

LABEL maintainer="Los Jawa Roleplay"
LABEL description="SA-MP 0.3.DL R1 Linux Server with MySQL 5.7 support"

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
        libssl1.1:i386 \
        zlib1g:i386 \
    && rm -rf /var/lib/apt/lists/*

# ── Download & install libmysqlclient18:i386 secara manual ────────────────────
# mysql.so membutuhkan libmysqlclient.so.18 (MySQL 5.x 32-bit)
RUN wget -q "http://launchpadlibrarian.net/247514894/libmysqlclient18_5.6.28-1ubuntu3_i386.deb" -O /tmp/libmysqlclient18.deb && \
    dpkg -x /tmp/libmysqlclient18.deb /tmp/libmysqlclient18 && \
    cp -r /tmp/libmysqlclient18/usr/lib/i386-linux-gnu/* /usr/lib/i386-linux-gnu/ && \
    rm -rf /tmp/libmysqlclient18* && \
    ldconfig

# ── Download & extract SA-MP 0.3.DL R1 Linux server binary ──────────────────
RUN wget -q "https://archive.org/download/sa-mp-0.3.dl/samp03DLsvr_R1.tar.gz" -O /tmp/samp.tar.gz && \
    tar -xzf /tmp/samp.tar.gz -C /tmp/ && \
    mkdir -p /samp && \
    find /tmp -name "samp03svr" -exec cp {} /samp/samp-server \; && \
    chmod +x /samp/samp-server && \
    rm -rf /tmp/samp*

# ── Buat folder kerja ────────────────────────────────────────────────────────
WORKDIR /samp

# ── Copy konfigurasi server ──────────────────────────────────────────────────
COPY server.cfg           ./server.cfg
COPY samp.ban             ./samp.ban
COPY rus.txt              ./rus.txt

# ── Copy plugin .so (Linux) ──────────────────────────────────────────────────
COPY plugins/streamer.so            ./plugins/streamer.so
COPY plugins/sscanf.so              ./plugins/sscanf.so
COPY plugins/mysql.so               ./plugins/mysql.so
COPY plugins/Whirlpool.so           ./plugins/Whirlpool.so
COPY plugins/pawnregex.so           ./plugins/pawnregex.so
COPY plugins/discord-connector.so   ./plugins/discord-connector.so
COPY plugins/pawnregex.cfg          ./plugins/pawnregex.cfg
COPY amxsscanf.so                   ./amxsscanf.so
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
