const firebaseConfig = {
  apiKey: "AIzaSyBxGu7lw0w8fvsLYPVyBMBeTkwneBrllyA", // Size özel API anahtarınız
  authDomain: "git-specter-admin-paneli.firebaseapp.com", // Projenizin kimlik doğrulama alanı
  projectId: "git-specter-admin-paneli", // Projenizin ID'si (bu zaten doğru olmalı)
  storageBucket: "git-specter-admin-paneli.firebasestorage.app", // Storage Bucket adresi
  messagingSenderId: "974606404880", // FCM Sender ID
  appId: "1:974606404880:web:9c4f52286c409b1c42a995", // Web uygulamanızın benzersiz ID'si
  measurementId: "G-CDRTPJ7C9Y" // (Eğer Analytics eklediyseniz bu da olabilir)
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* orders.html için */
document.addEventListener('DOMContentLoaded', () => {
    const ordersTable = document.querySelector('#orders-table tbody');
    if (ordersTable) {
        db.collection("orders").get()
            .then((querySnapshot) => {
                ordersTable.innerHTML = '';
                if (querySnapshot.empty) {
                    ordersTable.innerHTML = '<tr><td colspan="6">Henüz sipariş yok.</td></tr>';
                    return;
                }
                let i = 0;
                querySnapshot.forEach((doc) => {
                    const order = doc.data();
                    let toplam = 0;
                    let urunler = order.sepet.map(u => {
                        let fiyat = parseInt(u.fiyat.replace(/\D/g, ''));
                        toplam += fiyat * (u.adet || 1);
                        return `${u.ad} (${u.adet || 1} adet)`;
                    }).join('<br>');
                    let adres = order.adres || '-';
                    let tarih = order.tarih ? new Date(order.tarih.seconds * 1000).toLocaleString('tr-TR') : '-';
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
                    i++;
                });
            })
            .catch((error) => {
                ordersTable.innerHTML = '<tr><td colspan="6">Siparişler yüklenemedi!</td></tr>';
                console.error(error);
            });
    }
});

/* producks.html için (Firestore'dan okuma)*/
document.addEventListener('DOMContentLoaded', () => {
    const producksTable = document.querySelector('#producks-table tbody');
    if (producksTable) {
        db.collection("products").get()
            .then((querySnapshot) => {
                producksTable.innerHTML = '';
                if (querySnapshot.empty) {
                    producksTable.innerHTML = '<tr><td colspan="10">Henüz ürün eklenmemiş.</td></tr>';
                    return;
                }
                let i = 0;
                querySnapshot.forEach((doc) => {
                    const produck = doc.data();
                    const produckId = doc.id;
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
                                <a href="ürün_düzenle.html?id=${produckId}" class="btn" style="padding:4px 10px;font-size:14px;">Düzenle</a>
                                <button class="btn btn-danger sil-btn" data-id="${produckId}" style="padding:4px 10px;font-size:14px; margin-left: 5px;">Sil</button>
                            </td>
                        </tr>
                    `;
                    i++;
                });
                producksTable.querySelectorAll('.sil-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const idToDelete = this.getAttribute('data-id');
                        if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
                            deleteProduct(idToDelete);
                        }
                    });
                });
            })
            .catch((error) => {
                producksTable.innerHTML = '<tr><td colspan="10">Ürünler yüklenemedi.</td></tr>';
                console.error(error);
            });
    }
});

/* Ürün silme fonksiyonu*/
function deleteProduct(produckId) {
    db.collection("products").doc(produckId).delete()
        .then(() => {
            window.location.reload();
        })
        .catch((error) => {
            alert("Ürün silinirken bir hata oluştu.");
            console.error(error);
        });
}

/* urunEkle.html için*/
const urunEkleForm = document.getElementById('urunEkleForm');
if (urunEkleForm) {
    urunEkleForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const form = e.target;
        const mesajElement = document.getElementById('mesaj');
        const data = {
            isim: form.isim.value,
            fiyat: form.fiyat.value,
            stok: form.stok.value,
            barkod: form.barkod.value,
            modelKodu: form.modelKodu.value,
            stokKodu: form.stokKodu.value,
            beden: form.beden.value,
            renk: form.renk.value,
            resim: form.resim.value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        db.collection("products").add(data)
            .then((docRef) => {
                mesajElement.innerHTML = '<span class="success">Ürün başarıyla eklendi!</span>';
                form.reset();
            })
            .catch((error) => {
                mesajElement.innerHTML = '<span class="error">Ürün eklenirken bir hata oluştu!</span>';
                console.error(error);
            });
    });
}

/* urun_düzenle.html için*/
const urunDuzenleForm = document.getElementById('urunDuzenleForm');
if (urunDuzenleForm) {
    const mesajElement = document.getElementById('mesaj');
    const urlParams = new URLSearchParams(window.location.search);
    const produckId = urlParams.get('id');
    if (produckId) {
        db.collection("products").doc(produckId).get()
            .then((doc) => {
                if (doc.exists) {
                    const mevcutUrun = doc.data();
                    urunDuzenleForm.isim.value = mevcutUrun.isim || '';
                    urunDuzenleForm.fiyat.value = mevcutUrun.fiyat || '';
                    urunDuzenleForm.stok.value = mevcutUrun.stok || '';
                    urunDuzenleForm.barkod.value = mevcutUrun.barkod || '';
                    urunDuzenleForm.modelKodu.value = mevcutUrun.modelKodu || '';
                    urunDuzenleForm.stokKodu.value = mevcutUrun.stokKodu || '';
                    urunDuzenleForm.beden.value = mevcutUrun.beden || '';
                    urunDuzenleForm.renk.value = mevcutUrun.renk || '';
                    urunDuzenleForm.resim.value = mevcutUrun.resim || '';
                } else {
                    mesajElement.innerHTML = '<span class="error">Ürün bulunamadı!</span>';
                }
            })
            .catch((error) => {
                mesajElement.innerHTML = '<span class="error">Ürün bilgileri alınırken hata oluştu!</span>';
                console.error(error);
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
            db.collection("products").doc(produckId).update(data)
                .then(() => {
                    mesajElement.innerHTML = '<span class="success">Ürün başarıyla güncellendi!</span>';
                })
                .catch((error) => {
                    mesajElement.innerHTML = '<span class="error">Ürün güncellenirken bir hata oluştu!</span>';
                    console.error(error);
                });
        });
    }
}