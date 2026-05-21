'use strict';
'require dom';
'require fs';
'require poll';
'require rpc';
'require ui';
'require view';

function injectCSS() {
    if (document.getElementById('monkey-log-css')) return;
    var el = document.createElement('style');
    el.id = 'monkey-log-css';
    el.textContent = [
        '.monkey-log .log-pane{',
        '  font-family:var(--bs-font-monospace,monospace);',
        '  background:rgba(127,127,127,.08);',
        '  color:inherit;',
        '  border:1px solid rgba(127,127,127,.18);',
        '  border-radius:.375rem;',
        '  max-height:68vh;overflow:auto;',
        '}',
        '.monkey-log .log-pane pre{',
        '  padding:.5rem .75rem;margin:0;',
        '  white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;',
        '  font-size:.8125rem;line-height:1.35;',
        '  color:inherit;',
        '}',
        '.monkey-log .log-pane .log-line{',
        '  display:flex;gap:.2rem;padding:0;',
        '  align-items:baseline;',
        '}',
        '.monkey-log .log-pane .log-line .src{',
        '  flex-shrink:0;font-size:.6rem;font-weight:600;',
        '  padding:0 .3rem;border-radius:2px;',
        '  opacity:.65;line-height:1.5;',
        '  min-width:2.2rem;text-align:center;',
        '}',
        '.monkey-log .log-pane .log-line .lvl{',
        '  flex-shrink:0;font-size:.65rem;font-weight:700;',
        '  padding:0 .35rem;border-radius:3px;',
        '  text-transform:uppercase;line-height:1.5;',
        '  min-width:2.8rem;text-align:center;',
        '}',
        '.monkey-log .log-pane .log-line .lvl-info{',
        '  background:rgba(137,180,250,.18);color:#89b4fa;',
        '}',
        '.monkey-log .log-pane .log-line .lvl-warn{',
        '  background:rgba(250,179,135,.18);color:#fab387;',
        '}',
        '.monkey-log .log-pane .log-line .lvl-error{',
        '  background:rgba(243,139,168,.18);color:#f38ba8;',
        '}',
        '.monkey-log .log-pane .log-line .lvl-debug{',
        '  background:rgba(166,173,200,.15);color:#6c7086;',
        '}',
        '.monkey-log .log-pane .log-line .lvl-other{',
        '  background:rgba(127,127,127,.12);color:inherit;',
        '}',
        '.monkey-log .log-pane .log-line .msg{flex:1;min-width:0;}',
        '.monkey-log .log-pane .log-line .msg mark{',
        '  background:rgba(255,193,7,.40);color:inherit;',
        '  border-radius:2px;padding:0 2px;',
        '}',
        '.monkey-log .log-bar{',
        '  display:flex;align-items:center;gap:.5rem;',
        '  padding:.375rem 0;flex-wrap:wrap;',
        '}',
        '.monkey-log .log-bar .spacer{flex:1}',
        '.monkey-log .log-bar input[type=search]{',
        '  width:120px;height:25px;flex:none;padding:0 .5rem;',
        '  border:1px solid rgba(127,127,127,.18);',
        '  border-radius:.25rem;',
        '  background:rgba(127,127,127,.08);color:inherit;',
        '  font-size:.75rem;',
        '}',
        '.monkey-log .log-bar input[type=search]:focus{',
        '  outline:2px solid rgba(137,180,250,.5);',
        '}',
        '.monkey-log .log-btn{',
        '  display:inline-flex;align-items:center;gap:.25rem;',
        '  padding:.25rem .5rem;border-radius:.25rem;cursor:pointer;',
        '  border:1px solid rgba(127,127,127,.18);',
        '  background:rgba(127,127,127,.08);color:inherit;',
        '  font-size:.75rem;user-select:none;',
        '}',
        '.monkey-log .log-btn:hover{background:rgba(127,127,127,.15)}',
        '.monkey-log .log-btn.active{',
        '  background:rgba(64,160,43,.18);border-color:rgba(64,160,43,.35);',
        '}',
        '.monkey-log .log-btn.danger:hover{',
        '  background:rgba(243,139,168,.25);border-color:rgba(243,139,168,.4);',
        '}',
        '.monkey-log .log-btn svg{width:14px;height:14px;flex-shrink:0}',
        '.monkey-log .log-muted{opacity:.55;font-style:italic;font-size:.75rem}',
        '.monkey-log .log-stat{font-size:.75rem;opacity:.7}',
        '.monkey-log .log-stat strong{opacity:1;font-weight:700}',
    ].join('');
    document.head.appendChild(el);
}

