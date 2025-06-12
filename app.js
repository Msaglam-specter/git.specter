document.addEventListener('DOMContentLoaded', () => {
    // Firebase db referansı HTML'de global olarak tanımlandığı için burada tekrar almaya gerek yok.
    // const db = firebase.firestore(); // Bu satıra gerek yok.

    // === SİPARİŞLER BÖLÜMÜ ===
    const ordersTable = document.querySelector('#orders-table tbody');
    if (ordersTable) {
        db.collection("orders").get()
            .then((querySnapshot) => {
                ordersTable.innerHTML = ''; // Önce temizle
                if (querySnapshot.empty) {
                    ordersTable.innerHTML = '<tr><td colspan="6">Henüz sipariş yok.</td></tr>'; // String olarak düzeltildi
                    return;
                }
                let i = 0;
                querySnapshot.forEach((doc) => {
                    const order = doc.data();
                    let toplam = 0;
                    let urunlerHtml = '';
                    if (order.sepet && Array.isArray(order.sepet)) {
                        urunlerHtml = order.sepet.map(u => {
                            let fiyat = 0;
                            if (u.fiyat && typeof u.fiyat === 'string') {
                                fiyat = parseInt(u.fiyat.replace(/\D/g, '')) || 0;
                            } else if (typeof u.fiyat === 'number') {
                                fiyat = u.fiyat;
                            }
                            toplam += fiyat * (u.adet || 1);
                            return `${u.ad || 'Bilinmeyen Ürün'} (${u.adet || 1} adet)`;
                        }).join('<br>');
                    }

                    let adres = order.adres || '-';
                    let tarih = order.tarih && order.tarih.seconds ? new Date(order.tarih.seconds * 1000).toLocaleString('tr-TR') : '-';
                    let adetToplam = 0;
                    if (order.sepet && Array.isArray(order.sepet)) {
                       adetToplam = order.sepet.reduce((acc, u) => acc + (u.adet || 1), 0);
                    }

                    ordersTable.innerHTML += `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${tarih}</td>
                            <td>${urunlerHtml || '-'}</td>
                            <td>${adetToplam}</td>
                            <td>${toplam} TL</td>
                            <td>${adres}</td>
                        </tr>
                    `;
                    i++;
                });
            })
            .catch((error) => {
                ordersTable.innerHTML = '<tr><td colspan="6">Siparişler yüklenemedi! Bir hata oluştu.</td></tr>'; // String olarak düzeltildi
                console.error("Siparişleri yükleme hatası: ", error);
            });
    }

    // === ÜRÜNLER LİSTELEME BÖLÜMÜ ===
    const producksTable = document.querySelector('#producks-table tbody');
    if (producksTable) {
        db.collection("producks").get()
            .then((querySnapshot) => {
                producksTable.innerHTML = ''; // Önce temizle
                if (querySnapshot.empty) {
                    producksTable.innerHTML = '<tr><td colspan="10">Henüz ürün eklenmemiş.</td></tr>'; // String olarak düzeltildi
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
                            <td>${produck.fiyat !== undefined ? produck.fiyat + ' TL' : '-'}</td>
                            <td>${produck.stok !== undefined ? produck.stok : '-'}</td>
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
                // Sil butonlarına event listener ekle
                producksTable.querySelectorAll('.sil-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const idToDelete = this.getAttribute('data-id');
                        if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
                            deleteProduck(idToDelete);
                        }
                    });
                });
            })
            .catch((error) => {
                producksTable.innerHTML = '<tr><td colspan="10">Ürünler yüklenemedi. Bir hata oluştu.</td></tr>'; // String olarak düzeltildi
                console.error("Ürünleri yükleme hatası: ", error);
            });
    }

        // === ÜRÜN EKLEME BÖLÜMÜ ===
    const urunEkleForm = document.getElementById('urunEkleForm');
    if (urunEkleForm) {
        urunEkleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const form = e.target;
            const mesajElement = document.getElementById('mesaj'); // Mesaj elementi

            // ... (validasyon kodları aynı kalacak) ...
            const isim = form.isim.value.trim();
            const fiyat = parseFloat(form.fiyat.value);
            const stok = parseInt(form.stok.value, 10);

            if (!isim) {
                mesajElement.innerHTML = '<span class="error">Ürün ismi boş bırakılamaz.</span>';
                return;
            }
            if (isNaN(fiyat) || fiyat < 0) {
                mesajElement.innerHTML = '<span class="error">Geçerli bir fiyat giriniz.</span>';
                return;
            }
            if (isNaN(stok) || stok < 0) {
                mesajElement.innerHTML = '<span class="error">Geçerli bir stok miktarı giriniz.</span>';
                return;
            }
            // ... (validasyon sonu) ...


            const data = {
                // ... (veri objesi aynı kalacak) ...
                isim: isim,
                fiyat: fiyat, // Sayısal olarak
                stok: stok,   // Sayısal olarak
                barkod: form.barkod.value.trim(),
                modelKodu: form.modelKodu.value.trim(),
                stokKodu: form.stokKodu.value.trim(),
                beden: form.beden.value.trim(),
                renk: form.renk.value.trim(),
                resim: form.resim.value.trim(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Butonu geçici olarak devre dışı bırak ve mesajı temizle
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            mesajElement.innerHTML = 'Ekleniyor...'; // Mesaj gösteriliyor

            db.collection("producks").add(data)
                .then((docRef) => {
                    // Başarı durumunda yapılacaklar:
                    console.log("Firestore ekleme başarılı! Doküman ID:", docRef.id);

                    // 1. Başarı mesajını göster
                    mesajElement.innerHTML = '<span class="success">Ürün başarıyla eklendi! Ürünler sayfasına yönlendiriliyorsunuz...</span>';
                    console.log("Başarı mesajı gösterildi.");

                    // 2. Formu temizlemek yerine belirli bir süre sonra yönlendirme yap
                    // Kısa bir bekleme eklemek, kullanıcının başarı mesajını görmesini sağlar.
                    setTimeout(() => {
                        window.location.href = 'producks.html'; // Ürünler sayfasının URL'si
                    }, 2000); // 2 saniye (2000 milisaniye) bekleyip yönlendir

                    // form.reset(); // <-- BU SATIRI KALDIRIN VEYA YORUM SATIRI YAPIN

                })
                .catch((error) => {
                    // Hata durumunda yapılacaklar (şu anki kodunuzdaki gibi kalabilir):
                    console.error("Firebase'e ürün ekleme hatası: ", error);
                    mesajElement.innerHTML = '<span class="error">Ürün eklenirken bir hata oluştu!</span>';
                    // Hata durumunda yönlendirme yapmıyoruz, kullanıcı formda kalıp hatayı görür.
                })
                .finally(() => {
                    // İşlem tamamlandığında (başarı veya hata), butonu tekrar aktif et
                    // Başarı durumunda yönlendirme olacağı için bu satır çalışsa da fark etmez,
                    // ama hata durumunda kullanıcının tekrar denemesi için butonun aktif olması önemli.
                    submitButton.disabled = false;
                     console.log("Firestore işlemi tamamlandı.");
                });
        });
    }

    // === ÜRÜN DÜZENLEME BÖLÜMÜ ===
    const urunDuzenleForm = document.getElementById('urunDuzenleForm');
    if (urunDuzenleForm) {
        const mesajElement = document.getElementById('mesaj'); // Bu form için ayrı bir mesaj elementi olabilir veya aynı ID'li global bir element
        const urlParams = new URLSearchParams(window.location.search);
        const produckId = urlParams.get('id');
        const submitButton = urunDuzenleForm.querySelector('button[type="submit"]');


        if (produckId) {
            if(mesajElement) mesajElement.innerHTML = 'Ürün bilgileri yükleniyor...';
            db.collection("producks").doc(produckId).get()
                .then((doc) => {
                    if (doc.exists) {
                        const mevcutUrun = doc.data();
                        urunDuzenleForm.isim.value = mevcutUrun.isim || '';
                        urunDuzenleForm.fiyat.value = mevcutUrun.fiyat !== undefined ? mevcutUrun.fiyat : '';
                        urunDuzenleForm.stok.value = mevcutUrun.stok !== undefined ? mevcutUrun.stok : '';
                        urunDuzenleForm.barkod.value = mevcutUrun.barkod || '';
                        urunDuzenleForm.modelKodu.value = mevcutUrun.modelKodu || '';
                        urunDuzenleForm.stokKodu.value = mevcutUrun.stokKodu || '';
                        urunDuzenleForm.beden.value = mevcutUrun.beden || '';
                        urunDuzenleForm.renk.value = mevcutUrun.renk || '';
                        urunDuzenleForm.resim.value = mevcutUrun.resim || '';
                        if(mesajElement) mesajElement.innerHTML = ''; // Yükleme başarılı, mesajı temizle
                    } else {
                        if(mesajElement) mesajElement.innerHTML = '<span class="error">Ürün bulunamadı!</span>';
                        if(submitButton) submitButton.disabled = true; // Ürün yoksa formu göndermeyi engelle
                    }
                })
                .catch((error) => {
                    if(mesajElement) mesajElement.innerHTML = '<span class="error">Ürün bilgileri alınırken hata oluştu!</span>';
                    console.error("Ürün bilgilerini alma hatası: ", error);
                    if(submitButton) submitButton.disabled = true;
                });

            urunDuzenleForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const form = e.target;

                const isim = form.isim.value.trim();
                const fiyat = parseFloat(form.fiyat.value);
                const stok = parseInt(form.stok.value, 10);

                if (!isim) {
                    if(mesajElement) mesajElement.innerHTML = '<span class="error">Ürün ismi boş bırakılamaz.</span>';
                    return;
                }
                if (isNaN(fiyat) || fiyat < 0) {
                    if(mesajElement) mesajElement.innerHTML = '<span class="error">Geçerli bir fiyat giriniz.</span>';
                    return;
                }
                if (isNaN(stok) || stok < 0) {
                    if(mesajElement) mesajElement.innerHTML = '<span class="error">Geçerli bir stok miktarı giriniz.</span>';
                    return;
                }

                const data = {
                    isim: isim,
                    fiyat: fiyat,
                    stok: stok,
                    barkod: form.barkod.value.trim(),
                    modelKodu: form.modelKodu.value.trim(),
                    stokKodu: form.stokKodu.value.trim(),
                    beden: form.beden.value.trim(),
                    renk: form.renk.value.trim(),
                    resim: form.resim.value.trim(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp() // Güncelleme zamanı
                };

                if(submitButton) submitButton.disabled = true;
                if(mesajElement) mesajElement.innerHTML = 'Güncelleniyor...';

                db.collection("products").doc(produckId).update(data)
                    .then(() => {
                        if(mesajElement) mesajElement.innerHTML = '<span class="success">Ürün başarıyla güncellendi!</span>';
                    })
                    .catch((error) => {
                        if(mesajElement) mesajElement.innerHTML = '<span class="error">Ürün güncellenirken bir hata oluştu!</span>';
                        console.error("Firebase ürün güncelleme hatası: ", error);
                    })
                    .finally(() => {
                        if(submitButton) submitButton.disabled = false;
                    });
            });
        } else {
            if (mesajElement) mesajElement.innerHTML = '<span class="error">Düzenlenecek ürün ID\'si URL\'de bulunamadı.</span>';
            if(submitButton) submitButton.disabled = true;
        }
    }
}); // DOMContentLoaded sonu

// === ÜRÜN SİLME FONKSİYONU (GLOBAL SCOPE'DA) ===
function deleteProduct(produckId) {
    // db değişkeni global olduğu için burada erişilebilir.
    if (!db) {
        console.error("Firestore 'db' objesi bulunamadı!");
        alert("Veritabanı bağlantı hatası, silme işlemi yapılamadı.");
        return;
    }
    db.collection("products").doc(produckId).delete()
        .then(() => {
            alert("Ürün başarıyla silindi!");
            window.location.reload(); // Sayfayı yenileyerek listeyi güncelle
        })
        .catch((error) => {
            alert("Ürün silinirken bir hata oluştu.");
            console.error("Firebase'den ürün silme hatası: ", error);
        });
}