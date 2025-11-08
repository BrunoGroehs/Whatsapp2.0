# WhatsApp Business Embedded Signup (Node/Express)

Implementação de referência para o fluxo de **Cadastro Incorporado (Embedded Signup)** do WhatsApp Business via Facebook Login, incluindo:

* Página web com botão "Login com Facebook" usando o Facebook SDK.
* Troca do `code` de autorização por um **Business (System User) Access Token**.
* Registro do número na Cloud API (`/register`).
* Assinatura dos webhooks (`/subscribed_apps`).
* Endpoints de webhook (`GET/POST /webhook`).

## 1. Requisitos

* Node.js 18+ (imagem Docker usa Node 20-alpine)
* Conta Facebook Developer com App configurado (Facebook Login + WhatsApp Business)
* Configuração do **Embedded Signup** (config_id)
* Domínio (APP_URL) cadastrado nas Configurações de OAuth do App

## 2. Variáveis de Ambiente (`.env`)

Copie `.env.example` para `.env` e preencha:

```
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=SEU_APP_SECRET
FACEBOOK_CONFIG_ID=SEU_CONFIG_ID_EMBEDDED_SIGNUP
FACEBOOK_BUSINESS_ID=SEU_BUSINESS_ID   # opcional: pré-seleciona o Business correto no diálogo do Embedded Signup
WEBHOOK_VERIFY_TOKEN=token-verificacao-webhook
APP_URL=https://SEU-DOMINIO-EASYPANEL
PORT=3000
LOG_LEVEL=info   # fatal,error,warn,info,debug,trace,silent ("dev" vira debug automaticamente)
GRAPH_API_VERSION=v24.0
DEFAULT_REGISTER_PIN=123456
LOG_PRETTY=0  # use 1 somente em desenvolvimento local
```

## 3. Instalação e Execução Local

```powershell
npm install
npm run dev
# Acesse http://localhost:3000
```

## 4. Docker / Easypanel

Build e subir com docker-compose:

```powershell
docker compose up --build -d
```

Certifique-se que o `APP_URL` (ex: `https://casaecosustentavel-whatsapp-coex.k3givk.easypanel.host`) esteja cadastrado como domínio permitido de OAuth.

## 5. Fluxo Front-End

1. Usuário clica em "Login com Facebook".
2. `FB.login()` é chamado com `config_id`, `response_type: 'code'`, `override_default_response_type: true`. Se `FACEBOOK_BUSINESS_ID` for definido, o front-end envia `extras.setup.business` para pré-selecionar o Business correto e facilitar a listagem de WABAs existentes.
3. Após completar o fluxo, o callback devolve `response.authResponse.code`.
4. Listener `postMessage` captura evento `WA_EMBEDDED_SIGNUP` contendo `waba_id` e `phone_number_id`.
5. Front-end envia via `fetch` para `/api/fbAuthCode` (code + IDs opcionais) para que o backend troque por token.

## 6. Backend (Principais Endpoints)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Página principal (HTML). |
| GET | `/config.js` | Config público (App ID etc). |
| POST | `/api/fbAuthCode` | Troca `code` por `access_token` e persiste. |
| POST | `/api/registerNumber` | Registra número (`/PHONE_NUMBER_ID/register`). |
| POST | `/api/subscribeWebhook` | Assina webhooks (`/WABA_ID/subscribed_apps`). |
| GET | `/webhook` | Validação do webhook (mode+verify_token+challenge). |
| POST | `/webhook` | Recebe eventos do WhatsApp Cloud. |

Persistência simples em `data/store.json`.

## 7. Registro do Número

Exemplo da chamada implementada no backend:

```
POST https://graph.facebook.com/v24.0/{PHONE_NUMBER_ID}/register
Body: {"messaging_product":"whatsapp", "pin":"123456"}
Header: Authorization: Bearer {ACCESS_TOKEN}
```

O número deve ser registrado em até **14 dias** após o fluxo.

## 8. Webhooks

Configure a URL do webhook (ex: `https://SEU-DOMINIO/webhook`) no painel do App e use o `WEBHOOK_VERIFY_TOKEN` igual ao .env.

`GET /webhook`: verifica o token e devolve `hub.challenge`.

