import { CONFIG } from './config.js';

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes) {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function gerarHorariosDisponiveis({
  dataStr,           // 'YYYY-MM-DD'
  duracaoMinutos,    // ex: 30 ou 60
  agendamentosDia,   // array de { horario_inicio, horario_fim }
  bloqueiosDia       // array de { hora_inicio, hora_fim }
}) {
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const dataObj = new Date(ano, mes - 1, dia);
  const diaSemana = dataObj.getDay();

  const turnos = CONFIG.EXPEDIENTE[diaSemana];
  if (!turnos) return []; // Domingo ou Segunda fechado

  // Verifica se há bloqueio de dia inteiro
  if (bloqueiosDia.some(b => !b.hora_inicio || !b.hora_fim)) {
    return [];
  }

  // Hora atual em Natal/RN para evitar agendamento no passado
  const agoraNatal = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Fortaleza' })
  );
  const hojeStr = `${agoraNatal.getFullYear()}-${String(agoraNatal.getMonth() + 1).padStart(2, '0')}-${String(agoraNatal.getDate()).padStart(2, '0')}`;
  const minutosAgora = agoraNatal.getHours() * 60 + agoraNatal.getMinutes();

  // Intervalos ocupados (agendamentos + bloqueios parciais)
  const ocupados = [
    ...agendamentosDia.map(a => ({
      inicio: timeToMinutes(a.horario_inicio),
      fim: timeToMinutes(a.horario_fim)
    })),
    ...bloqueiosDia.map(b => ({
      inicio: timeToMinutes(b.hora_inicio),
      fim: timeToMinutes(b.hora_fim)
    }))
  ];

  const slotsLivres = [];

  for (const turno of turnos) {
    const inicioTurno = timeToMinutes(turno.inicio);
    const fimTurno = timeToMinutes(turno.fim);

    for (
      let cursor = inicioTurno;
      cursor + duracaoMinutos <= fimTurno;
      cursor += CONFIG.INTERVALO_SLOTS_MINUTOS
    ) {
      const fimSlot = cursor + duracaoMinutos;

      // Se for hoje, exige pelo menos 15 min de antecedência
      if (dataStr === hojeStr && cursor <= minutosAgora + 15) {
        continue;
      }

      // Verifica colisão com algum agendamento ou bloqueio
      const temConflito = ocupados.some(
        oc => cursor < oc.fim && fimSlot > oc.inicio
      );

      if (!temConflito) {
        slotsLivres.push({
          inicio: minutesToTime(cursor),
          fim: minutesToTime(fimSlot)
        });
      }
    }
  }

  return slotsLivres;
}