// routes/progreso.js
const express = require('express');
const router = express.Router();
const dbService = require('../BD/Conexion');

// GET - Obtener progreso de un estudiante
router.get('/:documento', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.*,
                u.nombres,
                u.correo,
                u.telefono,
                ei.puntaje_total as puntaje_inicial,
                ei.puntaje_lectura as lectura_inicial,
                ei.puntaje_escritura as escritura_inicial,
                ei.puntaje_escucha as escucha_inicial,
                ei.puntaje_habla as habla_inicial,
                ei.fecha_evaluacion as fecha_eval_inicial,
                ef.puntaje_total as puntaje_final,
                ef.puntaje_lectura as lectura_final,
                ef.puntaje_escritura as escritura_final,
                ef.puntaje_escucha as escucha_final,
                ef.puntaje_habla as habla_final,
                ef.fecha_evaluacion as fecha_eval_final,
                ni.nombre as nombre_nivel_inicial,
                ni.descripcion as desc_nivel_inicial,
                nf.nombre as nombre_nivel_final,
                nf.descripcion as desc_nivel_final
            FROM progreso_estudiante p
            JOIN usuarios u ON p.documento_estudiante = u.documento
            LEFT JOIN evaluaciones ei ON p.id_evaluacion_inicial = ei.id_evaluacion
            LEFT JOIN evaluaciones ef ON p.id_evaluacion_final = ef.id_evaluacion
            LEFT JOIN niveles_ingles ni ON p.nivel_inicial = ni.codigo
            LEFT JOIN niveles_ingles nf ON p.nivel_final = nf.codigo
            WHERE p.documento_estudiante = ?
            ORDER BY p.id_progreso DESC
            LIMIT 1
        `;

        const resultado = await dbService.query(query, [req.params.documento]);

        if (resultado.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'No se encontró progreso para este estudiante' 
            });
        }

        res.json({
            success: true,
            progreso: resultado[0]
        });

    } catch (error) {
        console.error('Error al obtener progreso:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener progreso',
            details: error.message 
        });
    }
});

// GET - Obtener progreso de todos los estudiantes
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                u.documento,
                u.nombres,
                u.correo,
                p.nivel_inicial,
                p.nivel_final,
                p.mejora_puntos,
                p.fecha_inicio,
                p.fecha_finalizacion,
                ei.puntaje_total as puntaje_inicial,
                ef.puntaje_total as puntaje_final,
                DATEDIFF(p.fecha_finalizacion, p.fecha_inicio) as dias_formacion,
                CASE 
                    WHEN p.id_evaluacion_final IS NULL THEN 'En Progreso'
                    ELSE 'Completado'
                END as estado
            FROM usuarios u
            LEFT JOIN progreso_estudiante p ON u.documento = p.documento_estudiante
            LEFT JOIN evaluaciones ei ON p.id_evaluacion_inicial = ei.id_evaluacion
            LEFT JOIN evaluaciones ef ON p.id_evaluacion_final = ef.id_evaluacion
            ORDER BY u.nombres
        `;

        const resultados = await dbService.query(query);
        
        res.json({
            success: true,
            count: resultados.length,
            progresos: resultados
        });

    } catch (error) {
        console.error('Error al obtener progresos:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener progresos',
            details: error.message 
        });
    }
});