`POST /webhook`: imprime o JSON recebido no log. Ajuste para persistir/processar mensagens.

## 9. Segurança / Boas Práticas

* Não exponha `FACEBOOK_APP_SECRET` ao front-end.
* Restrinja CORS conforme necessidade.
* Armazene tokens sensíveis em store segura se evoluir para produção (ex: banco cifrado). Este exemplo usa JSON local.
* Valide entradas (IDs, PIN) antes de chamadas.

## 10. Testes Rápidos

1. Subir app local ou no Easypanel.
2. Abrir a página e fazer login.
3. Confirmar que o log mostra `Código recebido` e `Fluxo concluído`.
4. Registrar número e checar resposta `{"success":true}`.
5. Assinar webhook e ver `{"success":true}`.

## 11. Próximos Passos / Extensões

* Adicionar resposta automática a mensagens recebidas (chamar `/messages`).
* Implementar refresh/rotina de monitoramento de qualidade do número.
* Migrar store para SQLite ou Postgres.
* Adicionar testes automatizados (Jest, supertest) e lint.
* Configurar agregação de logs (ex: enviar stdout do container para Loki/ELK). Pretty logs só local.

## 12. Modo CoEx (Coexistence) para Tech Providers

**✅ APENAS para Solution Partners e Tech Providers certificados**

### O que é CoEx?

Permite que clientes conectem seus números existentes do **WhatsApp Business App** (celular) à Cloud API mantendo:
- ✅ Uso simultâneo do app móvel
- ✅ Histórico de conversas preservado
- ✅ Sincronização automática de mensagens
- ⚠️ Throughput limitado a 20 mensagens/segundo

### Requisitos

1. **Ser Tech Provider ou Solution Partner** certificado pela Meta
2. WhatsApp Business App **versão 2.24.17+** (cliente)
3. Webhooks subscritos a campos CoEx: `history`, `smb_app_state_sync`, `smb_message_echoes`, `account_update`
4. País suportado (exceto Nigéria e África do Sul)

### Como funciona

1. **Cliente clica** "Login com Facebook" (fluxo mostra opção "Connect existing WhatsApp Business account")
2. **Cliente informa** número do WhatsApp Business App
3. **Cliente escaneia** QR code exibido usando o app móvel
4. **Cliente escolhe** se compartilha ou não o histórico
5. **Fluxo retorna** event: `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` (em vez de evento padrão)
6. **Você sincroniza** contatos e histórico em até 24h

### Configuração (já implementada)

O código já está configurado com:

```javascript
extras: { 
  sessionInfoVersion: '3',
  featureType: 'whatsapp_business_app_onboarding'  // Ativa CoEx
}
```

### Fluxo pós-onboarding

1. **Após receber `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING`**:
   - NÃO registre o número (já está registrado)
   - Assine webhooks normalmente (`/api/subscribeWebhook`)

2. **Sincronizar contatos** (obrigatório, 1x):
   - Clique em "Sincronizar contatos"
   - Aguarde webhooks `smb_app_state_sync` com os contatos
   - Webhook chegará toda vez que cliente adicionar/editar/remover contato no app

3. **Sincronizar histórico** (obrigatório, 1x):
   - Clique em "Sincronizar histórico"
   - Se cliente aceitou compartilhar: chegam webhooks `history` (em fases: 0-1 dia, 1-90 dias, 90-180 dias)
   - Se cliente recusou: chega webhook `history` com erro `2593109`

4. **Espelhar mensagens** do app:
   - Quando cliente envia mensagem pelo WhatsApp Business App, chega webhook `smb_message_echoes`
   - Exiba na sua UI para manter sincronia

### Endpoints disponíveis

| Endpoint | Descrição |
|----------|-----------|
| `POST /api/coex/checkStatus` | Verifica se número está em modo CoEx (`is_on_biz_app: true`, `platform_type: CLOUD_API`) |
| `POST /api/coex/syncContacts` | Inicia sincronização de contatos (POST `smb_app_data` com `sync_type: smb_app_state_sync`) |
| `POST /api/coex/syncHistory` | Inicia sincronização de histórico (POST `smb_app_data` com `sync_type: history`) |

### Webhooks CoEx

Configure no painel do App > WhatsApp > Configuration:

