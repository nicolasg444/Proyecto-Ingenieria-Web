const API_URL = '/api';

let cart = [];
let categories = [];
let products = [];
let currentCategory = 'Todos';
let currentUser = JSON.parse(localStorage.getItem('user')) || null;

// --- INICIALIZACIÓN ---
async function init() {
    createToastContainer(); 
    checkPersistentNotif(); 
    startBackgroundTimerCheck(); // Nueva función: Revisar cronómetro en segundo plano
    
    if (currentUser) {
        // Verificar si el usuario aún existe en la base de datos (por si se reseteó la DB)
        try {
            const res = await fetch(`${API_URL}/auth/verify?id=${currentUser.IdCliente}`);
            if (!res.ok) throw new Error();
            
            showView('menu-view');
            updateUserInfo();
            await fetchCategories();
            await fetchProducts();
            await fetchTrending();
            renderCategories();
            renderProducts();
        } catch (e) {
            console.log("Sesión inválida o DB reseteada. Limpiando...");
            logout();
        }
    } else {
        showView('auth-view');
    }
    updateCartUI();
}

function checkPersistentNotif() {
    if (localStorage.getItem('orderReady') === 'true') {
        document.getElementById('ready-notification').classList.remove('hidden');
    }
}

function startBackgroundTimerCheck() {
    const finishTime = localStorage.getItem('orderFinishTime');
    if (!finishTime) return;

    const checkInterval = setInterval(() => {
        const now = Date.now();
        if (now >= parseInt(finishTime)) {
            // ¡EL TIEMPO SE CUMPLIÓ!
            localStorage.setItem('orderReady', 'true');
            localStorage.removeItem('orderFinishTime');
            document.getElementById('ready-notification').classList.remove('hidden');
            showToast("¡Pedido Listo!", "Tu pedido anterior ya está preparado.");
            clearInterval(checkInterval);
        }
    }, 1000);
}

function closeReadyNotif() {
    document.getElementById('ready-notification').classList.add('hidden');
    localStorage.removeItem('orderReady');
}

// --- NOTIFICACIONES TOAST ---
function createToastContainer() {
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
}

function showToast(title, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <div class="toast-content">
            <h5>${title}</h5>
            <p>${message}</p>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// --- PRODUCTOS TOP ---
async function fetchTrending() {
    try {
        const res = await fetch(`${API_URL}/reportes/productos-top`);
        const data = await res.json();
        const container = document.getElementById('trending-products');
        
        // Mostrar los 3 más vendidos
        const top3 = data.slice(0, 3);
        if (top3.length === 0) {
            document.getElementById('trending-container').classList.add('hidden');
            return;
        }

        container.innerHTML = top3.map(p => `
            <div class="trending-card" onclick="addToCartByProductName('${p.Producto}')">
                <img src="${p.ImagenUrl}" class="trending-img" onerror="this.src='https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800'">
                <div class="trending-info">
                    <h4>${p.Producto}</h4>
                    <p>$${parseFloat(p.Precio).toLocaleString()}</p>
                </div>
                <div class="trending-badge">#${p.Posicion} TOP</div>
            </div>
        `).join('');
    } catch (e) { 
        document.getElementById('trending-container').classList.add('hidden');
    }
}

function addToCartByProductName(name) {
    const p = products.find(prod => prod.Nombre === name);
    if (p) {
        addToCart(p.IdProducto);
        showToast("¡Añadido!", `${name} se agregó al carrito.`);
    }
}

// --- AUTENTICACIÓN ---
function showAuthTab(type) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    if (type === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
    }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const correo = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password })
        });
        const data = await res.json();
        if (data.user) {
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(currentUser));
            location.reload();
        } else {
            alert(data.error || 'Error al ingresar');
        }
    } catch (err) { alert('Error de conexión'); }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value;
    const correo = document.getElementById('reg-correo').value;
    const telefono = document.getElementById('reg-telefono').value;
    const password = document.getElementById('reg-password').value;

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, correo, telefono, password })
        });
        const data = await res.json();
        if (data.idCliente) {
            alert('Registro exitoso. Ahora puedes ingresar.');
            showAuthTab('login');
        } else {
            alert(data.error || 'Error al registrar');
        }
    } catch (err) { alert('Error de conexión'); }
});

