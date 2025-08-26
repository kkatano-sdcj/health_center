# セーブポイント: PineconeからChromaDBへの完全移行

## 作業日時
2025年1月20日

## 変更概要
ベクトルデータベースをPineconeからChromaDBに完全移行し、プロジェクト内のすべての関連記述を更新

## 変更内容詳細

### 1. データベースルール更新
**ファイル**: `.cursor/rules/database-rules.mdc`
- 技術スタック: `Pinecone (マネージドサービス)` → `ChromaDB (オープンソース)`
- コメント: `実際のベクトル検索はPineconeで実行` → `実際のベクトル検索はChromaDBで実行`

### 2. グローバルルール更新
**ファイル**: `.cursor/rules/global-rules.mdc`
- データベース構成: `PostgreSQL, MongoDB, Redis, Pinecone` → `PostgreSQL, MongoDB, Redis, ChromaDB`

### 3. バックエンドルール更新
**ファイル**: `.cursor/rules/backend-rules.mdc`
- ベクトルDB: `Pinecone` → `ChromaDB`
- LangChain実装パターン:
```diff
- self.vector_store = Pinecone.from_existing_index(
-     index_name=config.pinecone_index,
-     embedding=OpenAIEmbeddings()
- )
+ self.vector_store = Chroma(
+     collection_name=config.chroma_collection,
+     embedding_function=OpenAIEmbeddings(),
+     persist_directory=config.chroma_persist_dir
+ )
```

### 4. Python依存関係更新
**ファイル**: `backend/requirements.txt`
```diff
- pinecone-client==3.0.0
+ chromadb==0.4.18
```

### 5. 設定ファイル更新
**ファイル**: `backend/app/core/config.py`
```diff
- # Pinecone
- PINECONE_API_KEY: str = ""
- PINECONE_ENVIRONMENT: str = ""
- PINECONE_INDEX_NAME: str = "health-center-vectors"
+ # ChromaDB
+ CHROMA_PERSIST_DIR: str = "/app/data/chroma"
+ CHROMA_COLLECTION_NAME: str = "health-center-vectors"
+ CHROMA_HOST: str = "localhost"
+ CHROMA_PORT: int = 8000
```

### 6. ベクトル検索サービス全面刷新
**ファイル**: `backend/app/services/vector_search.py`
- PineconeクライアントからChromaDBクライアントに完全移行
- 新機能追加:
  - `delete_document()`: ドキュメント削除機能
  - `update_document()`: ドキュメント更新機能
  - `get_collection_stats()`: 統計情報取得機能
- 非同期処理の最適化
- ChromaDBの距離スコアから類似度スコアへの変換

### 7. Docker設定更新
**ファイル**: `docker-compose.yml`
- 環境変数変更:
```diff
- PINECONE_API_KEY=${PINECONE_API_KEY}
- PINECONE_ENVIRONMENT=${PINECONE_ENVIRONMENT}
+ CHROMA_PERSIST_DIR=/app/data/chroma
+ CHROMA_COLLECTION_NAME=health-center-vectors
```
- ボリューム追加:
```diff
volumes:
  - ./backend:/app
+ - chroma_data:/app/data/chroma
```
- 永続化ボリューム定義追加:
```diff
volumes:
  postgres_data:
  mongodb_data:
+ chroma_data:
```

### 8. デプロイメントルール更新
**ファイル**: `.cursor/rules/deployment-rules.mdc`
- Secret管理:
```diff
- pinecone_api_key: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
+ chroma_persist_dir: "/app/data/chroma"
```
- 環境別設定:
  - 開発環境: `PINECONE_API_KEY=mock-key` → `CHROMA_PERSIST_DIR=/app/data/chroma`
  - ステージング環境: `PINECONE_API_KEY=staging-pinecone-key` → `CHROMA_PERSIST_DIR=/app/data/chroma`
  - 本番環境: `PINECONE_API_KEY=${PINECONE_API_KEY}` → `CHROMA_PERSIST_DIR=/app/data/chroma`

### 9. タスク管理更新
**ファイル**: `docs/tasks.md`
- TASK-005: `Pinecone設定` → `ChromaDB設定`
  - 詳細: `アカウント作成、インデックス作成、APIキー取得` → `コレクション設定、永続化設定`
