/* 15.06.2025(02:25)*/
// Firestore 'db' referansının HTML içinde global olarak tanımlandığı varsayılıyor.
// Eğer 'db' global değilse, DOMContentLoaded içinde tanımlanması gerekebilir.

document.addEventListener('DOMContentLoaded', () => {
    // Firebase Firestore referansını burada tanımlayın
    const db = firebase.firestore();

    // === SİPARİŞLER BÖLÜMÜ ===
    const ordersTable = document.querySelector('#orders-table tbody');
    if (ordersTable) {
        db.collection("orders").orderBy("tarih", "desc").get() // Siparişler için şimdilik get() kullanılıyor, tarihe göre sıralandı
            .then((querySnapshot) => {
                ordersTable.innerHTML = ''; // Önce temizle
                if (querySnapshot.empty) {
                    ordersTable.innerHTML = '<tr><td colspan="6">Henüz sipariş yok.</td></tr>';
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
                    let tarih = order.tarih && order.tarih.seconds ? new Date(order.tarih.seconds * 1000).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
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
                        </tr>
                    `;
                    i++;
                });
            })
            .catch((error) => {
                ordersTable.innerHTML = '<tr><td colspan="6">Siparişler yüklenemedi! Bir hata oluştu.</td></tr>';
                console.error("Siparişleri yükleme hatası: ", error);
            });
    }

    // === ÜRÜNLER LİSTELEME BÖLÜMÜ (GÜNCELLENDİ: get() yerine onSnapshot() kullanılıyor) ===
    const producksTable = document.querySelector('#producks-table tbody');
    let unsubscribeProducks = null; // Dinleyiciyi durdurmak için referans

    if (producksTable) {
        unsubscribeProducks = db.collection("producks").orderBy("createdAt", "desc").onSnapshot((querySnapshot) => {
            console.log("Firestore'dan ürünler güncellendi. Toplam ürün:", querySnapshot.size);
            producksTable.innerHTML = '';

            if (querySnapshot.empty) {
                producksTable.innerHTML = '<tr><td colspan="10">Henüz ürün eklenmemiş.</td></tr>';
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
                    if (confirm(`'${this.closest('tr').cells[1].textContent}' isimli ürünü silmek istediğinize emin misiniz?`)) {
                        deleteProduck(idToDelete);
                    }
                };
            });

        }, (error) => {
            producksTable.innerHTML = '<tr><td colspan="10">Ürünler yüklenemedi. Bir hata oluştu.</td></tr>';
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
                // onSnapshot zaten tabloyu güncelleyeceği için burada ek bir UI güncellemesine gerek yok.
                // İsteğe bağlı olarak bir bildirim gösterilebilir:
                // Örneğin bir toast mesajı veya alert("Ürün başarıyla silindi!");
            })
            .catch((error) => {
                console.error("Ürün silinirken hata oluştu: ", error);
                alert("Ürün silinirken bir hata oluştu. Lütfen konsolu kontrol edin.");
            });
    }


    // === ÜRÜN EKLEME BÖLÜMÜ ===
    const urunEkleForm = document.getElementById('urunEkleForm');
    if (urunEkleForm) {
        const mesajElement = document.getElementById('mesaj'); // Bu form için mesaj elementi
        const submitButton = urunEkleForm.querySelector('button[type="submit"]');

        urunEkleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const form = e.target;

            const isim = form.isim.value.trim();
            const fiyat = parseFloat(form.fiyat.value);
            const stok = parseInt(form.stok.value, 10);

            if (mesajElement) mesajElement.innerHTML = ''; // Önceki mesajları temizle

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
                barkod: form.barkod.value.trim(),
                modelKodu: form.modelKodu.value.trim(),
                stokKodu: form.stokKodu.value.trim(),
                beden: form.beden.value.trim(),
                renk: form.renk.value.trim(),
                resim: form.resim.value.trim(), // Resim URL'si veya adı
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (submitButton) submitButton.disabled = true;
            if (mesajElement) mesajElement.innerHTML = 'Ekleniyor...';

            db.collection("producks").add(data)
                .then((docRef) => {
                    console.log("Firestore ekleme başarılı! Doküman ID:", docRef.id);
                    if (mesajElement) mesajElement.innerHTML = '<span class="success">Ürün başarıyla eklendi! Ürünler sayfasına yönlendiriliyor...</span>';
                    setTimeout(() => {
                        window.location.href = 'producks.html'; // Ürünler listeleme sayfasının adı
                    }, 2000);
                })
                .catch((error) => {
                    console.error("Firebase'e ürün ekleme hatası: ", error);
                    if (mesajElement) mesajElement.innerHTML = `<span class="error">Ürün eklenirken bir hata oluştu! ${error.message}</span>`;
                    if (submitButton) submitButton.disabled = false; // Hata durumunda butonu tekrar aktif et
                });
                // finally bloğuna gerek kalmadı, çünkü başarılı durumda yönlendirme var,
                // hatalı durumda ise catch içinde butonu aktif ediyoruz.
        });
    }

    // === ÜRÜN DÜZENLEME BÖLÜMÜ ===
    const urunDuzenleForm = document.getElementById('urunDuzenleForm');
    if (urunDuzenleForm) {
        const mesajElement = document.getElementById('mesaj'); // Bu form için mesaj elementi
        const urlParams = new URLSearchParams(window.location.search);
        const produckId = urlParams.get('id');
        const submitButton = urunDuzenleForm.querySelector('button[type="submit"]');

        if (!produckId) {
            if (mesajElement) mesajElement.innerHTML = '<span class="error">Düzenlenecek ürün ID\'si bulunamadı. Lütfen ürünler listesinden gelin.</span>';
            if (submitButton) submitButton.disabled = true;
            return; // produckId yoksa devam etme
        }

        if (mesajElement) mesajElement.innerHTML = 'Ürün bilgileri yükleniyor...';
        if (submitButton) submitButton.disabled = true; // Veri yüklenene kadar butonu devre dışı bırak

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
                    if (mesajElement) mesajElement.innerHTML = '';
                    if (submitButton) submitButton.disabled = false; // Veri yüklendi, butonu aktif et
                } else {
                    if (mesajElement) mesajElement.innerHTML = '<span class="error">Ürün bulunamadı! ID geçersiz olabilir.</span>';
                    // submitButton zaten true, tekrar disable etmeye gerek yok
                }
            })
            .catch((error) => {
                console.error("Ürün bilgilerini yükleme hatası: ", error);
                if (mesajElement) mesajElement.innerHTML = `<span class="error">Ürün bilgileri yüklenemedi! Hata: ${error.message}</span>`;
                // submitButton zaten true, tekrar disable etmeye gerek yok
            });

        // Düzenlenmiş ürünü kaydetmek için form submit listener'ı
        urunDuzenleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const form = e.target;

            const isim = form.isim.value.trim();
            const fiyat = parseFloat(form.fiyat.value);
            const stok = parseInt(form.stok.value, 10);

            if (mesajElement) mesajElement.innerHTML = ''; // Önceki mesajları temizle

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
                barkod: form.barkod.value.trim(),
                modelKodu: form.modelKodu.value.trim(),
                stokKodu: form.stokKodu.value.trim(),
                beden: form.beden.value.trim(),
                renk: form.renk.value.trim(),
                resim: form.resim.value.trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp() // Güncellenme zamanı
            };

            if (submitButton) submitButton.disabled = true;
            if (mesajElement) mesajElement.innerHTML = 'Güncelleniyor...';

            db.collection("producks").doc(produckId).update(updatedData)
                .then(() => {
                    console.log("Ürün başarıyla güncellendi! ID:", produckId);
                    if (mesajElement) mesajElement.innerHTML = '<span class="success">Ürün başarıyla güncellendi! Ürünler sayfasına yönlendiriliyor...</span>';
                    setTimeout(() => {
                        window.location.href = 'producks.html'; // Ürünler listeleme sayfasının adı
                    }, 2000);
                })
                .catch((error) => {
                    console.error("Firebase'e ürün güncelleme hatası: ", error);
                    if (mesajElement) mesajElement.innerHTML = `<span class="error">Ürün güncellenirken bir hata oluştu! ${error.message}</span>`;
                    if (submitButton) submitButton.disabled = false; // Hata durumunda butonu tekrar aktif et
                });
        });
    }
});