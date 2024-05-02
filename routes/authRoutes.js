const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();
const SECRET_KEY = process.env.SECRET_KEY; // Chave secreta armazenada em variáveis de ambiente

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Verificar se username e password foram fornecidos
    if (!username || !password) {
        return res.status(400).json({ message: 'Nome de utilizador e senha são obrigatórios.' });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Utilizador não encontrado.' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Senha incorreta.' });
        }

        const payload = { id: user._id, username: user.username };
        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h', algorithm: 'HS256' });

        res.json({ token: `Bearer ${token}` });
    } catch (error) {
        console.error("Erro no servidor:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

module.exports = router;
