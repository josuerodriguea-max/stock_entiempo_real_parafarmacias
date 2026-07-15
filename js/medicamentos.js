// Medicamentos module client-side
(function(){
    function $(id){return document.getElementById(id);} 

    const stateKey = 'sistema_medicines';
    let medicines = JSON.parse(localStorage.getItem(stateKey) || 'null');
    if(!medicines){
        // seed from appState if available
        medicines = window.appState && window.appState.medicines ? window.appState.medicines.map((m,i)=>Object.assign({barcode:'',description:'',category:'',provider:'',location:'',createdAt: new Date().toISOString(),createdBy:'system'}, m)) : [];
        localStorage.setItem(stateKey, JSON.stringify(medicines));
    }

    let filtered = medicines.slice();
    let pageSize = parseInt($('pageSizeSelect').value || '10',10);
    let page = 1;

    function saveState(){ localStorage.setItem(stateKey, JSON.stringify(medicines)); }
    function recordAudit(action, med){
        const log = JSON.parse(localStorage.getItem('med_audit')||'[]');
        log.push({timestamp: new Date().toISOString(), user: (JSON.parse(localStorage.getItem('farmaUser')||'null')||{}).usuario || 'anon', action, med});
        localStorage.setItem('med_audit', JSON.stringify(log));
    }

    function checkSessionAndRole(){
        const user = JSON.parse(localStorage.getItem('farmaUser')||'null');
        if(!user){ localStorage.setItem('farma_flash','Debe iniciar sesión.'); window.location.href='login.html'; return null; }
        return user;
    }

    function render(){
        const user = checkSessionAndRole();
        if(!user) return;
        // role control
        if(user.rol !== 'administrador') $('btnNewMed').style.display = 'none';

        // filter
        const search = ($('medSearch').value||'').toLowerCase();
        filtered = medicines.filter(m=>{
            if(!search) return true;
            return [m.code, m.barcode, m.name, m.description, m.category, m.lab, m.provider, m.lote, m.estado].map(x=>String(x||'').toLowerCase()).some(t=>t.includes(search));
        });

        // pagination
        pageSize = parseInt($('pageSizeSelect').value||'10',10);
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        if(page>totalPages) page = totalPages;
        const start = (page-1)*pageSize;
        const slice = filtered.slice(start, start+pageSize);

        const tbody = $('medTableBody');
        if(!tbody) return;
        tbody.innerHTML = slice.map(m=>{
            const estadoLabel = getEstadoLabel(m);
            const actions = (user.rol==='administrador') ?
                `<button onclick="window.medModule.edit(${m.id})">Editar</button> <button onclick="window.medModule.remove(${m.id})">Eliminar</button> <button onclick="window.medModule.view(${m.id})">Ver</button>` :
                `<button onclick="window.medModule.view(${m.id})">Ver</button>`;
            return `<tr>
                <td>${m.id}</td>
                <td>${escapeHtml(m.code||'')}</td>
                <td>${escapeHtml(m.barcode||'')}</td>
                <td>${escapeHtml(m.name||'')}</td>
                <td>${escapeHtml(m.description||'')}</td>
                <td>${escapeHtml(m.category||'')}</td>
                <td>${escapeHtml(m.lab||'')}</td>
                <td>${escapeHtml(m.provider||'')}</td>
                <td>S/ ${Number(m.price||0).toFixed(2)}</td>
                <td>S/ ${Number(m.salePrice||0).toFixed(2)}</td>
                <td>${m.stock}</td>
                <td>${m.minStock}</td>
                <td>${escapeHtml(m.lote||'')}</td>
                <td>${m.expiry||''}</td>
                <td>${estadoLabel}</td>
                <td>${actions}</td>
            </tr>`;
        }).join('');

        // simple pager display (append below table)
        let pager = document.getElementById('medPager');
        if(!pager){ pager = document.createElement('div'); pager.id='medPager'; pager.className='pager'; document.querySelector('.table-panel').appendChild(pager); }
        pager.innerHTML = `Página ${page} / ${totalPages} - Total: ${filtered.length}` +
            ` <button ${page<=1?'disabled':''} id='prevPage'>«</button> <button ${page>=totalPages?'disabled':''} id='nextPage'>»</button>`;
        document.getElementById('prevPage').addEventListener('click', ()=>{ page = Math.max(1,page-1); render(); });
        document.getElementById('nextPage').addEventListener('click', ()=>{ page = Math.min(totalPages,page+1); render(); });
    }

    function getEstadoLabel(m){
        const now = new Date();
        const exp = m.expiry ? new Date(m.expiry) : null;
        if(m.stock===0) return '<span style="color:red">Producto Agotado</span>';
        if(exp){
            const diff = Math.ceil((exp - new Date(now.getFullYear(), now.getMonth(), now.getDate()))/(1000*60*60*24));
            if(diff < 0) return '<span style="color:red">Medicamento Vencido</span>';
            if(diff < 30) return '<span style="color:orange">Próximo a vencer</span>';
        }
        if(m.stock <= (m.minStock||0)) return '<span style="color:orange">Stock Bajo</span>';
        return '<span style="color:green">Disponible</span>';
    }

    function openForm(editMed){
        $('medFormContainer').style.display='block';
        $('medFormMsg').textContent='';
        if(editMed){
            $('medFormTitle').textContent='Editar Medicamento';
            $('medId').value = editMed.id;
            $('medCodigo').value = editMed.code||'';
            $('medCodigoBarras').value = editMed.barcode||'';
            $('medNombre').value = editMed.name||'';
            $('medDescripcion').value = editMed.description||'';
            $('medCategoria').value = editMed.category||'';
            $('medLaboratorio').value = editMed.lab||'';
            $('medProveedor').value = editMed.provider||'';
            $('medPrecioCompra').value = editMed.price||0;
            $('medPrecioVenta').value = editMed.salePrice||0;
            $('medStock').value = editMed.stock||0;
            $('medStockMin').value = editMed.minStock||0;
            $('medExpiry').value = editMed.expiry||'';
            $('medLote').value = editMed.lote||'';
            $('medUbicacion').value = editMed.location||'';
            $('medEstado').value = editMed.estado||'activo';
        } else {
            $('medFormTitle').textContent='Nuevo Medicamento';
            $('medForm').reset(); $('medId').value='';
        }
    }

    function closeForm(){ $('medFormContainer').style.display='none'; }

    function validateForm(){
        const code = $('medCodigo').value.trim();
        const name = $('medNombre').value.trim();
        const price = parseFloat($('medPrecioCompra').value||0);
        const sale = parseFloat($('medPrecioVenta').value||0);
        const stock = parseInt($('medStock').value||'0',10);
        const minStock = parseInt($('medStockMin').value||'0',10);
        const expiry = $('medExpiry').value;
        const lote = $('medLote').value.trim();
        if(!code) return 'Código obligatorio.';
        if(!name) return 'Nombre obligatorio.';
        if(isNaN(price) || price<=0) return 'Precio Compra mayor que cero.';
        if(isNaN(sale) || sale<=price) return 'Precio Venta debe ser mayor que Precio Compra.';
        if(isNaN(stock) || stock<0) return 'Stock debe ser mayor o igual a cero.';
        if(isNaN(minStock) || minStock<0) return 'Stock mínimo debe ser mayor o igual a cero.';
        if(!lote) return 'Lote obligatorio.';
        if(expiry && isNaN(new Date(expiry).getTime())) return 'Fecha de vencimiento inválida.';
        // unique code
        const id = $('medId').value;
        const exists = medicines.find(m=>m.code===code && String(m.id)!==String(id));
        if(exists) return 'El código ya existe.';
        return null;
    }

    function saveFromForm(e){
        e && e.preventDefault();
        const err = validateForm();
        if(err){ $('medFormMsg').textContent = err; return; }
        const idVal = $('medId').value;
        if(idVal){
            // update
            const m = medicines.find(x=>String(x.id)===String(idVal));
            if(!m) return;
            m.code = $('medCodigo').value.trim();
            m.barcode = $('medCodigoBarras').value.trim();
            m.name = $('medNombre').value.trim();
            m.description = $('medDescripcion').value.trim();
            m.category = $('medCategoria').value.trim();
            m.lab = $('medLaboratorio').value.trim();
            m.provider = $('medProveedor').value.trim();
            m.price = parseFloat($('medPrecioCompra').value||0);
            m.salePrice = parseFloat($('medPrecioVenta').value||0);
            m.stock = parseInt($('medStock').value||'0',10);
            m.minStock = parseInt($('medStockMin').value||'0',10);
            m.expiry = $('medExpiry').value;
            m.lote = $('medLote').value.trim();
            m.location = $('medUbicacion').value.trim();
            m.estado = $('medEstado').value;
            recordAudit('editar', m);
        } else {
            const newId = medicines.length ? Math.max(...medicines.map(x=>x.id))+1 : 1;
            const newMed = {
                id: newId,
                code: $('medCodigo').value.trim(),
                barcode: $('medCodigoBarras').value.trim(),
                name: $('medNombre').value.trim(),
                description: $('medDescripcion').value.trim(),
                category: $('medCategoria').value.trim(),
                lab: $('medLaboratorio').value.trim(),
                provider: $('medProveedor').value.trim(),
                price: parseFloat($('medPrecioCompra').value||0),
                salePrice: parseFloat($('medPrecioVenta').value||0),
                stock: parseInt($('medStock').value||'0',10),
                minStock: parseInt($('medStockMin').value||'0',10),
                expiry: $('medExpiry').value,
                lote: $('medLote').value.trim(),
                location: $('medUbicacion').value.trim(),
                estado: $('medEstado').value||'activo',
                createdAt: new Date().toISOString(),
                createdBy: (JSON.parse(localStorage.getItem('farmaUser')||'null')||{}).usuario || 'anon'
            };
            medicines.unshift(newMed);
            recordAudit('crear', newMed);
        }
        saveState(); closeForm(); render();
    }

    function remove(id){
        const user = JSON.parse(localStorage.getItem('farmaUser')||'null');
        if(!user || user.rol !== 'administrador'){ alert('No autorizado'); return; }
        if(!confirm('¿Confirma eliminar el medicamento?')) return;
        // check if has sales (simple: check appState.sales)
        const hasSales = (window.appState && window.appState.sales && window.appState.sales.some(s=> String(s.items||'').includes(id))) || false;
        if(hasSales){
            // set inactive
            const m = medicines.find(x=>x.id===id); if(m){ m.estado='inactivo'; saveState(); recordAudit('inactivar', m); alert('No puede eliminar este medicamento porque tiene historial de ventas. Se marcó como Inactivo.'); render(); }
            return;
        }
        medicines = medicines.filter(m=>m.id!==id);
        saveState(); recordAudit('eliminar', {id}); render();
    }

    function edit(id){
        const m = medicines.find(x=>x.id===id); if(!m) return; openForm(m);
    }
    function view(id){
        const m = medicines.find(x=>x.id===id); if(!m) return; alert(JSON.stringify(m,null,2));
    }

    function exportCsv(){
        const rows = [['ID','Código','CódigoBarras','Nombre','Descripción','Categoría','Laboratorio','Proveedor','PrecioCompra','PrecioVenta','Stock','StockMin','Lote','Vencimiento','Estado']];
        medicines.forEach(m=> rows.push([m.id,m.code,m.barcode,m.name,m.description,m.category,m.lab,m.provider,(m.price||0).toFixed(2),(m.salePrice||0).toFixed(2),m.stock,m.minStock,m.lote,m.expiry,m.estado]));
        const csv = rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
        const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'medicamentos.csv'; a.click(); URL.revokeObjectURL(url);
    }
    function printList(){ window.print(); }

    // helpers
    function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    // bind UI
    window.medModule = { edit, remove, view };
    document.addEventListener('DOMContentLoaded', ()=>{
        $('medSearch').addEventListener('input', ()=>{ page=1; render(); });
        $('pageSizeSelect').addEventListener('change', ()=>{ page=1; render(); });
        $('btnExportCsv').addEventListener('click', exportCsv);
        $('btnPrint').addEventListener('click', printList);
        $('btnNewMed').addEventListener('click', ()=>{ const user = checkSessionAndRole(); if(user && user.rol==='administrador') openForm(); else alert('No autorizado'); });
        $('cancelMedBtn').addEventListener('click', (e)=>{ e.preventDefault(); closeForm(); });
        $('medForm').addEventListener('submit', saveFromForm);
        render();
    });
})();
