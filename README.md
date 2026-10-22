
# ✂️ SpaçoVip Barbearia — Sistema de Agendamento e Gestão

Sistema web completo desenvolvido para a **Barbearia SpaçoVip**, com áreas distintas para **clientes** e **barbeiro**, permitindo agendamentos, gerenciamento de agenda, serviços, descontos, pagamentos, fiado, avaliações e notificações.

O projeto foi desenvolvido utilizando **Next.js, React, TypeScript, Prisma e PostgreSQL**, com autenticação pelo Google, PWA e Web Push.

---

## 📌 Visão geral

O SpaçoVip foi pensado para resolver o fluxo completo de atendimento de uma barbearia:

- Cliente acessa a aplicação.
- Realiza login com Google.
- Escolhe os serviços desejados.
- Adiciona vários serviços ao carrinho.
- Escolhe data e horário disponíveis.
- O sistema verifica automaticamente as regras da agenda.
- O servidor calcula descontos e o valor final.
- O agendamento é salvo no PostgreSQL.
- O barbeiro recebe a informação no painel.
- O barbeiro pode confirmar e concluir o atendimento.
- Após o atendimento concluído, o cliente pode avaliar o serviço.
- O sistema também possui recursos administrativos para pagamentos, fiado, agenda e acompanhamento financeiro.

O projeto utiliza regras de negócio no servidor para evitar que informações importantes, como preço, desconto e disponibilidade, dependam apenas da interface do navegador.

---

# 🚀 Tecnologias utilizadas

| Tecnologia | Utilização |
|---|---|
| **Next.js** | Framework principal da aplicação |
| **React** | Construção da interface e componentes |
| **TypeScript** | Tipagem e segurança no desenvolvimento |
| **Prisma ORM** | Comunicação com o banco de dados |
| **PostgreSQL** | Banco de dados relacional |
| **Neon** | PostgreSQL em ambiente cloud |
| **NextAuth** | Autenticação e gerenciamento de sessão |
| **Google OAuth** | Login utilizando conta Google |
| **Tailwind CSS** | Estilização da aplicação |
| **shadcn/base-ui** | Componentes de interface |
| **Lucide** | Ícones |
| **PWA** | Aplicação instalável |
| **Service Worker** | Recursos PWA e notificações |
| **Web Push** | Notificações para usuários |
| **VAPID** | Autenticação do servidor para Web Push |
| **Git** | Controle de versão |
| **GitHub** | Repositório remoto |
| **Vercel** | Deploy da aplicação |

---

# 🏗️ Arquitetura

A aplicação pode ser entendida em camadas:

```text
┌──────────────────────────────┐
│           USUÁRIO            │
│ Cliente / Barbeiro           │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       NEXT.JS + REACT        │
│ Pages / Components           │
│ Client Components            │
│ Server Components            │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     SERVER ACTIONS / API     │
│ Regras de negócio            │
│ Validações                   │
│ Autorização                  │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│          PRISMA ORM          │
│ Models / Relations / Queries │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│      POSTGRESQL / NEON       │
│ Dados da aplicação           │
└──────────────────────────────┘
```

O projeto também possui uma camada independente de notificações:

```text
Aplicação
   │
   ▼
Web Push + VAPID
   │
   ▼
Service Worker
   │
   ▼
Navegador / PWA
   │
   ▼
Notificação
```

---

# 📁 Estrutura do projeto

```text
fsw-barber/
│
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── push/
│   │   └── user/
│   │
│   ├── barbeiro/
│   │   └── dashboard/
│   │
│   ├── barbershops/
│   │
│   ├── bookings/
│   │
│   ├── login/
│   │   └── redirect/
│   │
│   ├── _actions/
│   ├── _components/
│   ├── _constants/
│   ├── _provider/
│   ├── _utils/
│   │
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── lib/
│   ├── auth.ts
│   ├── business-schedule.ts
│   ├── fixed-schedule.ts
│   ├── prisma.ts
│   ├── push.ts
│   └── utils.ts
│
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
│
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── LOGO_SpacoVip.jpeg
│   ├── icon-192.*
│   └── icon-512.*
│
├── type/
│   └── next-auth.d.ts
│
├── .env
├── next.config.ts
├── package.json
├── prisma.config.ts
└── tsconfig.json
```

