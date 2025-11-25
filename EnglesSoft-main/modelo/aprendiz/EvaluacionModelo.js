// modelo/aprendiz/EvaluacionModelo.js
const dbService = require('../../BD/Conexion');

class EvaluacionModelo {
    
    // Crear nueva evaluación
    static async crearEvaluacion(datos) {
        const {
            documento_estudiante,
            tipo_evaluacion,
            puntaje_lectura,
            puntaje_escritura,
            puntaje_escucha,
            puntaje_habla,
            observaciones
        } = datos;

        try {
            // Calcular puntaje total
            const puntaje_total = Math.round(
                ((puntaje_lectura || 0) + 
                 (puntaje_escritura || 0) + 
                 (puntaje_escucha || 0) + 
                 (puntaje_habla || 0)) / 4
            );

            // Determinar nivel alcanzado
            const nivel = await this.determinarNivel(puntaje_total);
            
            const query = `INSERT INTO evaluaciones 
                (documento_estudiante, tipo_evaluacion, puntaje_total, nivel_alcanzado,
                 puntaje_lectura, puntaje_escritura, puntaje_escucha, puntaje_habla, observaciones)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            const resultado = await dbService.query(query, [
                documento_estudiante,
                tipo_evaluacion,
                puntaje_total,
                nivel,
                puntaje_lectura || 0,
                puntaje_escritura || 0,
                puntaje_escucha || 0,
                puntaje_habla || 0,
                observaciones || ''
            ]);

            // Gestionar progreso del estudiante
            if (tipo_evaluacion === 'inicial') {
                await this.crearProgreso(documento_estudiante, resultado.insertId, nivel);
            } else if (tipo_evaluacion === 'final') {
                await this.actualizarProgreso(documento_estudiante, resultado.insertId, nivel, puntaje_total);
            }

            return {
                success: true,
                id_evaluacion: resultado.insertId,
                nivel_alcanzado: nivel,
                puntaje_total: puntaje_total,
                message: 'Evaluación creada exitosamente'
            };
        } catch (err) {
            throw new Error(`Error al crear evaluación: ${err.message}`);
        }
    }

    // Determinar nivel según puntaje MCER
    static async determinarNivel(puntaje) {
        const query = `SELECT codigo FROM niveles_ingles 
                       WHERE ? BETWEEN puntaje_minimo AND puntaje_maximo`;
        
        try {
            const resultado = await dbService.query(query, [puntaje]);
            return resultado[0]?.codigo || 'A1';
        } catch (err) {
            console.error('Error al determinar nivel:', err);
            return 'A1';
        }
    }

    // Crear registro de progreso inicial
    static async crearProgreso(documento, idEvaluacion, nivel) {
        const query = `INSERT INTO progreso_estudiante 
            (documento_estudiante, id_evaluacion_inicial, nivel_inicial, fecha_inicio)
            VALUES (?, ?, ?, CURDATE())`;
        
        try {
            await dbService.query(query, [documento, idEvaluacion, nivel]);
        } catch (err) {
            console.error('Error al crear progreso:', err);
        }
    }

    // Actualizar progreso con evaluación final
    static async actualizarProgreso(documento, idEvaluacion, nivelFinal, puntajeFinal) {
        try {
            // Obtener progreso existente
            const queryProgreso = `SELECT * FROM progreso_estudiante 
                                   WHERE documento_estudiante = ? 
                                   AND id_evaluacion_final IS NULL
                                   ORDER BY id_progreso DESC LIMIT 1`;
            const progreso = await dbService.query(queryProgreso, [documento]);

            if (progreso.length === 0) {
                throw new Error('No existe evaluación inicial para este estudiante');
            }

            // Obtener puntaje inicial
            const queryEvalInicial = 'SELECT puntaje_total FROM evaluaciones WHERE id_evaluacion = ?';
            const evalInicial = await dbService.query(queryEvalInicial, [progreso[0].id_evaluacion_inicial]);
            const puntajeInicial = evalInicial[0].puntaje_total;
            const mejora = puntajeFinal - puntajeInicial;

            // Actualizar progreso
            const queryUpdate = `UPDATE progreso_estudiante 
                SET id_evaluacion_final = ?, 
                    nivel_final = ?, 
                    mejora_puntos = ?, 
                    fecha_finalizacion = CURDATE()
                WHERE id_progreso = ?`;
            
            await dbService.query(queryUpdate, [idEvaluacion, nivelFinal, mejora, progreso[0].id_progreso]);
        } catch (err) {
            console.error('Error al actualizar progreso:', err);
            throw err;
        }
    }

    // Obtener evaluaciones por estudiante
    static async obtenerPorEstudiante(documento) {
        const query = `SELECT e.*, n.nombre as nombre_nivel, n.descripcion as descripcion_nivel
                       FROM evaluaciones e
                       LEFT JOIN niveles_ingles n ON e.nivel_alcanzado = n.codigo
                       WHERE e.documento_estudiante = ?
                       ORDER BY e.fecha_evaluacion DESC`;
        
        try {
            return await dbService.query(query, [documento]);
        } catch (err) {
            throw new Error(`Error al obtener evaluaciones: ${err.message}`);
        }
    }

    // Obtener evaluación por ID
    static async obtenerPorId(idEvaluacion) {
        const query = `SELECT e.*, n.nombre as nombre_nivel, u.nombres as nombre_estudiante
                       FROM evaluaciones e
                       LEFT JOIN niveles_ingles n ON e.nivel_alcanzado = n.codigo
                       LEFT JOIN usuarios u ON e.documento_estudiante = u.documento
                       WHERE e.id_evaluacion = ?`;
        
        try {
            const resultado = await dbService.query(query, [idEvaluacion]);
            return resultado[0] || null;
        } catch (err) {
            throw new Error(`Error al obtener evaluación: ${err.message}`);
        }
    }

    // Verificar si tiene evaluación inicial
    static async tieneEvaluacionInicial(documento) {
        const query = `SELECT id_evaluacion FROM evaluaciones 
                       WHERE documento_estudiante = ? AND tipo_evaluacion = 'inicial'`;
        
        try {
            const resultado = await dbService.query(query, [documento]);
            return resultado.length > 0;
        } catch (err) {
            throw new Error(`Error al verificar evaluación: ${err.message}`);
        }
    }

    // Verificar si tiene evaluación final
    static async tieneEvaluacionFinal(documento) {
        const query = `SELECT id_evaluacion FROM evaluaciones 
                       WHERE documento_estudiante = ? AND tipo_evaluacion = 'final'`;
        
        try {
            const resultado = await dbService.query(query, [documento]);
            return resultado.length > 0;
        } catch (err) {
            throw new Error(`Error al verificar evaluación: ${err.message}`);
        }
    }

    // Obtener todas las evaluaciones
    static async obtenerTodas() {
        const query = `SELECT e.*, u.nombres as nombre_estudiante, n.nombre as nombre_nivel
                       FROM evaluaciones e
                       JOIN usuarios u ON e.documento_estudiante = u.documento
                       LEFT JOIN niveles_ingles n ON e.nivel_alcanzado = n.codigo
                       ORDER BY e.fecha_evaluacion DESC`;
        
        try {
            return await dbService.query(query);
        } catch (err) {
            throw new Error(`Error al obtener evaluaciones: ${err.message}`);
        }
    }

    // Obtener niveles disponibles
    static async obtenerNiveles() {
        const query = 'SELECT * FROM niveles_ingles ORDER BY puntaje_minimo';
        
        try {
            return await dbService.query(query);
        } catch (err) {
            throw new Error(`Error al obtener niveles: ${err.message}`);
        }
    }

    // Obtener estadísticas de evaluaciones
    static async obtenerEstadisticas() {
        try {
            const queries = {
                totalEvaluaciones: 'SELECT COUNT(*) as total FROM evaluaciones',
                promedioGeneral: 'SELECT AVG(puntaje_total) as promedio FROM evaluaciones',
                porNivel: `SELECT n.codigo, n.nombre, COUNT(e.id_evaluacion) as cantidad
                          FROM niveles_ingles n
                          LEFT JOIN evaluaciones e ON n.codigo = e.nivel_alcanzado
                          GROUP BY n.codigo, n.nombre
                          ORDER BY n.puntaje_minimo`
            };

            const estadisticas = {};
            for (const [key, query] of Object.entries(queries)) {
                const resultado = await dbService.query(query);
                estadisticas[key] = resultado;
            }

            return estadisticas;
        } catch (err) {
            throw new Error(`Error al obtener estadísticas: ${err.message}`);
        }
    }

    // Eliminar evaluación (solo para administrador)
    static async eliminar(idEvaluacion) {
        const query = 'DELETE FROM evaluaciones WHERE id_evaluacion = ?';
        
        try {
            await dbService.query(query, [idEvaluacion]);
            return { success: true, message: 'Evaluación eliminada exitosamente' };
        } catch (err) {
            throw new Error(`Error al eliminar evaluación: ${err.message}`);
        }
    }
}

module.exports = EvaluacionModelo;