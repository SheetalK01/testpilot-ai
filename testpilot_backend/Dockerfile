# syntax=docker/dockerfile:1

# ---- Build: compile and package the Spring Boot jar ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
# Dependencies first, so source changes do not invalidate the dependency layer.
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q package -DskipTests

# ---- Runtime: JRE only, non-root ----
FROM eclipse-temurin:17-jre
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app && useradd --system --gid app --no-create-home app
WORKDIR /app
COPY --from=build /build/target/testpilot-backend.jar app.jar
USER app
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=5 \
    CMD curl -fsS "http://127.0.0.1:${PORT:-8080}/actuator/health" || exit 1
# Tuned to start fast and fit in 512 MB (free hosting): small heap share, serial GC, C1 compiler only.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k -XX:MaxMetaspaceSize=160m"
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
