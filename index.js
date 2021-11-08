const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { MongoClient } = require('mongodb');
const { application } = require('express');
const port = process.env.PORT || 5000;

//midelwar 
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.f6j7z.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
console.log(uri);

async function run() {
    try {
        await client.connect();
        const database = client.db("doctors_portal");
        const appointmentsCollection = database.collection('appointments');

        app.get('/appointments', async (req, res) => {
            const email = req.query.email;
            const date = new Date(req.query.date).toLocaleDateString();
            // console.log(date);
            const query = { email: email, date: date }
            const cursor = appointmentsCollection.find(query);
            const appointments = await cursor.toArray();
            console.log(appointments);
            res.send(appointments);

        })
        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result = await appointmentsCollection.insertOne(appointment);
            console.log(result);
            // res.json(result)
            res.send(result);

        })


    }
    finally {
        //await client.close();
    }

}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('doctor prortal server')
})

app.listen(port, () => {
    console.log(` listening at ${port}`);
})