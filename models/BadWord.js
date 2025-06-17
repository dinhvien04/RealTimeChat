const mongoose = require('mongoose');

const badWordSchema = new mongoose.Schema({
    word: { type: String, required: true, unique: true, trim: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BadWord', badWordSchema); 