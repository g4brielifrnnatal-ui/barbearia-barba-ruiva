import { CONFIG } from './config.js';
import { gerarHorariosDisponiveis } from './schedule.js';

const HEADERS = {
  apikey: sb_publishable_nkF29vCwJiHqYtsz52wr7w_ahn6FGAm,
  Authorization: `Bearer ${sb_publishable_nkF29vCwJiHqYtsz52wr7w_ahn6FGAm}`,
  'Content-Type': 'application/json'
};

let servicosCache = [];

// Elementos DOM
const listaServicosEl = document.getElementById('lista-servicos');
const listaProdutosEl = document.getElementById('lista-produtos');
const selectServicoEl = document.getElementById('select-servico');
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
      // Card na vitrine
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

      // Option no formulário
      const opt = document.createElement('option');
      opt.value = srv.id;
      opt.textContent = `${srv.nome} — ${formatarMoeda(srv.preco)} (${srv.duracao_minutos} min)`;
      selectServicoEl.appendChild(opt);
    });
  } catch (err) {
    listaServicosEl.innerHTML = '<p class="loading-text">Erro ao carregar serviços.</p>';
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

// 3. Buscar e Renderizar Horários Disponíveis
async function atualizarHorariosLivres() {
  const servicoId = selectServicoEl.value;
  const dataStr = inputDataEl.value;
  inputInicioEl.value = '';
  inputFimEl.value = '';

  if (!servicoId || !dataStr) {
    containerHorariosEl.innerHTML = '<span class="slot-placeholder">Selecione o serviço e a data para ver os horários livres.</span>';
    return;
  }

  const servico = servicosCache.find(s => s.id === servicoId);
  containerHorariosEl.innerHTML = '<span class="slot-placeholder">Consultando agenda...</span>';

  try {
    const [resAgendamentos, resBloqueios] = await Promise.all([
      fetch(
        `${CONFIG.SUPABASE_URL}/rest/v1/agendamentos?data_agendamento=eq.${dataStr}&status=in.(pendente,confirmado)&select=horario_inicio,horario_fim`,
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
      containerHorariosEl.innerHTML = '<span class="slot-placeholder">Nenhum horário disponível nesta data (fechado ou agenda lotada).</span>';
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
    containerHorariosEl.innerHTML = '<span class="slot-placeholder">Erro ao consultar horários. Tente novamente.</span>';
  }
}

// 4. Enviar Agendamento
formAgendamentoEl.addEventListener('submit', async (e) => {
  e.preventDefault();

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
      `• *Serviço:* ${servico.nome} (${formatarMoeda(servico.preco)})\n` +
      `• *Data:* ${dataFormatada} às *${horarioInicio}*`
    );

    feedbackEl.className = 'feedback success';
    feedbackEl.innerHTML = `
      <strong>Agendamento registrado com sucesso!</strong><br>
      Te esperamos no dia <strong>${dataFormatada}</strong> às <strong>${horarioInicio}</strong>.<br><br>
      <a href="https://wa.me/${CONFIG.BARBEARIA.whatsapp}?text=${textoZap}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">
        Enviar Comprovante no WhatsApp da Barbearia
      </a>
    `;

    formAgendamentoEl.reset();
    containerHorariosEl.innerHTML = '<span class="slot-placeholder">Selecione o serviço e a data para ver os horários livres.</span>';
  } catch (err) {
    feedbackEl.className = 'feedback error';
    feedbackEl.textContent = 'Não foi possível concluir o agendamento. Verifique sua conexão ou chame no WhatsApp.';
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Confirmar Agendamento';
  }
});

// Inicialização
const hoje = new Date().toISOString().split('T')[0];
inputDataEl.min = hoje;
selectServicoEl.addEventListener('change', atualizarHorariosLivres);
inputDataEl.addEventListener('change', atualizarHorariosLivres);

carregarServicos();
carregarProdutos();
