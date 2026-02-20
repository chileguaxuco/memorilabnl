// MemoriLABNL — Autenticación simple
// Contraseña: "memorilabnl2025" (cambiar el hash si se cambia la contraseña)
// Para generar nuevo hash: ejecutar en consola del navegador:
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('tu_nueva_contraseña'))
//     .then(h => console.log(Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('')))

const AUTH_HASH = "942b45cda65b46359ae353c3c6af1741e9e0550ddb21effecfde03eb4c751b07";

async function verificar() {
  const input = document.getElementById('passInput').value;
  const errorEl = document.getElementById('loginError');

  if (!input) {
    errorEl.textContent = '';
    return;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  if (hashHex === AUTH_HASH) {
    sessionStorage.setItem('memorilabnl_auth', 'true');
    window.location = 'app.html';
  } else {
    errorEl.textContent = 'Contraseña incorrecta';
    document.getElementById('passInput').value = '';
    document.getElementById('passInput').focus();
  }
}

function checkAuth() {
  if (sessionStorage.getItem('memorilabnl_auth') !== 'true') {
    window.location = 'index.html';
    return false;
  }
  return true;
}

function logout() {
  sessionStorage.removeItem('memorilabnl_auth');
  window.location = 'index.html';
}
