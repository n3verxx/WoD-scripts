// ==UserScript==
// @name           Hero List
// @namespace      Never
// @description    Scripts adds functionality to order your heroes
// @include        http*://*.world-of-dungeons.*/wod/spiel/settings/heroes.php*
// ==/UserScript==

(function() {

// --- Helpers ---

function $(selector, parentNode) {
    var context = parentNode || document;
    if (!selector || typeof selector !== 'string' || !(context.nodeType === 9 || context.nodeType === 1)) return null;
    var selectors = selector.split(' '),
        result = [context];
    for (var i = 0, cnt = selectors.length; i < cnt; i++) {
        var sel = selectors[i],
            new_result = [];
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
        if (new_result.length === 0) return null;
        result = new_result;
    }
    for (var i = 0, cnt = result.length; i < cnt; i++) {
        if (result[i].wrappedJSObject) result[i] = result[i].wrappedJSObject;
    };
    if (result.length > 1) return result;
    return result.length === 1 && result[0] !== context ? result[0] : null;
}

var attr = function(elem, name, value, remove) {
    if (remove) {
        elem.removeAttribute(name);
    }
    else if (typeof name === 'object') {
        for (var key in name) {
            elem.setAttribute(key, name[key]);
        };
    }
    else if (value) {
        elem.setAttribute(name, value);
    }
    else {
        return elem.getAttribute(name);
    }
    return elem.wrappedJSObject ? elem.wrappedJSObject : elem;
}

var add = function(value, parentNode) {
    var newElem = typeof value !== 'object' ? document.createElement(value) : value;
    if (newElem.wrappedJSObject) newElem = newElem.wrappedJSObject;
    if (parentNode && parentNode.nodeType) parentNode.appendChild(newElem);
    return newElem;
}

var supportsInnerText = typeof Element.prototype !== 'undefined';
var innerText = function(elem) {
    if (!elem) return '';
    return supportsInnerText ? elem.innerText : elem.textContent;
}

String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, '');
}

// --- Main ---

var g_heroes = $('#main_content form table'),
    g_rows = g_heroes ? $('tr', g_heroes) : null;

    if (g_rows && g_rows.constructor != Array) g_rows = [g_rows];

var saveWeights = function () {

    if (!g_rows || g_rows.length < 1) return;

    for (var i = 1, cnt = g_rows.length; i < cnt; i++) {
        var cells     = g_rows[i].cells,
            hid       = Number($('input', cells[0]).value),
            weight    = Number($('input', cells[5]).value);

        if (isNaN(weight)) weight = 0;

        GM_setValue(hid, weight);
    }

    var form = document.forms['the_form'];

    if (form) form.submit();
}

var orderHeroes = function (weights) {

    if (!g_rows || g_rows.length < 1) return;

    var heroes = [],
        holder    = g_heroes.parentNode,
        position  = g_heroes.nextSibling,
        newTable  = add('table'),
        newTbody  = add('tbody', newTable);

    attr(newTable, 'class', 'content_table');

    var headerWeight = add('th'),
        label = add('span', headerWeight),
        buttonSave = add('input', headerWeight);

    label.innerHTML = 'weight<br/>';
    attr(buttonSave, {'type': 'button', 'value': 'Save', 'class': 'button clickable'});
    buttonSave.addEventListener('click', saveWeights, false);

    g_rows[0].appendChild(headerWeight);

    newTbody.appendChild(g_rows[0]);

    for (var i = 1, cnt = g_rows.length; i < cnt; i++) {
        var cells     = g_rows[i].cells,
            hid       = Number($('input', cells[0]).value),
            level     = Number(innerText(cells[2])),
            hero      = {
                'weight'    : level == 0 ? 100 : level,
                'row'       : g_rows[i]
            };

        var val = GM_getValue(hid);

        if (typeof(val) != 'undefined') hero.weight = Number(val);

        heroes.push(hero);
    }

    heroes.sort(function(x, y) { return x.weight - y.weight; });

    for (var i = 0, cnt = heroes.length; i < cnt; i++) {
        var hero = heroes[i],
            row = hero.row,
            colWeight = add('td', row),
            txt = add('input');

        attr(row, 'class', 'row' + i % 2);
        attr(colWeight, 'align', 'center');
        attr(txt, {'type': 'text', 'style': 'width: 30px', 'value': hero.weight });

        add(txt, colWeight);
        add(heroes[i].row, newTbody);
    }

    holder.insertBefore(newTable, position);
    holder.removeChild(g_heroes);
}

if (g_rows) orderHeroes();

})();

