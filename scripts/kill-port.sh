#!/bin/bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9 2>/dev/null && echo "✅ Killed process on port 5000" || echo "ℹ️  No process found on port 5000"

