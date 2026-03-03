# Playwright CLI を Docker 内で利用するためのイメージ
# ベース: 公式 Playwright イメージ（ブラウザ＋システム依存＋Node.js 含む）
# https://playwright.dev/docs/docker
ARG PLAYWRIGHT_VERSION=v1.58.2-noble
FROM mcr.microsoft.com/playwright:${PLAYWRIGHT_VERSION}

# ルートで CLI をグローバルインストール（ベースイメージのブラウザとバージョン揃え）
RUN npm install -g @playwright/cli@latest

# 作業ディレクトリ（マウント用）
WORKDIR /workspace

# ヘルプをデフォルト表示
ENTRYPOINT ["playwright-cli"]
CMD ["--help"]
