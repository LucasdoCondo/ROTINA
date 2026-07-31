# Adicionar Registros DNS para rotinacodx.com.br

Baseado na imagem do painel Resend, você já tem o registro DKIM adicionado e o sistema está procurando os demais registros.

---

## Verificação Rápida do Estado Atual

No painel do Resend você vê:
- ✅ **Domínio adicionado** (31 de julho, 12h25)
- 🔄 **Verificando DNS** (31 de julho, 12h26) — status atual
- ⏳ **Verificando domínio** — pendente

---

## Registros que faltam adicionar no seu provedor de DNS

Acesse o painel do seu provedor e adicione **exatamente** os registros abaixo.

> **Antes de adicionar**, verifique se já existem registros com os mesmos nomes para evitar conflitos.

---

### 1) DKIM (você já adicionou — confirme se está idêntico)

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| TXT | resend._domainkey.rotina | p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDo3+pf7+kbejbgG49DKIUObTzM8FXSPzNsPm4+zVqvAfH4H7NFV3KFsxXuVRODX60OgymP7DIJvJWbjJBpJyKCvkclWd8v/gCEsHbznIHyEMuxRE0Q8+yiSUDXhRlNFZ622whssFvRqRQiAem8XvMph5v8ysgsXJ5+oKCf2Vrr8QIDAQAB | Auto |

---

### 2) SPF — MX

| Tipo | Nome | Valor | TTL | Prioridade |
|------|------|-------|-----|------------|
| MX | send.rotina | feedback-smtp.sa-east-1.amazonses.com | Auto | 10 |

- Se já existir um MX para `send.rotina`, substitua pelo valor acima.
- Se existir MX para `@` ou para `rotinacodx.com.br` e ele for de outro serviço (ex: Gmail, Outlook), **adicione este como um registro adicional** em vez de substituir.

---

### 3) SPF — TXT

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| TXT | send.rotina | v=spf1 include:amazonses.com ~all | Auto |

- Se já existir um TXT para `send.rotina`, substitua pelo valor acima.

---

### 4) DMARC

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| TXT | _dmarc | v=DMARC1; p=none; | Auto |

- Se já existir um TXT para `_dmarc`, substitua pelo valor acima para evitar conflitos.

---

### 5) MX para recebimento (opcional, recomendado)

| Tipo | Nome | Valor | TTL | Prioridade |
|------|------|-------|-----|------------|
| MX | rotinacodx.com.br (ou @) | inbound-smtp.sa-east-1.amazonaws.com | Auto | 10 |

- Aviso: este registro pode conflitar com MX existentes usados para receber e-mails. Revise antes de adicionar.

---

## Passo a Passo no provedor

1. Acesse o gerenciador de DNS do seu provedor.
2. Para cada registro da lista acima:
   - Crie um novo registro (ou edite o existente se o nome for igual).
   - Preencha Tipo, Nome e Valor exatamente como na tabela.
   - Salve a zona DNS.
3. Retorne ao Resend e clique em **Verify**.
4. Aguarde até o status sair de **Pendente**.

---

## Após a verificação

Atualize as variáveis no Vercel:

```
RESEND_API_KEY=re_live_...
EMAIL_FROM=ROTINA <noreply@rotinacodx.com.br>
RESEND_SENDER_EMAIL=noreply@rotinacodx.com.br
