#!/bin/bash
# Jay's Project Hub - 로컬 서버 실행 스크립트
# 사용법: ./serve.sh [포트번호]

PORT=${1:-3000}
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🎮 Jay's Project Hub"
echo "===================="
echo ""

# Python 3 확인
if command -v python3 &> /dev/null; then
    echo "📂 경로: $DIR"
    echo "🌐 URL: http://localhost:$PORT"
    echo ""
    echo "서버를 종료하려면 Ctrl+C를 누르세요"
    echo "===================="
    echo ""
    cd "$DIR"
    python3 -m http.server $PORT
# Python 2 fallback
elif command -v python &> /dev/null; then
    echo "📂 경로: $DIR"
    echo "🌐 URL: http://localhost:$PORT"
    echo ""
    echo "서버를 종료하려면 Ctrl+C를 누르세요"
    echo "===================="
    echo ""
    cd "$DIR"
    python -m SimpleHTTPServer $PORT
# Node.js npx serve
elif command -v npx &> /dev/null; then
    echo "📂 경로: $DIR"
    echo "🌐 URL: http://localhost:$PORT"
    echo ""
    cd "$DIR"
    npx serve -l $PORT
else
    echo "❌ Python 또는 Node.js가 필요합니다"
    echo ""
    echo "설치 방법:"
    echo "  brew install python3"
    echo "  또는"
    echo "  brew install node"
    exit 1
fi
