-- ============================================================ 
-- BASE DE DATOS PROFESIONAL: RestauranteAutomatizado 
-- ============================================================ 
CREATE DATABASE IF NOT EXISTS RestauranteAutomatizado; 
USE RestauranteAutomatizado; 

-- LIMPIAR OBJETOS EXISTENTES 
DROP VIEW IF EXISTS VistaPedidosClientes; 
DROP VIEW IF EXISTS VistaDetallePedidos; 
DROP VIEW IF EXISTS VistaVentasTotales; 
DROP VIEW IF EXISTS VistaProductosMasVendidos; 
DROP VIEW IF EXISTS VistaResumenDiario; 
DROP VIEW IF EXISTS VistaClientesFrecuentes; 
DROP VIEW IF EXISTS VistaStockProductos; 
DROP TABLE IF EXISTS DetallePedido; 
DROP TABLE IF EXISTS Pedidos; 
DROP TABLE IF EXISTS Productos; 
DROP TABLE IF EXISTS Clientes; 

-- TABLAS 
CREATE TABLE Clientes ( 
    IdCliente     INT AUTO_INCREMENT PRIMARY KEY, 
    Nombre        VARCHAR(100) NOT NULL, 
    Correo        VARCHAR(100) UNIQUE NOT NULL, 
    Telefono      VARCHAR(20), 
    Password      VARCHAR(255) NOT NULL DEFAULT '123456', -- Adición para login
    FechaRegistro DATETIME DEFAULT NOW() 
); 

CREATE TABLE Productos ( 
    IdProducto INT AUTO_INCREMENT PRIMARY KEY, 
    Nombre     VARCHAR(100) NOT NULL, 
    Categoria  VARCHAR(50), 
    Precio     DECIMAL(10,2) NOT NULL, 
    Disponible TINYINT(1) DEFAULT 1, 
    ImagenUrl  TEXT -- Adición para la web 
); 

CREATE TABLE Pedidos ( 
    IdPedido  INT AUTO_INCREMENT PRIMARY KEY, 
    IdCliente INT NOT NULL, 
    Fecha     DATETIME DEFAULT NOW(), 
    Estado    VARCHAR(20) DEFAULT 'Recibido', 
    Total     DECIMAL(10,2) DEFAULT 0, -- Adición para registro de monto
    FOREIGN KEY (IdCliente) REFERENCES Clientes(IdCliente) 
); 

CREATE TABLE DetallePedido ( 
    IdPedido       INT NOT NULL, 
    IdProducto     INT NOT NULL, 
    Cantidad       INT NOT NULL DEFAULT 1, 
    PrecioUnitario DECIMAL(10,2), -- Para reportes
    PRIMARY KEY (IdPedido, IdProducto), 
    FOREIGN KEY (IdPedido)   REFERENCES Pedidos(IdPedido), 
    FOREIGN KEY (IdProducto) REFERENCES Productos(IdProducto) 
); 

-- DATOS DE PRUEBA 
INSERT INTO Clientes (Nombre, Correo, Telefono, Password) VALUES 
('Nicolas Betancourt', 'nico@email.com',  '3124947855', '123456'), 
('Juan Cespedes',      'juan@email.com',  '3001234567', '123456'), 
('Karol Orjuela',      'karol@email.com', '3111234567', '123456'), 
('Paula Roman',        'paula@email.com', '3201234567', '123456'); 

