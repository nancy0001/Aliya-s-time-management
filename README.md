# Time Manager Bundle

This folder is a centralized copy of all key files related to the Time Manager page.

## Core page files
- src/TimeManagerApp.tsx : main page component for `/time-manager`
- src/main.tsx : route entry that maps pathname to TimeManagerApp
- src/styles.css : shared styles used by TimeManager page
- src/index.html : html shell used by Vite app

## Runtime and scripts
- src/package.json : web app scripts and deps
- src/package.json (root copy also included) : workspace scripts
- scripts/web-daemon.sh : start/stop/restart/status for web dev service
- scripts/web-watchdog.sh : watchdog auto-restart script

## Source of truth
Real source files still live in:
- /Users/xibeijingxiang/Desktop/codex_test/apps/web/src/
- /Users/xibeijingxiang/Desktop/codex_test/scripts/

This bundle is for centralized viewing and quick reference.
