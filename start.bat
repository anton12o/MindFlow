@echo off
title MindFlow
if not exist "venv" python -m venv venv
.\venv\Scripts\python start.py
pause