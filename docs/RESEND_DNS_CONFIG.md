# Configuração DNS para Resend

## Domínio: rotinacodx.com.br

### Registros DNS Necessários

Adicione os seguintes registros no painel do seu provedor de DNS:

---

#### 1. DKIM (DomainKeys Identified Mail)

```
Tipo: TXT
Nome: resend._domainkey.rotina
Valor: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDo3+pf7+kbejbgG49DKIUObTzM8FXSPzNsPm4+zVqvAfH4H7NFV3KFsxXuVRODX60OgymP7DIJvJWbjJBpJyKCvkclWd8v/gCEsHbznIHyEMuxRE0Q8+yiSUDXhRlNFZ622whssFvRqRQiAem8XvMph5v8ysgsXJ5+oKCf2Vrr8QIDAQAB
TTL: Auto
```

---

#### 2. SPF (Sender Policy Framework)

**MX Record:**
```
Tipo: MX
Nome: send.rotina
Valor: feedback-smtp.sa-east-1.amazonses.com
TTL: Auto
Prioridade: 10
```

**TXT Record:**
```
Tipo: TXT
Nome: send.rotina
Valor: v=spf1 include:amazonses.com ~all
TTL: Auto
```

---

#### 3. DMARC (Domain-based Message Authentication, Reporting and Conformance)

```
Tipo: TXT
Nome: _dmarc
Valor: v=DMARC1; p=none;
TTL: Auto
```

---

## Passo a Passo para Configurar

1. Acesse o painel do seu provedor de DNS (Registro.br, Cloudflare, GoDaddy, etc)
2. Adicione cada um dos registros acima
3. Aguarde a propagação DNS (geralmente 15 minutos a algumas horas)
4. Retorne ao painel do Resend e clique em "Verify" para confirmar

---

## Variáveis de Ambiente no Vercel

Após configurar o DNS, atualize estas variáveis na Vercel:

```
RESEND_API_KEY=re_live_...
EMAIL_FROM=ROTINA <noreply@rotinacodx.com.br>
RESEND_SENDER_EMAIL=noreply@rotinacodx.com.br
```

---

## Teste de E-mail

Após concluir a configuração:
1. Faça deploy do backend
2. Acesse o endpoint de teste de e-mail
3. Verifique se o e-mail chega na caixa de entrada (não como spam)

---

**Importante**: A configuração de DNS é necessária ANTES do deploy em produção para garantir que os e-mails não sejam rejeitados ou marcados como spam.