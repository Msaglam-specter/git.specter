const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Statik dosyaları sun (admin paneli için)
app.use(express.static(path.join(__dirname, 'public')));

const PRODUCKS_FILE = './producks.json';
const ORDERS_FILE = './orders.json';

// Ürünleri getir
app.get('/api/producks', (req, res) => {
    fs.readFile(PRODUCKS_FILE, (err, data) => {
        if (err) return res.json([]);
        res.json(JSON.parse(data));
    });
});

// Yeni ürün ekle (Admin Paneli)
app.post('/api/producks', (req, res) => {
    fs.readFile(PRODUCKS_FILE, (err, data) => {
        let producks = [];
        if (!err) producks = JSON.parse(data);
        producks.push(req.body);
        fs.writeFile(PRODUCKS_FILE, JSON.stringify(producks, null, 2), () => {
            res.json({ success: true });
        });
    });
});

// Siparişleri getir (Admin Paneli)
app.get('/api/orders', (req, res) => {
    fs.readFile(ORDERS_FILE, (err, data) => {
        if (err) return res.json([]);
        res.json(JSON.parse(data));
    });
});

// Sipariş oluştur (Alışveriş Sitesi)
app.post('/api/orders', (req, res) => {
    fs.readFile(ORDERS_FILE, (err, data) => {
        let orders = [];
        if (!err) orders = JSON.parse(data);
        orders.push(req.body);
        fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), () => {
            res.json({ success: true });
        });
    });
});

app.listen(3000, '0.0.0.0', () => {
    console.log('API sunucusu tüm ağdan erişilebilir: http://<bilgisayar-ip-adresi>:3000');
});

// ...mevcut kodlarınızın sonuna ekleyin...
app.put('/api/producks/:id', (req, res) => {
    fs.readFile(PRODUCKS_FILE, (err, data) => {
        if (err) return res.status(500).json({ success: false });
        let producks = JSON.parse(data);
        const id = parseInt(req.params.id);
        if (producks[id]) {
            producks[id] = req.body;
            fs.writeFile(PRODUCKS_FILE, JSON.stringify(producks, null, 2), () => {
                res.json({ success: true });
            });
        } else {
            res.status(404).json({ success: false });
        }
    });
});