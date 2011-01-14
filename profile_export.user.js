// ==UserScript==
// @name           Profile Export
// @namespace      Never
// @description    Script allows to export hero profile to BBCode
// @include        http*://*.world-of-dungeons.net/wod/spiel/hero/*.php*
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
    alert(value);
    if (typeof name === 'object') {
        for (var key in name) {
            estyle.setProperty(key, name[key]);
        };
    }
    else if (value) {
        estyle.setProperty(name, value, '');
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

var get = function(url, callback, obj, async) {
    var request = new XMLHttpRequest(),
        sync = typeof async === 'undefined' ? true : async;
    request.onreadystatechange = function() {
        if (request.readyState === 4) {

            if (request.status !== 200) {
                alert('Data fetch failed');
                return false;
            }

            if (typeof callback === 'function') {
                if (!obj) {
                    callback(request.responseText);
                }
                else {
                    callback.call(obj, request.responseText);
                }
            }
        }
    };
    request.open('GET', url, sync);
    request.send(null);
}

var parseTemplate = function(tpl, data) {
    try {
        var code = "var p=[],print=function(){p.push.apply(p,arguments);};with(obj){p.push('" +
                   tpl.replace(/[\r\t\n]/g, " ").replace(/'(?=[^#]*#>)/g, "\t").split("'").join("\\'")
                   .split("\t").join("'").replace(/<#=(.+?)#>/g, "',$1,'").split("<#").join("');")
                   .split("#>").join("p.push('") + "');}return p.join('');";
            fn = new Function("obj", code);
        return fn(data);
    }
    catch (ex) {
        GM_log(ex);
    }
    return 'ERROR';
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

String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{'+i+'\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
}

String.prototype.parseEffectiveValue = function(defaultValue) {
    var val = this.replace(/[a-z:,\s\n]+/gi, '').match(/([0-9]+)(\[([0-9-]+)\])?/);
    if (val === null) return [0,0];
    return  val[3] ? [Number(val[1]), Number(val[3])] : [Number(val[1]), Number(val[1])];
}

String.prototype.appendLine = function(line) {
    return this + line + '\n';
}

// --- Classes ---

function HeroAttribute(name) {
    this.name = name;
    this.value = 0;
    this.effective_value = 0;
    this.training_cost = 0;
}

HeroAttribute.prototype.toString = function() {
    return this.name + ' ' + this.value + (this.effective_value != 0 ? '[' + this.effective_value + ']' : '') + ' ' + HeroAttribute.getCost(this.value);
}

HeroAttribute.getCost = function(value) {
    var attrCosts = {
        '1': 0, '2': 100, '3': 500, '4': 1300, '5': 2800, '6': 5100, '7': 8500, '8': 13200, '9': 19400, 
        '10': 27400,  '11': 37400,  '12': 49700,  '13': 64500,  '14': 82100, '15': 102800,
        '16': 126800, '17': 154400, '18': 185900, '19': 221600, '20': 261800,'21': 306800,
        '22': 356800, '23': 412200, '24': 473300, '25': 540400, '26': 613800,'27': 693800,
        '28': 780800, '29': 875000, '30': 976800
    };
    return attrCosts[value];
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
    this.gender = 'M';
    this.title = '';
    this.skills = [];
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
    var tt = parseTemplate(Hero.getProfileTemplate(), {"hero": this});
    var txt_export = $('h1', form_attr).parentNode.add('textarea').attr({'rows': '4', 'cols': '50'});
    txt_export.innerHTML = tt.trim();
}

Hero.getProfileTemplate = function() {
    var template = '\
                                                                                                                                            \
[size=13][hero:<#=hero.name#>],[i]<#=hero.title#>[/i] - [class:<#=hero.race#>] [class:<#=hero.char_class#>] - Level <#=hero.level#>[/size]\
[h1]Characteristics[/h1]\
[table][tr]\
[td]\
[table border=1][tr][th]Attribute[/th][th]Value[/th][th]Spent :ep:[/th][/tr]\
<# var c = 0, hattr = hero.attributes; for (var key in hattr) { var attr = hattr[key]; var efval = attr.effective_value !== attr.value ? ("[" + attr.effective_value + "]") : ""; c++; if (c > 8) break; #>\
[tr][td][size=13]<#=attr.name#>[/size][/td][td][size=13]<#=attr.value#> [color=gold]<#=efval#>[/color][/size][/td][td align=right][size=13]<#=attr.training_cost#>[/size][/td][/tr]<# } #>\
[/table]\
[/td]\
[td][/td][td][/td][td][/td]\
[td valign=top]\
[table border=1]\
[tr][td][color=palegreen][size=13]HP[/color][/td][td][size=13]<#=hattr.hp.value#> [color=gold][<#=hattr.hp.effective_value#>][/color][/size][/td][td][color=palegreen][size=13]HHP[/color][/td][td][size=13]<#=hattr.hhp.value#> [color=gold][<#=hattr.hhp.effective_value#>][/color][/size][/td][/tr]\
[tr][td][color=cornflowerblue][size=13]MP[/color][/td][td][size=13]<#=hattr.mp.value#> [color=gold][<#=hattr.mp.effective_value#>][/color][/size][/td][td][color=cornflowerblue][size=13]RMP[/color][/td][td][size=13]<#=hattr.hhp.value#> [color=gold][<#=hattr.rmp.effective_value#>][/color][/size][/td][/tr]\
[tr][td colspan=2][size=13]Actions[/size][/td][td colspan=2][size=13]<#=hattr.act.value#> [color=gold][<#=hattr.act.effective_value#>][/color][/size][/td][/tr]\
[tr][td colspan=2][size=13]Initiative[/size][/td][td colspan=2][size=13]<#=hattr.ini.value#> [color=gold][<#=hattr.ini.effective_value#>][/color][/size][/td][/tr]\
[tr][td colspan=2][size=13]Reset points[/size][/td][td colspan=2][size=13]<#=hero.reset_points#>[/size][/td][/tr]\
[tr][td colspan=2][size=13]Gender[/size][/td][td colspan=2][size=13]<#=hero.gender#>[/size][/td][/tr]\
[tr][td colspan=2][size=13]Fame[/size][/td][td colspan=2][size=13]<#=hero.fame#> :fame:[/size][/td][/tr]\
[/table]\
[/td]\
[/tr][/table]\
[h1]Skills[/h1]\
[table border=1][tr][th align=left]Name[/th][th]Level[/th][th]MP Cost[/th][th]Targets[/th][th colspan=2]Spent :gold: / :ep:[/th][/tr]\
<# var skills = hero.skills; for (var i = 0, cnt = skills.length; i < cnt; i++) { var skill = skills[i], color;\
var erank = skill.effective_rank !== skill.rank ? ("[" + skill.effective_rank + "]") : "";\
if (skill.primary) color = "gold"; else if (skill.secondary) color = "lightgrey"; else color = "darkgrey";\#>\
[tr][td][skill:"<#=skill.name#>" color=<#=color#> size=13][/td][td][size=13]<#=skill.rank#> [color=gold]<#=erank#>[/color][/size][/td][td align=right]-[/td][td align=right]-[/td][td align=right]-[/td][td align=right]-[/td][/tr]<# } #>\
[/table]\
                                                                                                                                            ';
    return template;
}

Hero.prototype.parse = function(html) {
    var title = $('h1', html),
        content_rows = $('.content_table_row_0', html).concat($('.content_table_row_1', html));

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
               attr.training_cost = HeroAttribute.getCost(attr.value);
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
    return this;
}

function HeroSkill() {
    this.name = '';
    this.type = '';
    this.rank = 0;
    this.effective_rank = 0;
    this.primary = false;
    this.secondary = false;
    this.exceptional = false;
    this.talent = false;
    this.in_round = true;
    this.pre_round = false;
    this.target = '';
    this.max_affected = '';
    this.mp_base = 0;
    this.mp_cost = 0;
    this.item = '';
    this.skill_class = '';
    this.initiative_attr = '';
    this.attack_type = '';
    this.attack_attr = '';
    this.damage_attr = '';
    this.defense_attr = '';
    this.healing_attr = '';
    this.training_cost_ep = 0;
    this.training_cost_gold = 0;
}

HeroSkill.prototype.parseInfo = function(data) {
    var skill_info = add('div');
    skill_info.innerHTML = data;
    var table_rows = $('.content_table table tr', $('form h1', skill_info).nextSibling.nextSibling);

    //ctual_cost = base_cost * (0.8 + 0.1 * skill_level)

    for (var i = 0, cnt = table_rows.length; i < cnt; i++) {
       var property = table_rows[i].cells[0].innerText.trim(),
           value = table_rows[i].cells[1].innerText.replace(/(\s|&nbsp;)/g, ' ').trim(),
           tmp = tmp.appendLine(property + ':' + value);
        switch(property) {
            case 'type'                     : this.type = value;  break;
            case 'may be used'              : this.in_round = value.indexOf("in round") > -1;  this.pre_round = value.indexOf("in pre round") > -1;  break;
            case 'target'                   : this.target = value; break;
            case 'Max. characters affected' :
            case 'Max. opponents affected'  : this.max_affected = value; break;
            case 'Mana points cost'         : if (value !== '-') { var mp = value.match(/([0-9])+ \(([0-9]+)\)/); this.mp_cost = mp[1]; this.mp_base = mp[2]; } break;
            case 'item'                     : this.item = value; break;
            case 'skill class'              : this.skill_class = value; break;
            case 'attack type'              : this.attack_type = value; break;
            case 'attack'                   : this.attack_attr = value; break;
            case 'damage'                   : this.damage_attr = value; break;
            case 'initiative'               : this.initiative_attr = value; break;
            case 'defense'                  : this.defense_attr = value; break;
            case 'healing'                  : this.healing_attr = value; break;
            default: break;
        }
    }
}

HeroSkill.prototype.parse = function(row_html) {
    try {
        var link = $('a', row_html.cells[1]),
            rank_row = $('tr', row_html.cells[2]),
            rank = rank_row ? rank_row.cells[1].innerText.parseEffectiveValue() : [0,0],
            title = link.href.match(/name=([a-z :\+]+)/i);

        if (title != null && rank[0] !== 0)
        {
            this.name = title[1].replace(/\+/g, ' ');
            this.talent = this.name.indexOf('Talent:') > -1;
            this.rank = rank[0];
            this.effective_rank = rank[1];

            switch(link.attr('class')) {
                case 'skill_primary'  : this.primary     = true; break;
                case 'skill_secondary': this.secondary   = true; break;
                case 'skill_foreign'  : this.exceptional = true; break;
                default: break;
            }

            //get(link.href, this.parseInfo, this, false);
        }
    }
    catch (error) {
        GM_log(error);
    }

    return this;
}

HeroSkill.getCost = function(value, gold) {
    var primaryCosts = {
        '1': 20, '2': 60, '3': 180, '4': 420, '5': 820, '6': 1420, '7': 2260, '8': 3380, '9': 4820,
        '10': 6620,  '11': 8820,  '12': 11460,  '13': 0,  '14': 82100, '15': 102800,
        '16': 126800, '17': 154400, '18': 185900, '19': 221600, '20': 261800,'21': 306800,
        '22': 356800, '23': 412200, '24': 473300, '25': 540400, '26': 613800,'27': 693800,
        '28': 780800, '29': 875000, '30': 976800
    };
    return attrCosts[value];
}


HeroSkill.prototype.toString = function() {
     var txt = '';
     txt = txt.appendLine('Name: ' + this.name);
     txt = txt.appendLine('Rank: ' + this.rank);
     txt = txt.appendLine('Effectice Rank: ' + this.effective_rank);
     txt = txt.appendLine('Type: ' + this.type);
     txt = txt.appendLine('Target: ' + this.target);
     txt = txt.appendLine('Max affected: ' + this.max_affected);
     txt = txt.appendLine('Primary: ' + this.primary);
     txt = txt.appendLine('Secondary: ' + this.secondary);
     txt = txt.appendLine('Exceptional: ' + this.exceptional);
     txt = txt.appendLine('In-round: ' + this.in_round);
     txt = txt.appendLine('Pre-round: ' + this.pre_round);
     txt = txt.appendLine('MP cost: ' + this.mp_cost);
     txt = txt.appendLine('MP base: ' + this.mp_base);
     txt = txt.appendLine('Skill Class: ' + this.skill_class);
     txt = txt.appendLine('Initiative attr: ' + this.initiative_attr);
     txt = txt.appendLine('Attack type: ' + this.attack_type);
     txt = txt.appendLine('Attack attr: ' + this.attack_attr);
     txt = txt.appendLine('Attack dmg: ' + this.damage_attr);
     txt = txt.appendLine('Defense attr: ' + this.defense_attr);
     txt = txt.appendLine('Healing attr: ' + this.healing_attr);
     return txt;
}

// --- Main ---

var exportSkills = function() {
    get(location.href.replace('skills.php', 'attributes.php'), doExport);
}

var doExport = function(attrHtml) {
    var skill_rows = $('.content_table_row_0', form_attr).concat($('.content_table_row_1', form_attr)),
        attr_html = add('div'),
        hero = new Hero();

    attr_html.innerHTML = attrHtml;
    hero.parse($('form', attr_html)[1]);

    var skills = [];

    for (var i = 0, cnt = skill_rows.length; i < cnt; i++) {
        var skill = new HeroSkill().parse(skill_rows[i]);
        if (skill.rank > 0) skills.push(skill);
    }

    skills.sort(function(x,y) { return y.effective_rank - x.effective_rank; });

    hero.skills = skills;
    hero.dumpInfo();

    return false;
}

var form_attr = $('#main_content form');

if (form_attr && form_attr.action) {

    if (form_attr.action.match(/hero\/skills\.php/i)) {
        var button = $('tbody .button', form_attr);
        button = button[button.length-1];
        if (button.value === 'Show Details') {
            var btn_export = add('input').attr({'type': 'button', 'class': 'button clickable', 'value': 'Export', 'style': 'margin-left: 4px'});
            btn_export.addEventListener('click', exportSkills, false);
            button.parentNode.insertBefore(btn_export, button.nextSibling);
            button.parentNode.insertBefore(add('br'), btn_export.nextSibling);

            //TODO: parse subclass
            //var subclass = button.parentNode.innerText.trim().match(/[is]/);
        }
    }
}

})();