INSERT INTO Productos (Nombre, Categoria, Precio, Disponible, ImagenUrl) VALUES 
('Hamburguesa Clásica', 'Plato Fuerte', 15000, 1, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800'), 
('Pizza Margarita',     'Plato Fuerte', 20000, 1, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800'), 
('Pizza Pepperoni',      'Plato Fuerte', 22000, 1, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=800'),
('Gaseosa 500ml',       'Bebida',        5000, 1, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800'), 
('Agua Mineral',        'Bebida',        3000, 1, 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?q=80&w=800'), 
('Limonada Natural',    'Bebida',        6000, 1, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800'),
('Bandeja Paisa',       'Plato Fuerte', 28000, 1, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?q=80&w=800'), 
('Tacos al Pastor',     'Plato Fuerte', 18000, 1, 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?q=80&w=800'),
('Pasta Carbonara',     'Plato Fuerte', 25000, 1, 'https://images.unsplash.com/photo-1612874742237-6526221588e3?q=80&w=800'),
('Helado Cremoso',      'Postre',        7000, 1, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=800'), 
('Brownie con Helado',  'Postre',       12000, 1, 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?q=80&w=800'),
('Ensalada Mixta',      'Entrada',      10000, 1, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800'), 
('Nachos con Queso',    'Entrada',      14000, 1, 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?q=80&w=800'),
('Café Americano',      'Bebida',        4500, 1, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800'); 

-- VISTAS OFICIALES 
CREATE VIEW VistaPedidosClientes AS 
    SELECT P.IdPedido, C.Nombre AS Cliente, C.Correo, P.Fecha, P.Estado 
    FROM Pedidos P 
    JOIN Clientes C ON P.IdCliente = C.IdCliente; 

CREATE VIEW VistaDetallePedidos AS 
    SELECT P.IdPedido, C.Nombre AS Cliente, PR.Nombre AS Producto, PR.Categoria, DP.Cantidad, PR.Precio, (DP.Cantidad * PR.Precio) AS Subtotal, P.Estado 
    FROM DetallePedido DP 
    JOIN Pedidos P ON DP.IdPedido = P.IdPedido 
    JOIN Clientes C ON P.IdCliente = C.IdCliente 
    JOIN Productos PR ON DP.IdProducto = PR.IdProducto; 

CREATE VIEW VistaVentasTotales AS 
    SELECT C.Nombre AS Cliente, C.Correo, COUNT(DISTINCT P.IdPedido) AS TotalPedidos, SUM(DP.Cantidad * PR.Precio) AS TotalGastado, AVG(DP.Cantidad * PR.Precio) AS PromedioGastado 
    FROM Clientes C 
    JOIN Pedidos P ON C.IdCliente = P.IdCliente 
    JOIN DetallePedido DP ON P.IdPedido = DP.IdPedido 
    JOIN Productos PR ON DP.IdProducto = PR.IdProducto 
    WHERE P.Estado IN ('Entregado', 'Recibido')
    GROUP BY C.Nombre, C.Correo; 

CREATE VIEW VistaProductosMasVendidos AS 
    SELECT PR.IdProducto, PR.Nombre AS Producto, PR.Categoria, PR.Precio, SUM(DP.Cantidad) AS UnidadesVendidas, SUM(DP.Cantidad * PR.Precio) AS IngresoGenerado, RANK() OVER (ORDER BY SUM(DP.Cantidad) DESC) AS Posicion 
    FROM Productos PR 
    JOIN DetallePedido DP ON PR.IdProducto = DP.IdProducto 
    JOIN Pedidos P ON DP.IdPedido = P.IdPedido 
    GROUP BY PR.IdProducto, PR.Nombre, PR.Categoria, PR.Precio; 

CREATE VIEW VistaResumenDiario AS 
    SELECT CAST(P.Fecha AS DATE) AS Dia, COUNT(DISTINCT P.IdPedido) AS TotalPedidos, COUNT(DP.IdProducto) AS TotalItems, SUM(DP.Cantidad * PR.Precio) AS IngresoTotal, AVG(DP.Cantidad * PR.Precio) AS TicketPromedio 
    FROM Pedidos P 
    JOIN DetallePedido DP ON P.IdPedido = DP.IdPedido 
    JOIN Productos PR ON DP.IdProducto = PR.IdProducto 
    GROUP BY CAST(P.Fecha AS DATE); 

CREATE VIEW VistaClientesFrecuentes AS 
    SELECT C.IdCliente, C.Nombre, C.Correo, C.Telefono, COUNT(P.IdPedido) AS CantidadPedidos, SUM(DP.Cantidad * PR.Precio) AS TotalGastado, MAX(P.Fecha) AS UltimaVisita 
    FROM Clientes C 
    JOIN Pedidos P ON C.IdCliente = P.IdCliente 
    JOIN DetallePedido DP ON P.IdPedido = DP.IdPedido 
    JOIN Productos PR ON DP.IdProducto = PR.IdProducto 
    GROUP BY C.IdCliente, C.Nombre, C.Correo, C.Telefono 
    HAVING COUNT(P.IdPedido) >= 1; 

CREATE VIEW VistaStockProductos AS 
    SELECT IdProducto, Nombre, Categoria, Precio, 
           CASE WHEN Disponible = 1 THEN 'Disponible' ELSE 'Agotado' END AS Estado 
    FROM Productos; 
