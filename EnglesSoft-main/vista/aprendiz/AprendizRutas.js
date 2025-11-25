const express = require('express');
const CRutas = require('../../controlador/aprendiz/AprendizControlador');
const router = express.Router();

router.post('/crear', ARutas.crearAprendiz);
module.exports = router; 