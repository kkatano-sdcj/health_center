/**
 * Health Center FAQ MCP Server 使用例
 * 
 * このファイルは、MCP FAQ Serverの様々な使用パターンを示します。
 */

import { ClientSession, StdioServerParameters } from '@modelcontextprotocol/sdk/client/index.js';
import { stdio } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * MCPクライアントクラス
 * FAQ MCP Serverとの通信を管理
 */
class FAQMCPClient {
  private session: ClientSession | null = null;

  /**
   * サーバーに接続
   */
  async connect(): Promise<void> {
    const serverParams: StdioServerParameters = {
      command: 'node',
      args: ['../dist/index.js'],
      env: {
        SUPABASE_URL: 'https://ivpwniudlxktnruxnmfy.supabase.co',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
      },
    };

    const transport = stdio(serverParams);
    this.session = new ClientSession(transport.read, transport.write);
    await this.session.initialize();
  }

  /**
   * ツールを呼び出し
   */
  async callTool(name: string, args: any): Promise<any> {
    if (!this.session) {
      throw new Error('Not connected. Call connect() first.');
    }

    const result = await this.session.callTool({ name, arguments: args });
    return JSON.parse(result.content[0].text);
  }

  /**
   * 接続を閉じる
   */
  async disconnect(): Promise<void> {
    if (this.session) {
      await this.session.close();
      this.session = null;
    }
  }
}

/**
 * 使用例1: 基本的なFAQ一覧取得
 */
async function example1_BasicFAQList() {
  console.log('=== 例1: 基本的なFAQ一覧取得 ===');
  
  const client = new FAQMCPClient();
  
  try {
    await client.connect();
    
    // FAQ一覧を取得（デフォルト設定）
    const response = await client.callTool('get_faq_list', {
      limit: 10,
      offset: 0,
      sort_by: 'view_count'
    });
    
    if (response.success) {
      console.log(`取得したFAQ数: ${response.data.faqs.length}`);
      console.log(`総FAQ数: ${response.data.count}`);
      
      response.data.faqs.forEach((faq: any, index: number) => {
        console.log(`${index + 1}. ${faq.question_title}`);
        console.log(`   カテゴリ: ${faq.faq_categories?.name}`);
        console.log(`   閲覧回数: ${faq.view_count}`);
        console.log(`   役立った: ${faq.helpful_count}`);
        console.log('');
      });
    } else {
      console.error('エラー:', response.error);
    }
    
  } catch (error) {
    console.error('接続エラー:', error);
  } finally {
    await client.disconnect();
  }
}

/**
 * 使用例2: カテゴリ別FAQ取得
 */
