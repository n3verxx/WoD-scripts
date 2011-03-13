// ==UserScript==
// @name           My Menu
// @namespace      Never
// @description    Script allows to alter main menu by injecting customizable entries
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

var cssClass = function(elem, name, toggle) {
    var has = elem.className.indexOf(name) !== -1;
    if (typeof toggle !== 'boolean') return has;
    if (has && toggle) return elem.wrappedJSObject ? elem.wrappedJSObject : elem;
    elem.className = toggle ? elem.className + ' ' + name : elem.className.replace(name,'').replace(/^\s+|\s+$/g,'');
    return elem.wrappedJSObject ? elem.wrappedJSObject : elem;
}

var add = function(value, parentNode) {
    var newElem = typeof value !== 'object' ? document.createElement(value) : value;
    if (newElem.wrappedJSObject) newElem = newElem.wrappedJSObject;
    if (parentNode && parentNode.nodeType) parentNode.appendChild(newElem);
    return newElem;
}


var verticalMenu = $('.menu-vertical .menu-0-body');

if (verticalMenu) {

    var e_body = $('body'),
        skin = attr(e_body, 'onload').match(/skin[0-9-]+/i),
        font_render_url = 'http://fonts.neise-games.de/java_font_renderer/render?skin=' + skin,
        my_menu = add('div'),
        caption = add('a', my_menu),
        supports_img = skin && skin != 'skin-1';

    attr(my_menu, {'class': 'menu-1', id: 'menu_my_menu'});
    attr(caption, {'class': 'menu-1-caption alink selected', 'onclick': "return menuOnClick(this,'','','');"})

    if (supports_img) {
        attr(add('img', caption), {'class': 'font_menu-1', 'alt': MY_MENU_NAME, 'src' : font_render_url + '&profil=font_menu-1&text=' + MY_MENU_NAME});
        attr(add('img', caption), {'class': 'font_menu-1-hovered', 'alt': MY_MENU_NAME, 'src' : font_render_url + '&profil=font_menu-1-hovered&text=' + MY_MENU_NAME});
        attr(add('img', caption), {'class': 'font_menu-1-selected', 'alt': MY_MENU_NAME, 'src' : font_render_url + '&profil=font_menu-1-selected&text=' + MY_MENU_NAME});
    }
    else {
        if (caption.innerText) {
           caption.innerText = MY_MENU_NAME;
        }
        else {
           caption.textContent = MY_MENU_NAME;
        }
    }

   attr(add('span', caption), 'class', 'menu-1-arrow open');

   var menu0 = add('div', my_menu),
       menu_body = add('div', menu0),
       menu1 = $('.menu-1', verticalMenu),
       links = $('.menu-2 a', verticalMenu),
       menu_items = {},
       open_links = {};

   attr(menu0, {'class': 'menu-1-body', 'style' : 'display: block'});
   attr(menu_body, 'class', 'menu-2');

   for (var i = 0, cnt = menu1.length; i < cnt; i++) {
       var open_menu = menu1[i];
       if (cssClass(open_menu, 'open')) {
           var tmp = $('a', open_menu);
           for (var j = 0, c2 = tmp.length; j < c2; j++) {
               var name = attr(tmp[j], 'onclick').match(/'([a-z_ ]+)',''\);$/i);
               if (name) open_links[name[1]] = open_menu;
           }
       }
   }

   // var keys = '';

   for (var i = 0, cnt = links.length; i < cnt; i++) {
       var link = links[i],
           name = attr(link, 'onclick').match(/'([a-z_ ]+)',''\);$/i);
       if (name) {
           menu_items[name[1]] = link.cloneNode(true);
           // keys += "'" + name[1] + "' : '" + link.innerText.replace(/^\s+|\s+$/g,"") + "',\n";
       }
   }

   for(var key in MY_MENU_LAYOUT) {
       var link = menu_items[key],
           submenu = false;
       if (!link) {
           link = add('a');
           attr(link, {'href':'#', 'class': 'menu-2-caption'});
       }
       attr(link, 'onclick', null, true);
       var menu_item = MY_MENU_LAYOUT[key];
       if (typeof menu_item === 'string') {
           link.innerHTML = menu_item;
           var open_menu = open_links[key];
           if (open_menu) {
               var arrow = $('.menu-1-arrow', open_menu);
               cssClass(open_menu, 'open', false);
               if (arrow) {
                   cssClass(arrow, 'open', false);
                   cssClass(arrow, 'closed', true);
               }
           }
       }
       else {
           if (link.innerText) {
               link.innerText = menu_item[0];
           }
           else {
               link.textContent = menu_item[0];
           }
           var submenu_items = menu_item[1];
           submenu = add('div');
           attr(submenu, {'class': 'menu-2-body', 'style': 'padding-top: 0px'});
           for (var subkey in submenu_items) {
               var sublink = menu_items[subkey];
               if (sublink) {
                   attr(sublink, 'onclick', null, true);
                   var menu3 = add('div', submenu),
                       menu3_cap = add(sublink, menu3);
                   attr(menu3, 'class', 'menu-3');
                   cssClass(menu3_cap, 'menu-2-caption', false);
                   cssClass(menu3_cap, 'menu-3-caption', true);
                   menu3_cap.innerHTML = submenu_items[subkey];
                   var open_menu = open_links[subkey];
                   if (open_menu) {
                       var arrow = $('.menu-1-arrow', open_menu);
                       cssClass(open_menu, 'open', false);
                       if (arrow) {
                           cssClass(arrow, 'open', false);
                           cssClass(arrow, 'closed', true);
                       }
                   }
               }
           };
       }
       var new_menu = add('div', menu_body);
       attr(new_menu, 'class', 'menu-2 open');
       add(link, new_menu);
       if (submenu) add(submenu, new_menu);
   }

   var menu_between = add('div');
   attr(menu_between, 'class', 'menu-between');
   verticalMenu.insertBefore(menu_between, verticalMenu.firstChild);
   verticalMenu.insertBefore(my_menu, verticalMenu.firstChild);
}

})();



