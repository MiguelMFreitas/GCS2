# 🚀 Guia Oficial de Publicação Definitiva na Cloudflare
## Sistema GCS2 - Gestão e Controle de Frotas & Abastecimento

Este guia detalha o passo a passo completo para publicar o **GCS2** na infraestrutura de borda (Edge) global da **Cloudflare**, utilizando:

- **Cloudflare Workers**: Backend Serverless com execução ultrarrápida e entrega do Frontend React SPA.
- **Cloudflare D1**: Banco de dados relacional SQL permanente, distribuído e imune a perdas via Migrations.
- **Cloudflare R2**: Armazenamento em nuvem de fotos dos veículos, painéis, bombas, documentos e relatórios PDF com zero taxa de saída (egress).
- **GitHub Actions**: Pipeline de CI/CD para deploy 100% automatizado a cada commit no repositório.

---

## 📋 1. Pré-Requisitos

1. **Conta na Cloudflare**: Se ainda não possui, crie uma gratuitamente em [dash.cloudflare.com](https://dash.cloudflare.com).
2. **Node.js 20+** instalado em seu computador.
3. **Git** configurado.

---

## 🛠️ 2. Passo a Passo de Provisionamento e Deploy

### Passo 2.1: Autenticar no Cloudflare Wrangler
No terminal da raiz do projeto, execute o comando de login:
```bash
npx wrangler login
```
*Uma janela do navegador será aberta solicitando autorização para o Wrangler acessar sua conta Cloudflare.*

---

### Passo 2.2: Criar o Banco de Dados Cloudflare D1
Execute o comando para criar a instância do banco de dados:
```bash
npx wrangler d1 create gcs2-db
```

O terminal exibirá um resultado semelhante a este:
```
✅ Successfully created DB 'gcs2-db'!
[[d1_databases]]
binding = "DB"
database_name = "gcs2-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copie o valor do `database_id` gerado e abra o arquivo `wrangler.jsonc` na raiz do projeto. Substitua a linha:
```jsonc
"database_id": "REPLACE_WITH_YOUR_D1_DATABASE_ID"
```
pelo seu ID real:
```jsonc
"database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

---

### Passo 2.3: Criar o Bucket de Armazenamento Cloudflare R2
Execute o comando para criar o bucket de fotos, comprovantes e PDFs:
```bash
npx wrangler r2 bucket create gcs2-storage
```

---

### Passo 2.4: Aplicar as Migrations no Banco D1 (Zero Perda de Dados)
Execute as migrations para criar a estrutura de tabelas, índices e o usuário administrador inicial:
```bash
npx wrangler d1 migrations apply gcs2-db --remote
```

Quando solicitado para confirmar a execução, pressione **`y`** (Enter).

> [!IMPORTANT]
> **Garantia de Persistência:** A Cloudflare D1 utiliza a tabela interna `d1_migrations` para registrar as alterações já aplicadas. Novas atualizações no sistema executarão apenas migrações adicionais sem apagar ou recriar seus veículos, abastecimentos ou usuários existentes.

---

### Passo 2.5: Configurar o Segredo JWT
Defina a chave de segurança criptográfica para os tokens de sessão:
```bash
npx wrangler secret put JWT_SECRET
```
*Digite ou cole uma chave forte de sua escolha (ex: `GCS2_PROD_SUPER_KEY_2026_!@#`) e pressione Enter.*

---

### Passo 2.6: Realizar o Deploy em Produção
Execute o script de build e publicação:
```bash
npm run deploy
```

O Wrangler compilará o frontend Vite e publicará toda a aplicação na Cloudflare. Ao final, será exibida a URL pública de produção:
```
✨ Successfully published your Worker!
👉 https://gcs2-fleet-system.<seu-subdominio>.workers.dev
```

---

## 🤖 3. Deploy Automático Contínuo via GitHub Actions (CI/CD)

Ao conectar seu projeto a um repositório no GitHub, você pode automatizar todo o processo para que qualquer alteração na branch `main` seja publicada instantaneamente.

### Configurar Segredos no GitHub:
1. No seu repositório no GitHub, acesse **Settings** → **Secrets and variables** → **Actions**.
2. Clique em **New repository secret** e adicione:

| Nome do Segredo | Descrição | Onde Obter |
| :--- | :--- | :--- |
| `CLOUDFLARE_API_TOKEN` | Token de API com permissão para Workers, D1 e R2 | [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) (Modelo: Edit Cloudflare Workers) |
| `CLOUDFLARE_ACCOUNT_ID` | ID da sua conta Cloudflare | No painel inicial da Cloudflare (barra lateral direita) |

Pronto! Ao fazer um `git push origin main`, o GitHub Actions (`.github/workflows/deploy.yml`) executará automaticamente:
1. Instalação das dependências
2. Build do Frontend Vite
3. Aplicação de novas migrations no D1 (sem apagar dados)
4. Publicação da versão mais recente no Cloudflare Workers

---

## 🔑 4. Acesso Padrão Inicial

Após a primeira migration, os seguintes acessos estarão ativos:

- **Administrador:**
  - E-mail: `admin@gcs.com.br`
  - Senha: `admin123`
- **Operador de Pista:**
  - E-mail: `operador@gcs.com.br`
  - Senha: `123456`

*(Recomendamos alterar a senha no menu de Usuários / Configurações após o primeiro login em produção).*

---

## 💻 5. Comandos Úteis

| Comando | Função |
| :--- | :--- |
| `npm run build` | Compila o frontend React para a pasta `client/dist` |
| `npm run deploy` | Compila o frontend e publica o projeto na Cloudflare |
| `npm run d1:migrate` | Aplica migrações pendentes no Cloudflare D1 em produção |
| `npm run d1:migrate:local` | Aplica migrações no banco local para testes com Wrangler |
| `npx wrangler d1 execute gcs2-db --remote --command "SELECT count(*) FROM vehicles"` | Consulta dados diretamente no D1 de produção |
