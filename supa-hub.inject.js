// just so I dont have to recode a huge part of the main code
if (window.__SUPA_HUB__) return;
window.__SUPA_HUB__ = true;

window.GM_addStyle = css => {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
};

window.GM_setValue = (k, v) => localStorage.setItem("SUPA_" + k, JSON.stringify(v));
window.GM_getValue = (k, d) => {
    const v = localStorage.getItem("SUPA_" + k);
    return v ? JSON.parse(v) : d;
};

window.unsafeWindow = window;

(function () {
    'use strict';

    let localUser = { username: '', coins: 0, avatar: '', id: '' };
    let allGamesPool = [];
    let currentPath = "";
    let hasEditorAccess = false;

    const DEFAULT_LIB = [
        {
            id: 'root_folder',
            name: 'Default Scripts',
            type: 'folder',
            isOpen: true,
            children: [
                { id: 'def_1', name: 'Basic Template', type: 'script', icon: '📄', json: null }
            ]
        },
        {
            id: 'user_folder',
            name: 'My Saved Scripts',
            type: 'folder',
            isOpen: true,
            children: []
        }
    ];

    let LIBRARY_DATA = GM_getValue('supa_lib_data', DEFAULT_LIB);

    const CONFIG = {
        apiGames: 'https://www.modd.io/api/v1/games/',
        apiCreations: 'https://www.modd.io/api/v1/creations/',
        apiLocalUser: 'https://www.modd.io/api/v1/user/',
        apiPublicUser: 'https://www.modd.io/api/v1/user-by-name/',
        apiGamesByUser: 'https://www.modd.io/api/v1/games-by-user-id/',
        apiEditorCheck: (id) => `https://www.modd.io/api/game/${id}/game-data-for-creators/`,
        logos: {
            big: 'https://cdn.modd.io/_next/static/media/logo.08e05f95.svg',
            small: 'https://cdn.modd.io/_next/static/media/logo-alt.3b46c8b8.svg'
        }
    };

    const SUPA_CSS = `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
        :root { --bg-deep: #060608; --bg-sidebar: rgba(10, 10, 14, 0.98); --accent: #6366f1; --text-main: #f4f4f5; --text-dim: #a1a1aa; --border: rgba(255, 255, 255, 0.08); --glass: rgba(255, 255, 255, 0.04); --green: #22c55e; }
        * { scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--accent); }
        body.supa-active #__next > div > nav, body.supa-active #__next > div > div.flex.flex-col, body.supa-active footer { display: none !important; }
        html.supa-active, body.supa-active { background-color: var(--bg-deep) !important; font-family: 'Plus Jakarta Sans', sans-serif !important; margin: 0 !important; color: var(--text-main); overflow: hidden; }
        #supa-app { position: fixed; inset: 0; z-index: 1000; display: none; background: radial-gradient(circle at 10% 10%, #11111a 0%, #060608 100%); }
        #supa-app.visible { display: flex; }
        .supa-sidebar { width: 260px; background: var(--bg-sidebar); border-right: 1px solid var(--border); padding: 25px 15px; display: flex; flex-direction: column; }
        .supa-logo { width: 110px; margin-bottom: 25px; padding-left: 10px; cursor: pointer; }
        .supa-label { font-size: 10px; font-weight: 800; color: #444; text-transform: uppercase; letter-spacing: 1.5px; margin: 18px 0 6px 12px; }
        .supa-nav-btn { padding: 10px 12px; border-radius: 10px; color: var(--text-dim); text-decoration: none; cursor: pointer; font-weight: 600; transition: 0.2s; display: flex; align-items: center; gap: 12px; font-size: 13.5px; margin-bottom: 2px; }
        .supa-nav-btn:hover { background: var(--glass); color: white; transform: translateX(4px); }
        .supa-nav-btn.active { background: rgba(99, 102, 241, 0.12); color: var(--accent); }
        .sidebar-footer { margin-top: auto; padding: 15px; border-top: 1px solid var(--border); font-size: 12px; color: var(--text-dim); }
        .supa-main-container { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
        .supa-header { height: 80px; padding: 0 50px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .search-input { width: 400px; background: var(--glass); border: 1px solid var(--border); padding: 12px 20px; border-radius: 12px; color: white; outline: none; }
        .supa-profile-area { display: flex; align-items: center; gap: 15px; }
        .supa-coin-wrap { display: flex; align-items: center; gap: 8px; background: var(--glass); padding: 8px 14px; border-radius: 12px; border: 1px solid var(--border); color: white; text-decoration: none; font-weight: 700; font-size: 14px; }
        .supa-content { flex: 1; overflow-y: auto; padding: 40px 50px; scroll-behavior: smooth; transform: translate3d(0,0,0); backface-visibility: hidden; }
        .section-title { font-size: 20px; font-weight: 800; color: white; margin: 40px 0 20px 0; display: flex; align-items: center; gap: 10px; }
        .supa-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .supa-card { background: var(--glass); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; transition: 0.3s; position: relative; }
        .card-img-wrap { position: relative; height: 160px; background: #000; }
        .card-img { width: 100%; height: 100%; object-fit: cover; }
        .info-trigger { position: absolute; top: 12px; left: 12px; width: 28px; height: 28px; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; border: 1px solid rgba(255,255,255,0.1); color: white; font-weight: 800; font-size: 13px; }
        .creator-online { position: absolute; top: 12px; right: 12px; width: 10px; height: 10px; background: var(--green); border-radius: 50%; border: 2px solid black; box-shadow: 0 0 10px var(--green); }
        .card-body { padding: 18px; }
        .card-name { font-weight: 700; font-size: 16px; margin-bottom: 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .card-author { font-size: 12px; color: var(--text-dim); margin-bottom: 12px; }
        .card-stats-row { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; }
        .stat-active { color: var(--accent); text-transform: uppercase; }
        .stat-total { color: #555; }
        .btn-action { width: 100%; margin-top: 15px; background: var(--accent); color: white; border: none; padding: 11px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .btn-action:hover { opacity: 0.9; transform: scale(1.02); }
        .supa-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(8px); z-index: 10000; display: none; align-items: center; justify-content: center; }
        .modal-box { background: #0f0f12; border: 1px solid var(--border); width: 450px; padding: 40px; border-radius: 24px; display:flex; flex-direction:column; gap:15px; }
        #report-editor-window, #report-editor-window .wb-body, #report-editor-window .tailwind, #report-editor-window .editor-background { background-color: #08080a !important; background-image: none !important; font-family: 'Plus Jakarta Sans', sans-serif !important; }
        #report-editor-window .wb-header { background: #0d0d12 !important; border-bottom: 1px solid var(--border) !important; }
        #report-editor-window .tw-bg-gray-700 { background-color: rgba(255, 255, 255, 0.03) !important; backdrop-filter: blur(10px); }
        #report-editor-window .tw-divide-gray-600 > * { border-color: var(--border) !important; }
        #report-editor-window .editor-background.tw-bg-primary-700, #report-editor-window .tw-bg-primary-700 { background-color: var(--accent) !important; }

        .supa-script-lib { width: 300px; background: #08080a; border-right: 1px solid var(--border); display: flex; flex-direction: column; transition: width 0.3s ease; position: relative; z-index: 99; flex-shrink: 0; }
        .supa-script-lib.collapsed { width: 0px; border-right: none; }
        .supa-script-lib.collapsed .supa-lib-header, .supa-script-lib.collapsed .supa-lib-list, .supa-script-lib.collapsed .supa-lib-tools { display: none; }
        .supa-lib-header { padding: 20px; font-weight: 800; font-size: 11px; text-transform: uppercase; color: var(--accent); letter-spacing: 1.2px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .supa-lib-tools { padding: 10px; border-bottom: 1px solid var(--border); display: flex; gap: 8px; background: rgba(255,255,255,0.02); }
        .supa-tool-input { flex: 1; background: #000; border: 1px solid var(--border); color: white; padding: 6px 10px; border-radius: 6px; font-size: 12px; outline: none; }
        .supa-tool-btn { background: var(--glass); border: 1px solid var(--border); color: white; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; font-size:14px; }
        .supa-tool-btn:hover { background: var(--accent); border-color: var(--accent); }
        .supa-lib-list { flex: 1; overflow-y: auto; padding: 15px; }

        .folder-group { margin-bottom: 5px; }
        .folder-header { padding: 8px 10px; cursor: pointer; font-size: 12px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px; opacity: 0.8; user-select: none; }
        .folder-header:hover { opacity: 1; color: var(--accent); }
        .folder-content { padding-left: 12px; display: none; border-left: 1px solid rgba(255,255,255,0.05); margin-left: 9px; }
        .folder-content.open { display: block; }

        .supa-lib-item { padding: 10px; background: var(--glass); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-size: 12px; margin-bottom: 6px; transition: 0.2s; display: flex; align-items: center; gap: 8px; color: #ffffff; font-weight: 600; position: relative; }
        .supa-lib-item:hover { border-color: var(--accent); background: rgba(99, 102, 241, 0.15); transform: translateX(4px); }
        .supa-item-del { position: absolute; right: 10px; opacity: 0; transition: 0.2s; font-size: 12px; }
        .supa-lib-item:hover .supa-item-del { opacity: 0.5; }
        .supa-item-del:hover { opacity: 1 !important; color: #ff4444; }

        .supa-lib-arrow { position: absolute; left: 100%; top: 50%; transform: translateY(-50%); width: 24px; height: 50px; background: #08080a; border: 1px solid var(--border); border-left: none; border-radius: 0 8px 8px 0; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-dim); transition: 0.2s; z-index: 1000; }
        .supa-lib-arrow:hover { color: white; background: var(--accent); }

        .game-editor-widget button { background: var(--bg-sidebar) !important; border: 1px solid var(--border) !important; border-radius: 8px !important; font-family: 'Plus Jakarta Sans' !important; transition: 0.2s !important; }
        .game-editor-widget button:hover { background: var(--glass) !important; border-color: var(--accent) !important; }
        #publish-game-id { background: var(--accent) !important; border: none !important; font-weight: 800 !important; }

        .modal-input { background: #000; border: 1px solid var(--border); color: white; padding: 10px; border-radius: 8px; width: 100%; box-sizing: border-box; font-family: monospace; }
        .modal-textarea { background: #000; border: 1px solid var(--border); color: #a5b3ce; padding: 10px; border-radius: 8px; width: 100%; height: 200px; box-sizing: border-box; font-family: monospace; font-size: 12px; resize: none; white-space: pre; overflow: auto; }
    `;

    async function syncLocalUser() {
        try {
            const res = await fetch(CONFIG.apiLocalUser);
            const json = await res.json();
            if (json.status === "success") {
                localUser = {
                    username: json.data.local.username,
                    coins: Math.floor(json.data.coins || 0),
                    id: json.data._id,
                    avatar: json.data.local.profilePicture || 'https://cache.modd.io/profile/default_profile_picture_human.png'
                };
            }
        } catch (e) { }
    }

    async function checkAccess(gameId) {
        if (!gameId) return false;
        try {
            const res = await fetch(CONFIG.apiEditorCheck(gameId));
            const data = await res.json();
            return data.status !== 'error';
        } catch (e) { return false; }
    }

    function generateScriptKey() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 16; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    function getDefaultScript(name) {
        return {
            "triggers": [],
            "conditions": [
                { "operator": "==", "operandType": "boolean" },
                true,
                true
            ],
            "actions": [],
            "name": name || "New Custom Script",
            "parent": null,
            "key": generateScriptKey()
        };
    }

    async function createScriptFromLibrary(scriptData) {
        const newBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('New Script'));
        if (!newBtn) {
            alert("Please select the Scripts tab first!");
            return;
        }
        newBtn.click();

        let attempts = 0;
        const waitForUI = setInterval(async () => {
            attempts++;
            const select = document.querySelector('select.custom-input');

            if (select || attempts > 20) {
                clearInterval(waitForUI);
                if (!select) return;

                select.value = "2";
                select.dispatchEvent(new Event('change', { bubbles: true }));

                setTimeout(() => {
                    const editorContainer = document.querySelector('.monaco-editor, .ace_editor');
                    const textarea = document.querySelector('.monaco-editor textarea, textarea.ace_text-input');

                    if (textarea && editorContainer) {
                        textarea.focus();
                        const selection = window.getSelection();
                        const range = document.createRange();
                        range.selectNodeContents(editorContainer);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        document.execCommand('delete', false, null);

                        let finalJson = scriptData.json || getDefaultScript(scriptData.name);
                        if (scriptData.json) {
                            finalJson.key = generateScriptKey();
                            finalJson.name = scriptData.name;
                        }
                        const content = JSON.stringify(finalJson, null, 4);

                        if (unsafeWindow.monaco) {
                            const eds = unsafeWindow.monaco.editor.getEditors?.() || [];
                            if (eds[0]?.getModel()) {
                                eds[0].getModel().setValue(content);
                                return;
                            }
                        }

                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                        setTimeout(() => {
                            select.value = "0";
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                        }, 500);
                    }
                }, 600);
            }
        }, 100);
    }

    function saveToStorage() {
        GM_setValue('supa_lib_data', LIBRARY_DATA);
    }

    function deleteScript(scriptId) {
        if (!confirm("Are you sure you want to remove this script from your library?")) return;

        // this wil get the user folder
        const userFolder = LIBRARY_DATA.find(f => f.id === 'user_folder');
        if (userFolder) {
            userFolder.children = userFolder.children.filter(s => s.id !== scriptId);
            saveToStorage();
            renderLibList();
        }
    }

    function addScriptToFolder(folderId, scriptObj) {
        const target = LIBRARY_DATA.find(f => f.id === folderId);
        if (target && target.children) {
            target.children.push(scriptObj);
        } else {
            LIBRARY_DATA[1].children.push(scriptObj);
        }
        saveToStorage();
        renderLibList();
    }

    function collectCurrentScript() {
        if (unsafeWindow.monaco) {
            const eds = unsafeWindow.monaco.editor.getEditors();
            if (eds.length > 0) {
                const val = eds[0].getValue();
                try {
                    const json = JSON.parse(val);
                    const name = prompt("Enter a name for this collected script:", json.name || "Collected Script");
                    const emoji = prompt("Enter an emoji for this script:", "💾") || "💾";
                    if (name) {
                        json.name = name;
                        addScriptToFolder('user_folder', {
                            id: 'saved_' + Date.now(),
                            name: name,
                            type: 'script',
                            icon: emoji,
                            json: json
                        });
                    }
                } catch (e) {
                    alert("Invalid JSON or no script selected. Open a script in the editor first!");
                }
            } else {
                alert("No editor found.");
            }
        }
    }

    function openCustomCreator() {
        const modal = document.createElement('div');
        modal.className = 'supa-modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-box">
                <h3 style="margin:0; color:white;">Create Custom Script</h3>
                <input class="modal-input" id="cust-name" placeholder="Script Name">
                <input class="modal-input" id="cust-icon" placeholder="Emoji Icon (e.g. ⚡)" maxlength="2">
                <textarea class="modal-textarea" id="cust-json" placeholder="Paste JSON here (optional), or leave empty for default template"></textarea>
                <div style="display:flex; gap:10px;">
                    <button class="btn-action" id="cust-save">Save to Library</button>
                    <button class="btn-action" style="background:#222;" id="cust-cancel">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('cust-cancel').onclick = () => modal.remove();
        document.getElementById('cust-save').onclick = () => {
            const name = document.getElementById('cust-name').value || "Untitled Script";
            const icon = document.getElementById('cust-icon').value || "🛠";
            let content = document.getElementById('cust-json').value;
            let json = null;

            if (content.trim()) {
                try {
                    json = JSON.parse(content);
                } catch (e) {
                    alert("Invalid JSON!");
                    return;
                }
            }

            addScriptToFolder('user_folder', {
                id: 'custom_' + Date.now(),
                name: name,
                type: 'script',
                icon: icon,
                json: json
            });
            modal.remove();
        };
    }

    function renderLibList(filter = '') {
        const list = document.querySelector('.supa-lib-list');
        if (!list) return;
        list.innerHTML = '';

        const renderItems = (items, container, isUserFolder = false) => {
            items.forEach(item => {
                if (filter && item.type === 'script' && !item.name.toLowerCase().includes(filter.toLowerCase())) return;

                if (item.type === 'folder') {
                    const group = document.createElement('div');
                    group.className = 'folder-group';

                    const header = document.createElement('div');
                    header.className = 'folder-header';
                    header.innerHTML = `<span>${item.isOpen ? '📂' : '📁'}</span> ${item.name}`;
                    header.onclick = () => {
                        item.isOpen = !item.isOpen;
                        saveToStorage();
                        renderLibList(filter);
                    };

                    const content = document.createElement('div');
                    content.className = 'folder-content' + (item.isOpen || filter ? ' open' : '');

                    if (item.children && item.children.length > 0) {
                        renderItems(item.children, content, item.id === 'user_folder');
                    } else {
                        content.innerHTML = '<div style="font-size:10px; opacity:0.3; padding:5px;">Empty</div>';
                    }

                    group.appendChild(header);
                    group.appendChild(content);
                    container.appendChild(group);
                } else {
                    const el = document.createElement('div');
                    el.className = 'supa-lib-item';
                    el.innerHTML = `<span>${item.icon || '📄'}</span> <span>${item.name}</span>`;

                    if (isUserFolder) {
                        const delBtn = document.createElement('span');
                        delBtn.className = 'supa-item-del';
                        delBtn.innerHTML = '🗑️';
                        delBtn.title = 'Remove Script';
                        delBtn.onclick = (e) => {
                            e.stopPropagation();
                            deleteScript(item.id);
                        };
                        el.appendChild(delBtn);
                    }

                    el.onclick = () => createScriptFromLibrary(item);
                    container.appendChild(el);
                }
            });
        };

        renderItems(LIBRARY_DATA, list);
    }

    function injectLibrary() {
        const target = document.querySelector('#editor-script-entity-world-script');
        if (!target || target.parentElement.querySelector('.supa-script-lib')) return;

        const parent = target.parentElement;
        parent.style.display = 'flex';
        parent.style.flexDirection = 'row';

        const lib = document.createElement('div');
        lib.className = 'supa-script-lib';
        lib.innerHTML = `
            <div class="supa-lib-arrow" title="Toggle Library">◀</div>
            <div class="supa-lib-header">
                Supa Library
                <span style="font-size:9px; opacity:0.5;">v3.1</span>
            </div>
            <div class="supa-lib-tools">
                <input class="supa-tool-input" placeholder="Search scripts..." id="lib-search">
                <div class="supa-tool-btn" id="btn-create" title="Create New">+</div>
                <div class="supa-tool-btn" id="btn-collect" title="Collect Current">⬇</div>
            </div>
            <div class="supa-lib-list"></div>
        `;

        parent.insertBefore(lib, target);
        target.style.flex = "1";
        target.style.width = "auto";

        const arrow = lib.querySelector('.supa-lib-arrow');
        arrow.onclick = () => {
            lib.classList.toggle('collapsed');
            arrow.innerText = lib.classList.contains('collapsed') ? '▶' : '◀';
        };

        document.getElementById('lib-search').oninput = (e) => renderLibList(e.target.value);
        document.getElementById('btn-collect').onclick = collectCurrentScript;
        document.getElementById('btn-create').onclick = openCustomCreator;

        renderLibList();
    }

    function buildApp() {
        if (document.getElementById('supa-app')) return;

        const app = document.createElement('div');
        app.id = 'supa-app';
        app.innerHTML = `
            <div class="supa-sidebar">
                <img src="${CONFIG.logos.big}" class="supa-logo" onclick="location.href='/'">
                <div class="supa-label">Supa Hub</div>
                <div class="supa-nav-btn" data-view="discover">🏠 Discover</div>
                <div class="supa-nav-btn" data-view="trending">🔥 Trending</div>
                <div class="supa-nav-btn" data-view="updated">⭐ Recently Updated</div>
                <div class="supa-label">Dashboard</div>
                <div class="supa-nav-btn" data-view="create">🛠 My Projects</div>
                <a class="supa-nav-btn" href="/pricing/">💰 Pricing</a>
                <a class="supa-nav-btn" href="https://discord.gg/XRe8T7K" target="_blank">💬 Discord</a>
                <div class="sidebar-footer">
                    <div style="margin-bottom:8px; font-weight:800; color:white;">Made by Kktrxs</div>
                    <div style="opacity:0.6;">Modd.io UI ReImagined :)</div>
                </div>
            </div>
            <div class="supa-main-container">
                <div class="supa-header">
                    <input type="text" class="search-input" id="supa-search" placeholder="Search games or creators...">
                    <div class="supa-profile-area" id="header-profile"></div>
                </div>
                <div class="supa-content" id="supa-view"></div>
            </div>
            <div class="supa-modal" id="info-modal"><div class="modal-box">
                <h2 id="modal-title" style="margin-top:0; color:white;"></h2>
                <p id="modal-desc" style="color:var(--text-dim); font-size:14px; line-height:1.6;"></p>
                <div id="modal-stats" style="margin-top:25px; display:grid; grid-template-columns:1fr 1fr; gap:15px; font-size:13px; color:white;"></div>
                <button onclick="document.getElementById('info-modal').style.display='none'" class="btn-action" style="background:#222;">Close Info</button>
            </div></div>
        `;
        document.body.appendChild(app);

        document.getElementById('header-profile').innerHTML = `
            <a href="/user/${localUser.username}/coins/summary/" class="supa-coin-wrap">
                <img src="https://cdn.modd.io/_next/static/media/coin.48d19fc3.svg" width="18"> ${localUser.coins}
            </a>
            <a href="/user/${localUser.username}/">
                <img src="${localUser.avatar}" style="width:42px; height:42px; border-radius:10px; border:1px solid var(--border);">
            </a>
        `;

        document.querySelectorAll('.supa-nav-btn[data-view]').forEach(btn => {
            btn.onclick = () => {
                const v = btn.dataset.view;
                if (v === 'create') history.pushState(null, null, '/create/');
                else history.pushState(null, null, '/');
                render(v);
            };
        });

        document.getElementById('supa-search').oninput = (e) => {
            const q = e.target.value.toLowerCase();
            const container = document.getElementById('supa-view');
            if (q.length > 0) {
                const filter = allGamesPool.filter(g => g.title?.toLowerCase().includes(q) || g.owner?.local?.username?.toLowerCase().includes(q));
                container.innerHTML = '';
                drawGrid(container, "Search Results", filter);
            } else render();
        };
    }

    async function render(viewOverride = null) {
        const path = location.pathname;
        const app = document.getElementById('supa-app');

        if (path.startsWith('/play/')) {
            const gid = unsafeWindow.gameId;
            if (gid) {
                hasEditorAccess = await checkAccess(gid);
                if (hasEditorAccess) {
                    document.body.classList.add('supa-editor-active');
                }
            }
            return;
        }

        const isSupported = (path === "/" || path === "/create/" || path.startsWith("/user/"));

        if (!isSupported) {
            document.body.classList.remove('supa-active');
            document.documentElement.classList.remove('supa-active');
            if (app) app.classList.remove('visible');
            return;
        }

        document.body.classList.add('supa-active');
        document.documentElement.classList.add('supa-active');
        if (app) app.classList.add('visible');

        const container = document.getElementById('supa-view');
        if (!container) return;

        const view = viewOverride || (path === '/create/' ? 'create' : path.startsWith('/user/') ? 'profile' : 'discover');
        document.querySelectorAll('.supa-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
        container.innerHTML = `<h2 style="opacity:0.1; text-align:center; margin-top:100px;">Synchronizing...</h2>`;

        try {
            if (view === 'profile') {
                const name = path.split('/')[2];
                const uRes = await fetch(CONFIG.apiPublicUser + name);
                const uJson = await uRes.json();
                const gRes = await fetch(CONFIG.apiGamesByUser + uJson.data._id);
                const games = await gRes.json();

                container.innerHTML = `
                    <div style="background:var(--glass); border:1px solid var(--border); border-radius:24px; padding:40px; display:flex; align-items:center; gap:35px; margin-bottom:40px;">
                        <img src="${uJson.data.local.profilePicture}" style="width:120px; height:120px; border-radius:20px; border:2px solid var(--accent); object-fit:cover;">
                        <div>
                            <h1 style="margin:0; font-size:32px;">${uJson.data.local.username}</h1>
                            <p style="color:var(--text-dim); margin:10px 0 20px 0;">${uJson.data.local.bio || 'Professional Goober'}</p>
                            <div style="display:flex; gap:30px;">
                                <div><div style="font-size:20px; font-weight:800;">${games.length}</div><div style="font-size:11px; color:var(--text-dim); text-transform:uppercase;">Creations</div></div>
                                <div><div style="font-size:20px; font-weight:800;">${games.reduce((a, b) => a + (b.totalPlayCount || 0), 0).toLocaleString()}</div><div style="font-size:11px; color:var(--text-dim); text-transform:uppercase;">Total Plays</div></div>
                            </div>
                        </div>
                    </div>
                `;
                drawGrid(container, "Games by " + uJson.data.local.username, games);

            } else if (view === 'create') {
                const res = await fetch(CONFIG.apiCreations);
                const data = await res.json();
                container.innerHTML = `<h1 style="margin-bottom:30px;">Project Dashboard</h1>`;
                drawGrid(container, "My Games", data.games.filter(g => !g.isGameContributor), true);
                if (data.invitedGames && data.invitedGames.length > 0) {
                    drawGrid(container, "Shared with Me", data.invitedGames, true);
                }
            } else {
                const res = await fetch(CONFIG.apiGames);
                const shelves = await res.json();
                container.innerHTML = '';
                const gameMap = new Map();
                shelves.forEach(s => {
                    if (s.games) s.games.forEach(g => gameMap.set(g._id, g));
                });
                allGamesPool = Array.from(gameMap.values());

                if (view === 'updated') {
                    const sorted = [...allGamesPool].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 20);
                    drawGrid(container, "Recently Updated Games", sorted);
                } else if (view === 'trending') {
                    const trending = [...allGamesPool].sort((a, b) => (b.playerCount || 0) - (a.playerCount || 0)).slice(0, 25);
                    drawGrid(container, "Trending Now (Active Players)", trending);
                } else {
                    shelves.slice(0, 5).forEach(s => drawGrid(container, s.title, s.games));
                }
            }
        } catch (e) { }
    }

    function drawGrid(parent, title, games, isEdit = false) {
        if (!games || games.length === 0) return;
        const section = document.createElement('div');
        section.innerHTML = `<div class="section-title">${title} <span style="opacity:0.2; font-size:14px; margin-left:10px;">(${games.length})</span></div><div class="supa-grid"></div>`;
        const grid = section.querySelector('.supa-grid');

        games.forEach(g => {
            const card = document.createElement('div');
            card.className = 'supa-card';
            const hasPlayers = (g.playerCount || 0) > 0;
            const statHtml = hasPlayers
                ? `<span class="stat-active">${g.playerCount} PLAYING</span>`
                : `<span class="stat-total">${(g.totalPlayCount || 0).toLocaleString()} PLAYS</span>`;

            card.innerHTML = `
                <div class="card-img-wrap">
                    <div class="info-trigger" title="View Info">i</div>
                    ${g.isOwnerInGame ? '<div class="creator-online" title="Creator is in-game!"></div>' : ''}
                    <img src="${g.cover}" class="card-img" onerror="this.src='${CONFIG.logos.small}'">
                </div>
                <div class="card-body">
                    <div class="card-name">${g.title}</div>
                    <div class="card-author">by ${g.owner?.local?.username || 'Unknown'}</div>
                    <div class="card-stats-row">${statHtml}</div>
                    <button class="btn-action" onclick="location.href='/play/${g.gameSlug}'">${isEdit ? 'OPEN EDITOR' : 'PLAY GAME'}</button>
                </div>
            `;
            card.querySelector('.info-trigger').onclick = (e) => { e.stopPropagation(); showInfo(g); };
            grid.appendChild(card);
        });
        parent.appendChild(section);
    }

    function showInfo(game) {
        const modal = document.getElementById('info-modal');
        document.getElementById('modal-title').innerText = game.title;
        document.getElementById('modal-desc').innerText = game.description || "No description provided.";
        document.getElementById('modal-stats').innerHTML = `
            <div><b>Engine:</b> ${game.engineVersion || '2.0'}</div>
            <div><b>Tier:</b> ${game.tier || 'Standard'}</div>
            <div><b>Updated:</b> ${new Date(game.updatedAt).toLocaleDateString()}</div>
        `;
        modal.style.display = 'flex';
    }

    GM_addStyle(SUPA_CSS);
    syncLocalUser().then(() => {
        setInterval(() => {
            if (location.pathname !== currentPath) {
                currentPath = location.pathname;
                buildApp();
                render();
            }
            if (location.pathname.startsWith('/play/')) {
                if (location.hash.includes('world-script')) {
                    injectLibrary();
                }
            }
        }, 800);
    });

})();