(function(){
    function $(id){return document.getElementById(id);} 
    const medStoreKey='sistema_medicines';
    const movementsStoreKey='sistema_movements';
    let medicines=JSON.parse(localStorage.getItem(medStoreKey)||'[]');
    let movements=JSON.parse(localStorage.getItem(movementsStoreKey)||'[]');
    let page=1; let pageSize=10;

    function checkSession(){
        const user=JSON.parse(localStorage.getItem('farmaUser')||'null');
        if(!user){ localStorage.setItem('farma_flash','Debe iniciar sesión.'); window.location.href='login.html'; return null; }
        return user;
    }
    function saveMedicines(){ localStorage.setItem(medStoreKey, JSON.stringify(medicines)); }
    function saveMovements(){ localStorage.setItem(movementsStoreKey, JSON.stringify(movements)); }
    function recordAudit(entry){ const log=JSON.parse(localStorage.getItem('inventory_audit')||'[]'); log.push({timestamp:new Date().toISOString(), user:(JSON.parse(localStorage.getItem('farmaUser')||'null')||{}).usuario||'anon', ...entry}); localStorage.setItem('inventory_audit', JSON.stringify(log)); }

    function getFiltered(){
        const q=($('inventorySearch').value||'').toLowerCase(); const filter=($('inventoryFilterState').value||'').toLowerCase();
        return medicines.filter(m=>{
            const hay = [m.code,m.barcode,m.name,m.category,m.lab,m.provider,m.lote,m.estado].join(' ').toLowerCase();
            if(q && !hay.includes(q)) return false;
            const state = getState(m);
            if(filter==='agotado' && m.stock!==0) return false;
            if(filter==='bajo' && !(m.stock>0 && m.stock<=m.minStock)) return false;
            if(filter==='vencer'){ const d=daysUntil(m.expiry); if(!(d>=0 && d<=30)) return false; }
            if(filter==='vencido' && state!=='Vencido') return false;
            return true;
        });
    }

    function getState(m){
        if(m.stock===0) return 'Agotado';
        const d=daysUntil(m.expiry);
        if(d<0) return 'Vencido';
        if(d<=30) return 'Próximo a vencer';
        if(m.stock<=m.minStock) return 'Stock Bajo';
        return 'Disponible';
    }

    function daysUntil(iso){ if(!iso) return 9999; const d=new Date(iso); const now=new Date(); const start=new Date(now.getFullYear(), now.getMonth(), now.getDate()); return Math.ceil((d-start)/(1000*60*60*24)); }

    function render(){
        const user=checkSession(); if(!user) return;
        const filtered=getFiltered();
        pageSize=parseInt($('pageSizeSelect').value||'10',10);
        const totalPages=Math.max(1, Math.ceil(filtered.length/pageSize));
        if(page>totalPages) page=totalPages;
        const start=(page-1)*pageSize; const slice=filtered.slice(start,start+pageSize);
        $('inventoryTableBody').innerHTML=slice.map(m=>`<tr><td>${m.code||''}</td><td>${m.barcode||''}</td><td>${m.name||''}</td><td>${m.category||''}</td><td>${m.lab||''}</td><td>${m.provider||''}</td><td>${m.lote||''}</td><td>${m.expiry||''}</td><td>S/ ${Number(m.price||0).toFixed(2)}</td><td>S/ ${Number(m.salePrice||0).toFixed(2)}</td><td>${m.stock}</td><td>${m.minStock}</td><td>${m.location||''}</td><td>${getState(m)}</td></tr>`).join('');
        $('invTotalValue').textContent='S/ ' + medicines.reduce((sum,m)=>sum + (Number(m.price||0)*Number(m.stock||0)),0).toFixed(2);
        $('invTotalMeds').textContent=medicines.length;
        $('invAgotados').textContent=medicines.filter(m=>m.stock===0).length;
        $('invBajos').textContent=medicines.filter(m=>m.stock>0 && m.stock<=m.minStock).length;
        $('invPorVencer').textContent=medicines.filter(m=>daysUntil(m.expiry)>=0 && daysUntil(m.expiry)<=30).length;
        $('invVencidos').textContent=medicines.filter(m=>daysUntil(m.expiry)<0).length;
        $('movementsTableBody').innerHTML = movements.slice().reverse().slice(0,10).map(x=>`<tr><td>${x.date}</td><td>${x.time}</td><td>${x.user}</td><td>${x.med}</td><td>${x.type}</td><td>${x.qty}</td><td>${x.before}</td><td>${x.after}</td><td>${x.reason}</td></tr>`).join('');
        // adjust options
        $('adjustMedicine').innerHTML = medicines.map(m=>`<option value="${m.id}">${m.code} - ${m.name}</option>`).join('');
    }

    function addMovement(med, type, qty, before, after, reason){
        movements.unshift({date:new Date().toISOString().slice(0,10), time:new Date().toLocaleTimeString('es-PE',{hour12:false}), user:(JSON.parse(localStorage.getItem('farmaUser')||'null')||{}).usuario||'anon', med: med.name, type, qty, before, after, reason});
        saveMovements();
        recordAudit({action:type, med:med.name, quantity:qty});
    }

    function adjustStock(e){
        e.preventDefault();
        const user=checkSession(); if(!user || user.rol!=='administrador'){ alert('No autorizado'); return; }
        const medId=parseInt($('adjustMedicine').value,10); const qty=parseInt($('adjustQty').value,10); const reason=$('adjustReason').value.trim();
        const med=medicines.find(m=>m.id===medId); if(!med) return;
        const before=med.stock; med.stock=qty; addMovement(med,'Ajuste Manual',qty,before,med.stock,reason||'Ajuste manual');
        saveMedicines(); render(); $('adjustMsg').textContent='Stock actualizado correctamente.'; $('adjustForm').reset();
    }

    function init(){
        const user=checkSession(); if(!user) return;
        $('userName').textContent=user.usuario; $('userRole').textContent=user.rol==='administrador' ? 'Administrador' : 'Farmacéutico';
        $('inventorySearch').addEventListener('input', ()=>{ page=1; render(); });
        $('inventoryFilterState').addEventListener('change', ()=>{ page=1; render(); });
        $('pageSizeSelect').addEventListener('change', ()=>{ page=1; render(); });
        $('btnAdjustStock').addEventListener('click', ()=>{ if(checkSession()&&checkSession().rol==='administrador') $('adjustModal').style.display='block'; else alert('No autorizado'); });
        $('cancelAdjustBtn').addEventListener('click', ()=>{$('adjustModal').style.display='none';});
        $('adjustForm').addEventListener('submit', adjustStock);
        $('btnExportCsv').addEventListener('click', ()=>{ const rows=[['Código','CódigoBarras','Nombre','Categoría','Laboratorio','Proveedor','Lote','Vencimiento','PrecioCompra','PrecioVenta','Stock','StockMin','Ubicación','Estado']]; medicines.forEach(m=>rows.push([m.code,m.barcode,m.name,m.category,m.lab,m.provider,m.lote,m.expiry,m.price,m.salePrice,m.stock,m.minStock,m.location,m.estado])); const csv=rows.map(r=>r.join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='inventario.csv'; a.click(); URL.revokeObjectURL(url); });
        $('btnPrint').addEventListener('click', ()=>window.print());
        render();
    }

    // Hooks for external modules: expose updater functions
    window.inventoryModule = {
        recordMovement: addMovement,
        refresh: render,
        applyPurchase: (med, qty, reason='Compra')=>{ const before=med.stock||0; med.stock = before + qty; med.estado='activo'; addMovement(med,'Compra',qty,before,med.stock,reason); saveMedicines(); render(); },
        applySale: (med, qty, reason='Venta')=>{ const before=med.stock||0; med.stock = Math.max(0, before - qty); addMovement(med,'Venta',qty,before,med.stock,reason); saveMedicines(); render(); },
        restoreSale: (med, qty, reason='Anulación de Venta')=>{ const before=med.stock||0; med.stock = before + qty; addMovement(med,'Anulación de Venta',qty,before,med.stock,reason); saveMedicines(); render(); }
    };

    document.addEventListener('DOMContentLoaded', init);
})();