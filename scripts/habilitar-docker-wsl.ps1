<#
  ROTINA - Habilita os pre-requisitos do Docker Desktop no Windows
  =================================================================

  Sintoma que este script resolve (log do proprio Docker Desktop):

    [main.engines] attempting recovery from engine failure:
      engine linux/wsl failed to start:
      checking preconditions: Virtual Machine Platform not enabled

  O Docker Desktop (engine WSL2) depende de dois recursos opcionais do
  Windows que estao DESABILITADOS nesta maquina:

    1. Virtual Machine Platform          (servico vmcompute)
    2. Microsoft-Windows-Subsystem-Linux (servico LxssManager / WSL)

  Ambos exigem privilegio de Administrador e REINICIALIZACAO.

  Uso:
    # Fase 1 - habilita os recursos (auto-eleva via UAC)
    powershell -ExecutionPolicy Bypass -File scripts\habilitar-docker-wsl.ps1

    # ... reinicie o Windows ...

    # Fase 2 - apos o reboot: atualiza o WSL, define WSL2 como padrao
    #          e sobe o Docker Desktop
    powershell -ExecutionPolicy Bypass -File scripts\habilitar-docker-wsl.ps1 -AposReboot

  Observacao: as mensagens evitam acentos de proposito, para nao
  quebrar o encoding do console do Windows PowerShell 5.1.
#>
[CmdletBinding()]
param(
  # Executa a fase pos-reboot (wsl --update + WSL2 padrao + Docker Desktop)
  [switch]$AposReboot,

  # Apenas diagnostica (nao altera nada, nao pede elevacao)
  [switch]$Simular,

  # Tempo maximo (segundos) aguardando o engine do Docker subir
  [int]$TimeoutSegundos = 240
)

$ErrorActionPreference = 'Stop'
$DockerDesktop = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'

function Test-Administrador {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
}

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

# Recursos opcionais do Windows exigidos pelo Docker Desktop (engine WSL2)
$recursos = @(
  @{ Nome = 'VirtualMachinePlatform';            Servico = 'vmcompute';   Desc = 'Virtual Machine Platform' },
  @{ Nome = 'Microsoft-Windows-Subsystem-Linux'; Servico = 'LxssManager'; Desc = 'Subsistema do Windows para Linux (WSL)' }
)

