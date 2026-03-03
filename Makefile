# CDP は host-gateway で取得したホスト IP を cdpEndpoint に埋め込む（Chrome は Host が IP でないと 500 を返すため）
# CDP_HOST_IP を指定すればその値を使う。未指定ならコンテナから host.docker.internal を解決して取得、失敗時は 192.168.65.254
CDP_CONFIG       := config/workspace/.playwright/cli.config.json
CDP_CONFIG_TMPL  := config/workspace/.playwright/cli.config.json.template
CDP_PORT         ?= 9222

.PHONY: update-cdp-config show-cdp-config up down start stop watch-chrome

# 一括起動: CDP 設定更新 → Docker コンテナ起動 → Chrome（CDP）起動
start: update-cdp-config
	docker compose up -d
	CHROME_DEBUG_PORT=$(CDP_PORT) CHROME_BACKGROUND=1 ./scripts/start-chrome-debug.sh
	@echo "Started: Docker containers and Chrome CDP (port $(CDP_PORT))"

# 一括停止: Chrome（CDP）停止 → Docker コンテナ停止
stop:
	CHROME_DEBUG_PORT=$(CDP_PORT) ./scripts/stop-chrome-debug.sh
	docker compose down
	@echo "Stopped: Chrome CDP and Docker containers"

# コンテナのみ停止（Chrome は止めない）
down:
	docker compose down

# テンプレートの __HOST_IP__ / __CDP_PORT__ を置換。HOST_IP は host-gateway 解決 or CDP_HOST_IP or 192.168.65.254
update-cdp-config:
	@HOST_IP=$${CDP_HOST_IP:-}; \
	if [ -z "$$HOST_IP" ]; then \
	  HOST_IP=$$(docker compose run --rm --no-deps -T --entrypoint "" openclaw-cli node -e "require('dns').lookup('host.docker.internal', (e,r) => { if(e) process.exit(1); console.log(r); })" 2>/dev/null | grep -E '^[0-9.]+$$' || true); \
	fi; \
	if [ -z "$$HOST_IP" ]; then HOST_IP=192.168.65.254; fi; \
	mkdir -p "$(dir $(CDP_CONFIG))"; \
	sed -e 's/__HOST_IP__/'"$$HOST_IP"'/g' -e 's/__CDP_PORT__/$(CDP_PORT)/g' "$(CDP_CONFIG_TMPL)" > "$(CDP_CONFIG)"; \
	echo "Updated $(CDP_CONFIG) with cdpEndpoint: http://$$HOST_IP:$(CDP_PORT) (host-gateway)"

show-cdp-config:
	@echo "CDP_CONFIG: $(CDP_CONFIG)"
	@[ -f "$(CDP_CONFIG)" ] && echo "Content:" && cat "$(CDP_CONFIG)" || echo "File not found."

# コンテナのみ起動（Chrome は起動しない）。コンテナ起動時は必ず cli.config.json をテンプレートから生成してから compose up
up: update-cdp-config
	docker compose up -d

# Chrome CDP を一定間隔でチェックし、落ちていれば起動する（スケジューリングはこのスクリプト内のループ。Make 単体では cron のような定期実行は不可）
# 間隔: make watch-chrome INTERVAL=120 または CHROME_WATCH_INTERVAL=120 make watch-chrome。デフォルト 60 秒。
watch-chrome:
	CHROME_WATCH_INTERVAL=$(or $(INTERVAL),$(CHROME_WATCH_INTERVAL),60) ./scripts/watch-chrome-debug.sh
