
# TopBus Transportes - Sistema de Gestão Inteligente de Frotas

TopBus Transportes é uma aplicação web completa, desenvolvida para a gestão e otimização de frotas de transporte público. O sistema integra a coleta de dados operacionais em tempo real com um poderoso painel de Business Intelligence (BI) e módulos de Inteligência Artificial para fornecer insights acionáveis, automação de vistorias e suporte estratégico à diretoria.

## Funcionalidades Principais

O sistema é dividido em dois ecossistemas principais: os **Módulos para Operadores** (formulários de coleta de dados) e o **Painel de Gestão** (análise e administração).

---

### 1. Módulos para Operadores (Acesso Público)

Estas são as interfaces utilizadas pelos colaboradores em campo para registrar as atividades diárias. O design é simples e otimizado para dispositivos móveis.

#### a. Registro de KM e Vistoria
- **Propósito:** Unifica o início da jornada do motorista em um único fluxo.
- **Funcionalidades:**
  - Identificação do motorista, veículo e linha.
  - **OCR (Reconhecimento Óptico de Caracteres):** O motorista tira uma foto do hodômetro e a IA extrai e preenche o valor do KM inicial automaticamente.
  - **Checklist de Vistoria:** Um formulário de vistoria completo (itens externos, internos, segurança, etc.) onde o motorista reporta o estado do veículo.
  - **Registro Fotográfico:** Captura de fotos das quatro diagonais do veículo.
  - **Assinatura Digital:** O motorista assina digitalmente, confirmando a veracidade das informações.
- **Lógica de Fundo:** Ao submeter, o sistema salva um registro de viagem como "Em Andamento" e aciona a análise de danos do Vigia Digital.

#### b. Finalizar Viagem
- **Propósito:** Registrar o término da jornada.
- **Funcionalidades:**
  - O motorista informa a chapa, e o sistema busca a viagem "Em Andamento" correspondente.
  - Preenchimento do KM final e captura da foto do hodômetro final.
- **Lógica de Fundo:** O sistema atualiza o status da viagem para "Finalizado".

#### c. Registro de Abastecimento
- **Propósito:** Registrar os abastecimentos realizados na garagem.
- **Funcionalidades:**
  - Identificação do abastecedor e do veículo.
  - O sistema busca o último KM registrado para o veículo para pré-preencher o campo de hodômetro.
  - Registro da bomba utilizada e da quantidade de litros.

---

### 2. Painel de Gestão (Acesso Restrito)

O coração analítico do sistema. Acessível apenas por usuários autorizados, com diferentes níveis de permissão.

#### a. Painel BI (Dashboard Principal)
- **Propósito:** Fornecer uma visão geral e em tempo real da performance da frota.
- **Funcionalidades:**
  - **Filtro de Período:** Análise por semana, mês ou períodos personalizados.
  - **KPIs Principais:** Custo estimado com combustível, consumo médio (KM/L), preço do diesel, KM total rodado e alertas de pendências.
  - **Gráficos Interativos:**
    - **Desempenho Geral:** Gráfico de linha mostrando a evolução dos quilômetros rodados ao longo do tempo.
    - **Top 10 Veículos:** Gráfico de barras com os veículos que mais rodaram no período.

#### b. Módulos de Inteligência Artificial

##### i. Análise Preditiva e Cruzamento de Dados (Relatórios de Frota)
- **Propósito:** A IA analisa os dados brutos e gera relatórios executivos.
- **Funcionalidades:** A IA gera um relatório com:
  - **Resumo Executivo:** Principais métricas consolidadas.
  - **Análise de Anomalias:** Identifica motoristas, carros e rotas com consumo de combustível acima do normal ou performance abaixo da média.
  - **Recomendações:** Sugere ações práticas para otimização de custos e eficiência.

##### ii. Análise de Documentos (OCR)
- **Propósito:** Extrair insights de documentos não estruturados (planilhas, PDFs, imagens).
- **Funcionalidades:**
  - O gestor faz o upload de um arquivo (ex: planilha de atestados, relatório de manutenção) e define o contexto (ex: "Análise de Atestados Médicos").
  - A IA analisa o conteúdo, identifica padrões, anomalias, e gera um relatório completo com descobertas e recomendações.

##### iii. Assistente de Apresentação (Exclusivo para Diretoria)
- **Propósito:** Ferramenta estratégica para a alta gestão.
- **Funcionalidades:**
  - **Repositório de Contexto:** A diretoria pode colar textos, links, ou fazer upload de arquivos de apoio.
  - **Geração de Resumo:** Com um clique, a IA consolida todas as informações em um formato pronto para apresentação, contendo título, resumo executivo, pontos de discussão e próximos passos.

#### c. Vigia Digital (Exclusivo para Diretoria)
- **Propósito:** Automatizar a detecção de danos e a responsabilização entre turnos.
- **Lógica:** A cada nova vistoria, a IA compara as fotos do veículo com as da vistoria anterior do mesmo carro.
- **Painel de Alertas:**
  - **Alertas Pendentes:** Exibe cards com novos danos detectados, priorizados por severidade (baixa, média, alta).
  - **Análise Detalhada:** O diretor pode clicar em um alerta para ver a comparação lado a lado das fotos ("antes e depois") e a descrição do dano feita pela IA.
  - **Ação do Gestor:** O diretor deve marcar o alerta como "ciente" para movê-lo para o histórico, finalizando o ciclo de análise.

#### d. Gerenciamento de Registros
- **Páginas Dedicadas:** Telas para visualizar, filtrar e exportar (XLSX, PDF, TXT) todos os registros de KM, abastecimento e vistorias.
- **Edição e Exclusão:** Gestores podem editar ou apagar registros mediante autorização por senha.

#### e. Configurações e Importação
- **Propósito:** Alimentar o sistema com dados de base.
- **Funcionalidades:**
  - **Preço do Diesel:** Cadastro do valor do combustível, com histórico.
  - **Importação de Dados:** Upload de planilhas (XLSX, CSV) para importar em massa:
    - **Parâmetros de Veículos:** Metas de consumo (verde, amarela, dourada) e capacidade do tanque.
    - **Dados de Abastecimento Históricos.**
    - **Registros de Manutenção.**

---

### 3. Acesso ao Painel de Gestão

O acesso ao painel de gestão é protegido por uma senha única.

- **Senha:** `topbus2025`

---

### 4. Tecnologias Utilizadas

- **Frontend:** Next.js, React, TypeScript
- **Estilização:** Tailwind CSS, ShadCN UI
- **Inteligência Artificial:** Google Gemini Pro via Genkit
- **Backend e Banco de Dados:** Firebase (Firestore, Storage)
- **Hospedagem:** Firebase App Hosting
