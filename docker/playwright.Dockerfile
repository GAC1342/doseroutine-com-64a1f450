# Playwright runner image — same engines CI uses, pinned to the Playwright
# version in package.json (@playwright/test 1.61.1). The official image already
# ships Chromium, Firefox and WebKit plus every system library they need, so
# there is no `playwright install --with-deps` step and no Nix/library shim.
#
# Bump BOTH the tag below and @playwright/test together; a mismatch makes the
# preinstalled browser revisions unusable ("Executable doesn't exist").
FROM mcr.microsoft.com/playwright:v1.61.1-noble

# Bun runs the dev server (playwright.config.ts webServer: `bun run dev`).
ENV BUN_INSTALL=/usr/local/bun
ENV PATH=$BUN_INSTALL/bin:$PATH
RUN curl -fsSL https://bun.sh/install | bash \
    && bun --version

# Snapshots are keyed <name>-<project>-linux.png, which is what CI (ubuntu)
# produces — running here regenerates/compares the exact same files.
ENV CI_CONTAINER=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    npm_config_update_notifier=false

WORKDIR /work

# Non-root so files written into the bind mount stay owned by the host user.
# `pwuser` ships with the base image; the entrypoint fixes the UID at runtime.
COPY docker/playwright-entrypoint.sh /usr/local/bin/playwright-entrypoint.sh
RUN chmod +x /usr/local/bin/playwright-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/playwright-entrypoint.sh"]
CMD ["npx", "playwright", "test"]
