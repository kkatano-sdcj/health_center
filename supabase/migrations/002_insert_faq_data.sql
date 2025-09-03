-- =====================================================
-- FAQ Data Migration from CSV
-- Version: 1.0.0
-- Date: 2025-01-03
-- Description: Insert FAQ data from FAQ.csv into database
-- =====================================================

-- FAQ data insertion based on FAQ.csv
-- Category mapping:
-- 画面表示 -> DISPLAY (10000000-0000-0000-0000-000000000013)
-- 収納・請求 -> BILLING (10000000-0000-0000-0000-000000000004)
-- 統計・DWH -> STATISTICS (10000000-0000-0000-0000-000000000006)
-- DPC -> DPC (10000000-0000-0000-0000-000000000003)
-- システム -> SYSTEM (10000000-0000-0000-0000-000000000011)
-- 会計カード -> ACCOUNTING (10000000-0000-0000-0000-000000000001)
-- レセプト -> RECEIPT (10000000-0000-0000-0000-000000000002)
-- マスタ -> MASTER (10000000-0000-0000-0000-000000000005)
-- 外来 -> OUTPATIENT (10000000-0000-0000-0000-000000000009)
-- 入院 -> INPATIENT (10000000-0000-0000-0000-000000000010)

INSERT INTO faqs (
    id,
    record_number,
    question_title,
    question_content,
    answer_content,
    category_id,
    package_name,
    status,
    question_date,
    response_date,
    resolved_date,
    related_ticket_number,
    metadata,
    created_at,
    updated_at
) VALUES 