---

# ⚛️ Next.js

O **Next.js** é o framework principal utilizado no projeto.

Ele fornece:

- Sistema de rotas baseado em arquivos.
- Server Components.
- Client Components.
- Server Actions.
- Route Handlers.
- Renderização no servidor.
- Integração com backend.
- Organização da aplicação.
- Suporte a PWA.
- Integração simplificada com deploy.

Exemplo:

```text
app/
└── bookings/
    └── page.tsx
```

representa a rota:

```text
/bookings
```

---

# ⚛️ React

O React é responsável pela construção da interface.

A aplicação é dividida em componentes reutilizáveis, como:

- `Header`
- `Footer`
- `ServiceItem`
- `ServiceCart`
- `BookingItem`
- `ReviewForm`
- `BarberSchedule`
- `CreateBookingButton`
- `BookingStatusButton`

Essa abordagem evita colocar toda a interface em um único arquivo e facilita manutenção e reutilização.

---

# 🔷 TypeScript

O projeto utiliza TypeScript para adicionar tipagem ao JavaScript.

Isso ajuda a trabalhar com estruturas como:

```text
User
Booking
Service
Barbershop
BookingItem
Review
Debt
Payment
```

A tipagem ajuda a identificar erros durante o desenvolvimento e deixa o código mais previsível.

---

# 🖥️ Server Components

Server Components executam no servidor.

No projeto, eles podem:

- Consultar o banco diretamente.
- Buscar dados com Prisma.
- Renderizar informações antes de enviar ao navegador.
- Reduzir lógica desnecessária no cliente.

Fluxo:

```text
Página
     ↓
Server Component
     ↓
Prisma
     ↓
PostgreSQL
```

---

# 💻 Client Components

Quando um componente precisa de interatividade no navegador, utiliza:

```tsx
"use client";
```

São utilizados para funcionalidades como:

- `useState`
- `useEffect`
- Eventos de clique.
- Calendário.
- Carrinho de serviços.
- Modais.
- LocalStorage.
- APIs do navegador.
- Notificações.

Exemplo:

```tsx
"use client";

import { useState } from "react";

const [loading, setLoading] = useState(false);
```

---

# 🧠 React Hooks

## useState

Utilizado para controlar estado local.

Exemplos no projeto:

```text
loading
selectedServiceIds
selectedDate
selectedTime
clientType
modal
```

Fluxo:

```text
Estado inicial
     ↓
Usuário interage
     ↓
setState()
     ↓
React atualiza a interface
```

---

## useEffect

Utilizado quando o componente precisa sincronizar com algo externo ao ciclo normal de renderização.

Pode ser usado para:

- APIs do navegador.
- Notificações.
- Service Worker.
- LocalStorage.
- Eventos externos.
- Carregamento de informações.

---

# 🧩 Context API

O projeto utiliza Context API para compartilhar o estado do carrinho de serviços.

Exemplo conceitual:

```text
ServiceCartProvider
       │
       ├── Serviço A
       ├── Serviço B
       └── Serviço C
```

Assim diferentes componentes conseguem acessar os serviços selecionados sem precisar passar propriedades manualmente por vários níveis.

---

# ⚡ Server Actions

Server Actions permitem executar funções diretamente no servidor.

Um exemplo do fluxo de agendamento:

```text
Cliente
   ↓
Formulário
   ↓
Server Action
   ↓
Validar usuário
   ↓
Validar data
   ↓
Validar horário
   ↓
Verificar disponibilidade
   ↓
Calcular desconto
   ↓
Calcular total
   ↓
Prisma
   ↓
PostgreSQL
```

Uma vantagem importante é manter regras críticas no servidor.

---

# 🌐 Route Handlers

Route Handlers são endpoints HTTP dentro do Next.js.

Exemplos existentes no projeto:

```text
app/api/auth/[...nextauth]/route.ts
app/api/push/subscribe/route.ts
app/api/push/test/route.ts
```

Eles podem trabalhar com métodos HTTP como:

```text
GET
POST
PUT
DELETE
```