- ☑️ `history` — histórico de mensagens (180 dias)
- ☑️ `smb_app_state_sync` — contatos do app
- ☑️ `smb_message_echoes` — mensagens enviadas pelo app
- ☑️ `account_update` — desconexão (PARTNER_REMOVED)

### Limitações

- **Throughput fixo**: 20 mensagens/segundo (vs 80-1000 mps normal)
- **Sincronização única**: só pode sincronizar 1x; se precisar repetir, cliente deve refazer fluxo
- **Prazo**: 24h para sincronizar após onboarding
- **Companion devices**: WhatsApp Windows e WearOS não suportados (mensagens não geram webhooks)

### Exemplo de uso

```bash
# 1. Cliente completa Embedded Signup (CoEx)
# 2. Você recebe waba_id e phone_number_id

# 3. Verificar status CoEx
curl -X POST http://localhost:3000/api/coex/checkStatus \
  -H 'Content-Type: application/json' \
  -d '{"phone_number_id":"123456789","waba_id":"987654321"}'

# 4. Sincronizar contatos
curl -X POST http://localhost:3000/api/coex/syncContacts \
  -H 'Content-Type: application/json' \
  -d '{"phone_number_id":"123456789"}'

# 5. Sincronizar histórico
curl -X POST http://localhost:3000/api/coex/syncHistory \
  -H 'Content-Type: application/json' \
  -d '{"phone_number_id":"123456789"}'
```

### Desconexão

Cliente pode desconectar pelo WhatsApp Business App:
- Settings > Account > Business Platform > Disconnect Account
- Você receberá webhook `account_update` com `event: PARTNER_REMOVED`

Não use `POST /<PHONE_ID>/deregister` em números CoEx (não funciona).

### Suporte

Se precisar de ajuda com CoEx:
- Question Topic: "WABiz: Onboarding" + "TechProvider: Onboarding"
- Request Type: "Embedded Signup - Coexistence Onboarding"

Para problemas de API:
- Question Topic: "WABiz: Cloud API"
- Request Type: "Coexistence Data Synchronzation APIs and Webhooks"

## 13. Migração de Número Existente (WhatsApp Business App → Cloud API)

### ⚠️ Importante: Diferença entre WABA e Número Individual

- **WABA (WhatsApp Business Account)**: É a conta "guarda-chuva" no Business Manager que pode ter vários números.
- **Número de telefone individual**: Um número específico registrado no app WhatsApp Business do celular.

O **Embedded Signup** só mostra **WABAs existentes** (contas Business completas), não números individuais do app móvel.

### Como migrar um número do WhatsApp Business App para Cloud API

Você tem **duas opções**:

#### Opção 1: Migração com PERDA de histórico (oficial Meta)

1. **Fazer backup** do histórico de conversas (Android/iOS)
2. **Deletar a conta** no WhatsApp Business App:
   - Abra o app WhatsApp Business
   - Vá em Configurações > Conta > Deletar minha conta
   - Confirme a exclusão
   - Aguarde até 3 minutos
3. **Aguardar o número ficar disponível** (até 3 minutos)
4. **Adicionar o número** via Cloud API:
   - Use o Embedded Signup para criar uma **nova WABA**
   - Durante o fluxo, informe o número de telefone liberado
   - Complete a verificação (SMS/chamada)
   - Registre o número com este projeto

⚠️ **Você perderá**: histórico de mensagens, não poderá usar o app móvel novamente com esse número (a menos que desregistre da Cloud API).

#### Opção 2: Migração com PRESERVAÇÃO de histórico (via Solution Provider)

