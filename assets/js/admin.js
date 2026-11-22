import { CONFIG } from './config.js';

let accessToken = localStorage.getItem('br_admin_token') || null;

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const btnLogout = document.getElementById('btn-logout');

function getHeaders(isJson = true) {
  const h = {
    apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmVjbGlycWhkY21peWpjaWpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyODgwMjcsImV4cCI6MjExMDg2NDAyN30.5eKLdzvNtMhV-yVmNS8qEFhEONwxKr-d8Nhsu27c-OM,
    Authorization: `Bearer ${accessToken}`
  };
  if (isJson) h['Content-Type'] = 'application/json';
  return h;
}

function formatarMoeda(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Navegação entre abas
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// Login
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const erroEl = document.getElementById('login-erro');

  try {
    const res = await fetch(`${https://qoreclirqhdcmiyjcijl.supabase.co}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmVjbGlycWhkY21peWpjaWpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyODgwMjcsImV4cCI6MjExMDg2NDAyN30.5eKLdzvNtMhV-yVmNS8qEFhEONwxKr-d8Nhsu27c-OM, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || 'Credenciais inválidas');

    accessToken = data.access_token;
    localStorage.setItem('br_admin_token', accessToken);
    iniciarDashboard();
  } catch (err) {
    erroEl.textContent = err.message;
    erroEl.classList.remove('hidden');
  }
});

btnLogout.addEventListener('click', () => {
  localStorage.removeItem('br_admin_token');
  accessToken = null;
  location.reload();
});

async function iniciarDashboard() {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  btnLogout.classList.remove('hidden');

  await Promise.all([
    carregarAgenda(),
    carregarServicosAdmin(),
    carregarProdutosAdmin(),
    carregarBloqueiosAdmin()
  ]);
}

// --- 1. AGENDA ---
async function carregarAgenda(dataFiltro = '') {
  const hoje = new Date().toISOString().split('T')[0];
  const query = dataFiltro
    ? `data_agendamento=eq.${dataFiltro}&order=horario_inicio.asc`
    : `data_agendamento=gte.${hoje}&order=data_agendamento.asc,horario_inicio.asc`;

  const res = await fetch(`${https://qoreclirqhdcmiyjcijl.supabase.co}/rest/v1/agendamentos?${query}`, {
    headers: getHeaders(false)
  });

  if (res.status === 401) {
    btnLogout.click();
    return;
  }

  const lista = await res.json();
  const tbody = document.getElementById('tbody-agenda');
  tbody.innerHTML = '';

  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">Nenhum agendamento encontrado.</td></tr>';
    return;
  }

  lista.forEach(ag => {
    const dataBr = ag.data_agendamento.split('-').reverse().join('/');
    const hora = ag.horario_inicio.slice(0, 5);
    const msgConfirm = encodeURIComponent(
      `Olá, ${ag.cliente_nome}! Aqui é da *Barba Ruiva Barbearia*. Seu horário para *${ag.servico_nome}* no dia *${dataBr}* às *${hora}* está confirmado!`
    );

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${dataBr}</strong><br>${hora}</td>
      <td>${ag.cliente_nome}<br><small style="color: var(--text-muted);">${ag.cliente_whatsapp}</small></td>
      <td>${ag.servico_nome}${ag.observacoes ? `<br><small style="color: var(--accent);">Obs: ${ag.observacoes}</small>` : ''}</td>
      <td>${formatarMoeda(ag.valor_total)}</td>
      <td><span class="status-badge status-${ag.status}">${ag.status}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-xs btn-green" onclick="atualizarStatus('${ag.id}', 'confirmado')">Confirmar</button>
          <button class="btn-xs btn-blue" onclick="atualizarStatus('${ag.id}', 'concluido')">Concluir</button>
          <button class="btn-xs btn-red" onclick="atualizarStatus('${ag.id}', 'cancelado')">Cancelar</button>
          <a href="https://wa.me/55${ag.cliente_whatsapp}?text=${msgConfirm}" target="_blank" class="btn-xs" style="background:#25D366; color:#000; text-decoration:none;">WhatsApp</a>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.atualizarStatus = async (id, novoStatus) => {
  await fetch(`${https://qoreclirqhdcmiyjcijl.supabase.co}/rest/v1/agendamentos?id=eq.${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ status: novoStatus })
  });
  carregarAgenda(document.getElementById('filtro-data-agenda').value);
};

document.getElementById('filtro-data-agenda').addEventListener('change', (e) => {
  carregarAgenda(e.target.value);
});
document.getElementById('btn-limpar-filtro').addEventListener('click', () => {
  document.getElementById('filtro-data-agenda').value = '';
  carregarAgenda();
});

// --- 2. SERVIÇOS ---
async function carregarServicosAdmin() {
  const res = await fetch(`${https://qoreclirqhdcmiyjcijl.supabase.co}/rest/v1/servicos?order=ordem.asc`, {
    headers: getHeaders(false)
  });
  const servicos = await res.json();
  const tbody = document.getElementById('tbody-servicos');
  tbody.innerHTML = '';

  servicos.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${s.nome}</strong><br><small style="color:var(--text-muted);">${s.descricao || ''}</small></td>
      <td>${s.duracao_minutos} min</td>
      <td>
        <input type="number" step="0.01" value="${s.preco}" id="preco-${s.id}" style="width:90px; padding:6px; background:var(--bg-primary); border:1px solid var(--border); color:#fff; border-radius:4px;" />
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-xs btn-green" onclick="salvarPrecoServico('${s.id}')">Salvar Preço</button>
          <button class="btn-xs btn-red" onclick="excluirRegistro('servicos', '${s.id}')">Excluir</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.salvarPrecoServico = async (id) => {
  const novoPreco = parseFloat(document.getElementById(`preco-${id}`).value);
  await fetch(`${https://qoreclirqhdcmiyjcijl.supabase.co}/rest/v1/servicos?id=eq.${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ preco: novoPreco })
  });
  alert('Preço atualizado!');
};

document.getElementById('form-novo-servico').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    nome: document.getElementById('srv-nome').value.trim(),
    preco: parseFloat(document.getElementById('srv-preco').value),
    duracao_minutos: parseInt(document.getElementById('srv-duracao').value, 10),
    descricao: document.getElementById('srv-desc').value.trim()
  };
  await fetch(`${https://qoreclirqhdcmiyjcijl.supabase.co}/rest/v1/servicos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  e.target.reset();
  carregarServicosAdmin();
});

// --- 3. PRODUTOS ---
async function carregarProdutosAdmin() {
  const res = await fetch(`${https://qoreclirqhdcmiyjcijl.supabase.co}/rest/v1/produtos?order=created_at.desc`, {
    headers: getHeaders(false)
  });
  const produtos = await res.json();
  const tbody = document.getElementById('tbody-produtos');
  tbody.innerHTML = '';

  produtos.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${p.nome}</strong></td>
      <td>${p.descricao || '-'}</td>
      <td>${formatarMoeda(p.preco)}</td>
      <td><button class="btn-xs btn-red" onclick="excluirRegistro('produtos', '${p.id}')">Remover</button></td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('form-novo-produto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    nome: document.getElementById('prod-nome').value.trim(),
    preco: parseFloat(document.getElementById('prod-preco').value),
    descricao: document.getElementById('prod-desc').value.trim()
  };
  await fetch(`${https://qoreclirqhdcmiyjcijl.supabase.co}/rest/v1/produtos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  e.target.reset();
  carregarProdutosAdmin();
});

// --- 4. BLOQUEIOS ---
async function carregarBloqueiosAdmin() {
  const res = await fetch(`${https://qoreclirqhdcmiyjcijl.supabase.co}/rest/v1/bloqueios_agenda?order=data_bloqueio.asc`, {
    headers: getHeaders(false)
  });
  const bloqueios = await res.json();
  const tbody = document.getElementById('tbody-bloqueios');
  tbody.innerHTML = '';

  bloqueios.forEach(b => {
    const dataBr = b.data_bloqueio.split('-').reverse().join('/');
    const intervalo = b.hora_inicio ? `${b.hora_inicio.slice(0,5)} às ${b.hora_fim.slice(0,5)}` : 'Dia inteiro';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dataBr}</td>
      <td>${intervalo}</td>
      <td>${b.motivo || '-'}</td>
      <td><button class="btn-xs btn-red" onclick="excluirRegistro('bloqueios_agenda', '${b.id}')">Remover</button></td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('form-novo-bloqueio').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    data_bloqueio: document.getElementById('bloq-data').value,
    motivo: document.getElementById('bloq-motivo').value.trim() || null,
    hora_inicio: document.getElementById('bloq-inicio').value || null,
    hora_fim: document.getElementById('bloq-fim').value || null
  };
  await fetch(`${https://qoreclirqhdcmiyjcijl.supabase.co}/rest/v1/bloqueios_agenda`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  e.target.reset();
  carregarBloqueiosAdmin();
});

window.excluirRegistro = async (tabela, id) => {
  if (!confirm('Tem certeza que deseja excluir este item?')) return;
  await fetch(`${https://qoreclirqhdcmiyjcijl.supabase.co}/rest/v1/${tabela}?id=eq.${id}`, {
    method: 'DELETE',
    headers: getHeaders(false)
  });
  if (tabela === 'servicos') carregarServicosAdmin();
  if (tabela === 'produtos') carregarProdutosAdmin();
  if (tabela === 'bloqueios_agenda') carregarBloqueiosAdmin();
};

if (accessToken) iniciarDashboard();