var ICONS = {
    reverse: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 3v10M2 6l3-3 3 3"/><path d="M11 13V3M8 10l3 3 3-3"/></svg>',
    play: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2v12l10-6z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1"/><rect x="9" y="2" width="4" height="12" rx="1"/></svg>',
    trash: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 4h12M5.3 4V2.7a.7.7 0 01.7-.7h4a.7.7 0 01.7.7V4M6 7v5M10 7v5M3.5 4l.9 9.3a1 1 0 001 .7h5.2a1 1 0 001-.7l.9-9.3"/></svg>',
};

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseLine(raw) {
    raw = raw.replace(/^\s+/, '');
    var lc = raw.toLowerCase();
    if (lc.indexOf('error') !== -1 && (lc.indexOf('[error]') !== -1 || lc.indexOf('error:') !== -1))
        return { level: 'error', msg: raw };
    if (lc.indexOf('warn') !== -1 && (lc.indexOf('[warn]') !== -1 || lc.indexOf('warn:') !== -1 || lc.indexOf('warning') !== -1))
        return { level: 'warn', msg: raw };
    if (lc.indexOf('debug') !== -1 && (lc.indexOf('[debug]') !== -1 || lc.indexOf('debug:') !== -1))
        return { level: 'debug', msg: raw };
    return { level: 'info', msg: raw };
}

var SRC_LABELS = { app: 'APP', core: 'CORE' };

function buildLine(src, parsed, query) {
    var lvl = parsed.level;
    var srcLabel = SRC_LABELS[src] || src.toUpperCase();
    var msg = esc(parsed.msg);
    if (query && query.length >= 2) {
        var q = esc(query);
        var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        msg = msg.replace(re, '<mark>$1</mark>');
    }
    return '<div class="log-line">' +
        '<span class="src">' + srcLabel + '</span>' +
        '<span class="lvl lvl-' + lvl + '">' + (lvl === 'warn' ? 'warn' : lvl) + '</span>' +
        '<span class="msg">' + msg + '</span>' +
        '</div>';
}

function filterLines(lines, query) {
    if (!query || query.length < 2) return lines;
    var q = query.toLowerCase();
    return lines.filter(function (item) {
        return item.raw.toLowerCase().indexOf(q) !== -1;
    });
}

var clearLogRpc = rpc.declare({
    object: 'luci.monkey',
    method: 'clearAllLogs',
    expect: { success: false }
});

