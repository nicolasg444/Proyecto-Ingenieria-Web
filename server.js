const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// CONFIGURACIÓN DE BASE DE DATOS
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'RestauranteAutomatizado',
    port: 3306
};

const db = mysql.createConnection(dbConfig);

db.connect(err => {
    if (err) {
        console.error('❌ Error de conexión a MySQL:', err.message);
    } else {
        console.log('✅ Conectado a la base de datos MySQL (RestauranteAutomatizado)');
    }
});

// --- ENDPOINTS DE AUTENTICACIÓN ---

// Registro de usuario
app.post('/api/auth/register', (req, res) => {
    const { nombre, correo, telefono, password } = req.body;
    const sql = 'INSERT INTO Clientes (Nombre, Correo, Telefono, Password) VALUES (?, ?, ?, ?)';
    db.query(sql, [nombre, correo, telefono, password], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'El correo ya está registrado' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Usuario registrado con éxito', idCliente: result.insertId });
    });
});

// Login de usuario
app.post('/api/auth/login', (req, res) => {
    const { correo, password } = req.body;
    const sql = 'SELECT IdCliente, Nombre, Correo FROM Clientes WHERE Correo = ? AND Password = ?';
    db.query(sql, [correo, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }
        res.json({ message: 'Login exitoso', user: results[0] });
    });
});

// Verificar existencia de usuario (para sincronizar con localStorage)
app.get('/api/auth/verify', (req, res) => {
    const { id } = req.query;
    db.query('SELECT IdCliente FROM Clientes WHERE IdCliente = ?', [id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ exists: true });
    });
});

// --- ENDPOINTS DE PRODUCTOS ---

app.get('/api/categorias', (req, res) => {
    db.query('SELECT DISTINCT Categoria as nombre FROM Productos', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json([{ nombre: 'Todos' }, ...results]);
    });
});

app.get('/api/productos', (req, res) => {
    const { categoria } = req.query;
    let sql = 'SELECT * FROM Productos';
    const params = [];
    if (categoria && categoria !== 'Todos') {
        sql += ' WHERE Categoria = ?';
        params.push(categoria);
    }
    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Actualizar un producto (PUT)
app.put('/api/productos/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, categoria, precio, disponible } = req.body;
    const sql = 'UPDATE Productos SET Nombre = ?, Categoria = ?, Precio = ?, Disponible = ? WHERE IdProducto = ?';
    db.query(sql, [nombre, categoria, precio, disponible, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json({ message: 'Producto actualizado con éxito' });
    });
});

// Eliminar un producto (DELETE)
app.delete('/api/productos/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM Productos WHERE IdProducto = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json({ message: 'Producto eliminado con éxito' });
    });
});

// --- ENDPOINT DE PEDIDOS ---

app.post('/api/pedidos', (req, res) => {
    const { total, items, idCliente } = req.body;

    if (!idCliente) {
        return res.status(400).json({ error: 'Usuario no autenticado' });
    }

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ error: err.message });

        db.query('INSERT INTO Pedidos (IdCliente, Estado, Total) VALUES (?, "Recibido", ?)', [idCliente, total], (err, result) => {
            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

            const pedidoId = result.insertId;
            const values = items.map(item => [pedidoId, item.IdProducto, item.cantidad, item.Precio]);

            db.query('INSERT INTO DetallePedido (IdPedido, IdProducto, Cantidad, PrecioUnitario) VALUES ?', [values], (err) => {
                if (err) {
                    console.error('❌ Error en DetallePedido:', err.message);
                    return db.rollback(() => res.status(500).json({ error: 'Error al insertar detalles: ' + err.message }));
                }

                db.commit(err => {
                    if (err) {
                        console.error('❌ Error en Commit:', err.message);
                        return db.rollback(() => res.status(500).json({ error: 'Error en commit: ' + err.message }));
                    }
                    res.json({ pedidoId });
                });
            });
        });
    });
});

// Actualizar estado de un pedido (PUT)
app.put('/api/pedidos/:id/estado', (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    db.query('UPDATE Pedidos SET Estado = ? WHERE IdPedido = ?', [estado, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
        res.json({ message: 'Estado del pedido actualizado' });
    });
});

// Eliminar un pedido (DELETE)
app.delete('/api/pedidos/:id', (req, res) => {
    const { id } = req.params;
    
    db.beginTransaction(err => {
        if (err) return res.status(500).json({ error: err.message });

        // Primero eliminar detalles por la restricción de llave foránea
        db.query('DELETE FROM DetallePedido WHERE IdPedido = ?', [id], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

            db.query('DELETE FROM Pedidos WHERE IdPedido = ?', [id], (err, result) => {
                if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                
                if (result.affectedRows === 0) {
                    return db.rollback(() => res.status(404).json({ error: 'Pedido no encontrado' }));
                }

                db.commit(err => {
                    if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                    res.json({ message: 'Pedido eliminado con éxito' });
                });
            });
        });
    });
});

// --- ENDPOINTS DE REPORTES (VISTAS) ---

app.get('/api/reportes/ventas-totales', (req, res) => {
    db.query('SELECT * FROM VistaVentasTotales', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/reportes/productos-top', (req, res) => {
    const sql = `
        SELECT PR.Nombre AS Producto, PR.Precio, PR.ImagenUrl, SUM(DP.Cantidad) AS UnidadesVendidas, RANK() OVER (ORDER BY SUM(DP.Cantidad) DESC) AS Posicion 
        FROM Productos PR 
        JOIN DetallePedido DP ON PR.IdProducto = DP.IdProducto 
        GROUP BY PR.IdProducto, PR.Nombre, PR.Precio, PR.ImagenUrl
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        // Asegurarse de que ImagenUrl no sea null
        const fixedResults = results.map(p => ({
            ...p,
            ImagenUrl: p.ImagenUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800'
        }));
        res.json(fixedResults);
    });
});

app.get('/api/reportes/clientes-frecuentes', (req, res) => {
    db.query('SELECT * FROM VistaClientesFrecuentes', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// RUTA PRINCIPAL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