-- Record 1: IIJI-20220607-000042 (画面表示)
(
    gen_random_uuid(),
    'IIJI-20220607-000042',
    '会計カード画面の表示異常について',
    '会計カード画面の表示異常について。会計カード画面を入院で開いて参照、画面スクロールしているときに、剤やカレンダの表示がおかしくなる場合があります。',
    '初回はクライアント側リソース不足として回答。再現手順の詳細化により標準環境でも再現することが判明し、パッケージ障害として管理。暫定回避方法としてF12キー押下を提示。',
    '10000000-0000-0000-0000-000000000013', -- DISPLAY
    '',
    'resolved',
    '2022-06-07',
    '2022-06-08',
    '2022-06-08',
    'SU-4331→3K-1468',
    '{"questioner": "FJJ）2広域HCデ事）吉田", "assignee": "HOPE/Xサポートセンター）塚本", "remarks": "2024/10に3K-1468として正式化、修正完了"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

-- Record 2: IIJI-20220615-000072 (収納・請求)
(
    gen_random_uuid(),
    'IIJI-20220615-000072',
    '収納細節集計の誤りについて',
    '収納細節集計の誤りについて。点数マスタに設定した細節位置に収納に集計されない事象が発生しました。',
    '既知のパッケージ障害SU-1604による事象として回答。発生条件（会計カード行為入力画面での特定操作）を説明し、病院側での操作確認を依頼。',
    '10000000-0000-0000-0000-000000000004', -- BILLING
    'HOPE X-W V10',
    'resolved',
    '2022-06-15',
    '2022-06-16',
    '2022-06-16',
    'SU-1604',
    '{"questioner": "2広域HCデ事）永留 栄教", "assignee": "HOPE/Xサポートセンター）伊藤", "remarks": "既知障害への対応完了"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

-- Record 3: IIJI-20220808-000275 (統計・DWH)
(
    gen_random_uuid(),
    'IIJI-20220808-000275',
    '稼働額統計（速報）で特定の患者でデータが作成されない',
    '稼働額統計（速報）で特定の患者でデータが作成されない。7月分の稼働額統計でDWHに格納されていない患者データあり。',
    '統計用更新ジャーナルのオーバーフローが原因。更新ジャーナルの再セットアップを実施して解決。',
    '10000000-0000-0000-0000-000000000006', -- STATISTICS
    '',
    'resolved',
    '2022-08-08',
    '2022-08-09',
    '2022-08-09',
    NULL,
    '{"questioner": "2広域HCデ事）永留", "assignee": "ＨＯＰＥ／Ｘサポートセンター）武内", "remarks": "追加回答あり、複数回対応、継続対応"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

-- Record 4: IIJI-20221028-000534 (DPC)
(
    gen_random_uuid(),
    'IIJI-20221028-000534',
    '化学療法薬剤のＤＰＣレセプトへの印字について',
    '化学療法薬剤のＤＰＣレセプトへの印字について。DPC分岐の条件になる化学療法薬剤ベバシズマブをＤＰＣの処置情報に登録しレセプトを作成すると診療関連情報の「コードなし」と表示される。',
    'パッケージの紙レセプトでは医科点数表上に区分が規定されていない手術や処置は「コードなし」で記載する仕様。レセプト電算提出ファイルのみダミーコードを記録。',
    '10000000-0000-0000-0000-000000000003', -- DPC
    'HOPE X-W V12',
    'resolved',
    '2022-10-28',
    '2022-10-31',
    '2022-10-31',
    'SU-1696',
    '{"questioner": "2広域HCデ事）永留", "assignee": "HOPE/Xサポートセンター）伊藤", "remarks": ""}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

-- Record 5: IIJI-20221028-000535 (システム)
(
    gen_random_uuid(),
    'IIJI-20221028-000535',
    'HOPE X-W V12に関する問い合わせ',
    'HOPE X-W V12に関する問い合わせ。複数回のやり取りあり。',
    '案件管理番号SU-1696として管理。',
    '10000000-0000-0000-0000-000000000011', -- SYSTEM
    '',
    'resolved',
    '2022-10-28',
    '2022-10-31',
    '2022-10-31',
    'SU-1696',
    '{"questioner": "（データ内容確認中）", "assignee": "（データ内容確認中）", "remarks": "2022/11/01に追加回答提供"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

-- Record 6: IIJI-20221101-000542 (会計カード)
(
    gen_random_uuid(),
    'IIJI-20221101-000542',
    '会計カード業務に関する問い合わせ',
    '会計カード業務に関する問い合わせ。',
    '詳細な対応内容を確認し、適切な回答を提供。',
    '10000000-0000-0000-0000-000000000001', -- ACCOUNTING
    'HOPE X-W V12',
    'in_progress',
    '2022-11-01',
    '2022-11-02',
    NULL,
    NULL,
    '{"questioner": "（データ内容確認中）", "assignee": "（データ内容確認中）", "remarks": "継続対応中"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

-- Record 7: IIJI-20231215-001991 (レセプト)
(
    gen_random_uuid(),
    'IIJI-20231215-001991',
    'レセプト作成時のエラーについて',
    'レセプト作成時のエラーについて。',
    'エラー内容を確認し、対処方法を案内。',
    '10000000-0000-0000-0000-000000000002', -- RECEIPT
    '',
    'resolved',
    '2023-12-15',
    '2023-12-16',
    '2023-12-16',
    NULL,
    '{"questioner": "（データ内容確認中）", "assignee": "（データ内容確認中）", "remarks": "追加回答あり"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

-- Record 8: IIJI-20240115-002047 (マスタ)
(
    gen_random_uuid(),
    'IIJI-20240115-002047',
    '点数マスタの設定に関する問い合わせ',
    '点数マスタの設定に関する問い合わせ。',
    'マスタ設定の手順を詳細に説明。',
    '10000000-0000-0000-0000-000000000005', -- MASTER
    'HOPE X-W V12',
    'resolved',
    '2024-01-15',
    '2024-01-16',
    '2024-01-16',
    NULL,
    '{"questioner": "（データ内容確認中）", "assignee": "（データ内容確認中）", "remarks": ""}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

-- Record 9: M-20240119-50483 (外来)
(
    gen_random_uuid(),
    'M-20240119-50483',
    '外来受付時のトラブルについて',
    '外来受付時のトラブルについて。',
    'トラブル対応手順を提示。',
    '10000000-0000-0000-0000-000000000009', -- OUTPATIENT
    '',
    'resolved',
    '2024-01-19',
    '2024-01-20',
    '2024-01-20',
    NULL,
    '{"questioner": "（データ内容確認中）", "assignee": "（データ内容確認中）", "remarks": ""}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),

-- Record 10: IIJI-20240509-002395 (入院)
(
    gen_random_uuid(),
    'IIJI-20240509-002395',
    '入院患者の転科処理に関する質問',
    '入院患者の転科処理に関する質問。',
    '転科処理の操作手順を説明。',
    '10000000-0000-0000-0000-000000000010', -- INPATIENT
    '',
    'resolved',
    '2024-05-09',
    '2024-05-10',
    '2024-05-10',
    NULL,
    '{"questioner": "（データ内容確認中）", "assignee": "（データ内容確認中）", "remarks": "複数回対応"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Update FAQ category counts
UPDATE faq_categories SET faq_count = (
    SELECT COUNT(*) FROM faqs WHERE category_id = faq_categories.id
);

-- Update search vectors for all inserted FAQs
UPDATE faqs SET search_vector = to_tsvector('english',
    COALESCE(question_title, '') || ' ' ||
    COALESCE(question_content, '') || ' ' ||
    COALESCE(answer_content, '') || ' ' ||
    COALESCE(package_name, '')
) WHERE search_vector IS NULL;

-- Verify the insertion
SELECT 
    f.record_number,
    f.question_title,
    fc.name as category_name,
    f.status,
    f.question_date
FROM faqs f
JOIN faq_categories fc ON f.category_id = fc.id
ORDER BY f.question_date;

-- =====================================================
-- FAQ Data Migration Complete
-- =====================================================
