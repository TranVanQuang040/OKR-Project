
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Department from './models/Department.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dongvanict3_db_user:7yC5wXM1niXHGUmz@cluster0.vrlouhe.mongodb.net/';

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        const depts = await Department.find();
        console.log('DEPARTMENTS_IN_DB:', JSON.stringify(depts));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
