# _archive_tests

Scripts de teste manual, depuração e exploração pontual (one-off) que **não** fazem parte
da suíte automatizada (`test/` para e2e, `*.spec.ts` em `src/` para unitários).

Mantidos apenas como referência histórica — nada aqui é executado por CI, build ou deploy.
Fora do escopo do `tsconfig.json` (`include: src/**/*`) e do Jest (`rootDir: src`).

- `root-scratch/` — arquivos que antes estavam soltos na raiz do repositório
  (experimentos do importador de planilhas por IA: Strufaldi, ambiguidade de colunas,
  detecção de cabeçalho, limpeza do `supplierMappingCache`, testes de OpenAI).

Pode apagar qualquer arquivo daqui sem impacto no sistema; o histórico fica no git.