### Server Action x Route Handler

**Server Action**

```text
Ação interna da aplicação
```

**Route Handler**

```text
Endpoint HTTP
```

Os dois podem executar lógica no servidor, mas possuem finalidades diferentes.

---

# 🗄️ Prisma ORM

O Prisma é o ORM utilizado para comunicação com PostgreSQL.

Em vez de escrever diretamente todas as consultas SQL, a aplicação trabalha com modelos TypeScript.

Exemplo conceitual:

```prisma
model Service {
  id    String
  name  String
  price Decimal
}
```

A aplicação pode consultar esses dados através do Prisma.

---

# 🐘 PostgreSQL

O PostgreSQL é o banco de dados relacional da aplicação.

Ele armazena informações como:

- Usuários.
- Contas de autenticação.
- Sessões.
- Barbearia.
- Serviços.
- Agendamentos.
- Itens do agendamento.
- Avaliações.
- Dívidas.
- Pagamentos.
- Agenda.
- Horários fixos.
- Exceções.

---

# ☁️ Neon

O PostgreSQL utilizado em produção é hospedado no **Neon**.

Arquitetura:

```text
Vercel
   │
   │ DATABASE_URL
   ▼
Neon
   │
   ▼
PostgreSQL
```

---

# 🔐 Autenticação

A autenticação utiliza:

- NextAuth.
- Google OAuth.
- Prisma Adapter.
- PostgreSQL.
- Sessões JWT.
- Roles.

Fluxo:

```text
Cliente
   ↓
Login com Google
   ↓
Google OAuth
   ↓
NextAuth
   ↓
Prisma Adapter
   ↓
PostgreSQL
   ↓
Sessão
```

---

# 👥 Controle de acesso

O sistema trabalha com dois papéis:

```text
CUSTOMER
BARBER
```

## CUSTOMER

Pode:

- Acessar a área do cliente.
- Escolher serviços.
- Criar agendamentos.
- Consultar seus agendamentos.
- Visualizar detalhes.
- Receber notificações.
- Avaliar atendimentos concluídos.

## BARBER

Pode:

- Acessar o dashboard.
- Gerenciar agendamentos.
- Confirmar atendimentos.
- Concluir atendimentos.
- Criar agendamentos manualmente.
- Gerenciar agenda.
- Gerenciar horários.
- Gerenciar serviços.
- Gerenciar dívidas.
- Registrar pagamentos.
- Consultar informações financeiras.

---

# 📅 Sistema de agendamento

O agendamento permite selecionar:

```text
Barbearia
    ↓
Serviços
    ↓
Carrinho
    ↓
Data
    ↓
Horário
    ↓
Confirmação
```

O servidor valida novamente os dados antes de salvar.

---

# 🛒 Múltiplos serviços

Um único agendamento pode possuir vários serviços.

Exemplo:

```text
Corte de Cabelo
+
Barba
+
Pézinho
```

O relacionamento é representado por `BookingItem`.

Conceitualmente:

```text
Booking
   │
   ├── BookingItem → Corte
   ├── BookingItem → Barba
   └── BookingItem → Pézinho
```

Isso permite calcular o subtotal, desconto e total do atendimento.

---

# 💰 Descontos

As regras de desconto ficam isoladas na lógica de negócio.

Exemplos:

```text
Corte + Barba
→ desconto de R$ 10,00

Barba + Pézinho
→ desconto de R$ 5,00
```

O desconto deve ser calculado no servidor.

Isso evita que o navegador seja a única fonte da regra financeira.

---

# 💵 Valores dos serviços

Serviços cadastrados no projeto:

| Serviço | Valor |

O projeto também possui uma regra específica para **corte infantil**, em que o valor do corte pode ser tratado como **R$ 30,00**, sem necessariamente criar um novo serviço visual. E valores com possibilidade de alteração pelo dashboard do Barbeiro

---

# 🗓️ Controle de disponibilidade

A disponibilidade considera diferentes regras:

```text
Dia da semana
      +
Horários comerciais
      +
Horários configurados
      +
Agendamentos existentes
      +
Horários fixos
      +
Exceções
      =
Horários disponíveis
```

