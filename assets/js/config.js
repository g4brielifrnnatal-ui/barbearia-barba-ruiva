export const CONFIG = {
  SUPABASE_URL: 'https://qoreclirqhdcmiyjcijl.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmVjbGlycWhkY21peWpjaWpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyODgwMjcsImV4cCI6MjExMDg2NDAyN30.5eKLdzvNtMhV-yVmNS8qEFhEONwxKr-d8Nhsu27c-OM',
  BARBEARIA: {
    nome: 'Barba Ruiva Barbearia',
    whatsapp: '5584988063250',
    instagram: 'https://www.instagram.com/barba.ruiva.barbearia/',
    localizacao: 'Natal/RN - Zona Norte'
  },
  // Regras oficiais extraídas da bio
  EXPEDIENTE: {
    0: null, // Domingo: Fechado
    1: null, // Segunda: Fechado
    2: [{ inicio: '08:30', fim: '11:30' }, { inicio: '14:00', fim: '19:00' }], // Terça
    3: [{ inicio: '08:30', fim: '11:30' }, { inicio: '14:00', fim: '19:00' }], // Quarta
    4: [{ inicio: '08:30', fim: '11:30' }, { inicio: '14:00', fim: '19:00' }], // Quinta
    5: [{ inicio: '08:30', fim: '11:30' }, { inicio: '14:00', fim: '19:00' }], // Sexta
    6: [{ inicio: '08:30', fim: '18:00' }] // Sábado
  },
  INTERVALO_SLOTS_MINUTOS: 30
};