function logout() {
    localStorage.removeItem('user');
    location.reload();
}

function updateUserInfo() {
    const infoDiv = document.getElementById('user-info');
    const adminDiv = document.getElementById('admin-info');
    const nameSpan = document.getElementById('user-name');
    if (currentUser) {
        infoDiv.classList.remove('hidden');
        nameSpan.innerText = `Hola, ${currentUser.Nombre.split(' ')[0]}`;
        // Mostrar botón de reportes si es el usuario admin (ej. Nicolas)
        if (currentUser.Nombre.toLowerCase().includes('nicolas')) {
            adminDiv.classList.remove('hidden');
        }
    }
}

// --- PANEL DE ADMINISTRACIÓN (REPORTES) ---
async function toggleAdminPanel() {
    let panel = document.getElementById('admin-modal');
    if (panel) {
        panel.remove();
        return;
    }

    panel = document.createElement('div');
    panel.id = 'admin-modal';
    panel.className = 'admin-panel';
    panel.innerHTML = `
        <div class="admin-card">
            <span class="close-admin" onclick="toggleAdminPanel()">&times;</span>
            <h2>Panel de Reportes Profesionales</h2>
            <p>Datos extraídos directamente de las Vistas SQL</p>
            
            <div class="admin-tabs" style="margin: 1rem 0; display: flex; gap: 10px;">
                <button class="category-btn active" onclick="loadReport('ventas-totales', this)">Ventas Totales</button>
                <button class="category-btn" onclick="loadReport('productos-top', this)">Top Productos</button>
                <button class="category-btn" onclick="loadReport('clientes-frecuentes', this)">Clientes Frecuentes</button>
            </div>
            <div id="admin-table-container">Cargando datos...</div>
        </div>
    `;
    document.body.appendChild(panel);
    loadReport('ventas-totales');
}

