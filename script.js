(() => {
  'use strict';

  /* ---------- Configuração ---------- */
  const COLUNAS = [
    { id: 'fazer', nome: 'A fazer' },
    { id: 'fazendo', nome: 'Em andamento' },
    { id: 'feito', nome: 'Concluídas' },
  ];
  const PRIORIDADES = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
  const CHAVE_DADOS = 'foco:tarefas';
  const CHAVE_TEMA = 'foco:tema';

  /* ---------- Elementos ---------- */
  const $ = (seletor) => document.querySelector(seletor);
  const quadro = $('#quadro');
  const formNova = $('#form-nova');
  const formEdicao = $('#form-edicao');
  const dialogo = $('#dialogo');
  const toastEl = $('#toast');

  /* ---------- Estado ---------- */
  let tarefas = carregar();
  let filtro = { busca: '', prioridade: '' };
  let editandoId = null;
  let timerToast;

  /* ---------- Utilitários ---------- */
  function novaTarefa(titulo, prioridade, prazo, coluna = 'fazer') {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return { id, titulo, prioridade, prazo, coluna };
  }

  // Cria elementos com textContent: evita injeção de HTML (XSS)
  function el(tag, { classe, texto, ...atributos } = {}, ...filhos) {
    const no = document.createElement(tag);
    if (classe) no.className = classe;
    if (texto != null) no.textContent = texto;
    for (const [chave, valor] of Object.entries(atributos)) no.setAttribute(chave, valor);
    no.append(...filhos);
    return no;
  }

  const hojeISO = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD local
  const formatarData = (iso) => iso.split('-').reverse().join('/');

  /* ---------- Persistência ---------- */
  function carregar() {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_DADOS));
      if (Array.isArray(salvo)) return salvo;
    } catch { /* primeira visita ou storage indisponível */ }
    return [
      novaTarefa('Publicar o projeto no GitHub', 'alta', '', 'fazendo'),
      novaTarefa('Arrastar este cartão para Concluídas', 'media', '', 'fazer'),
      novaTarefa('Escrever o README do portfólio', 'baixa', '', 'fazer'),
    ];
  }

  function salvar() {
    try { localStorage.setItem(CHAVE_DADOS, JSON.stringify(tarefas)); } catch { /* ignora */ }
  }

  /* ---------- Renderização ---------- */
  function criarCartao(tarefa, indiceColuna) {
    const atrasada = tarefa.prazo && tarefa.coluna !== 'feito' && tarefa.prazo < hojeISO();

    const meta = el('div', { classe: 'meta' },
      el('span', { classe: `selo selo-${tarefa.prioridade}`, texto: PRIORIDADES[tarefa.prioridade] }));
    if (tarefa.prazo) {
      meta.append(el('span', {
        classe: atrasada ? 'atrasado' : '',
        texto: `${atrasada ? 'Atrasada' : 'Até'} ${formatarData(tarefa.prazo)}`,
      }));
    }

    const botao = (texto, acao, rotulo) =>
      el('button', { type: 'button', classe: 'btn-mini', texto, 'data-acao': acao, 'aria-label': `${rotulo}: ${tarefa.titulo}` });

    const acoes = el('div', { classe: 'acoes-cartao' });
    if (indiceColuna > 0) acoes.append(botao('← Voltar', 'voltar', 'Voltar tarefa'));
    if (indiceColuna < COLUNAS.length - 1) acoes.append(botao('Avançar →', 'avancar', 'Avançar tarefa'));
    acoes.append(botao('Editar', 'editar', 'Editar tarefa'), botao('Excluir', 'excluir', 'Excluir tarefa'));

    return el('li', { classe: 'cartao', draggable: 'true', 'data-id': tarefa.id },
      el('p', { classe: 'titulo', texto: tarefa.titulo }), meta, acoes);
  }

  function render() {
    const busca = filtro.busca.trim().toLowerCase();
    const visiveis = tarefas.filter((t) =>
      (!busca || t.titulo.toLowerCase().includes(busca)) &&
      (!filtro.prioridade || t.prioridade === filtro.prioridade));

    quadro.replaceChildren(...COLUNAS.map((coluna, indice) => {
      const itens = visiveis.filter((t) => t.coluna === coluna.id);
      const lista = el('ul', { classe: 'lista' }, ...itens.map((t) => criarCartao(t, indice)));
      if (!itens.length) lista.append(el('li', { classe: 'vazio', texto: 'Nada por aqui. Adicione uma tarefa ou arraste um cartão para esta coluna.' }));

      return el('section', { classe: 'coluna', 'data-col': coluna.id },
        el('div', { classe: 'coluna-topo' },
          el('h2', { texto: coluna.nome }),
          el('span', { classe: 'contador', texto: String(itens.length), 'aria-label': `${itens.length} tarefas` })),
        lista);
    }));

    atualizarResumo();
  }

  function atualizarResumo() {
    const total = tarefas.length;
    const feitas = tarefas.filter((t) => t.coluna === 'feito').length;
    const pct = total ? Math.round((feitas / total) * 100) : 0;
    $('#barra').style.width = `${pct}%`;
    $('#barra').setAttribute('aria-valuenow', pct);
    $('#resumo-texto').textContent = total
      ? `${feitas} de ${total} tarefas concluídas (${pct}%)`
      : 'Nenhuma tarefa ainda. Adicione a primeira acima.';
  }

  /* ---------- Feedback (toast) ---------- */
  function avisar(mensagem, desfazer) {
    toastEl.replaceChildren(el('span', { texto: mensagem }));
    if (desfazer) {
      const btn = el('button', { type: 'button', texto: 'Desfazer' });
      btn.addEventListener('click', () => { desfazer(); toastEl.classList.remove('visivel'); });
      toastEl.append(btn);
    }
    toastEl.classList.add('visivel');
    clearTimeout(timerToast);
    timerToast = setTimeout(() => toastEl.classList.remove('visivel'), 5000);
  }

  /* ---------- Ações ---------- */
  function mover(id, destino) {
    const tarefa = tarefas.find((t) => t.id === id);
    if (!tarefa || tarefa.coluna === destino) return;
    tarefa.coluna = destino;
    salvar();
    render();
  }

  function excluir(id) {
    const posicao = tarefas.findIndex((t) => t.id === id);
    if (posicao < 0) return;
    const [removida] = tarefas.splice(posicao, 1);
    salvar();
    render();
    avisar('Tarefa excluída.', () => {
      tarefas.splice(posicao, 0, removida);
      salvar();
      render();
    });
  }

  function abrirEdicao(id) {
    const tarefa = tarefas.find((t) => t.id === id);
    if (!tarefa) return;
    editandoId = id;
    formEdicao.titulo.value = tarefa.titulo;
    formEdicao.prioridade.value = tarefa.prioridade;
    formEdicao.prazo.value = tarefa.prazo;
    dialogo.showModal();
  }

  /* ---------- Eventos ---------- */
  formNova.addEventListener('submit', (e) => {
    e.preventDefault();
    const dados = new FormData(formNova);
    const titulo = dados.get('titulo').trim();
    if (!titulo) return;
    tarefas.push(novaTarefa(titulo, dados.get('prioridade'), dados.get('prazo')));
    salvar();
    render();
    formNova.reset();
    formNova.titulo.focus();
    avisar('Tarefa adicionada.');
  });

  formEdicao.addEventListener('submit', (e) => {
    e.preventDefault();
    const tarefa = tarefas.find((t) => t.id === editandoId);
    const titulo = formEdicao.titulo.value.trim();
    if (tarefa && titulo) {
      Object.assign(tarefa, { titulo, prioridade: formEdicao.prioridade.value, prazo: formEdicao.prazo.value });
      salvar();
      render();
      avisar('Alterações salvas.');
    }
    dialogo.close();
  });
  $('#btn-cancelar').addEventListener('click', () => dialogo.close());

  // Delegação de eventos: um único listener para todos os botões dos cartões
  quadro.addEventListener('click', (e) => {
    const botao = e.target.closest('button[data-acao]');
    if (!botao) return;
    const id = botao.closest('.cartao').dataset.id;
    const tarefa = tarefas.find((t) => t.id === id);
    const indice = COLUNAS.findIndex((c) => c.id === tarefa.coluna);
    ({
      voltar: () => mover(id, COLUNAS[indice - 1].id),
      avancar: () => mover(id, COLUNAS[indice + 1].id),
      editar: () => abrirEdicao(id),
      excluir: () => excluir(id),
    })[botao.dataset.acao]();
  });

  // Arrastar e soltar (os botões acima são a alternativa para teclado e toque)
  quadro.addEventListener('dragstart', (e) => {
    const cartao = e.target.closest('.cartao');
    if (!cartao) return;
    e.dataTransfer.setData('text/plain', cartao.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    cartao.classList.add('arrastando');
  });
  quadro.addEventListener('dragend', (e) => e.target.classList?.remove('arrastando'));
  quadro.addEventListener('dragover', (e) => {
    const coluna = e.target.closest('.coluna');
    if (!coluna) return;
    e.preventDefault();
    coluna.classList.add('alvo');
  });
  quadro.addEventListener('dragleave', (e) => {
    const coluna = e.target.closest('.coluna');
    if (coluna && !coluna.contains(e.relatedTarget)) coluna.classList.remove('alvo');
  });
  quadro.addEventListener('drop', (e) => {
    const coluna = e.target.closest('.coluna');
    if (!coluna) return;
    e.preventDefault();
    mover(e.dataTransfer.getData('text/plain'), coluna.dataset.col);
  });

  // Busca e filtro
  $('#busca').addEventListener('input', (e) => { filtro.busca = e.target.value; render(); });
  $('#filtro-prioridade').addEventListener('change', (e) => { filtro.prioridade = e.target.value; render(); });

  // Tema claro/escuro
  const btnTema = $('#btn-tema');
  const rotularTema = () => {
    btnTema.textContent = document.documentElement.dataset.tema === 'escuro' ? 'Tema claro' : 'Tema escuro';
  };
  btnTema.addEventListener('click', () => {
    const novo = document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro';
    document.documentElement.dataset.tema = novo;
    try { localStorage.setItem(CHAVE_TEMA, novo); } catch { /* ignora */ }
    rotularTema();
  });

  // Exportar tarefas em JSON
  $('#btn-exportar').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(tarefas, null, 2)], { type: 'application/json' });
    const link = el('a', { href: URL.createObjectURL(blob), download: 'tarefas-foco.json' });
    link.click();
    URL.revokeObjectURL(link.href);
  });

  /* ---------- Início ---------- */
  rotularTema();
  render();
})();
