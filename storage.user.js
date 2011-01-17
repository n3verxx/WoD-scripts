// ==UserScript==
// @name           Storage Management
// @namespace      Never
// @description    Adds additional functionality for groups storage and treasure vault management
// @include        http*://*.world-of-dungeons.net/wod/spiel/hero/items.php*
// ==/UserScript==
//

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



if (Element.prototype) {
    if (!Element.prototype.attr) Element.prototype.attr = attr;
    if (!Element.prototype.add) Element.prototype.add = add;
}
else {
    var elements = ['Div', 'Input', 'TableRow', 'TableCell', 'Label'];
    for (var i = 0, cnt = elements.length; i < cnt; i++) {
        var proto = unsafeWindow['HTML' + elements[i] + 'Element'].prototype;
        if (!proto.attr) proto.attr = attr;
        if (!proto.add) proto.add = add;
    };
}

// --- Main ---

var g_main = $('#main_content .layout_clear'),
    g_clickable = $('th .clickable', g_main),
    g_inputs = $('input', g_main) || [];

if (g_clickable) {
    var col_group = null;
    for (var i = 0, cnt = g_clickable.length; i < cnt; i++) {
        if (g_clickable[i].value.indexOf('Group') > -1) {
            col_group = g_clickable[i].parentNode;
            break;
        }
    }

    if (col_group) {
       var select = add('input').attr({'type': 'checkbox', 'id': 'gm_group_flag', 'name': 'gm_group_flag'}),
           label = add('label').attr({'for': 'gm_group_flag'});

       label.innerHTML = 'all';
       select.addEventListener('click', function() {
            for (var i = 0, cnt = g_inputs.length; i < cnt; i++) {
                var inp = g_inputs[i];
                if (inp.type === 'checkbox' && inp.name.indexOf('SetGrpItem') > -1) inp.checked = this.checked;
            }
       }, false);

       col_group.removeChild(col_group.childNodes[4]);
       col_group.appendChild(select);
       col_group.appendChild(label);
    }
}


})();

