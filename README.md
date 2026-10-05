# Foco · Quadro de tarefas

Quadro Kanban feito com HTML, CSS e JavaScript puros, sem frameworks nem bibliotecas.

## Funcionalidades

- Três colunas (A fazer, Em andamento, Concluídas) com arrastar e soltar
- Botões de mover, editar e excluir, que funcionam com teclado e toque
- Prioridade, prazo e aviso de tarefa atrasada
- Busca por título e filtro por prioridade
- Desfazer exclusão
- Tema claro e escuro (respeita a preferência do sistema)
- Dados salvos no `localStorage` e exportação em JSON
- Barra de progresso com `role="progressbar"`

## O que o projeto demonstra

- HTML semântico, `<dialog>` nativo e navegação por teclado com foco visível
- CSS com variáveis, Grid, `color-mix()`, layout responsivo sem breakpoints para o quadro e `prefers-reduced-motion`
- JavaScript modular em IIFE, delegação de eventos, criação segura de DOM (sem `innerHTML`) e persistência com tratamento de erros

## Como rodar

Abra o `index.html` no navegador. Não há build nem dependências.
