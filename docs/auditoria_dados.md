# Resultado da auditoria dos dados

**Escopo:** comparação das seis planilhas convertidas para XLSX com os registros do arquivo `public/data/usp.json`.

## Resultado

| Origem | Linhas na planilha | Linhas correspondentes no JSON | Soma de Total | Resultado |
|---|---:|---:|---:|---|
| T2.19 — Docentes | 1.530 | 1.530 | 5.482 | Correspondência exata |
| T2.20 — Servidores | 1.728 | 1.728 | 12.727 | Correspondência exata |
| T2.21 — Alunos | 1.350 | 1.350 | 102.054 | Correspondência exata |
| T2.03 — Graduação por ano/unidade | 282 | 282 | 357.132 | Correspondência exata |
| T2.10 — Docentes por regime/ano/unidade | 612 | 612 | 21.121 | Correspondência exata |
| T2.13 — Servidores por ano/unidade | 450 | 450 | 77.094 | Correspondência exata |

A comparação foi feita usando as dimensões da própria tabela (tipo de unidade, unidade, categoria, raça/cor, ano e regime, conforme aplicável) e os valores da coluna `Total`. Não foram encontradas divergências entre as linhas de origem e as linhas correspondentes no JSON.

## Verificações adicionais

- Os seis códigos raciais presentes nas tabelas demográficas foram mapeados; não houve código sem correspondência.
- A soma das seis categorias raciais corresponde ao total de cada população: alunos 102.054, docentes 5.482 e servidores 12.727.
- Em cada combinação de população e unidade, a soma por raça/cor coincide com o total da população daquela unidade.
- Para o gráfico de crescimento, existem 43 unidades de Ensino e Pesquisa comuns às três tabelas no período 2022–2025. A FMBRU tem base zero em 2022 nas três séries; sua variação percentual não é definida. Assim, o gráfico apresenta 42 unidades.

## Limitações que permanecem

1. A auditoria valida a correspondência entre as planilhas fornecidas e o JSON; ela não confirma que o Anuário publicado não tenha sido atualizado ou corrigido posteriormente.
2. A série histórica 1989–2025 foi transcrita visualmente de imagens, e não extraída das planilhas. Os valores precisam de conferência independente com a fonte oficial. Os dois primeiros valores da série de servidores não foram legíveis e permanecem ausentes.
3. A comparação por unidade é restrita ao período comum 2022–2025 e ao tipo `A - Ensino e Pesquisa`.

## Como reproduzir

Na raiz do projeto, execute `python scripts/auditar_dados.py` (requer `pandas` e `openpyxl`).
