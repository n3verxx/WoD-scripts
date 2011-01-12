// ==UserScript==
// @name           Profile Export
// @namespace      Never
// @description    Script allows to export hero profile to BBCode
// @include        http*://*.world-of-dungeons.net/wod/spiel/hero/attributes.php*
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
    var elements = ['Body', 'Anchor', 'Div', 'Image', 'Span', 'Heading', 'Input', 'TableRow', 'TableCell'];
    for (var i = 0, cnt = elements.length; i < cnt; i++) {
        var proto = unsafeWindow['HTML' + elements[i] + 'Element'].prototype;
        if (!proto.attr) proto.attr = attr;
        if (!proto.css) proto.css = css;
        if (!proto.cssClass) proto.cssClass = cssClass;
        if (!proto.add) proto.add = add;
    };
}

String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, '');
}

String.prototype.parseEffectiveValue = function(defaultValue) {
    var val = this.replace(/[a-z:,\s\n]+/gi, '').match(/([0-9]+)(\[([0-9-]+)\])?/),
        def = defaultValue || 0;
    return val[3] ? [Number(val[1]), Number(val[3])] : [Number(val[1]), Number(def)];
}

// --- Classes ---

function HeroAttribute(name) {
    this.name = name;
    this.value = 0;
    this.effective_value = 0;
}

HeroAttribute.prototype.toString = function() {
    return this.name + ' ' + this.value + '[' + this.effective_value + ']';
}

HeroAttribute.prototype.getCost = function() {
    var attrCosts = {
        '1': 0, '2': 100, '3': 500, '4': 1300, '5': 2800, '6': 5100, '7': 8500, '8': 13200,
        '9': 19400, '10': 27400, '11': 37400, '12': 49700, '13': 64500, '14': 82100, 
        '15': 102800, '16': 126800, '17': 154400, '18': 185900,'19': 221600,'20': 261800, 
        '21': 306800, '22': 356800, '23': 412200, '24': 473300,'25': 540400,'26': 613800, 
        '27': 693800, '28': 780800, '29': 875000,'30': 976800
    };
    return attrCosts[this.baseValue];
}

function Hero() {
    this.name = '';
    this.level = 1;
    this.race = '';
    this.char_class = '';
    this.subclass = '';
    this.actions = 1;
    this.initiative = '';
    this.reset_points = '';
    this.fame = 0;
    this.gender = 'male';
    this.title = '';
    this.attributes = {
        'st' : new HeroAttribute('Strength'),
        'co' : new HeroAttribute('Constitution'),
        'in' : new HeroAttribute('Intelligence'),
        'dx' : new HeroAttribute('Dexterity'),
        'ch' : new HeroAttribute('Charisma'),
        'ag' : new HeroAttribute('Agility'),
        'pe' : new HeroAttribute('Perception'),
        'wi' : new HeroAttribute('Willpower'),
        'hp' : new HeroAttribute('HP'),
        'hhp': new HeroAttribute('HHP'),
        'mp' : new HeroAttribute('MP'),
        'rmp': new HeroAttribute('RMP'),
        'ini': new HeroAttribute('Initiative'),
        'act': new HeroAttribute('Actions'),
    };
}

Hero.prototype.dumpInfo = function() {

    var tt = '';

    tt += this.name + ' - ' + this.race + ' - ' + this.char_class + ' - ' + this.level + '\n';
    tt += 'Fame:' + this.fame + '\n';
    tt += 'Reset points:' + this.reset_points + '\n';
    tt += 'Gender:' + this.gender + '\n';

    for(name in this.attributes) {
        var at = this.attributes[name];
        tt += at.name + ' ' + at.value + (at.effective_value != 0 ? '[' + at.effective_value + ']' : '') + '\n';
    }

    alert(tt);
}

