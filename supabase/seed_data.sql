-- ==========================================
-- SEED DATA - TEXTIL PYMES DEMO
-- ==========================================

-- 1. USUARIOS INTERNOS
-- INSERT INTO public.usuarios_internos (id, email, nombre, apellido, rol, activo)
-- VALUES 
--     (gen_random_uuid(), 'admin@textil.com', 'Admin', 'Sistema', 'admin', true)
-- ON CONFLICT (id) DO NOTHING;

-- 2. CATEGORÍAS
INSERT INTO public.categorias (id, nombre, codigo, orden, descripcion) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Beba', 'BEBA', 1, 'Ropa para bebas de 0 a 36 meses'),
    ('22222222-2222-2222-2222-222222222222', 'Bebe', 'BEBE', 2, 'Ropa para bebes de 0 a 36 meses'),
    ('33333333-3333-3333-3333-333333333333', 'Nena', 'NENA', 3, 'Indumentaria para niñas'),
    ('44444444-4444-4444-4444-444444444444', 'Nene', 'NENE', 4, 'Indumentaria para niños')
ON CONFLICT DO NOTHING;

-- 3. PROVEEDORES
INSERT INTO public.proveedores (id, codigo, nombre, tipo, contacto, email) VALUES
    ('55555555-5555-5555-5555-555555555551', 'PROV-01', 'Textil La Nueva', 'tela', 'Juan Perez', 'ventas@lanueva.com'),
    ('55555555-5555-5555-5555-555555555552', 'PROV-02', 'Avios y Cia', 'insumo', 'Maria Gomez', 'info@avios.com')
ON CONFLICT DO NOTHING;

-- 4. ROLLOS DE TELA
INSERT INTO public.rollos_tela (codigo, tipo_tela, color, metros_iniciales, metros_restantes, costo_por_metro, proveedor_id) VALUES
    ('R-JEAN-01', 'Jean Rígido', 'Azul Clásico', 100, 85, 4500, '55555555-5555-5555-5555-555555555551'),
    ('R-GAB-01', 'Gabardina', 'Beige', 80, 80, 3800, '55555555-5555-5555-5555-555555555551'),
    ('R-JER-01', 'Jersey Algodón', 'Rosa Pastel', 120, 110, 2500, '55555555-5555-5555-5555-555555555551'),
    ('R-FRI-01', 'Frisa Invisible', 'Gris Melange', 90, 45, 4200, '55555555-5555-5555-5555-555555555551');

-- 5. PRODUCTOS (8 VARIADOS)

-- PRODUCTO 1: Vestido Beba (Tela)
INSERT INTO public.productos (id, codigo, nombre, descripcion_publica, categoria_id, tipo_prenda, genero, tela_principal, precio_minorista, precio_mayorista_curva, imagen_principal, visible_publico, destacado) VALUES
('a1111111-1111-1111-1111-111111111111', 'BEB-001', 'Vestido Lino Floral', 'Hermoso vestido de lino con estampa floral, ideal para verano.', '11111111-1111-1111-1111-111111111111', 'Vestido', 'Femenino', 'Lino', 18500, 120000, 'https://images.unsplash.com/photo-1519238246290-20ebc5623ba4?auto=format&fit=crop&q=80&w=600', true, true);

INSERT INTO public.producto_talles (producto_id, talla_codigo, talla_nombre, orden, stock) VALUES
('a1111111-1111-1111-1111-111111111111', '1', '1 Mes', 1, 20),
('a1111111-1111-1111-1111-111111111111', '2', '2 Meses', 2, 15),
('a1111111-1111-1111-1111-111111111111', '3', '3 Meses', 3, 10),
('a1111111-1111-1111-1111-111111111111', '4', '6 Meses', 4, 10),
('a1111111-1111-1111-1111-111111111111', '5', '9 Meses', 5, 8),
('a1111111-1111-1111-1111-111111111111', '6', '12 Meses', 6, 5);

