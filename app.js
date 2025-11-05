// app.js (compat) - substitua todo o arquivo por este

// ======================
// 🔥 Configurações Firebase (compat) - ATUALIZE SE NECESSÁRIO
// ======================
const firebaseConfigMain = {
  apiKey: "AIzaSyBWMeGoDass7ZZKbsN7ogX7ZKxTTApprtg",
  authDomain: "inventario-impressoras-2ecbd.firebaseapp.com",
  projectId: "inventario-impressoras-2ecbd",
  storageBucket: "inventario-impressoras-2ecbd.firebasestorage.app",
  messagingSenderId: "993025022167",
  appId: "1:993025022167:web:94c62eac0cfa96ddc1f892",
  measurementId: "G-459GNX2RGH"
};

const firebaseConfigToner = {
  apiKey: "AIzaSyBSAMAhiEbBPCNqNpv-dM64Pa_xclwqc54",
  authDomain: "controletoner.firebaseapp.com",
  projectId: "controletoner",
  storageBucket: "controletoner.firebasestorage.app",
  messagingSenderId: "821741941730",
  appId: "1:821741941730:web:32bd9d82c58deef8a37fbb",
  measurementId: "G-HVQ1MN2HBD"
};

// inicializa dois apps nomeados
const appMain = firebase.initializeApp(firebaseConfigMain, 'main');
const appToner = firebase.initializeApp(firebaseConfigToner, 'toner');

const dbMain = firebase.firestore(appMain);
const dbToner = firebase.firestore(appToner);

// ======================
// utilidades: toast + escape
// ======================
function showMessage(msg, type = 'success') {
  const d = document.createElement('div');
  d.className = 'toast ' + type;
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(()=>d.remove(), 3000);
}
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ======================
// LISTA DE IMPRESSORAS: Totais + Filtros
// ======================
const totalGeralEl = document.getElementById('totalGeral');
const totalFiltradoEl = document.getElementById('totalFiltrado');
const listaImpressorasTbody = document.getElementById('listaImpressoras');

async function atualizarTotalGeral() {
  try {
    const snap = await dbMain.collection('impressoras').get();
    if (totalGeralEl) totalGeralEl.textContent = snap.size;
  } catch (err) {
    console.error('Erro contar total geral', err);
  }
}

