// servidor.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middlewares
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// Importar Rutas
// ============================================
const usuariosRoutes = require('./routes/usuarios');
const evaluacionesRoutes = require('./routes/evaluaciones');
const progresoRoutes = require('./routes/progreso');

// ============================================
// Usar Rutas con prefijo /api
// ============================================
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/evaluaciones', evaluacionesRoutes);
app.use('/api/progreso', progresoRoutes);

// ============================================
// Ruta Principal
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta de prueba para verificar que el servidor funciona
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Servidor EnglesSoft funcionando correctamente',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// Manejo de Errores 404
// ============================================
app.use((req, res, next) => {
    res.status(404).json({ 
        success: false,
        error: 'Ruta no encontrada',
        path: req.path 
    });
});

// ============================================
// Manejo de Errores Generales
// ============================================
app.use((err, req, res, next) => {
    console.error('Error en el servidor:', err.stack);
    res.status(500).json({ 
        success: false,
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Ha ocurrido un error'
    });
});

// ============================================
// Iniciar Servidor
// ============================================
app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════');
    console.log('🎓 EnglesSoft - Sistema de Evaluación SENA');
    console.log('═══════════════════════════════════════════');
    console.log(`✅ Servidor ejecutándose en: http://localhost:${PORT}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📅 Fecha de inicio: ${new Date().toLocaleString('es-CO')}`);
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('📡 Rutas API disponibles:');
    console.log(`   - GET  /api/test`);
    console.log(`   - POST /api/usuarios/registro`);
    console.log(`   - POST /api/usuarios/login`);
    console.log(`   - GET  /api/usuarios/:documento`);
    console.log(`   - POST /api/evaluaciones`);
    console.log(`   - GET  /api/evaluaciones/estudiante/:documento`);
    console.log(`   - GET  /api/progreso/:documento`);
    console.log(`   - GET  /api/progreso/estadisticas/general`);
    console.log('');
    console.log('🌐 Frontend disponible en: http://localhost:' + PORT);
    console.log('');
});

module.exports = app;