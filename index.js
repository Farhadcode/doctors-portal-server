const express = require('express')
const app = express()
const cors = require('cors')
const admin = require("firebase-admin");
require('dotenv').config()
const { initializeApp } = require('firebase-admin/app');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const stripe = require('stripe')(process.env.STRIPE_SECRET)
const fileUpload = require('express-fileupload');

const port = process.env.PORT || 5000;

//doctors-portal-jwt.json

const serviceAccount = require('./doctors-portal-jwt.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

//midelwar 
app.use(cors());
app.use(express.json());
app.use(fileUpload());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.f6j7z.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
console.log(uri);

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db("doctors_portal_data");
        const appointmentsCollection = database.collection('appointments_data');
        const usersCollection = database.collection('users_data');
        const doctorCollection = database.collection('doctors')

        // appointmets identyfecation useing  email and date 
        app.get('/appointments', async (req, res) => {
            const email = req.query.email;
            const date = new Date(req.query.date).toLocaleDateString();
            const query = { email: email, date: date }
            const cursor = appointmentsCollection.find(query);
            const appointments = await cursor.toArray();
            res.send(appointments);

        })

        // payment system apply 
        app.get('/appointments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const payment = await appointmentsCollection.findOne(query);
            res.json(payment);
        })


        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result = await appointmentsCollection.insertOne(appointment);

            // res.json(result)
            res.send(result);

        })

        app.put('/appointments/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    payment: payment
                }
            };
            const result = await appointmentsCollection.updateOne(filter, updateDoc);
            res.json(result);

        })

        /// doctor data and imgae post in dataBase
        app.get('/doctors', async (req, res) => {
            const cursor = doctorCollection.find({});
            const doctor = await cursor.toArray();
            res.json(doctor);
        })
        app.post('/doctors', async (req, res) => {
            const name = req.body.name;
            const email = req.body.email;
            const pic = req.files.image;
            const picData = pic.data;
            const encodePic = picData.toString('base64');
            const imageBuffer = Buffer.from(encodePic, 'base64');
            const doctor = {
                name,
                email,
                image: imageBuffer
            }
            const result = await doctorCollection.insertOne(doctor)

            res.json(result)

        })



        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.send({ admin: isAdmin });

        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            //console.log(result);
            res.send(result);

        })


        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const update = { $set: user };
            const result = await usersCollection.updateOne(filter, update, options);
            console.log(result);
            res.json(result);
        });
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester })
                if (requesterAccount.role === 'admin') {

                    const filter = { email: user.email };
                    const update = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, update);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have accss to make admin' })
            }




        });

        //payment 
        app.post('/create-payment-intent', async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                payment_method_types: ['card']
            })
            res.json({ clientSecret: paymentIntent.client_secret })
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