param([string]$Python='C:\Users\golde\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe')
$ErrorActionPreference='Stop'
$w24App=Join-Path $PSScriptRoot 'outputs\NUVIA_HISTORY_REPRESENTATIVE_6_v1.0_DRAFT'
$w24Dist=(Resolve-Path -LiteralPath (Join-Path $w24App 'dist-app')).Path
$w24Branch=git -C $PSScriptRoot branch --show-current
if($LASTEXITCODE -ne 0 -or $w24Branch -ne 'codex/nuvia-history-w24-latest'){throw 'Wrong HISTORY branch; server not started.'}
if(Get-NetTCPConnection -LocalPort 5192 -State Listen -ErrorAction SilentlyContinue){throw 'Port 5192 is occupied. Inspect its owner before stopping it.'}
if(!(Test-Path -LiteralPath $Python -PathType Leaf)){throw 'Python runtime not found; supply -Python.'}
$w24Commit=git -C $PSScriptRoot rev-parse HEAD
$w24Process=Start-Process -FilePath $Python -ArgumentList @('-m','http.server','5192','--bind','0.0.0.0','--directory',('"'+$w24Dist+'"')) -WorkingDirectory $w24App -WindowStyle Hidden -PassThru
[PSCustomObject]@{Branch=$w24Branch;Commit=$w24Commit;ProcessId=$w24Process.Id;Directory=$w24Dist;LocalURL='http://127.0.0.1:5192/?qa=1&age=preschool&mission=gutenberg&new=1'}
