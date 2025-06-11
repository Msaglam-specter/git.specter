import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

const Dashboard = () => {
    return (
        <div>
            <h1>Admin Dashboard</h1>
            <p>Welcome to the admin panel. Here you can manage your website content.</p>
            {/* Additional dashboard components and functionality can be added here */}
        </div>
    );
};

export default Dashboard;
const App = () => {
    return (
        <Router>
            <Switch>
                <Route path="/" exact component={Dashboard} />
                {/* Additional routes can be added here */}
            </Switch>
        </Router>
    );
};
ReactDOM.render(<App />, document.getElementById('root'));
//orders.html
document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/orders')
        .then(res => res.json())
        .then(orders => {
            const tbody = document.querySelector('#orders-table tbody');
            tbody.innerHTML = '';
            orders.forEach((order, i) => {
                // Toplam tutarı hesapla
                let toplam = 0;
                let urunler = order.sepet.map(u => {
                    let fiyat = parseInt(u.fiyat.replace(/\D/g, ''));
                    toplam += fiyat * (u.adet || 1);
                    return `${u.ad} (${u.adet || 1} adet)`;
                }).join('<br>');
                // Adres bilgisi varsa göster, yoksa '-'
                let adres = order.adres || '-';
                // Tarihi formatla
                let tarih = order.tarih ? new Date(order.tarih).toLocaleString('tr-TR') : '-';
                // Adet toplamı
                let adetToplam = order.sepet.reduce((a, u) => a + (u.adet || 1), 0);

                tbody.innerHTML += `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${tarih}</td>
                        <td>${urunler}</td>
                        <td>${adetToplam}</td>
                        <td>${toplam} TL</td>
                        <td>${adres}</td>
                    </tr>
                `;
            });
        });
});
// orders.html
// anasayfa
document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/orders')
        .then(res => res.json())
        .then(orders => {
            const tbody = document.querySelector('#orders-table tbody');
            tbody.innerHTML = '';
            orders.forEach((order, i) => {
                // Toplam tutarı hesapla
                let toplam = 0;
                let urunler = order.sepet.map(u => {
                    let fiyat = parseInt(u.fiyat.replace(/\D/g, ''));
                    toplam += fiyat * (u.adet || 1);
                    return `${u.ad} (${u.adet || 1} adet)`;
                }).join('<br>');
                // Adres bilgisi varsa göster, yoksa '-'
                let adres = order.adres || '-';
                // Tarihi formatla
                let tarih = order.tarih ? new Date(order.tarih).toLocaleString('tr-TR') : '-';
                // Adet toplamı
                let adetToplam = order.sepet.reduce((a, u) => a + (u.adet || 1), 0);

                tbody.innerHTML += `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${tarih}</td>
                        <td>${urunler}</td>
                        <td>${adetToplam}</td>
                        <td>${toplam} TL</td>
                        <td>${adres}</td>
                    </tr>
                `;
            });
        });
});
// anasayfa
// producks.html
document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/producks')
        .then(res => res.json())
        .then(producks => {
            const tbody = document.querySelector('#producks-table tbody');
            tbody.innerHTML = '';
            producks.forEach((produck, i) => {
                tbody.innerHTML += `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${produck.isim || '-'}</td>
                        <td>${produck.fiyat || '-'}</td>
                        <td>${produck.stok || '-'}</td>
                        <td>${produck.barkod || '-'}</td>
                        <td>${produck.modelKodu || '-'}</td>
                        <td>${produck.stokKodu || '-'}</td>
                        <td>${produck.beden || '-'}</td>
                        <td>${produck.renk || '-'}</td>
                    </tr>
                `;
            });
        });
});