return view.extend({
    __pollHandle: null,
    __paused: false,
    __reverse: true,
    __logLines: [],
    __searchQuery: '',
    __maxLines: 500,

    load: function () {
        return Promise.resolve();
    },

    render: function () {
        injectCSS();
        var self = this;

        var logPre = E('pre', { id: 'monkey-log-content' });
        var logPane = E('div', { 'class': 'log-pane' }, [logPre]);
        var statusEl = E('span', { 'class': 'log-stat', id: 'monkey-log-status' }, '--');

        var searchInput = E('input', {
            type: 'search', placeholder: '搜索日志…', id: 'monkey-log-search',
            input: function () {
                self.__searchQuery = this.value;
                self.__renderLog();
            }
        });

        var revBtn = E('button', {
            'class': 'log-btn active',
            title: '倒序（最新在前）', id: 'monkey-log-reverse',
            click: function () {
                self.__reverse = !self.__reverse;
                this.classList.toggle('active', self.__reverse);
                this.title = self.__reverse ? '倒序（最新在前）' : '正序（最早在前）';
                self.__renderLog();
            }
        });
        revBtn.innerHTML = ICONS.reverse;

        var pauseBtn = E('button', {
            'class': 'log-btn', title: '暂停刷新', id: 'monkey-log-pause',
            click: function () {
                self.__paused = !self.__paused;
                this.classList.toggle('active', self.__paused);
                this.innerHTML = self.__paused ? ICONS.play : ICONS.pause;
                this.title = self.__paused ? '恢复刷新' : '暂停刷新';
                if (!self.__paused) self.__fetchLog();
            }
        });
        pauseBtn.innerHTML = ICONS.pause;

        var clearBtn = E('button', {
            'class': 'log-btn danger', title: '清空日志', id: 'monkey-log-clear',
            click: function () {
                self.__logLines = [];
                self.__renderLog();
                return clearLogRpc().then(function (result) {
                    if (result && result.success) return self.__fetchLog();
                });
            }
        });
        clearBtn.innerHTML = ICONS.trash;

        var toolbar = E('div', { 'class': 'log-bar' }, [
            searchInput, revBtn, pauseBtn, clearBtn,
            E('span', { 'class': 'spacer' }),
            statusEl,
            E('span', { 'class': 'log-muted' }, '每 ' + (L.env.pollinterval || '3') + ' 秒刷新 ｜ 上限 ' + self.__maxLines + ' 行')
        ]);

        var root = E('div', { 'class': 'cbi-map monkey-log' }, [
            E('h2', {}, '运行日志'),
            E('div', { 'class': 'cbi-section' }, [toolbar, logPane])
        ]);

        self.__pollHandle = poll.add(function () {
            return self.__fetchLog();
        });

        self.__fetchLog();

        return root;
    },

    __fetchLog: function () {
        var self = this;
        var rpcLogs = rpc.declare({ object: 'luci.monkey', method: 'getAllLogs', expect: { '': {} } });
        return L.resolveDefault(rpcLogs(), { app: '', core: '' }).then(function (data) {
            var lines = [];
            function addLines(src, text) {
                var parts = (text || '').split('\n');
                for (var i = 0; i < parts.length; i++) {
                    var l = parts[i].trim();
                    if (l) lines.push({ src: src, raw: l });
                }
            }
            addLines('app', data.app);
            addLines('core', data.core);
            if (lines.length > self.__maxLines) lines = lines.slice(-self.__maxLines);
            self.__logLines = lines;
            if (!self.__paused) self.__renderLog();
        }).catch(function (e) {
            self.__logLines = [{ src: 'app', raw: '读取日志失败: ' + (e.message || e) }];
            self.__renderLog();
        });
    },

    __renderLog: function () {
        var el = document.getElementById('monkey-log-content');
        if (!el) return;

        var query = this.__searchQuery;
        var raw = query ? filterLines(this.__logLines, query) : this.__logLines;
        if (this.__reverse) raw = raw.slice().reverse();

        var html = [];
        for (var i = 0; i < raw.length; i++) {
            if (!raw[i] || !raw[i].raw) continue;
            var parsed = parseLine(raw[i].raw);
            html.push(buildLine(raw[i].src, parsed, query));
        }

        el.innerHTML = html.length
            ? html.join('\n')
            : '<div style="padding:.75rem;opacity:.5;font-style:italic">无匹配日志</div>';

        var pane = el.parentNode;
        if (pane && this.__reverse) pane.scrollTop = 0;

        var st = document.getElementById('monkey-log-status');
        if (st) {
            var shown = raw.filter(function (l) { return l && l.raw && l.raw.trim(); }).length;
            var total = this.__logLines.filter(function (l) { return l && l.raw && l.raw.trim(); }).length;
            st.innerHTML = query
                ? '筛选 <strong>' + shown + '</strong> / ' + total + ' 行'
                : (this.__paused ? '共 <strong>' + total + '</strong> 行（已暂停）' : '共 <strong>' + total + '</strong> 行');
        }
    },

    handleReset: null,
    handleSave: null,
    handleSaveApply: null
});
