# ミニマム構成（Docker なし）

Gateway は必須ですが、**Docker を使わずホストで直接**動かすと最小構成で試せます。

## 前提

- Node.js 22+
- ホストに [Ollama](https://ollama.ai/) インストール済み・起動済み
- `ollama pull deepseek-r1:32b` 済み

## 手順

### 1. OpenClaw をグローバルインストール

```bash
npm install -g openclaw@latest
```

### 2. オンボーディング（初回のみ・対話式）

```bash
openclaw onboard
```

- モデル: **Ollama** を選ぶ
- モデル名: `deepseek-r1:32b` など
- Gateway トークン: 聞かれたら設定（任意の長い文字列で可）

### 3. 設定の最小例（Ollama のみ）

`~/.openclaw/openclaw.json` を編集して、次のようにする。

```json
{
  "gateway": { "mode": "local" },
  "agents": {
    "defaults": {
      "model": { "primary": "ollama/deepseek-r1:32b" }
    }
  }
}
```

Ollama はローカルなので API キー不要。  
`OLLAMA_API_KEY=ollama-local` を export しておくと OpenClaw が Ollama を有効にする。

### 4. Gateway 起動

```bash
export OLLAMA_API_KEY=ollama-local
openclaw gateway --port 18789
```

### 5. 別ターミナルでエージェントに話す

```bash
export OPENCLAW_GATEWAY_TOKEN=あなたが設定したトークン
openclaw agent --message "こんにちは"
```

またはブラウザで **http://127.0.0.1:18789/** を開いて Control UI / WebChat を使う。

---

## まとめ

| 項目           | 内容 |
|----------------|------|
| 必須コンポ넌ント | **Gateway のみ**（OpenClaw の本体） |
| ミニマム構成   | ホストで `openclaw gateway` + Ollama |
| Docker         | 必須ではない。使うとポート・バインドなどの調整が必要 |

Docker は「隔離して動かしたい」「同じ設定を他マシンでも再現したい」ときに使うとよいです。
