<template>
  <div class="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-800 font-sans">
    <div class="max-w-7xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200">

      <div class="text-center mb-8">
        <h1 class="text-3xl font-extrabold text-blue-700 tracking-tight mb-2">Conciliação Financeira v8.2</h1>
        <p class="text-slate-500">Motor de Sanitização e Correlação | Margem de R$ 0,10 | Agrupamento Ativo</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <label
            class="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
            :class="files.extrato ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'">
          <span class="text-lg font-bold text-blue-700 mb-1">Extrato Bancário</span>
          <input type="file" accept=".pdf" @change="e => handleFile(e, 'extrato')" class="hidden"/>
          <span class="text-xs text-slate-500 text-center">{{
              files.extrato ? files.extrato.name : 'Selecionar Extrato'
            }}</span>
        </label>
        <label
            class="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
            :class="files.projuris ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'">
          <span class="text-lg font-bold text-emerald-700 mb-1">Projuris (Venc. 05)</span>
          <input type="file" accept=".pdf" @change="e => handleFile(e, 'projuris')" class="hidden"/>
          <span class="text-xs text-slate-500 text-center">{{
              files.projuris ? files.projuris.name : 'Selecionar Projuris'
            }}</span>
        </label>
        <label
            class="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
            :class="files.repasses ? 'border-purple-500 bg-purple-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'">
          <span class="text-lg font-bold text-purple-700 mb-1">Repasses/Indicações</span>
          <input type="file" accept=".pdf" @change="e => handleFile(e, 'repasses')" class="hidden"/>
          <span class="text-xs text-slate-500 text-center">{{
              files.repasses ? files.repasses.name : 'Selecionar Repasses'
            }}</span>
        </label>
      </div>

      <button @click="processAndReconcile"
              class="w-full bg-slate-800 hover:bg-black text-white font-bold py-4 rounded-lg shadow-md transition-all uppercase tracking-widest"
              :disabled="isProcessing">
        {{ isProcessing ? 'Processando Dados...' : 'Iniciar Conferência' }}
      </button>

      <div v-if="logs.length > 0"
           class="mt-8 bg-slate-900 text-blue-300 p-4 rounded-lg font-mono text-xs h-40 overflow-y-auto shadow-inner">
        <div v-for="(log, index) in logs" :key="index" class="mb-1">
          <span class="text-slate-500">[{{ new Date().toLocaleTimeString() }}]</span>
          <span class="ml-2">{{ log }}</span>
        </div>
      </div>

      <div v-if="results" class="mt-10 space-y-10">
        <section v-if="results.entradasOk.length">
          <h2 class="text-xl font-bold text-emerald-700 mb-4 flex items-center">
            <span class="bg-emerald-100 px-3 py-1 rounded-full mr-2">{{ results.entradasOk.length }}</span> Entradas OK
          </h2>
          <div class="grid grid-cols-1 gap-3">
            <div v-for="(item, i) in results.entradasOk" :key="i"
                 class="bg-white border-l-4 border-emerald-500 p-4 shadow-sm rounded-r-lg hover:shadow-md transition-shadow">
              <div class="flex justify-between font-bold text-slate-800">
                <span class="uppercase">{{ item.cliente }}</span>
                <span class="text-emerald-600">Pasta: {{ item.pasta }}</span>
              </div>
              <p class="mt-1 text-sm font-mono font-bold text-blue-700">{{ item.resumoValores }}</p>
              <div
                  class="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-line">
                {{ item.detalhes }}
              </div>
            </div>
          </div>
        </section>

        <section v-if="results.reembolsos.length">
          <h2 class="text-xl font-bold text-blue-700 mb-4 flex items-center">
            <span class="bg-blue-100 px-3 py-1 rounded-full mr-2">{{ results.reembolsos.length }}</span> Créditos Sem
            Correspondência
          </h2>
          <div class="bg-white rounded-lg shadow-sm border border-blue-100 overflow-hidden">
            <table class="w-full text-left border-collapse">
              <thead>
              <tr class="bg-blue-50 text-blue-700 text-xs uppercase font-bold">
                <th class="p-3">Origem no Extrato</th>
                <th class="p-3 text-right">Valor Total</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="(item, i) in results.reembolsos" :key="i"
                  class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td class="p-3 text-sm text-slate-600">{{ item.nome }}</td>
                <td class="p-3 text-sm font-bold text-right text-blue-600">R$ {{ item.valorFormatado }}</td>
              </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref} from 'vue';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const files = ref({extrato: null, projuris: null, repasses: null});
const isProcessing = ref(false);
const logs = ref([]);
const results = ref(null);

const addLog = async (m) => {
  logs.value.push(m);
  await new Promise(r => setTimeout(r, 10));
};

