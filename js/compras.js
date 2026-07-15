(function(){
    function $(id){return document.getElementById(id);} 
    const medStoreKey='sistema_medicines';
    const purchasesStoreKey='sistema_purchases';
    let medicines=JSON.parse(localStorage.getItem(medStoreKey)||'[]');
    let purchases=JSON.parse(localStorage.getItem(purchasesStoreKey)||'[]');
    let cart=[];

    function checkSession(){
        const user=JSON.parse(localStorage.getItem('farmaUser')||'null');
        if(!user){ localStorage.setItem('farma_flash','Debe iniciar sesión.'); window.location.href='login.html'; return null; }
        if(user.rol!=='administrador'){ alert('Acceso denegado. No tiene permisos para acceder a este módulo.'); window.location.href='dashboard.html'; return null; }
        return user;
    }
    function savePurchases(){ localStorage.setItem(purchasesStoreKey, JSON.stringify(purchases)); }
    function saveMedicines(){ localStorage.setItem(medStoreKey, JSON.stringify(medicines)); }
    function recordAudit(entry){ const log=JSON.parse(localStorage.getItem('purchases_audit')||'[]'); log.push({timestamp:new Date().toISOString(), user:(JSON.parse(localStorage.getItem('farmaUser')||'null')||{}).usuario||'anon', ...entry}); localStorage.setItem('purchases_audit', JSON.stringify(log)); }

    function renderPurchases(){
        const user=checkSession(); if(!user) return;
        const query=($('purchaseSearch').value||'').toLowerCase();
        const visible=purchases.filter(p=>[p.number,p.provider,p.user,p.date,p.status].join(' ').toLowerCase().includes(query));
        $('purchasesTableBody').innerHTML=visible.slice().reverse().map(p=>`<tr><td>${p.number}</td><td>${p.provider}</td><td>${p.user}</td><td>${p.date}</td><td>${p.time}</td><td>S/ ${Number(p.total||0).toFixed(2)}</td><td>${p.status}</td><td><button onclick="window.purchasesModule.view('${p.number}')">Ver</button> <button onclick="window.purchasesModule.annul('${p.number}')">Anular</button></td></tr>`).join('');
    }

    function openForm(){
        const user=checkSession(); if(!user) return;
        $('purchaseNumber').value='C-' + Date.now();
        $('purchaseDate').value=new Date().toISOString().slice(0,10);
        $('purchaseTime').value=new Date().toLocaleTimeString('es-PE',{hour12:false});
        $('purchaseProvider').value='';
        $('purchaseUser').value=user.usuario;
        $('purchaseSubtotal').value='0.00'; $('purchaseIgv').value='0.00'; $('purchaseTotal').value='0.00';
        $('purchaseFormMsg').textContent=''; cart=[]; renderCart(); $('purchaseFormContainer').style.display='block';
    }
    function closeForm(){ $('purchaseFormContainer').style.display='none'; }

    function searchMedicines(){
        const q=($('purchaseMedSearch').value||'').trim().toLowerCase();
        if(!q){ $('purchaseMedResults').innerHTML=''; return; }
        const list = medicines.filter(m=>[m.code,m.barcode,m.name,m.lab,m.category].join(' ').toLowerCase().includes(q));
        $('purchaseMedResults').innerHTML=list.slice(0,10).map(m=>`<div style="padding:8px;border-bottom:1px solid #ddd;cursor:pointer" onclick="window.purchasesModule.addItem(${m.id})">${m.code} - ${m.name} | Stock ${m.stock}</div>`).join('');
    }

    function addItem(id){
        const med=medicines.find(m=>m.id===id); if(!med) return;
        const qty=parseInt(prompt('Cantidad', '1'),10); const price=parseFloat(prompt('Precio de compra', med.price||0)); const expiry=prompt('Fecha de vencimiento (YYYY-MM-DD)', med.expiry||''); const lote=prompt('Número de lote', med.lote||'');
        if(!qty||qty<=0){ alert('Cantidad mayor que cero.'); return; }
        if(!price||price<=0){ alert('Precio mayor que cero.'); return; }
        if(!expiry||isNaN(new Date(expiry).getTime())){ alert('Fecha válida.'); return; }
        if(!lote){ alert('Lote obligatorio.'); return; }
        const existing=cart.find(i=>i.id===id); if(existing){ existing.qty+=qty; existing.price=price; existing.expiry=expiry; existing.lote=lote; } else { cart.push({id:med.id, code:med.code, name:med.name, qty, price, expiry, lote}); }
        renderCart();
    }

    function renderCart(){
        $('purchaseCartBody').innerHTML=cart.map(item=>`<tr><td>${item.code}</td><td>${item.name}</td><td>${item.qty}</td><td>S/ ${Number(item.price||0).toFixed(2)}</td><td>S/ ${(item.qty*item.price).toFixed(2)}</td><td>${item.expiry}</td><td>${item.lote}</td><td><button type="button" onclick="window.purchasesModule.removeItem(${item.id})">Eliminar</button></td></tr>`).join('');
        const subtotal=cart.reduce((sum,i)=>sum + i.qty*i.price,0);
        const igv=subtotal*0.18;
        const total=subtotal+igv;
        $('purchaseSubtotal').value=subtotal.toFixed(2); $('purchaseIgv').value=igv.toFixed(2); $('purchaseTotal').value=total.toFixed(2);
    }
    function removeItem(id){ cart=cart.filter(i=>i.id!==id); renderCart(); }

    function savePurchase(e){
        e.preventDefault();
        const user=checkSession(); if(!user) return;
        if(cart.length===0){ $('purchaseFormMsg').textContent='Agregue productos al carrito.'; return; }
        const purchase = { number:$('purchaseNumber').value, provider:$('purchaseProvider').value.trim()||'Proveedor general', user:user.usuario, date:$('purchaseDate').value, time:$('purchaseTime').value, total:parseFloat($('purchaseTotal').value||0), status:'COMPLETADA', items:cart.map(i=>({...i})) };
        purchases.push(purchase); savePurchases();
        cart.forEach(item=>{ const med=medicines.find(m=>m.id===item.id); if(med){ med.stock = (med.stock||0) + item.qty; med.price = item.price; med.provider = purchase.provider; med.expiry = item.expiry; med.lote = item.lote; med.estado='activo'; } else { medicines.push({id:Math.max(...medicines.map(m=>m.id),0)+1, code:'NEW', barcode:'', name:item.name, description:'', category:'', lab:'', provider:purchase.provider, price:item.price, salePrice:item.price*1.2, stock:item.qty, minStock:5, expiry:item.expiry, lote:item.lote, estado:'activo'}); } });
        saveMedicines();
        recordAudit({action:'compra_registrada', purchaseNumber:purchase.number, provider:purchase.provider});
        alert('Compra registrada correctamente.');
        renderPurchases();
        closeForm();
    }

    function annulPurchase(number){
        const user=checkSession(); if(!user) return; const p=purchases.find(x=>x.number===number); if(!p) return; if(p.status==='ANULADA'){ alert('La compra ya fue anulada.'); return; }
        const reason=prompt('Motivo de la anulación'); if(!reason) return;
        p.status='ANULADA'; savePurchases();
        p.items.forEach(item=>{ const med=medicines.find(m=>m.id===item.id); if(med){ if((med.stock||0) >= item.qty){ med.stock = med.stock - item.qty; } else { alert('No es posible anular esta compra porque parte del stock ya fue vendido.'); return; } } });
        saveMedicines();
        recordAudit({action:'compra_anulada', purchaseNumber:p.number, reason});
        alert('Compra anulada correctamente.'); renderPurchases();
    }

    function viewPurchase(number){ const p=purchases.find(x=>x.number===number); if(!p) return; alert(JSON.stringify(p,null,2)); }
    function exportCsv(){ const rows=[['Número','Proveedor','Usuario','Fecha','Hora','Total','Estado']]; purchases.forEach(p=>rows.push([p.number,p.provider,p.user,p.date,p.time,p.total,p.status])); const csv=rows.map(r=>r.join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='compras.csv'; a.click(); URL.revokeObjectURL(url); }
    function printList(){ window.print(); }

    function init(){
        const user=checkSession(); if(!user) return;
        $('userName').textContent=user.usuario; $('userRole').textContent='Administrador';
        $('purchaseSearch').addEventListener('input', renderPurchases);
        $('btnNewPurchase').addEventListener('click', openForm);
        $('cancelPurchaseBtn').addEventListener('click', closeForm);
        $('purchaseMedSearch').addEventListener('input', searchMedicines);
        $('purchaseForm').addEventListener('submit', savePurchase);
        $('btnAnularPurchase').addEventListener('click', ()=>{ const num=prompt('Número de compra a anular'); if(num) annulPurchase(num); });
        $('btnPrintPurchase').addEventListener('click', printList);
        $('btnExportPurchase').addEventListener('click', exportCsv);
        renderPurchases();
    }

    window.purchasesModule={ addItem, removeItem, view:viewPurchase, annul:annulPurchase };
    document.addEventListener('DOMContentLoaded', init);
})();