-- PRODUCTO 2: Body Bebe (Algodón)
INSERT INTO public.productos (id, codigo, nombre, descripcion_publica, categoria_id, tipo_prenda, genero, tela_principal, precio_minorista, precio_mayorista_curva, imagen_principal, visible_publico, destacado) VALUES
('b2222222-2222-2222-2222-222222222222', 'BEB-002', 'Pack Body Basico', 'Body de algodón peinado super suave, pack x2.', '22222222-2222-2222-2222-222222222222', 'Body', 'Unisex', 'Algodon', 12000, 85000, 'https://images.unsplash.com/photo-1522771752914-5a3e0f0f47dd?auto=format&fit=crop&q=80&w=600', true, false);

INSERT INTO public.producto_talles (producto_id, talla_codigo, talla_nombre, orden, stock) VALUES
('b2222222-2222-2222-2222-222222222222', 'RN', 'Recien Nacido', 1, 50),
('b2222222-2222-2222-2222-222222222222', '3M', '3 Meses', 2, 40),
('b2222222-2222-2222-2222-222222222222', '6M', '6 Meses', 3, 30);

-- PRODUCTO 3: Pantalón Jean Nene
INSERT INTO public.productos (id, codigo, nombre, descripcion_publica, categoria_id, tipo_prenda, genero, tela_principal, precio_minorista, precio_mayorista_curva, imagen_principal, visible_publico, destacado) VALUES
('c3333333-3333-3333-3333-333333333333', 'NEN-001', 'Jean Cargo Kids', 'Pantalón de jean con bolsillos cargo, resistente y canchero.', '44444444-4444-4444-4444-444444444444', 'Pantalon', 'Masculino', 'Jean', 22900, 145000, 'https://images.unsplash.com/photo-1588117305388-c2631a279f82?auto=format&fit=crop&q=80&w=600', true, true);

INSERT INTO public.producto_talles (producto_id, talla_codigo, talla_nombre, orden, stock) VALUES
('c3333333-3333-3333-3333-333333333333', '4', 'Talle 4', 1, 10),
('c3333333-3333-3333-3333-333333333333', '6', 'Talle 6', 2, 10),
('c3333333-3333-3333-3333-333333333333', '8', 'Talle 8', 3, 10),
('c3333333-3333-3333-3333-333333333333', '10', 'Talle 10', 4, 10),
('c3333333-3333-3333-3333-333333333333', '12', 'Talle 12', 5, 8);

-- PRODUCTO 4: Campera Gabardina Nene
INSERT INTO public.productos (id, codigo, nombre, descripcion_publica, categoria_id, tipo_prenda, genero, tela_principal, precio_minorista, precio_mayorista_curva, imagen_principal, visible_publico, destacado) VALUES
('d4444444-4444-4444-4444-444444444444', 'NEN-002', 'Campera Parka', 'Parka de gabardina forrada, ideal media estacion.', '44444444-4444-4444-4444-444444444444', 'Campera', 'Masculino', 'Gabardina', 35000, 210000, 'https://images.unsplash.com/photo-1579294246029-4fb2846ccdbf?auto=format&fit=crop&q=80&w=600', true, false);

INSERT INTO public.producto_talles (producto_id, talla_codigo, talla_nombre, orden, stock) VALUES
('d4444444-4444-4444-4444-444444444444', '4', 'Talle 4', 1, 5),
('d4444444-4444-4444-4444-444444444444', '6', 'Talle 6', 2, 5),
('d4444444-4444-4444-4444-444444444444', '8', 'Talle 8', 3, 5),
('d4444444-4444-4444-4444-444444444444', '10', 'Talle 10', 4, 3);

-- PRODUCTO 5: Vestido Fiesta Nena
INSERT INTO public.productos (id, codigo, nombre, descripcion_publica, categoria_id, tipo_prenda, genero, tela_principal, precio_minorista, precio_mayorista_curva, imagen_principal, visible_publico) VALUES
('e5555555-5555-5555-5555-555555555555', 'NENA-001', 'Vestido Tul Princesa', 'Vestido con falda de tul y detalles bordados.', '33333333-3333-3333-3333-333333333333', 'Vestido', 'Femenino', 'Tul', 28000, 180000, 'https://images.unsplash.com/photo-1621452773781-0f992fd0f5d0?auto=format&fit=crop&q=80&w=600', true, true);

