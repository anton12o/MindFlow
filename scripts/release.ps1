param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Version,
    [switch]$DryRun
)

$ErrorActionPreference = "Continue"
$script:Stashed = $false
$script:OriginalVersion = ""
$script:ReleaseBranch = ""
$script:LastTag = ""
$script:PythonCmd = ""

$ScriptDir = Split-Path -Parent $PSCommandPath
$RootDir = Resolve-Path "$ScriptDir/.."
$BackendDir = "$RootDir/backend"
$FrontendDir = "$RootDir/frontend"
$DistDir = "$RootDir/dist"
$VersionFile = "$BackendDir/_version.py"

$PyCandidates = @("py -3.14", "py -3.15", "py -3.16", "py -3.17", "py -3.18")

function Log  { Write-Host "  $($args)" }
function Ok   { Write-Host " OK $($args)" -ForegroundColor Green }
function Warn { Write-Host " !! $($args)" -ForegroundColor Yellow }
function Fail { Write-Host " XX $($args)" -ForegroundColor Red }

function PyRun([string]$Args) {
    $result = & cmd /c "$script:PythonCmd $Args 2>&1" 2>&1
    return $result
}

function DetectPython {
    foreach ($c in $PyCandidates) {
        $v = & cmd /c "$c -c `"import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')`" 2>&1" 2>&1
        if ($LASTEXITCODE -ne 0) { continue }
        $ver = $v.Trim()
        $pi = & cmd /c "$c -m PyInstaller --version 2>&1" 2>&1
        if ($LASTEXITCODE -eq 0) {
            $script:PythonCmd = $c
            Ok "Python $ver + PyInstaller $($pi.Trim()) via $c"
            return $true
        }
    }
    return $false
}

function Get-LastTag {
    $tag = & git describe --tags --abbrev=0 2>&1
    if ($LASTEXITCODE -eq 0) { return $tag.Trim() }
    return ""
}

function RestoreVersion {
    if ($script:OriginalVersion) {
        Set-Content -Path $VersionFile -Value $script:OriginalVersion -Encoding UTF8
    }
}

function DoRollback {
    Warn "Rollback..."
    RestoreVersion
    & git checkout main 2>$null | Out-Null
    if ($script:ReleaseBranch) {
        & git branch -D $script:ReleaseBranch 2>$null | Out-Null
    }
    if ($script:Stashed) {
        & git stash pop 2>$null | Out-Null
    }
}

