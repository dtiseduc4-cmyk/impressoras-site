// ======================
// 🔥 FIREBASE IMPRESSORAS
// ======================
const appMain = firebase.initializeApp({
  apiKey: "AIzaSyBtGCOAMROoG1KhCZyaMd5Scbgi0aVpPak",
  authDomain: "controleimpressoras.firebaseapp.com",
  projectId: "controleimpressoras",
}, "main");
const dbMain = firebase.firestore(appMain);

// ======================
// 🔥 FIREBASE TROCAS
// ======================
const appToner = firebase.initializeApp({
  apiKey: "AIzaSyBSAMAhiEbBPCNqNpv-dM64Pa_xclwqc54",
  authDomain: "controletoner.firebaseapp.com",
  projectId: "controletoner",
}, "toner");
const dbToner = firebase.firestore(appToner);

// ======================
// ✅ TOAST
// ======================
function showMessage(msg, type = "success") {
  const div = document.createElement("div");
  div.className = `toast ${type}`;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[m]));
}

// ======================
// 🧮 CONTADORES
// ======================
const totalGeralEl = document.getElementById("totalGeral");
const totalFiltradoEl = document.getElementById("totalFiltrado");

async function atualizarTotalGeral() {
  try {
    const snap = await dbMain.collection("impressoras").get();
    totalGeralEl.textContent = snap.size;
  } catch (e) { console.error(e); }
}

// ======================
// 📋 LISTAR IMPRESSORAS
// ======================
async function listarImpressoras(fEscola = "", fToner = "") {
  const lista = document.getElementById("lista");
  if (!lista) return;

  lista.innerHTML = "";

  let q = dbMain.collection("impressoras");
  if (fEscola) q = q.where("escola", "==", fEscola);
  if (fToner) q = q.where("toner", "==", fToner);

  const snap = await q.get();

  totalFiltradoEl.textContent = snap.size;

  if (snap.empty) {
    lista.innerHTML = `<tr><td colspan="6" class="muted">Nenhuma encontrada</td></tr>`;
    return;
  }

  snap.forEach(doc => {
    const d = doc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.modelo}</td>
      <td>${d.toner}</td>
      <td>${d.escola}</td>
      <td>${d.propriedade}</td>
      <td>${d.dataCadastro ? new Date(d.dataCadastro.seconds*1000).toLocaleString() : ""}</td>
      <td><button class="excluir" data-id="${doc.id}">Excluir</button></td>
    `;
    lista.appendChild(tr);
  });

  document.querySelectorAll(".excluir").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      if (confirm("Excluir?")) {
        await dbMain.collection("impressoras").doc(btn.dataset.id).delete();
        showMessage("Deletado! 🗑️");
        atualizarTotalGeral();
        listarImpressoras(fEscola, fToner);
      }
    });
  });
}

// filtros
const filtroEscola = document.getElementById("filtroEscola");
const filtroToner = document.getElementById("filtroToner");
[filtroEscola, filtroToner].forEach(el => el?.addEventListener("input", () =>
  listarImpressoras(filtroEscola.value, filtroToner.value)
));

// ======================
// 📊 RELATÓRIOS - TEMPO REAL
// ======================
const tabelaRel = document.getElementById("tabelaRel");

if (tabelaRel) {
  dbToner.collection("registros").orderBy("data", "desc").onSnapshot(snap => {
    tabelaRel.innerHTML = "";
    if (snap.empty) {
      tabelaRel.innerHTML = `<tr><td colspan="6" class="muted">Nenhum registro ainda</td></tr>`;
      return;
    }
    snap.forEach(doc => {
      const d = doc.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(d.escola)}</td>
        <td>${escapeHtml(d.toner || d.modelo)}</td>
        <td>${escapeHtml(d.quantidade || "")}</td>
        <td>${escapeHtml(d.data || "")}</td>
        <td>${escapeHtml(d.quem || "")}</td>
        <td>${escapeHtml(d.obs || d.observacao || "")}</td>
      `;
      tabelaRel.appendChild(tr);
    });
  });
}

// ======================
// ▶️ OnLoad
// ======================
window.addEventListener("load", () => {
  atualizarTotalGeral();
  listarImpressoras();
});
