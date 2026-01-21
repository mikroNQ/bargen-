/**
 * BarGen Main Entry Point
 *
 * @description Application initialization and event binding
 * @module Main
 *
 * @requires js/app/config.js
 * @requires js/app/utils.js
 * @requires js/app/state.js
 * @requires js/app/storage.js
 * @requires js/generators/generators.js
 * @requires js/ui/ui.js
 * @requires js/controllers/*.js
 */
(function(global) {
    'use strict';

    var BarGen = global.BarGen;
    var Utils = BarGen.Utils;
    var State = BarGen.State;
    var Storage = BarGen.Storage;
    var UI = BarGen.UI;
    var Controllers = BarGen.Controllers;

    /**
     * Wait for bwip-js library to load
     *
     * @param {Function} callback - Callback to execute when library is ready
     */
    function waitForBwipJs(callback) {
        var maxAttempts = 50; // 5 seconds max
        var attempts = 0;
        
        var checkInterval = setInterval(function() {
            attempts++;
            
            if (typeof global.bwipjs !== 'undefined' && global.bwipjs.toCanvas) {
                clearInterval(checkInterval);
                console.log('[BarGen] bwip-js loaded successfully');
                callback();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.error('[BarGen] bwip-js failed to load');
                callback(); // Try anyway
            }
        }, 100);
    }

    /**
     * Initialize application
     *
     * @description Main initialization function:
     * 1. Load stored data
     * 2. Bind all event handlers
     * 3. Render initial UI
     * 4. Start DataMatrix timer
     */
    function init() {
        console.log('[BarGen v' + BarGen.Config.VERSION + '] Initializing...');

        // Load stored data
        Storage.load();

        // Bind events
        bindTabEvents();
        bindDataMatrixEvents();
        bindLibraryEvents();
        bindBarcodeEvents();
        bindWeightCarouselEvents();
        bindSimpleGenEvents();
        bindGs1Events();
        bindGlobalEvents();

        // Render initial UI
        UI.renderDmFolders();
        UI.renderDmItems();
        UI.renderBarcodeFields();
        UI.renderWcFolders();
        UI.renderWcItems();
        UI.renderSgFolders();
        UI.renderGs1Folders();
        UI.renderGs1Items();
        UI.renderHistory();

        // Start DataMatrix with library check
        waitForBwipJs(function() {
            Controllers.DM.generateAndDisplay();
            Controllers.DM.startTimer();
        });

        console.log('[BarGen v' + BarGen.Config.VERSION + '] Ready');
    }

    /**
     * Bind tab navigation events
     */
    function bindTabEvents() {
        Utils.$$$('.tab-btn[data-tab]').forEach(function(btn) {
            btn.onclick = function() {
                Controllers.Tab.switchTo(btn.dataset.tab);
            };
        });
    }

    /**
     * Bind DataMatrix tab events
     */
    function bindDataMatrixEvents() {
        // Navigation
        Utils.on(Utils.$('dm-prev-btn'), 'click', function() {
            Controllers.DM.manualPrev();
        });

        Utils.on(Utils.$('dm-next-btn'), 'click', function() {
            Controllers.DM.manualNext();
        });

        // Play/Pause
        Utils.on(Utils.$('dm-pause-btn'), 'click', function() {
            Controllers.DM.stopTimer();
        });

        Utils.on(Utils.$('dm-play-btn'), 'click', function() {
            Controllers.DM.startTimer();
        });

        Utils.on(Utils.$('refresh-btn'), 'click', function() {
            Controllers.DM.generateAndDisplay();
            Controllers.DM.startTimer();
        });

        // Interval buttons
        Utils.$$$('.interval-btn').forEach(function(btn) {
            btn.onclick = function() {
                Utils.$('dm-custom-interval').value = btn.dataset.interval;
                Controllers.DM.setInterval(parseFloat(btn.dataset.interval));

                Utils.$$$('.interval-btn').forEach(function(b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            };
        });

        Utils.on(Utils.$('dm-custom-interval'), 'change', function(e) {
            Controllers.DM.setInterval(parseFloat(e.target.value));
        });

        // Template selection
        Utils.$$$('.tmpl-btn').forEach(function(btn) {
            btn.onclick = function() {
                Utils.$$$('.tmpl-btn').forEach(function(b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                State.dm.selectedTemplate = btn.dataset.template;
            };
        });

        // Double scan checkboxes - ensure only one is selected at a time
        ['doubleScanSameDM', 'doubleScanDmEan', 'doubleScanSameEan', 'doubleScanDifferentDM'].forEach(function(id) {
            var checkbox = Utils.$(id);
            if (checkbox) {
                checkbox.onchange = function() {
                    if (this.checked) {
                        // Uncheck other checkboxes
                        ['doubleScanSameDM', 'doubleScanDmEan', 'doubleScanSameEan', 'doubleScanDifferentDM']
                            .filter(function(otherId) { return otherId !== id; })
                            .forEach(function(otherId) {
                                var otherCheckbox = Utils.$(otherId);
                                if (otherCheckbox) otherCheckbox.checked = false;
                            });
                    }
                    // Regenerate display
                    Controllers.DM.generateAndDisplay();
                };
            }
        });
    }

    /**
     * Bind Library tab events
     */
    function bindLibraryEvents() {
        // Add barcodes
        Utils.on(Utils.$('add-btn'), 'click', function() {
            Controllers.Library.addBarcodes();
        });

        Utils.on(Utils.$('clear-input-btn'), 'click', function() {
            Utils.$('barcode-input').value = '';
        });

        Utils.on(Utils.$('dmFolderModeBtn'), 'click', function() {
            Controllers.Library.toggleFolderMode();
        });

        // Bulk actions
        Utils.on(Utils.$('select-all-btn'), 'click', function() {
            Controllers.Library.selectAll();
        });

        Utils.on(Utils.$('deselect-all-btn'), 'click', function() {
            Controllers.Library.deselectAll();
        });

        Utils.on(Utils.$('clear-all-btn'), 'click', function() {
            Controllers.Library.clearSelected();
        });

        // Folder actions
        Utils.on(Utils.$('dm-run-folder'), 'click', function() {
            if (State.getDmFolder()) {
                Controllers.DM.startRotation();
            } else {
                alert('Выберите папку');
            }
        });

        Utils.on(Utils.$('dm-rename-folder'), 'click', function() {
            Controllers.Library.renameFolder();
        });

        Utils.on(Utils.$('dm-delete-folder'), 'click', function() {
            Controllers.Library.deleteFolder();
        });

        // Rotation controls
        Utils.on(Utils.$('start-btn'), 'click', function() {
            Controllers.DM.startRotation();
        });

        Utils.on(Utils.$('stop-btn'), 'click', function() {
            Controllers.DM.stopRotation();
        });

        // Backup
        Utils.on(Utils.$('exportDataBtn'), 'click', function() {
            Storage.exportData();
        });

        Utils.on(Utils.$('importDataBtn'), 'click', function() {
            Utils.$('importFile').click();
        });

        Utils.on(Utils.$('importFile'), 'change', function(e) {
            if (e.target.files[0]) {
                Storage.importData(e.target.files[0]);
            }
            e.target.value = '';
        });

        // History
        Utils.on(Utils.$('clearHistoryBtn'), 'click', function() {
            if (confirm('Очистить историю?')) {
                State.clearHistory();
            }
        });
    }

    /**
     * Bind Barcode tab events
     */
    function bindBarcodeEvents() {
        Utils.on(Utils.$('barcodeType'), 'change', function() {
            UI.renderBarcodeFields();
        });

        Utils.on(Utils.$('generateBarcodeBtn'), 'click', function() {
            Controllers.Barcode.generate();
        });
    }

    /**
     * Bind Weight Carousel tab events
     */
    function bindWeightCarouselEvents() {
        Utils.on(Utils.$('wcAddToCarousel'), 'click', function() {
            Controllers.WC.addItems();
        });

        // Bulk actions
        Utils.on(Utils.$('wc-select-all'), 'click', function() {
            Controllers.WC.selectAll();
        });

        Utils.on(Utils.$('wc-deselect-all'), 'click', function() {
            Controllers.WC.deselectAll();
        });

        Utils.on(Utils.$('wc-clear-selected'), 'click', function() {
            Controllers.WC.clearSelected();
        });

        // Rotation
        Utils.on(Utils.$('wc-start-btn'), 'click', function() {
            Controllers.WC.startRotation();
        });

        Utils.on(Utils.$('wc-stop-btn'), 'click', function() {
            Controllers.WC.stopRotation();
        });

        Utils.on(Utils.$('wc-run-folder'), 'click', function() {
            if (State.getWcFolder()) {
                Controllers.WC.startRotation();
            } else {
                alert('Выберите папку');
            }
        });

        // Folder actions
        Utils.on(Utils.$('wc-rename-folder'), 'click', function() {
            Controllers.WC.renameFolder();
        });

        Utils.on(Utils.$('wc-delete-folder'), 'click', function() {
            Controllers.WC.deleteFolder();
        });

        // Navigation
        Utils.on(Utils.$('wcPrevBtn'), 'click', function() {
            Controllers.WC.manualPrev();
        });

        Utils.on(Utils.$('wcNextBtn'), 'click', function() {
            Controllers.WC.manualNext();
        });

        // Interval buttons
        Utils.$$$('.wc-interval-btn').forEach(function(btn) {
            btn.onclick = function() {
                Utils.$('wc-custom-interval').value = btn.dataset.interval;
                Controllers.WC.setInterval(parseFloat(btn.dataset.interval));

                Utils.$$$('.wc-interval-btn').forEach(function(b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            };
        });

        Utils.on(Utils.$('wc-custom-interval'), 'change', function(e) {
            Controllers.WC.setInterval(parseFloat(e.target.value));
        });

        // Weight mode toggle
        Utils.$$$('input[name="weightMode"]').forEach(function(radio) {
            radio.onchange = function() {
                var modeEl = document.querySelector('input[name="weightMode"]:checked');
                var mode = modeEl ? modeEl.value : 'random';

                Utils.$('group-random-weight').classList.toggle('d-none', mode === 'fixed');
                Utils.$('group-fixed-weight').classList.toggle('d-none', mode !== 'fixed');
                Utils.$('wcVariationsLabel').textContent = mode === 'fixed' ? 'Повторов' : 'Вариаций';
                Utils.$('wcVariationsHint').textContent = mode === 'fixed' ? 'Повторов на PLU' : 'Весов на PLU';
            };
        });

        // Discount mode toggle
        Utils.$$$('input[name="discountMode"]').forEach(function(radio) {
            radio.onchange = function() {
                var modeEl = document.querySelector('input[name="discountMode"]:checked');
                var mode = modeEl ? modeEl.value : 'fixed';

                Utils.$('disc-fixed-group').classList.toggle('d-none', mode !== 'fixed');
                Utils.$('disc-random-group').classList.toggle('d-none', mode === 'fixed');
            };
        });

        // Prefix 49 discount section toggle
        Utils.on(Utils.$('wcPrefix49'), 'change', function() {
            Utils.$('group-discount-section').classList.toggle('d-none', !Utils.$('wcPrefix49').checked);
        });
    }

    /**
     * Bind Simple Generator tab events
     */
    function bindSimpleGenEvents() {
        Utils.on(Utils.$('sgValue'), 'input', function() {
            Controllers.SG.updatePreview();
        });

        Utils.on(Utils.$('sgType'), 'change', function() {
            Controllers.SG.updatePreview();
        });

        Utils.on(Utils.$('sgAddBtn'), 'click', function() {
            Controllers.SG.save();
        });

        Utils.on(Utils.$('sgFolderModeBtn'), 'click', function() {
            Controllers.SG.toggleFolderMode();
        });

        // Carousel
        Utils.on(Utils.$('sgBackBtn'), 'click', function() {
            Controllers.SG.closeFolder();
        });

        Utils.on(Utils.$('sgNextBtn'), 'click', function() {
            Controllers.SG.next();
        });

        Utils.on(Utils.$('sgPrevBtn'), 'click', function() {
            Controllers.SG.prev();
        });

        // Folder actions
        Utils.on(Utils.$('sgRenameFolderBtn'), 'click', function() {
            Controllers.SG.renameFolder();
        });

        Utils.on(Utils.$('sgDeleteFolderBtn'), 'click', function() {
            Controllers.SG.deleteFolder();
        });

        Utils.on(Utils.$('sgDeleteItemBtn'), 'click', function() {
            Controllers.SG.deleteItem();
        });

        // Item editing
        Utils.on(Utils.$('sgEditNameBtn'), 'click', function() {
            Controllers.SG.renameItem();
        });

        Utils.on(Utils.$('sgEditCodeBtn'), 'click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            Controllers.SG.editItemCode();
        });
    }

    /**
     * Bind GS1 Pack tab events
     */
    function bindGs1Events() {
        // Add items
        Utils.on(Utils.$('gs1AddItems'), 'click', function() {
            Controllers.GS1.addItems();
        });

        // Folder management
        Utils.on(Utils.$('gs1-run-folder'), 'click', function() {
            Controllers.GS1.startRotation();
        });

        Utils.on(Utils.$('gs1-rename-folder'), 'click', function() {
            Controllers.GS1.renameFolder();
        });

        Utils.on(Utils.$('gs1-delete-folder'), 'click', function() {
            Controllers.GS1.deleteFolder();
        });

        // Rotation controls
        Utils.on(Utils.$('gs1-start-btn'), 'click', function() {
            Controllers.GS1.startRotation();
        });

        Utils.on(Utils.$('gs1-stop-btn'), 'click', function() {
            Controllers.GS1.stopRotation();
        });

        // Navigation
        Utils.on(Utils.$('gs1PrevBtn'), 'click', function() {
            Controllers.GS1.manualPrev();
        });

        Utils.on(Utils.$('gs1NextBtn'), 'click', function() {
            Controllers.GS1.manualNext();
        });

        // Bulk actions
        Utils.on(Utils.$('gs1-select-all'), 'click', function() {
            Controllers.GS1.selectAll();
        });

        Utils.on(Utils.$('gs1-deselect-all'), 'click', function() {
            Controllers.GS1.deselectAll();
        });

        Utils.on(Utils.$('gs1-clear-selected'), 'click', function() {
            Controllers.GS1.clearSelected();
        });

        // Interval buttons
        Utils.$$$('.gs1-interval-btn').forEach(function(btn) {
            btn.onclick = function() {
                Utils.$('gs1-custom-interval').value = btn.dataset.interval;
                Controllers.GS1.setInterval(parseFloat(btn.dataset.interval));

                Utils.$$$('.gs1-interval-btn').forEach(function(b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            };
        });

        Utils.on(Utils.$('gs1-custom-interval'), 'change', function(e) {
            Controllers.GS1.setInterval(parseFloat(e.target.value));
        });

        // Product type toggle
        Utils.$$$('input[name="gs1Type"]').forEach(function(radio) {
            radio.onchange = function() {
                var typeEl = document.querySelector('input[name="gs1Type"]:checked');
                var type = typeEl ? typeEl.value : 'piece';

                // Toggle piece/weight sections
                if (type === 'piece') {
                    Utils.$('gs1-piece-section').classList.remove('d-none');
                    Utils.$('gs1-weight-section').classList.add('d-none');
                } else {
                    Utils.$('gs1-piece-section').classList.add('d-none');
                    Utils.$('gs1-weight-section').classList.remove('d-none');
                }
            };
        });

        // Piece mode toggle (Random/Fixed for piece products)
        Utils.$$$('input[name="gs1PieceMode"]').forEach(function(radio) {
            radio.onchange = function() {
                var modeEl = document.querySelector('input[name="gs1PieceMode"]:checked');
                var mode = modeEl ? modeEl.value : 'random';

                Utils.$('gs1-random-quantity').classList.toggle('d-none', mode === 'fixed');
                Utils.$('gs1-fixed-quantity').classList.toggle('d-none', mode !== 'fixed');
            };
        });

        // Weight mode toggle (Random/Fixed for weight products)
        Utils.$$$('input[name="gs1WeightMode"]').forEach(function(radio) {
            radio.onchange = function() {
                var modeEl = document.querySelector('input[name="gs1WeightMode"]:checked');
                var mode = modeEl ? modeEl.value : 'random';

                Utils.$('gs1-random-weight').classList.toggle('d-none', mode === 'fixed');
                Utils.$('gs1-fixed-weight').classList.toggle('d-none', mode !== 'fixed');
            };
        });

        // Discount mode toggle
        Utils.$$$('input[name="gs1DiscountMode"]').forEach(function(radio) {
            radio.onchange = function() {
                var modeEl = document.querySelector('input[name="gs1DiscountMode"]:checked');
                var mode = modeEl ? modeEl.value : 'fixed';

                Utils.$('gs1-disc-fixed-group').classList.toggle('d-none', mode !== 'fixed');
                Utils.$('gs1-disc-random-group').classList.toggle('d-none', mode === 'fixed');
            };
        });
    }

    /**
     * Bind global events (keyboard, visibility)
     */
    function bindGlobalEvents() {
        // Keyboard navigation
        document.onkeydown = function(e) {
            // DataMatrix - arrows when timer stopped
            var dmTab = Utils.$('tab-datamatrix');
            if (dmTab && dmTab.classList.contains('active') && !State.dm.timerInterval) {
                if (e.key === 'ArrowLeft') Controllers.DM.manualPrev();
                if (e.key === 'ArrowRight') Controllers.DM.manualNext();
            }

            // Weight Carousel - arrows when items present
            var wcTab = Utils.$('tab-weightcarousel');
            if (wcTab && wcTab.classList.contains('active') && State.wc.rotationItems.length > 0) {
                if (e.key === 'ArrowLeft') Controllers.WC.manualPrev();
                if (e.key === 'ArrowRight') Controllers.WC.manualNext();
            }

        // SimpleGen - arrows when folder open
        var sgTab = Utils.$('tab-simplegen');
        var sgCarousel = Utils.$('sg-view-carousel');
        if (sgTab && sgTab.classList.contains('active') && sgCarousel && sgCarousel.style.display !== 'none') {
            if (e.key === 'ArrowLeft') Controllers.SG.prev();
            if (e.key === 'ArrowRight') Controllers.SG.next();
        }

        // GS1 Pack - arrows when rotation active or stopped
        var gs1Tab = Utils.$('tab-gs1pack');
        if (gs1Tab && gs1Tab.classList.contains('active') && State.gs1.rotationItems.length > 0) {
            if (e.key === 'ArrowLeft') Controllers.GS1.manualPrev();
            if (e.key === 'ArrowRight') Controllers.GS1.manualNext();
        }
    };

        // Page visibility - pause/resume timers
        document.onvisibilitychange = function() {
            if (document.hidden) {
                Controllers.DM.stopTimer();
                Controllers.WC.stopTimer();
            } else {
                if (Controllers.Tab.current === 'datamatrix') {
                    Controllers.DM.generateAndDisplay();
                    Controllers.DM.startTimer();
                }
                if (State.wc.isRotating) {
                    Controllers.WC.displayBarcode();
                    Controllers.WC.startTimer();
                }
            }
        };
    }

    // Start application when DOM is ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 50);
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

})(window);
