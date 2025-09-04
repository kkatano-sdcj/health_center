-- FAQテーブルの作成
CREATE TABLE IF NOT EXISTS faqs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100) DEFAULT '全般',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_created_at ON faqs(created_at DESC);

-- RLSを有効化
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- すべてのユーザーが読み取り可能にするポリシー
CREATE POLICY "FAQs are viewable by everyone" ON faqs
  FOR SELECT USING (true);

-- 認証されたユーザーのみ作成、更新、削除可能にするポリシー（オプション）
CREATE POLICY "Authenticated users can insert FAQs" ON faqs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update FAQs" ON faqs
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete FAQs" ON faqs
  FOR DELETE USING (auth.role() = 'authenticated');

-- サンプルデータの挿入
INSERT INTO faqs (question, answer, category, tags) VALUES
('システムにログインできません', 'ブラウザのキャッシュをクリアしてから再度お試しください。それでもログインできない場合は、パスワードのリセットを行ってください。', 'トラブルシューティング', ARRAY['ログイン', 'アクセス']),
('ドキュメントをアップロードする方法を教えてください', 'メインメニューから「アップロード」ページにアクセスし、ファイルをドラッグ＆ドロップするか、「ファイルを選択」ボタンをクリックしてファイルを選択してください。', '使い方', ARRAY['アップロード', 'ドキュメント']),
('対応しているファイル形式は何ですか？', 'PDF、Word（.docx）、Excel（.xlsx）、PowerPoint（.pptx）、およびテキストファイル（.txt）に対応しています。', '技術的な質問', ARRAY['ファイル形式', '対応形式']),
('データのバックアップはどのように行われますか？', 'システムは毎日自動的にバックアップを作成しています。また、重要な更新の前には手動バックアップも可能です。', 'セキュリティ', ARRAY['バックアップ', 'データ保護']),
('検索結果が表示されません', '検索キーワードを確認し、より一般的な用語を使用してみてください。また、フィルター設定が適切か確認してください。', 'トラブルシューティング', ARRAY['検索', 'トラブル']);