O objetivo é impedir conflitos de agenda.

---

# 📆 Agenda comercial

A configuração de agenda utiliza:

```text
BusinessDay
BusinessTimeSlot
```

A regra inicial considera:

```text
Domingo → fechado
Segunda → fechado

Terça → aberto
Quarta → aberto
Quinta → aberto
Sexta → aberto
Sábado → aberto
```

Os horários individuais também podem ser ativados ou bloqueados.

---

# 👤 Horários fixos

O sistema possui clientes com horários recorrentes.

Exemplo conceitual:

```text
Cliente
   ↓
Dia da semana
   ↓
Horário fixo
```

Esses horários são considerados durante a geração dos horários disponíveis.

---

# 🔓 Exceções da agenda

`FixedScheduleException` permite modificar uma regra fixa em uma data específica.

Isso possibilita situações como:

- Liberar um horário.
- Bloquear excepcionalmente.
- Alterar uma reserva recorrente.
- Tratar uma situação específica sem alterar a regra permanente.

---

# 📊 Status do agendamento

O fluxo de atendimento utiliza estados.

Exemplo:

```text
PENDING
   ↓
CONFIRMED
   ↓
COMPLETED
```

O barbeiro consegue atualizar o status pelo dashboard.

Quando o atendimento é concluído, o sistema pode liberar funcionalidades relacionadas ao pós-atendimento, como avaliação.

---

# ⭐ Avaliações

A avaliação é vinculada ao atendimento.

Regra:

```text
Agendamento
      ↓
Atendimento concluído
      ↓
Cliente pode avaliar
```

O cliente não deve avaliar um atendimento que ainda não foi concluído.

Também existe controle para evitar avaliações duplicadas.

---

# 💳 Financeiro

O sistema possui recursos relacionados ao controle financeiro do atendimento.

São considerados:

- Valor do serviço.
- Subtotal.
- Desconto.
- Total.
- Pagamento.
- Dívida.
- Status do pagamento.

Esses dados alimentam o dashboard administrativo.

---

# 📒 Fiado

O sistema possui suporte a atendimentos realizados sem pagamento imediato.

Fluxo:

```text
Atendimento
    ↓
Não pago
    ↓
Fiado em aberto
    ↓
Pagamento posterior
    ↓
Fiado quitado
```

O valor em aberto não deve ser tratado da mesma forma que dinheiro efetivamente recebido.

---

# 💰 Pagamentos

O pagamento pode ser registrado posteriormente.

Fluxo:

```text
Fiado
   ↓
Registrar pagamento
   ↓
Atualizar dívida
   ↓
Valor passa a representar recebimento
```

A lógica financeira deve preservar o histórico do atendimento.

---

# 📈 Dashboard do barbeiro

A área administrativa fica em:

```text
/barbeiro/dashboard
```

Entre os recursos estão:

- Agenda.
- Agendamentos.
- Status.
- Criação manual.
- Edição de agendamento.
- Exclusão conforme regras.
- Serviços.
- Dívidas.
- Pagamentos.
- Resumo financeiro.
- Configuração de agenda.

---

# 👨‍💼 Agendamento manual pelo barbeiro

O barbeiro pode criar um atendimento diretamente pelo dashboard.

Pode trabalhar com:

```text
Cliente cadastrado
```

ou:

```text
Cliente manual
```

Também pode selecionar múltiplos serviços e aplicar as regras de desconto.

A criação manual deve passar pelas mesmas validações de disponibilidade e regras de negócio.

---

# 📱 PWA

O projeto possui características de **Progressive Web App**.

Isso permite que a aplicação seja instalada no dispositivo.

O PWA utiliza:

```text
manifest.json
+
service worker
+
ícones
+
configurações da aplicação
```

---

# 📲 Manifest

O `manifest.json` define informações como:

- Nome da aplicação.
- Nome curto.
- Ícones.
- Aparência.
- Modo de exibição.

A aplicação utiliza a identidade:

```text
SpaçoVip Barbearia
```

---

# ⚙️ Service Worker

O Service Worker funciona em segundo plano no navegador.

Ele pode participar de:

