# セーブポイント: Kubernetes関連記述削除

## 作業日時
2025年1月20日

## 変更概要
設計書からKubernetes関連の記述を削除し、Docker Composeベースのデプロイメント戦略に統一

## 変更内容詳細

### 1. Infrastructure設定からの削除
- `orchestration: Kubernetes` を削除
- Docker Composeベースのコンテナオーケストレーションに統一

### 2. ディレクトリ構成からの削除
以下のKubernetes関連ディレクトリ構成を削除：
```
├── kubernetes/
│   ├── base/
│   ├── overlays/
│   └── kustomization.yaml
```

## 技術的影響

### メリット
1. **簡素化**: 運用の複雑性を大幅に削減
2. **学習コスト削減**: Kubernetesの専門知識が不要
3. **開発効率**: より迅速な開発・デプロイサイクル
4. **コスト削減**: Kubernetesクラスター運用コストの削減
5. **小規模チーム適応**: 小中規模プロジェクトに適したシンプルな構成

### 調整が必要な要素
1. **スケーリング**: 手動でのDocker Composeスケーリング
2. **高可用性**: Docker Swarmモードまたは複数ホスト構成の検討
3. **サービスディスカバリー**: DNS解決ベースのサービス連携
4. **ロードバランシング**: Nginxによるアプリケーションレベル対応

## 代替アーキテクチャ

### Docker Compose中心のデプロイメント戦略
```yaml
# 本番環境でのDocker Composeスケーリング例
services:
  app:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1GB
        reservations:
          cpus: '0.5'
          memory: 512MB
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

### 高可用性確保のオプション
1. **Docker Swarmモード**: 複数ホスト間でのコンテナオーケストレーション
2. **複数環境展開**: 複数のDocker Composeスタックによる冗長化
3. **外部ロードバランサー**: HAProxy/Nginxによる負荷分散
4. **データベースクラスタリング**: PostgreSQL/MongoDBのレプリケーション

## 更新されたデプロイメント戦略

### 開発環境
- Docker Compose for development (`docker-compose.dev.yml`)
- ホットリロード対応
- デバッグモード有効

### ステージング環境
- Docker Compose for staging (`docker-compose.staging.yml`)
- 本番同等の設定
- パフォーマンステスト対応

### 本番環境
- Docker Compose for production (`docker-compose.prod.yml`)
- リソース制限設定
- ヘルスチェック強化
- 自動再起動設定

## 次のステップ

### 設定ファイル整備
1. 環境別docker-compose.ymlファイルの作成
2. Docker Swarmモードの検討と設定
3. Nginxロードバランサー設定の強化
4. 監視・ログ収集の強化

### 運用手順の見直し
1. Docker Composeベースのデプロイメント手順書作成
2. スケーリング手順の文書化
3. 障害対応手順の更新
4. バックアップ・リストア手順の確認

### 性能・可用性の確保
1. Docker Swarmモードでの高可用性検証
2. 複数ホストでの負荷分散テスト
3. 障害復旧テストの実施
4. 容量計画の見直し

## 関連ファイル
- `docs/design.md` - システム設計書（更新済み）
- `docker-compose.yml` - 基本のDocker Compose設定
- `docker-compose.prod.yml` - 本番環境設定（作成予定）
- `infrastructure/docker/` - Docker関連設定ディレクトリ

## 備考
Kubernetesの削除により、医療サポートチャットボットプロジェクトはよりシンプルで管理しやすいアーキテクチャになりました。将来的に大規模スケーリングが必要になった場合は、Docker SwarmモードやKubernetesへの移行を再検討することも可能です。 