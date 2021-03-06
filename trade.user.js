// ==UserScript==
// @name           Tidy Trade
// @namespace      Never
// @description    Sorts trade items and calculates the total sum uses
// @include        http*://*.world-of-dungeons.net/wod/spiel/trade/exchange_details*
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

var tidyTrade = function (table) {
    var rows = $('tr', table.cloneNode(true));

    if (rows && rows.constructor != Array) rows = [rows];
    if (!rows || rows.length < 1) return;

    var holder   = table.parentNode,
        position = table.nextSibling,
        newTable = add('table'),
        items    = [],
        sums     = {},
        re_uses  = /\(([0-9]+)\/[0-9]+\)/;

    for (var i = 0, cnt = rows.length; i < cnt; i++) {
        var cells     = rows[i].cells,
            condition = $('img', cells[1]),
            link      = $('a', cells[2]),
            control   = cells.length > 3 ? $('input', cells[3]) : null,
            name      = innerText(link),
            size      = innerText(cells[2]).replace(name, '').trim(),
            m_uses    = size.match(re_uses),
            uses      = m_uses ? Number(m_uses[1]) : 1,
            sum       = sums[name],
            item      = {
                'name'      : name,
                'condition' : condition,
                'size'      : size,
                'uses'      : uses,
                'link'      : link,
                'control'   : control
            };

        items.push(item);

        sums[name] = sum ? sum + uses : uses;
    }

    items.sort(function(x,y) { var diff = x.name.toLowerCase().localeCompare(y.name.toLowerCase()); return diff === 0 ? x.uses - y.uses : diff; });

    for (var i = 0, cnt = items.length; i < cnt; i++) {
        var item   = items[i],
            size   = '&nbsp;' + item.size,
            row    = add('tr', newTable),
            no     = attr(add('td', row), 'align', 'right').innerHTML = i + 1,
            c_cond = add(item.condition, attr(add('td', row), 'valign', 'top')),
            c_link = attr(add('td', row), {'valign': 'top', 'align': 'left'});

        if (item.control) add(item.control, add('td', row));

        add(item.link, c_link);
        add('span', c_link).innerHTML = size;

        if (sums[item.name] > 1) {
            var summ = add('span', c_link);
            attr(summ, 'style', 'color: #666').innerHTML = '&nbsp;<sup>&sum;=' + sums[item.name] + '</sup>';
            sums[item.name] = 0;
        }
    }

    holder.removeChild(table);
    holder.insertBefore(newTable, position);
}

var g_main = $('#main_content'),
    g_h1 = $('h1', g_main);

if (innerText(g_h1).indexOf('Trade with') > -1) {
    var tables = $('table', g_main),
        tb_sell = tables[1],
        tb_buy = tables[2];

    if (tb_sell) tidyTrade(tb_sell);
    if (tb_buy)  tidyTrade(tb_buy);
}

})();

