# Fase 0 — resumo da implementação

## Entregue

- auditoria de código e produção;
- plano incremental e estratégia de rollback;
- migration aditiva para produto, varejista, oferta, observação e operação;
- referências opcionais em `gifts`;
- RLS e grants backend-only para dados técnicos;
- contratos tipados e adapter do autofill existente;
- normalização determinística por varejista;
- matching conservador sem similaridade por título;
- Edge Function central com autenticação, permissão e idempotência;
- primeira observação de preço por operação;
- projeção compatível em `gifts`;
- resolvedor de URL de compra e sincronização gradual do afiliado legado;
- flags independentes para rollout;
- backfill em lotes, dry-run, retomada e relatório;
- logs estruturados por `operation_id`;
- testes unitários para normalização, matching, adapter e URL de compra.

## Validações executadas

```bash
npm test
npx tsc -b --force
npm run build
git diff --check
```

Resultado: 62 testes aprovados, typecheck e build aprovados. O bundle da Edge
Function também foi validado com esbuild. A migration foi aplicada com sucesso
em um PostgreSQL local temporário e confirmou as cinco tabelas e as três
referências novas; o banco temporário foi removido ao final. O teste local
completo da Edge Function não foi executado porque Docker Desktop não está
disponível neste ambiente.

## Ainda não executado deliberadamente

- migration no banco de produção;
- deploy de `ingest-product`;
- ativação de flags;
- backfill, inclusive em dry-run contra produção;
- remoção ou alteração de estruturas legadas.

Essas operações foram mantidas fora desta entrega porque o banco tem drift de
migrations e o plano exige validação isolada antes da produção.

## Riscos restantes

1. testar a migration em uma Supabase Branch ou projeto de staging;
2. executar testes reais de concorrência para constraints de dedupe;
3. endurecer SSRF com resolução DNS e validação de cada redirect;
4. limitar bytes das respostas do autofill;
5. restringir colunas técnicas legadas em `gifts` após o rollout total;
6. criar testes de integração automatizados com Postgres;
7. tratar warnings preexistentes dos advisors de segurança;
8. decidir retenção e agregação do histórico.

## Próximos passos para a Fase 1

- coletor agendado de preços por oferta;
- cálculo de mínimo, máximo e tendência a partir de observações;
- alertas de redução e meta;
- comparação de ofertas do mesmo produto;
- regras comerciais de afiliados por retailer;
- limites e retenção por plano Pro;
- painel de qualidade de extração e duplicatas evitadas.
