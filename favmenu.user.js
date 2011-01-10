// ==UserScript==
// @name           My Menu
// @namespace      Never
// @description    Injects custom main menu entry
// @include        http*://*.world-of-dungeons.net*
// ==/UserScript==

(function() {

var MY_MENU_NAME        = 'Favorites';

// For available menu keys look bellow the layout configuration

var MY_MENU_LAYOUT = {
   'my_heroes': [
        'My Heroes', {
            'hero_attributes'       : 'Attributes',
            'hero_skills'           : 'Skills',
            'hero_gear'             : 'Equipment',
            'hero_storage'          : 'Storage',
            'hero_cellar'           : 'Cellar',
            'hero_skillconf'        : 'Settings',
            'arena'                 : 'Arena',
            'hero_profiles'         : 'Profile',
        }
    ],
    'group': [
        'My Group', {
            'dungeon'               : 'Dungeon',
            'reports'               : 'Reports',
            'hero_group_cellar'     : 'GS',
            'hero_group_treasure'   : 'TV',
            'group_cashbox'         : 'Funds',
        }
    ],
    'trade_exchange': [
        'Trade', {
            'trade_market'          : 'Marketplace',
            'trade_auction'         : 'Auctions',
        }
    ],
    'recruite_ranking': [
        'Leaderboard', {
            'duells_ranking_groups' : 'Groups',
            'duells_ranking_clans'  : 'Clans',
        }
    ],
};

/* available menu keys

'my_heroes'                 : 'My Heroes',
'hero_attributes'           : 'Attributes',
'hero_skills'               : 'Skills',
'hero_gear'                 : 'Equipment',
'hero_storage'              : 'Storage',
'hero_cellar'               : 'Cellar',
'hero_group_cellar'         : 'Group Storage',
'hero_group_treasure'       : 'Treasure Vault',
'group_cashbox'             : 'Group funds',
'hero_skillconf'            : 'Settings',
'hero_profiles'             : 'My hero',
'all_profiles'              : 'All heroes',
'hero_title'                : 'Title',
'group'                     : 'My Group',
'groupsearch'               : 'Group search',
'dungeon'                   : 'Dungeon',
'quests'                    : 'Quests',
'reports'                   : 'Reports',
'halloffame'                : 'Hall of Fame',
'forums_group'              : 'Group-Forum',
'group_chat'                : 'Chat',
'grouplist'                 : 'All Groups',
'clan'                      : 'My Clan',
'forums_clan'               : 'Clan-Forum',
'all_clans'                 : 'All Clans',
'pm'                        : 'Messages',
'forums_all'                : 'Forum',
'forums_search'             : 'Search',
'chat'                      : 'Chat',
'forums_polls'              : 'Polls',
'ticker'                    : 'The town crier',
'arena'                     : 'Arena',
'duells'                    : 'Duel',
'duells_search'             : 'Search for Opponents',
'duells_forum_tournament'   : 'Duel-, Tournament- and League-Forums',
'duell_chat'                : 'Duel chat',
'duells_results'            : 'Results',
'duells_ranking_heroes'     : 'Heroes',
'duells_ranking_groups'     : 'Groups',
'duells_ranking_clans'      : 'Clans',
'trade_market'              : 'Marketplace',
'hero_market'               : 'My Sales',
'forum_trade'               : 'Buy and Sell Forums',
'trade_chat'                : 'Trade Chat',
'trade_exchange'            : 'Trade',
'trade_auction'             : 'Auctions',
'bazar'                     : 'Shops',
'trade_beg'                 : 'Beggars and Charity',
'trade_ranking'             : 'Merchant Ranks',
'get_diamonds'              : 'Sapphire market',
'my_murequest'              : 'IP Sharing',
'my_account'                : 'Settings',
'newsletter'                : 'Newsletter',
'recruit_benefits'          : 'Advantages',
'recruite_invite'           : 'Tell your friend by email',
'recruite_forums'           : 'Fame for posting in forums',
'recruite_hp'               : 'For your web site',
'logos'                     : 'WoD-Logos',
'recruite_fame'             : 'My Recruits',
'recruite_ranking'          : 'Leaderboard',
'vote'                      : 'Vote now',
'forum_help'                : 'Forums for advice and help',
'hero_classes'              : 'Classes and Races',
'hero_titles'               : 'Title List',
'level_costs'               : 'Training Costs',
'master_ranks'              : 'Master Ranks',
'help_smilies'              : 'Smileys',
'stats_finance'             : 'Finances',
'dungeonlist'               : 'List of dungeons',

*/

function $(selector, parentNode) {
    var context = parentNode || document;
    if (!selector || typeof selector !== "string" || !(context.nodeType === 9 || context.nodeType === 1)) return null;
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
        if (new_result.length == 0) return null;
        result = new_result;
    }
    for (var i = 0, cnt = result.length; i < cnt; i++) {
        if (result[i].wrappedJSObject) result[i] = result[i].wrappedJSObject;
    };
    if (result.length > 1) return result;
    return result.length == 1 && result[0] !== context ? result[0] : null;
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
    Element.prototype.attr = attr;
    Element.prototype.css = css;
    Element.prototype.cssClass = cssClass;
    Element.prototype.add = add;
}
else {
    var elements = ['Body', 'Anchor', 'Div', 'Image', 'Span'];
    for (var i = 0, cnt = elements.length; i < cnt; i++) {
        var name = 'HTML' + elements[i] + 'Element'
            proto = unsafeWindow[name].prototype;
        proto.attr = attr;
        proto.css = css;
        proto.cssClass = cssClass;
        proto.add = add;
    };
}

var verticalMenu = $('.menu-vertical .menu-0-body');

if (verticalMenu) {

   var body_onload = $('body').attr('onload'),
       skin = body_onload.match(/skin[0-9-]+/i),
       sid = body_onload.match(/JsSession\(.+,\s([0-9]+),/)[1],
       base_url = document.location.href.match(/https?:\/\/[a-z]+\.world-of-dungeons\.net/);
       font_render_url = 'http://fonts.neise-games.de/java_font_renderer/render?skin=' + skin,
       my_menu = add('div').attr({'class': 'menu-1', id: 'menu_my_menu'}),
       caption = my_menu.add('a').attr({'class': 'menu-1-caption', 'onclick': "return menuOnClick(this,'','','');"});

   if (skin) {
       caption.add('img').attr({'class': 'font_menu-1', 'alt': MY_MENU_NAME, 'src' : font_render_url + '&profil=font_menu-1&text=' + MY_MENU_NAME});
       caption.add('img').attr({'class': 'font_menu-1-hovered', 'alt': MY_MENU_NAME, 'src' : font_render_url + '&profil=font_menu-1-hovered&text=' + MY_MENU_NAME});
       caption.add('img').attr({'class': 'font_menu-1-selected', 'alt': MY_MENU_NAME, 'src' : font_render_url + '&profil=font_menu-1-selected&text=' + MY_MENU_NAME});
   }

   caption.add('span').attr('class', 'menu-1-arrow open');

   var menu_body = my_menu.add('div').attr({'class': 'menu-1-body', 'style' : 'display: block'}).add('div').attr('class', 'menu-2'),
       menu1 = $('.menu-1', verticalMenu),
       links = $('.menu-2 a', verticalMenu),
       menu_items = {};

    var open_links = {};

    for (var i = 0, cnt = menu1.length; i < cnt; i++) {
        var open_menu = menu1[i];
        if (open_menu.cssClass('open')) {
           var tmp = $('a', open_menu);
           for (var j = 0, c2 = tmp.length; j < c2; j++) {
               var link = tmp[j],
                   name = link.attr('onclick').match(/'([a-z_ ]+)',''\);$/i);
               if (name) {
                   open_links[name[1]] = open_menu;
               }
           }
       }
   }

   // var keys = '';

   for (var i = 0, cnt = links.length; i < cnt; i++) {
        var link = links[i],
            name = link.attr('onclick').match(/'([a-z_ ]+)',''\);$/i);
        if (name) {
            menu_items[name[1]] = link.cloneNode(true);
            // keys += "'" + name[1] + "' : '" + link.innerText.replace(/^\s+|\s+$/g,"") + "',\n";
        }
   }

   for(var key in MY_MENU_LAYOUT) {
        var link = menu_items[key],
            submenu = false;
        if (!link) link = add('a').attr({'href':'#', 'class': 'menu-2-caption'});
        link.attr('onclick', null, true);
        var menu_item = MY_MENU_LAYOUT[key];
        if (typeof menu_item === 'string') {
            link.innerHTML = menu_item;
            var open_menu = open_links[key];
            if (open_menu) {
                var arrow = $('.menu-1-arrow', open_menu.cssClass('open', false));
                if (arrow) arrow.cssClass('open', false).cssClass('closed', true);
            }
        }
        else {
            link.innerText = menu_item[0];
            var submenu_items = menu_item[1];
            submenu = add('div').attr({'class': 'menu-2-body', 'style': 'padding-top: 0px'});
            for (var subkey in submenu_items)
            {
                var sublink = menu_items[subkey];
                if (sublink) {
                    sublink.attr('onclick', null, true);
                    submenu.add('div').attr('class', 'menu-3').add(sublink).cssClass('menu-2-caption', false).cssClass('menu-3-caption', true).innerHTML = submenu_items[subkey];
                    var open_menu = open_links[subkey];
                    if (open_menu) {
                        var arrow = $('.menu-1-arrow', open_menu.cssClass('open', false));
                        if (arrow) arrow.cssClass('open', false).cssClass('closed', true);
                    }
                }
            };
        }
        var new_menu = menu_body.add('div').attr('class', 'menu-2 open');
        new_menu.add(link);
        if (submenu) new_menu.add(submenu);
   }

   verticalMenu.insertBefore(add('div').attr('class', 'menu-between'), verticalMenu.firstChild);
   verticalMenu.insertBefore(my_menu, verticalMenu.firstChild);
}

})();