const handleFile = (e, t) => {
  if (e.target.files[0]) files.value[t] = e.target.files[0];
};

const parseMoney = (s) => {
  if (!s) return 0;
  let clean = s.replace(/R\$/g, '').replace(/[^\d,.-]/g, '').trim();
  if (clean.includes(',') && clean.includes('.')) clean = clean.replace(/\./g, '').replace(',', '.');
  else clean = clean.replace(',', '.');
  return Math.round(parseFloat(clean) * 100) / 100;
};

const formatMoney = (v) => v.toLocaleString('pt-BR', {minimumFractionDigits: 2});

// Função de Sanitização: Remove pedaços inúteis e rankeia palavras
const sanitizeText = (text) => {
  if (!text) return [];
  let clean = text.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9]/g, ' '); // Mantém apenas alfanuméricos

  // Dicionário de Stop Words (Palavras a serem ignoradas)
  const stopWords = ['de', 'do', 'da', 'dos', 'das', 'x', 'sa', 'ltda', 'me', 'eireli', 'inss', 'honorarios', 'parcela', 'acordo', 'recebimento', 'pix', 'ted', 'doc', 'credito', 'liquidacao', 'cobranca', 'advogados', 'associados', 'cabrera', 'joana', 'nicolas', 'della', 'casa', 'afonso', 'pinto', 'resultado', 'vencido', 'pago', 'repasse', 'indicacao', 'contratuais', 'fixos', 'consultoria', 'administrativo', 'e'];

  let words = clean.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));
  return [...new Set(words)]; // Retorna palavras únicas
};

// Algoritmo de Subconjuntos: Busca combinações de frações caso a pasta não seja paga inteira
const findSubsets = (arr, target) => {
  const result = [];
  const search = (idx, current, currentSum) => {
    if (Math.abs(currentSum - target) <= 0.10) {
      result.push([...current]);
      return;
    }
    if (currentSum > target + 0.10 || idx >= arr.length) return;

    current.push(arr[idx]);
    search(idx + 1, current, currentSum + arr[idx].valor);
    current.pop();
    search(idx + 1, current, currentSum);
  };
  const sortedArr = [...arr].sort((a, b) => b.valor - a.valor);
  search(0, [], 0);
  return result;
};

const readPDF = async (file) => {
  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.onload = async (e) => {
      const pdf = await pdfjsLib.getDocument(new Uint8Array(e.target.result)).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + ' \n ';
      }
      resolve(text.toUpperCase());
    };
    reader.readAsArrayBuffer(file);
  });
};