# ─────────────────────────────────────────────────────────────
# Modo simulacao: nao altera nada e nao pede elevacao
# ────────────────────────────────────────────────────────────
if ($Simular) {
  Write-Host ''
  Write-Passo 'MODO SIMULACAO (-Simular): nenhuma alteracao sera feita'
  Write-Host ('    Administrador     : {0}' -f (Test-Administrador))
  Write-Host ('    Reinicio pendente : {0}' -f (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending'))
  Write-Host '    Recursos opcionais (deteccao rapida via servico):'
  foreach ($r in $recursos) {
    $presente = Test-Path "HKLM:\SYSTEM\CurrentControlSet\Services\$($r.Servico)"
    $situacao = if ($presente) { 'instalado' } else { 'AUSENTE (recurso desabilitado)' }
    Write-Host ('      {0,-34} servico {1,-13} : {2}' -f $r.Nome, $r.Servico, $situacao)
  }
  Write-Host '    Engine do Docker  : ' -NoNewline
  $dockerExe = (Get-Command docker.exe -ErrorAction SilentlyContinue).Source
  if (-not $dockerExe) { $dockerExe = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' }
  if (Test-Path $dockerExe) {
    $info = Invoke-NativoSaida -Arquivo $dockerExe -Argumentos @('info') -TimeoutSegundos 15
    if ($info.Codigo -eq 0) { Write-Host 'respondendo' -ForegroundColor Green }
    else { Write-Host $(if ($info.Expirou) { 'sem resposta (travado)' } else { 'parado' }) -ForegroundColor Yellow }
  } else {
    Write-Host 'CLI nao encontrada' -ForegroundColor Yellow
  }
  Write-Host ''
  Write-Host '    Acoes que seriam executadas:' -ForegroundColor White
  Write-Host '      1. habilitar os recursos acima que nao estiverem ativos' -ForegroundColor White
  Write-Host '         (Enable-WindowsOptionalFeature -All -NoRestart)' -ForegroundColor White
  Write-Host '      2. solicitar a reinicializacao do Windows' -ForegroundColor White
  Write-Host ''
  Write-Host '    Observacao: a checagem autoritativa do estado e feita por' -ForegroundColor DarkGray
  Write-Host '    Get-WindowsOptionalFeature -Online (requer Administrador).' -ForegroundColor DarkGray
  exit 0
}

# ─────────────────────────────────────────────────────────────
# Auto-elevacao: DISM/Enable-WindowsOptionalFeature exigem admin
# ──────────────────────────────────────────────────────────────
if (-not (Test-Administrador)) {
  Write-Host ''
  Write-Aviso 'Sem privilegio de Administrador. Solicitando elevacao (UAC)...'
  $argumentos = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"")
  if ($AposReboot) { $argumentos += '-AposReboot' }
  Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $argumentos | Out-Null
  Write-Host '    Aceite o UAC na janela que foi aberta. Esta janela pode ser fechada.' -ForegroundColor DarkGray
  exit 0
}

# ─────────────────────────────────────────────────────────────
# FASE 2 - apos o reboot
# ─────────────────────────────────────────────────────────────
if ($AposReboot) {
  Write-Host ''
  Write-Passo 'FASE 2 - pos-reboot'

  Write-Passo 'Atualizando o WSL para a versao da Microsoft Store (wsl --update)'
  $wslUpdate = Invoke-NativoSaida -Arquivo 'wsl.exe' -Argumentos @('--update')
  Show-SaidaNativa $wslUpdate.Texto
  if ($wslUpdate.Codigo -ne 0) { Write-Aviso 'wsl --update retornou erro (pode ser a versao "inbox"). Seguindo.' }
  else { Write-Ok 'WSL atualizado' }

  Write-Passo 'Definindo WSL 2 como versao padrao'
  $wslDefault = Invoke-NativoSaida -Arquivo 'wsl.exe' -Argumentos @('--set-default-version', '2')
  Show-SaidaNativa $wslDefault.Texto
  if ($wslDefault.Codigo -ne 0) { Write-Aviso 'Nao foi possivel definir WSL2 como padrao. Verifique manualmente.' }
  else { Write-Ok 'WSL 2 definido como padrao' }

  Write-Passo 'Subindo o Docker Desktop'
  if (Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue) {
    Write-Ok 'Docker Desktop ja esta em execucao'
  } elseif (Test-Path $DockerDesktop) {
    Start-Process -FilePath $DockerDesktop | Out-Null
    Write-Ok 'Docker Desktop iniciado'
  } else {
    Write-Erro "Nao encontrei $DockerDesktop"
    exit 1
  }

  Write-Passo "Aguardando o engine responder (timeout ${TimeoutSegundos}s)"
  $inicio = Get-Date
  $docker = (Get-Command docker.exe -ErrorAction SilentlyContinue).Source
  if (-not $docker) { $docker = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' }

  $pronto = $false
  while (((Get-Date) - $inicio).TotalSeconds -lt $TimeoutSegundos) {
    if ((Invoke-Nativo -Arquivo $docker -Argumentos @('info') -TimeoutSegundos 20) -eq 0) { $pronto = $true; break }
    Start-Sleep -Seconds 5
    Write-Host '    aguardando...' -ForegroundColor DarkGray
  }

  if (-not $pronto) {
    Write-Erro "Engine nao respondeu em ${TimeoutSegundos}s."
    Write-Host '    Abra Docker Desktop > Troubleshoot e verifique os logs.' -ForegroundColor DarkGray
    Write-Host '    Confirme tambem que o Windows foi reiniciado apos a Fase 1.' -ForegroundColor DarkGray
    exit 1
  }

  Write-Ok 'Engine do Docker respondendo'
  Write-Host ''
  Write-Passo 'Pronto. Agora verifique a stack:'
  Write-Host '    powershell -ExecutionPolicy Bypass -File scripts\verificar-stack-local.ps1' -ForegroundColor White
  exit 0
}
# ─────────────────────────────────────────────────────────────
# FASE 1 - habilitar recursos opcionais do Windows
# ─────────────────────────────────────────────────────────────
Write-Host ''
Write-Passo 'FASE 1 - habilitando recursos do Windows para o Docker Desktop'

$habilitou = $false

foreach ($r in $recursos) {
  Write-Passo "Verificando $($r.Desc) [$($r.Servico)]"
  try {
    $estado = (Get-WindowsOptionalFeature -Online -FeatureName $r.Nome).State
  } catch {
    Write-Erro "Nao foi possivel consultar $($r.Nome): $($_.Exception.Message)"
    Write-Host '    Dica: execute em um PowerShell aberto como Administrador.' -ForegroundColor DarkGray
    exit 1
  }

  if ($estado -eq 'Enabled') {
    Write-Ok "$($r.Nome) ja esta habilitado"
    continue
  }

  Write-Aviso "$($r.Nome) esta '$estado' - habilitando (sem reiniciar agora)"
  try {
    $res = Enable-WindowsOptionalFeature -Online -FeatureName $r.Nome -All -NoRestart
    if ($res.RestartNeeded) { $habilitou = $true }
    Write-Ok "$($r.Nome) habilitado (reinicializacao necessaria)"
  } catch {
    Write-Erro "Falha ao habilitar $($r.Nome): $($_.Exception.Message)"
    exit 1
  }
}

# ─────────────────────────────────────────────────────────────
# Resultado da Fase 1
# ─────────────────────────────────────────────────────────────
Write-Host ''
Write-Passo 'Resumo da Fase 1'
$pendente = Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending'
$lxss = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\LxssManager' -ErrorAction SilentlyContinue
$vmc  = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\vmcompute'   -ErrorAction SilentlyContinue
Write-Host ("    Servico LxssManager (WSL) : {0}" -f $(if ($lxss) { 'instalado' } else { 'ausente' }))
Write-Host ("    Servico vmcompute  (VMP)  : {0}" -f $(if ($vmc)  { 'instalado' } else { 'ausente' }))
Write-Host ("    Reinicio pendente         : {0}" -f $pendente)

Write-Host ''
if ($pendente -or $habilitou) {
  Write-Aviso 'REINICIE O WINDOWS agora para os recursos entrarem em vigor.'
  Write-Host '    Depois do reboot, execute a Fase 2:' -ForegroundColor White
  Write-Host '    powershell -ExecutionPolicy Bypass -File scripts\habilitar-docker-wsl.ps1 -AposReboot' -ForegroundColor White
} else {
  Write-Ok 'Nenhum recurso precisava ser habilitado.'
  Write-Host '    Rode a Fase 2 para subir o engine do Docker:' -ForegroundColor White
  Write-Host '    powershell -ExecutionPolicy Bypass -File scripts\habilitar-docker-wsl.ps1 -AposReboot' -ForegroundColor White
}