function Main {
    # ---- FASE 1 - VALIDACAO ----
    if ($Version -notmatch '^v?\d+\.\d+\.\d+$') {
        Fail "Versao invalida: $Version. Use vX.Y.Z ou X.Y.Z"; return 1
    }
    if ($Version -notmatch '^v') { $Version = "v$Version" }
    $vNum = $Version.Substring(1)

    Log "release.ps1 $Version"
    if ($DryRun) { Log "Modo simulacao - nenhuma alteracao sera feita" }

    # 1.2 - Stash dirty tree
    $st = & git status --porcelain 2>$null
    if ($st -and $st.Trim()) {
        if ($DryRun) { Log "[DRY-RUN] git stash push -u" }
        else {
            & git stash push -u -m "release: $(Get-Date -Format yyyy-MM-dd HH:mm)" 2>$null | Out-Null
            $script:Stashed = $true
            Ok "Working tree sujo -> stash salvo"
        }
    }

    # 1.3 - Checkout main + pull
    if ($DryRun) { Log "[DRY-RUN] git checkout main + git pull" }
    else {
        & git checkout main 2>$null | Out-Null
        & git pull 2>$null | Out-Null
        Ok "main atualizado com origin/main"
    }

    # 1.4 - Tag inexistente
    $te = & git tag -l $Version 2>$null
    if ($te -and $te.Trim() -eq $Version) {
        Fail "Tag $Version ja existe. Delete: git tag -d $Version + git push origin :refs/tags/$Version"
        return 1
    }
    Ok "Tag $Version disponivel"

    # 1.5 - Python detection
    if (-not (DetectPython)) {
        Fail "Nenhum Python com PyInstaller encontrado. pip install pyinstaller"; return 1
    }

    # 1.6 - gh auth
    & gh auth status 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail "gh nao autenticado. gh auth login"; return 1 }
    Ok "gh autenticado"

    # 1.7 - Ultima tag
    $script:LastTag = Get-LastTag
    if (-not $script:LastTag) {
        Warn "Nenhuma tag anterior -> PR body generico"; $script:LastTag = "v0.0.0"
    } else { Ok "Ultima tag: $($script:LastTag)" }

    # 1.8 - node_modules
    if (-not (Test-Path "$FrontendDir/node_modules")) {
        if ($DryRun) { Log "[DRY-RUN] cd frontend + npm ci" }
        else {
            Warn "node_modules ausente -> npm ci"
            Push-Location $FrontendDir
            & npm ci 2>$null
            if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "npm ci falhou"; return 1 }
            Pop-Location
            Ok "node_modules instalado"
        }
    }

    # 1.9 - Salva versao original
    $script:OriginalVersion = Get-Content -Path $VersionFile -Raw -Encoding UTF8

    if ($DryRun) {
        Log "`n[DRY-RUN] FASE 2 - Build e Verificacao"
        Log "  Bump _version.py -> $vNum"
        Log "  cd frontend + npm run build"
        Log "  $script:PythonCmd build_exe.py"
        Log "  $script:PythonCmd -m ruff check backend/"
        Log "  cd frontend + tsc --noEmit"
        Log "  cd frontend + npx vitest run"
        Log "  cd backend + $script:PythonCmd -m pytest -q"
        Log "`n[DRY-RUN] FASE 3 - Git Flow"
        Log "  Branch release/v$vNum + commit + PR + merge"
        Log "`n[DRY-RUN] FASE 4 - Tag + Release"
        Log "  git tag $Version + push + gh release upload"
        Log "`n[DRY-RUN] Nenhuma alteracao foi feita."
        return 0
    }

    # ---- FASE 2 - BUILD ----
    Log "`nFASE 2 - Build e Verificacao"

    $newContent = "VERSION = `"$vNum`"`n"
    Set-Content -Path $VersionFile -Value $newContent -Encoding UTF8
    Ok "_version.py -> $vNum"

    # Frontend build
    Push-Location $FrontendDir
    Log "Build frontend..."
    & npm run build 2>$null
    if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Frontend build falhou" }
    Pop-Location
    Ok "Frontend buildado"

    # .exe build
    Log "Build .exe..."
    $exeOut = PyRun "build_exe.py"
    if ($LASTEXITCODE -ne 0) { throw "Build .exe falhou: $exeOut" }
    Ok ".exe gerado"

    # Verificacoes
    Log "Verificacoes..."

    $r = PyRun "-m ruff check backend/"
    if ($LASTEXITCODE -ne 0) { throw "ruff falhou: $r" }
    Ok "ruff: All checks passed"

    Push-Location $FrontendDir
    $t = & node node_modules/typescript/bin/tsc --noEmit 2>$null
    if ($LASTEXITCODE -ne 0) { Pop-Location; throw "tsc --noEmit falhou: $t" }
    Pop-Location
    Ok "tsc --noEmit: 0 erros"

    Push-Location $FrontendDir
    & npx vitest run
    if ($LASTEXITCODE -ne 0) { Pop-Location; throw "vitest falhou" }
    Pop-Location
    Ok "vitest: todos passaram"

    Push-Location $BackendDir
    $pt = PyRun "-m pytest -q"
    if ($LASTEXITCODE -ne 0) { Pop-Location; throw "pytest falhou: $pt" }
    Pop-Location
    Ok "pytest: todos passaram"

    # ---- FASE 3 - GIT FLOW ----
    Log "`nFASE 3 - Git Flow"

    $script:ReleaseBranch = "release/v$vNum"
    & git checkout -b $script:ReleaseBranch 2>$null | Out-Null
    Ok "Branch $script:ReleaseBranch criada"

    & git add -A 2>$null | Out-Null
    & git commit --no-verify -m "release: v$vNum" 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Commit falhou" }
    Ok "Commit: release: v$vNum"

    & git push -u origin $script:ReleaseBranch 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Push falhou" }
    Ok "Branch enviada para origin"

    $cmts = & git log --oneline "$($script:LastTag)..HEAD" --reverse 2>$null
    $cmtStr = if ($cmts) { $cmts.Trim() } else { "" }
    if (-not $cmtStr) {
        $prBody = "Bump $($script:LastTag) -> v$vNum"
    } else { $prBody = $cmtStr }

    $prUrl = & gh pr create --base main --head $script:ReleaseBranch `
        --title "release: v$vNum" --body $prBody 2>&1
    if ($LASTEXITCODE -ne 0) { throw "PR falhou: $prUrl" }
    $prNum = if ($prUrl.Trim() -match '(\d+)$') { $matches[1] } else { "" }
    Ok "PR #$prNum criado: $($prUrl.Trim())"

    # Poll CI
    Log "Aguardando CI (timeout 15 min)..."
    $ciEnd = [DateTime]::Now.AddMinutes(15)
    $ciOk = $false
    while ([DateTime]::Now -lt $ciEnd) {
        Start-Sleep -Seconds 30
        $ch = & gh pr view $prNum --json statusCheckRollup 2>$null
        if ($LASTEXITCODE -eq 0) {
            $allOk = $true; $anyFail = $false
            $co = $ch | ConvertFrom-Json
            foreach ($c in $co.statusCheckRollup) {
                if ($c.conclusion -in @("FAILURE","CANCELLED")) { $anyFail = $true; break }
                if ($c.conclusion -ne "SUCCESS") { $allOk = $false }
            }
            if ($anyFail) { throw "CI falhou: $($prUrl.Trim())" }
            if ($allOk) { $ciOk = $true; break }
        }
        Write-Host "." -NoNewline
    }
    if (-not $ciOk) {
        throw "Timeout CI. Conclua manualmente: gh pr merge $prNum --squash --delete-branch"
    }
    Write-Host ""; Ok "CI verde"

    & gh pr merge $prNum --squash --delete-branch 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Merge falhou" }
    Ok "PR #$prNum merged"

    & git checkout main 2>$null | Out-Null
    & git pull 2>$null | Out-Null
    Ok "main atualizado"

    # ---- FASE 4 - TAG + RELEASE ----
    Log "`nFASE 4 - Tag e Release"

    & git tag $Version 2>$null | Out-Null
    & git push origin $Version 2>$null | Out-Null
    Ok "Tag $Version criada e enviada"

    Log "Aguardando release CI (timeout 10 min)..."
    $rlEnd = [DateTime]::Now.AddMinutes(10)
    $rlOk = $false
    while ([DateTime]::Now -lt $rlEnd) {
        Start-Sleep -Seconds 30
        $rv = & gh release view $Version --json assets,tagName 2>$null
        if ($LASTEXITCODE -eq 0) {
            $ro = $rv | ConvertFrom-Json
            if ($ro.assets.Count -gt 0) { $rlOk = $true; break }
        }
        Write-Host "." -NoNewline
    }
    if (-not $rlOk) {
        throw "Timeout release. Upload manual: gh release upload $Version dist/MindFlow.exe"
    }
    Write-Host ""; Ok "Release CI criada"

    $exeP = "$DistDir/MindFlow.exe"
    if (Test-Path $exeP) {
        & gh release upload $Version $exeP 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { Ok ".exe anexado a release" }
        else { Warn "Falha ao anexar .exe. Upload manual: gh release upload $Version $exeP" }
    } else { Warn ".exe nao encontrado em $exeP" }

    $rlUrl = & gh release view $Version --json url 2>$null | ConvertFrom-Json
    Ok "Release publicada: $($rlUrl.url)"

    # ---- FASE 5 - CLEANUP ----
    if ($script:Stashed) {
        & git stash pop 2>$null | Out-Null
        Ok "Stash restaurado"
    }

    Ok "Release v$vNum concluida!"
    return 0
}

# ---- EXECUTION ----
try {
    $exitCode = Main
    if ($exitCode -ne 0) {
        DoRollback
    }
    exit $exitCode
} catch {
    DoRollback
    Fail "ERRO: $_"
    exit 1
}
