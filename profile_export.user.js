// ==UserScript==
// @name           Profile Export
// @namespace      Never
// @description    Script allows to export hero profile to BBCode
// @include        http*://*.world-of-dungeons.net*
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

var css = function(name, value) {
    var estyle = document.defaultView.getComputedStyle(this, null);
    if (typeof name === 'object') {
        for (var key in name) {
            estyle.setProperty(key, name[key]);
        };
    }
    else if (value) {
        estyle.setProperty(name, value);
    }
    else {
        return estyle.getPropertyValue(name);
    }
    return this.wrappedJSObject ? this.wrappedJSObject : this;
}

var cssClass = function(name, toggle) {
    var has = this.className.indexOf(name) !== -1;
    if (typeof toggle !== 'boolean') return has;
    if (has && toggle) return this.wrappedJSObject ? this.wrappedJSObject : this;
    this.className = toggle ? this.className + ' ' + name : this.className.replace(name,'').replace(/^\s+|\s+$/g,'');
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
    if (!Element.prototype.css)  Element.prototype.css = css;
    if (!Element.prototype.cssClass) Element.prototype.cssClass = cssClass;
    if (!Element.prototype.add) Element.prototype.add = add;
}
else {
    var elements = ['Body', 'Anchor', 'Div', 'Image', 'Span', 'Heading', 'Input'];
    for (var i = 0, cnt = elements.length; i < cnt; i++) {
        var proto = unsafeWindow['HTML' + elements[i] + 'Element'].prototype;
        if (!proto.attr) proto.attr = attr;
        if (!proto.css) proto.css = css;
        if (!proto.cssClass) proto.cssClass = cssClass;
        if (!proto.add) proto.add = add;
    };
}

// --- Classes ---

function HeroAttribute(name) {
    this.name = name;
    this.baseValue = 1;
    this.bonusValue = 0;
}

HeroAttribute.prototype.toString = function() {
    return this.name + ' ' + this.baseValue + '[' + this.bonusValue + ']';
}

HeroAttribute.prototype.getCost = function() {
    var attrCosts = {
        '1': 0, '2': 100, '3': 500, '4': 1300, '5': 2800, '6': 5100, '7': 8500,
        '8': 13200, '9': 19400, '10': 27400, '11': 37400, '12': 49700, '13': 64500,
        '14': 82100, '15': 102800, '16': 126800, '17': 154400, '18': 185900,
        '19': 221600,'20': 261800, '21': 306800, '22': 356800, '23': 412200,
        '24': 473300,'25': 540400, '26': 613800, '27': 693800, '28': 780800,
        '29': 875000,'30': 976800
    };
    return attrCosts[this.baseValue];
}

function Hero() {
    this.name = '';
    this.level = 1;
    this.hp = '';
    this.hhp = '';
    this.mp = '';
    this.rmp = '';
    this.actions = 1;
    this.initiative = '';
    this.reset_points = '';
    this.fame = 0;
    this.gender = 'male';
    this.title = '';
    this.attributes = {
        'st': new HeroAttribute('Strength'),
        'co': new HeroAttribute('Constitution'),
        'in': new HeroAttribute('Intelligence'),
        'dx': new HeroAttribute('Dexterity'),
        'ch': new HeroAttribute('Perception'),
        'ag': new HeroAttribute('Agility'),
        'pe': new HeroAttribute('Perception'),
        'wi': new HeroAttribute('Willpower')
    };
}

// --- Main ---

var form_attr = $('#main_content form'),
    title;

var exportProfile = function() {
    var hero = new Hero();
    //alert(title);
    alert(hero.attributes['st'].getCost());
    return false;
}


if (form_attr && form_attr.action && form_attr.action.match(/hero\/attributes\.php/i)) {
    title = $('h1', form_attr);
    if (title) {
        title.add('input').attr({'type': 'button', 'class': 'button clickable', 'value': 'Export', 'style': 'margin-left: 10px'}).addEventListener('click', exportProfile, false);
    }
}

})();