// GET - Obtener estadísticas generales
router.get('/estadisticas/general', async (req, res) => {
    try {
        // Total de estudiantes
        const totalEstudiantes = await dbService.query(
            'SELECT COUNT(*) as total FROM usuarios'
        );

        // Evaluaciones iniciales
        const evalIniciales = await dbService.query(
            'SELECT COUNT(*) as total FROM evaluaciones WHERE tipo_evaluacion = "inicial"'
        );

        // Evaluaciones finales
        const evalFinales = await dbService.query(
            'SELECT COUNT(*) as total FROM evaluaciones WHERE tipo_evaluacion = "final"'
        );

        // Progreso completo
        const progresoCompleto = await dbService.query(
            'SELECT COUNT(*) as total FROM progreso_estudiante WHERE id_evaluacion_final IS NOT NULL'
        );

        // Promedio inicial
        const promedioInicial = await dbService.query(`
            SELECT AVG(puntaje_total) as promedio 
            FROM evaluaciones 
            WHERE tipo_evaluacion = 'inicial'
        `);

        // Promedio final
        const promedioFinal = await dbService.query(`
            SELECT AVG(puntaje_total) as promedio 
            FROM evaluaciones 
            WHERE tipo_evaluacion = 'final'
        `);

        // Mejora promedio
        const mejoraPromedio = await dbService.query(`
            SELECT AVG(mejora_puntos) as promedio 
            FROM progreso_estudiante 
            WHERE mejora_puntos IS NOT NULL
        `);

        // Distribución por niveles
        const distribucionNiveles = await dbService.query(`
            SELECT 
                n.codigo,
                n.nombre,
                COUNT(e.id_evaluacion) as cantidad
            FROM niveles_ingles n
            LEFT JOIN evaluaciones e ON n.codigo = e.nivel_alcanzado
            GROUP BY n.codigo, n.nombre
            ORDER BY n.puntaje_minimo
        `);

        res.json({
            success: true,
            estadisticas: {
                totalEstudiantes: totalEstudiantes[0].total,
                evaluacionesIniciales: evalIniciales[0].total,
                evaluacionesFinales: evalFinales[0].total,
                progresosCompletos: progresoCompleto[0].total,
                promedioInicial: Math.round(promedioInicial[0].promedio || 0),
                promedioFinal: Math.round(promedioFinal[0].promedio || 0),
                mejoraPromedio: Math.round(mejoraPromedio[0].promedio || 0),
                distribucionNiveles: distribucionNiveles
            }
        });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener estadísticas',
            details: error.message 
        });
    }
});

// GET - Comparar evaluaciones (inicial vs final)
router.get('/comparar/:documento', async (req, res) => {
    try {
        const query = `
            SELECT 
                'inicial' as tipo,
                e.id_evaluacion,
                e.puntaje_total,
                e.puntaje_lectura,
                e.puntaje_escritura,
                e.puntaje_escucha,
                e.puntaje_habla,
                e.nivel_alcanzado,
                e.fecha_evaluacion,
                n.nombre as nombre_nivel
            FROM evaluaciones e
            LEFT JOIN niveles_ingles n ON e.nivel_alcanzado = n.codigo
            WHERE e.documento_estudiante = ? AND e.tipo_evaluacion = 'inicial'
            UNION ALL
            SELECT 
                'final' as tipo,
                e.id_evaluacion,
                e.puntaje_total,
                e.puntaje_lectura,
                e.puntaje_escritura,
                e.puntaje_escucha,
                e.puntaje_habla,
                e.nivel_alcanzado,
                e.fecha_evaluacion,
                n.nombre as nombre_nivel
            FROM evaluaciones e
            LEFT JOIN niveles_ingles n ON e.nivel_alcanzado = n.codigo
            WHERE e.documento_estudiante = ? AND e.tipo_evaluacion = 'final'
            ORDER BY tipo
        `;

        const resultados = await dbService.query(query, [
            req.params.documento, 
            req.params.documento
        ]);

        if (resultados.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'No se encontraron evaluaciones para comparar' 
            });
        }

        const comparacion = {
            inicial: resultados.find(r => r.tipo === 'inicial') || null,
            final: resultados.find(r => r.tipo === 'final') || null,
            mejora: null
        };

        if (comparacion.inicial && comparacion.final) {
            comparacion.mejora = {
                puntaje_total: comparacion.final.puntaje_total - comparacion.inicial.puntaje_total,
                lectura: comparacion.final.puntaje_lectura - comparacion.inicial.puntaje_lectura,
                escritura: comparacion.final.puntaje_escritura - comparacion.inicial.puntaje_escritura,
                escucha: comparacion.final.puntaje_escucha - comparacion.inicial.puntaje_escucha,
                habla: comparacion.final.puntaje_habla - comparacion.inicial.puntaje_habla
            };
        }

        res.json({
            success: true,
            comparacion: comparacion
        });

    } catch (error) {
        console.error('Error al comparar evaluaciones:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al comparar evaluaciones',
            details: error.message 
        });
    }
});

module.exports = router;