async function example2_CategoryFAQs() {
  console.log('=== 例2: カテゴリ別FAQ取得 ===');
  
  const client = new FAQMCPClient();
  
  try {
    await client.connect();
    
    // まずカテゴリ一覧を取得
    const categoriesResponse = await client.callTool('get_faq_categories', {
      active_only: true
    });
    
    if (categoriesResponse.success) {
      console.log('利用可能なカテゴリ:');
      categoriesResponse.data.forEach((category: any) => {
        console.log(`- ${category.name} (${category.code}): ${category.faq_count}件`);
      });
      console.log('');
      
      // レセプトカテゴリのFAQを取得
      const faqResponse = await client.callTool('get_faq_list', {
        limit: 5,
        category_code: 'RECEIPT',
        sort_by: 'helpful_count'
      });
      
      if (faqResponse.success) {
        console.log('レセプトカテゴリのFAQ:');
        faqResponse.data.faqs.forEach((faq: any, index: number) => {
          console.log(`${index + 1}. ${faq.question_title}`);
          console.log(`   役立った: ${faq.helpful_count}回`);
          console.log('');
        });
      }
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await client.disconnect();
  }
}

/**
 * 使用例3: FAQ検索
 */
async function example3_SearchFAQs() {
  console.log('=== 例3: FAQ検索 ===');
  
  const client = new FAQMCPClient();
  
  try {
    await client.connect();
    
    // 「エラー」で検索
    const searchResponse = await client.callTool('search_faqs', {
      query: 'エラー',
      limit: 5
    });
    
    if (searchResponse.success) {
      console.log(`「エラー」の検索結果: ${searchResponse.data.length}件`);
      
      searchResponse.data.forEach((faq: any, index: number) => {
        console.log(`${index + 1}. ${faq.question_title}`);
        console.log(`   カテゴリ: ${faq.faq_categories?.name}`);
        console.log(`   閲覧回数: ${faq.view_count}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await client.disconnect();
  }
}

/**
 * 使用例4: FAQ詳細取得と閲覧回数更新
 */
async function example4_FAQDetailAndViewCount() {
  console.log('=== 例4: FAQ詳細取得と閲覧回数更新 ===');
  
  const client = new FAQMCPClient();
  
  try {
    await client.connect();
    
    // まず適当なFAQを取得
    const listResponse = await client.callTool('get_faq_list', {
      limit: 1,
      sort_by: 'created_at'
    });
    
    if (listResponse.success && listResponse.data.faqs.length > 0) {
      const faqId = listResponse.data.faqs[0].id;
      const beforeViewCount = listResponse.data.faqs[0].view_count;
      
      console.log(`FAQ ID: ${faqId}`);
      console.log(`更新前の閲覧回数: ${beforeViewCount}`);
      
      // FAQ詳細を取得（閲覧回数を自動増加）
      const detailResponse = await client.callTool('get_faq_detail', {
        faq_id: faqId,
        increment_view: true
      });
      
      if (detailResponse.success) {
        console.log('FAQ詳細:');
        console.log(`タイトル: ${detailResponse.data.question_title}`);
        console.log(`質問内容: ${detailResponse.data.question_content}`);
        console.log(`回答内容: ${detailResponse.data.answer_content}`);
        console.log(`カテゴリ: ${detailResponse.data.faq_categories?.name}`);
        console.log(`閲覧回数: ${detailResponse.data.view_count}`);
        console.log('');
        
        // 少し待ってから再度確認（閲覧回数が増加しているか）
        setTimeout(async () => {
          const updatedResponse = await client.callTool('get_faq_detail', {
            faq_id: faqId,
            increment_view: false
          });
          
          if (updatedResponse.success) {
            console.log(`更新後の閲覧回数: ${updatedResponse.data.view_count}`);
            console.log(`増加分: ${updatedResponse.data.view_count - beforeViewCount}`);
          }
        }, 1000);
      }
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    // 少し待ってから切断（setTimeout処理のため）
    setTimeout(async () => {
      await client.disconnect();
    }, 2000);
  }
}

/**
 * 使用例5: 人気FAQとフィードバック
 */
async function example5_PopularFAQsAndFeedback() {
  console.log('=== 例5: 人気FAQとフィードバック ===');
  
  const client = new FAQMCPClient();
  
  try {
    await client.connect();
    
    // 人気FAQを取得
    const popularResponse = await client.callTool('get_popular_faqs', {
      limit: 3
    });
    
    if (popularResponse.success) {
      console.log('人気FAQ Top 3:');
      
      for (const [index, faq] of popularResponse.data.entries()) {
        console.log(`${index + 1}. ${faq.question_title}`);
        console.log(`   閲覧回数: ${faq.view_count}`);
        console.log(`   役立った: ${faq.helpful_count}`);
        console.log('');
        
        // 最初のFAQに「役立った」フィードバックを送信
        if (index === 0) {
          const feedbackResponse = await client.callTool('update_faq_feedback', {
            faq_id: faq.id,
            feedback_type: 'helpful'
          });
          
          if (feedbackResponse.success) {
            console.log(`   → フィードバック送信成功: ${feedbackResponse.message}`);
          } else {
            console.log(`   → フィードバック送信失敗: ${feedbackResponse.error}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await client.disconnect();
  }
}

/**
 * 使用例6: キャッシュ管理
 */
async function example6_CacheManagement() {
  console.log('=== 例6: キャッシュ管理 ===');
  
  const client = new FAQMCPClient();
  
  try {
    await client.connect();
    
    // キャッシュ統計を確認
    const statsResponse = await client.callTool('get_cache_stats', {});
    
    if (statsResponse.success) {
      console.log('キャッシュ統計:');
      console.log(`キャッシュサイズ: ${statsResponse.data.size}`);
      console.log('キャッシュキー:', statsResponse.data.keys);
      console.log('');
    }
    
    // データを取得してキャッシュを作成
    console.log('FAQ一覧を取得してキャッシュを作成...');
    await client.callTool('get_faq_list', { limit: 5 });
    
    // キャッシュ統計を再確認
    const updatedStatsResponse = await client.callTool('get_cache_stats', {});
    
    if (updatedStatsResponse.success) {
      console.log('更新後のキャッシュ統計:');
      console.log(`キャッシュサイズ: ${updatedStatsResponse.data.size}`);
      console.log('');
    }
    
    // キャッシュをクリア
    console.log('キャッシュをクリア...');
    const clearResponse = await client.callTool('clear_cache', {});
    
    if (clearResponse.success) {
      console.log(clearResponse.message);
      
      // クリア後のキャッシュ統計を確認
      const finalStatsResponse = await client.callTool('get_cache_stats', {});
      
      if (finalStatsResponse.success) {
        console.log('クリア後のキャッシュ統計:');
        console.log(`キャッシュサイズ: ${finalStatsResponse.data.size}`);
      }
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await client.disconnect();
  }
}

/**
 * 使用例7: エラーハンドリング
 */
async function example7_ErrorHandling() {
  console.log('=== 例7: エラーハンドリング ===');
  
  const client = new FAQMCPClient();
  
  try {
    await client.connect();
    
    // 存在しないFAQ IDで詳細取得を試行
    const invalidResponse = await client.callTool('get_faq_detail', {
      faq_id: '00000000-0000-0000-0000-000000000000',
      increment_view: false
    });
    
    if (!invalidResponse.success) {
      console.log('期待通りのエラー:', invalidResponse.error);
    } else {
      console.log('予期しない成功:', invalidResponse.data);
    }
    
    // 無効な引数でツールを呼び出し
    try {
      await client.callTool('get_faq_list', {
        limit: 101, // 上限を超える値
        offset: -1   // 負の値
      });
    } catch (error) {
      console.log('バリデーションエラーをキャッチ:', error);
    }
    
  } catch (error) {
    console.error('接続エラー:', error);
  } finally {
    await client.disconnect();
  }
}

/**
 * 全ての使用例を実行
 */
async function runAllExamples() {
  console.log('Health Center FAQ MCP Server 使用例デモ');
  console.log('==========================================');
  console.log('');
  
  await example1_BasicFAQList();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await example2_CategoryFAQs();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await example3_SearchFAQs();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await example4_FAQDetailAndViewCount();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await example5_PopularFAQsAndFeedback();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await example6_CacheManagement();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await example7_ErrorHandling();
  
  console.log('\nすべての使用例が完了しました。');
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}

export {
  FAQMCPClient,
  example1_BasicFAQList,
  example2_CategoryFAQs,
  example3_SearchFAQs,
  example4_FAQDetailAndViewCount,
  example5_PopularFAQsAndFeedback,
  example6_CacheManagement,
  example7_ErrorHandling,
  runAllExamples
};
