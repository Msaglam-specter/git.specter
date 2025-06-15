/* 15.06.2025(14:31)*/
// Firestore 'db' referansının HTML içinde global olarak tanımlandığı varsayılıyor
// Eğer 'db' global değilse, DOMContentLoaded içinde tanımlanması gerekebilir.

document.addEventListener('DOMContentLoaded', () => {
    // Firebase Firestore referansını burada tanımlayın
    const db = firebase.firestore();

    // === SİPARİŞLER BÖLÜMÜ ===
    const ordersTable = document.querySelector('#orders-table tbody');
    let unsubscribeOrders = null; // Sipariş dinleyicisini durdurmak için referans

    if (ordersTable) {
        unsubscribeOrders = db.collection("orders").orderBy("tarih", "desc").onSnapshot(
            (querySnapshot) => { // Başarılı veri alımı callback'i
                console.log("Firestore'dan siparişler güncellendi. Toplam sipariş:", querySnapshot.size);
                ordersTable.innerHTML = ''; // Önce temizle

                if (querySnapshot.empty) {
                    ordersTable.innerHTML = '<tr><td colspan="8">Henüz sipariş yok.</td></tr>';
                    return;
                }

                let i = 0;
                querySnapshot.forEach((doc) => {
                    const order = doc.data();
                    const orderId = doc.id;
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
                    let tarih = order.tarih && order.tarih.seconds ? new Date(order.tarih.seconds * 1000).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
                    let durum = order.durum || 'Bekliyor'; // Sipariş durumu
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
                            <td>${toplam.toLocaleString('tr-TR')} TL</td>
                            <td>${adres}</td>
                            <td><span class="status-${durum.toLowerCase()}">${durum}</span></td>
                            <td>
                                ${durum === 'Bekliyor' ? `
                                    <button class="btn btn-success approve-order-btn" data-id="${orderId}" style="padding:4px 8px;font-size:12px;">Onayla</button>
                                    <button class="btn btn-danger reject-order-btn" data-id="${orderId}" style="padding:4px 8px;font-size:12px; margin-left: 5px;">Reddet</button>
                                ` : durum === 'Onaylandı' ? '<span class="text-success">Onaylandı</span>' : '<span class="text-danger">Reddedildi</span>'}
                            </td>
                        </tr>
                    `;
                    i++;
                });

                // Onaylama butonlarına event listener ekle (HTML güncellendikten sonra)
                ordersTable.querySelectorAll('.approve-order-btn').forEach(button => {
                    button.onclick = function() {
                        const orderIdToApprove = this.getAttribute('data-id');
                        if (confirm(`Siparişi onaylamak istediğinize emin misiniz?`)) {
                            updateOrderStatus(orderIdToApprove, 'Onaylandı');
                        }
                    };
                });

                // Reddetme butonlarına event listener ekle (HTML güncellendikten sonra)
                ordersTable.querySelectorAll('.reject-order-btn').forEach(button => {
                    button.onclick = function() {
                        const orderIdToReject = this.getAttribute('data-id');
                        if (confirm(`Siparişi reddetmek istediğinize emin misiniz?`)) {
                            updateOrderStatus(orderIdToReject, 'Reddedildi');
                        }
                    };
                });
            },
            (error) => { // Hata callback'i
                ordersTable.innerHTML = '<tr><td colspan="8">Siparişler yüklenemedi! Bir hata oluştu.</td></tr>';
                console.error("Siparişleri yükleme hatası: ", error);
            }
        );

        // Sayfa kapatıldığında veya değiştirildiğinde sipariş dinleyicisini durdur
        window.addEventListener('beforeunload', () => {
            if (unsubscribeOrders) {
                unsubscribeOrders();
                console.log("Siparişler dinleyicisi durduruldu.");
            }
        });

        // Sipariş Durumunu Güncelleme Fonksiyonu
        function updateOrderStatus(orderId, newStatus) {
            if (!orderId || !newStatus) {
                console.error("Sipariş ID'si veya yeni durum belirtilmedi.");
                alert("Sipariş durumu güncellenirken bir hata oluştu.");
                return;
            }
            db.collection("orders").doc(orderId).update({ durum: newStatus })
                .then(() => console.log(`Sipariş ${orderId} durumu güncellendi: ${newStatus}`))
                .catch(error => console.error("Sipariş durumu güncellenirken hata: ", error));
        }
    }


    // === ÜRÜNLER LİSTELEME BÖLÜMÜ (GÜNCELLENDİ: get() yerine onSnapshot() kullanılıyor) ===
    const producksTable = document.querySelector('#producks-table tbody');
    let unsubscribeProducks = null; // Dinleyiciyi durdurmak için referans

    if (producksTable) {
        unsubscribeProducks = db.collection("producks").orderBy("createdAt", "desc").onSnapshot((querySnapshot) => {
            console.log("Firestore'dan ürünler güncellendi. Toplam ürün:", querySnapshot.size);
            producksTable.innerHTML = '';

            if (querySnapshot.empty) {
                producksTable.innerHTML = '<tr><td colspan="11">Henüz ürün eklenmemiş.</td></tr>';
                console.log("Ürün koleksiyonu boş.");
                return;
            }

            let i = 0;
            querySnapshot.forEach((doc) => {
                const produck = doc.data();
                const produckId = doc.id;
                producksTable.innerHTML += `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${produck.kategori || '-'}</td>
                        <td>${produck.isim || '-'}</td>
                        <td>${produck.fiyat !== undefined ? produck.fiyat.toLocaleString('tr-TR') + ' TL' : '-'}</td>
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

            producksTable.querySelectorAll('.sil-btn').forEach(button => {
                button.onclick = function() {
                    const idToDelete = this.getAttribute('data-id');
                    // Ürün ismi için doğru hücre indeksi (kategori eklendikten sonra isim 3. hücrede, index 2)
                    if (confirm(`'${this.closest('tr').cells[2].textContent}' isimli ürünü silmek istediğinize emin misiniz?`)) {
                        deleteProduck(idToDelete);
                    }
                };
            });

        }, (error) => {
            producksTable.innerHTML = '<tr><td colspan="11">Ürünler yüklenemedi. Bir hata oluştu.</td></tr>';
            console.error("Ürünleri yükleme hatası: ", error);
        });

        // Sayfa kapatıldığında veya değiştirildiğinde dinleyiciyi durdur
        window.addEventListener('beforeunload', () => {
            if (unsubscribeProducks) {
                unsubscribeProducks();
                console.log("Ürünler dinleyicisi durduruldu.");
            }
        });
    }

    // Ürün Silme Fonksiyonu
    function deleteProduck(id) {
        if (!id) {
            console.error("Silinecek ürün ID'si belirtilmedi.");
            alert("Silme işlemi için ürün ID'si gerekli.");
            return;
        }
        db.collection("producks").doc(id).delete()
            .then(() => {
                console.log("Ürün başarıyla silindi:", id);
            })
            .catch((error) => {
                console.error("Ürün silinirken hata oluştu: ", error);
                alert("Ürün silinirken bir hata oluştu. Lütfen konsolu kontrol edin.");
            });
    }


    // === ÜRÜN EKLEME BÖLÜMÜ ===
    const urunEkleForm = document.getElementById('urunEkleForm');
    if (urunEkleForm) {
        const mesajElement = document.getElementById('mesaj');
        const submitButton = urunEkleForm.querySelector('button[type="submit"]');

        urunEkleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const form = e.target;

            const isim = form.isim.value.trim();
            const fiyat = parseFloat(form.fiyat.value);
            const stok = parseInt(form.stok.value, 10);

            if (mesajElement) mesajElement.innerHTML = '';

            if (!isim) {
                if (mesajElement) mesajElement.innerHTML = '<span class="error">Ürün ismi boş bırakılamaz.</span>';
                return;
            }
            if (isNaN(fiyat) || fiyat < 0) {
                if (mesajElement) mesajElement.innerHTML = '<span class="error">Geçerli bir fiyat giriniz (örn: 123.45). Fiyat negatif olamaz.</span>';
                return;
            }
            if (isNaN(stok) || stok < 0) {
                if (mesajElement) mesajElement.innerHTML = '<span class="error">Geçerli bir stok miktarı giriniz. Stok negatif olamaz.</span>';
                return;
            }

            const data = {
                isim: isim,
                fiyat: fiyat,
                stok: stok,
                kategori: form.kategori.value.trim(),
                barkod: form.barkod.value.trim(),
                modelKodu: form.modelKodu.value.trim(),
                stokKodu: form.stokKodu.value.trim(),
                beden: form.beden.value.trim(),
                renk: form.renk.value.trim(),
                resim: form.resim.value.trim(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (submitButton) submitButton.disabled = true;
            if (mesajElement) mesajElement.innerHTML = 'Ekleniyor...';

            db.collection("producks").add(data)
                .then((docRef) => {
                    console.log("Firestore ekleme başarılı! Doküman ID:", docRef.id);
                    if (mesajElement) mesajElement.innerHTML = '<span class="success">Ürün başarıyla eklendi! Ürünler sayfasına yönlendiriliyor...</span>';
                    setTimeout(() => {
                        window.location.href = 'producks.html';
                    }, 2000);
                })
                .catch((error) => {
                    console.error("Firebase'e ürün ekleme hatası: ", error);
                    if (mesajElement) mesajElement.innerHTML = `<span class="error">Ürün eklenirken bir hata oluştu! ${error.message}</span>`;
                    if (submitButton) submitButton.disabled = false;
                });
        });
    }

    // === ÜRÜN DÜZENLEME BÖLÜMÜ ===
    const urunDuzenleForm = document.getElementById('urunDuzenleForm');
    if (urunDuzenleForm) {
        const mesajElement = document.getElementById('mesaj');
        const urlParams = new URLSearchParams(window.location.search);
        const produckId = urlParams.get('id');
        const submitButton = urunDuzenleForm.querySelector('button[type="submit"]');

        if (!produckId) {
            if (mesajElement) mesajElement.innerHTML = '<span class="error">Düzenlenecek ürün ID\'si bulunamadı. Lütfen ürünler listesinden gelin.</span>';
            if (submitButton) submitButton.disabled = true;
            return;
        }

        if (mesajElement) mesajElement.innerHTML = 'Ürün bilgileri yükleniyor...';
        if (submitButton) submitButton.disabled = true;

        db.collection("producks").doc(produckId).get()
            .then((doc) => {
                if (doc.exists) {
                    const mevcutUrun = doc.data();
                    urunDuzenleForm.isim.value = mevcutUrun.isim || '';
                    urunDuzenleForm.fiyat.value = mevcutUrun.fiyat !== undefined ? mevcutUrun.fiyat : '';
                    urunDuzenleForm.stok.value = mevcutUrun.stok !== undefined ? mevcutUrun.stok : '';
                    urunDuzenleForm.kategori.value = mevcutUrun.kategori || '';
                    urunDuzenleForm.barkod.value = mevcutUrun.barkod || '';
                    urunDuzenleForm.modelKodu.value = mevcutUrun.modelKodu || '';
                    urunDuzenleForm.stokKodu.value = mevcutUrun.stokKodu || '';
                    urunDuzenleForm.beden.value = mevcutUrun.beden || '';
                    urunDuzenleForm.renk.value = mevcutUrun.renk || '';
                    urunDuzenleForm.resim.value = mevcutUrun.resim || '';
                    if (mesajElement) mesajElement.innerHTML = '';
                    if (submitButton) submitButton.disabled = false;
                } else {
                    if (mesajElement) mesajElement.innerHTML = '<span class="error">Ürün bulunamadı! ID geçersiz olabilir.</span>';
                }
            })
            .catch((error) => {
                console.error("Ürün bilgilerini yükleme hatası: ", error);
                if (mesajElement) mesajElement.innerHTML = `<span class="error">Ürün bilgileri yüklenemedi! Hata: ${error.message}</span>`;
            });

        urunDuzenleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const form = e.target;

            const isim = form.isim.value.trim();
            const fiyat = parseFloat(form.fiyat.value);
            const stok = parseInt(form.stok.value, 10);

            if (mesajElement) mesajElement.innerHTML = '';

            if (!isim) {
                if (mesajElement) mesajElement.innerHTML = '<span class="error">Ürün ismi boş bırakılamaz.</span>';
                return;
            }
            if (isNaN(fiyat) || fiyat < 0) {
                if (mesajElement) mesajElement.innerHTML = '<span class="error">Geçerli bir fiyat giriniz (örn: 123.45). Fiyat negatif olamaz.</span>';
                return;
            }
            if (isNaN(stok) || stok < 0) {
                if (mesajElement) mesajElement.innerHTML = '<span class="error">Geçerli bir stok miktarı giriniz. Stok negatif olamaz.</span>';
                return;
            }

            const updatedData = {
                isim: isim,
                fiyat: fiyat,
                stok: stok,
                kategori: form.kategori.value.trim(),
                barkod: form.barkod.value.trim(),
                modelKodu: form.modelKodu.value.trim(),
                stokKodu: form.stokKodu.value.trim(),
                beden: form.beden.value.trim(),
                renk: form.renk.value.trim(),
                resim: form.resim.value.trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (submitButton) submitButton.disabled = true;
            if (mesajElement) mesajElement.innerHTML = 'Güncelleniyor...';

            db.collection("producks").doc(produckId).update(updatedData)
                .then(() => {
                    console.log("Ürün başarıyla güncellendi! ID:", produckId);
                    if (mesajElement) mesajElement.innerHTML = '<span class="success">Ürün başarıyla güncellendi! Ürünler sayfasına yönlendiriliyor...</span>';
                    setTimeout(() => {
                        window.location.href = 'producks.html';
                    }, 2000);
                })
                .catch((error) => {
                    console.error("Firebase'e ürün güncelleme hatası: ", error);
                    if (mesajElement) mesajElement.innerHTML = `<span class="error">Ürün güncellenirken bir hata oluştu! ${error.message}</span>`;
                    if (submitButton) submitButton.disabled = false;
                });
        });
    }
});
