# QAChat SBIRTベクトル検索機能 実装ドキュメント

## 概要
QAChatページにSBIRT（Screening, Brief Intervention, and Referral to Treatment）方式を採用し、ユーザーの質問に対して類似するFAQを検索・表示する機能を実装しました。

## 機能仕様

### 1. 質問入力時の動作
1. ユーザーが質問を入力して送信
2. 質問テキストがベクトル化され、ChromaDBで類似検索
3. 類似度の高い上位3件のFAQが表示される

### 2. 類似質問の表示
- 類似するFAQがカード形式で表示
- 各カードには以下の情報を表示：
  - 質問タイトル
  - 質問内容（2行まで）
  - カテゴリ名
  - 類似度スコア（パーセンテージ）

### 3. 回答表示
- 類似質問カードをクリックすると、その回答が表示される
- 回答には以下が含まれる：
  - 元の質問内容
  - 詳細な回答内容
  - 信頼度スコア
  - 情報源（カテゴリ、記録番号）

## 技術実装

### フロントエンド（React/Next.js）

#### 変更ファイル
- `/frontend/src/app/qachat/page.tsx`

#### 主要な変更点

1. **インターフェース定義の拡張**
```typescript
interface SuggestedQuestion {
  faq_id: string;
  record_number: string;
  question_title: string;
  question_content: string;
  answer_content: string;
  category_name: string;
  similarity_score: number;
}
```

2. **API通信処理**
```typescript
const response = await fetch('/api/qa/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: question,
    n_results: 3,
  }),
});
```

3. **類似質問表示UI**
- グラデーション背景で視覚的に区別
- ホバー時のインタラクション効果
- クリック可能なカード形式

4. **回答表示処理**
```typescript
const handleQuestionClick = (suggestion: SuggestedQuestion) => {
  // クリックされた質問の回答を表示
  const answerMessage: QAMessage = {
    id: Date.now().toString(),
    type: "answer",
    content: `【質問】\n${suggestion.question_title}\n\n【回答】\n${suggestion.answer_content}`,
    // ... 他のプロパティ
  };
  setMessages(prev => [...prev, answerMessage]);
};
```

### バックエンド（FastAPI）

#### APIエンドポイント
- **POST** `/api/qa/search`
  - ベクトル類似度検索を実行
  - 上位N件の類似FAQを返す

#### レスポンス形式
```json
{
  "results": [
    {
      "faq_id": "uuid",
      "record_number": "FAQ-001",
      "question_title": "質問タイトル",
      "question_content": "質問内容",
      "answer_content": "回答内容",
      "category_name": "カテゴリ名",
      "similarity_score": 0.95
    }
  ],
  "total_results": 3,
  "query": "元の質問"
}
```

## ベクトル検索の仕組み

### ChromaDBコレクション
- コレクション名: `qa_faq_embeddings`
- 埋め込みモデル: `paraphrase-multilingual-mpnet-base-v2`（多言語対応）

### 検索プロセス
1. 質問テキストを埋め込みベクトルに変換
2. ChromaDBでコサイン類似度による検索
3. メタデータフィルター（カテゴリ、ステータス）適用可能
4. 類似度スコアでソートして返却

## UI/UXの特徴

### ビジュアルデザイン
- **類似質問カード**: 青系グラデーション背景
- **ホバー効果**: 枠線とシャドウの変化
- **類似度表示**: パーセンテージで直感的に理解可能

### ユーザビリティ
- ワンクリックで回答表示
- 類似度により関連性を判断可能
- カテゴリ表示で文脈を理解しやすい

## 既存機能への影響

### 変更なし
- 左側のクイック質問機能
- 右側の統計情報表示
- チャット履歴の管理
- その他の既存デザイン要素

### 互換性
- 既存のチャット機能と完全互換
- フォールバック処理により、API障害時も動作継続

## 使用方法

1. **質問入力**
   - 入力フィールドに質問を入力
   - Enterキーまたは送信ボタンをクリック

2. **類似質問の確認**
   - 表示された類似質問カードを確認
   - 類似度スコアで関連性を判断

3. **回答の取得**
   - 適切な質問カードをクリック
   - 詳細な回答が表示される

## パフォーマンス考慮事項

- **ベクトル検索**: 高速なコサイン類似度計算
- **結果数制限**: デフォルト3件（設定可能）
- **キャッシング**: ChromaDB内部キャッシュ利用

## トラブルシューティング

### 類似質問が表示されない
1. ChromaDBインデックスの確認
2. FAQデータの存在確認
3. API接続の確認

### 回答が不正確
1. 埋め込みモデルの確認
2. インデックス再構築を検討
3. FAQデータの品質確認

## 今後の拡張可能性

- カテゴリ別フィルタリングUI
- 類似度閾値の調整機能
- フィードバック機能（有用性評価）
- 検索履歴の保存と分析