# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

datas = [('C:\\Users\\AntonioF\\Downloads\\AppMindFLow\\frontend\\dist', 'frontend/dist'), ('C:\\Users\\AntonioF\\Downloads\\AppMindFLow\\backend', 'backend'), ('C:\\Users\\AntonioF\\Downloads\\AppMindFLow\\assets', 'assets'), ('C:\\Users\\AntonioF\\Downloads\\AppMindFLow\\backend\\alembic.ini', '.'), ('C:\\Users\\AntonioF\\Downloads\\AppMindFLow\\backend\\migrations', 'migrations')]
binaries = []
hiddenimports = ['main', 'uvicorn', 'alembic']
tmp_ret = collect_all('sqlmodel')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('fastapi')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]


a = Analysis(
    ['start.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='MindFlow',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['C:\\Users\\AntonioF\\Downloads\\AppMindFLow\\assets\\mindflow.ico'],
)
