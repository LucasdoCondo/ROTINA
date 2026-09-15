<#
  ROTINA - Verifica a stack de PRODUCAO local (docker-compose.prod.yml)
  ======================================================================

  Executa os dois passos de verificacao:
    1. docker compose -f docker-compose.prod.yml ps
       (containers de pe, sem erros, healthchecks passando)
    2. Health check do backend

  IMPORTANTE - URL correta do health check:
    O compose de producao NAO publica a porta 3000 do backend no host
    (por seguranca, so o Nginx fala com ele pela rede interna). Portanto:

      ERRADO : http://localhost:3000/api/v1/health
      CERTO  : http://localhost:<APP_PORT>/api/v1/health   (via Nginx)

    O valor de APP_PORT vem do .env.production (padrao: 80).
    Para falar direto com o backend, use `docker compose exec` (o script faz).

  Uso (a partir da RAIZ do repositorio):
    powershell -ExecutionPolicy Bypass -File scripts\verificar-stack-local.ps1

  Observacao: as mensagens evitam acentos de proposito, para nao
  quebrar o encoding do console do Windows PowerShell 5.1.
#>
[CmdletBinding()]
param(
  # Porta publica do Nginx. Se omitida, le APP_PORT do .env.production
  [int]$Porta,

  # Mostrar as ultimas linhas de log de cada container
  [switch]$ComLogs,

  # Mostrar o JSON completo do health check
  [switch]$Detalhado
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$compose = Join-Path $raiz 'docker-compose.prod.yml'
$envFile = Join-Path $raiz '.env.production'

function Write-Passo { param([string]$Texto) Write-Host "==> $Texto" -ForegroundColor Cyan }
function Write-Ok    { param([string]$Texto) Write-Host "  [OK]   $Texto" -ForegroundColor Green }
function Write-Aviso { param([string]$Texto) Write-Host "  [AVISO] $Texto" -ForegroundColor Yellow }
function Write-Erro  { param([string]$Texto) Write-Host "  [ERRO] $Texto" -ForegroundColor Red }

# Executa um comando nativo com TIMEOUT e devolve { Codigo; Texto; Expirou }.
#
# Dois cuidados com o Windows PowerShell 5.1:
#   1) stderr redirecionado de um .exe vira ErrorRecord e, com
#      $ErrorActionPreference='Stop', aborta o script;
#   2) se o engine do Docker estiver "meio de pe" (named pipe existe, mas a
#      API responde 500), o CLI pode travar sem retornar -> timeout.
function Invoke-NativoSaida {
  param(
    [Parameter(Mandatory)][string]$Arquivo,
    [string[]]$Argumentos = @(),
    [int]$TimeoutSegundos = 30
  )

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName  = $Arquivo
  $psi.Arguments = (($Argumentos | ForEach-Object {
        if ($_ -match '\s') { '"' + $_ + '"' } else { $_ }
      }) -join ' ')
  $psi.UseShellExecute        = $false
  $psi.CreateNoWindow         = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError  = $true

  $proc = [System.Diagnostics.Process]::Start($psi)
  $saidaAsync = $proc.StandardOutput.ReadToEndAsync()
  $erroAsync  = $proc.StandardError.ReadToEndAsync()

  if (-not $proc.WaitForExit($TimeoutSegundos * 1000)) {
    try { $proc.Kill() } catch { }
    return [pscustomobject]@{
      Codigo  = 124
      Texto   = "TIMEOUT: sem resposta em ${TimeoutSegundos}s"
      Expirou = $true
    }
  }

  return [pscustomobject]@{
    Codigo  = $proc.ExitCode
    Texto   = ("" + $saidaAsync.Result + $erroAsync.Result)
    Expirou = $false
  }
}

function Invoke-Nativo {
  param(
    [Parameter(Mandatory)][string]$Arquivo,
    [string[]]$Argumentos = @(),
    [int]$TimeoutSegundos = 30
  )
  (Invoke-NativoSaida -Arquivo $Arquivo -Argumentos $Argumentos -TimeoutSegundos $TimeoutSegundos).Codigo
}

function Show-SaidaNativa {
  param([string]$Texto)
  if (-not $Texto) { return }
  $Texto.Trim() -split "`r?`n" | Where-Object { $_ } | ForEach-Object { "    $_" }
}

Write-Host ''
Write-Host '  ROTINA - Verificacao da stack de producao local (Docker Compose)' -ForegroundColor White
Write-Host '  -----------------------------------------------------------------' -ForegroundColor DarkGray

# ─────────────────────────────────────────────────────────────
# 0) Pre-requisitos: arquivos, CLI e engine
# ─────────────────────────────────────────────────────────────
if (-not (Test-Path $compose)) {
  Write-Erro "Nao encontrei $compose"
  Write-Host '    Execute este script a partir da raiz do repositorio.' -ForegroundColor DarkGray
  exit 1
}
if (-not (Test-Path $envFile)) {
  Write-Erro "Nao encontrei $envFile (obrigatorio: --env-file .env.production)"
  exit 1
}

$docker = (Get-Command docker.exe -ErrorAction SilentlyContinue).Source
if (-not $docker) { $docker = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' }
if (-not (Test-Path $docker)) {
  Write-Erro 'CLI do Docker nao encontrada.'
  Write-Host '    Instale o Docker Desktop ou rode scripts\habilitar-docker-wsl.ps1' -ForegroundColor DarkGray
  exit 1
}

Write-Passo 'Verificando o engine do Docker'
$infoDocker = Invoke-NativoSaida -Arquivo $docker -Argumentos @('info') -TimeoutSegundos 20
if ($infoDocker.Expirou) {
  Write-Aviso 'O CLI do Docker nao respondeu em 20s (engine parado ou travado).'
}
if ($infoDocker.Codigo -ne 0) {
  Write-Erro 'O engine do Docker nao esta respondendo.'
  Write-Host ''
  Write-Host '    Causa mais comum nesta maquina (visto no log do Docker Desktop):' -ForegroundColor Yellow
  Write-Host '      "engine linux/wsl failed to start:' -ForegroundColor Yellow
  Write-Host '       checking preconditions: Virtual Machine Platform not enabled"' -ForegroundColor Yellow
  Write-Host ''
  Write-Host '    Correcao (precisa de Administrador + reinicializacao):' -ForegroundColor White
  Write-Host '      1) powershell -ExecutionPolicy Bypass -File scripts\habilitar-docker-wsl.ps1' -ForegroundColor White
  Write-Host '      2) reinicie o Windows' -ForegroundColor White
  Write-Host '      3) powershell -ExecutionPolicy Bypass -File scripts\habilitar-docker-wsl.ps1 -AposReboot' -ForegroundColor White
  Write-Host '      4) rode este script novamente' -ForegroundColor White
  exit 1
}
Write-Ok 'Engine respondendo'

$dash = @('--env-file', $envFile, '-f', $compose)
$semErro = $true
$containers = @()

# ────────────────────────────────────────────────────────────
# 1) docker compose ps  — containers de pe e sem erros
# ─────────────────────────────────────────────────────────────
Write-Passo 'Passo 1 - docker compose ... ps'
Push-Location $raiz
try {
  $resPs = Invoke-NativoSaida -Arquivo $docker -Argumentos (@('compose') + $dash + @('ps', '--format', 'json')) -TimeoutSegundos 60
  $codigoPs = $resPs.Codigo
  if ($codigoPs -ne 0) {
    Write-Erro 'Falha ao consultar os containers.'
    Show-SaidaNativa $resPs.Texto
    $semErro = $false
  } else {
    $containers = @(
      ($resPs.Texto -split "`r?`n") |
        Where-Object { $_ -and $_.Trim().StartsWith('{') } |
        ForEach-Object { $_ | ConvertFrom-Json }
    )
  }

  if ($codigoPs -eq 0 -and $containers.Count -eq 0) {
    Write-Aviso 'Nenhum container da stack esta rodando.'
    Write-Host '    Suba a stack com:' -ForegroundColor White
    Write-Host '      docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build' -ForegroundColor White
    $semErro = $false
  } elseif ($containers.Count -gt 0) {
    $containers | ForEach-Object {
      $saude = if ($_.Health) { $_.Health } else { '-' }
      $linha = '    {0,-9} estado={1,-9} health={2}' -f $_.Service, $_.State, $saude
      if ($_.State -eq 'running' -and ($saude -eq 'healthy' -or $saude -eq '-')) {
        Write-Host $linha -ForegroundColor Green
      } else {
        Write-Host $linha -ForegroundColor Yellow
        $semErro = $false
      }
    }

    if ($containers.Count -ne 4) {
      Write-Aviso "Esperados 4 servicos (postgres, redis, backend, nginx) - encontrados $($containers.Count)."
      $semErro = $false
    }

    if ($ComLogs) {
      Write-Passo 'Ultimas linhas de log da stack'
      $resLogs = Invoke-NativoSaida -Arquivo $docker -Argumentos (@('compose') + $dash + @('logs', '--tail', '15')) -TimeoutSegundos 60
      Show-SaidaNativa $resLogs.Texto
    }
  }
} finally {
  Pop-Location
}

# ─────────────────────────────────────────────────────────────
# 2) Health check (via Nginx — a porta 3000 nao passa pelo host)
# ─────────────────────────────────────────────────────────────
if (-not $Porta) {
  $linhaApp = Select-String -Path $envFile -Pattern '^\s*APP_PORT\s*=\s*(\d+)' -ErrorAction SilentlyContinue |
              Select-Object -First 1
  $Porta = if ($linhaApp) { [int]$linhaApp.Matches[0].Groups[1].Value } else { 80 }
}

$url = "http://localhost:$Porta/api/v1/health"
Write-Passo "Passo 2 - health check via Nginx ($url)"
$respondeu = $false
try {
  $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
  Write-Ok "HTTP $($resp.StatusCode)"
  $corpo = $resp.Content
  if ($Detalhado) { Write-Host "    $corpo" -ForegroundColor DarkGray }
  try {
    $json = $corpo | ConvertFrom-Json
    Write-Host ('    status={0} database={1}' -f $json.data.status, $json.data.database)
    if ($json.data.database -eq 'up') {
      Write-Ok 'Banco de dados acessivel pela API'
    } else {
      Write-Erro 'API no ar, mas SEM conexao com o banco (database=down)'
      $semErro = $false
    }
  } catch {
    Write-Aviso 'Resposta nao e JSON valido - o Nginx pode nao estar roteando /api/ para o backend.'
    $semErro = $false
  }
  $respondeu = $true
} catch {
  Write-Erro "Sem resposta em $url - $($_.Exception.Message)"
  $semErro = $false
}

if (-not $respondeu -and $containers.Count -gt 0) {
  Write-Passo 'Fallback - health check direto no container do backend'
  Write-Host '    (a porta 3000 nao e publicada no host; isto fala por dentro da rede Docker)' -ForegroundColor DarkGray
  Push-Location $raiz
  try {
    $resExec = Invoke-NativoSaida -Arquivo $docker -Argumentos (
      @('compose') + $dash + @('exec', '-T', 'backend', 'wget', '-qO-', 'http://127.0.0.1:3000/api/v1/health')) -TimeoutSegundos 30
    if ($resExec.Codigo -eq 0) {
      Write-Ok "Backend respondeu: $($resExec.Texto.Trim())"
      Write-Host '    => A API esta de pe; revise o roteamento/porta do Nginx.' -ForegroundColor Yellow
    } else {
      Write-Erro 'O backend tambem nao respondeu.'
      Show-SaidaNativa $resExec.Texto
    }
  } finally {
    Pop-Location
  }
}

# ─────────────────────────────────────────────────────────────
# Resumo
# ─────────────────────────────────────────────────────────────
Write-Host ''
if ($semErro) {
  Write-Host '  RESULTADO: stack OK - containers de pe e health check respondendo.' -ForegroundColor Green
  exit 0
} else {
  Write-Host '  RESULTADO: foram encontrados problemas (veja [AVISO]/[ERRO] acima).' -ForegroundColor Yellow
  exit 1
}