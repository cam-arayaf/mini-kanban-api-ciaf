const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const functions = require('firebase-functions');
const mongoose = require('mongoose');
const Boards = require('./boards');
const Notes = require('./notes');

const { username, password } = functions.config().mongo;
const mongoUri = `mongodb+srv://${ username }:${ password }@cluster0-uir0v.mongodb.net/mini-kanban-app`;

const mongooseConfig = {
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    useUnifiedTopology: true
};

mongoose.connect(mongoUri, mongooseConfig, err => {
    if (err) throw err;
});

const defaultError = (resp, error) => resp.status(500).json({ ok: false, error });
const customError = resp => resp.status(400).json({ ok: false, error: { message: 'Data not found' } });
const emptyText = resp => resp.status(400).json({ ok: false, error: { message: 'Text is required' } });
const defaultResp = (resp, { _id, type, text }) => resp.json({ ok: true, note: { _id, type, text } });

const api = () => {
    const app = express();
    
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(cors({ origin: true }));

    app.get('/boards', async (req, resp) => {
        const selectors = {};
        const returnFields = 'class_name title priority';
        const sortFields = { priority: 1 };
        await Boards.find(selectors, returnFields).sort(sortFields).exec((errFind, boards) => {
            if (!boards.length) return customError(resp);
            if (errFind) return defaultError(resp, errFind);
            Boards.countDocuments((errCount, total) => {
                if (errCount) return defaultError(resp, errCount);
                resp.json({ ok: true, total, boards });
            });
        });
    });

    app.get('/notes', async (req, resp) => {
        const selectors = {};
        const returnFields = 'type text';
        const sortFields = { type: 1, text: 1 };
        await Notes.find(selectors, returnFields).sort(sortFields).exec((errFind, notes) => {
            if (errFind) return defaultError(resp, errFind);
            Notes.countDocuments((errCount, total) => {
                if (errCount) return defaultError(resp, errCount);
                resp.json({ ok: true, total, notes });
            });
        });
    });
    
    app.post('/notes', async (req, resp) => {
        const { text } = req.body;
        if (!text || !text.trim().length) return emptyText(resp);
        const body = { type: 'ideas', text: text.trim() };
        await new Notes(body).save((error, note) => {
            if (error) return defaultError(resp, error);
            defaultResp(resp, note);
        });
    });
    
    app.put('/notes/text/:_id', async (req, resp) => {
        const { text } = req.body;
        if (!text || !text.trim().length) return emptyText(resp);
        const { _id } = req.params;
        const body = { text };
        const options = { new: true, runValidators: true, context: 'query' };
        await Notes.findByIdAndUpdate(_id, body, options).exec((error, note) => {
            if (Object.is(error, null) && !note) return customError(resp);
            if (error) return defaultError(resp, error);
            defaultResp(resp, note);
        });
    });
    
    app.put('/notes/previous/:_id', async (req, resp) => {
        const { _id } = req.params;
        const returnFields = 'type text';
        const options = { new: true, runValidators: true, context: 'query' };
        await Notes.findById(_id, returnFields, options).exec((errFind, noteFind) => {
            if (Object.is(errFind, null) && !noteFind) return customError(resp);
            if (errFind) return defaultError(resp, errFind);
            noteFind.type =
                noteFind.type === 'done' ? 'in-progress' : noteFind.type === 'in-progress' ? 'to-do' : 'ideas';
            noteFind.save((errSave, note) => {
                if (errSave) return defaultError(resp, errSave);
                defaultResp(resp, note);
            }) ;
        });
    });
    
    app.put('/notes/next/:_id', async (req, resp) => {
        const { _id } = req.params;
        const returnFields = 'type text';
        const options = { new: true, runValidators: true, context: 'query' };
        await Notes.findById(_id, returnFields, options).exec((errFind, noteFind) => {
            if (Object.is(errFind, null) && !noteFind) return customError(resp);
            if (errFind) return defaultError(resp, errFind);
            noteFind.type = noteFind.type === 'ideas' ? 'to-do' : noteFind.type === 'to-do' ? 'in-progress' : 'done';
            noteFind.save((errSave, note) => {
                if (errSave) return defaultError(resp, errSave);
                defaultResp(resp, note);
            });
        });
    });
    
    app.delete('/notes/:_id', async (req, resp) => {
        const { _id } = req.params;
        await Notes.findByIdAndRemove(_id).exec((error, note) => {
            if (Object.is(error, null) && !note) return customError(resp);
            if (error) return defaultError(resp, error);
            defaultResp(resp, note);
        });
    });
    
    return app;
}

exports.api = functions.https.onRequest(api());