- TASK-016: `Pinecone統合` → `ChromaDB統合`
  - コメント: `インデックス接続設定` → `コレクション接続設定`
  - アップロード先: `Pineconeへのアップロード` → `ChromaDBへのアップロード`

## 技術的影響とメリット

### ChromaDBの特徴
1. **オープンソース**: 無料で利用可能、ベンダーロックイン回避
2. **自己ホスト型**: データの完全管理、医療データのセキュリティ強化
3. **Python統合**: シンプルなAPI、LangChainとの親和性
4. **永続化機能**: ローカルストレージへの自動保存
5. **高速検索**: 効率的なベクトル類似度検索

### 運用上のメリット
1. **コスト削減**: マネージドサービス料金が不要
2. **データ主権**: 医療データを外部に送信せずに処理
3. **カスタマイズ性**: 設定の自由度が高い
4. **可用性**: インターネット接続に依存しない
5. **スケーラビリティ**: 必要に応じたリソース調整が可能

### 移行に伴う新機能
1. **ドキュメント管理**: 更新・削除機能の追加
2. **統計情報**: コレクションの詳細情報取得
3. **非同期最適化**: 大量データ処理の効率化
4. **永続化管理**: 自動バックアップとリストア

## ChromaDBサービス実装のポイント

### 初期化処理
```python
self.client = chromadb.PersistentClient(
    path=settings.CHROMA_PERSIST_DIR,
    settings=Settings(anonymized_telemetry=False)
)
```

### コレクション管理
```python
collection = self.client.create_collection(
    name=collection_name,
    metadata={"hnsw:space": "cosine"}
)
```

### 非同期ベクトル化
```python
loop = asyncio.get_event_loop()
embedding = await loop.run_in_executor(None, self.encoder.encode, text)
```

### 距離から類似度への変換
```python
score = 1 - results['distances'][0][i]  # ChromaDBは距離を返すため
```

## 運用上の考慮事項

### バックアップ戦略
- `chroma_data`ボリュームの定期バックアップ
- データの整合性確認機能
- 災害復旧テストの実施

### 監視項目
- ディスク使用量の監視
- クエリ応答時間の測定
- コレクションサイズの管理
- エラー率の監視

### パフォーマンス最適化
- チャンクサイズの調整
- 埋め込みモデルの最適化
- インデックス設定の調整
- メモリ使用量の管理

## 今後の推奨事項

### 短期的対応（1ヶ月以内）
1. ChromaDBのパフォーマンステスト実施
2. 大量データでの負荷テスト
3. バックアップ・リストア手順の確立
4. 監視ダッシュボードの構築

### 中期的対応（3ヶ月以内）
1. スケーリング戦略の策定
2. 高可用性設定の検討
3. セキュリティ監査の実施
4. 運用自動化の拡充

### 長期的対応（6ヶ月以内）
1. ChromaDBクラスター構成の検討
2. 分散処理機能の評価
3. MLモデルの最適化
4. システム全体の性能改善

## 関連ファイル
- `.cursor/rules/database-rules.mdc` - データベースルール（更新済み）
- `.cursor/rules/global-rules.mdc` - グローバルルール（更新済み）
- `.cursor/rules/backend-rules.mdc` - バックエンドルール（更新済み）
- `.cursor/rules/deployment-rules.mdc` - デプロイメントルール（更新済み）
- `backend/app/core/config.py` - アプリケーション設定（更新済み）
- `backend/app/services/vector_search.py` - ベクトル検索サービス（全面刷新）
- `backend/requirements.txt` - Python依存関係（更新済み）
- `docker-compose.yml` - Docker設定（更新済み）
- `docs/tasks.md` - タスク管理（更新済み）

## 備考
この移行により、医療サポートチャットボットプロジェクトのベクトル検索機能がより安全で管理しやすい環境に移行されました。ChromaDBの自己ホスト型アーキテクチャにより、医療データのセキュリティが強化され、運用コストの削減も実現されています。

PineconeからChromaDBへの移行は完了しましたが、実際の本番運用では、性能テストとセキュリティ監査を十分に実施することを強く推奨します。 