# Documento Técnico — App Local de Preços de Mercado (Versão 2.0 Revisada)

## 1. Visão Geral

Desenvolver um aplicativo móvel pessoal, **100% offline**, focado no registro rápido de preços de produtos em supermercados e atacarejos por leitura de código de barras.

O aplicativo opera sem servidor, sem login, sem contas de usuário, sem rastreamento e sem dependência de internet. Todos os dados são armazenados exclusivamente no dispositivo.

A experiência principal é desenhada para a **operação rápida com uma única mão no corredor do supermercado**:
1. O usuário abre o app em uma **tela dedicada de seleção de mercado** (com sugestão automática via GPS e confirmação explícita).
2. Na tela de scanner, a leitura do código de barras emite um **feedback háptico (vibração)** imediato.
3. Se o produto já existir, o preço é inserido em um **keypad numérico nativo na própria tela** no estilo **caixa eletrônico / maquininha de cartão** (centavos contínuos), com botão grande verde **"SALVAR PREÇO"** ao alcance do polegar.
4. Ao salvar, a câmera permanece **pausada** para economizar bateria e evitar leituras indesejadas, exibindo o botão de destaque **"PRÓXIMO PRODUTO"** para reiniciar o ciclo.

---

## 2. Requisitos Não Funcionais

| Requisito | Especificação |
|---|---|
| **Plataforma alvo** | Android (APK gerado localmente em Flutter ou PWA instalável offline) |
| **Framework base** | Flutter (Dart) com opção de empacotamento PWA (Web App local) |
| **Banco de dados** | SQLite local (`sqflite` com versionamento e suporte a migrações) ou IndexedDB se PWA |
| **Custo de hospedagem** | **R$ 0,00** — Sem custo de servidor, banco em nuvem ou hospedagem paga (PWA roda via GitHub Pages/Cloudflare Pages gratuitos ou APK instalado diretamente) |
| **Internet** | **Zero dependência.** Totalmente funcional em modo avião ou sem sinal de operadora |
| **Autenticação / Login** | Não haverá |
| **Servidor / Backend** | Não haverá |
| **Conta de usuário** | Não haverá (uso estritamente pessoal, monoposto) |
| **Idioma** | Português do Brasil (pt-BR) |
| **Tema visual** | Claro, alto contraste, botões grandes e legíveis sob iluminação forte |
| **Orientação** | Retrato fixo (*portrait*) |
| **Ergonomia** | Otimizado para uso com uma mão (área de toque no terço inferior da tela) |

---

## 3. Pacotes e Tecnologias Recomendadas

### Opção A: Flutter Nativo (Android APK)
| Função | Pacote / Recurso | Detalhes |
|---|---|---|
| Scanner de código de barras | `mobile_scanner` | Leitura contínua rápida com pausa/retomada manual |
| Banco SQLite | `sqflite` | Inicializado na versão 1 com `onUpgrade` para migrações |
| Localização | `geolocator` | Sugestão de mercado por proximidade geográfica |
| Feedback háptico | `flutter/services.dart` | `HapticFeedback.lightImpact()` ao detectar código |
| Permissões | `permission_handler` | Câmera e Localização precisa/aproximada |
| Compartilhamento nativo | `share_plus` | Disparo da folha nativa do Android (WhatsApp, Drive, Gmail) |
| Planilha Excel | `excel` | Geração de arquivo `.xlsx` sem dependências externas |
| Formatação de moeda/data | `intl` | Moeda BRL (`R$ 0,00`) e datas ISO 8601 |
| Backup e JSON | `dart:convert` | Serialização e desserialização de snapshot |

### Opção B: PWA (Progressive Web App - Custo Zero)
* Funciona no Google Chrome do Android com opção *"Adicionar à tela inicial"*.
* Câmera via API nativa de hardware `BarcodeDetector` (ou ZXing / HTML5-QRCode).
* Armazenamento via `IndexedDB` com persistência garantida (`navigator.storage.persist()`).
* Compartilhamento via `navigator.share` nativo do Android.
* Hospedagem 100% gratuita em GitHub Pages ou Cloudflare Pages (arquivos estáticos, sem servidor).

---

## 4. Arquitetura de Software

Camadas simples, previsíveis e de fácil manutenção:

