# MBA英語ブラッシュアップアプリ (Web版)

スマホ・PCどちらからでも使える、ディクテーション・瞬間英作文のWebアプリです。
[TravelDiary](../travel-memory)と同じ構成(Next.js + Prisma/Postgres + Vercel Blob + Gemini API)で、
**完全無料**でGitHub + Vercelにデプロイできるように設計しています。

PC専用のフル機能版(AI会話練習・ローカルWhisper/ローカルLLM)は[../backend](../backend) +
[../mba-english-app](../mba-english-app)を参照してください。このWeb版はその中の
「ディクテーション」「瞬間英作文」だけを、重い処理をリクエスト外に追い出すことでVercelに載る形に
作り直したものです。

## なぜこの構成か

| 課題 | 解決策 |
|---|---|
| Vercelのサーバーレス関数は実行時間が短く、Whisper文字起こしのような重い処理は動かせない | 音源取り込み(RSS取得〜Whisper文字起こし)は**GitHub Actionsの日次cron**で行い、結果だけをDBに保存する |
| Vercelはリクエストごとに環境がリセットされ、ローカルファイル保存(SQLite等)は使えない | **Postgres**(Prisma経由)に保存する |
| 音声ファイルはリポジトリにコミットできない(著作権・要件書8節の方針) | **Vercel Blob**にアップロードし、URLだけをDBに持つ |
| ローカル埋め込みモデルはサーバーレス環境では重い | 瞬間英作文の採点は**Gemini API(無料枠)**で行う(むしろ精度が向上) |

## セットアップ

```bash
npm install
```

### ローカルDB

TravelDiaryの`prisma dev`と名前を分けて、専用のローカルPostgresを起動します(同じ名前だとデータが共有されてしまうため注意)。

```bash
npx prisma dev --name mba-english --port 51220 --db-port 51221 --shadow-db-port 51222
```

表示された`DATABASE_URL`を`.env`に設定し、マイグレーションとシードを実行します。

```bash
npx prisma migrate dev
npm run seed        # 瞬間英作文の20問を投入
```

`.env.local`に`GEMINI_API_KEY`を設定してください(TravelDiaryと同じキーを流用可)。

### 起動

```bash
npm run dev
```

## 本番デプロイ(GitHub + Vercel)

1. **GitHubリポジトリを作成**してこのディレクトリをpush
2. **Vercelでプロジェクト作成**(このリポジトリをインポート)
3. **Postgres**: Vercel Postgres / [Neon](https://neon.tech)(無料枠あり)などでDBを作成し、
   接続文字列を Vercel の環境変数 `DATABASE_URL` に設定
4. **Vercel Blob**: Vercelダッシュボード → Storage → Blob でStoreを作成し、
   発行されたトークンを環境変数 `BLOB_READ_WRITE_TOKEN` に設定
5. **Gemini APIキー**を環境変数 `GEMINI_API_KEY` に設定(TravelDiaryと同じキーでOK)
6. デプロイ後、本番DBに対して初回のみ以下を実行(ローカルから本番の`DATABASE_URL`を指定して):
   ```bash
   DATABASE_URL="<本番のURL>" npx prisma migrate deploy
   DATABASE_URL="<本番のURL>" npm run seed
   ```

## 音源の自動取り込み(GitHub Actions)

`.github/workflows/ingest.yml` が毎日1回(JST朝7時)、BBC News / BBC 6 Minute English /
FT News Briefing / TED Talksの新着エピソードを1本ずつ取得し、Whisperで文字起こしして
本番DBに保存します。GitHubリポジトリの Settings → Secrets and variables → Actions で
以下を登録してください。

- `DATABASE_URL`: 本番Postgresの接続文字列
- `BLOB_READ_WRITE_TOKEN`: Vercel Blobのトークン

手動実行(Actions タブ → Ingest audio sources → Run workflow)や、取得件数の変更も可能です。

## 機能

- **ディクテーション**: BBC/TED等の実音源でセンテンス単位のディクテーション。間違えたセンテンスは
  復習リストに自動登録(簡易間隔反復)
- **瞬間英作文**: 日本語のビジネス文をマイクで話して(または入力して)英作文。5秒のシンキングタイム後、
  自動でマイクが起動し、話し終わると自動でGemini APIが採点・フィードバック
  - マイク入力はHTTPS(またはlocalhost)でのみ動作します。Vercelにデプロイすれば自動的にHTTPSになるため、
    スマホでも問題なく使えます

## 未実装(PC版アプリの担当)

- AI会話練習(ローカルLLM/Claude APIでのロールプレイ)
- 学習進捗ダッシュボード
