(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const STORE_KEY = 'tallerCostura.v1';
    const money = n => new Intl.NumberFormat('es-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(Number(n) || 0);
    const todayISO = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    };
    const monthISO = () => todayISO().slice(0, 7);
    const monthName = m => {
        if (!m) return '';
        const [y, mo] = m.split('-').map(Number);
        return new Date(y, mo - 1, 1).toLocaleDateString('es-ES', {
            month: 'long',
            year: 'numeric'
        });
    };
    let state = loadState(),
        photoData = '',
        fjPhotoData = '',
        pendingConfirm = null,
        toastTimer;

    function loadState() {
        try {
            const x = JSON.parse(localStorage.getItem(STORE_KEY));
            if (x && Array.isArray(x.providers) && Array.isArray(x.cuts)) {
                if (!Array.isArray(x.vales)) x.vales = [];
                if (!Array.isArray(x.funcionarios)) x.funcionarios = [];
                if (!Array.isArray(x.funcJobs)) x.funcJobs = [];
                if (!Array.isArray(x.funcVales)) x.funcVales = [];
                return x;
            }
        } catch (e) {}
        return {
            providers: [],
            cuts: [],
            vales: [],
            funcionarios: [],
            funcJobs: [],
            funcVales: [],
            theme: 'light'
        };
    }

    function save() {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(state));
            return true;
        } catch (e) {
            showToast('No se pudo guardar. La foto puede ser demasiado grande; prueba con otra imagen.');
            return false;
        }
    }

    function escapeHTML(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        } [c]));
    }

    function getProvider(id) {
        return state.providers.find(p => p.id === id);
    }

    function getMonthCuts() {
        const m = $('monthFilter').value;
        return state.cuts.filter(c => c.date?.slice(0, 7) === m);
    }

    function cutTotal(c) {
        return (Number(c.pieces) || 0) * (Number(c.price) || 0);
    }

    function getMonthVales(providerId) {
        const m = $('monthFilter').value;
        return (state.vales || []).filter(v => v.date?.startsWith(m) && (!providerId || v.providerId === providerId));
    }

    function valeTotal(list) {
        return (list || []).reduce((s, v) => s + (Number(v.amount) || 0), 0);
    }

    function showToast(msg) {
        const el = $('toast');
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
    }

    function setTab(tab) {
        document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        ['cuts', 'providers', 'reports', 'vales', 'funcs', 'funcJobs', 'funcVales'].forEach(t => {
            const el = $(t + 'Panel');
            if (el) el.classList.toggle('hidden', t !== tab);
        });
        document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('.sidebar-link').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        if (tab === 'providers') renderProviders();
        if (tab === 'reports') renderReports();
        if (tab === 'vales') renderVales();
        if (tab === 'funcs') renderFuncs();
        if (tab === 'funcJobs') renderFuncJobs();
        if (tab === 'funcVales') renderFuncVales();
        closeSidebar();
    }

    function syncProviderSelects() {
        const opts = state.providers.slice().sort((a, b) => a.name.localeCompare(b.name)).map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.name)}</option>`).join('');
        $('cutProvider').innerHTML = '<option value="">Selecciona un proveedor</option>' + opts;
        $('providerFilter').innerHTML = '<option value="">Todos los proveedores</option>' + opts;
        if ($('valeProvider')) $('valeProvider').innerHTML = '<option value="">Selecciona un proveedor</option>' + opts;
        if ($('valeProviderFilter')) $('valeProviderFilter').innerHTML = '<option value="">Todos los proveedores</option>' + opts;
    }

    function renderStats() {
        const cuts = getMonthCuts();
        $('statCuts').textContent = cuts.length.toLocaleString('es-ES');
        $('statPieces').textContent = cuts.reduce((s, c) => s + Number(c.pieces || 0), 0).toLocaleString('es-ES');
        $('statMoney').textContent = money(cuts.reduce((s, c) => s + cutTotal(c), 0));
    }

    function renderCuts() {
        renderStats();
        const m = getMonthCuts();
        const q = $('cutSearch').value.trim().toLocaleLowerCase();
        const pid = $('providerFilter').value;
        const filtered = m.filter(c => (!pid || c.providerId === pid) && (!q || `${c.model} ${getProvider(c.providerId)?.name||''}`.toLocaleLowerCase().includes(q))).sort((a, b) => b.date.localeCompare(a.date));
        $('cutsList').innerHTML = filtered.map(c => {
            const p = getProvider(c.providerId);
            return `<article class="cut-card"><div class="cut-thumb">${c.photo?`<img src="${c.photo}" alt="Modelo ${escapeHTML(c.model)}">`:'✂'}</div><div class="cut-info"><h3>${escapeHTML(c.model)}</h3><div class="cut-meta"><span>♧ ${escapeHTML(p?.name||'Proveedor eliminado')}</span><span>▦ ${Number(c.pieces).toLocaleString('es-ES')} prendas</span><span>${escapeHTML(c.date)}</span></div></div><div class="cut-money"><div><strong>${money(cutTotal(c))}</strong><small>${money(c.price)} / prenda</small></div><div class="cut-actions"><button class="mini-btn" data-edit="${c.id}">Editar</button><button class="mini-btn" data-delete="${c.id}">Eliminar</button></div></div></article>`;
        }).join('');
        $('emptyCuts').classList.toggle('hidden', filtered.length > 0);
        $('cutsList').classList.toggle('hidden', filtered.length === 0);
        $('emptyAddBtn').disabled = state.providers.length === 0;
        if (state.providers.length === 0) {
            $('emptyCuts').querySelector('p').textContent = 'Primero añade un proveedor en la sección Proveedores.';
            $('emptyAddBtn').textContent = 'Ir a proveedores';
        } else {
            $('emptyCuts').querySelector('p').textContent = 'Registra tu primer corte para empezar a calcular la producción.';
            $('emptyAddBtn').textContent = 'Registrar primer corte';
        }
    }

    function renderProviders() {
        const list = $('providersList');
        list.innerHTML = state.providers.slice().sort((a, b) => a.name.localeCompare(b.name)).map(p => {
            const cuts = state.cuts.filter(c => c.providerId === p.id && c.date?.startsWith($('monthFilter').value));
            return `<article class="provider-card"><div class="provider-icon">♧</div><div class="provider-main"><h3>${escapeHTML(p.name)}</h3><p>${cuts.length} cortes este mes · ${money(cuts.reduce((s,c)=>s+cutTotal(c),0))}</p></div><div class="provider-actions"><button class="mini-btn" data-provider-edit="${p.id}">Renombrar</button><button class="mini-btn" data-provider-delete="${p.id}">Eliminar</button></div></article>`;
        }).join('');
        $('emptyProviders').classList.toggle('hidden', state.providers.length > 0);
        list.classList.toggle('hidden', state.providers.length === 0);
    }

    function renderReports() {
        const m = $('monthFilter').value;
        const ps = state.providers.slice().sort((a, b) => a.name.localeCompare(b.name));
        $('reportsList').innerHTML = ps.map(p => {
            const cuts = state.cuts.filter(c => c.providerId === p.id && c.date?.startsWith(m));
            const total = cuts.reduce((s, c) => s + cutTotal(c), 0);
            const valesSum = valeTotal(getMonthVales(p.id));
            const neto = total - valesSum;
            const valesTxt = valesSum > 0 ? ` · Vales ${money(valesSum)}` : '';
            return `<article class="report-card"><div class="provider-icon">▧</div><div class="provider-main"><h3>${escapeHTML(p.name)}</h3><p>${cuts.length} cortes · ${cuts.reduce((s,c)=>s+Number(c.pieces||0),0)} prendas · ${money(total)}${valesTxt}<br><strong>A pagar: ${money(neto)}</strong></p></div><button class="primary" data-pdf="${p.id}" ${cuts.length?'':'disabled'}>Compartir PDF ↗</button></article>`;
        }).join('');
        $('emptyReports').classList.toggle('hidden', ps.length > 0);
        if (!ps.length) $('reportsList').innerHTML = '';
    }

    
    function renderVales() {
        const m = $('monthFilter').value;
        const pid = $('valeProviderFilter') ? $('valeProviderFilter').value : '';
        const list = (state.vales || []).filter(v => v.date?.startsWith(m) && (!pid || v.providerId === pid))
            .sort((a, b) => b.date.localeCompare(a.date) || (b.id || '').localeCompare(a.id || ''));
        const el = $('valesList');
        if (!el) return;
        el.innerHTML = list.map(v => {
            const p = getProvider(v.providerId);
            return `<article class="cut-card vale-card"><div class="cut-thumb vale-thumb">$</div><div class="cut-info"><h3>${money(v.amount)}</h3><div class="cut-meta"><span>♧ ${escapeHTML(p?.name || 'Proveedor eliminado')}</span><span>${escapeHTML(v.date)}</span>${v.note ? `<span>${escapeHTML(v.note)}</span>` : ''}</div></div><div class="cut-money"><div class="cut-actions"><button class="mini-btn" data-vale-edit="${v.id}">Editar</button><button class="mini-btn" data-vale-delete="${v.id}">Eliminar</button></div></div></article>`;
        }).join('');
        const empty = $('emptyVales');
        if (empty) {
            empty.classList.toggle('hidden', list.length > 0);
            el.classList.toggle('hidden', list.length === 0);
        }
    }

    function renderAll() {
        syncProviderSelects();
        renderCuts();
        renderProviders();
        renderReports();
        renderVales();
        renderFuncs();
        renderFuncJobs();
        renderFuncVales();
        renderPendingBanner();
    }

    function openCut(c = null, fromJob = null) {
        if (!state.providers.length) {
            showToast('Primero registra un proveedor.');
            setTab('providers');
            $('providerForm').classList.remove('hidden');
            $('providerName').focus();
            return;
        }
        $('cutForm').reset();
        $('cutId').value = c?.id || '';
        $('pendingJobId').value = fromJob?.id || '';
        $('cutModalTitle').textContent = fromJob ? 'Completar corte (desde funcionarios)' : (c ? 'Editar corte' : 'Registrar corte');
        $('cutDate').value = c?.date || fromJob?.date || todayISO();
        $('cutProvider').value = c?.providerId || '';
        $('cutModel').value = c?.model || fromJob?.title || '';
        $('cutPieces').value = c?.pieces ?? fromJob?.pieces ?? '';
        $('cutPrice').value = c?.price ?? '';
        photoData = c?.photo || fromJob?.photo || '';
        updateTotal();
        renderPhotoPreview();
        $('cutModal').classList.remove('hidden');
    }

    function closeCut() {
        $('cutModal').classList.add('hidden');
    }

    function updateTotal() {
        $('cutTotal').textContent = money((Number($('cutPieces').value) || 0) * (Number($('cutPrice').value) || 0));
    }

    function renderPhotoPreview() {
        const has = !!photoData;
        $('photoPreviewWrap').classList.toggle('hidden', !has);
        if (has) $('photoPreview').src = photoData;
    }

    function compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => {
                const img = new Image();
                img.onerror = reject;
                img.onload = () => {
                    const max = 900,
                        scale = Math.min(1, max / Math.max(img.width, img.height));
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(img.width * scale);
                    canvas.height = Math.round(img.height * scale);
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', .78));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function askConfirm(title, text, yes) {
        $('confirmTitle').textContent = title;
        $('confirmText').textContent = text;
        pendingConfirm = yes;
        $('confirmModal').classList.remove('hidden');
    }

    function closeConfirm() {
        $('confirmModal').classList.add('hidden');
        pendingConfirm = null;
    }

    async function exportPDF(providerId, qrKey = 'sergio') {
        const provider = getProvider(providerId),
            m = $('monthFilter').value;
        const cuts = state.cuts.filter(c => c.providerId === providerId && c.date?.startsWith(m)).sort((a, b) => a.date.localeCompare(b.date));
        if (!provider || !cuts.length) {
            showToast('Este proveedor no tiene cortes en el mes seleccionado.');
            return;
        }
        if (!window.jspdf?.jsPDF) {
            showToast('No se pudo cargar el generador de PDF. Comprueba tu conexión e inténtalo de nuevo.');
            return;
        }
        const {
            jsPDF
        } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        const pageW = 210,
            pageH = 297,
            margin = 9;
        let y = 10;
        doc.setFillColor(25, 59, 50);
        doc.roundedRect(margin, y, pageW - margin * 2, 23, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('INFORME MENSUAL DE COSTURA', margin + 5, y + 8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Proveedor: ${provider.name}`, margin + 5, y + 14);
        doc.text(`Mes: ${monthName(m)}`, pageW - margin - 5, y + 14, {
            align: 'right'
        });
        y += 29;
        doc.setTextColor(45, 65, 55);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('FOTO / MODELO', margin + 2, y + 4);
        doc.text('PRENDAS', 100, y + 4, {
            align: 'center'
        });
        doc.text('PRECIO / PRENDA', 137, y + 4, {
            align: 'center'
        });
        doc.text('TOTAL', pageW - margin - 2, y + 4, {
            align: 'right'
        });
        y += 7;
        // Leave space at bottom for totals bar + QR
        const footerY = pageH - 62;
        const available = footerY - y - 4;
        const rowH = Math.min(29, Math.max(13, available / cuts.length));
        let totalPieces = 0,
            totalMoney = 0;
        cuts.forEach((c, i) => {
            if (y + rowH > footerY - 2) return;
            const bg = i % 2 === 0 ? [246, 249, 246] : [255, 255, 255];
            doc.setFillColor(...bg);
            doc.roundedRect(margin, y, pageW - margin * 2, rowH, 1, 1, 'F');
            doc.setDrawColor(225, 233, 227);
            doc.roundedRect(margin, y, pageW - margin * 2, rowH, 1, 1, 'S');
            const photoX = margin + 2,
                photoY = y + 1.5,
                photoW = Math.min(23, rowH - 3),
                photoH = photoW;
            if (c.photo && rowH >= 15) {
                try {
                    doc.addImage(c.photo, 'JPEG', photoX, photoY, photoW, photoH, undefined, 'FAST');
                } catch (e) {}
            } else {
                doc.setFillColor(231, 241, 234);
                doc.rect(photoX, photoY, photoW, Math.min(photoH, rowH - 3), 'F');
            }
            const modelX = photoX + photoW + 3;
            doc.setTextColor(35, 54, 44);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(rowH < 17 ? 7 : 8);
            const modelLines = doc.splitTextToSize(c.model, Math.max(30, 53 - photoW));
            doc.text(modelLines.slice(0, 2), modelX, y + Math.min(7, rowH / 2 + 1));
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            if (rowH >= 18) doc.text(c.date, modelX, y + rowH - 3);
            doc.setFontSize(8);
            doc.text(Number(c.pieces).toLocaleString('es-ES'), 100, y + rowH / 2 + 1, {
                align: 'center'
            });
            doc.text(money(c.price), 137, y + rowH / 2 + 1, {
                align: 'center'
            });
            doc.setFont('helvetica', 'bold');
            doc.text(money(cutTotal(c)), pageW - margin - 2, y + rowH / 2 + 1, {
                align: 'right'
            });
            totalPieces += Number(c.pieces) || 0;
            totalMoney += cutTotal(c);
            y += rowH + 1;
        });
        if (y >= footerY - 2) {
            doc.setFontSize(7);
            doc.setTextColor(170, 50, 50);
            doc.text('Aviso: el número de cortes excede el espacio disponible; algunos registros pueden no aparecer.', margin, y + 3);
        }
        // Vales del proveedor en el mes
        const providerVales = getMonthVales(providerId);
        const valesSum = valeTotal(providerVales);
        const netoPagar = totalMoney - valesSum;

        // Totals bar (left side, narrower to leave room for QR) — más alto para vales
        const sy = pageH - 56;
        const barW = pageW - margin * 2 - 42;
        doc.setFillColor(232, 242, 236);
        doc.roundedRect(margin, sy, barW, 24, 2, 2, 'F');
        doc.setTextColor(45, 105, 85);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(`Cortes: ${cuts.length}  ·  Prendas: ${totalPieces.toLocaleString('es-ES')}`, margin + 4, sy + 5.5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`TOTAL DEL MES: ${money(totalMoney)}`, margin + 4, sy + 11.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 70, 50);
        doc.text(`Vales del mes: ${money(valesSum)}`, margin + 4, sy + 17);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(25, 59, 50);
        doc.text(`TOTAL A PAGAR: ${money(netoPagar)}`, margin + barW - 4, sy + 16.5, {
            align: 'right'
        });
        // QR de pagamento (Pix) en la parte inferior derecha
        try {
            const qrFile = qrKey === 'irma' ? './qr-irma.png' : './qr-sergio.png';
            const qrImg = await loadImage(qrFile);
            const qrSize = 36;
            const qrX = pageW - margin - qrSize;
            const qrY = pageH - 56;
            doc.addImage(qrImg, 'PNG', qrX, qrY, qrSize, qrSize);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.5);
            doc.setTextColor(80, 90, 85);
            const who = qrKey === 'irma' ? 'Irma' : 'Sergio';
            doc.text('Pix · ' + who, qrX + qrSize / 2, qrY + qrSize + 3.5, { align: 'center' });
        } catch (err) {
            console.warn('No se pudo cargar el QR', err);
        }
        doc.setTextColor(120, 130, 123);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.text('Generado desde SY CROP · Valores en reales brasileños (BRL)', pageW / 2, pageH - 4, {
            align: 'center'
        });
        const safe = provider.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
        const filename = `informe-${safe}-${m}.pdf`;
        // Compartir si es posible (WhatsApp, Messenger, etc.), si no descargar
        try {
            const blob = doc.output('blob');
            const file = new File([blob], filename, { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Informe ${provider.name} — ${monthName(m)}`,
                    text: `Informe mensual de costura SY CROP — ${provider.name}`
                });
                showToast('PDF compartido.');
                return;
            }
        } catch (shareErr) {
            if (shareErr && shareErr.name === 'AbortError') {
                showToast('Compartir cancelado.');
                return;
            }
            // fallback to download
        }
        doc.save(filename);
        showToast('PDF generado para ' + provider.name + '.');
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    function openVale(v = null) {
        $('valeId').value = v ? v.id : '';
        $('valeModalTitle').textContent = v ? 'Editar vale' : 'Registrar vale';
        $('valeProvider').value = v ? v.providerId : '';
        $('valeDate').value = v ? v.date : todayISO();
        $('valeAmount').value = v ? v.amount : '';
        $('valeNote').value = v ? (v.note || '') : '';
        $('valeModal').classList.remove('hidden');
        $('valeProvider').focus();
    }
    function closeVale() {
        $('valeModal').classList.add('hidden');
        $('valeForm').reset();
        $('valeId').value = '';
    }


    // —— Funcionarios ——
    const DEFAULT_RECTA = 1.0;
    const DEFAULT_OVER = 0.4;

    function getFunc(id) {
        return (state.funcionarios || []).find(f => f.id === id);
    }

    function pendingFuncJobs() {
        return (state.funcJobs || []).filter(j => j.pendingProvider !== false && !j.linkedCutId);
    }

    function renderPendingBanner() {
        const box = $('pendingJobsBanner');
        if (!box) return;
        const list = pendingFuncJobs().filter(j => {
            const m = $('monthFilter').value;
            return !m || (j.date || '').startsWith(m);
        });
        if (!list.length) {
            box.classList.add('hidden');
            box.innerHTML = '';
            return;
        }
        box.classList.remove('hidden');
        box.innerHTML = `<h3>Pendiente: completar corte de proveedor (${list.length})</h3>` +
            list.map(j => {
                const thumb = j.photo ? `<img src="${j.photo}" alt="">` : `<div style="width:44px;height:44px;border-radius:8px;background:var(--pale);display:grid;place-items:center">✂</div>`;
                return `<div class="pending-item">${thumb}<div class="meta"><strong>${escapeHTML(j.title)}</strong><span class="muted">${j.pieces} prendas · ${escapeHTML(j.date)} · ${money(j.totalPay || 0)}</span></div><button type="button" class="primary" data-complete-job="${j.id}">Completar registro</button></div>`;
            }).join('');
    }

    function renderFuncs() {
        const list = $('funcsList');
        if (!list) return;
        const fs = (state.funcionarios || []).slice().sort((a, b) => a.name.localeCompare(b.name));
        list.innerHTML = fs.map(f => {
            const m = $('monthFilter').value;
            const jobs = (state.funcJobs || []).filter(j => (j.date || '').startsWith(m) && (j.workers || []).some(w => w.funcionarioId === f.id));
            const earned = jobs.reduce((s, j) => {
                const w = (j.workers || []).find(x => x.funcionarioId === f.id);
                return s + (Number(w?.pay) || 0);
            }, 0);
            const vales = (state.funcVales || []).filter(v => v.funcionarioId === f.id && (v.date || '').startsWith(m));
            const valeSum = vales.reduce((s, v) => s + Number(v.amount || 0), 0);
            return `<article class="provider-card"><div class="provider-icon">👤</div><div class="provider-main"><h3>${escapeHTML(f.name)}</h3><p>Este mes: ${money(earned)} · Vales ${money(valeSum)} · Neto ${money(earned - valeSum)}</p></div><div class="provider-actions"><button class="mini-btn" data-func-del="${f.id}">Eliminar</button></div></article>`;
        }).join('');
        $('emptyFuncs').classList.toggle('hidden', fs.length > 0);
        list.classList.toggle('hidden', fs.length === 0);
    }

    function renderFuncJobs() {
        const el = $('funcJobsList');
        if (!el) return;
        const m = $('monthFilter').value;
        const jobs = (state.funcJobs || []).filter(j => (j.date || '').startsWith(m)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        el.innerHTML = jobs.map(j => {
            const names = (j.workers || []).map(w => {
                const f = getFunc(w.funcionarioId);
                const extra = w.machine ? ` (${w.machine})` : '';
                return `${escapeHTML(f?.name || '?')}${extra} ${money(w.pay || 0)}`;
            }).join(' · ');
            const st = j.linkedCutId ? '<span class="badge-done">Corte OK</span>' : '<span class="badge-pending">Pendiente proveedor</span>';
            const thumb = j.photo ? `<img src="${j.photo}" alt="">` : '✂';
            return `<article class="cut-card"><div class="cut-thumb">${typeof thumb === 'string' && thumb.startsWith('<') ? thumb : thumb}</div><div class="cut-info"><h3>${escapeHTML(j.title)} ${st}</h3><div class="cut-meta"><span>${j.pieces} prendas</span><span>${escapeHTML(j.date)}</span><span>${j.payMode === 'por_maquina' ? 'Por máquina' : 'Pago completo'}</span></div><p class="muted" style="margin:6px 0 0;font-size:12px">${names}</p></div><div class="cut-money"><div><strong>${money(j.totalPay)}</strong><small>a pagar</small></div><div class="cut-actions">${!j.linkedCutId ? `<button class="mini-btn" data-complete-job="${j.id}">Completar</button>` : ''}<button class="mini-btn" data-func-job-del="${j.id}">Eliminar</button></div></div></article>`;
        }).join('');
        // fix thumbs with img
        el.querySelectorAll('.cut-thumb').forEach((node, i) => {
            if (jobs[i]?.photo) node.innerHTML = `<img src="${jobs[i].photo}" alt="">`;
        });
        const empty = $('emptyFuncJobs');
        if (empty) {
            empty.classList.toggle('hidden', jobs.length > 0);
            el.classList.toggle('hidden', jobs.length === 0);
        }
        renderPendingBanner();
    }

    function renderFuncVales() {
        const el = $('funcValesList');
        if (!el) return;
        const m = $('monthFilter').value;
        const fid = $('funcValeFilter')?.value || '';
        const list = (state.funcVales || []).filter(v => (v.date || '').startsWith(m) && (!fid || v.funcionarioId === fid)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        el.innerHTML = list.map(v => {
            const f = getFunc(v.funcionarioId);
            return `<article class="cut-card vale-card"><div class="cut-thumb vale-thumb">$</div><div class="cut-info"><h3>${money(v.amount)}</h3><div class="cut-meta"><span>${escapeHTML(f?.name || '?')}</span><span>${escapeHTML(v.date)}</span>${v.note ? `<span>${escapeHTML(v.note)}</span>` : ''}</div></div><div class="cut-money"><div class="cut-actions"><button class="mini-btn" data-func-vale-del="${v.id}">Eliminar</button></div></div></article>`;
        }).join('');
        const empty = $('emptyFuncVales');
        if (empty) {
            empty.classList.toggle('hidden', list.length > 0);
            el.classList.toggle('hidden', list.length === 0);
        }
        const sel = $('funcValeFilter');
        if (sel) {
            const cur = sel.value;
            sel.innerHTML = '<option value="">Todos</option>' + (state.funcionarios || []).map(f => `<option value="${f.id}">${escapeHTML(f.name)}</option>`).join('');
            sel.value = cur;
        }
    }

    function buildWorkerChecks() {
        const box = $('fjWorkersCheck');
        if (!box) return;
        box.innerHTML = (state.funcionarios || []).map(f =>
            `<label><input type="checkbox" value="${f.id}"> ${escapeHTML(f.name)}</label>`
        ).join('') || '<p class="muted">Primero añade funcionarios en Equipo.</p>';
    }

    function addMachineRow(data = {}) {
        const wrap = $('fjMachineRows');
        if (!wrap) return;
        const row = document.createElement('div');
        row.className = 'machine-row';
        const opts = (state.funcionarios || []).map(f =>
            `<option value="${f.id}" ${data.funcionarioId === f.id ? 'selected' : ''}>${escapeHTML(f.name)}</option>`
        ).join('');
        row.innerHTML = `
          <label>Persona<select class="fj-person" required><option value="">—</option>${opts}</select></label>
          <label>Máquina<select class="fj-machine"><option value="recta" ${data.machine === 'recta' ? 'selected' : ''}>Recta</option><option value="over" ${data.machine === 'over' ? 'selected' : ''}>Over</option></select></label>
          <label>Prendas<input type="number" class="fj-pcs" min="0" step="1" value="${data.pieces ?? ''}" placeholder="0"></label>`;
        wrap.appendChild(row);
        row.querySelectorAll('input,select').forEach(el => el.addEventListener('input', calcMachineTotal));
        calcMachineTotal();
    }

    function calcMachineTotal() {
        let total = 0;
        document.querySelectorAll('#fjMachineRows .machine-row').forEach(row => {
            const machine = row.querySelector('.fj-machine')?.value;
            const pcs = Number(row.querySelector('.fj-pcs')?.value) || 0;
            const rate = machine === 'over' ? DEFAULT_OVER : DEFAULT_RECTA;
            total += pcs * rate;
        });
        if ($('fjCalcTotal')) $('fjCalcTotal').textContent = money(total);
        return total;
    }

    function togglePayMode() {
        const mode = $('fjPayMode')?.value;
        $('fjCompletoBox')?.classList.toggle('hidden', mode !== 'completo');
        $('fjMaquinaBox')?.classList.toggle('hidden', mode !== 'por_maquina');
        if (mode === 'por_maquina' && $('fjMachineRows') && !$('fjMachineRows').children.length) {
            addMachineRow();
        }
    }

    function openFuncJob() {
        if (!(state.funcionarios || []).length) {
            showToast('Primero añade funcionarios en Equipo.');
            setTab('funcs');
            return;
        }
        $('funcJobForm').reset();
        $('funcJobId').value = '';
        $('fjDate').value = todayISO();
        fjPhotoData = '';
        $('fjPhotoWrap').classList.add('hidden');
        $('fjMachineRows').innerHTML = '';
        buildWorkerChecks();
        $('fjPayMode').value = 'completo';
        togglePayMode();
        $('funcJobModal').classList.remove('hidden');
    }

    function closeFuncJob() {
        $('funcJobModal').classList.add('hidden');
    }

    function openSidebar() {
        $('sidebar')?.classList.add('open');
        $('sidebarOverlay')?.classList.remove('hidden');
        $('sidebar')?.setAttribute('aria-hidden', 'false');
    }
    function closeSidebar() {
        $('sidebar')?.classList.remove('open');
        $('sidebarOverlay')?.classList.add('hidden');
        $('sidebar')?.setAttribute('aria-hidden', 'true');
    }


    document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    $('monthFilter').value = monthISO();
    $('monthFilter').addEventListener('change', renderAll);
    $('cutSearch').addEventListener('input', renderCuts);
    $('providerFilter').addEventListener('change', renderCuts);
    $('addCutBtn').addEventListener('click', () => openCut());
    $('emptyAddBtn').addEventListener('click', () => state.providers.length ? openCut() : setTab('providers'));
    $('closeCut').addEventListener('click', closeCut);
    $('cancelCut').addEventListener('click', closeCut);
    $('cutPieces').addEventListener('input', updateTotal);
    $('cutPrice').addEventListener('input', updateTotal);
    $('cutPhoto').addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Selecciona un archivo de imagen.');
            return;
        }
        if (file.size > 12 * 1024 * 1024) {
            showToast('La imagen supera 12 MB. Elige una foto más pequeña.');
            e.target.value = '';
            return;
        }
        try {
            photoData = await compressImage(file);
            renderPhotoPreview();
        } catch (err) {
            showToast('No se pudo leer esa imagen.');
        }
    });
    $('removePhoto').addEventListener('click', () => {
        photoData = '';
        $('cutPhoto').value = '';
        renderPhotoPreview();
    });
    $('cutForm').addEventListener('submit', e => {
        e.preventDefault();
        const id = $('cutId').value || crypto.randomUUID();
        const old = state.cuts.find(c => c.id === id);
        const c = {
            id,
            providerId: $('cutProvider').value,
            date: $('cutDate').value,
            model: $('cutModel').value.trim(),
            pieces: Number($('cutPieces').value),
            price: Number($('cutPrice').value),
            photo: photoData || '',
            createdAt: old?.createdAt || new Date().toISOString()
        };
        if (!c.providerId || !c.date || !c.model || !Number.isFinite(c.pieces) || c.pieces < 1 || !Number.isFinite(c.price) || c.price < 0) {
            showToast('Revisa los campos obligatorios.');
            return;
        }
        const ix = state.cuts.findIndex(x => x.id === id);
        if (ix >= 0) state.cuts[ix] = c;
        else state.cuts.push(c);
        const jobId = $('pendingJobId').value;
        if (jobId && state.funcJobs) {
            const job = state.funcJobs.find(j => j.id === jobId);
            if (job) {
                job.linkedCutId = c.id;
                job.pendingProvider = false;
            }
        }
        if (!save()) return;
        closeCut();
        renderAll();
        showToast(ix >= 0 ? 'Corte actualizado.' : 'Corte guardado.');
    });
    $('addProviderBtn').addEventListener('click', () => {
        $('providerForm').classList.remove('hidden');
        $('providerName').focus();
    });
    $('cancelProvider').addEventListener('click', () => {
        $('providerForm').classList.add('hidden');
        $('providerForm').reset();
    });
    $('providerForm').addEventListener('submit', e => {
        e.preventDefault();
        const name = $('providerName').value.trim();
        if (!name) return;
        if (state.providers.some(p => p.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
            showToast('Ya existe un proveedor con ese nombre.');
            return;
        }
        state.providers.push({
            id: crypto.randomUUID(),
            name,
            createdAt: new Date().toISOString()
        });
        if (!save()) return;
        $('providerForm').reset();
        $('providerForm').classList.add('hidden');
        renderAll();
        showToast('Proveedor añadido.');
    });
    $('cutsList').addEventListener('click', e => {
        const edit = e.target.closest('[data-edit]'),
            del = e.target.closest('[data-delete]');
        if (edit) {
            const c = state.cuts.find(c => c.id === edit.dataset.edit);
            if (c) openCut(c);
        }
        if (del) {
            const c = state.cuts.find(c => c.id === del.dataset.delete);
            if (c) askConfirm('Eliminar corte', '¿Eliminar el corte “' + c.model + '”? Esta acción no se puede deshacer.', () => {
                state.cuts = state.cuts.filter(x => x.id !== c.id);
                save();
                renderAll();
                showToast('Corte eliminado.');
            });
        }
    });
    $('providersList').addEventListener('click', e => {
        const edit = e.target.closest('[data-provider-edit]'),
            del = e.target.closest('[data-provider-delete]');
        if (edit) {
            const p = getProvider(edit.dataset.providerEdit);
            if (!p) return;
            const name = prompt('Nuevo nombre del proveedor:', p.name);
            if (name === null) return;
            const trimmed = name.trim();
            if (!trimmed) {
                showToast('El nombre no puede estar vacío.');
                return;
            }
            if (state.providers.some(x => x.id !== p.id && x.name.toLowerCase() === trimmed.toLowerCase())) {
                showToast('Ya existe un proveedor con ese nombre.');
                return;
            }
            p.name = trimmed;
            save();
            renderAll();
            showToast('Proveedor actualizado.');
        }
        if (del) {
            const p = getProvider(del.dataset.providerDelete);
            if (!p) return;
            const count = state.cuts.filter(c => c.providerId === p.id).length;
            askConfirm('Eliminar proveedor', `¿Eliminar “${p.name}”? También se eliminarán ${count} corte(s) asociado(s). Esta acción no se puede deshacer.`, () => {
                state.providers = state.providers.filter(x => x.id !== p.id);
                state.cuts = state.cuts.filter(c => c.providerId !== p.id);
                state.vales = (state.vales || []).filter(v => v.providerId !== p.id);
                save();
                renderAll();
                showToast('Proveedor eliminado.');
            });
        }
    });
    $('reportsList').addEventListener('click', e => {
        const b = e.target.closest('[data-pdf]');
        if (b) openQrChoice(b.dataset.pdf);
    });
    $('closeConfirm').addEventListener('click', closeConfirm);
    $('confirmNo').addEventListener('click', closeConfirm);
    $('confirmYes').addEventListener('click', () => {
        const fn = pendingConfirm;
        closeConfirm();
        if (fn) fn();
    });
    $('themeBtn').addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.body.classList.toggle('dark', state.theme === 'dark');
        $('themeBtn').textContent = state.theme === 'dark' ? '☾' : '☼';
        save();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeCut();
            closeConfirm();
            closeQrChoice();
            closeVale();
            closeFuncJob();
            $('funcValeModal')?.classList.add('hidden');
            closeSidebar();
        }
    });
    document.body.classList.toggle('dark', state.theme === 'dark');
    $('themeBtn').textContent = state.theme === 'dark' ? '☾' : '☼';


    let pendingPdfProviderId = null;
    function openQrChoice(providerId) {
        pendingPdfProviderId = providerId;
        const modal = $('qrChoiceModal');
        if (modal) modal.classList.remove('hidden');
    }
    function closeQrChoice() {
        pendingPdfProviderId = null;
        const modal = $('qrChoiceModal');
        if (modal) modal.classList.add('hidden');
    }
    const closeQrBtn = $('closeQrChoice');
    if (closeQrBtn) closeQrBtn.addEventListener('click', closeQrChoice);
    const cancelQrBtn = $('cancelQrChoice');
    if (cancelQrBtn) cancelQrBtn.addEventListener('click', closeQrChoice);
    document.querySelectorAll('.qr-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const qr = btn.dataset.qr;
            const pid = pendingPdfProviderId;
            closeQrChoice();
            if (pid) exportPDF(pid, qr);
        });
    });


    // —— Vales ——
    if ($('addValeBtn')) $('addValeBtn').addEventListener('click', () => {
        if (!state.providers.length) { setTab('providers'); showToast('Primero añade un proveedor.'); return; }
        openVale();
    });
    if ($('emptyAddValeBtn')) $('emptyAddValeBtn').addEventListener('click', () => {
        if (!state.providers.length) { setTab('providers'); return; }
        openVale();
    });
    if ($('closeVale')) $('closeVale').addEventListener('click', closeVale);
    if ($('cancelVale')) $('cancelVale').addEventListener('click', closeVale);
    if ($('valeProviderFilter')) $('valeProviderFilter').addEventListener('change', renderVales);
    if ($('valeForm')) $('valeForm').addEventListener('submit', e => {
        e.preventDefault();
        const id = $('valeId').value;
        const providerId = $('valeProvider').value;
        const date = $('valeDate').value;
        const amount = Number($('valeAmount').value);
        const note = $('valeNote').value.trim();
        if (!providerId || !date || !(amount > 0)) {
            showToast('Completa proveedor, fecha y monto válido.');
            return;
        }
        if (!state.vales) state.vales = [];
        if (id) {
            const v = state.vales.find(x => x.id === id);
            if (v) {
                v.providerId = providerId;
                v.date = date;
                v.amount = amount;
                v.note = note;
            }
        } else {
            state.vales.push({
                id: 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                providerId,
                date,
                amount,
                note
            });
        }
        save();
        closeVale();
        renderAll();
        showToast(id ? 'Vale actualizado.' : 'Vale registrado.');
    });
    if ($('valesList')) $('valesList').addEventListener('click', e => {
        const edit = e.target.closest('[data-vale-edit]');
        if (edit) {
            const v = (state.vales || []).find(x => x.id === edit.dataset.valeEdit);
            if (v) openVale(v);
            return;
        }
        const del = e.target.closest('[data-vale-delete]');
        if (del) {
            const v = (state.vales || []).find(x => x.id === del.dataset.valeDelete);
            if (!v) return;
            const p = getProvider(v.providerId);
            askConfirm('Eliminar vale', `¿Eliminar el vale de ${money(v.amount)} (${p?.name || 'proveedor'}) del ${v.date}?`, () => {
                state.vales = (state.vales || []).filter(x => x.id !== v.id);
                save();
                renderAll();
                showToast('Vale eliminado.');
            });
        }
    });


    // Sidebar
    $('menuBtn')?.addEventListener('click', openSidebar);
    $('closeSidebar')?.addEventListener('click', closeSidebar);
    $('sidebarOverlay')?.addEventListener('click', closeSidebar);
    document.querySelectorAll('.sidebar-link').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

    // Completar desde banner / lista
    document.body.addEventListener('click', e => {
        const btn = e.target.closest('[data-complete-job]');
        if (!btn) return;
        const job = (state.funcJobs || []).find(j => j.id === btn.dataset.completeJob);
        if (!job) return;
        setTab('cuts');
        openCut(null, job);
    });

    // Funcionarios CRUD
    $('addFuncBtn')?.addEventListener('click', () => {
        $('funcForm')?.classList.remove('hidden');
        $('funcName')?.focus();
    });
    $('cancelFunc')?.addEventListener('click', () => {
        $('funcForm')?.classList.add('hidden');
        $('funcForm')?.reset();
    });
    $('funcForm')?.addEventListener('submit', e => {
        e.preventDefault();
        const name = $('funcName').value.trim();
        if (!name) return;
        if (!state.funcionarios) state.funcionarios = [];
        if (state.funcionarios.some(f => f.name.toLowerCase() === name.toLowerCase())) {
            showToast('Ya existe ese nombre.');
            return;
        }
        state.funcionarios.push({ id: crypto.randomUUID(), name });
        save();
        $('funcForm').reset();
        $('funcForm').classList.add('hidden');
        renderAll();
        showToast('Funcionario añadido.');
    });
    $('funcsList')?.addEventListener('click', e => {
        const del = e.target.closest('[data-func-del]');
        if (!del) return;
        const f = getFunc(del.dataset.funcDel);
        if (!f) return;
        askConfirm('Eliminar funcionario', `¿Eliminar a ${f.name}?`, () => {
            state.funcionarios = state.funcionarios.filter(x => x.id !== f.id);
            save();
            renderAll();
            showToast('Eliminado.');
        });
    });

    $('addFuncJobBtn')?.addEventListener('click', openFuncJob);
    $('closeFuncJob')?.addEventListener('click', closeFuncJob);
    $('cancelFuncJob')?.addEventListener('click', closeFuncJob);
    $('fjPayMode')?.addEventListener('change', togglePayMode);
    $('fjAddRow')?.addEventListener('click', () => addMachineRow());
    $('fjPhoto')?.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            fjPhotoData = await compressImage(file);
            $('fjPhotoPreview').src = fjPhotoData;
            $('fjPhotoWrap').classList.remove('hidden');
        } catch {
            showToast('No se pudo leer la foto');
        }
    });
    $('fjRemovePhoto')?.addEventListener('click', () => {
        fjPhotoData = '';
        $('fjPhoto').value = '';
        $('fjPhotoWrap').classList.add('hidden');
    });
    $('funcJobForm')?.addEventListener('submit', e => {
        e.preventDefault();
        const title = $('fjTitle').value.trim();
        const date = $('fjDate').value;
        const pieces = Number($('fjPieces').value);
        const payMode = $('fjPayMode').value;
        if (!title || !date || !(pieces > 0)) {
            showToast('Completá fecha, prenda y cantidad.');
            return;
        }
        let workers = [];
        let totalPay = 0;
        if (payMode === 'completo') {
            totalPay = Number($('fjTotalPay').value) || 0;
            const checked = [...document.querySelectorAll('#fjWorkersCheck input:checked')].map(i => i.value);
            if (!checked.length) {
                showToast('Marcá quiénes participaron.');
                return;
            }
            const share = totalPay / checked.length;
            workers = checked.map(id => ({ funcionarioId: id, pay: share }));
        } else {
            document.querySelectorAll('#fjMachineRows .machine-row').forEach(row => {
                const funcionarioId = row.querySelector('.fj-person')?.value;
                const machine = row.querySelector('.fj-machine')?.value;
                const pcs = Number(row.querySelector('.fj-pcs')?.value) || 0;
                if (!funcionarioId || pcs <= 0) return;
                const rate = machine === 'over' ? DEFAULT_OVER : DEFAULT_RECTA;
                const pay = pcs * rate;
                workers.push({ funcionarioId, machine, pieces: pcs, rate, pay });
                totalPay += pay;
            });
            if (!workers.length) {
                showToast('Añadí al menos una persona con prendas.');
                return;
            }
        }
        if (!state.funcJobs) state.funcJobs = [];
        state.funcJobs.push({
            id: crypto.randomUUID(),
            date,
            title,
            pieces,
            photo: fjPhotoData || '',
            payMode,
            workers,
            totalPay,
            note: $('fjNote').value.trim(),
            pendingProvider: true,
            linkedCutId: null,
            createdAt: new Date().toISOString()
        });
        save();
        closeFuncJob();
        renderAll();
        showToast('Trabajo guardado. Completá el corte del proveedor cuando quieras.');
        setTab('funcJobs');
    });

    $('funcJobsList')?.addEventListener('click', e => {
        const del = e.target.closest('[data-func-job-del]');
        if (!del) return;
        const id = del.dataset.funcJobDel;
        askConfirm('Eliminar registro', '¿Eliminar este trabajo de funcionarios?', () => {
            state.funcJobs = state.funcJobs.filter(j => j.id !== id);
            save();
            renderAll();
            showToast('Eliminado.');
        });
    });

    // Func vales
    $('addFuncValeBtn')?.addEventListener('click', () => {
        if (!(state.funcionarios || []).length) {
            showToast('Primero añade funcionarios.');
            setTab('funcs');
            return;
        }
        const sel = $('fvFuncionario');
        if (sel) {
            sel.innerHTML = '<option value="">Seleccionar…</option>' +
                state.funcionarios.map(f => `<option value="${f.id}">${escapeHTML(f.name)}</option>`).join('');
        }
        $('funcValeForm').reset();
        $('fvDate').value = todayISO();
        $('funcValeModal').classList.remove('hidden');
    });
    $('closeFuncVale')?.addEventListener('click', () => $('funcValeModal').classList.add('hidden'));
    $('cancelFuncVale')?.addEventListener('click', () => $('funcValeModal').classList.add('hidden'));
    $('funcValeFilter')?.addEventListener('change', renderFuncVales);
    $('funcValeForm')?.addEventListener('submit', e => {
        e.preventDefault();
        const funcionarioId = $('fvFuncionario').value;
        const amount = Number($('fvAmount').value);
        const date = $('fvDate').value;
        if (!funcionarioId || !(amount > 0) || !date) {
            showToast('Completá los datos del vale.');
            return;
        }
        if (!state.funcVales) state.funcVales = [];
        state.funcVales.push({
            id: crypto.randomUUID(),
            funcionarioId,
            amount,
            date,
            note: $('fvNote').value.trim()
        });
        save();
        $('funcValeModal').classList.add('hidden');
        renderAll();
        showToast('Vale registrado.');
    });
    $('funcValesList')?.addEventListener('click', e => {
        const del = e.target.closest('[data-func-vale-del]');
        if (!del) return;
        const id = del.dataset.funcValeDel;
        askConfirm('Eliminar vale', '¿Eliminar este vale?', () => {
            state.funcVales = state.funcVales.filter(v => v.id !== id);
            save();
            renderAll();
            showToast('Vale eliminado.');
        });
    });


    // PWA install prompt
    let deferredPrompt = null;
    const installBtn = $('installBtn');
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferredPrompt = e;
        if (installBtn) installBtn.classList.remove('hidden');
    });
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) {
                showToast('La aplicación ya está instalada o tu navegador no soporta la instalación.');
                return;
            }
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
            installBtn.classList.add('hidden');
            if (outcome === 'accepted') showToast('¡Aplicación instalada!');
        });
    }
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        if (installBtn) installBtn.classList.add('hidden');
    });

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
    renderAll();
})();