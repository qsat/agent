# Playwright CLI を Docker コンテナ内で利用する

[playwright-cli](https://github.com/microsoft/playwright-cli) を Docker 内で動かすための Dockerfile と実行例です。

## 前提

- Docker がインストールされていること
- 信頼できるサイトの E2E 用途を想定（コンテナは root でブラウザを実行します）

## ビルド

```bash
cd docs/playwright-cli-docker
docker build -t playwright-cli .
```

## 基本的な使い方

### ヘルプの表示

```bash
docker run --rm playwright-cli
# または
docker run --rm playwright-cli --help
```

### ブラウザで URL を開く（ヘッドレス）

```bash
docker run --rm -it --ipc=host playwright-cli open https://example.com
```

- `--ipc=host` は Chromium のメモリクラッシュを防ぐために推奨（[Playwright Docker ドキュメント](https://playwright.dev/docs/docker)）

### ヘッド付きで開く（デバッグ用・X11 等が必要）

```bash
docker run --rm -it --ipc=host -e DISPLAY=host.docker.internal:0 playwright-cli open https://example.com --headed
```

### ワークスペースをマウントして実行

スクリプトや設定をホストから渡す場合:

```bash
docker run --rm -it --ipc=host \
  -v "$(pwd):/workspace" \
  -w /workspace \
  playwright-cli open https://demo.playwright.dev/todomvc/
```

### スキルをインストールして使う（エージェント用）

Claude Code や GitHub Copilot 等でスキルを使う場合は、イメージ内で一度インストールするか、実行時にインストールします。

```bash
docker run --rm -it --ipc=host -v "$(pwd):/workspace" -w /workspace \
  --entrypoint /bin/bash playwright-cli -c "playwright-cli install --skills && playwright-cli open https://example.com"
```

永続的にスキルを含めたい場合は、Dockerfile に `RUN playwright-cli install --skills` を追加してイメージを再ビルドしてください。

### 一連の CLI コマンドを実行する例

コンテナを起動してシェルで複数コマンドを打つ場合:

```bash
docker run --rm -it --ipc=host \
  -v "$(pwd):/workspace" \
  -w /workspace \
  --entrypoint /bin/bash \
  playwright-cli
```

シェル内で:

```bash
playwright-cli open https://demo.playwright.dev/todomvc/
playwright-cli type "Buy groceries"
playwright-cli press Enter
playwright-cli screenshot --filename=screen.png
```

## 推奨オプション（Playwright 公式より）

- **`--ipc=host`** … Chromium のメモリ問題を防ぐ
- **`--init`** … PID 1 のゾンビプロセス対策（長時間運用時）
- **信頼できないサイトを扱う場合** … 非 root ユーザーと seccomp プロファイルの利用を検討

## バージョン

- ベースイメージ: `mcr.microsoft.com/playwright:v1.58.2-noble`（Ubuntu 24.04）
- `@playwright/cli` は `latest` でインストール。ベースの Playwright と揃えたい場合は Dockerfile の `@playwright/cli@latest` を `@playwright/cli@1.58.2` などに変更してください。

## 参考

- [Playwright CLI](https://github.com/microsoft/playwright-cli)
- [Playwright — Docker](https://playwright.dev/docs/docker)
- [Microsoft Container Registry - Playwright](https://mcr.microsoft.com/en-us/product/playwright/about)
