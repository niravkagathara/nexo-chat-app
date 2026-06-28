@echo off
cd /d "d:\projects\backend"
node dist/src/run_direct_backup.js >> backup.log 2>&1