- Recursos PWA.
- Cache.
- Eventos de Push.
- Exibição de notificações.

Arquivo:

```text
public/sw.js
```

---

# 🔔 Web Push

O sistema possui infraestrutura para notificações.

Fluxo conceitual:

```text
Cliente realiza ação
       ↓
Servidor
       ↓
Web Push
       ↓
Service Worker
       ↓
Celular / Navegador
       ↓
Notificação
```

Exemplos de eventos:

```text
Cliente agenda
      ↓
Barbeiro recebe notificação

Barbeiro confirma
      ↓
Cliente recebe notificação

Barbeiro conclui
      ↓
Cliente recebe notificação
```

---

# 🔑 VAPID

VAPID é utilizado para autenticar o servidor nas notificações Web Push.

O projeto utiliza:

```text
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

Essas informações devem permanecer protegidas.

---

# 🌐 APIs de Push

Existem endpoints relacionados às notificações:

```text
/api/push/subscribe
/api/push/test
```

O primeiro é utilizado para registrar a subscription do navegador.

O segundo permite testar o sistema de notificações.

---

# 🎨 Interface

A interface utiliza:

- Tailwind CSS.
- Componentes reutilizáveis.
- Lucide.
- Layout responsivo.

O projeto foi pensado para funcionar em:

```text
📱 Celular
💻 Desktop
📲 Tablet
```

---

# 🧱 Componentização

A interface é dividida em componentes.

Exemplos:

```text
Header
Footer
ServiceItem
ServiceCart
BookingItem
ReviewForm
BarberSchedule
CreateBookingButton
BookingStatusButton
```

Isso facilita:

- Reutilização.
- Manutenção.
- Testes.
- Organização.
- Evolução do projeto.

---

# 🔄 Fluxo completo do cliente

```text
┌───────────────┐
│    Cliente    │
└───────┬───────┘
        ↓
┌───────────────┐
│ Login Google  │
└───────┬───────┘
        ↓
┌───────────────┐
│ Escolhe       │
│ serviços      │
└───────┬───────┘
        ↓
┌───────────────┐
│ Carrinho      │
└───────┬───────┘
        ↓
┌───────────────┐
│ Data + hora   │
└───────┬───────┘
        ↓
┌───────────────┐
│ Validações    │
└───────┬───────┘
        ↓
┌───────────────┐
│ Desconto      │
│ + total       │
└───────┬───────┘
        ↓
┌───────────────┐
│ PostgreSQL    │
└───────┬───────┘
        ↓
┌───────────────┐
│ Agendamento   │
│ criado        │
└───────────────┘
```

---

# 🔄 Fluxo completo do barbeiro

```text
Agendamento criado
        ↓
Barbeiro visualiza
        ↓
Confirma
        ↓
Atendimento acontece
        ↓
Conclui atendimento
        ↓
Financeiro / pagamento
        ↓
Cliente pode avaliar
```

---

# 🔄 Fluxo técnico completo

```text
React
  ↓
Next.js
  ↓
Server Action
  ↓
Validação
  ↓
Regra de negócio
  ↓
Prisma
  ↓
PostgreSQL
  ↓
Resultado
  ↓
Interface
```

---

# 🔐 Segurança e variáveis de ambiente

Informações sensíveis ficam no `.env`.

Exemplos:

```env
DATABASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

Esses valores não devem ser publicados no GitHub.

---

# 📦 package.json

O `package.json` contém as dependências e scripts do projeto.

Principais comandos:

```bash
npm install
```

Executar em desenvolvimento:

```bash
npm run dev
```

Gerar build:

```bash
npm run build
```

Executar a aplicação em produção:

```bash
npm run start
```

---

# 🗃️ Prisma

Para trabalhar com o banco:

```bash
npx prisma generate
```

Executar migrações em desenvolvimento:

```bash
npx prisma migrate dev
```

O projeto utiliza migrations para registrar a evolução do banco.

Exemplos:

```text
init_db
auth_tables
fixed_schedules
user_role
booking_status
customer_debt
reviews
business_schedule
```

---

# 🌱 Seed

O arquivo:

```text
prisma/seed.ts
```

é responsável por dados iniciais do sistema.

