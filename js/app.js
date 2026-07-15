// =====================================================================
// FARMASTOCK - Sistema Inteligente de Gestión Farmacéutica
// =====================================================================

const appState = {
    theme: localStorage.getItem('farmaTheme') || 'light',
    // session stored in localStorage by the simple login form
    user: JSON.parse(localStorage.getItem('farmaUser') || 'null'),
    medicines: [
        { id: 1, code: 'P001', name: 'Paracetamol', lab: 'Medifarma', lote: 'LT245', expiry: '2027-06-01', stock: 120, minStock: 10, price: 5.00 },
        { id: 2, code: 'A002', name: 'Amoxicilina', lab: 'AC Farma', lote: 'LT111', expiry: '2026-12-01', stock: 8, minStock: 10, price: 10.00 },
        { id: 3, code: 'I003', name: 'Ibuprofeno', lab: 'PharmaPlus', lote: 'LT332', expiry: '2027-04-01', stock: 24, minStock: 5, price: 8.00 },
        { id: 4, code: 'O004', name: 'Omeprazol', lab: 'BioHealth', lote: 'LT758', expiry: '2026-11-01', stock: 0, minStock: 5, price: 12.00 },
        { id: 5, code: 'V005', name: 'Vitamina C', lab: 'NatureLab', lote: 'LT971', expiry: '2027-03-01', stock: 42, minStock: 10, price: 7.00 },
        { id: 6, code: 'S006', name: 'Insulina', lab: 'Farmatek', lote: 'LT500', expiry: '2026-05-01', stock: 3, minStock: 5, price: 45.00 }
    ],
    categories: ['Analgésicos','Antibióticos','Antiinflamatorios'],
    laboratories: ['Medifarma','AC Farma','PharmaPlus','BioHealth','NatureLab','Farmatek'],
    providers: ['Proveedor A','Proveedor B','Proveedor C'],
    clients: [{ id:1,name:'Cliente A'},{id:2,name:'Cliente B'}],
    users: [{id:1,usuario:'admin',rol:'administrador'},{id:2,usuario:'juan',rol:'farmaceutico'}],
    sales: [
        { num: 'V-1001', date: todayISO(), time: nowTime(), client: 'Cliente A', user: 'juan', total: 150.00, status: 'Pagado' },
        { num: 'V-1000', date: todayISO(-1), time: nowTime(-60*60), client: 'Cliente B', user: 'admin', total: 230.50, status: 'Anulado' }
    ],
    purchases: [
        { num: 'C-2001', provider: 'Proveedor A', date: todayISO(), time: nowTime(), total: 500.00, status: 'Recibido' }
    ]
};

// ===== Helpers =====
function todayISO(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0,10);
}
function nowTime(offsetSeconds = 0) {
    const d = new Date(Date.now() + offsetSeconds*1000);
    return d.toLocaleTimeString('es-PE', { hour12:false });
}

// ===== Theme =====
function applyTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if(btn) btn.textContent = theme === 'light' ? '🌙 Modo oscuro' : '☀️ Modo claro';
    localStorage.setItem('farmaTheme', theme);
}
function setupThemeToggle(){
    const btn = document.getElementById('themeToggle');
    if(!btn) return;
    btn.addEventListener('click', ()=>{
        appState.theme = appState.theme === 'light' ? 'dark' : 'light';
        applyTheme(appState.theme);
    });
}

// ===== Login (simple) =====
function setupLoginForm(){
    const form = document.getElementById('loginForm');
    if(!form) return;
    form.addEventListener('submit', (e)=>{
        e.preventDefault();
        const usuario = document.getElementById('usuario').value.trim();
        const rol = document.getElementById('rol') ? document.getElementById('rol').value : 'farmaceutico';
        if(!usuario) return;
        const user = { usuario, rol };
        localStorage.setItem('farmaUser', JSON.stringify(user));
        window.location.href = 'dashboard.html';
    });
}

// ===== Dashboard =====
function initDashboard(){
    appState.user = JSON.parse(localStorage.getItem('farmaUser') || 'null');
    if(!appState.user){
        localStorage.setItem('farma_flash','Debe iniciar sesión.');
        window.location.href = 'login.html';
        return;
    }
    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    if(nameEl) nameEl.textContent = appState.user.usuario;
    if(roleEl) roleEl.textContent = appState.user.rol === 'administrador' ? 'Administrador' : 'Farmacéutico';

    startUserClock();

    applyRoleVisibility();
    renderAll();
    setupLogout();
}

function applyRoleVisibility(){
    if(!appState.user) return;
    if(appState.user.rol !== 'administrador'){
        // hide admin-only items by text match (simple)
        document.querySelectorAll('.sidebar .nav-item').forEach(a=>{
            const text = a.textContent || '';
            const forbidden = ['Usuarios','Configuración','Proveedores','Compras','Reportes'];
            if(forbidden.some(f => text.includes(f))) a.remove();
        });
        // hide certain actions
        document.querySelectorAll('.btn-action').forEach(btn=>{ if(btn.textContent.includes('Agregar')||btn.textContent.includes('Generar')) btn.style.display='none'; });
    }
}

function setupLogout(){
    const btn = document.getElementById('logoutBtn');
    if(!btn) return;
    btn.addEventListener('click', ()=>{
        localStorage.removeItem('farmaUser');
        localStorage.setItem('farma_flash','Sesión cerrada correctamente.');
        window.location.href = 'login.html';
    });
}

