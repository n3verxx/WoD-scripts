// ==UserScript==
// @name           Storage Management
// @namespace      Never
// @description    Adds additional functionality for groups storage and treasure vault management
// @include        http*://*.world-of-dungeons.net/wod/spiel/hero/items.php*
// ==/UserScript==

(function() {

// --- Helpers ---

function $(selector, parentNode, alwaysArray) {
    var context = parentNode || document;
    if (!selector || typeof selector !== 'string' || !(context.nodeType === 9 || context.nodeType === 1)) return null;
    var selectors = selector.split(/\s+/), result = [context], asArray = alwaysArray || false;
    for (var i = 0, cnt = selectors.length; i < cnt; i++) {
        var new_result = [], s = selectors[i], m_elem = s.match(/^([\.#]?[a-z]+\w*)/i), sel = m_elem ? m_elem[1] : '',
            s = s.replace(sel, ''), re_attr = /(\[([a-z]+)([\*\^\$]?=)"(\w+)"\])/gi, filters = [];
        while (filter = re_attr.exec(s)) {
            if (filter.index === re_attr.lastIndex) re_attr.lastIndex++;
            var f = { 'attribute': filter[2], 'condition': filter[3], 'value': filter[4] };
            filters.push(f);
        }
        switch(sel[0]) {
            case '#':
                new_result = [document.getElementById(sel.substring(1))];
                if (!new_result[0]) return null;
                break;
            case '.':
                for (var j = 0, c2 = result.length; j < c2; j++) {
                    var v = result[j].getElementsByClassName(sel.substring(1));
                    for (var k = 0, c3 = v.length; k < c3; new_result.push(v[k++])) ;
                };
                break;
            default:
                for (var j = 0, c2 = result.length; j < c2; j++) {
                    var v = result[j].getElementsByTagName(sel);
                    for (var k = 0, c3 = v.length; k < c3; new_result.push(v[k++])) ;
                };
                break;
        }
        if (filters.length > 0) {
            result = [];
            for (var g = 0, cntg = new_result.length; g < cntg; g++) {
                var elem = new_result[g], ok = false;
                for (var l = 0, cntl = filters.length; l < cntl; l++) {
                    var f = filters[l], attrib = elem.getAttribute(f.attribute);
                    if (attrib) {
                        switch(f.condition) {
                            case '*=': ok = attrib.indexOf(f.value) > -1;  break;
                            case '^=': ok = attrib.indexOf(f.value) === 0; break;
                            case '$=': ok = attrib.indexOf(f.value, attrib.length - f.value.length) > -1; break;
                            default  : ok = attrib === f.value; break;
                        }
                    }
                    if (!ok) break;
                }
                if (ok) result.push(elem);
            }
        }
        else {
            result = new_result;
        }
    }
    if (result.length === 0 || result[0] === context) return null;
    for (var i = 0, cnt = result.length; i < cnt; i++) { if (result[i].wrappedJSObject) result[i] = result[i].wrappedJSObject; };
    return !asArray && result.length === 1 ? result[0] : result;
}

var attr = function(name, value, remove) {
    if (remove) {
        this.removeAttribute(name);
    }
    else if (typeof name === 'object') {
        for (var key in name) {
            this.setAttribute(key, name[key]);
        };
    }
    else if (value) {
        this.setAttribute(name, value);
    }
    else {
        return this.getAttribute(name);
    }
    return this.wrappedJSObject ? this.wrappedJSObject : this;
}

var add = function(value) {
    var newElem = typeof value !== 'object' ? document.createElement(value) : value;
    if (newElem.wrappedJSObject) newElem = newElem.wrappedJSObject;
    if (this.nodeType) this.appendChild(newElem);
    return newElem;
}

var supportsInnerText = typeof Element.prototype !== 'undefined';
var innerText = function(elem) {
    if (!elem) return '';
    return supportsInnerText ? elem.innerText : elem.textContent;
}

if (Element.prototype) {
    if (!Element.prototype.attr) Element.prototype.attr = attr;
    if (!Element.prototype.add) Element.prototype.add = add;
}
else {
    var elements = ['Div', 'Input', 'TableRow', 'TableCell', 'Label', 'Anchor', 'Option', 'OptGroup'];
    for (var i = 0, cnt = elements.length; i < cnt; i++) {
        var proto = unsafeWindow['HTML' + elements[i] + 'Element'].prototype;
        if (!proto.attr) proto.attr = attr;
        if (!proto.add) proto.add = add;
    };
}

// --- Classes ---

function StorageObject() {
    this.name = '';
    this.consumable = false;
    this.usable = true;
    this.group = true;
    this.ctrlSelect = null;
    this.ctrlLocation = null;
    this.ctrlSell = null;
}

StorageObject.specialConsumables = {
    'ruby shard': 1,
    'small carnelian': 1,
    'small citrine fragment': 1,
    'small emerald fragment': 1,
    'small lapis lazuli fragment': 1,
    'small malachite fragment': 1,
    'small turquoise': 1
}

StorageObject.prototype.isConsumable = function() {
    if (this.consumable) return true;
    if (/^reagent:/.test(this.name)) return true;
    if (/^(lesser|greater) emblem of/i.test(this.name)) return true;
    if (StorageObject.specialConsumables[this.name]) return true;
    return false;
}

// --- Main ---

var g_main = $('#main_content'),
    buttons_commit = $('input[type="submit"][name="ok"][value^="Commit"]', g_main) || [];

if (buttons_commit.length > 0) {
    var scope = null;
    if (!scope) scope = $('input[type="submit"][name^="ITEMS_LAGER_DO_SORT"]', g_main);
    if (!scope) scope = $('input[type="submit"][name^="ITEMS_KELLER_DO_SORT"]', g_main);
    if (!scope) scope = $('input[type="submit"][name^="ITEMS_GROUPCELLAR_DO_SORT"]', g_main);
    try { scope = scope[0].parentNode.parentNode.parentNode.parentNode; } catch (ex) { scope = null; }
    if (!scope) return;

    var rows = $('.content_table_row_0', scope, true),
        rows = rows ? rows.concat($('.content_table_row_1', scope, true)) : null;
    if (!rows) return;

    var objects = [],
        re_uses  = /\(([0-9]+)\/[0-9]+\)/;

    for (var i = 0, cnt = rows.length; i < cnt; i++) {
        var cells       = rows[i].cells,
            link        = $('a', cells[1]),
            tooltip     = link ? link.attr('onmouseover') : false,
            classes     = link ? link.attr('class') : '',
            ctrl_select = cells.length > 2 ? $('input[type="checkbox"][name^="doEquip]', cells[2]) : null,
            ctrl_move   = cells.length > 2 ? $('select', cells[2]) : null,
            ctrl_sell   = cells.length > 3 ? $('input[type="checkbox"][name^="Sell"]', cells[3]) : null,
            ctrl_sell   = ctrl_sell === null ? (cells.length > 4 ? $('input[type="checkbox"]', cells[4]) : null) : ctrl_sell,
            name        = innerText(link).replace(/!$/,''),
            size        = innerText(cells[1]).replace(name, '').trim(),
            obj         = new StorageObject();

        obj.name = name;
        obj.consumable = re_uses.test(size);
        obj.usable = classes.indexOf('item_unusable') === -1;
        obj.group = tooltip ? tooltip.indexOf('group item') > -1 : false;
        obj.ctrlSelect = ctrl_select;
        obj.ctrlLocation = ctrl_move;
        obj.ctrlSell = ctrl_sell;

        objects.push(obj);
    }

    if (objects.length === 0) return;

    var labelMove = add('span'),
        labelSell = add('span'),
        buttonSplit = add('input'),
        buttonEquip = add('input'),
        selectMove = add('select'),
        selectSell = add('select');

    labelMove.innerHTML = '&nbsp;Select:&nbsp;';
    labelSell.innerHTML = '&nbsp;Sell:&nbsp;';
    buttonSplit.attr({'type': 'button', 'class': 'button clickable', 'name': 'buttonSplit', 'value': 'Split', 'style': 'margin-left: 5px'});
    buttonEquip.attr({'type': 'button', 'class': 'button clickable', 'name': 'buttonEquip', 'value': 'Equip', 'style': 'margin-left: 5px'});

    var moveOptions = ['none', 'none',
                       '---', 'All',
                       'all', 'all',
                       'all_nouse', 'unusable',
                       'all_group', 'group',
                       'all_nongroup', 'non-group',
                       '---', 'Consumables',
                       'con', 'all',
                       'con_nouse', 'unusable',
                       'con_group', 'group',
                       'con_nongroup', 'non-group',
                       '---', 'Items',
                       'itm', 'all',
                       'itm_nouse', 'unusable',
                       'itm_group', 'group',
                       'itm_nongroup', 'non-group'],
        sellOptions = ['none', 'none',
                       '---', 'All',
                       'all', 'all',
                       'all_nouse', 'unusable',
                       '---', 'Consumables',
                       'con', 'all',
                       'con_nouse', 'unusable',
                       '---', 'Items',
                       'itm', 'all',
                       'itm_nouse', 'unusable'],
        op_group = null;

    for (var i = 0, cnt = moveOptions.length; i < cnt; i = i + 2) {
        if (moveOptions[i] === '---') { 
            op_group = add('optgroup').attr('label', moveOptions[i + 1]); 
            selectMove.appendChild(op_group); continue;
        }
        var op = add('option');
        op.attr('value', moveOptions[i]).innerHTML = moveOptions[i + 1];
        if (op_group) op_group.appendChild(op); else selectMove.appendChild(op);
    }

    op_group = null;

    for (var i = 0, cnt = sellOptions.length; i < cnt; i = i + 2) {
        if (sellOptions[i] === '---') { 
            op_group = add('optgroup').attr('label', sellOptions[i + 1]); 
            selectSell.appendChild(op_group); continue;
        }
        var op = add('option');
        op.attr('value', sellOptions[i]).innerHTML = sellOptions[i + 1];
        if (op_group) op_group.appendChild(op); else selectSell.appendChild(op);
    }

    var onSelectionChange = function(eventArgs) {
        switch(eventArgs.target.value)
        {
            case 'none':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    if (objects[i].ctrlSelect) objects[i].ctrlSelect.checked = false;
                }
                break;
            case 'all':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    if (objects[i].ctrlSelect) objects[i].ctrlSelect.checked = true;
                }
                break;
            case 'all_nouse':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    var obj = objects[i];
                    if (obj.ctrlSelect && !obj.usable) obj.ctrlSelect.checked = true;
                }
                break;
            case 'all_group':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    var obj = objects[i];
                    if (obj.ctrlSelect && obj.group) obj.ctrlSelect.checked = true;
                }
                break;
            case 'all_nongroup':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    var obj = objects[i];
                    if (obj.ctrlSelect && !obj.group) obj.ctrlSelect.checked = true;
                }
                break;
            case 'con':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    var obj = objects[i];
                    if (obj.ctrlSelect && obj.isConsumable()) obj.ctrlSelect.checked = true;
                }
                break;
            case 'con_nouse':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    var obj = objects[i];
                    if (obj.ctrlSelect && obj.isConsumable() && !obj.usable) obj.ctrlSelect.checked = true;
                }
                break;
            case 'con_group':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    var obj = objects[i];
                    if (obj.ctrlSelect && obj.isConsumable() && obj.group) obj.ctrlSelect.checked = true;
                }
                break;
            case 'con_nongroup':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    var obj = objects[i];
                    if (obj.ctrlSelect && obj.isConsumable() && !obj.group) obj.ctrlSelect.checked = true;
                }
                break;
            case 'itm':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    var obj = objects[i];
                    if (obj.ctrlSelect && !obj.isConsumable()) obj.ctrlSelect.checked  = true;
                }
                break;
            case 'itm_nouse':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    var obj = objects[i];
                    if (obj.ctrlSelect && !obj.usable && !obj.isConsumable()) obj.ctrlSelect.checked = true;
                }
                break;
            case 'itm_group':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    var obj = objects[i];
                    if (obj.ctrlSelect && obj.group && !obj.isConsumable()) obj.ctrlSelect.checked = true;
                }
                break;
            case 'itm_nongroup':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    var obj = objects[i];
                    if (obj.ctrlSelect && !obj.group && !obj.isConsumable()) obj.ctrlSelect.checked = true;
                }
                break;
        }
    }

   var onSellChange = function(eventArgs) {
        switch(eventArgs.target.value)
        {
            case 'none':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    if (objects[i].ctrlSell) objects[i].ctrlSell.checked = false;
                }
                break;
            case 'all':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    if (objects[i].ctrlSell) objects[i].ctrlSell.checked = true;
                }
                break;
            case 'all_nouse':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    var obj = objects[i];
                    if (obj.ctrlSell && !obj.usable) obj.ctrlSell.checked = true;
                }
                break;
            case 'con':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    var obj = objects[i];
                    if (obj.ctrlSell && obj.isConsumable()) obj.ctrlSell.checked = true;
                }
                break;
            case 'con_nouse':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    var obj = objects[i];
                    if (obj.ctrlSell && obj.isConsumable() && !obj.usable) obj.ctrlSell.checked = true;
                }
                break;
            case 'itm':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    var obj = objects[i];
                    if (obj.ctrlSell && !obj.isConsumable()) obj.ctrlSell.checked  = true;
                }
                break;
            case 'itm_nouse':
                for (var i = 0, cnt = objects.length; i < cnt; i++) {
                    var obj = objects[i];
                    if (obj.ctrlSell && !obj.usable && !obj.isConsumable()) obj.ctrlSell.checked = true;
                }
                break;
        }
    }

    var onSplit = function() {
        var ok = false, tmp = [];
        for (var i = 0, cnt = objects.length; i < cnt; i++) {
            var obj = objects[i];
            if (obj.ctrlLocation && obj.ctrlSelect) {
                if (obj.ctrlSelect.checked) {
                    obj.ctrlLocation.value = !obj.isConsumable() ? 'go_group' : 'go_group_2';
                    ok = true;
                }
                else {
                    tmp.push(obj);
                }
            }
        }
        if (!ok) {
            for (var i = 0, cnt = tmp.length; i < cnt; i++) {
                var obj = tmp[i];
                    obj.ctrlLocation.value = !obj.isConsumable() ? 'go_group' : 'go_group_2';
            }
        }
    }

    var onEquip = function() {
        var ok = false, tmp = [];
        for (var i = 0, cnt = objects.length; i < cnt; i++) {
            var obj = objects[i];
            if (obj.usable && obj.ctrlLocation && obj.ctrlSelect) {
                if (obj.ctrlSelect.checked) {
                    obj.ctrlLocation.value = obj.ctrlLocation.options[0].value;
                    ok = true;
                }
                else {
                    tmp.push(obj);
                }
            }
        }
        if (!ok) {
            for (var i = 0, cnt = tmp.length; i < cnt; i++) {
                var obj = tmp[i];
                    obj.ctrlLocation.value = obj.ctrlLocation.options[0].value;
            }
        }
    }

    var holder = buttons_commit[0].parentNode,
        buttonSplit2 = buttonSplit.cloneNode(true),
        buttonEquip2 = buttonEquip.cloneNode(true),
        labelSell2   = labelSell.cloneNode(true),
        labelMove2   = labelMove.cloneNode(true),
        selectSell2  = selectSell.cloneNode(true),
        selectMove2  = selectMove.cloneNode(true);

    selectMove.addEventListener('change', onSelectionChange, false);
    selectMove2.addEventListener('change', onSelectionChange, false);
    selectSell.addEventListener('change', onSellChange, false);
    selectSell2.addEventListener('change', onSellChange, false);
    buttonSplit.addEventListener('click', onSplit, false);
    buttonSplit2.addEventListener('click', onSplit, false);
    buttonEquip.addEventListener('click', onEquip, false);
    buttonEquip2.addEventListener('click', onEquip, false);

    holder.insertBefore(labelMove, buttons_commit[0].nextSibling);
    holder.insertBefore(selectMove, labelMove.nextSibling);
    holder.insertBefore(buttonSplit, selectMove.nextSibling);
    holder.insertBefore(buttonEquip, buttonSplit.nextSibling);
    holder.insertBefore(labelSell, buttonEquip.nextSibling);
    holder.insertBefore(selectSell, labelSell.nextSibling);

    holder = buttons_commit[1].parentNode;
    holder.insertBefore(labelMove2, buttons_commit[1].nextSibling);
    holder.insertBefore(selectMove2, labelMove2.nextSibling);
    holder.insertBefore(buttonSplit2, selectMove2.nextSibling);
    holder.insertBefore(buttonEquip2, buttonSplit2.nextSibling);
    holder.insertBefore(labelSell2, buttonEquip2.nextSibling);
    holder.insertBefore(selectSell2, labelSell2.nextSibling);}

})();



