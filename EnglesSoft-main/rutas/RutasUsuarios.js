// routes/usuarios.js
const express = require('express');
const router = express.Router();
const AprendizModelo = require('../modelo/aprendiz/AprendizModelo');

// POST - Registrar nuevo estudiante
router.post('/registro', async (req, res) => {
    try {
        const { documento, nombres, telefono, correo, contrasena } = req.body;

        // Validar campos requeridos
        if (!documento || !nombres || !correo || !contrasena) {
            return res.status(400).json({ 
                success: false,
                error: 'Faltan campos requeridos',
                camposRequeridos: ['documento', 'nombres', 'correo', 'contrasena']
            });
        }

        // Crear estudiante
        const resultado = await AprendizModelo.crearClientes(
            documento, 
            nombres, 
            telefono || '', 
            correo, 
            contrasena
        );

        res.status(201).json({
            success: true,
            message: 'Estudiante registrado exitosamente',
            documento: documento
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al registrar estudiante',
            details: error.message 
        });
    }
});

// POST - Login de estudiante
router.post('/login', async (req, res) => {
    try {
        const { documento, contrasena } = req.body;

        if (!documento || !contrasena) {
            return res.status(400).json({ 
                success: false,
                error: 'Documento y contraseña son requeridos' 
            });
        }

        const resultado = await AprendizModelo.autenticar(documento, contrasena);

        if (!resultado.success) {
            return res.status(401).json(resultado);
        }

        res.json(resultado);

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error en el inicio de sesión',
            details: error.message 
        });
    }
});

// GET - Obtener estudiante por documento
router.get('/:documento', async (req, res) => {
    try {
        const estudiante = await AprendizModelo.obtenerPorDocumento(req.params.documento);

        if (!estudiante) {
            return res.status(404).json({ 
                success: false,
                error: 'Estudiante no encontrado' 
            });
        }

        res.json({
            success: true,
            estudiante: estudiante
        });

    } catch (error) {
        console.error('Error al obtener estudiante:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener estudiante',
            details: error.message 
        });
    }
});

// GET - Obtener todos los estudiantes
router.get('/', async (req, res) => {
    try {
        const estudiantes = await AprendizModelo.obtenerTodos();
        
        res.json({
            success: true,
            count: estudiantes.length,
            estudiantes: estudiantes
        });

    } catch (error) {
        console.error('Error al obtener estudiantes:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener estudiantes',
            details: error.message 
        });
    }
});

// PUT - Actualizar estudiante
router.put('/:documento', async (req, res) => {
    try {
        const resultado = await AprendizModelo.actualizar(
            req.params.documento, 
            req.body
        );
        
        res.json(resultado);

    } catch (error) {
        console.error('Error al actualizar estudiante:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al actualizar estudiante',
            details: error.message 
        });
    }
});

// DELETE - Eliminar estudiante
router.delete('/:documento', async (req, res) => {
    try {
        const resultado = await AprendizModelo.eliminar(req.params.documento);
        res.json(resultado);

    } catch (error) {
        console.error('Error al eliminar estudiante:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al eliminar estudiante',
            details: error.message 
        });
    }
});

module.exports = router;