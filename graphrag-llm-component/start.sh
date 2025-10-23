#!/bin/bash

# Set environment variables for GraphRAG LLM Component
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USER=neo4j
export NEO4J_PASSWORD=password123
export PORT=3001

# Check if Gemini API key is provided
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  Warning: GEMINI_API_KEY not set. Natural language queries will not work."
    echo "   Set GEMINI_API_KEY environment variable to enable Gemini AI features."
    echo "   Get your API key from: https://makersuite.google.com/app/apikey"
    echo ""
fi

echo "🚀 Starting GraphRAG LLM Component..."
echo "📊 Neo4j: $NEO4J_URI"
echo "🌐 Port: $PORT"
echo ""

# Start the server
node server.js