// ===== User clock =====
function startUserClock(){
    const el = document.getElementById('userClock') || document.getElementById('clock');
    if(!el) return;
    function tick(){
        const now = new Date();
        const date = now.toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' });
        const time = now.toLocaleTimeString('es-PE', { hour12:false });
        el.textContent = `${date} ${time}`;
    }
    tick();
    if(window._userClockInterval) clearInterval(window._userClockInterval);
    window._userClockInterval = setInterval(tick, 1000);
}

function renderAll(){
    renderStats();
    renderStockTable();
    renderLatestSales();
    renderLatestPurchases();
}

function renderStats(){
    const totalMeds = appState.medicines.length;
    const ventasHoy = appState.sales.filter(s => s.date === todayISO()).reduce((sum,s)=>sum + (s.total||0),0);
    const comprasHoy = appState.purchases.filter(p => p.date === todayISO()).reduce((sum,p)=>sum + (p.total||0),0);
    const gananciasHoy = ventasHoy - comprasHoy;
    const agotados = appState.medicines.filter(m=>m.stock===0).length;
    const stockBajo = appState.medicines.filter(m=>m.stock>0 && m.stock<=m.minStock).length;
    const porVencer = appState.medicines.filter(m=>{
        const days = daysUntil(m.expiry);
        return days >=0 && days < 30;
    }).length;
    const clientes = appState.clients.length;

    const cards = document.querySelectorAll('.stat-card');
    if(cards.length>=8){
        cards[0].querySelector('.stat-value').textContent = totalMeds;
        cards[1].querySelector('.stat-value').textContent = 'S/ ' + ventasHoy.toFixed(2);
        cards[2].querySelector('.stat-value').textContent = 'S/ ' + comprasHoy.toFixed(2);
        cards[3].querySelector('.stat-value').textContent = 'S/ ' + gananciasHoy.toFixed(2);
        cards[4].querySelector('.stat-value').textContent = agotados;
        cards[5].querySelector('.stat-value').textContent = stockBajo;
        cards[6].querySelector('.stat-value').textContent = porVencer;
        cards[7].querySelector('.stat-value').textContent = clientes;
    }
}

function daysUntil(isoDate){
    const d = new Date(isoDate);
    const now = new Date();
    const diff = d - new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.ceil(diff / (1000*60*60*24));
}

function renderStockTable(){
    const tbody = document.getElementById('stockTable');
    if(!tbody) return;
    const html = appState.medicines.map(m => `
        <tr>
            <td>${m.name}</td>
            <td>${m.lab}</td>
            <td>${m.lote}</td>
            <td>${m.expiry}</td>
            <td>${m.stock}</td>
            <td>S/ ${m.price.toFixed(2)}</td>
            <td><span class="status-badge">${m.stock===0? 'Agotado' : (m.stock<=m.minStock? 'Bajo stock' : 'Disponible')}</span></td>
            <td></td>
        </tr>
    `).join('');
    tbody.innerHTML = html;
}

function renderLatestSales(){
    const tbody = document.getElementById('latestSales');
    if(!tbody) return;
    if(appState.sales.length===0){
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center">Sin ventas</td></tr>`; return;
    }
    tbody.innerHTML = appState.sales.slice(0,10).map(s=>`<tr>
        <td>${s.num}</td>
        <td>${s.date}</td>
        <td>${s.time}</td>
        <td>${s.client}</td>
        <td>${s.user}</td>
        <td>S/ ${s.total.toFixed(2)}</td>
        <td>${s.status}</td>
        <td><button onclick="viewSale('${s.num}')">Ver</button></td>
    </tr>`).join('');
}

function renderLatestPurchases(){
    const tbody = document.getElementById('latestPurchases');
    if(!tbody) return;
    if(appState.purchases.length===0){
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">Sin compras</td></tr>`; return;
    }
    tbody.innerHTML = appState.purchases.slice(0,10).map(p=>`<tr>
        <td>${p.num}</td>
        <td>${p.provider}</td>
        <td>${p.date}</td>
        <td>${p.time}</td>
        <td>S/ ${p.total.toFixed(2)}</td>
        <td>${p.status}</td>
        <td><button onclick="viewPurchase('${p.num}')">Ver</button></td>
    </tr>`).join('');
}

function viewSale(num){ alert('Ver detalle de venta: ' + num); }
function viewPurchase(num){ alert('Ver detalle de compra: ' + num); }

// Notifications & real-time simulation
function showNotification(message, type='info'){
    // simple visual: alert or console, could be improved
    console.log('NOTIF', type, message);
}

function simulateNewSale(sale){
    appState.sales.unshift(Object.assign({ date: todayISO(), time: nowTime() }, sale));
    renderLatestSales();
    renderStats();
    showNotification('Nueva venta registrada.','success');
}

function simulateNewPurchase(purchase){
    appState.purchases.unshift(Object.assign({ date: todayISO(), time: nowTime() }, purchase));
    renderLatestPurchases();
    renderStats();
    showNotification('Nueva compra registrada.','success');
}

// expose sim functions for testing
window.simulateNewSale = simulateNewSale;
window.simulateNewPurchase = simulateNewPurchase;

// ===== Init =====
window.addEventListener('DOMContentLoaded', ()=>{
    applyTheme(appState.theme);
    setupThemeToggle();
    if(document.body.classList.contains('login-page')) setupLoginForm();
    if(document.body.classList.contains('dashboard-page')) initDashboard();
});
