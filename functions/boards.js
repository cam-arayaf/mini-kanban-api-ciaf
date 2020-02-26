const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const required = [true, '{PATH} is required'];

const validClassNames = {
    values: ['ideas', 'to-do', 'in-progress', 'done'],
    message: '{VALUE} is not a valid type'
};

const validTitles = {
    values: ['Ideas', 'To Do', 'In Progress', 'Done'],
    message: '{VALUE} is not a valid type'
};

const boardSchema = new mongoose.Schema({
    class_name: { type: String, unique: true, enum: validClassNames, required },
    title: { type: String, unique: true, enum: validTitles, required },
    priority: { type: Number, unique: true, required }
});

boardSchema.plugin(uniqueValidator, { message: '{PATH} must be unique' });

module.exports = mongoose.model('Board', boardSchema);