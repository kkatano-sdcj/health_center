# セーブポイント: ChromaDB統合作業

## 作業日時
2025年1月20日

## 変更概要
ベクトルデータベースをPineconeからChromaDBに変更し、必要な技術要件を設計書に追記

## 変更内容詳細

### 1. アーキテクチャ図の更新
- システム全体構成図のベクトルDB部分をPineconeからChromaDBに変更
- 自己ホスト型のベクトルDBとしてChromaDBを追加

### 2. 技術スタックの更新
- Backend技術スタックに`"vector_database": "chromadb 0.4.x"`を追加
- Infrastructure要件にChromaDBの詳細仕様を追加:
  - CPU: 2コア最小、4コア推奨
  - Memory: 4GB最小、8GB推奨
  - Storage: SSD 100GB以上
  - Network: 内部通信1Gbps

### 3. MLサービス実装の変更
- `from langchain.vectorstores import Pinecone` → `from langchain.vectorstores import Chroma`
- PineconeクライアントからChromaDBクライアントへの変更
- 設定パラメータの更新（host, port, collection_name）

### 4. ChromaDBベクトルDB設計の追加
- ChromaDB設定要件（CHROMA_CONFIG）
- コレクション設計（collection_config）
- ドキュメントメタデータ構造
- システム要件とバックアップ戦略
- パフォーマンス最適化指針

### 5. ChromaDB実装例の追加
- ChromaDBServiceクラスの完全実装
- ドキュメント追加、類似度検索、統計情報取得機能
- エラーハンドリングとログ出力

### 6. ChromaDB監視とメンテナンス
- ヘルスチェック機能
- ストレージ容量監視（80%閾値アラート）
- データマイグレーション機能

### 7. セキュリティとパフォーマンス設定
- Dockerfileの設定例
- パフォーマンス設定ファイル（chroma_config.yml）
- 運用チェックリスト（日常・週次・月次）

### 8. Docker Compose設定の更新
- ChromaDBサービスを追加
- ml-serviceの環境変数をPineconeからChromaDBに変更
- chroma_dataボリュームを追加
- 依存関係の設定

### 9. 環境変数設定の更新
- PineconeからChromaDBへの環境変数変更:
  - `PINECONE_API_KEY` → 削除
  - `PINECONE_INDEX` → 削除
  - `CHROMA_HOST` → 追加
  - `CHROMA_PORT` → 追加
  - `CHROMA_COLLECTION` → 追加
  - `CHROMA_PERSIST_DIRECTORY` → 追加

## 技術的影響

### メリット
1. **コスト削減**: マネージドサービス（Pinecone）から自己ホスト型への移行
2. **データ主権**: 医療データを自社環境内で完全管理
3. **カスタマイズ性**: 設定の自由度向上
4. **可用性**: インターネット接続に依存しない運用

### 考慮事項
1. **運用負荷**: 自己管理による運用コストの増加
2. **スケーラビリティ**: 手動でのスケーリング対応が必要
3. **バックアップ**: 自前でのバックアップ戦略実装が必要
4. **監視**: 包括的な監視システムの構築が必要

## 次のステップ

### 実装フェーズ
1. ChromaDBサービスのDocker環境構築
2. MLサービスのChromaDB統合実装
3. データマイグレーション機能の実装
4. 監視・アラート機能の実装

### テストフェーズ
1. ChromaDBの性能テスト
2. 大量データでの負荷テスト
3. 災害復旧テスト
4. セキュリティテスト

### 運用フェーズ
1. 監視ダッシュボードの設定
2. バックアップ自動化の実装
3. 運用手順書の作成
4. チーム向けトレーニングの実施

## 関連ファイル
- `docs/design.md` - システム設計書（本ファイル）
- `backend/services/ml/requirements.txt` - 依存関係（更新予定）
- `docker-compose.yml` - Docker設定（更新予定）
- `.env.example` - 環境変数設定（更新予定）

## 備考
ChromaDBは比較的新しいプロジェクトのため、運用中のアップデートやセキュリティパッチの適用については定期的な確認が必要。また、大規模データでの性能については実際の負荷テストを通じて検証する必要がある。 