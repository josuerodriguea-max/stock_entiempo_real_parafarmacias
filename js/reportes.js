(function(){
    function $(id){return document.getElementById(id);} 
    const medicines=JSON.parse(localStorage.getItem('sistema_medicines')||'[]');
    const sales=JSON.parse(localStorage.getItem('sistema_sales')||'[]');
    const purchases=JSON.parse(localStorage.getItem('sistema_purchases')||'[]');
    const users=JSON.parse(localStorage.getItem('sistema_users')||'[]');
    const movements=JSON.parse(localStorage.getItem('sistema_movements')||'[]');
    const clients=JSON.parse(localStorage.getItem('sistema_clients')||'[]');

    function checkSession(){
        const user=JSON.parse(localStorage.getItem('farmaUser')||'null');
        if(!user){ localStorage.setItem('farma_flash','Debe iniciar sesión.'); window.location.href='login.html'; return null; }
        if(user.rol!=='administrador'){ alert('Acceso denegado. No tiene permisos para acceder a este módulo.'); window.location.href='dashboard.html'; return null; }
        return user;
    }

    function daysUntil(iso){ if(!iso) return 9999; const d=new Date(iso); const now=new Date(); const start=new Date(now.getFullYear(), now.getMonth(), now.getDate()); return Math.ceil((d-start)/(1000*60*60*24)); }

    function getFilteredSales(){
        const start=$('startDate').value; const end=$('endDate').value;
        return sales.filter(s=> (!start || s.date>=start) && (!end || s.date<=end));
    }
    function getFilteredPurchases(){
        const start=$('startDate').value; const end=$('endDate').value;
        return purchases.filter(p=> (!start || p.date>=start) && (!end || p.date<=end));
    }

    function render(){
        const user=checkSession(); if(!user) return;
        $('userName').textContent=user.usuario; $('userRole').textContent='Administrador';
        const type=$('reportType').value;
        let rows=[]; let headers=[]; let summary='';
        switch(type){
            case 'ventas':
                rows=getFilteredSales().map(s=>[s.number,s.date,s.time,s.client,s.farmer,(s.items||[]).length,s.total,s.status]);
                headers=['Número','Fecha','Hora','Cliente','Farmacéutico','Cant. Prod.','Total','Estado'];
                summary=`Ventas: ${rows.length} | Monto total: S/ ${rows.reduce((sum,r)=>sum+Number(r[6]||0),0).toFixed(2)} | Promedio: S/ ${(rows.length?rows.reduce((sum,r)=>sum+Number(r[6]||0),0)/rows.length:0).toFixed(2)}`;
                break;
            case 'compras':
                rows=getFilteredPurchases().map(p=>[p.number,p.provider,p.date,p.time,p.user,(p.items||[]).length,p.total,p.status]);
                headers=['Número','Proveedor','Fecha','Hora','Usuario','Cant. Prod.','Total','Estado'];
                summary=`Compras: ${rows.length} | Monto total: S/ ${rows.reduce((sum,r)=>sum+Number(r[6]||0),0).toFixed(2)}`;
                break;
            case 'inventario':
                rows=medicines.map(m=>[m.code,m.name,m.category,m.lab,m.provider,m.price,m.salePrice,m.stock,m.minStock,m.lote,m.expiry,m.estado]);
                headers=['Código','Nombre','Categoría','Laboratorio','Proveedor','Precio Compra','Precio Venta','Stock','Stock Mínimo','Lote','Vencimiento','Estado'];
                summary=`Productos: ${rows.length} | Valor Total: S/ ${medicines.reduce((sum,m)=>sum + Number(m.price||0)*Number(m.stock||0),0).toFixed(2)}`;
                break;
            case 'medicamentos':
                rows=medicines.map(m=>[m.code,m.name,m.category,m.lab,m.provider,m.stock,m.estado]);
                headers=['Código','Nombre','Categoría','Laboratorio','Proveedor','Stock','Estado'];
                summary=`Medicamentos registrados: ${rows.length}`;
                break;
            case 'clientes':
                rows=clients.map(c=>[c.name,c.dni,c.phone,c.email,'0','0','']);
                headers=['Nombre','DNI','Teléfono','Correo','Compras','Monto total','Última compra'];
                summary=`Clientes registrados: ${rows.length}`;
                break;
            case 'proveedores':
                rows=[['Proveedor demo','00000000000','999999999','prov@demo.com','0','0']];
                headers=['Proveedor','RUC','Teléfono','Correo','Compras','Monto total'];
                summary='Proveedores registrados: 1';
                break;
            case 'usuarios':
                rows=users.map(u=>[u.nombres+' '+u.apellidos,u.username,u.role,u.status,u.lastAccess||'']);
                headers=['Nombre','Usuario','Rol','Estado','Último Acceso'];
                summary=`Usuarios registrados: ${rows.length}`;
                break;
            case 'ganancias':
                const salesTotal=getFilteredSales().reduce((sum,s)=>sum+Number(s.total||0),0);
                const purchasesTotal=getFilteredPurchases().reduce((sum,p)=>sum+Number(p.total||0),0);
                rows=[[salesTotal.toFixed(2),purchasesTotal.toFixed(2),(salesTotal-purchasesTotal).toFixed(2),(salesTotal-purchasesTotal).toFixed(2)]];
                headers=['Ventas Totales','Compras Totales','Costo Total','Ganancia Bruta'];
                summary=`Ganancia neta: S/ ${(salesTotal-purchasesTotal).toFixed(2)}`;
                break;
            case 'agotados':
                rows=medicines.filter(m=>m.stock===0).map(m=>[m.code,m.name,m.lab,m.provider,m.expiry]);
                headers=['Código','Nombre','Laboratorio','Proveedor','Última Venta'];
                break;
            case 'bajo':
                rows=medicines.filter(m=>m.stock>0 && m.stock<=m.minStock).map(m=>[m.code,m.name,m.stock,m.minStock]);
                headers=['Código','Nombre','Stock Actual','Stock Mínimo'];
                break;
            case 'vencer':
                rows=medicines.filter(m=>daysUntil(m.expiry)>=0 && daysUntil(m.expiry)<=30).map(m=>[m.code,m.name,m.lote,m.expiry,daysUntil(m.expiry)]);
                headers=['Código','Nombre','Lote','Fecha Vencimiento','Días Restantes'];
                break;
            case 'vencidos':
                rows=medicines.filter(m=>daysUntil(m.expiry)<0).map(m=>[m.code,m.name,m.lote,m.expiry,'Vencido']);
                headers=['Código','Nombre','Lote','Fecha Vencimiento','Estado'];
                break;
            case 'movimientos':
                rows=movements.map(m=>[m.date,m.time,m.user,m.med,m.type,m.qty,m.before,m.after,m.reason]);
                headers=['Fecha','Hora','Usuario','Medicamento','Movimiento','Cantidad','Stock anterior','Stock nuevo','Motivo'];
                break;
        }
        $('reportTitle').textContent=document.querySelector('#reportType option:checked').textContent;
        $('reportSummary').textContent=summary || `Registros: ${rows.length}`;
        $('reportThead').innerHTML='<tr>' + headers.map(h=>'<th>'+h+'</th>').join('') + '</tr>';
        $('reportBody').innerHTML=rows.length? rows.map(r=>'<tr>' + r.map(v=>'<td>'+v+'</td>').join('') + '</tr>').join('') : '<tr><td colspan="20" style="text-align:center">Sin resultados</td></tr>';
        recordAudit(type);
    }

    function recordAudit(type){ const log=JSON.parse(localStorage.getItem('reports_audit')||'[]'); log.push({timestamp:new Date().toISOString(), user:(JSON.parse(localStorage.getItem('farmaUser')||'null')||{}).usuario||'anon', report:type}); localStorage.setItem('reports_audit', JSON.stringify(log)); }
    function exportCsv(){ const type=$('reportType').value; const rows=[]; const headers=$('reportThead').querySelectorAll('th'); rows.push([...headers].map(h=>h.textContent)); [...$('reportBody').querySelectorAll('tr')].forEach(tr=>rows.push([...tr.querySelectorAll('td')].map(td=>td.textContent))); const csv=rows.map(r=>r.join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=type+'.csv'; a.click(); URL.revokeObjectURL(url); }
    function printReport(){ window.print(); }

    function init(){
        const user=checkSession(); if(!user) return;
        $('userName').textContent=user.usuario; $('userRole').textContent='Administrador';
        $('btnGenerate').addEventListener('click', render);
        $('btnExportCsv').addEventListener('click', exportCsv);
        $('btnPrint').addEventListener('click', printReport);
        render();
    }

    document.addEventListener('DOMContentLoaded', init);
})();