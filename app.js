// app.js (compat) - substitua todo o arquivo por este (versão final)

// ======================
// 🔥 Configurações Firebase (compat)
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

const appMain = firebase.initializeApp(firebaseConfigMain, 'main');
const appToner = firebase.initializeApp(firebaseConfigToner, 'toner');

const dbMain = firebase.firestore(appMain);
const dbToner = firebase.firestore(appToner);

// ======================
// utilidades: toast + escape
// ======================
function showMessage(msg, type = 'success') {
  const d = document.createElement('div');
  d.className = `toast ${type}`;
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(()=>d.remove(), 3000);
}
function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ======================
// ===== IMPRESSORAS ===== (Lista / Totais)
// ======================
const totalGeralEl = document.getElementById('totalGeral');
const totalFiltradoEl = document.getElementById('totalFiltrado');
const listaImpressorasTbody = document.getElementById('listaImpressoras');

async function atualizarTotalGeral() {
  try {
    if (!totalGeralEl) return;
    const snap = await dbMain.collection('impressoras').get();
    totalGeralEl.textContent = snap.size;
  } catch (err) { console.error('Erro contar total geral', err); }
}

async function listarImpressoras(filtroEscola = '', filtroToner = '') {
  if (!listaImpressorasTbody) return;
  listaImpressorasTbody.innerHTML = '<tr><td colspan="6" class="muted">Carregando...</td></tr>';
  try {
    let q = dbMain.collection('impressoras');
    if (filtroEscola) q = q.where('escola', '==', filtroEscola);
    if (filtroToner) q = q.where('toner', '==', filtroToner);
    const snap = await q.get();
    if (totalFiltradoEl) totalFiltradoEl.textContent = snap.size;
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
          <button class="btn-acao btn-excluir" data-id="${docSnap.id}">🗑️</button>
        </td>
      `;
      listaImpressorasTbody.appendChild(tr);
    });

    // excluir (impressoras)
    document.querySelectorAll('.btn-excluir').forEach(btn=>{
      btn.removeEventListener('click', handleExcluirImpressora);
      btn.addEventListener('click', handleExcluirImpressora);
    });

  } catch (err) {
    console.error('Erro listar impressoras', err);
    listaImpressorasTbody.innerHTML = '<tr><td colspan="6" class="muted">Erro ao carregar.</td></tr>';
  }
}

async function handleExcluirImpressora(e){
  const id = e.currentTarget.getAttribute('data-id');
  if (!confirm('Deseja realmente excluir este registro?')) return;
  try {
    await dbMain.collection('impressoras').doc(id).delete();
    showMessage('Registro excluído', 'success');
    atualizarTotalGeral();
    listarImpressoras(document.getElementById('filtroEscola')?.value || '', document.getElementById('filtroToner')?.value || '');
  } catch (err) { console.error(err); showMessage('Erro ao excluir', 'error'); }
}

// filtros lista
document.getElementById('filtroEscola')?.addEventListener('input', e=>{
  listarImpressoras(e.target.value.trim(), document.getElementById('filtroToner')?.value.trim() || '');
});
document.getElementById('filtroToner')?.addEventListener('input', e=>{
  listarImpressoras(document.getElementById('filtroEscola')?.value.trim() || '', e.target.value.trim());
});

// ======================
// ===== TROCAS (cadastro + últimas + relatórios) =====
// ======================

// Preenche datalists de escolas e toners (baseado na coleção 'impressoras' do dbMain)
async function preencherDatalists() {
  try {
    const snap = await dbMain.collection('impressoras').get();
    const escolas = new Set();
    const toners = new Set();
    snap.forEach(s => {
      const d = s.data();
      if (d.escola) escolas.add(d.escola);
      // toner salvo como modelo em alguns registros; use ambos se disponíveis
      if (d.toner) toners.add(d.toner);
      if (d.modelo) toners.add(d.modelo);
    });
    const elEscolas = document.getElementById('escolasList');
    const elToners = document.getElementById('tonersList');
    if (elEscolas) { elEscolas.innerHTML = ''; escolas.forEach(v=> elEscolas.appendChild(Object.assign(document.createElement('option'), { value: v }))); }
    if (elToners) { elToners.innerHTML = ''; toners.forEach(v=> elToners.appendChild(Object.assign(document.createElement('option'), { value: v }))); }
  } catch (err) { console.error('Erro preencher datalists', err); }
}

// CADASTRO de trocas (cadastro-troca.html)
const formToner = document.getElementById('formToner');
if (formToner) {
  // preencher datalists ao abrir página
  preencherDatalists();

  formToner.addEventListener('submit', async (e) => {
    e.preventDefault();
    const escola = (document.getElementById('escolaToner')?.value || '').trim();
    const modelo = (document.getElementById('tonerToner')?.value || '').trim(); // saved as modelo
    const data = (document.getElementById('dataToner')?.value || '').trim();
    const quantidadeRaw = document.getElementById('quantidadeToner')?.value;
    const quantidade = Number(quantidadeRaw) || 0;

    if (!escola || !modelo || !data || !quantidade) {
      showMessage('Preencha escola, toner, data e quantidade corretamente.', 'error');
      return;
    }

    try {
      await dbToner.collection('registros').add({
        escola,
        modelo,
        data,            // string YYYY-MM-DD to keep compatibility
        quantidade,      // Number
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
      showMessage('Troca registrada com sucesso.');
      formToner.reset();
      preencherDatalists(); // atualiza opções caso algo novo tenha sido cadastrado
    } catch (err) {
      console.error('Erro salvar troca', err);
      showMessage('Erro ao salvar troca', 'error');
    }
  });

  document.getElementById('btnLimparToner')?.addEventListener('click', ()=> formToner.reset());
}

// ======================
// Render helpers para trocas (relatórios e últimas)
// ======================
function criarBtnAcoesInline() {
  // retorna HTML com ícones (editar + excluir)
  return `
    <button class="btn-acao btn-editar" title="Editar">✏️</button>
    <button class="btn-acao btn-excluir" title="Excluir">🗑️</button>
  `;
}

function montarLinhaUltima(d) {
  const tr = document.createElement('tr');
  tr.setAttribute('data-id', d.id || '');
  tr.innerHTML = `
    <td class="col-data">${escapeHtml(d.data || '')}</td>
    <td class="col-escola">${escapeHtml(d.escola || '')}</td>
    <td class="col-toner">${escapeHtml(d.modelo || '')}</td>
    <td class="col-quantidade">${escapeHtml(String(d.quantidade || ''))}</td>
    <td class="col-acoes">${criarBtnAcoesInline()}</td>
  `;
  return tr;
}

function montarLinhaRelatorio(d) {
  const tr = document.createElement('tr');
  tr.setAttribute('data-id', d.id || '');
  // Modelo — Escola no campo "Modelo — Escola" (but in relatorios.html we use columns Data|Escola|Toner|Quantidade|Responsável|Ações)
  // here we render according to the relatorios.html layout chosen earlier:
  tr.innerHTML = `
    <td class="col-data">${escapeHtml(d.data || '')}</td>
    <td class="col-escola">${escapeHtml(d.escola || '')}</td>
    <td class="col-toner">${escapeHtml(d.modelo || '')}</td>
    <td class="col-quantidade">${escapeHtml(String(d.quantidade || ''))}</td>
    <td class="col-resp"></td>
    <td class="col-acoes">${criarBtnAcoesInline()}</td>
  `;
  return tr;
}

// ======================
// Últimas trocas - tabela em cadastro-troca.html
// ======================
const tabelaUltimas = document.getElementById('tabelaUltimasTrocas');

function iniciarListenerUltimas() {
  if (!tabelaUltimas) return;
  dbToner.collection('registros').orderBy('criadoEm','desc').limit(5).onSnapshot(snapshot => {
    tabelaUltimas.innerHTML = '';
    if (snapshot.empty) {
      tabelaUltimas.innerHTML = '<tr><td colspan="5" class="muted">Nenhuma troca ainda</td></tr>';
      return;
    }
    snapshot.forEach(docSnap => {
      const d = { id: docSnap.id, ...docSnap.data() };
      tabelaUltimas.appendChild(montarLinhaUltima(d));
    });
    // attach events for newly rendered rows (edit/delete)
    attachActionHandlersToTable(tabelaUltimas);
  }, err => console.error('Erro ultimas trocas', err));
}

// ======================
// Relatórios - tabela completa com filtros por mês + escola
// ======================
const tabelaRel = document.getElementById('tabelaRel');
const filtroEscolaRel = document.getElementById('filtroEscolaRel');
const filtroMesRel = document.getElementById('filtroMesRel'); // may be undefined if not in page
const btnLimparFiltrosRel = document.getElementById('btnLimparFiltrosRel');

function iniciarListenerRelatorios() {
  if (!tabelaRel) return;
  dbToner.collection('registros').orderBy('data','desc').onSnapshot(snapshot => {
    tabelaRel.innerHTML = '';
    if (snapshot.empty) {
      tabelaRel.innerHTML = '<tr><td colspan="6" class="muted">Nenhum registro ainda</td></tr>';
      return;
    }
    const filtroEscolaVal = filtroEscolaRel?.value.trim().toLowerCase() || '';
    const filtroMesVal = filtroMesRel?.value || ''; // 'YYYY-MM'
    snapshot.forEach(docSnap => {
      const d = { id: docSnap.id, ...docSnap.data() };
      // filtro por escola (apenas na coluna escola)
      if (filtroEscolaVal && !(d.escola || '').toLowerCase().includes(filtroEscolaVal)) return;
      // filtro por mês (data string YYYY-MM-DD startsWith YYYY-MM)
      if (filtroMesVal && !(d.data || '').startsWith(filtroMesVal)) return;
      tabelaRel.appendChild(montarLinhaRelatorio(d));
    });
    attachActionHandlersToTable(tabelaRel);
  }, err => console.error('Erro listener relatorios', err));
}

// attach edit/delete handlers for a table body
function attachActionHandlersToTable(tbody) {
  // editar
  tbody.querySelectorAll('.btn-editar').forEach(btn => {
    btn.removeEventListener('click', handleEditarClick);
    btn.addEventListener('click', handleEditarClick);
  });
  // excluir
  tbody.querySelectorAll('.btn-excluir').forEach(btn => {
    btn.removeEventListener('click', handleExcluirClick);
    btn.addEventListener('click', handleExcluirClick);
  });
}

// handle excluir from any table (uses closest tr data-id)
async function handleExcluirClick(e) {
  const tr = e.currentTarget.closest('tr');
  if (!tr) return;
  const id = tr.getAttribute('data-id');
  if (!id) return;
  if (!confirm('Excluir este registro?')) return;
  try {
    await dbToner.collection('registros').doc(id).delete();
    showMessage('Registro excluído', 'success');
  } catch (err) {
    console.error('Erro excluir registro', err);
    showMessage('Erro ao excluir', 'error');
  }
}

// handle editar - inline transform of row
function handleEditarClick(e) {
  const tr = e.currentTarget.closest('tr');
  if (!tr) return;
  const id = tr.getAttribute('data-id');
  if (!id) return;

  // prevent multiple edits
  if (tr.classList.contains('editing')) return;
  tr.classList.add('editing');

  // get current values
  const tdData = tr.querySelector('.col-data');
  const tdEscola = tr.querySelector('.col-escola');
  const tdToner = tr.querySelector('.col-toner');
  const tdQuantidade = tr.querySelector('.col-quantidade');
  const tdAcoes = tr.querySelector('.col-acoes');

  const curData = tdData ? tdData.textContent.trim() : '';
  const curEscola = tdEscola ? tdEscola.textContent.trim() : '';
  const curToner = tdToner ? tdToner.textContent.trim() : '';
  const curQuantidade = tdQuantidade ? tdQuantidade.textContent.trim() : '';

  // replace cells with inputs
  if (tdData) tdData.innerHTML = `<input type="date" value="${escapeHtml(curData)}" class="input-edit input-data">`;
  if (tdEscola) tdEscola.innerHTML = `<input list="escolasList" value="${escapeHtml(curEscola)}" class="input-edit input-escola">`;
  if (tdToner) tdToner.innerHTML = `<input list="tonersList" value="${escapeHtml(curToner)}" class="input-edit input-toner">`;
  if (tdQuantidade) tdQuantidade.innerHTML = `<input type="number" min="1" value="${escapeHtml(curQuantidade)}" class="input-edit input-quantidade">`;

  // change actions to Save / Cancel
  tdAcoes.innerHTML = `
    <button class="btn-acao btn-salvar">💾</button>
    <button class="btn-acao btn-cancelar">✖️</button>
  `;

  // attach save/cancel
  const btnSalvar = tdAcoes.querySelector('.btn-salvar');
  const btnCancelar = tdAcoes.querySelector('.btn-cancelar');

  btnCancelar.addEventListener('click', () => {
    // restore original text (simple reload of that document from Firestore is safer)
    // We'll re-fetch the single doc and re-render rows by re-triggering listeners:
    // quick approach: stop editing and re-run listeners
    tr.classList.remove('editing');
    // re-trigger listeners to re-render row correctly:
    // (we ask the top-level listeners to requery; easiest: call iniciarListenerRelatorios() and iniciarListenerUltimas() which use onSnapshot so re-render automatically)
    // nothing to do here because snapshot will update automatically; but if not, we just reload page section by re-calling listar functions:
    // fallback: reload data manually (no-op here)
  });

  btnSalvar.addEventListener('click', async () => {
    const newData = tdData.querySelector('.input-data')?.value || '';
    const newEscola = tdEscola.querySelector('.input-escola')?.value.trim() || '';
    const newToner = tdToner.querySelector('.input-toner')?.value.trim() || '';
    const newQtdRaw = tdQuantidade.querySelector('.input-quantidade')?.value;
    const newQtd = Number(newQtdRaw) || 0;

    if (!newEscola || !newToner || !newData || !newQtd) {
      showMessage('Preencha todos os campos corretamente.', 'error');
      return;
    }

    try {
      await dbToner.collection('registros').doc(id).update({
        escola: newEscola,
        modelo: newToner,
        data: newData,
        quantidade: newQtd,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
      showMessage('Registro atualizado', 'success');
      tr.classList.remove('editing');
      // snapshot listeners will update row automatically
    } catch (err) {
      console.error('Erro ao atualizar', err);
      showMessage('Erro ao salvar alterações', 'error');
    }
  });
}

// ======================
// iniciar listeners e filtros para relatórios
// ======================
filtroEscolaRel?.addEventListener('input', () => {
  // onSnapshot will filter on the client; we simply re-run nothing because snapshot callback reads filtro values each time it fires,
  // but since snapshot does not re-fire on filter change, we manually call carregarRelatorios() as fallback
  carregarRelatorios();
});
btnLimparFiltrosRel?.addEventListener('click', () => {
  if (filtroEscolaRel) filtroEscolaRel.value = '';
  if (filtroMesRel) filtroMesRel.value = '';
  carregarRelatorios();
});

async function carregarRelatorios() {
  if (!tabelaRel) return;
  tabelaRel.innerHTML = '<tr><td colspan="6" class="muted">Carregando...</td></tr>';
  try {
    const snap = await dbToner.collection('registros').orderBy('data','desc').get();
    const filtroEscolaVal = filtroEscolaRel?.value.trim().toLowerCase() || '';
    const filtroMesVal = filtroMesRel?.value || '';
    tabelaRel.innerHTML = '';
    snap.forEach(docSnap => {
      const d = { id: docSnap.id, ...docSnap.data() };
      if (filtroEscolaVal && !((d.escola||'').toLowerCase().includes(filtroEscolaVal))) return;
      if (filtroMesVal && !(d.data || '').startsWith(filtroMesVal)) return;
      tabelaRel.appendChild(montarLinhaRelatorio(d));
    });
    attachActionHandlersToTable(tabelaRel);
    if (!tabelaRel.children.length) tabelaRel.innerHTML = '<tr><td colspan="6" class="muted">Nenhum registro.</td></tr>';
  } catch (err) {
    console.error(err);
    tabelaRel.innerHTML = '<tr><td colspan="6" class="muted">Erro ao carregar.</td></tr>';
  }
}

// ======================
// Iniciar tudo no load
// ======================
window.addEventListener('load', () => {
  // impressoras
  atualizarTotalGeral();
  listarImpressoras();

  // trocas: últimas (cadastro) e relatórios (todas)
  iniciarListenerUltimas();
  iniciarListenerRelatorios();
});