Entre eles:

- Barbearia.
- Serviços.
- Configurações iniciais.
- Horários.
- Dados necessários para iniciar o projeto.

---

---

# ☁️ Deploy com Vercel

O projeto utiliza Vercel para hospedagem.

Fluxo:

```text
GitHub
   ↓
Push
   ↓
Vercel
   ↓
Build Next.js
   ↓
Deploy
   ↓
Aplicação online
```

Aplicação:

```text
https://fsw-barber-gamma.vercel.app
```

---

# 🧪 Build

Antes de realizar o deploy, é importante validar a compilação:

```bash
npm run build
```

Isso permite identificar problemas de:

- TypeScript.
- Imports.
- Componentes.
- Server/Client Components.
- Prisma.
- Rotas.
- Build do Next.js.

---

# 🧠 Regras de negócio principais

O projeto possui regras além de um simples CRUD.

### Disponibilidade

```text
Horário comercial
+
Slots ativos
+
Agendamentos
+
Horários fixos
+
Exceções
```

### Desconto

O servidor calcula descontos conforme os serviços selecionados.

### Múltiplos serviços

Um agendamento pode conter vários serviços.

### Status

O atendimento possui fluxo controlado.

### Avaliação

Só pode acontecer após conclusão do atendimento.

### Fiado

Pagamento pendente é separado do valor efetivamente recebido.

### Autorização

Cliente e barbeiro possuem permissões diferentes.

---

# 🧩 Por que o projeto não é apenas CRUD?

Embora existam operações de criação, leitura, atualização e exclusão, o sistema também possui regras de negócio.

Exemplos:

```text
Autenticação
+
Autorização
+
Disponibilidade
+
Horários fixos
+
Exceções
+
Múltiplos serviços
+
Descontos
+
Pagamentos
+
Fiado
+
Avaliações
+
PWA
+
Push Notifications
```

Isso torna o projeto uma aplicação de negócio com diferentes fluxos e responsabilidades.

---

# 📚 Principais conceitos demonstrados

Este projeto demonstra conhecimentos em:

- Desenvolvimento Full Stack.
- Next.js.
- React.
- TypeScript.
- Server Components.
- Client Components.
- Server Actions.
- Route Handlers.
- React Hooks.
- Context API.
- Prisma ORM.
- PostgreSQL.
- Banco relacional.
- Autenticação OAuth.
- NextAuth.
- Controle de acesso por perfil.
- APIs.
- PWA.
- Service Worker.
- Web Push.
- VAPID.
- Tailwind CSS.
- Componentização.
- Responsividade.
- Git.
- GitHub.
- Deploy na Vercel.
- Regras de negócio.
- Controle financeiro.
- Agenda e disponibilidade.


```
 📌 RESUMO

O SpaçoVip Barbearia reúne em um único projeto conceitos de desenvolvimento Web Full Stack:

                 SPAÇOVIP
                    │
        ┌───────────┴───────────┐
        │                       │
     CLIENTE                 BARBEIRO
        │                       │
        ▼                       ▼
    Agendar                 Dashboard
    Serviços                Agenda
    Carrinho                Clientes
    Avaliação               Pagamentos
    Notificações            Fiado
        │                    Serviços
        └───────────┬───────────┘
                    │
                    ▼
                 NEXT.JS
                    │
        ┌───────────┴───────────┐
        │                       │
      REACT                  SERVER
        │                       │
        │                 Server Actions
        │                 Route Handlers
        │                       │
        └───────────┬───────────┘
                    │
                  PRISMA
                    │
                    ▼
              POSTGRESQL
                    │
                    ▼
                  NEON
```

O projeto demonstra integração entre **frontend, backend, banco de dados, autenticação, regras de negócio, notificações, PWA, controle financeiro e deploy**, formando uma aplicação completa para um cenário real de negócio.

---

# 👨‍💻 Desenvolvedor

**Leandro Pinheiro dos Santos**

Projeto desenvolvido como aplicação prática de desenvolvimento Full Stack, reunindo conhecimentos de desenvolvimento Web, banco de dados, autenticação, APIs, PWA, notificações, regras de negócio e deploy.

```