Use um [Solution Provider certificado](https://www.facebook.com/business/partner-directory/search?solution_type=messaging) que suporta **"business app number onboarding"**. Isso permite:
- Manter o histórico de conversas
- Usar o WhatsApp Business App E a solução do parceiro simultaneamente

Parceiros suportam fluxo CoEx (co-existente), mas isso **não está disponível** via Embedded Signup direto.

### Por que não vejo meu número do app móvel no Embedded Signup?

O Embedded Signup **NÃO lista números individuais** do WhatsApp Business App. Ele só mostra:
- WABAs (contas Business) já criadas no Business Manager
- Opção de criar uma nova WABA

Para usar seu número existente, você deve **deletar do app** e **adicionar via Cloud API** (opção 1 acima).

## 13. Troubleshooting: Por que minha WABA não aparece no Embedded Signup?

### Problema
Ao clicar em "Login com Facebook" no fluxo de Embedded Signup, só aparece a opção "Criar uma conta do WhatsApp Business", mas não vejo minha WABA existente para conectar.

**Nota**: Se você está procurando migrar um **número individual** do app WhatsApp Business, veja a seção anterior "Migração de Número Existente".

### Ferramenta de Diagnóstico

A página principal agora inclui uma seção de diagnóstico. Para usar:

1. Obtenha um **User Access Token** do usuário que faz o login:
   - Vá para [Graph Explorer](https://developers.facebook.com/tools/explorer/)
   - Faça login com a conta que tem acesso à WABA
   - Solicite as permissões: `whatsapp_business_management`, `business_management`
   - Copie o token gerado

2. Na página do app (`http://localhost:3000` ou sua URL do Easypanel):
   - Role até a seção "🔍 Diagnóstico"
   - Cole o token no campo
   - Clique em **Diagnosticar**

3. O sistema vai verificar:
   - Quais Businesses você tem acesso
   - Quais WABAs são "owned" (propriedade) vs "client" (compartilhadas)
   - Se os escopos necessários foram concedidos
   - Recomendações específicas para seu caso

### Causas comuns

| Problema | Solução |
|----------|---------|
| Nenhuma WABA "owned" encontrada | Você precisa ser **Admin** do Business Manager que possui a WABA. Verifique em Business Settings > Accounts > WhatsApp Accounts se você tem papel de Admin. |
| WABA aparece como "client" (compartilhada) | WABAs compartilhadas não aparecem no Embedded Signup. Transfira a propriedade para o Business correto ou peça ao proprietário para conceder acesso completo. |
| Escopos insuficientes | A configuração (config_id) deve incluir `whatsapp_business_management` e `business_management`. Recrie a configuração no painel do App se necessário. |
| Config_id sem "existing assets" | Ao criar a configuração de Embedded Signup, marque a opção "Allow existing assets" (permitir usar ativos existentes). |
| Business ID incorreto | Se definiu `FACEBOOK_BUSINESS_ID`, garanta que é o ID do Business que realmente possui a WABA. |
| Usuário não é tester do App | Se o App está em modo desenvolvimento, adicione o usuário como Tester/Admin em Roles do App. |

### Verificação manual (Graph API)

Se preferir verificar manualmente, use:

```bash
# Listar businesses com WABAs owned
curl -G "https://graph.facebook.com/v24.0/me" \
  -d "fields=businesses{id,name,owned_whatsapp_business_accounts{id,name}}" \
  -d "access_token=SEU_USER_TOKEN"

# Ver escopos do token
curl -G "https://graph.facebook.com/v24.0/debug_token" \
  -d "input_token=SEU_USER_TOKEN" \
  -d "access_token=SEU_USER_TOKEN"
```

Se `owned_whatsapp_business_accounts` estiver vazio, a WABA não pertence a esse Business ou você não tem papel suficiente.

### Fluxo para adicionar número após deletar do app

Depois de deletar a conta do WhatsApp Business App (se aplicável):

1. Use o Embedded Signup normalmente (clique "Criar uma conta do WhatsApp Business")
2. Durante o fluxo, informe:
   - Dados da empresa (nome, endereço, categoria)
   - **Número de telefone** (o que você deletou do app)
   - Método de verificação (SMS ou chamada)
3. Após verificar, o número será vinculado à nova WABA
4. Use os botões "Registrar número" e "Assinar webhook" neste app
5. Pronto para enviar mensagens via Cloud API

## 14. Referências

### Como descobrir seu Business ID
- Via Graph Explorer (com seu usuário):

```
GET https://graph.facebook.com/v24.0/me?fields=businesses{id,name}
```

Use o `id` do business correspondente ao que “possui” sua WABA.

* Documentação oficial WhatsApp Cloud API (Embedded Signup, Webhooks)
* Graph API v24.0
* Exemplo oficial (Glitch) da Meta

---
Este projeto é fornecido como referência e ponto de partida para integrar números de clientes dinamicamente à API Cloud do WhatsApp.
