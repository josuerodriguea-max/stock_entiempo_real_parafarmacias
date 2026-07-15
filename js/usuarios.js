(function(){
    function $(id){return document.getElementById(id);} 
    const usersStoreKey='sistema_users';
    let users=JSON.parse(localStorage.getItem(usersStoreKey)||'[]');
    if(!users.length){
        users=[
            {id:1, photo:'', nombres:'Admin', apellidos:'Principal', dni:'12345678', birth:'1990-01-01', sexo:'M', direccion:'Lima', telefono:'999999999', email:'admin@farmastock.local', username:'admin', password:'admin123', role:'administrador', status:'activo', registeredAt:new Date().toISOString().slice(0,10), lastAccess:''},
            {id:2, photo:'', nombres:'Juan', apellidos:'Pérez', dni:'87654321', birth:'1994-02-02', sexo:'M', direccion:'Arequipa', telefono:'988888888', email:'juan@farmastock.local', username:'juan', password:'juan2024', role:'farmaceutico', status:'activo', registeredAt:new Date().toISOString().slice(0,10), lastAccess:''}
        ]; localStorage.setItem(usersStoreKey, JSON.stringify(users));
    }

    function checkSession(){
        const user=JSON.parse(localStorage.getItem('farmaUser')||'null');
        if(!user){ localStorage.setItem('farma_flash','Debe iniciar sesión.'); window.location.href='login.html'; return null; }
        if(user.rol!=='administrador'){ alert('Acceso denegado. No tiene permisos para acceder a este módulo.'); window.location.href='dashboard.html'; return null; }
        return user;
    }
    function saveUsers(){ localStorage.setItem(usersStoreKey, JSON.stringify(users)); }
    function recordAudit(entry){ const log=JSON.parse(localStorage.getItem('users_audit')||'[]'); log.push({timestamp:new Date().toISOString(), user:(JSON.parse(localStorage.getItem('farmaUser')||'null')||{}).usuario||'anon', ...entry}); localStorage.setItem('users_audit', JSON.stringify(log)); }
    function simpleHash(v){ let h=0; for(let i=0;i<v.length;i++) h = (h<<5)-h + v.charCodeAt(i); return String(h); }

    function getFiltered(){
        const q=($('userSearch').value||'').toLowerCase(); const role=($('userFilterRole').value||'').toLowerCase(); const status=($('userFilterStatus').value||'').toLowerCase();
        return users.filter(u=>{
            const hay=[u.nombres,u.apellidos,u.dni,u.email,u.username,u.role,u.status].join(' ').toLowerCase();
            if(q && !hay.includes(q)) return false;
            if(role && u.role!==role) return false;
            if(status && u.status!==status) return false;
            return true;
        });
    }

    function render(){
        const user=checkSession(); if(!user) return;
        $('userName').textContent=user.usuario; $('userRole').textContent='Administrador';
        const list=getFiltered();
        $('usersTableBody').innerHTML = list.map(u=>`<tr><td>${u.id}</td><td>${u.photo?`<img src="${u.photo}" width="32" height="32">`:'-'}</td><td>${u.nombres}</td><td>${u.apellidos}</td><td>${u.dni}</td><td>${u.email}</td><td>${u.telefono}</td><td>${u.username}</td><td>${u.role}</td><td>${u.status}</td><td>${u.registeredAt||''}</td><td>${u.lastAccess||''}</td><td><button onclick="window.usersModule.edit(${u.id})">Editar</button> <button onclick="window.usersModule.resetPass(${u.id})">Pass</button> <button onclick="window.usersModule.toggle(${u.id})">${u.status==='activo'?'Desactivar':'Activar'}</button> <button onclick="window.usersModule.remove(${u.id})">Eliminar</button></td></tr>`).join('');
    }

    function openModal(editUser){
        $('userModal').style.display='block'; $('userFormMsg').textContent='';
        if(editUser){
            $('userModalTitle').textContent='Editar Usuario';
            $('userId').value=editUser.id;
            $('userPhoto').value=editUser.photo||'';
            $('userNombres').value=editUser.nombres||'';
            $('userApellidos').value=editUser.apellidos||'';
            $('userDni').value=editUser.dni||'';
            $('userBirth').value=editUser.birth||'';
            $('userSexo').value=editUser.sexo||'';
            $('userDireccion').value=editUser.direccion||'';
            $('userTelefono').value=editUser.telefono||'';
            $('userEmail').value=editUser.email||'';
            $('userUsername').value=editUser.username||'';
            $('userPassword').value=''; $('userConfirmPassword').value='';
            $('userRoleSelect').value=editUser.role||'farmaceutico';
            $('userStatusSelect').value=editUser.status||'activo';
        } else {
            $('userModalTitle').textContent='Nuevo Usuario';
            $('userForm').reset(); $('userId').value='';
        }
    }
    function closeModal(){ $('userModal').style.display='none'; }

    function validateUser(payload, isEdit){
        if(!payload.nombres||!payload.apellidos||!payload.dni||!payload.email||!payload.username) return 'Todos los campos obligatorios.';
        if(String(payload.dni).length<8) return 'El DNI debe tener la longitud correcta.';
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return 'El correo debe tener un formato válido.';
        if(payload.telefono && !/^\+?\d{7,12}$/.test(payload.telefono)) return 'El teléfono debe tener un formato válido.';
        if(!isEdit){
            if(!payload.password || payload.password.length<8) return 'La contraseña debe tener al menos 8 caracteres.';
            if(!/[A-Za-z]/.test(payload.password) || !/[0-9]/.test(payload.password)) return 'La contraseña debe contener letras y números.';
            if(payload.password!==payload.confirmPassword) return 'Las contraseñas deben coincidir.';
            if(users.some(u=>u.username===payload.username)) return 'El nombre de usuario ya existe.';
            if(users.some(u=>u.dni===payload.dni)) return 'El DNI ya está registrado.';
            if(users.some(u=>u.email===payload.email)) return 'El correo ya está registrado.';
        }
        return null;
    }

    function saveUser(e){
        e.preventDefault();
        const isEdit=!!$('userId').value;
        const payload={
            photo:$('userPhoto').value.trim(),
            nombres:$('userNombres').value.trim(),
            apellidos:$('userApellidos').value.trim(),
            dni:$('userDni').value.trim(),
            birth:$('userBirth').value,
            sexo:$('userSexo').value.trim(),
            direccion:$('userDireccion').value.trim(),
            telefono:$('userTelefono').value.trim(),
            email:$('userEmail').value.trim(),
            username:$('userUsername').value.trim(),
            password:$('userPassword').value,
            confirmPassword:$('userConfirmPassword').value,
            role:$('userRoleSelect').value,
            status:$('userStatusSelect').value
        };
        const err=validateUser(payload,isEdit); if(err){ $('userFormMsg').textContent=err; return; }
        if(isEdit){
            const u=users.find(x=>String(x.id)===String($('userId').value)); if(!u) return; Object.assign(u,payload,{password:u.password});
            u.role=payload.role; u.status=payload.status; u.lastAccess=u.lastAccess||''; recordAudit({action:'usuario_actualizado', user:u.username});
            $('userFormMsg').textContent='Información actualizada correctamente.';
        } else {
            const newUser={id:users.length?Math.max(...users.map(x=>x.id))+1:1, photo:payload.photo, nombres:payload.nombres, apellidos:payload.apellidos, dni:payload.dni, birth:payload.birth, sexo:payload.sexo, direccion:payload.direccion, telefono:payload.telefono, email:payload.email, username:payload.username, password:simpleHash(payload.password), role:payload.role, status:payload.status, registeredAt:new Date().toISOString().slice(0,10), lastAccess:''};
            users.unshift(newUser); recordAudit({action:'usuario_creado', user:newUser.username});
            $('userFormMsg').textContent='Usuario registrado correctamente.';
        }
        saveUsers(); render(); closeModal();
    }

    function resetPass(id){ const u=users.find(x=>x.id===id); if(!u) return; const np=prompt('Nueva contraseña'); if(!np) return; if(np.length<8||!/[A-Za-z]/.test(np)||!/\d/.test(np)){ alert('La contraseña debe tener al menos 8 caracteres y contener letras y números.'); return; } u.password=simpleHash(np); saveUsers(); recordAudit({action:'password_actualizada', user:u.username}); alert('Contraseña actualizada correctamente.'); }
    function toggle(id){ const u=users.find(x=>x.id===id); if(!u) return; u.status=u.status==='activo'?'inactivo':'activo'; saveUsers(); recordAudit({action:u.status==='activo'?'usuario_activado':'usuario_desactivado', user:u.username}); alert(u.status==='activo'?'Usuario activado.':'Usuario desactivado.'); render(); }
    function remove(id){ const u=users.find(x=>x.id===id); if(!u) return; if(!confirm('¿Desea eliminar?')) return; if(u.role==='administrador' && users.filter(x=>x.role==='administrador').length===1){ alert('No se puede eliminar el único administrador.'); return; } users=users.filter(x=>x.id!==id); saveUsers(); recordAudit({action:'usuario_eliminado', user:u.username}); alert('Usuario eliminado.'); render(); }
    function edit(id){ const u=users.find(x=>x.id===id); if(!u) return; openModal(u); }
    function exportExcel(){ const rows=[['ID','Nombres','Apellidos','DNI','Correo','Teléfono','Usuario','Rol','Estado','Registro','Último Acceso']]; users.forEach(u=>rows.push([u.id,u.nombres,u.apellidos,u.dni,u.email,u.telefono,u.username,u.role,u.status,u.registeredAt,u.lastAccess])); const csv=rows.map(r=>r.join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='usuarios.csv'; a.click(); URL.revokeObjectURL(url); }

    function init(){
        const user=checkSession(); if(!user) return;
        $('userName').textContent=user.usuario; $('userRole').textContent='Administrador';
        $('userSearch').addEventListener('input', render);
        $('userFilterRole').addEventListener('change', render);
        $('userFilterStatus').addEventListener('change', render);
        $('btnNewUser').addEventListener('click', ()=>openModal());
        $('cancelUserBtn').addEventListener('click', closeModal);
        $('userForm').addEventListener('submit', saveUser);
        $('btnExportExcel').addEventListener('click', exportExcel);
        render();
    }
    window.usersModule={ edit, resetPass, toggle, remove };
    document.addEventListener('DOMContentLoaded', init);
})();