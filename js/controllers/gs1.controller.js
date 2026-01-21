/**
 * BarGen GS1 Pack Controller
 *
 * @description Handles GS1 code generation and carousel rotation
 * @module Controllers.GS1
 *
 * @example
 * // Add items to carousel
 * BarGen.Controllers.GS1.addItems();
 *
 * // Start rotation
 * BarGen.Controllers.GS1.startRotation();
 */
(function(global) {
    'use strict';

    // Initialize namespace
    global.BarGen = global.BarGen || {};
    global.BarGen.Controllers = global.BarGen.Controllers || {};

    var Utils = global.BarGen.Utils;
    var State = global.BarGen.State;
    var Storage = global.BarGen.Storage;
    var UI = global.BarGen.UI;
    var Generators = global.BarGen.Generators;

    /**
     * Add items to GS1 carousel
     *
     * @description Generates GS1 codes based on form inputs and adds to folder
     */
    function addItems() {
        var folderName = Utils.$('gs1FolderName').value.trim();
        var goodsIdRaw = Utils.$('gs1GoodsIds').value.trim();
        var variations = parseInt(Utils.$('gs1Variations').value) || 10;

        // Get product type
        var typeEl = document.querySelector('input[name="gs1Type"]:checked');
        var productType = typeEl ? typeEl.value : 'piece';

        // Parse GoodsId list
        var goodsIdList = goodsIdRaw.split('\n')
            .map(function(l) { return l.trim().replace(/\D/g, ''); })
            .filter(function(c) { return c.length > 0 && c.length <= 8; });

        if (goodsIdList.length === 0) {
            alert('Введите хотя бы один GoodsId (1-8 цифр)!');
            return;
        }

        // Get quantity/weight mode based on product type
        var qtyMode;
        if (productType === 'piece') {
            var pieceModeEl = document.querySelector('input[name="gs1PieceMode"]:checked');
            qtyMode = pieceModeEl ? pieceModeEl.value : 'random';
        } else {
            var weightModeEl = document.querySelector('input[name="gs1WeightMode"]:checked');
            qtyMode = weightModeEl ? weightModeEl.value : 'random';
        }

        // Get discount settings
        var discModeEl = document.querySelector('input[name="gs1DiscountMode"]:checked');
        var discMode = discModeEl ? discModeEl.value : 'fixed';
        var fixedDisc = parseInt(Utils.$('gs1Discount').value) || 0;
        var discMin = parseInt(Utils.$('gs1DiscMin').value) || 0;
        var discMax = parseInt(Utils.$('gs1DiscMax').value) || 30;

        if (discMin > discMax) {
            var tmp = discMin;
            discMin = discMax;
            discMax = tmp;
        }

        // Get quantity/weight settings
        var qtyMin, qtyMax, fixedQty, weightMin, weightMax, fixedWeight;

        if (productType === 'piece') {
            if (qtyMode === 'fixed') {
                fixedQty = parseFloat(Utils.$('gs1FixedQuantity').value) || 50;
            } else {
                qtyMin = parseFloat(Utils.$('gs1QuantityMin').value) || 1;
                qtyMax = parseFloat(Utils.$('gs1QuantityMax').value) || 100;
                
                if (qtyMin >= qtyMax) {
                    alert('Мин. количество должно быть меньше макс.!');
                    return;
                }
            }
        } else {
            if (qtyMode === 'fixed') {
                fixedWeight = parseInt(Utils.$('gs1FixedWeight').value) || 500;
            } else {
                weightMin = parseInt(Utils.$('gs1WeightMin').value) || 100;
                weightMax = parseInt(Utils.$('gs1WeightMax').value) || 5000;
                
                if (weightMin >= weightMax) {
                    alert('Мин. вес должен быть меньше макс.!');
                    return;
                }
            }
        }

        // Generate items
        var items = [];
        var baseId = Date.now();

        goodsIdList.forEach(function(goodsId, gIdx) {
            for (var i = 0; i < variations; i++) {
                var discount = discMode === 'fixed' ? fixedDisc : Utils.randomWeight(discMin, discMax);
                var params = {
                    goodsId: goodsId,
                    type: productType,
                    discount: discount
                };

                if (productType === 'piece') {
                    var quantity = qtyMode === 'fixed' ? fixedQty : 
                        (qtyMin + Math.random() * (qtyMax - qtyMin));
                    // Round to 2 decimal places
                    quantity = Math.round(quantity * 100) / 100;
                    params.quantity = quantity;
                } else {
                    var weight = qtyMode === 'fixed' ? fixedWeight : 
                        Utils.randomWeight(weightMin, weightMax);
                    params.weight = weight;
                }

                try {
                    var code = Generators.generateGS1Code(params);
                    
                    items.push({
                        id: baseId + '_' + gIdx + '_' + i,
                        code: code,
                        goodsId: goodsId,
                        type: productType,
                        quantity: params.quantity,
                        weight: params.weight,
                        discount: discount,
                        uniqueId: discount > 0 ? (params.uniqueId || Generators.generateUniqueId()) : null,
                        decimalPosition: productType === 'piece' && params.quantity ? 
                            Generators.calculateDecimalPosition(params.quantity) : 0,
                        active: true
                    });
                } catch (e) {
                    console.error('[GS1] Error generating code:', e);
                }
            }
        });

        if (items.length === 0) {
            alert('Не удалось сгенерировать коды!');
            return;
        }

        // Find or create folder
        var folder;

        if (folderName) {
            folder = State.gs1.folders.find(function(f) {
                return f.name.toLowerCase() === folderName.toLowerCase();
            });

            if (!folder) {
                folder = {
                    id: baseId + '_f',
                    name: folderName,
                    items: []
                };
                State.gs1.folders.push(folder);
            }
        } else if (State.gs1.selectedFolderId) {
            folder = State.getGs1Folder();
        } else {
            // Create default folder name
            var defaultName = 'GS1 ' + (productType === 'piece' ? 'Штучн' : 'Весов') + 
                ' ' + goodsIdList[0];
            folder = {
                id: baseId + '_f',
                name: defaultName,
                items: []
            };
            State.gs1.folders.push(folder);
        }

        // Add items to folder
        folder.items = folder.items.concat(items);
        State.gs1.selectedFolderId = folder.id;

        Storage.save();
        UI.renderGs1Folders();
        UI.renderGs1Items();

        // Clear form
        Utils.$('gs1FolderName').value = '';
        Utils.$('gs1GoodsIds').value = '';

        alert('Добавлено ' + items.length + ' кодов');
    }

    /**
     * Start code rotation
     */
    function startRotation() {
        var folder = State.getGs1Folder();

        if (!folder) {
            alert('Выберите папку!');
            return;
        }

        var active = folder.items.filter(function(x) { return x.active; });

        if (active.length === 0) {
            alert('Выберите коды для ротации!');
            return;
        }

        State.gs1.rotationItems = active;
        State.gs1.rotationIndex = 0;
        State.gs1.isRotating = true;

        // Update UI
        Utils.$('gs1-start-btn').style.display = 'none';
        Utils.$('gs1-stop-btn').style.display = 'inline-flex';
        Utils.$('gs1CarouselDisplay').style.display = 'block';

        UI.updateGs1Status();
        displayCode();
        startTimer();

        // Scroll to carousel
        setTimeout(function() {
            Utils.scrollToElement(Utils.$('gs1CarouselDisplay'), 100);
        }, 100);
    }

    /**
     * Stop rotation
     */
    function stopRotation() {
        State.gs1.isRotating = false;
        stopTimer();

        Utils.$('gs1-start-btn').style.display = 'inline-flex';
        Utils.$('gs1-stop-btn').style.display = 'none';

        // Stop animation, keep code static
        var wrapper = document.querySelector('.gs1-qr-wrapper');
        if (wrapper) {
            wrapper.classList.remove('qr-pulse', 'qr-slide');
            wrapper.classList.add('qr-static');
        }

        UI.updateGs1Status();
    }

    /**
     * Display code with animation (auto-rotation)
     */
    function displayCode() {
        var items = State.gs1.rotationItems;
        if (items.length === 0) return;

        var item = items[State.gs1.rotationIndex % items.length];

        // Update info display
        var infoText = '<b>GoodsId:</b> ' + item.goodsId + ' | ';
        if (item.type === 'piece') {
            infoText += '<b>Кол-во:</b> ' + item.quantity + ' шт';
        } else {
            infoText += '<b>Вес:</b> ' + Utils.formatWeight(item.weight);
        }
        if (item.discount > 0) {
            infoText += ' | <b>Скидка:</b> ' + item.discount + '%';
        }

        Utils.$('gs1CodeInfo').innerHTML = infoText;
        Utils.$('gs1CodeText').textContent = item.code;
        Utils.$('gs1CarouselCounter').textContent =
            ((State.gs1.rotationIndex % items.length) + 1) + '/' + items.length;

        // Render QR code
        var qrContainer = Utils.$('gs1QRContainer');
        Generators.renderGS1QR(qrContainer, item.code);

        // Animation
        var wrapper = document.querySelector('.gs1-qr-wrapper');
        if (wrapper) {
            wrapper.classList.remove('qr-pulse', 'qr-static', 'qr-slide');
            void wrapper.offsetWidth; // Force reflow
            wrapper.classList.add('qr-pulse');
        }

        State.gs1.rotationIndex++;

        // Add to history
        State.addToHistory({ type: 'GS1', code: item.code });
    }

    /**
     * Display code with slide animation (manual navigation)
     */
    function displayCodeManual() {
        var items = State.gs1.rotationItems;
        if (items.length === 0) return;

        var item = items[State.gs1.rotationIndex % items.length];

        var infoText = '<b>GoodsId:</b> ' + item.goodsId + ' | ';
        if (item.type === 'piece') {
            infoText += '<b>Кол-во:</b> ' + item.quantity + ' шт';
        } else {
            infoText += '<b>Вес:</b> ' + Utils.formatWeight(item.weight);
        }
        if (item.discount > 0) {
            infoText += ' | <b>Скидка:</b> ' + item.discount + '%';
        }

        Utils.$('gs1CodeInfo').innerHTML = infoText;
        Utils.$('gs1CodeText').textContent = item.code;
        Utils.$('gs1CarouselCounter').textContent =
            ((State.gs1.rotationIndex % items.length) + 1) + '/' + items.length;

        var qrContainer = Utils.$('gs1QRContainer');
        Generators.renderGS1QR(qrContainer, item.code);

        // Simple slide animation for manual nav
        var wrapper = document.querySelector('.gs1-qr-wrapper');
        if (wrapper) {
            wrapper.classList.remove('qr-pulse', 'qr-static', 'qr-slide');
            void wrapper.offsetWidth;
            wrapper.classList.add('qr-slide');
        }

        State.gs1.rotationIndex++;
    }

    /**
     * Manual navigation: next
     */
    function manualNext() {
        if (State.gs1.rotationItems.length > 0) {
            displayCodeManual();
        }
    }

    /**
     * Manual navigation: previous
     */
    function manualPrev() {
        if (State.gs1.rotationItems.length > 0) {
            var len = State.gs1.rotationItems.length;
            State.gs1.rotationIndex = (State.gs1.rotationIndex - 2 + len) % len;
            if (State.gs1.rotationIndex < 0) {
                State.gs1.rotationIndex = len - 1;
            }
            displayCodeManual();
        }
    }

    /**
     * Start automatic timer
     */
    function startTimer() {
        stopTimer();

        State.gs1.remaining = State.gs1.timerValue;

        State.gs1.timerInterval = window.setInterval(function() {
            State.gs1.remaining -= 0.1;

            if (State.gs1.remaining <= 0.05) {
                displayCode();
                State.gs1.remaining = State.gs1.timerValue;
            }
        }, 100);
    }

    /**
     * Stop automatic timer
     */
    function stopTimer() {
        if (State.gs1.timerInterval) {
            window.clearInterval(State.gs1.timerInterval);
            State.gs1.timerInterval = null;
        }
    }

    /**
     * Set timer interval
     *
     * @param {number} value - Interval in seconds
     */
    function setInterval(value) {
        if (isNaN(value) || value <= 0) return;

        State.gs1.timerValue = value;

        if (State.gs1.isRotating) {
            startTimer();
        }
    }

    /**
     * Select all items in current folder
     */
    function selectAll() {
        var folder = State.getGs1Folder();
        if (folder) {
            folder.items.forEach(function(item) { item.active = true; });
            Storage.save();
            UI.renderGs1Items();
        }
    }

    /**
     * Deselect all items in current folder
     */
    function deselectAll() {
        var folder = State.getGs1Folder();
        if (folder) {
            folder.items.forEach(function(item) { item.active = false; });
            Storage.save();
            UI.renderGs1Items();
        }
    }

    /**
     * Delete selected items from current folder
     */
    function clearSelected() {
        var folder = State.getGs1Folder();
        if (folder && confirm('Удалить выбранные коды?')) {
            folder.items = folder.items.filter(function(x) { return !x.active; });
            Storage.save();
            UI.renderGs1Items();
        }
    }

    /**
     * Delete current folder
     */
    function deleteFolder() {
        var folder = State.getGs1Folder();
        if (folder && confirm('Удалить папку "' + folder.name + '"?')) {
            State.gs1.folders = State.gs1.folders.filter(function(x) {
                return x.id !== folder.id;
            });
            State.gs1.selectedFolderId = null;
            Storage.save();
            UI.renderGs1Folders();
            UI.renderGs1Items();
            stopRotation();
        }
    }

    /**
     * Rename current folder
     */
    function renameFolder() {
        var folder = State.getGs1Folder();
        if (folder) {
            var newName = prompt('Новое имя папки:', folder.name);
            if (newName && newName.trim()) {
                folder.name = newName.trim();
                Storage.save();
                UI.renderGs1Folders();
            }
        }
    }

    // Export to namespace
    global.BarGen.Controllers.GS1 = {
        addItems: addItems,
        startRotation: startRotation,
        stopRotation: stopRotation,
        displayCode: displayCode,
        displayCodeManual: displayCodeManual,
        manualNext: manualNext,
        manualPrev: manualPrev,
        startTimer: startTimer,
        stopTimer: stopTimer,
        setInterval: setInterval,
        selectAll: selectAll,
        deselectAll: deselectAll,
        clearSelected: clearSelected,
        deleteFolder: deleteFolder,
        renameFolder: renameFolder
    };

})(window);
