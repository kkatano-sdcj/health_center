from typing import List, Optional
from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage, AIMessage
from langchain.prompts import ChatPromptTemplate

from app.core.config import settings
from app.schemas.chat import Message, Document

class ChatService:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-3.5-turbo",
            temperature=0.7,
            openai_api_key=settings.OPENAI_API_KEY
        )
        
        self.system_prompt = """あなたは医療機関向けのナレッジ検索アシスタントです。
ユーザーの質問に対して、提供されたドキュメントを基に正確で有用な回答を提供してください。
回答は簡潔で理解しやすいものにしてください。
医療に関する情報は慎重に扱い、必要に応じて専門家への相談を促してください。"""

    async def generate_response(
        self,
        user_message: str,
        context_documents: List[dict],
        chat_history: Optional[List[Message]] = None
    ) -> str:
        """ユーザーのメッセージに対する応答を生成"""
        
        # コンテキストの準備
        context = self._prepare_context(context_documents)
        
        # メッセージ履歴の構築
        messages = [SystemMessage(content=self.system_prompt)]
        
        # チャット履歴を追加
        if chat_history:
            for msg in chat_history[-5:]:  # 最新5件のみ
                if msg.type == "user":
                    messages.append(HumanMessage(content=msg.content))
                else:
                    messages.append(AIMessage(content=msg.content))
        
        # コンテキストとユーザーメッセージを追加
        user_prompt = f"""
関連ドキュメント:
{context}

ユーザーの質問: {user_message}

上記のドキュメント情報を参考に、ユーザーの質問に答えてください。
"""
        messages.append(HumanMessage(content=user_prompt))
        
        # 応答の生成
        try:
            response = await self.llm.agenerate([messages])
            return response.generations[0][0].text
        except Exception as e:
            return f"申し訳ございません。応答の生成中にエラーが発生しました: {str(e)}"
    
    def _prepare_context(self, documents: List[dict]) -> str:
        """ドキュメントからコンテキストを準備"""
        if not documents:
            return "関連ドキュメントが見つかりませんでした。"
        
        context_parts = []
        for i, doc in enumerate(documents[:3], 1):  # 上位3件のみ使用
            context_parts.append(
                f"{i}. {doc.get('title', 'タイトルなし')}\n"
                f"   内容: {doc.get('text', '')[:500]}..."
            )
        
        return "\n\n".join(context_parts)