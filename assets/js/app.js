import { CONFIG } from './config.js';
import { gerarHorariosDisponiveis } from './schedule.js';

const HEADERS = {
  apikey: CONFIG.SUPABASE_ANON_KEY,
  Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

let servicosCache = [];
let barbeirosCache = [];

// Elementos DOM
const listaServicosEl = document.getElementById('lista-servicos');
const listaProdutosEl = document.getElementById('lista-produtos');
const selectServicoEl = document.getElementById('select-servico');
const selectBarbeiroEl = document.getElementById('select-barbeiro');
const inputDataEl = document.getElementById('input-data');
const containerHorariosEl = document.getElementById('container-horarios');
const inputInicioEl = document.getElementById('input-horario-inicio');
const inputFimEl = document.getElementById('input-horario-fim');
const formAgendamentoEl = document.getElementById('form-agendamento');
const feedbackEl = document.getElementById('feedback-agendamento');

function formatarMoeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// 1. Carregar Serviços (Cartela)
async function carregarServicos() {
  try {
    const res = await fetch(
      `${CONFIG.SUPABASE_URL}/rest/v1/servicos?ativo=eq.true&order=ordem.asc`,
      { headers: HEADERS }
    );
    servicosCache = await res.json();

    listaServicosEl.innerHTML = '';
    selectServicoEl.innerHTML = '<option value="">Selecione um serviço...</option>';

    servicosCache.forEach(srv => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div>
          <h3>${srv.nome}</h3>
          <p>${srv.descricao || 'Atendimento especializado Barba Ruiva.'}</p>
        </div>
        <div class="card-footer">
          <div>
            <div class="price">${formatarMoeda(srv.preco)}</div>
            <div class="duration">⏱ ${srv.duracao_minutos} min</div>
          </div>
          <button type="button" class="btn btn-outline btn-sm" data-id="${srv.id}">
            Agendar
          </button>
        </div>
      `;
      card.querySelector('button').addEventListener('click', () => {
        selectServicoEl.value = srv.id;
        document.getElementById('agendar').scrollIntoView({ behavior: 'smooth' });
        atualizarHorariosLivres();
      });
      listaServicosEl.appendChild(card);

      const opt = document.createElement('option');
      opt.value = srv.id;
      opt.textContent = `${srv.nome} — ${formatarMoeda(srv.preco)} (${srv.duracao_minutos} min)`;
      selectServicoEl.appendChild(opt);
    });
  } catch (err) {
    listaServicosEl.innerHTML = '<p class="loading-text">Erro ao carregar serviços.</p>';
  }
}

// 1b. Carregar Barbeiros Ativos
async function carregarBarbeiros() {
  if (!selectBarbeiroEl) return;
  try {
    const res = await fetch(
      `${CONFIG.SUPABASE_URL}/rest/v1/barbeiros?ativo=eq.true&order=ordem.asc,nome.asc`,
      { headers: HEADERS }
    );
    barbeirosCache = await res.json();

    selectBarbeiroEl.innerHTML = '<option value="">Selecione o barbeiro...</option>';
    barbeirosCache.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.nome;
      opt.textContent = b.nome;
      selectBarbeiroEl.appendChild(opt);
    });

    if (barbeirosCache.length === 1) {
      selectBarbeiroEl.value = barbeirosCache[0].nome;
    }
  } catch (err) {
    selectBarbeiroEl.innerHTML = '<option value="">Erro ao carregar barbeiros</option>';
  }
}

// 2. Carregar Produtos
async function carregarProdutos() {
  try {
    const res = await fetch(
      `${CONFIG.SUPABASE_URL}/rest/v1/produtos?em_estoque=eq.true&order=created_at.desc`,
      { headers: HEADERS }
    );
    const produtos = await res.json();

    if (!produtos.length) {
      listaProdutosEl.innerHTML = '<p class="loading-text">Novos produtos em breve na barbearia.</p>';
      return;
    }

    listaProdutosEl.innerHTML = '';
    produtos.forEach(prod => {
      const msgZap = encodeURIComponent(`Olá! Vi o produto *${prod.nome}* no site da Barba Ruiva e gostaria de saber mais.`);
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div>
          <h3>${prod.nome}</h3>
          <p>${prod.descricao || 'Produto selecionado pela equipe Barba Ruiva.'}</p>
        </div>
        <div class="card-footer">
          <div class="price">${formatarMoeda(prod.preco)}</div>
          <a href="https://wa.me/${CONFIG.BARBEARIA.whatsapp}?text=${msgZap}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
            Reservar
          </a>
        </div>
      `;
      listaProdutosEl.appendChild(card);
    });
  } catch (err) {
    listaProdutosEl.innerHTML = '<p class="loading-text">Erro ao carregar produtos.</p>';
  }
}

