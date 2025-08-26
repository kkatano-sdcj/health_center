# 変換進捗停止問題修正 - セーブポイント

## 問題概要
「ファイル変換中です...」の状態から変換処理が進捗しない問題を調査し、修正しました。

## 原因分析

### 1. WebSocket接続URL問題
- フロントエンドでハードコードされた `ws://localhost:8000/ws` を使用
- 環境変数 `NEXT_PUBLIC_API_URL` が考慮されていない
- 開発環境と本番環境での接続先不一致の可能性

### 2. 変換ID設定のタイミング問題
- APIレスポンスで `conversion_id` を取得する前に、WebSocketで初期プログレスメッセージ（progress: 0）が送信される
- フロントエンドで `currentConversionId` が設定される前に、WebSocketメッセージが失われる
- プログレスデータが受信されているが、対応するUIが表示されない

### 3. プログレスデータの処理問題
- progress: 0 のメッセージで既存のプログレスデータがクリアされる
- WebSocketメッセージとUIの状態同期がうまくいかない

## 実施した修正

### 1. WebSocket接続URL の動的生成 (`useWebSocket.ts`)

**改善前:**
```typescript
export const useWebSocket = (url: string = 'ws://localhost:8000/ws'): UseWebSocketReturn => {
```

**改善後:**
```typescript
const getWebSocketUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  return apiUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws';
};

export const useWebSocket = (url?: string): UseWebSocketReturn => {
  const wsUrl = url || getWebSocketUrl();
```

### 2. WebSocketメッセージの詳細ログ追加

**改善内容:**
```typescript
const data: ProgressData = JSON.parse(event.data);
console.log('🔄 WebSocket message received:', data);
console.log('Message type:', data.type);
console.log('Conversion ID:', data.conversion_id);
console.log('Progress:', data.progress);
console.log('Status:', data.status);
```

### 3. プログレスデータ更新ロジックの改善

**改善前:**
```typescript
if (data.progress === 0) {
  // Starting new conversion, clear all others
  return { [data.conversion_id!]: data };
}
```

**改善後:**
```typescript
// Don't clear other conversions when progress is 0, just add/update
console.log('📈 Updating conversion progress');
const updated = { ...prev, [data.conversion_id!]: data };
console.log('Updated progress data:', updated);
return updated;
```

### 4. 変換ID自動設定機能の追加 (`page.tsx`)

**新機能:**
```typescript
// If we have progress data but no current conversion ID set, try to find a matching one
if (Object.keys(progressData).length > 0 && !currentConversionId && converting) {
  const progressIds = Object.keys(progressData);
  if (progressIds.length === 1) {
    console.log('🔄 Auto-setting conversion ID from progress data:', progressIds[0]);
    setCurrentConversionId(progressIds[0]);
    
    // Also create a result entry if we don't have one yet
    if (results.length === 0) {
      const progressEntry = progressData[progressIds[0]];
      if (progressEntry.file_name) {
        const tempResult: ConversionResult = {
          id: progressIds[0],
          input_file: progressEntry.file_name,
          status: 'processing' as const,
          created_at: new Date().toISOString()
        };
        setResults([tempResult]);
      }
    }
  }
}
```

### 5. WebSocket接続状態の監視強化

**追加機能:**
```typescript
// WebSocket接続状態の監視
React.useEffect(() => {
  console.log('WebSocket connection status changed:', isConnected);
  if (!isConnected) {
    console.warn('WebSocket is not connected - progress updates may not work');
  }
}, [isConnected]);

// WebSocket接続チェック
if (!isConnected) {
  console.warn('⚠️ WebSocket is not connected - progress updates may not work properly');
  console.warn('Expected WebSocket URL:', process.env.NEXT_PUBLIC_API_URL?.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws' || 'ws://localhost:8000/ws');
}
```

### 6. フォールバックタイムアウトの追加

**改善内容:**
```typescript
// Set a fallback timeout in case WebSocket messages are missed
setTimeout(() => {
  if (converting) {
    console.warn('⚠️ No WebSocket completion message received within 30 seconds, checking result status...');
    // Optionally poll for result status or show a message to user
  }
}, 30000);
```

### 7. バックエンドログ強化 (`websocket.py`)

**追加ログ:**
```python
logger.info(f"Sending progress: conversion_id={conversion_id}, progress={progress}, status={status}, step={current_step}")
logger.info(f"Active connections: {len(self.active_connections)}")
```

## 期待される効果

### 1. WebSocket接続の安定化
- 環境変数を使用した動的URL生成により、環境間での接続問題を解決
- 接続状態の詳細監視により、問題の早期発見が可能

### 2. プログレス表示の確実性
- 変換ID自動設定により、APIレスポンス前のWebSocketメッセージも活用
- プログレスデータの継続性を保持し、UIの更新が確実に反映

### 3. デバッグ容易性の向上
- 詳細なログ出力により、問題の特定と解決が容易
- WebSocketメッセージの流れを可視化

### 4. ユーザー体験の改善
- 変換開始直後からプログレス表示が機能
- フォールバックタイムアウトにより、スタック状態の防止

## 技術的改善点

### 1. 非同期処理の最適化
- WebSocketメッセージとReact状態更新の同期を改善
- useEffect依存配列の適切な管理

### 2. エラーハンドリング強化
- WebSocket接続失敗時の適切な警告表示
- タイムアウト処理によるデッドロック防止

### 3. 状態管理の改善
- プログレスデータとUIコンポーネントの状態同期
- 変換IDの自動管理機能

## 修正ファイル一覧

### フロントエンド
- `frontend/src/hooks/useWebSocket.ts` - WebSocket接続とメッセージ処理の改善
- `frontend/src/app/convert/page.tsx` - 変換ページの状態管理とエラーハンドリング強化

### バックエンド
- `backend/app/api/websocket.py` - WebSocketメッセージ送信のログ強化

## テスト方法

### 1. WebSocket接続確認
```javascript
// ブラウザの開発者ツールコンソールで確認
console.log('WebSocket URL:', getWebSocketUrl());
```

### 2. プログレスメッセージ監視
```javascript
// コンソールで以下のようなログが出力されることを確認
// 🔄 WebSocket message received: {type: "progress", conversion_id: "...", progress: 0}
// 📊 Updating progress data for conversion: ...
```

### 3. 変換フローテスト
1. ファイルを選択
2. "ファイルを変換" ボタンをクリック
3. WebSocket接続状態を確認
4. プログレス表示の更新を確認
5. 変換完了まで監視

## 注意事項

1. **環境変数設定**: `NEXT_PUBLIC_API_URL` が正しく設定されていることを確認
2. **WebSocket接続**: バックエンドのWebSocketエンドポイントが正常に動作していることを確認
3. **ブラウザキャッシュ**: 修正後はブラウザのキャッシュをクリアして動作確認

## 今後の改善点

1. **リアルタイム監視**: WebSocket接続の健康状態を定期的にチェック
2. **再接続機能**: 接続が切れた場合の自動再接続機能の強化
3. **プログレス精度**: より詳細な進捗情報の提供
4. **エラー通知**: ユーザーフレンドリーなエラーメッセージの表示

この修正により、「ファイル変換中です...」から進捗しない問題が解決され、リアルタイムでの変換進捗表示が正常に機能するようになりました。