INSERT INTO public.producto_talles (producto_id, talla_codigo, talla_nombre, orden, stock) VALUES
('e5555555-5555-5555-5555-555555555555', '2', 'Talle 2', 1, 8),
('e5555555-5555-5555-5555-555555555555', '4', 'Talle 4', 2, 8),
('e5555555-5555-5555-5555-555555555555', '6', 'Talle 6', 3, 8),
('e5555555-5555-5555-5555-555555555555', '8', 'Talle 8', 4, 5);

-- PRODUCTO 6: Calza Estampada Nena
INSERT INTO public.productos (id, codigo, nombre, descripcion_publica, categoria_id, tipo_prenda, genero, tela_principal, precio_minorista, precio_mayorista_curva, imagen_principal, visible_publico, destacado) VALUES
('f6666666-6666-6666-6666-666666666666', 'NENA-002', 'Calza Unicornios', 'Calza de algodon con lycra estampa full print.', '33333333-3333-3333-3333-333333333333', 'Calza', 'Femenino', 'Algodon Lycra', 9500, 65000, 'https://images.unsplash.com/photo-1618397746666-23679599eaT8?auto=format&fit=crop&q=80&w=600', true, false);

INSERT INTO public.producto_talles (producto_id, talla_codigo, talla_nombre, orden, stock) VALUES
('f6666666-6666-6666-6666-666666666666', '4', 'Talle 4', 1, 20),
('f6666666-6666-6666-6666-666666666666', '6', 'Talle 6', 2, 20),
('f6666666-6666-6666-6666-666666666666', '8', 'Talle 8', 3, 20),
('f6666666-6666-6666-6666-666666666666', '10', 'Talle 10', 4, 15);

-- PRODUCTO 7: Buzo Canguro (Unisex)
INSERT INTO public.productos (id, codigo, nombre, descripcion_publica, categoria_id, tipo_prenda, genero, tela_principal, precio_minorista, precio_mayorista_curva, imagen_principal, visible_publico, destacado) VALUES
('g7777777-7777-7777-7777-777777777777', 'UNI-001', 'Buzo Canguro Rustico', 'Buzo basico rustico ideal para el colegio.', '44444444-4444-4444-4444-444444444444', 'Buzo', 'Unisex', 'Rustico', 16000, 110000, 'https://images.unsplash.com/photo-1620799140408-ed5341cd2431?auto=format&fit=crop&q=80&w=600', true, false);

INSERT INTO public.producto_talles (producto_id, talla_codigo, talla_nombre, orden, stock) VALUES
('77777777-7777-7777-7777-777777777777', '6', 'Talle 6', 1, 15),
('77777777-7777-7777-7777-777777777777', '8', 'Talle 8', 2, 15),
('77777777-7777-7777-7777-777777777777', '10', 'Talle 10', 3, 15),
('77777777-7777-7777-7777-777777777777', '12', 'Talle 12', 4, 15),
('77777777-7777-7777-7777-777777777777', '14', 'Talle 14', 5, 12);

-- PRODUCTO 8: Ajuar Recien Nacido
INSERT INTO public.productos (id, codigo, nombre, descripcion_publica, categoria_id, tipo_prenda, genero, tela_principal, precio_minorista, precio_mayorista_curva, imagen_principal, visible_publico, destacado) VALUES
('88888888-8888-8888-8888-888888888888', 'BEB-003', 'Set Ajuar 3 Piezas', 'Incluye batita, ranita y gorrito de algodón.', '22222222-2222-2222-2222-222222222222', 'Ajuar', 'Unisex', 'Algodon', 14500, 95000, 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?auto=format&fit=crop&q=80&w=600', true, true);

INSERT INTO public.producto_talles (producto_id, talla_codigo, talla_nombre, orden, stock) VALUES
('88888888-8888-8888-8888-888888888888', '00', 'Prematuro', 1, 5),
('88888888-8888-8888-8888-888888888888', '0', 'Recien Nacido', 2, 10);

-- 6. CLIENTES DE PRUEBA
INSERT INTO public.clientes (nombre, apellido, email, telefono, tipo_cliente) VALUES
('Maria', 'Lopez', 'maria@test.com', '1122334455', 'minorista'),
('Local', 'Modas', 'ventas@localmodas.com', '1155667788', 'mayorista');