// 3. Buscar e Renderizar Horários Disponíveis (por Barbeiro + Data + Serviço)
async function atualizarHorariosLivres() {
  const servicoId = selectServicoEl.value;
  const barbeiroNome = selectBarbeiroEl ? selectBarbeiroEl.value : '';
  const dataStr = inputDataEl.value;
  inputInicioEl.value = '';
  inputFimEl.value = '';

  if (!servicoId || !barbeiroNome || !dataStr) {
    containerHorariosEl.innerHTML =
      '<span class="slot-placeholder">Selecione o serviço, o barbeiro e a data para ver os horários livres.</span>';
    return;
  }

  const servico = servicosCache.find(s => s.id === servicoId);
  containerHorariosEl.innerHTML = '<span class="slot-placeholder">Consultando agenda...</span>';

  try {
    const filtroBarbeiro = encodeURIComponent(`eq.${barbeiroNome}`);
    const [resAgendamentos, resBloqueios] = await Promise.all([
      fetch(
        `${CONFIG.SUPABASE_URL}/rest/v1/agendamentos?data_agendamento=eq.${dataStr}&barbeiro_nome=${filtroBarbeiro}&status=in.(pendente,confirmado)&select=horario_inicio,horario_fim`,
        { headers: HEADERS }
      ),
      fetch(
        `${CONFIG.SUPABASE_URL}/rest/v1/bloqueios_agenda?data_bloqueio=eq.${dataStr}&select=hora_inicio,hora_fim`,
        { headers: HEADERS }
      )
    ]);

    const agendamentosDia = await resAgendamentos.json();
    const bloqueiosDia = await resBloqueios.json();

    const slots = gerarHorariosDisponiveis({
      dataStr,
      duracaoMinutos: servico.duracao_minutos,
      agendamentosDia,
      bloqueiosDia
    });

    if (!slots.length) {
      containerHorariosEl.innerHTML =
        '<span class="slot-placeholder">Nenhum horário disponível para este barbeiro nesta data.</span>';
      return;
    }

    containerHorariosEl.innerHTML = '';
    slots.forEach(slot => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-btn';
      btn.textContent = slot.inicio;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        inputInicioEl.value = slot.inicio;
        inputFimEl.value = slot.fim;
      });
      containerHorariosEl.appendChild(btn);
    });
  } catch (err) {
    containerHorariosEl.innerHTML =
      '<span class="slot-placeholder">Erro ao consultar horários. Tente novamente.</span>';
  }
}

// 4. Enviar Agendamento com o Barbeiro Escolhido
formAgendamentoEl.addEventListener('submit', async (e) => {
  e.preventDefault();

  const barbeiroEscolhido = selectBarbeiroEl ? selectBarbeiroEl.value : '';
  if (!barbeiroEscolhido) {
    alert('Por favor, selecione o barbeiro.');
    return;
  }

  if (!inputInicioEl.value) {
    alert('Por favor, selecione um horário disponível.');
    return;
  }

  const btnSubmit = document.getElementById('btn-confirmar');
  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Registrando...';

  const servico = servicosCache.find(s => s.id === selectServicoEl.value);
  const nome = document.getElementById('input-nome').value.trim();
  const whatsappCliente = document.getElementById('input-whatsapp').value.replace(/\D/g, '');
  const obs = document.getElementById('input-obs').value.trim();
  const dataStr = inputDataEl.value;
  const horarioInicio = inputInicioEl.value;
  const horarioFim = inputFimEl.value;

  const payload = {
    cliente_nome: nome,
    cliente_whatsapp: whatsappCliente,
    servico_id: servico.id,
    servico_nome: servico.nome,
    barbeiro_nome: barbeiroEscolhido,
    valor_total: servico.preco,
    data_agendamento: dataStr,
    horario_inicio: horarioInicio,
    horario_fim: horarioFim,
    observacoes: obs || null,
    lgpd_aceite: true
  };

  try {
    const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/agendamentos`, {
      method: 'POST',
      headers: { ...HEADERS, Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Falha ao salvar agendamento');

    const dataFormatada = dataStr.split('-').reverse().join('/');
    const textoZap = encodeURIComponent(
      `Olá, Barba Ruiva! Acabei de agendar pelo site:\n` +
      `• *Cliente:* ${nome}\n` +
      `• *Barbeiro:* ${barbeiroEscolhido}\n` +
      `• *Serviço:* ${servico.nome} (${formatarMoeda(servico.preco)})\n` +
      `• *Data:* ${dataFormatada} às *${horarioInicio}*`
    );

    feedbackEl.className = 'feedback success';
    feedbackEl.innerHTML = `
      <strong>Agendamento registrado com sucesso!</strong><br>
      Barbeiro: <strong>${barbeiroEscolhido}</strong> • Dia <strong>${dataFormatada}</strong> às <strong>${horarioInicio}</strong>.<br><br>
      <a href="https://wa.me/${CONFIG.BARBEARIA.whatsapp}?text=${textoZap}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">
        Enviar Comprovante no WhatsApp da Barbearia
      </a>
    `;

    formAgendamentoEl.reset();
    containerHorariosEl.innerHTML =
      '<span class="slot-placeholder">Selecione o serviço, o barbeiro e a data para ver os horários livres.</span>';
  } catch (err) {
    feedbackEl.className = 'feedback error';
    feedbackEl.textContent = 'Não foi possível concluir o agendamento. Verifique sua conexão ou chame no WhatsApp.';
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Confirmar Agendamento';
  }
});

// 5. Consultar e Cancelar Agendamentos do Cliente por Telefone
const inputConsultaTelefoneEl = document.getElementById('input-consulta-telefone');
const btnBuscarAgendamentosEl = document.getElementById('btn-buscar-agendamentos');
const resultadoMeusAgendamentosEl = document.getElementById('resultado-meus-agendamentos');

window.cancelarAgendamentoCliente = async (agendamentoId) => {
  if (!confirm('Deseja realmente cancelar este agendamento?')) return;

  try {
    const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/agendamentos?id=eq.${agendamentoId}`, {
      method: 'PATCH',
      headers: { ...HEADERS, Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'cancelado' })
    });

    if (!res.ok) throw new Error('Falha ao cancelar agendamento');

    await consultarAgendamentosPorTelefone();
    await atualizarHorariosLivres();
  } catch (err) {
    alert('Não foi possível cancelar o agendamento agora. Tente novamente.');
  }
};

