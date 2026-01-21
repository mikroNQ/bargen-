/**
 * BarGen DataMatrix Controller
 *
 * @description Handles DataMatrix generation, timer, and carousel navigation
 * @module Controllers.DM
 *
 * @example
 * // Generate and display code
 * BarGen.Controllers.DM.generateAndDisplay();
 *
 * // Start rotation
 * BarGen.Controllers.DM.startRotation();
 */
(function(global) {
    'use strict';

    // Initialize namespace
    global.BarGen = global.BarGen || {};
    global.BarGen.Controllers = global.BarGen.Controllers || {};

    var Config = global.BarGen.Config;
    var Utils = global.BarGen.Utils;
    var State = global.BarGen.State;
    var UI = global.BarGen.UI;
    var Generators = global.BarGen.Generators;

    /**
     * Generate DataMatrix code and display it
     *
     * @description Main generation function. Uses rotation list if active,
     * otherwise generates demo codes.
     */
    function generateAndDisplay() {
        var dm = State.dm;
        var result, barcode;
        var secondaryResult = null;

        // Определить режим двойного сканирования
        var doubleScanMode = getActiveDoubleScanMode();

        if (dm.isRotating && dm.rotationList.length > 0) {
            // Rotation mode: use items from folder
            var item = dm.rotationList[dm.rotationIndex];
            barcode = item.barcode;
            result = Generators.generateDM(barcode, item.template);
            var currentRotationIdx = dm.rotationIndex;
            dm.rotationIndex = (dm.rotationIndex + 1) % dm.rotationList.length;
        } else {
            // Demo mode
            result = Generators.generateDM();
        }

        // Generate secondary code if double scan enabled
        if (doubleScanMode) {
            switch (doubleScanMode) {
                case 'sameDM':
                    secondaryResult = {
                        type: 'DM',
                        code: result.code,
                        barcode: barcode
                    };
                    break;
                case 'dmEan':
                    var ean13 = Generators.extractEAN13FromDM(result.code);
                    secondaryResult = {
                        type: 'EAN13',
                        code: ean13
                    };
                    break;
                case 'sameEan':
                    var ean13_1 = Generators.extractEAN13FromDM(result.code);
                    var ean13_2 = Generators.extractEAN13FromDM(result.code);
                    // Primary as EAN13
                    result.displayAsEan = true;
                    result.ean13Code = ean13_1;
                    // Secondary as EAN13
                    secondaryResult = {
                        type: 'EAN13',
                        code: ean13_2
                    };
                    break;
                case 'differentDM':
                    // Generate second DM with next GTIN
                    var nextBarcode = dm.isRotating ? 
                        dm.rotationList[(dm.rotationIndex) % dm.rotationList.length].barcode :
                        State.getNextDemoGtin();
                    var templateId = dm.isRotating ? 
                        dm.rotationList[(dm.rotationIndex - 1 + dm.rotationList.length) % dm.rotationList.length].template :
                        dm.selectedTemplate;
                    var result2 = Generators.generateDM(nextBarcode, templateId);
                    secondaryResult = {
                        type: 'DM',
                        code: result2.code,
                        barcode: nextBarcode
                    };
                    break;
            }
        }

        // Cache generated code (after secondary code generation)
        if (dm.isRotating && dm.rotationList.length > 0) {
            dm.generatedCodes.push({
                code: result.code,
                barcode: barcode,
                templateName: result.templateName,
                rotationIdx: currentRotationIdx,
                doubleScanMode: doubleScanMode,
                primaryDisplayAsEan: result.displayAsEan || false,
                secondaryCode: secondaryResult
            });
            dm.codeHistoryIndex = dm.generatedCodes.length - 1;

            showCodeInfo(barcode, result.templateName, currentRotationIdx + 1, dm.rotationList.length);
            updateBadge(true, dm.rotationList.length);
        } else {
            // Cache demo codes too
            dm.generatedCodes.push({
                code: result.code,
                barcode: result.barcode,
                templateName: result.templateName,
                rotationIdx: dm.generatedCodes.length,
                doubleScanMode: doubleScanMode,
                primaryDisplayAsEan: result.displayAsEan || false,
                secondaryCode: secondaryResult
            });
            dm.codeHistoryIndex = dm.generatedCodes.length - 1;

            showCodeInfo(result.barcode, result.templateName, dm.codeHistoryIndex + 1, Config.DEMO_GTINS.length);
            updateBadge(true, Config.DEMO_GTINS.length);
        }

        // Render codes
        renderPrimaryCode(result);
        if (secondaryResult) {
            renderSecondaryCode(secondaryResult);
            showSecondaryContainer();
        } else {
            hideSecondaryContainer();
        }

        // Update code text with flash animation
        updateCodeText(result.code, secondaryResult)
    }

    /**
     * Display code from cache by index
     *
     * @param {number} index - Cache index
     */
    function displayFromCache(index) {
        var dm = State.dm;

        if (index < 0 || index >= dm.generatedCodes.length) return;

        var cached = dm.generatedCodes[index];
        dm.codeHistoryIndex = index;

        // Restore primary code display
        var primaryResult = {
            code: cached.code,
            displayAsEan: cached.primaryDisplayAsEan,
            ean13Code: cached.primaryDisplayAsEan ? Generators.extractEAN13FromDM(cached.code) : null
        };
        renderPrimaryCode(primaryResult);

        // Restore secondary code if exists
        if (cached.doubleScanMode && cached.secondaryCode) {
            renderSecondaryCode(cached.secondaryCode);
            showSecondaryContainer();
        } else {
            hideSecondaryContainer();
        }

        // Update code text
        updateCodeText(cached.code, cached.secondaryCode)

        // Update info display
        var isRotationMode = dm.rotationList.length > 0;
        var displayIdx = cached.rotationIdx !== undefined ? cached.rotationIdx + 1 : index + 1;
        var total = isRotationMode ? dm.rotationList.length : Config.DEMO_GTINS.length;

        showCodeInfo(cached.barcode, cached.templateName, displayIdx, total);
        updateBadge(true, total);
    }

    /**
     * Start automatic timer for code rotation
     */
    function startTimer() {
        var dm = State.dm;

        stopTimer();

        // If viewing history, jump to end first
        if (dm.generatedCodes.length > 0 && dm.codeHistoryIndex < dm.generatedCodes.length - 1) {
            dm.codeHistoryIndex = dm.generatedCodes.length - 1;
            displayFromCache(dm.codeHistoryIndex);
        }

        dm.remaining = dm.timerValue;
        updateCountdown();
        togglePlayState(true);

        dm.timerInterval = window.setInterval(function() {
            dm.remaining -= 0.1;

            if (dm.remaining <= 0.05) {
                generateAndDisplay();
                dm.remaining = dm.timerValue;
            }

            updateCountdown();
        }, 100);
    }

    /**
     * Stop automatic timer
     */
    function stopTimer() {
        var dm = State.dm;

        if (dm.timerInterval) {
            window.clearInterval(dm.timerInterval);
            dm.timerInterval = null;
        }

        togglePlayState(false);
    }

    /**
     * Set timer interval
     *
     * @param {number} value - Interval in seconds
     */
    function setInterval(value) {
        if (isNaN(value) || value <= 0) return;

        State.dm.timerValue = value;
        State.dm.remaining = value;
        startTimer();
    }

    /**
     * Start rotation from selected folder
     */
    function startRotation() {
        var folder = State.getDmFolder();

        if (!folder) {
            alert('Выберите папку!');
            return;
        }

        var active = folder.items.filter(function(x) { return x.active; });

        if (active.length === 0) {
            alert('Выберите GTIN в папке!');
            return;
        }

        var dm = State.dm;
        dm.rotationList = active;
        dm.rotationIndex = 0;
        dm.isRotating = true;
        dm.generatedCodes = [];
        dm.codeHistoryIndex = -1;

        // Switch to DataMatrix tab
        global.BarGen.Controllers.Tab.switchTo('datamatrix');

        // Update UI
        Utils.$('start-btn').style.display = 'none';
        Utils.$('stop-btn').style.display = 'inline-flex';

        UI.updateRotationStatus();
        generateAndDisplay();
        startTimer();
    }

    /**
     * Stop rotation and reset state
     */
    function stopRotation() {
        var dm = State.dm;

        dm.isRotating = false;
        stopTimer();

        // Reset rotation state
        dm.rotationList = [];
        dm.rotationIndex = 0;
        dm.generatedCodes = [];
        dm.codeHistoryIndex = -1;

        // Update UI
        Utils.$('start-btn').style.display = 'inline-flex';
        Utils.$('stop-btn').style.display = 'none';

        UI.updateRotationStatus();
        hideCodeInfo();
        updateBadge(false);

        // Generate fresh demo code
        generateAndDisplay();
    }

    /**
     * Manual navigation: next code
     */
    function manualNext() {
        var dm = State.dm;

        // In rotation mode, check if all codes have been generated at least once
        if (dm.rotationList.length > 0 && dm.generatedCodes.length >= dm.rotationList.length) {
            // All codes from rotation list have been generated, cycle through history
            var nextIndex = (dm.codeHistoryIndex + 1) % dm.rotationList.length;
            displayFromCache(nextIndex);
            return;
        }

        // If viewing history, show next from cache
        if (dm.generatedCodes.length > 0 && dm.codeHistoryIndex < dm.generatedCodes.length - 1) {
            displayFromCache(dm.codeHistoryIndex + 1);
        } else {
            // At the end of history - check if we can generate more
            if (dm.rotationList.length > 0) {
                // Rotation mode: check if all unique GTINs already generated at least once
                // Count unique rotation indices in generated codes
                var uniqueIndices = {};
                for (var i = 0; i < dm.generatedCodes.length; i++) {
                    if (dm.generatedCodes[i].rotationIdx !== undefined) {
                        uniqueIndices[dm.generatedCodes[i].rotationIdx] = true;
                    }
                }
                var uniqueCount = Object.keys(uniqueIndices).length;
                
                if (uniqueCount >= dm.rotationList.length) {
                    // All unique codes generated, cycle back to start
                    displayFromCache(0);
                    return;
                }
            }
            // Generate new code (rotation or demo mode)
            generateAndDisplay();
        }
    }

    /**
     * Manual navigation: previous code
     */
    function manualPrev() {
        var dm = State.dm;

        // In rotation mode with full history, cycle backwards
        if (dm.rotationList.length > 0 && dm.generatedCodes.length >= dm.rotationList.length) {
            var prevIndex = dm.codeHistoryIndex - 1;
            if (prevIndex < 0) {
                prevIndex = dm.rotationList.length - 1;
            }
            displayFromCache(prevIndex);
            return;
        }

        // Navigate back in cache if possible
        if (dm.generatedCodes.length > 0 && dm.codeHistoryIndex > 0) {
            displayFromCache(dm.codeHistoryIndex - 1);
        }
    }

    /**
     * Update countdown display
     */
    function updateCountdown() {
        var el = Utils.$('countdown');
        if (el) {
            el.textContent = 'через ' + Math.max(0, State.dm.remaining).toFixed(1) + ' сек';
        }
    }

    /**
     * Toggle play/pause button states
     *
     * @param {boolean} isPlaying - True if timer is running
     */
    function togglePlayState(isPlaying) {
        var playBtn = Utils.$('dm-play-btn');
        var pauseBtn = Utils.$('dm-pause-btn');
        var navArrows = Utils.$('dm-nav-arrows');

        if (isPlaying) {
            if (playBtn) playBtn.style.display = 'none';
            if (pauseBtn) pauseBtn.style.display = 'inline-flex';
            if (navArrows) navArrows.style.display = 'none';
        } else {
            if (playBtn) playBtn.style.display = 'inline-flex';
            if (pauseBtn) pauseBtn.style.display = 'none';
            if (navArrows) navArrows.style.display = 'flex';
        }
    }

    /**
     * Show code information panel
     *
     * @param {string} barcode - GTIN barcode
     * @param {string} templateName - Template name
     * @param {number} index - Current index
     * @param {number} total - Total count
     */
    function showCodeInfo(barcode, templateName, index, total) {
        Utils.$('code-info').style.display = 'block';
        Utils.$('info-barcode').textContent = barcode;
        Utils.$('info-template').textContent = templateName;
        // Ensure index doesn't exceed total in rotation mode
        var displayIndex = index;
        if (displayIndex > total) {
            displayIndex = ((displayIndex - 1) % total) + 1;
        }
        Utils.$('info-counter').textContent = (displayIndex === 0 ? total : displayIndex) + '/' + total;
    }

    /**
     * Hide code information panel
     */
    function hideCodeInfo() {
        Utils.$('code-info').style.display = 'none';
    }

    /**
     * Update mode badge
     *
     * @param {boolean} isRotating - True if rotating
     * @param {number} [count] - GTIN count
     */
    function updateBadge(isRotating, count) {
        var badge = Utils.$('mode-badge');

        if (isRotating) {
            badge.textContent = '🔄 ' + count + ' GTIN';
            badge.className = 'mode-badge list';
            badge.style.display = 'inline-block';
        } else {
            badge.className = 'mode-badge default';
            badge.style.display = 'none';
        }
    }

    /**
     * Get active double scan mode from checkboxes
     * 
     * @returns {string|null} Active mode or null
     */
    function getActiveDoubleScanMode() {
        if (Utils.$('doubleScanSameDM') && Utils.$('doubleScanSameDM').checked) return 'sameDM';
        if (Utils.$('doubleScanDmEan') && Utils.$('doubleScanDmEan').checked) return 'dmEan';
        if (Utils.$('doubleScanSameEan') && Utils.$('doubleScanSameEan').checked) return 'sameEan';
        if (Utils.$('doubleScanDifferentDM') && Utils.$('doubleScanDifferentDM').checked) return 'differentDM';
        return null;
    }

    /**
     * Render primary code (DM or EAN13)
     * 
     * @param {Object} result - Result object from generator
     */
    function renderPrimaryCode(result) {
        var container = Utils.$('primary-code-container');
        if (!container) return;

        var existingSvg = container.querySelector('svg');
        var dmContainer = Utils.$('datamatrix-container');

        if (result.displayAsEan) {
            // Show EAN13 instead of DataMatrix
            var svg = existingSvg;
            if (!svg) {
                svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.id = 'primary-ean13-barcode';
                container.appendChild(svg);
            }
            dmContainer.style.display = 'none';
            svg.style.display = 'block';
            Generators.renderBarcode(svg, result.ean13Code, 'EAN13');
        } else {
            // Show DataMatrix
            dmContainer.style.display = 'flex';
            if (existingSvg) {
                existingSvg.style.display = 'none';
            }
            Generators.renderDM(dmContainer, result.code);
        }
    }

    /**
     * Render secondary code (DM or EAN13)
     * 
     * @param {Object} secondary - Secondary code object
     */
    function renderSecondaryCode(secondary) {
        if (!secondary) return;

        if (secondary.type === 'DM') {
            Utils.$('datamatrix-container-2').style.display = 'flex';
            Utils.$('ean13-barcode').style.display = 'none';
            Generators.renderDM(Utils.$('datamatrix-container-2'), secondary.code);
        } else if (secondary.type === 'EAN13') {
            Utils.$('datamatrix-container-2').style.display = 'none';
            Utils.$('ean13-barcode').style.display = 'block';
            Generators.renderBarcode(Utils.$('ean13-barcode'), secondary.code, 'EAN13');
        }
    }

    /**
     * Show secondary container
     */
    function showSecondaryContainer() {
        var container = Utils.$('secondary-code-container');
        if (container) {
            container.style.display = 'block';
        }
    }

    /**
     * Hide secondary container
     */
    function hideSecondaryContainer() {
        var container = Utils.$('secondary-code-container');
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Update code text display with flash animation
     * 
     * @param {string} primaryCode - Primary code text
     * @param {Object|null} secondaryCode - Secondary code object or null
     */
    function updateCodeText(primaryCode, secondaryCode) {
        var primaryEl = Utils.$('current-code');
        var secondaryEl = Utils.$('secondary-code-text');
        var secondaryDisplay = Utils.$('secondary-code-display');

        // Update primary code
        if (primaryEl) {
            primaryEl.textContent = primaryCode;
            primaryEl.classList.add('flash');
            setTimeout(function() {
                primaryEl.classList.remove('flash');
            }, 300);
        }

        // Update secondary code display
        if (secondaryCode && secondaryEl && secondaryDisplay) {
            secondaryEl.textContent = secondaryCode.code;
            secondaryDisplay.style.display = 'block';
            secondaryEl.classList.add('flash');
            setTimeout(function() {
                secondaryEl.classList.remove('flash');
            }, 300);
        } else if (secondaryDisplay) {
            secondaryDisplay.style.display = 'none';
        }
    }

    // Export to namespace
    global.BarGen.Controllers.DM = {
        generateAndDisplay: generateAndDisplay,
        displayFromCache: displayFromCache,
        startTimer: startTimer,
        stopTimer: stopTimer,
        setInterval: setInterval,
        startRotation: startRotation,
        stopRotation: stopRotation,
        manualNext: manualNext,
        manualPrev: manualPrev,
        updateCountdown: updateCountdown,
        togglePlayState: togglePlayState,
        showCodeInfo: showCodeInfo,
        hideCodeInfo: hideCodeInfo,
        updateBadge: updateBadge
    };

})(window);
