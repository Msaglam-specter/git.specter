// orders.html için
document.addEventListener('DOMContentLoaded', () => {
    const ordersTable = document.querySelector('#orders-table tbody');
    if (ordersTable) {
        fetch('/api/orders')
            .then(res => res.json())
            .then(orders => {
                ordersTable.innerHTML = '';
                orders.forEach((order, i) => {
                    let toplam = 0;
                    let urunler = order.sepet.map(u => {
                        let fiyat = parseInt(u.fiyat.replace(/\D/g, ''));
                        toplam += fiyat * (u.adet || 1);
                        return `${u.ad} (${u.adet || 1} adet)`;
                    }).join('<br>');
                    let adres = order.adres || '-';
                    let tarih = order.tarih ? new Date(order.tarih).toLocaleString('tr-TR') : '-';
                    let adetToplam = order.sepet.reduce((a, u) => a + (u.adet || 1), 0);

                    ordersTable.innerHTML += `
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
    }
});

// producks.html için
document.addEventListener('DOMContentLoaded', () => {
    const producksTable = document.querySelector('#producks-table tbody');
    if (producksTable) {
        fetch('/api/producks')
            .then(res => res.json())
            .then(producks => {
                producksTable.innerHTML = '';
                producks.forEach((produck, i) => {
                    producksTable.innerHTML += `
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
                            <td>
                                <a href="ürün_düzenle.html?id=${i}" class="btn" style="padding:4px 10px;font-size:14px;">Düzenle</a>
                            </td>
                        </tr>
                    `;
                });
            });
    }
});
// urunEkle.html için
const urunEkleForm = document.getElementById('urunEkleForm');
if (urunEkleForm) {
    urunEkleForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const form = e.target;
        const data = {
            isim: form.isim.value,
            fiyat: form.fiyat.value,
            stok: form.stok.value,
            barkod: form.barkod.value,
            modelKodu: form.modelKodu.value,
            stokKodu: form.stokKodu.value,
            beden: form.beden.value,
            renk: form.renk.value,
            resim: form.resim.value
        };
        fetch('/api/producks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(result => {
            if(result.success){
                document.getElementById('mesaj').innerHTML = '<span class="success">Ürün başarıyla eklendi!</span>';
                form.reset();
            } else {
                document.getElementById('mesaj').innerHTML = '<span class="error">Bir hata oluştu!</span>';
            }
        })
        .catch(() => {
            document.getElementById('mesaj').innerHTML = '<span class="error">Sunucuya ulaşılamadı!</span>';
        });
    });
}

// urun_düzenle.html için
const urunDuzenleForm = document.getElementById('urunDuzenleForm');
if (urunDuzenleForm) {
    // URL'den id'yi al
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    let mevcutUrun = null;

    // Ürün bilgilerini çek ve forma doldur
    fetch('/api/producks')
        .then(res => res.json())
        .then(producks => {
            mevcutUrun = producks[id];
            if (mevcutUrun) {
                urunDuzenleForm.isim.value = mevcutUrun.isim || '';
                urunDuzenleForm.fiyat.value = mevcutUrun.fiyat || '';
                urunDuzenleForm.stok.value = mevcutUrun.stok || '';
                urunDuzenleForm.barkod.value = mevcutUrun.barkod || '';
                urunDuzenleForm.modelKodu.value = mevcutUrun.modelKodu || '';
                urunDuzenleForm.stokKodu.value = mevcutUrun.stokKodu || '';
                urunDuzenleForm.beden.value = mevcutUrun.beden || '';
                urunDuzenleForm.renk.value = mevcutUrun.renk || '';
                urunDuzenleForm.resim.value = mevcutUrun.resim || '';
            }
        });

    urunDuzenleForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const form = e.target;
        const data = {
            isim: form.isim.value,
            fiyat: form.fiyat.value,
            stok: form.stok.value,
            barkod: form.barkod.value,
            modelKodu: form.modelKodu.value,
            stokKodu: form.stokKodu.value,
            beden: form.beden.value,
            renk: form.renk.value,
            resim: form.resim.value
        };
        fetch(`/api/producks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(result => {
            if(result.success){
                document.getElementById('mesaj').innerHTML = '<span class="success">Ürün başarıyla güncellendi!</span>';
            } else {
                document.getElementById('mesaj').innerHTML = '<span class="error">Bir hata oluştu!</span>';
            }
        })
        .catch(() => {
            document.getElementById('mesaj').innerHTML = '<span class="error">Sunucuya ulaşılamadı!</span>';
        });
    });
}