```
lib/
├── main.dart
├── app.dart
├── core/
│   ├── constants/
│   ├── theme/
│   └── utils/ (formatters, cálculo de distância Haversine, haptics)
├── data/
│   ├── database/
│   │   ├── app_database.dart (versão 1, migrações no onUpgrade)
│   │   └── migrations/
│   ├── repositories/
│   │   ├── market_repository.dart
│   │   ├── product_repository.dart
│   │   └── price_repository.dart
│   └── services/
│       ├── scanner_service.dart
│       ├── location_service.dart
│       └── export_service.dart
├── domain/
│   └── models/
│       ├── market.dart
│       ├── product.dart
│       └── price.dart
├── presentation/
│   ├── initial_market/ (tela dedicada de seleção inicial com GPS)
│   ├── scanner/ (tela principal com câmera, keypad nativo e salvar)
│   ├── markets/ (listagem, cadastro e edição de mercados)
│   ├── products/ (listagem, histórico e busca)
│   ├── export/ (geração de Excel e backup JSON)
│   └── settings/
└── widgets/ (keypad numérico nativo, chip selector, dialogs)
```

**Diretrizes de Manutenção:**
* Gerência de estado via `ChangeNotifier + Provider` (simples, oficial e sem boilerplate excessivo).
* Repositórios isolam todas as queries SQL. A interface nunca executa SQL diretamente.
* O banco de dados inicia na `version: 1`. Qualquer campo novo no futuro será incluído via `ALTER TABLE` no método `onUpgrade`.

---

## 5. Modelo de Dados e Banco SQLite

### 5.1 Tabela `markets`
| Campo | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Identificador único |
| `name` | TEXT | NOT NULL UNIQUE | Nome do mercado (ex.: "Assaí Atacadista") |
| `address` | TEXT | NULL | Endereço ou referência |
| `latitude` | REAL | NULL | Latitude para cálculo de distância |
| `longitude` | REAL | NULL | Longitude para cálculo de distância |
| `notes` | TEXT | NULL | Observações opcionais |
| `created_at` | TEXT | NOT NULL | Data de cadastro (ISO 8601) |
| `updated_at` | TEXT | NOT NULL | Data da última alteração (ISO 8601) |

### 5.2 Tabela `products`
| Campo | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Identificador único |
| `barcode` | TEXT | NOT NULL UNIQUE | Código de barras padrão (EAN-13, EAN-8, UPC, etc.) |
| `name` | TEXT | NOT NULL | Nome do produto |
| `brand` | TEXT | NULL | Marca do produto |
| `unit` | TEXT | NULL | Unidade combinada (radiobutton `ml` ou `g` + valor numérico, ex.: `500 ml`, `1000 ml`, `250 g`, `1000 g`) |
| `notes` | TEXT | NULL | Observações |
| `created_at` | TEXT | NOT NULL | Data de cadastro (ISO 8601) |
| `updated_at` | TEXT | NOT NULL | Data de atualização (ISO 8601) |

> **Nota de Negócio:** Não há suporte para produtos de feira/açougue sem código de barras. O campo `barcode` é obrigatório e único.

### 5.3 Tabela `prices`
| Campo | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Identificador único |
| `product_id` | INTEGER | NOT NULL REFERENCES products(id) ON DELETE CASCADE | Chave estrangeira do produto |
| `market_id` | INTEGER | NOT NULL REFERENCES markets(id) ON DELETE CASCADE | Chave estrangeira do mercado |
| `price_cents` | INTEGER | NOT NULL | Preço único efetivo em centavos (ex.: R$ 7,99 = `799`) |
| `recorded_at` | TEXT | NOT NULL | Data e hora exata do registro pelo relógio do celular |
| `created_at` | TEXT | NOT NULL | Data de persistência |

> **Nota de Negócio:** Armazena um único preço simples (o valor efetivo a ser pago). Sem distinção de preço clube/atacado.

### 5.4 Índices e Versionamento
```sql
PRAGMA foreign_keys = ON;

CREATE UNIQUE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_prices_product_id ON prices(product_id);
CREATE INDEX idx_prices_market_id ON prices(market_id);
CREATE INDEX idx_prices_recorded_at ON prices(recorded_at);
```

**Política de Migração (`onUpgrade`):**
```dart
onUpgrade: (db, oldVersion, newVersion) async {
  if (oldVersion < 2) {
    // Exemplo para futuras versões:
    // await db.execute("ALTER TABLE products ADD COLUMN category TEXT NULL;");
  }
}
```

---

## 6. Fluxos de Interface e Experiência do Usuário

