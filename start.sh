#!/bin/bash
# Napkinmath startup script
# Usage:
#   ./start.sh           - Production mode (foreground)
#   ./start.sh dev       - Development mode (hot reload, foreground)
#   ./start.sh bg        - Production mode (background, terminal safe to close)
#   ./start.sh stop      - Stop the background process
#
# Optional convenience script: serves on 127.0.0.1:3003 and accepts *.ts.net hostnames,
# so a Tailscale serve proxy can reach it. `npm run dev` and `npm run preview` are the standard way to run the app.

cd "$(dirname "$0")"
export NAPKINMATH_ALLOWED_HOSTS="${NAPKINMATH_ALLOWED_HOSTS:-.ts.net}"
PIDFILE="/tmp/napkinmath.pid"
LOGFILE="/tmp/napkinmath.log"

case "$1" in
    dev)
        echo "Starting in DEVELOPMENT mode (hot reload enabled)..."
        echo "Press Ctrl+C to stop"
        npx vite --host 127.0.0.1
        ;;
    bg)
        if [ -f "$PIDFILE" ] && kill -0 "$(cat $PIDFILE)" 2>/dev/null; then
            echo "Napkinmath already running (PID $(cat $PIDFILE))"
            exit 1
        fi
        echo "Building for production..."
        npm run build || { echo "Build failed"; exit 1; }
        echo "Starting in BACKGROUND mode..."
        nohup npx vite preview --port 3003 --host 127.0.0.1 > "$LOGFILE" 2>&1 &
        echo $! > "$PIDFILE"
        echo "Napkinmath started (PID $!)"
        echo "Logs: $LOGFILE"
        echo "Stop with: ./start.sh stop"
        ;;
    stop)
        if [ -f "$PIDFILE" ]; then
            PID=$(cat "$PIDFILE")
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID"
                rm -f "$PIDFILE"
                echo "Napkinmath stopped (PID $PID)"
            else
                rm -f "$PIDFILE"
                echo "Napkinmath was not running (stale PID file removed)"
            fi
        else
            echo "No PID file found. Napkinmath may not be running."
            echo "Check manually: pgrep -f 'vite preview'"
        fi
        ;;
    *)
        echo "Building for production..."
        npm run build || { echo "Build failed"; exit 1; }
        echo "Starting in PRODUCTION mode (foreground)..."
        echo "Press Ctrl+C to stop, or use './start.sh bg' for background mode"
        npx vite preview --port 3003 --host 127.0.0.1
        ;;
esac
