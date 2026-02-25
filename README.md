# agent

OpenClaw を Docker で動かし、**ホストにインストールした Ollama** の **deepseek-r1:32b** を利用するためのセットアップです。

## 必要なもの

- Docker / Docker Compose v2
- ホストにインストール済みの [Ollama](https://ollama.ai/)（起動しておくこと）
- （オプション）約 20GB 以上の空き（deepseek-r1:32b 用）

## クイックスタート

### 1. ホストで Ollama を起動しておく

```bash
# 未導入なら https://ollama.ai/ からインストール
ollama serve   # すでに起動している場合は不要
ollama pull deepseek-r1:32b   # 初回のみ
```

### 2. 環境変数

```bash
cp .env.example .env
# OPENCLAW_GATEWAY_TOKEN を必ず変更（例: openssl rand -hex 32）
```

### 3. 起動

```bash
docker compose up -d
```

### 4. オンボーディング（初回のみ推奨）

Gateway の初期設定・チャンネル連携などを行います。

```bash
docker compose --profile cli run --rm openclaw-cli onboard
```

### 5. コントロール UI にアクセス

ブラウザで開く:

- **http://127.0.0.1:18789/**

「unauthorized」や「pairing required」のときは、トークンを設定してください。

```bash
# ダッシュボード用 URL（トークン付き）を表示
docker compose --profile cli run --rm openclaw-cli dashboard --no-open
```

## 構成

| サービス           | 役割                                   |
|--------------------|----------------------------------------|
| `openclaw-gateway` | OpenClaw ゲートウェイ                   |
| `openclaw-cli`     | CLI（`--profile cli` で利用）           |
| ホストの Ollama    | ローカル LLM（deepseek-r1:32b など）   |

- 設定: `config/openclaw.json`（Ollama の baseUrl は `host.docker.internal:11434`）
- ワークスペース: `data/workspace`
- ゲートウェイはブリッジ＋ポートマッピングでホストの `localhost:18789` に公開

## OPENCLAW_GATEWAY_TOKEN について

**OPENCLAW_GATEWAY_TOKEN** は、ゲートウェイに接続するための**認証トークン**です。

### 役割

- Control UI（ダッシュボード）、CLI、WebChat、リモートクライアントがゲートウェイに接続するときにこのトークンで認証する
- トークンを知っているクライアントだけがゲートウェイを操作できる

### いつ必要か

- ゲートウェイをループバック以外（`lan` や `all` など）にバインドしているときは**必須**
- この Docker 構成では `lan` でバインドしているため、必ず設定すること

### 設定方法

1. **トークンを生成する（推奨）**
   ```bash
   openssl rand -hex 32
   ```
2. **`.env` に書く**
   ```bash
   OPENCLAW_GATEWAY_TOKEN=ここに生成した文字列を貼る
   ```
3. **Control UI で使う**  
   ブラウザで `http://127.0.0.1:18789/` を開き、Settings → token に同じトークンを入力して保存する

### 注意点

- **秘密情報**なので Git にコミットしない（`.env` は `.gitignore` に含める）
- 本番やリモート公開時は、推測されにくい長いトークン（上記の `openssl rand -hex 32`）を使う
- トークンを変更したらゲートウェイを再起動し、Control UI や CLI 側のトークン設定も同じ値に更新する

## よく使うコマンド

```bash
# ゲートウェイの停止
docker compose down

# CLI でエージェントにメッセージ送信
docker compose --profile cli run --rm openclaw-cli agent --message "こんにちは"

# モデル一覧確認（ホストの Ollama）
ollama list
```

## トラブルシューティング

### localhost で ERR_CONNECTION_REFUSED になる

- **コンテナが動いているか確認**: `docker compose ps` で `openclaw-gateway` が `Up` か確認する
- **ログ確認**: `docker compose logs openclaw-gateway` で起動エラーやクラッシュがないか見る
- 変更後は `docker compose up -d --force-recreate openclaw-gateway` で再作成する

### curl で疎通確認

ゲートウェイが応答しているかは curl で確認できます。

```bash
# ゲートウェイの HTTP 応答（200 なら起動している）
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:18789/

# Ollama（ホスト）の応答
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:11434/api/tags
```

Control UI の「token missing」は **WebSocket 接続時の認証**で起きるため、上記の curl が 200 でも、ブラウザ側でトークンが渡っていないとエラーになります。トークンは URL の `?token=...` または Settings で設定し、ページを再読み込みしてください。

## 参考

- [OpenClaw Docker](https://docs.openclaw.ai/install/docker)
- [OpenClaw Ollama プロバイダー](https://docs.openclaw.ai/providers/ollama)
