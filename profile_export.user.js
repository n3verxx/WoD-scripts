// ==UserScript==
// @name           Profile Export
// @namespace      Never
// @description    Script allows to export hero profile information to BBCode
// @include        http*://*.world-of-dungeons.net/wod/spiel/hero/skills.php*
// ==/UserScript==
//

(function() {

var VERSION = '1.0.2';

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
  GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      onload: function(request) {
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
      }
  });
}

var supportsInnerText = typeof Element.prototype !== 'undefined',
    innerText = function(elem) {
    return supportsInnerText ? elem.innerText : elem.textContent;
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
    var elements = ['Body', 'Anchor', 'Div', 'Image', 'Span', 'Heading', 'Input', 'TableRow', 'TableCell', 'TextArea'];
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

String.prototype.pad = function(len, str, left) {
    var res = this,
        tmp = str || ' ';
    if (left === true) {
        while (res.length < len) res = tmp + res;
    }
    else {
        while (res.length < len) res += tmp;
    }
    return res;
}

String.prototype.parseEffectiveValue = function(defaultValue) {
    var val = this.replace(/[a-z:,\s\n]+/gi, '').match(/([0-9]+)(\[([0-9-]+)\])?/);
    if (val === null) return [0,0];
    return  val[3] ? [Number(val[1]), Number(val[3])] : [Number(val[1]), Number(val[1])];
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

var _attrCosts = '0,0,100,500,1300,2800,5100,8500,13200,19400,27400,37400,49700,64500,82100,102800,126800,154400,\
185900,221600,261800,306800,356800,412200,473300,540400,613800,693800,780800,875000,976800'.split(',');

HeroAttribute.getCost = function(value) {
    return _attrCosts[value] ? Number(_attrCosts[value]) : 0;
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
    this.armor = {};
}

Hero.prototype.generateBBCode = function() {
    return parseTemplate(Hero.getProfileTemplate(), {"hero": this});
}

Hero.getProfileTemplate = function() {
    var template = '\
                                                                                                                                            \
[size=12][hero:<#=hero.name#>]<#if(hero.title){#>, <#}#>[i]<#=hero.title#>[/i] - [class:<#=hero.race#>] [class:<#=hero.char_class#>] - Level <#=hero.level#>[/size]\
[h1]Characteristics[/h1]\
[table][tr]\
[td]\
[table border=1][tr][th]Attribute[/th][th]Value[/th][th]Spent :ep:[/th][/tr]\
<# var c = 0, hattr = hero.attributes; for (var key in hattr) { var attr = hattr[key]; var efval = attr.effective_value !== attr.value ? ("[" + attr.effective_value + "]") : ""; c++; if (c > 8) break; #>\
[tr][td][size=12]<#=attr.name#>[/size][/td][td align=center][size=12]<#=attr.value#> [url=" "]<#=efval#>[/url][/size][/td][td align=right][size=12]<#=attr.training_cost#>[/size][/td][/tr]<# } #>\
[/table]\
[/td]\
[td][/td][td][/td][td][/td]\
[td valign=top]\
[table border=1]\
[tr][td][color=mediumseagreen][size=12]HP[/color][/td][td][size=12]<#=hattr.hp.value#> [url=" "][<#=hattr.hp.effective_value#>][/url][/size][/td][td][color=mediumseagreen][size=12]HHP[/color][/td][td][size=12]<#=hattr.hhp.value#> [url=" "][<#=hattr.hhp.effective_value#>][/url][/size][/td][/tr]\
[tr][td][color=dodgerblue][size=12]MP[/color][/td][td][size=12]<#=hattr.mp.value#> [url=" "][<#=hattr.mp.effective_value#>][/url][/size][/td][td][color=dodgerblue][size=12]RMP[/color][/td][td][size=12]<#=hattr.hhp.value#> [url=" "][<#=hattr.rmp.effective_value#>][/url][/size][/td][/tr]\
[tr][td colspan=2][size=12]Actions[/size][/td][td colspan=2][size=12]<#=hattr.act.value#> [url=" "][<#=hattr.act.effective_value#>][/url][/size][/td][/tr]\
[tr][td colspan=2][size=12]Initiative[/size][/td][td colspan=2][size=12]<#=hattr.ini.value#> [url=" "][<#=hattr.ini.effective_value#>][/url][/size][/td][/tr]\
[tr][td colspan=2][size=12]Reset points[/size][/td][td colspan=2][size=12]<#=hero.reset_points#>[/size][/td][/tr]\
[tr][td colspan=2][size=12]Gender[/size][/td][td colspan=2][size=12]<#=hero.gender#>[/size][/td][/tr]\
[tr][td colspan=2][size=12]Fame[/size][/td][td colspan=2][size=12]<#=hero.fame#> :fame:[/size][/td][/tr]\
[/table]\
[/td]\
[/tr][/table]\
[h1]Armor[/h1]\
[table border=1]\
[tr][th][size=12]Damage type[/size][/th][th][size=12]Attack type[/size][/th][th][size=12]Armor (r)[/size][/th][/tr]\
<# var armor = hero.armor; for (var dmg_type in armor) { var arm = armor[dmg_type]; for (var atk_type in arm) { var val = arm[atk_type].split("/"); #>\
[tr][td][size=12]<#=dmg_type#>[/size][/td][td align=center][size=12]<#=atk_type#>[/size][/td]\
[td][size=12]<#if(val[0]>0){#>[color=mediumseagreen]<#}#><#=val[0]#><#if(val[0]>0){#>[/color]<#}#>\
 / <#if(val[1]>0){#>[color=mediumseagreen]<#}#><#=val[1]#><#if(val[1]>0){#>[/color]<#}#>\
 / <#if(val[2]>0){#>[color=mediumseagreen]<#}#><#=val[2]#><#if(val[2]>0){#>[/color]<#}#>[/size][/td]\
[/tr]<#}}#>\
[/table]  [size=10]r - for normal / good / critical hits[/size]\
[h1]Skills[/h1]\
[table border=1][tr][th align=left]Name[/th][th]Level[/th][th]MP Cost[/th][th]Targets[/th][th colspan=2]Spent :gold: / :ep:[/th][/tr]\
<# var skills = hero.skills; for (var i = 0, cnt = skills.length; i < cnt; i++) { var skill = skills[i], color_skill;\
var erank = skill.effective_rank !== skill.rank ? ("[" + skill.effective_rank + "]") : "";\
var pos_mark = skill.max_affected && skill.one_pos ? "&sup1;" : "";\
var mp = skill.mp_cost != 0 ? skill.mp_cost : ""; var color_affect = (skill.type.match(/attack|degradation/) ? "tomato" : "mediumseagreen");\
if (skill.primary || skill.talent) color_skill = false; else if (skill.secondary) color_skill = "lightslategray"; else color_skill = "#858585";\#>\
[tr][td][skill:"<#=skill.name#>" <#if(color_skill){#>color=<#=color_skill#><#}#> size=12][/td]\
[td align=center][size=12]<#=skill.rank#> [url=" "]<#=erank#>[/url][/size][/td]\
[td align=center][size=12][color=dodgerblue]<#=mp#>[/color][/size][/td]\
[td align=center][size=12][color=<#=color_affect#>]<#=skill.max_affected#><#=pos_mark#>[/color][/size][/td]\
[td align=right]<#=skill.training_cost_gold#>[/td]\
[td align=right]<#=skill.training_cost_ep#>[/td][/tr]<# } #>\
[/table]  [size=10]1 - in one position[/size]\
\
';
    return template;
}

Hero.prototype.parse = function(html) {
    try {
        var title = $('h1', html),
            content_rows = $('.content_table_row_0', html).concat($('.content_table_row_1', html));

        this.name = innerText(title).replace('- Attributes and Characteristics', '').trim();

        var re_attr  = /Strength|Constitution|Intelligence|Dexterity|Charisma|Agility|Perception|Willpower/,
            re_race  = /(Borderlander|Dinturan|Gnome|Halfling|Hill Dwarf|Kerasi|Mag-Mor Elf|Mountain Dwarf|Rashani|Tiram-Ag Elf|Woodlander) \(/,
            re_class = /(Alchemist|Archer|Barbarian|Bard|Drifter|Gladiator|Hunter|Juggler|Knight|Mage|Paladin|Priest|Scholar|Shaman) \(/;

        for (var i = 0, cnt = content_rows.length; i < cnt; i++) {
            var row = content_rows[i];
            cell1 = row.cells[0],
                  property = innerText(cell1).trim();
            if (property.match(re_attr)) {
                var race = cell1.innerHTML.match(re_race),
                    ch_class = cell1.innerHTML.match(re_class);
                if (race) this.race = race[1];
                if (ch_class) this.char_class = ch_class[1];
                var val = $('tr', row.cells[1]);
                if (val.cells) {
                    var attr_name = property.toLowerCase().substring(0, 2).replace('de', 'dx'),
                        attr = this.attributes[attr_name];
                    val = innerText(val.cells[1]).parseEffectiveValue();
                    attr.value = val[0];
                    attr.effective_value = val[1];
                    attr.training_cost = HeroAttribute.getCost(attr.value);
                }
            }
            else {
                switch(property.toLowerCase()) {
                    case "hero's level":
                        this.level = Number(innerText(row.cells[1]));
                        break;
                    case 'fame':
                        this.fame = Number(innerText(row.cells[1]));
                        break;
                    case 'hit points':
                        var hp = innerText(row.cells[1]).parseEffectiveValue(),
                            hhp = innerText(row.cells[2]).parseEffectiveValue(),
                            hpa = this.attributes['hp'],
                            hhpa = this.attributes['hhp'];
                        hpa.value = hp[0];
                        hpa.effective_value = hp[1];
                        hhpa.value = hhp[0];
                        hhpa.effective_value = hhp[1];
                        break;
                    case 'mana points':
                        var mp = innerText(row.cells[1]).parseEffectiveValue(),
                            rmp = innerText(row.cells[2]).parseEffectiveValue(),
                            mpa = this.attributes['mp'],
                            rmpa = this.attributes['rmp'];
                        mpa.value = mp[0];
                        mpa.effective_value = mp[1];
                        rmpa.value = rmp[0];
                        rmpa.effective_value = rmp[1];
                        break;
                    case 'actions per round':
                        var act = innerText(row.cells[1]).parseEffectiveValue(),
                            acta = this.attributes['act'];
                        acta.value = act[0];
                        acta.effective_value = act[1];
                        break;
                    case 'reset points':
                        this.reset_points = Number(innerText(row.cells[1]));
                        break;
                    case 'title':
                        this.title = innerText(row.cells[1]).replace('Choose title', '').trim();
                        break;
                    case 'initiative':
                        var ini = innerText(row.cells[1]).parseEffectiveValue(),
                            inia = this.attributes['ini'];
                        inia.value = ini[0];
                        inia.effective_value = ini[1];
                        break;
                    case 'gender':
                        this.gender = innerText(row.cells[1]).trim().toUpperCase()[0];
                        break;
                    case 'crushing damage':
                    case 'lightning damage':
                    case 'ice damage':
                    case 'fire damage':
                    case 'poison damage':
                    case 'crushing damage':
                    case 'mana damage':
                    case 'psychological damage':
                    case 'acid damage':
                    case 'cutting damage':
                    case 'piercing damage':
                        var attack_type = innerText(row.cells[1]).replace('(z)', '').trim(),
                            value = innerText(row.cells[2]).replace(/(\s|&nbsp;)/g, '').trim();
                        if (!this.armor[property]) this.armor[property] = {};
                        var a = this.armor[property];
                        a[attack_type] = value;
                        break;
                    default:
                        break
                }
            }
        };
    }
    catch (ex) {
        GM_log(ex);
    }
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
    this.one_pos = false;
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
    this.url = '';
    this.hero;
    this.onDone = null;
}

HeroSkill.prototype.fetchInfo = function(data) {
    try {
        var skill_info = add('div');
        skill_info.innerHTML = data;
        var table_rows = $('.content_table table tr', $('form', skill_info));

        for (var i = 0, cnt = table_rows.length; i < cnt; i++) {
            var property = innerText(table_rows[i].cells[0]).trim(),
                value = innerText(table_rows[i].cells[1]).replace(/(\s|&nbsp;)/g, ' ').trim();

            switch(property) {
                case 'type'                     : this.type = value;  break;
                case 'may be used'              : this.in_round = value.indexOf("in round") > -1;  this.pre_round = value.indexOf("in pre round") > -1;  break;
                case 'target'                   : this.target = value; this.one_pos = value.indexOf('one position') > -1; break;
                case 'Max. characters affected' :
                case 'Max. opponents affected'  : this.max_affected = value; break;
                case 'Mana points cost'         : if (value !== '-') {
                                                      var mp = value.match(/([0-9])+ \(([0-9]+)\)/);
                                                      this.mp_base = Number(mp[2]); this.mp_cost = Math.floor(this.mp_base * (0.8 + 0.1 * this.effective_rank)); 
                                                  }
                                                  break;
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

        if (this.max_affected.indexOf('% of your hero`s level') > -1) {
            var tmp = this.max_affected.replace('% of your hero`s level', '*' + this.hero.level +'/100').replace(' ', '');
            this.max_affected = Math.floor(eval(tmp));
        }

        switch(this.type) {
            case 'attack':
            case 'degradation':
                if (this.target.indexOf('one enemy') > -1) this.max_affected = 1;
                break;
            case 'improvement':
            case 'healing':
                if (this.target.indexOf('one team') > -1) this.max_affected = 1;
                break;
            default:
                break;
        }
    }
    catch (ex) {
        GM_log(ex);
    }

    if (typeof this.onDone === 'function') this.onDone(this);
}

HeroSkill.prototype.parse = function(row_html) {
    try {
        var link = $('a', row_html.cells[1]),
            rank_row = $('tr', row_html.cells[2]),
            rank = rank_row ? innerText(rank_row.cells[1]).parseEffectiveValue() : [0,0],
            title = unescape(link.href).match(/name=([a-z- :\(\)'!\+]+)/i);

        if (title != null && rank[0] !== 0)
        {
            this.name = title[1].replace(/\+/g, ' ');
            this.talent = this.name.indexOf('Talent:') > -1;
            this.rank = rank[0];
            this.effective_rank = rank[1];
            this.url = link.href;

            if (!this.talent) {
                switch(link.attr('class')) {
                    case 'skill_primary'  : this.primary     = true; break;
                    case 'skill_secondary': this.secondary   = true; break;
                    case 'skill_foreign'  : this.exceptional = true; break;
                    default: break;
                }
            }

            this.calculateCost();
        }
    }
    catch (error) {
        GM_log(error);
    }

    return this;
}


var _secCosts = '0,40,120,400,960,1880,3320,5360,8120,11720,16240,21840,28600,36680,46160,57160,\
69840,84280,100640,119000,139520,162280,187440,215120,245480,278600,314600,353640,\
395840,441320,490200,542640,598760,658680,722520,79440,862560,939000,1019920,1105440,195680'.split(','),
    _excCosts = '0,50,150,500,1300,2700,4850,7950,12200,17800,24950,33850,44700,57750,73200,91250,\
112150,136100,163350,194150,228750,267350,320200,357550,409650,466750,529100,596950,670550,\
750150,836050,928450,1027650,1133900,1247450,1368600,1497600,1634700,1780200,1934400,2097500'.split(','),
    _talCosts = '0,1440,3240,5440,8080,11200,14840,19040,23840,29280,35400,42240,49840,58240,\
67480,77600,88640,100640,113640,127680,142800,159040,176440,195040,214880,236000,258440,282240,\
307440,334080,362200,391840,423040,455840,490280,526400,564240,603840,645240,688480,733600'.split(',');

HeroSkill.prototype.calculateCost = function() {
    var cost = 0;

    if (this.primary) {
        for (var i = this.rank; i > 1; i--) cost += (Math.pow(i, 2) - i) * 20;
        if (cost === 0) cost = 40;
    }
    else if (this.secondary) {
        cost = _secCosts[this.rank] ? Number(_secCosts[this.rank]) : 0;
    }
    else if (this.exceptional) {
        cost = _excCosts[this.rank] ? Number(_excCosts[this.rank]) : 0;
    }
    else if (this.talent) {
        cost = _talCosts[this.rank] ? Number(_talCosts[this.rank]) : 0;
    }

    this.training_cost_ep = cost;
    this.training_cost_gold = cost * 0.9;
    return this;
}

// --- Main ---

var g_form_skills = $('#main_content form'),
    g_button_export,
    g_img_wait,
    g_hero,
    g_jobs;

var exportSkills = function() {

    g_button_export.attr('disabled', 'true').cssClass('button clickable', false).cssClass('button_disabled', true);
    g_img_wait.attr('style', null, true);

    get(location.href.replace('skills.php', 'attributes.php'), function(attrHtml) {
        var skill_rows = $('.content_table_row_0', g_form_skills).concat($('.content_table_row_1', g_form_skills)),
            attr_html = add('div');

        attr_html.innerHTML = attrHtml;

        g_hero = new Hero();
        g_jobs = 0;
        g_hero.parse($('form', attr_html)[1]);

        var skills = [];

        for (var i = 0, cnt = skill_rows.length; i < cnt; i++) {
            var skill = new HeroSkill().parse(skill_rows[i]);
            if (skill.rank > 0) {
                skill.hero = g_hero;
                skill.onDone = showResult;
                g_jobs++;
                get(skill.url, skill.fetchInfo, skill, true);
                skills.push(skill);
            }
        }

        skills.sort(function(x,y) { return y.effective_rank - x.effective_rank; });

        g_hero.skills = skills;
    });
}

var showResult = function(skill) {
    if (skill) g_jobs--;
    if (g_jobs === 0) {
        var h1 = $('h1', g_form_skills),
            txt_export = $('#profile-export-result', h1),
            date = new Date(),
            stamp = [date.getDate().toString().pad(2, '0', true), (date.getMonth() + 1).toString().pad(2, '0', true), date.getFullYear().toString().substring(2)].join('.'),
            url = '[url=https://github.com/n3ver/WoD-scripts/raw/master/profile_export.user.js]Profile Export[/url]',
            bbcode = g_hero.generateBBCode().trim() + '\n[size=9]\nGenerated: ' + stamp + ' - ' + url + ' ' + VERSION + '[/size]';

        if (!txt_export) txt_export = h1.parentNode.add('textarea').attr({'rows': '4', 'cols': '50', 'id': 'profile-export-result'});
        txt_export.innerHTML = bbcode;
        g_img_wait.attr('style', 'display: none');
    }
}

if (g_form_skills && g_form_skills.action && g_form_skills.action.match(/hero\/skills\.php/i)) {
    var buttons = $('tbody .button', g_form_skills),
        button = buttons[buttons.length - 1];

    if (button.value === 'Show Details') {
        g_button_export = add('input').attr({'type': 'button', 'class': 'button clickable', 'value': 'Export', 'style': 'margin-left: 4px'});
        g_button_export.addEventListener('click', exportSkills, false);
        button.parentNode.insertBefore(g_button_export, button.nextSibling);
        button.parentNode.insertBefore(add('br'), g_button_export.nextSibling);

        g_img_wait = add('div').attr('id', 'profile_wait_img').add('img').attr({'src': location.protocol + '//' + location.host + '/wod/css/img/ajax-loader.gif', 'style': 'display: none'});
        button.parentNode.insertBefore(g_img_wait, button.parentNode.firstChild);

        //TODO: parse subclass
    }
}

})();