### 6.1 Tela de Abertura: Seleção Inicial de Mercado
Ao iniciar o aplicativo, o usuário é apresentado a uma **tela dedicada de confirmação de mercado**:
1. O app consulta a localização GPS atual em segundo plano (se permissão concedida).
2. Calcula a distância euclidiana/Haversine até todos os mercados cadastrados.
3. Se houver um mercado a menos do raio configurado (ex.: < 1 km), exibe em destaque:
   * *"Você está no **[Nome do Mercado]**? (~120 m)"*
   * Botão grande verde: **"CONFIRMAR E ENTRAR NO SCANNER"**.
4. Se o GPS estiver desligado ou não houver mercado próximo:
   * Sugere o **último mercado utilizado** na sessão anterior.
   * Apresenta botão para selecionar outro mercado da lista ou botão **"+ Cadastrar Novo Mercado"**.
5. O usuário somente entra na tela do Scanner após confirmar o mercado.

---

### 6.2 Tela Principal do Scanner
Composta por:
* **Barra Superior (Cabeçalho):**
  * Nome do mercado selecionado + distância.
  * Botão de **1 toque para trocar de mercado** (abre seletor rápido sem reiniciar o app).
  * Botão discreto de menu (acesso a Produtos, Mercados, Exportação, Configurações).
* **Área Central (Câmera):**
  * Visor da câmera com guia retangular para o código de barras.
  * Botão flutuante para **Lanterna** (essencial para corredores escuros).
  * Botão para **"Digitar código"** manualmente se o código estiver rasgado/danificado.
* **Área Inferior (Controle e Ação):**
  * Painel dinâmico que reage ao estado do scanner.

---

### 6.3 Estados do Scanner e Entrada de Preço

#### Estado 1: `WAITING_SCAN` (Aguardando Leitura)
* Câmera ativa.
* Mensagem de orientação: *"Aponte para o código de barras"*.

#### Estado 2: `PRODUCT_FOUND` (Produto Identificado)
* **Feedback Imediato:** Disparo de vibração háptica curta (`HapticFeedback.lightImpact()`).
* Câmera **pausa imediatamente** a captura de frames.
* Exibição do card do produto:
  * Nome do produto em destaque.
  * Marca e Unidade.
  * Código de barras.
  * Menor preço histórico registrado e quando foi (para consulta rápida).
* **Entrada de Preço tipo Caixa Eletrônico / Maquininha:**
  * O cursor já nasce ativo no campo de preço, exibindo inicialmente `R$ 0,00`.
  * **Keypad Numérico Nativo na Tela (Botões grandes 0 a 9, Backspace e Limpar):**
    * Digitando `7`  -> `R$ 0,07`
    * Digitando `9`  -> `R$ 0,79`
    * Digitando `9`  -> `R$ 7,99`
    * Digitando `0`  -> `R$ 79,90`
  * Botão grande verde **"SALVAR PREÇO"** posicionado na base direita do keypad (ao alcance do polegar).
  * Botão secundário de **"Cancelar / Descartar"**.

#### Estado 3: `NEW_PRODUCT` (Produto Inédito)
* Disparo de vibração háptica.
* Câmera pausada.
* Exibição de formulário inline na parte inferior:
  * **Código de barras:** preenchido automaticamente (somente leitura).
  * **Nome do produto:** obrigatório.
  * **Marca:** opcional, com **autocomplete inteligente** baseado nas marcas já existentes no banco de dados.
  * **Unidade e Volume/Peso:**
    * **Radiobutton de Tipo:** `[ ml ]` (Mililitros - líquidos) ou `[ g ]` (Gramas - sólidos).
    * **Campo Numérico para o Valor:** Entrada numérica direta (sem botões pré-definidos).
    * Formata automaticamente o texto final gravado (ex.: `500 ml`, `1000 ml`, `250 g`, `1000 g`).
  * Botão **"Salvar e Digitar Preço"**.
  * Transiciona imediatamente para o Keypad de preço.

#### Estado 4: `PRICE_SAVED` (Preço Registrado e Histórico Comparativo)
* O preço é salvo no SQLite/Storage: `product_id`, `market_id`, `price_cents`, `recorded_at`.
* A câmera é **completamente desligada no hardware** (`track.stop()`) para economizar bateria e eliminar luzes de aviso.
* **Banner de Sucesso Superior:**
  * Ícone verde com *"Preço salvo com sucesso: R$ X,XX"* e nome do produto.