async function loadReport(type, btn) {
    if (btn) {
        document.querySelectorAll('.admin-tabs .category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    const container = document.getElementById('admin-table-container');
    try {
        const res = await fetch(`${API_URL}/reportes/${type}`);
        const data = await res.json();
        
        if (data.length === 0) {
            container.innerHTML = '<p>No hay datos registrados aún.</p>';
            return;
        }

        let html = '<table class="admin-table"><thead><tr>';
        Object.keys(data[0]).forEach(key => html += `<th>${key}</th>`);
        html += '</tr></thead><tbody>';
        
        data.forEach(row => {
            html += '<tr>';
            Object.values(row).forEach(val => {
                const displayVal = typeof val === 'number' && !isNaN(val) ? val.toLocaleString() : val;
                html += `<td>${displayVal}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<p>Error al cargar el reporte.</p>';
    }
}

// --- PRODUCTOS ---
async function fetchCategories() {
    try {
        const res = await fetch(`${API_URL}/categorias`);
        categories = await res.json();
    } catch (e) { categories = [{ nombre: 'Todos' }]; }
}

async function fetchProducts() {
    try {
        const res = await fetch(`${API_URL}/productos?categoria=${currentCategory}`);
        products = await res.json();
    } catch (e) { products = []; }
}

function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = categories.map(cat => `
        <button class="category-btn ${currentCategory === cat.nombre ? 'active' : ''}" 
                onclick="setCategory('${cat.nombre}')">${cat.nombre}</button>
    `).join('');
}

function renderProducts() {
    const container = document.getElementById('products-container');
    if (products.length === 0) {
        container.innerHTML = '<p>No hay productos en esta categoría.</p>';
        return;
    }
    container.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="product-img-wrapper">
                <img src="${p.ImagenUrl}" class="product-img" onerror="this.src='https://via.placeholder.com/300x200?text=Comida'">
                ${p.Disponible == 0 ? '<div class="out-of-stock">Agotado</div>' : ''}
            </div>
            <div class="product-info">
                <p class="product-cat">${p.Categoria}</p>
                <h3 class="product-name">${p.Nombre}</h3>
                <div class="price-row">
                    <span class="price">$${parseFloat(p.Precio).toLocaleString()}</span>
                    <button class="add-btn" onclick="addToCart(${p.IdProducto})" ${p.Disponible == 0 ? 'disabled' : ''}>
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function setCategory(cat) {
    currentCategory = cat;
    renderCategories();
    await fetchProducts();
    renderProducts();
}

// --- CARRITO ---
function addToCart(id) {
    const p = products.find(prod => prod.IdProducto == id);
    const item = cart.find(i => i.IdProducto == id);
    if (item) item.cantidad++;
    else cart.push({...p, cantidad: 1});
    updateCartUI();
}

function removeFromCart(id) {
    const idx = cart.findIndex(i => i.IdProducto == id);
    if (cart[idx].cantidad > 1) cart[idx].cantidad--;
    else cart.splice(idx, 1);
    updateCartUI();
}

function updateCartUI() {
    const total = cart.reduce((s, i) => s + (i.Precio * i.cantidad), 0);
    const count = cart.reduce((s, i) => s + i.cantidad, 0);
    document.getElementById('cart-count').innerText = `${count} items`;
    document.getElementById('cart-total-amount').innerText = `$${total.toLocaleString()}`;
    
    const container = document.getElementById('cart-items-container');
    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-cart-msg"><p>Carrito vacío</p></div>';
        document.getElementById('cart-footer').classList.add('hidden');
    } else {
        container.innerHTML = cart.map(i => `
            <div class="cart-item">
                <div class="item-details">
                    <p class="item-name">${i.Nombre}</p>
                    <p class="item-price">$${(i.Precio * i.cantidad).toLocaleString()}</p>
                </div>
                <div class="item-controls">
                    <button onclick="removeFromCart(${i.IdProducto})">-</button>
                    <span>${i.cantidad}</span>
                    <button onclick="addToCart(${i.IdProducto})">+</button>
                </div>
            </div>
        `).join('');
        document.getElementById('cart-footer').classList.remove('hidden');
    }
}

// --- NAVEGACIÓN ---
function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function goToStep(step) {
    const viewId = step === 1 ? 'menu-view' : step === 2 ? 'checkout-view' : 'status-view';
    showView(viewId);
    document.querySelectorAll('.step').forEach((s, i) => s.classList.toggle('active', i + 1 <= step));
    if (step === 2) renderCheckoutSummary();
}

function renderCheckoutSummary() {
    const total = cart.reduce((s, i) => s + (i.Precio * i.cantidad), 0);
    document.getElementById('checkout-summary').innerHTML = `
        <div class="checkout-summary-card">
            ${cart.map(i => `
                <div class="summary-line">
                    <span>${i.Nombre} x${i.cantidad}</span>
                    <span>$${(i.Precio * i.cantidad).toLocaleString()}</span>
                </div>
            `).join('')}
            <div class="summary-total-line">
                <span>Total</span>
                <span>$${total.toLocaleString()}</span>
            </div>
        </div>
    `;
}

document.getElementById('checkout-btn').addEventListener('click', () => goToStep(2));

document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return alert('Debes iniciar sesión');
    
    const total = cart.reduce((s, i) => s + (i.Precio * i.cantidad), 0);
    try {
        const res = await fetch(`${API_URL}/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                total, 
                items: cart, 
                idCliente: currentUser.IdCliente 
            })
        });
        const result = await res.json();
        if (result.pedidoId) {
            // ... (código existente del tiempo estimado)
            document.getElementById('order-id').innerText = result.pedidoId;
            const uniqueItems = cart.length;
            
            // TIEMPOS CORTOS: 5 segundos base + 2 por item
            const waitSeconds = 5 + (uniqueItems * 2);
            const finishTime = Date.now() + (waitSeconds * 1000);
            localStorage.setItem('orderFinishTime', finishTime); // Guardar cuándo debe terminar
            
            document.getElementById('estimated-time').innerText = `${waitSeconds} segundos`;

            goToStep(3);
            
            // Simulación de progreso visual en la pantalla de estado
            const timelineSteps = document.querySelectorAll('.timeline-step');
            if (timelineSteps.length >= 3) {
                setTimeout(() => {
                    timelineSteps[1].classList.add('completed');
                    timelineSteps[2].classList.add('active');
                }, 2000);
            }

            // Iniciar el chequeo inmediatamente por si se queda en esta vista
            startBackgroundTimerCheck();

            cart = [];
            updateCartUI();
        } else {
            alert("Error del servidor: " + (result.error || "Desconocido"));
        }
    } catch (e) { 
        alert("Error de conexión al procesar el pago: " + e.message); 
    }
});

init();
