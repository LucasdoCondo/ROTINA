# Passo a Passo: Configurar DNS no Resend (Outro Provedor)

Use este guia quando o provedor de DNS não for um dos principais (Registro.br, Cloudflare, GoDaddy, Hostinger, AWS Route 53).

---

## Etapa 1: Acessar o painel de DNS do seu provedor

1. Acesse o site do seu provedor de DNS/hospedagem.
2. Faça login com sua conta.
3. Localize a seção **Gerenciar DNS**, **Zona DNS**, **Registros DNS** ou **DNS Management**. O nome varia por provedor.

---

## Etapa 2: Adicionar os registros DNS

Adicione **exatamente** os registros abaixo, na ordem apresentada.

> Aviso de conflito potencial:  
> - Se já existir um registro MX para `rotinacodx.com.br` (ou para `@`), acrescente este novo como um registro adicional, não substitua o existente, a menos que você tenha certeza de que ele não é usado para receber e-mails.
> - Se já existir um registro TXT para `_dmarc`, substitua pelo valor abaixo para evitar comportamentos conflitantes.

---

### Registro 1 — DKIM

```
Tipo: TXT
Nome: resend._domainkey.rotina
Valor: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDo3+pf7+kbejbgG49DKIUObTzM8FXSPzNsPm4+zVqvAfH4H7NFV3KFsxXuVRODX60OgymP7DIJvJWbjJBpJyKCvkclWd8v/gCEsHbznIHyEMuxRE0Q8+yiSUDXhRlNFZ622whssFvRqRQiAem8XvMph5v8ysgsXJ5+oKCf2Vrr8QIDAQAB
TTL: Auto (ou 3600 se não houver opção Auto)
```

---

### Registro 2 — SPF (MX)

```
Tipo: MX
Nome: send.rotina
Valor: feedback-smtp.sa-east-1.amazonses.com
TTL: Auto
Prioridade: 10
```

> Nota: Alguns provedores usam nomes diferentes para prioridade, como "Preference" ou "Priority".

---

### Registro 3 — SPF (TXT)

```
Tipo: TXT
Nome: send.rotina
Valor: v=spf1 include:amazonses.com ~all
TTL: Auto
```

---

### Registro 4 — DMARC

```
Tipo: TXT
Nome: _dmarc
Valor: v=DMARC1; p=none;
TTL: Auto
```

> Aviso: Se já houver um registro `_dmarc`, o ideal é manter apenas este para evitar conflitos.

---

### Registro 5 — MX para recebimento (opcional, recomendado)

```
Tipo: MX
Nome: @ (ou rotinacodx.com.br, depende do provedor)
Valor: inbound-smtp.sa-east-1.amazonaws.com
TTL: Auto
Prioridade: 10
```

> Aviso de conflito: Esse registro MX pode conflitar com registros MX existentes. Se você já usa serviços que recebem e-mails para este domínio, revise antes de adicionar.

---

## Etapa 3: Salvar e aguardar propagação

- Salve as alterações no painel do provedor.
- A propagação pode levar de **15 minutos a algumas horas**.
- Enquanto isso, no painel do Resend, clique em **Verify** para conferir se os registros são detectados.

---

## Etapa 4: Variáveis no Vercel (após verificação)

Atualize no painel da Vercel em **Settings → Environment Variables** para **Production**:

```
RESEND_API_KEY=re_live_...
EMAIL_FROM=ROTINA <noreply@rotinacodx.com.br>
RESEND_SENDER_EMAIL=noreply@rotinacodx.com.br
```

---

## Quando voltar aqui

Informe se:
- A verificação do Resend foi concluída com sucesso ou se algum registro falhou.
- Você identificou conflitos com registros DNS existentes.