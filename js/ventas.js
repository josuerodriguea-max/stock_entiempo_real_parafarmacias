(function(){
    function $(id){return document.getElementById(id);} 
    const medStoreKey = 'sistema_medicines';
    const salesStoreKey = 'sistema_sales';
    const clientsStoreKey = 'sistema_clients';
    let medicines = JSON.parse(localStorage.getItem(medStoreKey) || '[]');
    let sales = JSON.parse(localStorage.getItem(salesStoreKey) || '[]');
    let clients = JSON.parse(localStorage.getItem(clientsStoreKey) || '[]');
    let cart = [];
    let currentSale = null;

    function checkSession(){
        const user = JSON.parse(localStorage.getItem('farmaUser') || 'null');
        if(!user){ localStorage.setItem('farma_flash','Debe iniciar sesión.'); window.location.href='login.html'; return null; }
        return user;
    }
    function saveSales(){ localStorage.setItem(salesStoreKey, JSON.stringify(sales)); }
    function saveMedicines(){ localStorage.setItem(medStoreKey, JSON.stringify(medicines)); }
    function saveClients(){ localStorage.setItem(clientsStoreKey, JSON.stringify(clients)); }
    function recordAudit(entry){ const log = JSON.parse(localStorage.getItem('sales_audit')||'[]'); log.push({timestamp:new Date().toISOString(), user:(JSON.parse(localStorage.getItem('farmaUser')||'null')||{}).usuario||'anon', ...entry}); localStorage.setItem('sales_audit', JSON.stringify(log)); }

    function renderSales(){
        const user = checkSession(); if(!user) return;
        const search = ($('saleSearch').value||'').toLowerCase();
        const visible = sales.filter(s => [s.number,s.client,s.farmer,s.date,s.status].join(' ').toLowerCase().includes(search));
        $('salesTableBody').innerHTML = visible.slice().reverse().map(s=>`<tr><td>${s.number}</td><td>${s.client}</td><td>${s.farmer}</td><td>${s.date}</td><td>${s.time}</td><td>S/ ${Number(s.total||0).toFixed(2)}</td><td>${s.status}</td><td><button onclick="window.salesModule.view('${s.number}')">Ver</button>${user.rol==='administrador' || user.rol==='farmaceutico' ? ` <button onclick="window.salesModule.annul('${s.number}')">Anular</button>`:''}</td></tr>`).join('');
    }

    function newSaleForm(){
        const user = checkSession(); if(!user) return;
        currentSale = { number: 'V-' + Date.now(), date: new Date().toISOString().slice(0,10), time: new Date().toLocaleTimeString('es-PE',{hour12:false}), farmer: user.usuario, client: '', paymentMethod:'Efectivo', status:'COMPLETADA' };
        $('saleNumber').value = currentSale.number; $('saleDate').value = currentSale.date; $('saleTime').value = currentSale.time;
        $('saleClientName').value=''; $('salePaymentMethod').value='Efectivo'; $('saleSubtotal').value='0.00'; $('saleDiscount').value='0.00'; $('saleIgv').value='0.00'; $('saleTotal').value='0.00'; $('saleReceived').value='0.00'; $('saleFormMsg').textContent=''; cart = []; renderCart(); $('saleFormContainer').style.display='block';
    }

    function searchMedicines(){
        const q = $('medSearchInput').value.trim().toLowerCase();
        if(!q){ $('medSearchResults').innerHTML=''; return; }
        const list = medicines.filter(m=> [m.code,m.barcode,m.name,m.lab,m.category].join(' ').toLowerCase().includes(q));
        $('medSearchResults').innerHTML = list.slice(0,10).map(m=>`<div style="padding:8px;border-bottom:1px solid #ddd;cursor:pointer" onclick="window.salesModule.addToCart(${m.id})">${m.code} - ${m.name} | Stock ${m.stock} | S/ ${Number(m.salePrice||0).toFixed(2)}</div>`).join('');
    }

    function addToCart(id){
        const med = medicines.find(m=>m.id===id); if(!med) return;
        const qty = parseInt(prompt('Cantidad a vender', '1'), 10);
        if(!qty || qty<=0){ alert('La cantidad debe ser mayor a cero.'); return; }
        if(qty > med.stock){ alert('No hay suficiente stock.'); return; }
        const existing = cart.find(i=>i.id===id);
        if(existing){ existing.qty += qty; } else { cart.push({ id: med.id, code: med.code, name: med.name, qty, price: Number(m.salePrice||0), discount:0 }); }
        renderCart();
    }

    function renderCart(){
        $('saleCartBody').innerHTML = cart.map(item=>`<tr><td>${item.code}</td><td>${item.name}</td><td>${item.qty}</td><td>S/ ${item.price.toFixed(2)}</td><td>${item.discount}</td><td>S/ ${(item.qty*item.price - item.discount).toFixed(2)}</td><td><button type="button" onclick="window.salesModule.removeFromCart(${item.id})">Eliminar</button></td></tr>`).join('');
        const subtotal = cart.reduce((sum,i)=>sum + i.qty*i.price - i.discount,0);
        const discount = cart.reduce((sum,i)=>sum + i.discount,0);
        const igv = subtotal * 0.18;
        const total = subtotal + igv - discount;
        $('saleSubtotal').value = subtotal.toFixed(2); $('saleDiscount').value = discount.toFixed(2); $('saleIgv').value = igv.toFixed(2); $('saleTotal').value = total.toFixed(2); 
    }

    function removeFromCart(id){ cart = cart.filter(i=>i.id!==id); renderCart(); }

    function finalizeSale(e){
        e.preventDefault();
        const user = checkSession(); if(!user) return;
        if(cart.length===0){ $('saleFormMsg').textContent='Agregue productos al carrito.'; return; }
        const total = parseFloat($('saleTotal').value||0);
        const received = parseFloat($('saleReceived').value||0);
        if(received < total){ $('saleFormMsg').textContent='El monto es insuficiente.'; return; }
        const change = received - total;
        // update stock
        cart.forEach(item=>{ const med = medicines.find(m=>m.id===item.id); if(med){ med.stock = Math.max(0, med.stock - item.qty); if(med.stock===0){ med.estado='inactivo'; } } });
        saveMedicines();
        const sale = { number: currentSale.number, client: $('saleClientName').value.trim() || 'Cliente general', farmer: currentSale.farmer, date: currentSale.date, time: currentSale.time, paymentMethod: $('salePaymentMethod').value, total, status:'COMPLETADA', items: cart.map(i=>({...i})) };
        sales.push(sale); saveSales();
        recordAudit({action:'venta_registrada', saleNumber:sale.number, client:sale.client, items:cart});
        alert('Venta realizada correctamente.');
        renderSales();
        closeForm();
        if(window.appState){ window.appState.sales = sales; }
    }

    function annulSale(number){
        const user = checkSession(); if(!user) return; const sale = sales.find(s=>s.number===number); if(!sale) return; if(sale.status === 'ANULADA'){ alert('La venta ya fue anulada.'); return; }
        const reason = prompt('Motivo de la anulación'); if(!reason) return; sale.status='ANULADA'; saveSales();
        sale.items.forEach(item=>{ const med = medicines.find(m=>m.id===item.id); if(med){ med.stock += item.qty; med.estado='activo'; } });
        saveMedicines();
        recordAudit({action:'venta_anulada', saleNumber:sale.number, reason});
        alert('Venta anulada correctamente.'); renderSales();
    }

    function closeForm(){ $('saleFormContainer').style.display='none'; }
    function exportExcel(){ const rows = [['Número','Cliente','Farmacéutico','Fecha','Hora','Total','Estado']]; sales.forEach(s=>rows.push([s.number,s.client,s.farmer,s.date,s.time,s.total,s.status])); const csv = rows.map(r=>r.join(',')).join('\n'); const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='ventas.csv'; a.click(); URL.revokeObjectURL(url); }
    function printSales(){ window.print(); }

    function init(){
        const user = checkSession(); if(!user) return;
        document.getElementById('userName').textContent = user.usuario; document.getElementById('userRole').textContent = user.rol === 'administrador' ? 'Administrador' : 'Farmacéutico';
        $('saleSearch').addEventListener('input', renderSales);
        $('btnNewSale').addEventListener('click', newSaleForm);
        $('cancelSaleBtn').addEventListener('click', closeForm);
        $('saleForm').addEventListener('submit', finalizeSale);
        $('medSearchInput').addEventListener('input', searchMedicines);
        $('btnAnularVenta').addEventListener('click', ()=>{ const num = prompt('Número de venta a anular'); if(num) annulSale(num); });
        $('btnImprimir').addEventListener('click', printSales);
        $('btnExportExcel').addEventListener('click', exportExcel);
        renderSales();
    }

    window.salesModule = { addToCart, removeFromCart, view: (n)=>alert('Detalle de venta '+n), annul: annulSale };
    document.addEventListener('DOMContentLoaded', init);
})();