Hero.prototype.parse = function(html) {
    var title = $('h1', form_attr),
        content_rows = $('.content_table_row_0', form_attr).concat($('.content_table_row_1', form_attr));

    this.name = title.innerText.replace('- Attributes and Characteristics', '').trim();

    var re_attr  = /Strength|Constitution|Intelligence|Dexterity|Charisma|Agility|Perception|Willpower/,
        re_race  = /(Borderlander|Dinturan|Gnome|Halfling|Hill Dwarf|Kerasi|Mag-Mor Elf|Mountain Dwarf|Rashani|Tiram-Ag Elf|Woodlander) \(/,
        re_class = /(Alchemist|Archer|Barbarian|Bard|Drifter|Gladiator|Hunter|Juggler|Knight|Mage|Paladin|Priest|Scholar|Shaman) \(/;

    for (var i = 0, cnt = content_rows.length; i < cnt; i++) {
       var row = content_rows[i];
           cell1 = row.cells[0],
           property = cell1.innerText.trim();
       if (property.match(re_attr)) {
           var race = cell1.innerHTML.match(re_race),
               ch_class = cell1.innerHTML.match(re_class);
           if (race) this.race = race[1];
           if (ch_class) this.char_class = ch_class[1];
           var val = $('tr', row.cells[1]);
           if (val.cells) {
               var attr_name = property.toLowerCase().substring(0, 2).replace('de', 'dx'),
                   attr = this.attributes[attr_name];
               val = val.cells[1].innerText.parseEffectiveValue();
               attr.value = val[0];
               attr.effective_value = val[1];
           }
       }
       else {
            switch(property.toLowerCase()) {
                case "hero's level":
                    this.level = Number(row.cells[1].innerText);
                    break;
                case 'fame':
                    this.fame = Number(row.cells[1].innerText);
                    break;
                case 'hit points':
                    var hp = row.cells[1].innerText.parseEffectiveValue(),
                        hhp = row.cells[2].innerText.parseEffectiveValue(),
                        hpa = this.attributes['hp'],
                        hhpa = this.attributes['hhp'];
                    hpa.value = hp[0];
                    hpa.effective_value = hp[1];
                    hhpa.value = hhp[0];
                    hhpa.effective_value = hhp[1];
                    break;
                case 'mana points':
                    var mp = row.cells[1].innerText.parseEffectiveValue(),
                        rmp = row.cells[2].innerText.parseEffectiveValue(),
                        mpa = this.attributes['mp'],
                        rmpa = this.attributes['rmp'];
                    mpa.value = mp[0];
                    mpa.effective_value = mp[1];
                    rmpa.value = rmp[0];
                    rmpa.effective_value = rmp[1];
                    break;
                case 'actions per round':
                    var act = row.cells[1].innerText.parseEffectiveValue(),
                        acta = this.attributes['act'];
                    acta.value = act[0];
                    acta.effective_value = act[1];
                    break;
                case 'reset points':
                    this.reset_points = Number(row.cells[1].innerText);
                    break;
                case 'title':
                    this.title = row.cells[1].innerText.trim();
                    break;
                case 'initiative':
                    var ini = row.cells[1].innerText.parseEffectiveValue(),
                        inia = this.attributes['ini'];
                    inia.value = ini[0];
                    inia.effective_value = ini[1];
                    break;
                case 'gender':
                    this.gender = row.cells[1].innerText.trim().toUpperCase()[0];
                    break;
                default:
                    break
            }
       }
    };
}

// --- Main ---

var form_attr = $('#main_content form');

var exportProfile = function() {
    var hero = new Hero();
    hero.parse(form_attr);
    hero.dumpInfo();
    return false;
}

if (form_attr && form_attr.action && form_attr.action.match(/hero\/attributes\.php/i)) {
    var title = $('h1', form_attr);
    if (title) {
        title.add('input').attr({'type': 'button', 'class': 'button clickable', 'value': 'Export', 'style': 'margin-left: 10px'}).addEventListener('click', exportProfile, false);
    }
}

})();



