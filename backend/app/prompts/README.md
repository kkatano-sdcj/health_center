# Prompt Templates

This directory contains prompt templates used by the RAG (Retrieval-Augmented Generation) system.

## Files

### system_prompt.txt
The system prompt that defines the AI assistant's role, behavior, and constraints.
- Defines the assistant as a medical document expert
- Sets rules for response generation
- Specifies response format requirements

### user_prompt_template.txt
The template for user queries with context from retrieved documents.
- Uses placeholders: `{query}` for the user's question and `{context}` for retrieved documents
- Structures the prompt with clear sections
- Reinforces response requirements

## Usage

These templates are loaded by the RAG chat service at runtime. To modify the prompts:
1. Edit the respective `.txt` file
2. Save the changes
3. The service will use the updated prompts on the next request (no restart required)

## Placeholders

The following placeholders are available in templates:
- `{query}`: The user's question
- `{context}`: Retrieved and formatted document chunks
- `{conversation_id}`: Optional conversation identifier (if needed)

## Best Practices

1. Keep prompts clear and concise
2. Use structured formatting for better readability
3. Always specify output format requirements
4. Include safety guidelines for medical content
5. Test changes thoroughly before production use