async function listarImpressoras(filtroEscola = '', filtroToner = '') {
  if (!listaImpressorasTbody) return;
  listaImpressorasTbody.innerHTML = '<tr><td colspan="6" class="muted">Carregando...</td></tr>';

  try {
    let q = dbMain.collection('impressoras');
    if (filtroEscola) q = q.where('escola', '==', filtroEscola);
    if (filtroToner) q = q.where('toner', '==', filtroToner);

    const snap = await q.get();
    const totalFiltrado = snap.size;
    if (totalFiltradoEl) totalFiltradoEl.textContent = totalFiltrado;

    if (snap.empty) {
      listaImpressorasTbody.innerHTML = '<tr><td colspan="6" class="muted">Nenhuma impressora encontrada.</td></tr>';
      return;
    }

    listaImpressorasTbody.innerHTML = '';
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const dataCadastro = d.dataCadastro ? (d.dataCadastro.seconds ? new Date(d.dataCadastro.seconds*1000).toLocaleString() : new Date(d.dataCadastro).toLocaleString()) : '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(d.modelo || '')}</td>
        <td>${escapeHtml(d.toner || '')}</td>
        <td>${escapeHtml(d.escola || '')}</td>
        <td>${escapeHtml(d.propriedade || '')}</td>
        <td>${escapeHtml(dataCadastro)}</td>
        <td>
          <button class="excluir" data-id="${docSnap.id}">Excluir</button>
        </td>
      `;
      listaImpressorasTbody.appendChild(tr);
    });

    // eventos excluir
    document.querySelectorAll('.excluir').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Deseja realmente excluir este registro?')) return;
        try {
          await dbMain.collection('impressoras').doc(id).delete();
          showMessage('Registro excluído', 'success');
          atualizarTotalGeral();
          listarImpressoras(document.getElementById('filtroEscola')?.value || '', document.getElementById('filtroToner')?.value || '');
        } catch (err) {
          console.error(err);
          showMessage('Erro ao excluir', 'error');
        }
      });
    });

  } catch (err) {
    console.error('Erro listar impressoras', err);
    listaImpressorasTbody.innerHTML = '<tr><td colspan="6" class="muted">Erro ao carregar.</td></tr>';
  }
}

// eventos filtros (lista)
document.getElementById('filtroEscola')?.addEventListener('input', e => {
  const valEscola = e.target.value.trim();
  const valToner = document.getElementById('filtroToner')?.value.trim() || '';
  // quando o usuário digitar, usamos o valor como filtro exato (igual a implementação anterior)
  listarImpressoras(valEscola, valToner);
});
document.getElementById('filtroToner')?.addEventListener('input', e => {
  const valToner = e.target.value.trim();
  const valEscola = document.getElementById('filtroEscola')?.value.trim() || '';
  listarImpressoras(valEscola, valToner);
});

// ======================
// RELATÓRIOS: listar TODAS as trocas (coleção 'registros') e filtrar por ESCOLA (apenas coluna Escola)
// ======================
const tabelaRel = document.getElementById('tabelaRel');
const filtroEscolaRel = document.getElementById('filtroEscolaRel');
const btnLimparFiltrosRel = document.getElementById('btnLimparFiltrosRel');

function montarLinhaRel(d) {
  const dataStr = d.data || (d.criadoEm && d.criadoEm.seconds ? new Date(d.criadoEm.seconds*1000).toLocaleDateString() : '');
  const escola = d.escola || '';
  const toner = d.toner || d.modelo || '';
  const modelo = d.modelo || '';
  const quantidade = d.quantidade || '';
  // Modelo — Escola concatenado
  const modeloEscola = `${modelo}${modelo && escola ? ' — ' + escola : (escola ? escola : '')}`;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${escapeHtml(dataStr)}</td>
    <td>${escapeHtml(escola)}</td>
    <td>${escapeHtml(toner)}</td>
    <td>${escapeHtml(modeloEscola)}</td>
    <td>${escapeHtml(quantidade)}</td>
    <td>
      <button class="excluir-rel" data-id="${d._id || ''}">Excluir</button>
    </td>
  `;
  return tr;
}

// onSnapshot em registros (tempo real)
function iniciarListenerRelatorios() {
  if (!tabelaRel) return;
  try {
    dbToner.collection('registros').orderBy('data', 'desc').onSnapshot(snapshot => {
      tabelaRel.innerHTML = '';
      if (snapshot.empty) {
        tabelaRel.innerHTML = '<tr><td colspan="6" class="muted">Nenhum registro ainda</td></tr>';
        return;
      }
      const filtro = filtroEscolaRel?.value.trim().toLowerCase() || '';
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        // anotar id no objeto para uso em botões
        d._id = docSnap.id;
        // filtro: apenas pela coluna escola (opção 1)
        if (filtro) {
          const escolaVal = (d.escola || '').toLowerCase();
          if (!escolaVal.includes(filtro)) return;
        }
        const tr = montarLinhaRel(d);
        tabelaRel.appendChild(tr);
      });

      // eventos excluir para relatórios (client-side)
      document.querySelectorAll('.excluir-rel').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (!id) return;
          if (!confirm('Excluir este registro de troca?')) return;
          try {
            await dbToner.collection('registros').doc(id).delete();
            showMessage('Registro removido', 'success');
          } catch (err) {
            console.error(err);
            showMessage('Erro ao excluir', 'error');
          }
        });
      });

    });
  } catch (err) {
    console.error('Erro listener relatorios', err);
    // fallback: carregar uma vez
    carregarRelatorios();
  }
}

// função fallback (caso necessário)
async function carregarRelatorios() {
  if (!tabelaRel) return;
  tabelaRel.innerHTML = '<tr><td colspan="6" class="muted">Carregando...</td></tr>';
  try {
    const snap = await dbToner.collection('registros').orderBy('data','desc').get();
    const filtro = filtroEscolaRel?.value.trim().toLowerCase() || '';
    tabelaRel.innerHTML = '';
    snap.forEach(docSnap => {
      const d = docSnap.data();
      d._id = docSnap.id;
      if (filtro) {
        const escolaVal = (d.escola || '').toLowerCase();
        if (!escolaVal.includes(filtro)) return;
      }
      tabelaRel.appendChild(montarLinhaRel(d));
    });
    if (tabelaRel.children.length === 0) tabelaRel.innerHTML = '<tr><td colspan="6" class="muted">Nenhum registro.</td></tr>';
  } catch (err) {
    console.error(err);
    tabelaRel.innerHTML = '<tr><td colspan="6" class="muted">Erro ao carregar.</td></tr>';
  }
}

filtroEscolaRel?.addEventListener('input', () => {
  // onSnapshot já fará o filtro em tempo real; caso esteja usando fallback, chamamos carregarRelatorios
  // para garantir compatibilidade, reinvoca carregarRelatorios
  carregarRelatorios();
});
btnLimparFiltrosRel?.addEventListener('click', () => {
  if (filtroEscolaRel) filtroEscolaRel.value = '';
  carregarRelatorios();
});

// ======================
// Iniciar
// ======================
window.addEventListener('load', () => {
  atualizarTotalGeral();
  listarImpressoras();
  iniciarListenerRelatorios();
});
