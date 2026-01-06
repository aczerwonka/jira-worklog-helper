Build and run instructions (macOS / Linux / Windows)

Overview

This repository contains a Spring Boot backend and an Angular frontend. The provided scripts build the frontend, copy the production `dist` into the backend static resources, then package the backend into a single jar. An optional native-image build path is suggested but may require extra configuration.

Quick (macOS / Linux)

1. Build everything:
   ./build_all.sh
2. Run:
   ./run.sh

Quick (Windows PowerShell)

1. Build everything:
   .\build_all.ps1
2. Run:
   .\run.ps1

.env and data files

- Put a `.env` file in the same directory where you run the jar/binary. Example `.env.example` provided.
- CSV files should be placed in `./data/` relative to the working dir where you run the binary. The application falls back to embedded resources if external files are not present.

GraalVM / native-image (optional)

Building a native image for a Spring Boot application is advanced and may require extra configuration (Spring AOT, reflection/resource configuration). Below are initial steps to get started.

Prerequisites:
- Install GraalVM (matching Java version used by the project) and ensure `native-image` is on PATH.
- Install required OS libraries for GraalVM native builds (platform dependent).

Simple attempt using provided Maven profile (may fail without AOT/config):

macOS / Linux:

1. Ensure native-image available: `native-image --version`
2. Run: `./backend/scripts/build_native_maven.sh` (this runs `mvn -Pnative -DskipTests package`).

If that fails, fallback:
1. Build jar: `./build_all.sh`
2. Use `native-image --no-fallback -jar backend/target/*.jar` (may need additional config files in `src/main/resources/META-INF/native-image/`).

Notes & troubleshooting

- For Spring Boot, consider adding Spring AOT plugin and using `spring-boot-starter-native` if you need full native support. The pom.xml contains a `native` profile and comments showing where to add the AOT plugin.
- I included sample `reflect-config.json` and `resource-config.json` under `backend/src/main/resources/META-INF/native-image/` as a starting point. You will likely need to expand these entries.

Troubleshooting

- If the frontend router returns 404 on refresh, ensure the SPA forward controller is enabled.
- Do not commit `.env` with tokens.


