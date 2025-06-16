/* 16.06.2025 (18:20) */
document.addEventListener('DOMContentLoaded', () => {
    // Firebase Firestore referansını burada tanımlayın
    // Bu, HTML dosyalarında Firebase SDK'ları ve firebaseConfig yüklendikten sonra
    // global `firebase` objesinin mevcut olduğu varsayımına dayanır.
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


    // === ÜRÜNLER LİSTELEME, FİLTRELEME, SIRALAMA VE SİLME BÖLÜMÜ ===
    const producksTableBody = document.querySelector('#producks-table tbody');
    const searchInput = document.getElementById('searchInput');
    const sortOptions = document.getElementById('sortOptions');
    const noResultsMessage = document.getElementById('noResultsMessage');

    let allProducts = []; // Firestore'dan çekilen tüm ürünler
    let unsubscribeProducks = null; // Dinleyiciyi durdurmak için referans

    function renderProducksTable(productsToRender) {
        if (!producksTableBody) return;
        producksTableBody.innerHTML = ''; // Önce temizle

        if (productsToRender.length === 0) {
            if (noResultsMessage) noResultsMessage.style.display = 'block';
        } else {
            if (noResultsMessage) noResultsMessage.style.display = 'none';
        }

        productsToRender.forEach((produckData, index) => {
            const produck = produckData.data; // Asıl ürün verisi
            const produckId = produckData.id;  // Ürün ID'si
            const row = producksTableBody.insertRow();
            row.insertCell().textContent = index + 1;
            row.insertCell().textContent = produck.kategori || '-';
            row.insertCell().textContent = produck.isim || '-';
            row.insertCell().textContent = produck.fiyat !== undefined ? produck.fiyat.toLocaleString('tr-TR') + ' TL' : '-';
            row.insertCell().textContent = produck.stok !== undefined ? produck.stok : '-';
            row.insertCell().textContent = produck.barkod || '-';
            row.insertCell().textContent = produck.modelKodu || '-';
            row.insertCell().textContent = produck.stokKodu || '-';
            row.insertCell().textContent = produck.beden || '-';
            row.insertCell().textContent = produck.renk || '-';
            const actionsCell = row.insertCell();
            actionsCell.innerHTML = `
                <a href="ürün_düzenle.html?id=${produckId}" class="btn" style="padding:4px 10px;font-size:14px;">Düzenle</a>
                <button class="btn btn-danger sil-btn" data-id="${produckId}" style="padding:4px 10px;font-size:14px; margin-left: 5px;">Sil</button>
            `;
        });

        // Silme butonlarına event listener'ları yeniden ata
        producksTableBody.querySelectorAll('.sil-btn').forEach(button => {
            button.onclick = function() {
                const idToDelete = this.getAttribute('data-id');
                const productName = this.closest('tr').cells[2].textContent; // İsim hücresi (Kategori eklendiği için index 2)
                if (confirm(`'${productName}' isimli ürünü silmek istediğinize emin misiniz?`)) {
                    deleteProduck(idToDelete);
                }
            };
        });
    }

    function displayFilteredAndSortedProducts() {
        if (!producksTableBody) return; // Eğer tablo body yoksa (başka sayfadaysak) işlem yapma

        // Henüz ürün yoksa ve filtre/sıralama yoksa özel mesaj göster
        if (allProducts.length === 0 && (!searchInput || searchInput.value === '') && (!sortOptions || sortOptions.value === 'default')) {
            renderProducksTable([]); // Boş tabloyu render et (noResultsMessage'ı tetikleyebilir)
            if (producksTableBody && allProducts.length === 0 && (!searchInput || !searchInput.value)) {
                 producksTableBody.innerHTML = '<tr><td colspan="11">Henüz ürün eklenmemiş.</td></tr>';
                 if (noResultsMessage) noResultsMessage.style.display = 'none';
            }
            return;
        }

        let filteredProducts = [...allProducts];
        const searchTerm = (searchInput && searchInput.value) ? searchInput.value.toLowerCase().trim() : '';

        if (searchTerm) {
            filteredProducts = allProducts.filter(p => {
                const product = p.data;
                return (
                    (product.isim && product.isim.toLowerCase().includes(searchTerm)) ||
                    (product.kategori && product.kategori.toLowerCase().includes(searchTerm)) ||
                    (product.barkod && product.barkod.toLowerCase().includes(searchTerm)) ||
                    (product.modelKodu && product.modelKodu.toLowerCase().includes(searchTerm)) ||
                    (product.stokKodu && product.stokKodu.toLowerCase().includes(searchTerm)) ||
                    (product.beden && product.beden.toLowerCase().includes(searchTerm)) ||
                    (product.renk && product.renk.toLowerCase().includes(searchTerm))
                );
            });
        }

        const sortCriteria = (sortOptions && sortOptions.value) ? sortOptions.value : 'default';
        switch (sortCriteria) {
            case 'date-desc':
            default: // Varsayılan olarak createdAt'a göre tersten sırala
                filteredProducts.sort((a, b) => (b.data.createdAt?.seconds || 0) - (a.data.createdAt?.seconds || 0));
                break;
            case 'date-asc':
                filteredProducts.sort((a, b) => (a.data.createdAt?.seconds || 0) - (b.data.createdAt?.seconds || 0));
                break;
            case 'name-asc':
                filteredProducts.sort((a, b) => (a.data.isim || '').localeCompare(b.data.isim || ''));
                break;
            case 'name-desc':
                filteredProducts.sort((a, b) => (b.data.isim || '').localeCompare(a.data.isim || ''));
                break;
            case 'price-asc':
                filteredProducts.sort((a, b) => (parseFloat(a.data.fiyat) || 0) - (parseFloat(b.data.fiyat) || 0));
                break;
            case 'price-desc':
                filteredProducts.sort((a, b) => (parseFloat(b.data.fiyat) || 0) - (parseFloat(a.data.fiyat) || 0));
                break;
            case 'stock-asc':
                filteredProducts.sort((a, b) => (parseInt(a.data.stok) || 0) - (parseInt(b.data.stok) || 0));
                break;
            case 'stock-desc':
                filteredProducts.sort((a, b) => (parseInt(b.data.stok) || 0) - (parseInt(a.data.stok) || 0));
                break;
            case 'category-asc':
                filteredProducts.sort((a, b) => (a.data.kategori || '').localeCompare(b.data.kategori || ''));
                break;
            case 'category-desc':
                filteredProducts.sort((a, b) => (b.data.kategori || '').localeCompare(a.data.kategori || ''));
                break;
        }
        renderProducksTable(filteredProducts);
    }

    if (producksTableBody) { // Sadece ürünler sayfasındaysak bu işlemleri yap
        unsubscribeProducks = db.collection("producks")
                                .orderBy("createdAt", "desc") // Varsayılan sıralama
                                .onSnapshot((querySnapshot) => {
            console.log("Firestore'dan ürünler güncellendi. Toplam ürün:", querySnapshot.size);
            allProducts = querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
            displayFilteredAndSortedProducts(); // Filtreleme ve sıralamayı uygula
        }, (error) => {
            if (producksTableBody) producksTableBody.innerHTML = '<tr><td colspan="11">Ürünler yüklenemedi. Bir hata oluştu.</td></tr>';
            console.error("Ürünleri yükleme hatası: ", error);
            if (noResultsMessage) noResultsMessage.style.display = 'none';
        });

        if (searchInput) searchInput.addEventListener('input', displayFilteredAndSortedProducts);
        if (sortOptions) sortOptions.addEventListener('change', displayFilteredAndSortedProducts);

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
                // Tablo otomatik olarak onSnapshot ile güncellenecektir.
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
                createdAt: firebase.firestore.FieldValue.serverTimestamp() // Eklenme zamanı
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
            return; // ID yoksa formu işlemeye devam etme
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
                updatedAt: firebase.firestore.FieldValue.serverTimestamp() // Güncellenme zamanı
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