* **Área Central: Histórico Comparativo do Produto:**
  * Cabeçalho com contador `HISTÓRICO (X)` e abas de ordenação: **`[ Menor Preço ]`** e **`[ Mais Recente ]`**.
  * A ordenação inicial respeita a preferência configurada na tela de **Ajustes** (`defaultPriceSort: 'lowest' | 'recent'`).
  * Lista de registros com mercado, data/hora formatada (`DD/MM/AAAA às HH:mm`), valor em destaque e realce visual (borda verde) no menor preço histórico.
  * Botão de lixeira em cada registro, sempre com **modal de confirmação antes de excluir**.
* **Base Fixa com Botão de Ação Primária:**
  * **Texto:** `"PRÓXIMO PRODUTO"`
  * **Dimensões:** Altura de destaque (60-64 dp), alta visibilidade em verde esmeralda.
  * **Ação do botão:** Limpa os dados do produto atual e **religa a câmera limpa e fresca**, retornando ao estado `WAITING_SCAN`.

---

## 7. Telas Secundárias (Acessíveis pelo Menu)

### 7.1 Mercados
* Lista de mercados com contador de preços registrados.
* Ordenação por proximidade (distância) ou nome alfabético.
* Cadastro, edição e exclusão de mercados (com aviso caso haja preços associados).

### 7.2 Produtos e Histórico de Preços
* Lista geral de produtos cadastrados com busca por nome, marca ou código de barras.
* **Tela de Detalhes do Produto:**
  * Menor preço já registrado, em qual mercado e qual data.
  * Lista histórica de todas as coletas ordenadas por menor preço ou por data mais recente.
  * Opção de excluir um registro de preço incorreto.

### 7.3 Exportação e Backup
* **Exportar para Planilha Excel (`.xlsx`):**
  * Gera o arquivo com nome padronizado `precos_mercados_AAAA-MM-DD.xlsx`.
  * **Aba 1 - Mercados:** `ID, Nome, Endereço, Latitude, Longitude, Data Cadastro`.
  * **Aba 2 - Produtos:** `ID, Código de Barras, Nome, Marca, Unidade, Data Cadastro`.
  * **Aba 3 - Preços:** `ID, Produto, Código de Barras, Mercado, Preço (numérico com 2 casas decimais), Data/Hora`.
  * *(Sem aba de resumo de economia, conforme especificado).*
  * Dispara imediatamente o compartilhador nativo do Android (`share_plus` ou `navigator.share`) para envio via WhatsApp, Google Drive, E-mail, etc.
* **Backup JSON:**
  * **Exportar backup:** Snapshot completo do banco em formato JSON.
  * **Restaurar backup:** Opção de substituir todos os dados ou mesclar sem duplicar.

### 7.4 Configurações
* Raio padrão para sugestão de mercado (500m, 1km, 2km, 5km, sem limite).
* Formato de distância exibido (metros ou km).
* Botão de segurança: *"Limpar todos os dados"* (com diálogo de confirmação dupla).

---

## 8. Ciclo de Vida e Resiliência no Celular

* Se a tela do aparelho apagar por inatividade ou o usuário alternar para o WhatsApp e voltar:
  * A sessão do scanner **permanece no mesmo estado** (o mercado selecionado não se perde).
  * Se estava com um produto aberto e preço sendo digitado, os valores continuam nos campos.
  * A câmera só reativa os sensores se o estado for `WAITING_SCAN`, evitando consumo de bateria em segundo plano.

---

## 9. Critérios de Aceitação

1. O app roda 100% desconectado da internet.
2. Na abertura, exibe a tela dedicada para confirmar o mercado antes do scanner.
3. Leitura de código de barras emite vibração física háptica no aparelho.
4. Entrada de preço utiliza keypad nativo estilo caixa eletrônico (centavos contínuos).
5. O botão "SALVAR PREÇO" pode ser acionado com o polegar no terço inferior da tela.
6. A câmera pausa imediatamente após a leitura e permanece pausada após salvar o preço.
7. Apenas o toque no botão `"PRÓXIMO PRODUTO"` reativa a câmera.
8. Novos produtos contam com autocomplete de marca e chips de unidade (`[un]`, `[kg]`, etc. + campo manual).
9. Banco SQLite configurado com `version: 1` e suporte a migrações em `onUpgrade`.
10. Exportação para Excel gera as 3 abas principais (`Mercados`, `Produtos`, `Precos`) e abre o menu nativo de compartilhamento.
11. Custo total de hospedagem e manutenção: **zero**.
