# 🔐 Guia Completo: Verificar Permissões CoEx

## ✅ Como Verificar se Você Pode Usar CoEx

### 1️⃣ **Requisito Principal: Ser Tech Provider Certificado**

CoEx (Business App Onboarding) é um recurso **exclusivo para parceiros certificados** pela Meta.

#### Verificar se você é Tech Provider:

1. Acesse: https://developers.facebook.com/partners/
2. Procure seu nome/empresa na lista
3. Verifique se você tem badge de **"Tech Provider"** ou **"Solution Provider"**

❌ **Se você NÃO estiver listado**: Você **NÃO tem acesso** ao CoEx, independente das permissões do app.

✅ **Se você estiver listado**: Prossiga para verificar permissões do app.

---

### 2️⃣ **Verificar Permissões do App no Meta Dashboard**

#### Passo a Passo:

1. Acesse: https://developers.facebook.com/apps/
2. Selecione seu app: **AzTalk - First** (`1335317331469574`)
3. No menu lateral, vá em: **App Review** > **Permissions and Features**
4. Verifique o status das seguintes permissões:

| Permissão | Necessária para | Status Requerido |
|-----------|-----------------|------------------|
| `whatsapp_business_management` | Gerenciar WABAs | ✅ **Aprovada** |
| `whatsapp_business_messaging` | Enviar/receber mensagens | ✅ **Aprovada** |
| `business_management` | Acessar Business Manager | ✅ **Aprovada** |
| `manage_app_solution` | **Acesso CoEx (CRÍTICO)** | ✅ **Aprovada** |

#### ⚠️ Importante:

- **`manage_app_solution`** só aparece se você for **Tech Provider certificado**
- Se essa permissão não aparecer, você **não é Tech Provider**
- Permissões podem estar em status:
  - ✅ **Aprovada** (verde) - OK
  - ⏳ **Em revisão** (amarelo) - Aguardando
  - ❌ **Não solicitada** (cinza) - Precisa solicitar

---

### 3️⃣ **Verificar via Aplicação Web (Automático)**

Depois de fazer o **redeploy** no Easypanel:

1. Acesse sua aplicação: https://casaecosustentavel-whatsapp20.k3givk.easypanel.host
2. **Faça login** usando o botão "Login com Facebook"
3. Role até a seção **"🔐 Verificar Permissões CoEx"**
4. Clique no botão **"Verificar Permissões CoEx"**

#### Resultado Esperado:

**Se você TEM acesso CoEx:**
```
✅ Você TEM acesso ao modo CoEx!

📋 Permissões Necessárias:
┌────────────────────────────────┬─────────────┬────────────────────┐
│ Permissão                      │ Status      │ Descrição          │
├────────────────────────────────┼─────────────┼────────────────────┤
│ whatsapp_business_management   │ ✅ Concedida│ Gerenciar WABAs    │
│ whatsapp_business_messaging    │ ✅ Concedida│ Enviar mensagens   │
│ business_management            │ ✅ Concedida│ Gerenciar Business │
│ manage_app_solution            │ ✅ Concedida│ Acesso CoEx        │
└────────────────────────────────┴─────────────┴────────────────────┘
```

**Se você NÃO TEM acesso CoEx:**
```
❌ Você NÃO tem acesso ao modo CoEx

📋 Permissões Necessárias:
┌────────────────────────────────┬─────────────┬────────────────────┐
│ Permissão                      │ Status      │ Descrição          │
├────────────────────────────────┼─────────────┼────────────────────┤
│ whatsapp_business_management   │ ✅ Concedida│ Gerenciar WABAs    │
│ whatsapp_business_messaging    │ ✅ Concedida│ Enviar mensagens   │
│ business_management            │ ✅ Concedida│ Gerenciar Business │
│ manage_app_solution            │ ❌ Ausente  │ Acesso CoEx        │
└────────────────────────────────┴─────────────┴────────────────────┘

⚠️ Ações Necessárias:
• ❌ CRÍTICO: Permissão "manage_app_solution" ausente
• Você NÃO é um Tech Provider certificado
• Para obter acesso CoEx, candidatar-se em: https://developers.facebook.com/partners/
```

---

### 4️⃣ **Verificar via Graph API Explorer (Manual)**

Se quiser verificar manualmente:

1. Acesse: https://developers.facebook.com/tools/explorer/
2. Selecione seu app: **AzTalk - First**
3. Gere um **User Access Token**
4. Cole este comando:

```
/debug_token?input_token=SEU_TOKEN_AQUI
```

5. Procure no JSON retornado pelo campo `scopes`:

```json
{
  "data": {
    "scopes": [
      "whatsapp_business_management",
      "whatsapp_business_messaging",
      "business_management",
      "manage_app_solution"  // ← ESTE É CRÍTICO PARA COEX
    ]
  }
}
```

---

## 🚨 Principais Problemas e Soluções

### Problema 1: `manage_app_solution` não aparece

**Causa**: Você não é Tech Provider certificado.

**Solução**:
1. Candidatar-se ao programa: https://developers.facebook.com/partners/
2. Preencher formulário de certificação
3. Aguardar aprovação da Meta (pode levar semanas)
4. Após aprovação, a permissão aparecerá automaticamente

### Problema 2: Permissões em "Revisão"

**Causa**: Permissões solicitadas mas não aprovadas.

**Solução**:
1. Acesse App Dashboard > App Review > Permissions
2. Complete o formulário de revisão para cada permissão
3. Envie vídeo/documentação conforme solicitado
4. Aguarde aprovação (1-7 dias úteis)

### Problema 3: Erro "is_on_biz_app field doesn't exist"

**Causa**: Tentando usar CoEx sem ser Tech Provider.

**Solução**:
- Campo `is_on_biz_app` só existe para Tech Providers
- Você **precisa** ter `manage_app_solution` no token
- Sem essa permissão, CoEx não funciona

---

## 📚 Recursos Adicionais

### Documentação Oficial:
- **CoEx Guide**: https://developers.facebook.com/docs/whatsapp/business-management-api/guides/migrate-phone-number
- **Tech Provider Program**: https://developers.facebook.com/partners/
- **App Review**: https://developers.facebook.com/docs/app-review/

### Contato Meta:
- **WhatsApp Business Support**: https://business.whatsapp.com/support
- **Developer Forums**: https://developers.facebook.com/community/

---

## ✅ Checklist Final

Antes de usar CoEx, verifique:

- [ ] Você é Tech Provider certificado (listado em developers.facebook.com/partners/)
- [ ] Permissão `manage_app_solution` está **aprovada** no App Dashboard
- [ ] Permissão `whatsapp_business_management` está **aprovada**
- [ ] Permissão `whatsapp_business_messaging` está **aprovada**
- [ ] Permissão `business_management` está **aprovada**
- [ ] Token gerado contém todos os 4 escopos acima
- [ ] Botão "Verificar Permissões CoEx" retorna ✅ verde

**Se TODOS os itens acima estiverem ✅**, você pode usar CoEx!

**Se algum item estiver ❌**, você precisa resolver antes de prosseguir.
