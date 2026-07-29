# Configuração de DNS para Validação no Resend

Este guia explica como configurar os registros DNS necessários para validar seu domínio no Resend e garantir que seus e-mails cheguem diretamente à caixa de entrada.

## 1. Onde encontrar os valores no Resend

1. Acesse o painel do Resend em https://resend.com
2. Navegue até **Domains** > **Add Domain**
3. Digite seu domínio (ex: `seusaas.com.br`)
4. Escolha a região (geralmente `us-east-1`)
5. O Resend vai gerar os valores exatos de DKIM, SPF e DMARC específicos para sua conta

## 2. Como cadastrar os Registros no seu DNS

Acesse a zona de DNS do seu domínio no seu provedor (Cloudflare, Registro.br, Hostinger, GoDaddy, AWS Route 53, etc.) e crie os três registros abaixo:

### A. Registro DKIM (Autenticação de Assinatura)

Garante ao servidor de destino que o e-mail não foi alterado no caminho.

Tipo: **TXT** (ou CNAME dependendo do tipo de validação)

Nome / Host: `resend._domainkey` (ou o valor fornecido no painel)

Valor / Conteúdo: Copie a chave longa gerada pelo Resend

### B. Registro SPF (Autorização de Envio)

Informa aos provedores (Gmail, Outlook) que os servidores do Resend têm autorização para enviar e-mails em nome do seu domínio.

Tipo: **TXT**

Nome / Host: `@` (ou deixe em branco / use seu domínio completo `seusaas.com.br`, dependendo do provedor DNS)

Valor / Conteúdo:
```
v=spf1 include:amazonses.com ~all
```

**Atenção:** Se você já tiver um registro SPF existente (ex: para Google Workspace ou Zoho), não crie outro TXT de SPF. Apenas adicione `include:amazonses.com` dentro do registro existente antes de `~all`.

Exemplo mesclado:
```
v=spf1 include:_spf.google.com include:amazonses.com ~all
```

### C. Registro DMARC (Política de Segurança)

Define o que o provedor de destino deve fazer caso o e-mail falhe no SPF ou DKIM.

Tipo: **TXT**

Nome / Host: `_dmarc`

Valor / Conteúdo (Política Inicial de Monitoramento):
```
v=DMARC1; p=none;
```

(A tag `p=none;` instrui o servidor a aceitar o e-mail e gerar relatórios enquanto você valida a entrega).

## 3. Exemplos por Provedor de DNS

### Cloudflare
- Nome/Host: deixe como @ para root, ou subdomínio para registros específicos
- Tipo: TXT
- Conteúdo: cole o valor completo
- TTL: Auto

### Registro.br
- Nome: deixe em branco para root, ou nome do registro
- Tipo: TXT
- Conteúdo: valor completo
- TTL: 3600

### Hostinger
- Host: @ ou nome do registro
- Tipo: TXT
- Valor: conteúdo completo
- TTL: 14400

### GoDaddy
- Host: @ ou nome do registro
- Tipo: TXT
- Valor: conteúdo completo
- TTL: 1 hora

### AWS Route 53
- Nome: nome completo ou @
- Tipo: TXT
- Valor: conteúdo completo (entre aspas)
- TTL: 300

## 4. Verificação

Após criar os registros DNS:

1. Aguarde a propagação (pode levar de 5 minutos a 48 horas, geralmente 1-2 horas)
2. Acesse o painel do Resend
3. Verifique o status de validação do domínio
4. Use ferramentas como MXToolbox ou Google Admin Toolbox para verificar os registros

### 4.1 Testando e Confirmando a Validação

1. **Adicionar os registros na zona DNS**
   - Insira os registros no painel do seu provedor de hospedagem/DNS conforme a seção 2.

2. **Aguardar propagação e clicar em Verify**
   - Aguarde alguns minutos.
   - Volte ao painel do Resend em **Domains** e clique no botão **Verify Domain**.
   - Se o status mudar para **Verified** (verde), a autenticação está concluída.

3. **Testar o envio na aplicação**
   - Faça uma chamada de teste via API chamando a biblioteca do Resend utilizando o endereço cadastrado como remetente (ex: `noreply@seu-dominio.com.br`).
   - Verifique se o e-mail chega à caixa de entrada e não cai em spam.

### 4.2 Dica para Cloudflare

Se estiver usando o Cloudflare como DNS, certifique-se de deixar o ícone da nuvem como **Gray/DNS Only** (desativar o proxy da Cloudflare) para os registros de autenticação de e-mail.

### 4.3 Usando a Rota de Teste da Aplicação

Após configurar o DNS e registrar a rota no backend, você pode testar o envio diretamente pela API:

1. **Teste via cURL:**
   ```bash
   curl -X POST http://localhost:3001/api/test-email \
     -H "Content-Type: application/json" \
     -d '{"email": "seu-email@exemplo.com", "name": "Desenvolvedor"}'
   ```

2. **Resposta esperada (sucesso):**
   ```json
   {
     "success": true,
     "message": "E-mail de teste enviado com sucesso!",
     "data": { "id": "e227092e-..." }
   }
   ```

3. **Observação importante:**
   - Antes da validação do domínio: o Resend usa `onboarding@resend.dev` e só envia para o e-mail da conta.
   - Após validação: altere `EMAIL_FROM` no `.env` para seu domínio e poderá enviar para qualquer destinatário.

## 5. Boas Práticas

- Comece com `p=none` no DMARC e monitore os relatórios antes de alterar para `p=quarantine` ou `p=reject`
- Nunca remova registros SPF existentes, apenas adicione o include do Resend
- Mantenha o DKIM sempre válido
- Monitore regularmente os relatórios de DMARC
- Teste o envio antes de colocar em produção

## 6. Troubleshooting

**E-mails caindo em spam:**
- Verifique se todos os 3 registros estão criados corretamente
- Confira se o DKIM está válido
- Verifique se o SPF não está estourado (+ de 255 caracteres)

**Problemas de validação no Resend:**
- Aguarde mais tempo para propagação DNS
- Verifique se não há erros de digitação nos registros
- Use `dig` ou `nslookup` para verificar se os registros estão públicos

## Referências

- [Documentação oficial do Resend sobre DNS](https://resend.com/docs/dashboard/domains/introduction)
- [Guia DMARC](https://dmarc.org/overview/)
- [SPF Record Testing](https://mxtoolbox.com/spf.aspx)