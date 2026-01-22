/**
 * BarGen Generators Module
 *
 * @description Barcode and DataMatrix code generation functions
 * @module Generators
 *
 * @requires bwip-js (external) - for DataMatrix rendering
 * @requires JsBarcode (external) - for linear barcode rendering
 *
 * @example
 * // Generate DataMatrix code
 * var result = BarGen.Generators.generateDM('4810099003310', 'type1');
 *
 * // Generate weight barcode
 * var barcode = BarGen.Generators.generateWeightBarcode('77', '12345', 1500);
 */
(function(global) {
    'use strict';

    // Initialize namespace
    global.BarGen = global.BarGen || {};

    var Config = global.BarGen.Config;
    var Utils = global.BarGen.Utils;
    var State = global.BarGen.State;

    /**
     * Generate DataMatrix code
     *
     * @description Generates DataMatrix code using template from Config.
     * If no barcode provided, uses next demo GTIN from list.
     *
     * @param {string} [barcode] - GTIN barcode (optional, uses demo if empty)
     * @param {string} [templateId='type1'] - Template ID ('type1' or 'type2')
     * @returns {Object} Result object
     * @returns {string} result.code - Generated DataMatrix code
     * @returns {string} result.barcode - Used GTIN barcode
     * @returns {string} result.templateName - Template display name
     *
     * @example
     * var result = generateDM('4810099003310', 'type1');
     * // { code: '010481009900331021...', barcode: '4810099003310', templateName: 'Тип 1' }
     */
    function generateDM(barcode, templateId) {
        var template = Config.TEMPLATES[templateId || State.dm.selectedTemplate];
        var usedBarcode = barcode;

        // Use demo GTIN if no barcode provided
        if (!usedBarcode) {
            usedBarcode = State.getNextDemoGtin();
        }

        var code = template.generate(usedBarcode);

        // Add to history
        State.addToHistory({ type: 'DM', code: code });

        return {
            code: code,
            templateName: template.name,
            barcode: usedBarcode
        };
    }

    /**
     * Render DataMatrix code to canvas
     *
     * @description Uses bwip-js library to render DataMatrix
     *
     * @param {HTMLElement} container - Container element for canvas
     * @param {string} code - DataMatrix code to render
     */
    function renderDM(container, code) {
        if (!container) return;

        container.innerHTML = '';

        try {
            var canvas = document.createElement('canvas');
            // @ts-ignore - bwipjs is loaded externally
            bwipjs.toCanvas(canvas, {
                bcid: 'datamatrix',
                text: code,
                scale: 4,
                padding: 2
            });
            container.appendChild(canvas);
        } catch (e) {
            container.innerHTML = '<div style="color:red">Ошибка генерации</div>';
            console.error('[BarGen Generators] DataMatrix render error:', e);
        }
    }

    /**
     * Generate weight barcode
     *
     * @description Generates barcode with weight data for different systems:
     * - 77: CAS scale format (Code128, 16 chars)
     * - 49: Code128 with discount (19 chars)
     * - 22: EAN-13 weight format (13 chars)
     *
     * @param {string} prefix - Barcode prefix ('77', '49', or '22')
     * @param {string} plu - Product lookup code
     * @param {number} weight - Weight in grams
     * @param {number} [discount=0] - Discount percentage (for prefix 49)
     * @returns {Object} Generated barcode data
     * @returns {string} result.code - Full barcode with check digit
     * @returns {string} result.format - Barcode format ('CODE128' or 'EAN13')
     * @returns {number} result.weight - Weight in grams
     * @returns {string} result.plu - PLU code
     * @returns {string} result.prefix - Prefix used
     * @returns {number} result.discount - Discount if applicable
     *
     * @example
     * var bc = generateWeightBarcode('77', '12345', 1500);
     * // { code: '770001234500150000', format: 'CODE128', ... }
     */
    function generateWeightBarcode(prefix, plu, weight, discount) {
        var code, ctrl, format;

        if (prefix === '77') {
            // CAS format: 77 + PLU(6) + Weight(7) + Control(1) = 16
            code = '77' + Utils.padZeros(plu, 6) + Utils.padZeros(weight, 7);
            ctrl = '0'; // Fixed control for CAS
            format = 'CODE128';
        } else if (prefix === '49') {
            // Code128 weight with discount: 49 + PLU(9) + Disc(2) + Weight(5) + Control(1) = 19
            code = '49' + Utils.padZeros(plu, 9) + Utils.padZeros(discount || 0, 2) + Utils.padZeros(weight, 5);
            ctrl = Utils.calcControlCore(code).toString();
            format = 'CODE128';
        } else {
            // EAN-13 weight: 22 + PLU(5) + Weight(5) + Control(1) = 13
            code = '22' + Utils.padZeros(plu, 5) + Utils.padZeros(weight, 5);
            ctrl = Utils.calcControlEAN13(code).toString();
            format = 'EAN13';
        }

        return {
            code: code + ctrl,
            format: format,
            weight: weight,
            plu: plu,
            prefix: prefix,
            discount: discount
        };
    }

    /**
     * Render linear barcode to SVG element
     *
     * @description Uses JsBarcode library to render barcode
     *
     * @param {SVGElement} svg - SVG element to render to
     * @param {string} code - Barcode value
     * @param {string} [format='CODE128'] - Barcode format
     */
    function renderBarcode(svg, code, format) {
        if (!svg) return;

        svg.innerHTML = '';

        try {
            // @ts-ignore - JsBarcode is loaded externally
            JsBarcode(svg, code, {
                format: format || 'CODE128',
                height: 70,
                displayValue: true,
                fontSize: 14,
                margin: 10,
                width: 2
            });
        } catch (e) {
            // Fallback to CODE128 if format fails
            try {
                // @ts-ignore
                JsBarcode(svg, code, {
                    format: 'CODE128',
                    height: 70,
                    displayValue: true,
                    width: 2
                });
            } catch (err) {
                console.error('[BarGen Generators] Barcode render error:', err);
            }
        }
    }

    /**
     * Generate simple barcode
     *
     * @description Generates barcode for SimpleGen module.
     * Automatically calculates EAN-13 check digit if needed.
     *
     * @param {string} value - Barcode value
     * @param {string} type - Barcode type ('CODE128', 'EAN13', 'UPC', 'ITF14')
     * @returns {Object} Result object
     * @returns {string} result.code - Generated barcode
     * @returns {string} result.format - Barcode format
     *
     * @example
     * var bc = generateSimple('590123412345', 'EAN13');
     * // { code: '5901234123457', format: 'EAN13' }
     */
    function generateSimple(value, type) {
        var code = value.trim();

        // Auto-calculate EAN-13 check digit if 12 digits provided
        if (type === 'EAN13' && code.length === 12 && /^\d+$/.test(code)) {
            code += Utils.calcControlEAN13(code);
        }

        return {
            code: code,
            format: type
        };
    }

    /**
     * Generate unique ID for GS1 (AI 21)
     *
     * @description Generates 8-character alphanumeric ID
     * @returns {string} 8-character unique ID
     *
     * @example
     * generateUniqueId() // 'ABC12345'
     */
    function generateUniqueId() {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        var id = '';
        for (var i = 0; i < 8; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    /**
     * Extract EAN13 from GTIN used in DataMatrix
     *
     * @description Extracts GTIN from AI 01 in DataMatrix code and converts to EAN13
     * @param {string} dmCode - DataMatrix code with AI 01
     * @returns {string|null} EAN13 barcode (13 digits) or null if no GTIN found
     *
     * @example
     * extractEAN13FromDM('010481009900331021...') // '4810099003310'
     */
    function extractEAN13FromDM(dmCode) {
        // Extract GTIN from AI 01 (14 digits)
        var ai01Match = dmCode.match(/01(\d{14})/);
        if (!ai01Match) return null;

        var gtin14 = ai01Match[1];
        // Convert GTIN-14 to EAN-13 (remove first digit, recalculate check)
        var ean12 = gtin14.substring(1, 13);
        var checkDigit = Utils.calcControlEAN13(ean12);

        return ean12 + checkDigit;
    }

    /**
     * Break DataMatrix code by corrupting data
     * 
     * @description Creates a broken DataMatrix code for testing scanner error handling.
     * Supports multiple break methods to simulate different types of damage.
     * 
     * @param {string} code - Original DataMatrix code
     * @param {string} [method='removeChars'] - Break method: 
     *   'removeChars' - Remove 5-10 random characters
     *   'wrongChecksum' - Corrupt multiple GTIN digits (30% of digits)
     *   'replaceGS' - Replace GS separators with ||| symbols
     *   'addJunk' - Add 10-15 random junk characters
     *   'random' - Use random method each time
     * @returns {string} Broken code
     * 
     * @example
     * breakDataMatrix('010481009900331021...', 'removeChars')
     * // Returns code with 5-10 characters removed
     */
    function breakDataMatrix(code, method) {
        if (!code) return code;
        
        var brokenCode = code;
        var breakMethod = method || 'removeChars';
        
        // If random method selected, pick one randomly
        if (breakMethod === 'random') {
            var methods = ['removeChars', 'wrongChecksum', 'replaceGS', 'addJunk'];
            breakMethod = methods[Math.floor(Math.random() * methods.length)];
        }
        
        switch (breakMethod) {
            case 'removeChars':
                // Remove 5-10 random characters for more visible damage
                var removeCount = Math.floor(Math.random() * 6) + 5; // 5-10 chars
                var maxPos = Math.max(0, code.length - removeCount);
                var position = Math.floor(Math.random() * maxPos);
                brokenCode = code.slice(0, position) + code.slice(position + removeCount);
                console.log('[BarGen Generators] Breaking DM: removed ' + removeCount + ' chars at pos ' + position);
                console.log('[BarGen Generators] Original length: ' + code.length + ', New length: ' + brokenCode.length);
                break;
                
            case 'wrongChecksum':
                // Corrupt the GTIN check digit and other digits in AI 01
                if (code.indexOf('01') === 0 && code.length >= 16) {
                    // Change multiple digits in GTIN for more visible damage
                    var gtinPart = code.substring(2, 16);
                    var corruptedGtin = '';
                    for (var k = 0; k < gtinPart.length; k++) {
                        if (Math.random() < 0.3 && /\d/.test(gtinPart[k])) {
                            corruptedGtin += (parseInt(gtinPart[k]) + Math.floor(Math.random() * 9) + 1) % 10;
                        } else {
                            corruptedGtin += gtinPart[k];
                        }
                    }
                    brokenCode = '01' + corruptedGtin + code.slice(16);
                    console.log('[BarGen Generators] Breaking DM: corrupted multiple GTIN digits');
                    console.log('[BarGen Generators] Original: ' + code.substring(0, 16));
                    console.log('[BarGen Generators] Corrupted: ' + brokenCode.substring(0, 16));
                } else {
                    // If no AI 01 found, change multiple random digits
                    brokenCode = '';
                    for (var i = 0; i < code.length; i++) {
                        if (/\d/.test(code[i]) && Math.random() < 0.2) {
                            brokenCode += (parseInt(code[i]) + 5) % 10;
                        } else {
                            brokenCode += code[i];
                        }
                    }
                    console.log('[BarGen Generators] Breaking DM: corrupted random digits');
                }
                break;
                
            case 'replaceGS':
                // Replace GS separator characters (0x1D) with visible pipe symbols and add extra noise
                var gsCount = (code.match(/\x1D/g) || []).length;
                brokenCode = code.replace(/\x1D/g, '|||'); // Triple pipes for more visible damage
                console.log('[BarGen Generators] Breaking DM: replaced ' + gsCount + ' GS separators with |||');
                console.log('[BarGen Generators] Original length: ' + code.length + ', New length: ' + brokenCode.length);
                break;
                
            case 'addJunk':
                // Add 10-15 random junk characters at random position for more visible damage
                var junkChars = 'XYZQW!@#$%&*';
                var junkCount = Math.floor(Math.random() * 6) + 10; // 10-15 chars
                var junk = '';
                for (var j = 0; j < junkCount; j++) {
                    junk += junkChars.charAt(Math.floor(Math.random() * junkChars.length));
                }
                var insertPos = Math.floor(Math.random() * code.length);
                brokenCode = code.slice(0, insertPos) + junk + code.slice(insertPos);
                console.log('[BarGen Generators] Breaking DM: added "' + junk + '" at pos ' + insertPos);
                console.log('[BarGen Generators] Original length: ' + code.length + ', New length: ' + brokenCode.length);
                break;
                
            default:
                console.warn('[BarGen Generators] Unknown break method: ' + breakMethod);
                brokenCode = code;
        }
        
        return brokenCode;
    }

    /**
     * Calculate decimal position from quantity
     *
     * @description Determines how many decimal places are in a number
     * @param {number} quantity - Quantity value
     * @returns {number} Decimal position (0-3)
     *
     * @example
     * calculateDecimalPosition(12.45) // 2
     * calculateDecimalPosition(50) // 0
     */
    function calculateDecimalPosition(quantity) {
        var str = quantity.toString();
        var dotIndex = str.indexOf('.');
        if (dotIndex === -1) return 0;
        return str.length - dotIndex - 1;
    }

    /**
     * Generate GS1 code
     *
     * @description Generates GS1 format barcode string according to specification
     * Format: 99MPUC<GS>240[GoodsId]<GS>37[Qty]|3103[Weight]<GS>98[Disc]<GS>21[UniqueID]<GS>97[DecPos]<GS>
     *
     * @param {Object} params - Parameters object
     * @param {string} params.goodsId - Product ID (1-8 digits)
     * @param {string} params.type - Product type ('piece' or 'weight')
     * @param {number} [params.quantity] - Quantity for piece goods
     * @param {number} [params.weight] - Weight in grams for weight goods
     * @param {number} [params.discount=0] - Discount percentage (0-99)
     * @param {string} [params.uniqueId] - Unique ID (auto-generated if discount > 0)
     * @param {number} [params.decimalPosition] - Decimal position (auto-calculated)
     * @returns {string} GS1 format code
     *
     * @example
     * generateGS1Code({
     *   goodsId: '123',
     *   type: 'piece',
     *   quantity: 12.45,
     *   discount: 10
     * })
     * // '99MPUC<GS>240123<GS>3700001245<GS>9810<GS>21ABC12345<GS>972<GS>'
     */
    function generateGS1Code(params) {
        var GS = Config.GS1_CONSTANTS.GS_CHAR;
        var code = Config.GS1_CONSTANTS.PREFIX + GS;

        // AI 240 - GoodsId (1-8 символов, только цифры)
        var goodsId = (params.goodsId || '').replace(/\D/g, '').substring(0, 8);
        if (!goodsId) {
            throw new Error('GoodsId is required');
        }
        code += Config.GS1_CONSTANTS.AI_GOODS_ID + goodsId + GS;

        // Определение типа товара и добавление соответствующего AI
        if (params.type === 'piece') {
            // AI 37 - Quantity (8 цифр с ведущими нулями)
            // По ТЗ: передаём фактическое количество, используем AI 97 для дробной части
            var quantity = params.quantity || 0;
            
            // Вычисляем позицию десятичной точки
            var decimalPosition = params.decimalPosition !== undefined 
                ? params.decimalPosition 
                : calculateDecimalPosition(quantity);
            
            // Преобразуем в сырое значение: quantity * 10^decimalPosition
            var qtyRaw = Math.round(quantity * Math.pow(10, decimalPosition));
            code += Config.GS1_CONSTANTS.AI_QUANTITY + Utils.padZeros(qtyRaw, 8) + GS;
            
            // AI 98 - Discount (опционально)
            if (params.discount > 0) {
                code += Config.GS1_CONSTANTS.AI_DISCOUNT + Utils.padZeros(params.discount, 2) + GS;
                
                // AI 21 - UniqueID (обязателен при скидке)
                var uniqueId = params.uniqueId || generateUniqueId();
                code += Config.GS1_CONSTANTS.AI_UNIQUE_ID + uniqueId + GS;
            }
            
            // AI 97 - Decimal position (только если есть дробная часть)
            if (decimalPosition > 0) {
                code += Config.GS1_CONSTANTS.AI_DECIMAL_POS + decimalPosition + GS;
            }
        } else if (params.type === 'weight') {
            // AI 3103 - Weight в граммах (6 цифр)
            var weight = params.weight || 0;
            code += Config.GS1_CONSTANTS.AI_WEIGHT + Utils.padZeros(weight, 6) + GS;
            
            // AI 98 - Discount (опционально)
            if (params.discount > 0) {
                code += Config.GS1_CONSTANTS.AI_DISCOUNT + Utils.padZeros(params.discount, 2) + GS;
                
                // AI 21 - UniqueID (обязателен при скидке)
                var uniqueId2 = params.uniqueId || generateUniqueId();
                code += Config.GS1_CONSTANTS.AI_UNIQUE_ID + uniqueId2 + GS;
            }
        } else {
            throw new Error('Invalid type: must be "piece" or "weight"');
        }

        return code;
    }

    /**
     * Render GS1 QR code
     *
     * @description Renders QR code using bwip-js library
     * @param {HTMLElement} container - Container element for canvas
     * @param {string} code - GS1 code to encode
     */
    function renderGS1QR(container, code) {
        if (!container) return;

        container.innerHTML = '';

        try {
            var canvas = document.createElement('canvas');
            // @ts-ignore - bwipjs is loaded externally
            bwipjs.toCanvas(canvas, {
                bcid: 'qrcode',
                text: code,
                scale: 3,
                eclevel: 'M'
            });
            container.appendChild(canvas);
        } catch (e) {
            container.innerHTML = '<div style="color:red">Ошибка генерации QR</div>';
            console.error('[BarGen Generators] QR code render error:', e);
        }
    }

    /**
     * Generate barcode from config
     *
     * @description Used by Barcode tab to generate codes based on BARCODE_CONFIGS
     *
     * @param {string} typeId - Config type ID (e.g., 'code128_19_piece')
     * @param {Object} values - Field values
     * @param {boolean} [simulateError=false] - Generate wrong check digit
     * @returns {Object|null} Generated barcode or null on error
     */
    function generateFromConfig(typeId, values, simulateError) {
        var cfg = Config.BARCODE_CONFIGS[typeId];
        if (!cfg) return null;

        var code = cfg.prefix;
        var hasError = false;

        // Build code from fields
        cfg.fields.forEach(function(field) {
            var value = values[field.name] || '';
            value = value.replace(/\D/g, '');

            if (value.length > field.length) {
                hasError = true;
            }

            code += Utils.padZeros(value, field.length);
        });

        if (hasError) return null;

        // Calculate control digit
        var ctrl;
        if (cfg.fixedControl !== undefined) {
            ctrl = cfg.fixedControl;
        } else if (typeId === 'ean13_weight') {
            ctrl = Utils.calcControlEAN13(code).toString();
        } else {
            ctrl = Utils.calcControlCore(code).toString();
        }

        // Simulate error if requested
        if (simulateError && cfg.fixedControl === undefined) {
            var badCtrl = Math.floor(Math.random() * 10).toString();
            while (badCtrl === ctrl) {
                badCtrl = Math.floor(Math.random() * 10).toString();
            }
            ctrl = badCtrl;
        }

        return {
            code: code + ctrl,
            format: cfg.format
        };
    }

    // Export to namespace
    global.BarGen.Generators = {
        generateDM: generateDM,
        renderDM: renderDM,
        breakDataMatrix: breakDataMatrix,
        generateWeightBarcode: generateWeightBarcode,
        renderBarcode: renderBarcode,
        generateSimple: generateSimple,
        generateFromConfig: generateFromConfig,
        generateGS1Code: generateGS1Code,
        renderGS1QR: renderGS1QR,
        generateUniqueId: generateUniqueId,
        calculateDecimalPosition: calculateDecimalPosition,
        extractEAN13FromDM: extractEAN13FromDM
    };

})(window);
