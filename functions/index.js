const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const functions = require('firebase-functions');
const mongoose = require('mongoose');
const Notes = require('./notes');

const { username, password } = functions.config().mongo;
const mongoUri = `mongodb+srv://${ username }:${ password }@cluster0-uir0v.mongodb.net/mini-kanban-app`;

const mongooseConfig = {
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    useUnifiedTopology: true
};

mongoose.connect(mongoUri, mongooseConfig, error => {
    if (error) throw error;
});

const defaultError = (resp, error) => resp.status(500).json({ ok: false, error });
const customError = (resp, message) => resp.status(400).json({ ok: false, error: { message } });
const defaultResp = (resp, { _id, type, text }) => resp.json({ ok: true, note: { _id, type, text } });

const api = () => {
    const app = express();
    
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(cors({ origin: true }));

    app.get('/notes', async (req, resp) => {
        const selectors = {};
        const returnFields = 'type text';
        const sortFields = { type: 1, text: 1 };
        await Notes.find(selectors, returnFields).sort(sortFields).exec((errorFind, notes) => {
            if (errorFind) return defaultError(resp, errorFind);
            Notes.countDocuments((errorCount, total) => {
                if (errorCount) return defaultError(resp, errorCount);
                resp.json({ ok: true, total, notes });
            });
        });
    });
    
    app.post('/notes', async (req, resp) => {
        const { text } = req.body;
        if (!text || !text.trim().length) return customError(resp, 'Data is required');
        const body = { type: 'ideas', text: text.trim() };
        await new Notes(body).save((error, note) => {
            if (error) return defaultError(resp, error);
            defaultResp(resp, note);
        });
    });
    
    app.put('/notes/text/:_id', async (req, resp) => {
        const { text } = req.body;
        if (!text || !text.trim().length) return customError(resp, 'Data is required');
        const { _id } = req.params;
        const body = { text };
        const options = { new: true, runValidators: true, context: 'query' };
        await Notes.findByIdAndUpdate(_id, body, options).exec((error, note) => {
            if (Object.is(error, null) && !note) return customError(resp, 'Data not found');
            if (error) return defaultError(resp, error);
            defaultResp(resp, note);
        });
    });

    app.put('/notes/type/:_id', async (req, resp) => {
        const { type } = req.body;
        if (!type || !type.trim().length) return customError(resp, 'Data is required');
        const { _id } = req.params;
        const body = { type };
        const options = { new: true, runValidators: true, context: 'query' };
        await Notes.findByIdAndUpdate(_id, body, options).exec((error, note) => {
            if (Object.is(error, null) && !note) return customError(resp, 'Data not found');
            if (error) return defaultError(resp, error);
            defaultResp(resp, note);
        });
    });
    
    app.delete('/notes/:_id', async (req, resp) => {
        const { _id } = req.params;
        await Notes.findByIdAndRemove(_id).exec((error, note) => {
            if (Object.is(error, null) && !note) return customError(resp, 'Data not found');
            if (error) return defaultError(resp, error);
            defaultResp(resp, note);
        });
    });
    
    return app;
}

exports.api = functions.https.onRequest(api());