async function consultarAgendamentosPorTelefone() {
  if (!inputConsultaTelefoneEl || !resultadoMeusAgendamentosEl) return;

  const digitos = inputConsultaTelefoneEl.value.replace(/\D/g, '');
  if (digitos.length < 8) {
    resultadoMeusAgendamentosEl.className = 'my-bookings-results feedback error';
    resultadoMeusAgendamentosEl.textContent = 'Digite um número de telefone válido (com DDD) para consultar.';
    return;
  }

  resultadoMeusAgendamentosEl.className = 'my-bookings-results';
  resultadoMeusAgendamentosEl.innerHTML = '<p class="loading-text">Buscando seus agendamentos...</p>';

  try {
    const query = encodeURIComponent(`eq.${digitos}`);
    const res = await fetch(
      `${CONFIG.SUPABASE_URL}/rest/v1/agendamentos?cliente_whatsapp=${query}&select=id,servico_nome,barbeiro_nome,data_agendamento,horario_inicio,horario_fim,status,valor_total&order=data_agendamento.desc,horario_inicio.asc`,
      { headers: HEADERS }
    );

    if (!res.ok) throw new Error('Falha ao consultar agendamentos');

    const registros = await res.json();

    if (!registros.length) {
      resultadoMeusAgendamentosEl.innerHTML =
        '<div class="my-booking-item"><span class="muted">Nenhum agendamento encontrado para este número.</span></div>';
      return;
    }

    resultadoMeusAgendamentosEl.innerHTML = '';
    registros.forEach(item => {
      const dataBr = item.data_agendamento.split('-').reverse().join('/');
      const horaIni = item.horario_inicio.slice(0, 5);
      const horaFim = item.horario_fim.slice(0, 5);
      const podeCancelar = item.status === 'pendente' || item.status === 'confirmado';

      const row = document.createElement('div');
      row.className = 'my-booking-item';
      row.innerHTML = `
        <div>
          <strong>${item.servico_nome}</strong> — <span style="color: var(--color-amber-forge);">${formatarMoeda(item.valor_total)}</span>
          <div class="my-booking-meta">
            Data: ${dataBr} • ${horaIni} às ${horaFim}${item.barbeiro_nome ? ` • Barbeiro: ${item.barbeiro_nome}` : ''}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <span class="booking-status-pill ${item.status}">${item.status}</span>
          ${
            podeCancelar
              ? `<button type="button" class="btn btn-outline btn-sm" onclick="cancelarAgendamentoCliente('${item.id}')">Cancelar agendamento</button>`
              : ''
          }
        </div>
      `;
      resultadoMeusAgendamentosEl.appendChild(row);
    });
  } catch (err) {
    resultadoMeusAgendamentosEl.className = 'my-bookings-results feedback error';
    resultadoMeusAgendamentosEl.textContent = 'Não foi possível consultar agora. Tente novamente em instantes.';
  }
}

if (btnBuscarAgendamentosEl) {
  btnBuscarAgendamentosEl.addEventListener('click', consultarAgendamentosPorTelefone);
}
if (inputConsultaTelefoneEl) {
  inputConsultaTelefoneEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      consultarAgendamentosPorTelefone();
    }
  });
}

// Inicialização
const hoje = new Date().toISOString().split('T')[0];
inputDataEl.min = hoje;
selectServicoEl.addEventListener('change', atualizarHorariosLivres);
if (selectBarbeiroEl) {
  selectBarbeiroEl.addEventListener('change', atualizarHorariosLivres);
}
inputDataEl.addEventListener('change', atualizarHorariosLivres);

carregarServicos();
carregarBarbeiros();
carregarProdutos();
