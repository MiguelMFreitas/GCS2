# GCS2 - Sistema de Gestão de Frota e Controle de Abastecimento

Sistema web corporativo, profissional, moderno e responsivo desenvolvido especialmente para controle de frotas e abastecimento semanal (com foco nas segundas-feiras), cálculo automático de consumo, ficha técnica de veículos, manutenções, despesas, relatórios consolidados e arquitetura **Cloudflare Serverless** para produção.

---

## ☁️ Arquitetura de Produção (Cloudflare)

O sistema foi preparado com arquitetura de ponta para execução permanente na nuvem da Cloudflare:

- **Frontend & Backend API:** [Cloudflare Workers](https://workers.cloudflare.com/) com suporte a SPA e execução no Edge global.
- **Banco de Dados Relacional Permanente:** [Cloudflare D1](https://developers.cloudflare.com/d1/) (Serverless SQL) gerenciado por **Migrations versionadas** (`migrations/0001_initial_schema.sql`, `migrations/0002_initial_admin.sql`) — garantindo **zero perda de dados** e sem recriação de tabelas a cada deploy.
- **Armazenamento de Imagens e Arquivos:** [Cloudflare R2](https://developers.cloudflare.com/r2/) para fotos de veículos, painéis, bombas de combustível, documentos (CRLV) e relatórios em PDF.
- **CI/CD Automatizado:** GitHub Actions (`.github/workflows/deploy.yml`) para build e deploy automático em produção.

👉 **Consulte o guia completo passo a passo de publicação em [DEPLOY_CLOUDFLARE.md](./DEPLOY_CLOUDFLARE.md).**

---

## 🚀 Como Executar Localmente (Ambiente de Desenvolvimento)

### Opção A: Execução Padrão Node.js + Vite (Desenvolvimento Rápido)
1. **Iniciar Backend:**
   ```bash
   cd server
   npm install
   npm start
   ```
   *Servidor API em: `http://localhost:5000`*

2. **Iniciar Frontend:**
   ```bash
   cd client
   npm install
   npm run dev
   ```
   *Aplicação em: `http://localhost:3000`*

---

### Opção B: Execução Local com Cloudflare Wrangler
Para testar a aplicação simulando o ambiente exato de Workers, D1 e R2:
```bash
# Na raiz do projeto:
npm run build:client
npm run dev:worker
```

---

## 🔑 Credenciais de Acesso Inicial

- **Administrador:** `admin@gcs.com.br` | Senha: `admin123`
- **Operador Frotista:** `operador@gcs.com.br` | Senha: `123456`
- *(A tela de login conta com botões de 1 clique para preenchimento rápido em demonstrações).*

---

## ✨ Principais Funcionalidades

### 1. Fluxo de Abastecimento da Semana baseado em Carrinho 🛒
- **Analogia E-commerce:** Permite registrar veículo por veículo, adicionando ao carrinho sem fechar a operação imediatamente.
- **Filtro Automático:** Somente veículos com status 🟢 **Funcionando / Rodando** aparecem como pendentes. Veículos parados, em manutenção ou inativos são automaticamente excluídos da lista semanal.
- **Controle Anti-Duplicação:** Bloqueio inteligente caso o operador tente adicionar o mesmo veículo mais de uma vez na mesma sessão.
- **Persistência de Rascunho:** Se o operador sair da página ou recarregar o navegador, os dados permanecem salvos com aviso para *"Continuar abastecimento em andamento"*.
- **Barra Flutuante Mobile:** Botão fixo no rodapé em dispositivos móveis exibindo a quantidade de veículos e total parcial.

### 2. Tratamento Inteligente de Odômetro (Funcional vs Não Funcional) ⏱️
- **Veículos com Odômetro Funcional:**
  - Exige quilometragem atual e foto do painel.
  - Busca última KM automaticamente e calcula: `KM rodados`, `Consumo (km/L)` e `Custo por KM (R$/km)`.
  - Exige foto da bomba de combustível.
- **Veículos SEM Odômetro Funcional:**
  - Não exige KM nem foto do painel.
  - Exibe claramente: *"Consumo não calculado — odômetro não funcional"* (nunca 0 km/L).
  - É automaticamente excluído do cálculo da média de consumo da frota para não distorcer os dados.

### 3. Relatório Automático Consolidado e Exportação 📄📊🖨️
Ao clicar em **Finalizar Abastecimento**:
- Gera imediatamente o relatório completo da sessão (`ABAST-AAAA-MM-DD-001`).
- **Resumo Geral:** Total de veículos, volume de litros e valor total pago com destaque visual.
- **Consolidação por Combustível:** Agrupamento de Gasolina, Diesel, Etanol e Outros com litros, preço médio ponderado por litro e valor total gasto.
- **Cards por Veículo:** Dados individuais detalhados de cada veículo abastecido.
- **Exportação:**
  - 📄 **Gerar PDF Executivo:** Visual moderno em cartões corporativos via jsPDF.
  - 📊 **Exportar Planilha Excel (.xlsx):** Relatório tabular completo.
  - 🖨 **Imprimir:** Layout otimizado para impressão direta.

### 4. Gestão Completa de Veículos e Exclusão Segura 🚚
- **Ficha do Veículo:** Documentos (CRLV, seguro com alerta de vencimento), manutenções, histórico de abastecimentos e despesas.
- **Dupla Confirmação de Exclusão:** Opção de 🟡 **Desativar veículo** (preserva todo o histórico) ou 🔴 **Apagar definitivamente** (com digitação da placa para segurança máxima).
- **Tratamento de Estado Vazio:** Quando todos os veículos são excluídos, todas as telas zeram imediatamente os indicadores de forma consistente.

### 5. Despesas, Manutenção, Lembretes e Auditoria 🔧
- Registro de trocas de óleo, pneus, baterias, multas, IPVA, licenciamento e seguro.
- Lembretes automáticos por quilometragem ou data com alertas no dashboard.
- Trilha de auditoria (`audit_logs`) para alterações em sessões finalizadas e exclusões.

---

## 📁 Estrutura do Projeto

```
GCS2/
├── migrations/                          # Migrations versionadas do Cloudflare D1
│   ├── 0001_initial_schema.sql          # Criação permanente de tabelas e índices
│   └── 0002_initial_admin.sql           # Usuários administrativos iniciais
├── worker/                              # Backend Serverless Cloudflare Worker
│   ├── routes/                          # Controladores de rotas da API REST
│   ├── utils/                           # Autenticação JWT Web Crypto, D1 e Auditoria
│   └── index.js                         # Roteador principal + D1 + R2 + SPA Fallback
├── client/                              # Frontend React + Vite + Tailwind CSS
│   ├── src/                             # Componentes, telas, hooks e serviços
│   └── dist/                            # Build estático servido pela Cloudflare
├── .github/workflows/deploy.yml         # Pipeline CI/CD GitHub Actions
├── wrangler.jsonc                       # Configuração oficial do Wrangler
├── DEPLOY_CLOUDFLARE.md                 # Guia passo a passo de publicação
├── .env.example                         # Modelo de variáveis de ambiente
└── .gitignore                           # Prevenção de vazamento de segredos
```