const processAndReconcile = async () => {
  if (!files.value.extrato || !files.value.projuris) return alert("Selecione os arquivos obrigatórios.");
  isProcessing.value = true;
  logs.value = [];
  results.value = null;

  try {
    const [txtExt, txtPro, txtRep] = await Promise.all([
      readPDF(files.value.extrato),
      readPDF(files.value.projuris),
      files.value.repasses ? readPDF(files.value.repasses) : Promise.resolve("")
    ]);

    await addLog("Extraindo e Sanitizando Projuris...");
    const projurisPorPasta = {};
    const proRegex = /(CABRERA|JOANA|NICOLAS|ASSOCIADOS|ESCRIT).*?(\d{3,5}).*?R\$\s*([\d., ]+)/gi;
    let m;
    while ((m = proRegex.exec(txtPro)) !== null) {
      const origem = m[1].toUpperCase();
      const pasta = m[2];
      const valor = parseMoney(m[3]);
      const contexto = txtPro.substring(Math.max(0, m.index - 150), Math.min(txtPro.length, m.index + 150));

      if (!projurisPorPasta[pasta]) {
        projurisPorPasta[pasta] = {itens: [], total: 0, words: []};
      }
      projurisPorPasta[pasta].itens.push({origem, valor, usado: false});
      projurisPorPasta[pasta].total += valor;
      projurisPorPasta[pasta].words.push(...sanitizeText(contexto));
    }

    // De-duplicar palavras por pasta
    for (const p in projurisPorPasta) {
      projurisPorPasta[p].words = [...new Set(projurisPorPasta[p].words)];
    }

    await addLog("Extraindo Repasses...");
    const repassesPorPasta = {};
    if (txtRep) {
      const repRegex = /(\d{3,5})[\s\S]{1,50}?R\$\s*([\d., ]+)/gi;
      let mRep;
      while ((mRep = repRegex.exec(txtRep)) !== null) {
        const pasta = mRep[1];
        const valor = parseMoney(mRep[2]);
        if (!repassesPorPasta[pasta]) repassesPorPasta[pasta] = 0;
        repassesPorPasta[pasta] += valor;
      }
    }

    await addLog("Agrupando Múltiplos Pagamentos do Extrato...");
    const extratoAgrupado = {};

    // Coleta PIX
    const pixRegex = /RECEBIMENTO PIX (.*?) (?:[\*|\d]|$).*?R\$\s*([\d., ]+?)C/gi;
    let ex;
    while ((ex = pixRegex.exec(txtExt)) !== null) {
      const nomeLimpo = ex[1].replace(/[\d\*]/g, '').trim();
      const valor = parseMoney(ex[2]);
      if (!extratoAgrupado[nomeLimpo]) extratoAgrupado[nomeLimpo] = {total: 0, qtd: 0, words: sanitizeText(nomeLimpo)};
      extratoAgrupado[nomeLimpo].total += valor;
      extratoAgrupado[nomeLimpo].qtd += 1;
    }

    // Coleta TED e Diversos
    const tedRegex = /(CRÉD\.TED|LIQUIDAÇÃO|COBRANÇA).*?R\$\s*([\d., ]+?)C/gi;
    while ((ex = tedRegex.exec(txtExt)) !== null) {
      const nome = ex[1].trim();
      const valor = parseMoney(ex[2]);
      if (!extratoAgrupado[nome]) extratoAgrupado[nome] = {total: 0, qtd: 0, words: sanitizeText(nome)};
      extratoAgrupado[nome].total += valor;
      extratoAgrupado[nome].qtd += 1;
    }

    await addLog("Cruzando Informações (Rankeamento por Correlação)...");
    const rel = {entradasOk: [], reembolsos: []};
    const pastasUsadas = new Set();

    for (const [nomeBanco, dadosBanco] of Object.entries(extratoAgrupado)) {
      const valorBanco = Math.round(dadosBanco.total * 100) / 100;
      const wordsBanco = dadosBanco.words;
      let candidatos = [];

      for (const [pasta, dadosPasta] of Object.entries(projurisPorPasta)) {
        if (pastasUsadas.has(pasta)) continue;

        const repasse = repassesPorPasta[pasta] || 0;
        const targetProjuris = Math.round((valorBanco - repasse) * 100) / 100;

        const unusedItems = dadosPasta.itens.filter(i => !i.usado);
        if (unusedItems.length === 0) continue;

        const sumAll = Math.round(unusedItems.reduce((a, b) => a + b.valor, 0) * 100) / 100;
        let validSubset = null;

        // Estratégia 1: Pasta inteira + Repasse
        if (Math.abs(sumAll - targetProjuris) <= 0.10) {
          validSubset = unusedItems;
        }
        // Estratégia 2: Fração da pasta + Repasse
        else {
          const subsets = findSubsets(unusedItems, targetProjuris);
          if (subsets.length > 0) validSubset = subsets[0];
        }

        // Se encontrou combinação matemática válida, calcula o "Score" (Rank de Correlações)
        if (validSubset) {
          let score = 0;
          for (const w of wordsBanco) {
            if (dadosPasta.words.includes(w)) score++;
          }
          candidatos.push({
            pasta,
            score,
            items: validSubset,
            sum: validSubset.reduce((a, b) => a + b.valor, 0) + repasse
          });
        }
      }

      if (candidatos.length > 0) {
        // Rankeia pelo maior Score
        candidatos.sort((a, b) => b.score - a.score);
        const best = candidatos[0];

        // Aceita se tiver alguma palavra correspondente OU se for a única opção possível (ex: Liquidação)
        if (best.score > 0 || candidatos.length === 1) {
          best.items.forEach(i => i.usado = true);

          const allUsed = projurisPorPasta[best.pasta].itens.every(i => i.usado);
          if (allUsed) pastasUsadas.add(best.pasta);

          rel.entradasOk.push({
            cliente: nomeBanco,
            pasta: best.pasta,
            resumoValores: `Banco: R$ ${formatMoney(valorBanco)} | Projuris/Repasse: R$ ${formatMoney(best.sum)}`,
            detalhes: `Nível de Correlação: ${best.score > 0 ? best.score + ' palavras chave' : 'Match Exclusivo por Valor'}\nComposição:\n` +
                best.items.map(i => `• ${i.origem}: R$ ${formatMoney(i.valor)}`).join('\n') +
                (dadosBanco.qtd > 1 ? `\n(Agrupado de ${dadosBanco.qtd} créditos no banco)` : '')
          });
        } else {
          rel.reembolsos.push({nome: nomeBanco, valorFormatado: formatMoney(valorBanco)});
        }
      } else {
        rel.reembolsos.push({nome: nomeBanco, valorFormatado: formatMoney(valorBanco)});
      }
    }

    results.value = rel;
    await addLog("Conferência Finalizada!");

  } catch (e) {
    await addLog("Erro: " + e.message);
  } finally {
    isProcessing.value = false;
  }
};
</script>