'use strict';
'require fs';
'require ui';
'require rpc';
'require view';
'require tools.monkey as monkey';

var callFileWrite = rpc.declare({
    object: 'file',
    method: 'write',
    params: ['path', 'data'],
    expect: { result: false }
});

var CSS = '\
*,*::before,*::after{box-sizing:border-box}\
.dke{font-family:var(--font-sans)}\
.dke-wrap{border:1px solid var(--border-color-medium);border-radius:10px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.07);background:var(--background-color-high)}\
.dke-toolbar{display:flex;align-items:center;gap:8px;padding:9px 14px;border-bottom:1px solid var(--border-color-medium);background:var(--background-color-high);flex-wrap:wrap}\
.dke-tb-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:7px;border:1px solid var(--border-color-medium);background:var(--background-color-high);color:var(--text-color-medium);font-size:0.8rem;cursor:pointer;transition:all .15s;white-space:nowrap}\
.dke-tb-btn:hover{border-color:var(--primary-color-high);color:var(--text-color-high)}\
.dke-tb-btn:active{transform:scale(0.96)}\
.dke-info{margin-left:auto;font-size:0.72rem;color:var(--text-color-medium);display:flex;align-items:center;gap:10px}\
.dke-unsaved{color:#f59e0b !important}\
.dke-saved{color:#22c55e !important}\
.dke-fontsize{display:flex;align-items:center;gap:5px;font-size:0.78rem;color:var(--text-color-medium)}\
.dke-fontsize button{width:26px;height:26px;border-radius:5px;border:1px solid var(--border-color-medium);background:var(--background-color-high);color:var(--text-color-medium);cursor:pointer;font-size:1rem;line-height:1;display:flex;align-items:center;justify-content:center;transition:all .12s}\
.dke-fontsize button:hover{border-color:var(--primary-color-high);color:var(--text-color-high)}\
.dke-fontsize button:active{transform:scale(0.92)}\
.dke-editor-box{position:relative}\
.dke-editor-box textarea{display:block;width:100%;min-height:520px;max-height:80vh;padding:14px 16px;background:var(--background-color-low);color:var(--text-color-high);border:1px solid var(--border-color-low);outline:none;resize:vertical;font-family:var(--font-mono);line-height:1.7;tab-size:2;border-radius:0}\
.dke-editor-box textarea:focus{border-color:var(--primary-color-high)}\
.dke-editor-box textarea::-webkit-scrollbar{width:4px}\
.dke-editor-box textarea::-webkit-scrollbar-thumb{background:var(--border-color-medium);border-radius:2px}\
.dke-footer{padding:9px 14px;border-top:1px solid var(--border-color-medium);background:var(--background-color-high)}\
.dke-footer-info{font-size:0.72rem;color:var(--text-color-medium)}\
@media(max-width:540px){.dke-toolbar{padding:8px 10px;gap:6px}.dke-footer{padding:8px 10px}}\
';

return view.extend({
    cfgValue:    '',
    isDirty:     false,
    fontSize:    13,
    taEl:        null,
    _configPath: '',

    handleSaveApply: function () {
        var self = this;
        var val  = self.taEl ? self.taEl.value : self.cfgValue;

        if (!val || !val.trim()) {
            ui.addNotification(null, E('p', _('Configuration cannot be empty!')), 'error');
            return Promise.reject(new Error('empty'));
        }

        return callFileWrite(self._configPath, val)
            .then(function () {
                return fs.exec_direct('/bin/chmod', ['0644', self._configPath])
                    .catch(function () {});
            })
            .then(function () {
                self.isDirty = false;
                var si = document.getElementById('dke-save-indicator');
                if (si) { si.textContent = '✓ ' + _('Saved'); si.className = 'dke-saved'; }
                ui.addNotification(null, E('p', _('Configuration saved, applying...')), 'info');

                monkey.reload()
                    .catch(function () { return monkey.restart(); })
                    .then(function () {
                        ui.addNotification(null, E('p', _('Configuration applied successfully!')), 'success');
                    })
                    .catch(function (e) {
                        var msg = (e && e.message) ? e.message : _('Service reload failed');
                        ui.addNotification(null, E('p', _('Saved but apply failed: %s').format(msg)), 'warning');
                    });
            })
            .catch(function (e) {
                var msg = (e && e.message) ? e.message : String(e);
                ui.addNotification(null, E('p', _('Save failed: %s').format(msg)), 'error');
                return Promise.reject(e);
            });
    },

    load: function () {
        return monkey.getConfigFile().then(function (result) {
            return ['/etc/monkey/run/config.yaml', result.content || ''];
        });
    },

    render: function (result) {
        var self      = this;
        self._configPath = result[0];
        self.cfgValue    = result[1];
        self.isDirty     = false;
        self.fontSize    = 13;

        function countLines(s) { return s.split('\n').length; }

        var linesEl   = E('span', {}, countLines(self.cfgValue) + ' ' + _('Lines'));
        var saveIndEl = E('span', { id: 'dke-save-indicator' }, '');

        var ta = E('textarea', {
            spellcheck: 'false', autocorrect: 'off',
            autocapitalize: 'off', autocomplete: 'off'
        }, self.cfgValue);
        ta.style.fontSize = self.fontSize + 'px';
        self.taEl = ta;

        ta.addEventListener('input', function () {
            self.cfgValue = this.value;
            linesEl.textContent = countLines(this.value) + ' ' + _('Lines');
            if (!self.isDirty) {
                self.isDirty = true;
                saveIndEl.textContent = '● ' + _('Unsaved changes');
                saveIndEl.className   = 'dke-unsaved';
            }
        });

        ta.addEventListener('keydown', function (e) {
            if (e.key !== 'Tab') return;
            e.preventDefault();
            var s = this.selectionStart, en = this.selectionEnd;
            if (e.shiftKey) {
                var ls      = this.value.lastIndexOf('\n', s - 1) + 1;
                var line    = this.value.slice(ls, s);
                var stripped = line.replace(/^(\t|  )/, '');
                var diff    = line.length - stripped.length;
                if (diff > 0) {
                    this.value = this.value.slice(0, ls) + stripped + this.value.slice(ls + line.length);
                    this.selectionStart = this.selectionEnd = s - diff;
                }
            } else {
                this.value = this.value.slice(0, s) + '\t' + this.value.slice(en);
                this.selectionStart = this.selectionEnd = s + 1;
            }
            self.cfgValue = this.value;
        });

        var commentBtn = E('button', { class: 'dke-tb-btn' });
        commentBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> ' + _('Comment');
        commentBtn.addEventListener('click', function () {
            var s  = ta.selectionStart;
            var ls = ta.value.lastIndexOf('\n', s - 1) + 1;
            var le = ta.value.indexOf('\n', s);
            le = le < 0 ? ta.value.length : le;
            var lineText = ta.value.slice(ls, le);
            var newText  = lineText.trimStart().startsWith('#')
                ? lineText.replace(/^(\s*)#\s?/, '$1')
                : lineText.replace(/^(\s*)/, '$1# ');
            ta.value = ta.value.slice(0, ls) + newText + ta.value.slice(le);
            ta.selectionStart = ta.selectionEnd = s + (newText.length - lineText.length);
            self.cfgValue = ta.value;
        });

        var fontSizeSpan = E('span', { style: 'min-width:22px;text-align:center;font-weight:600;' }, String(self.fontSize));
        var fontDecBtn = E('button', { type: 'button' }, '−');
        var fontIncBtn = E('button', { type: 'button' }, '+');
        fontDecBtn.addEventListener('click', function () {
            self.fontSize = Math.max(10, self.fontSize - 1);
            ta.style.fontSize = self.fontSize + 'px';
            fontSizeSpan.textContent = String(self.fontSize);
        });
        fontIncBtn.addEventListener('click', function () {
            self.fontSize = Math.min(22, self.fontSize + 1);
            ta.style.fontSize = self.fontSize + 'px';
            fontSizeSpan.textContent = String(self.fontSize);
        });

        return E('div', { class: 'dke' }, [
            E('style', {}, CSS),
            E('h2', {}, _('Editor')),
            E('div', { class: 'cbi-map' }, [
                E('div', { class: 'dke-wrap' }, [
                    E('div', { class: 'dke-toolbar' }, [
                        commentBtn,
                        E('div', { class: 'dke-fontsize' }, [
                            E('span', {}, _('Font Size')),
                            fontDecBtn, fontSizeSpan, fontIncBtn,
                        ]),
                        E('div', { class: 'dke-info' }, [ linesEl, saveIndEl ]),
                    ]),
                    E('div', { class: 'dke-editor-box' }, [ ta ]),
                    E('div', { class: 'dke-footer' }, [
                        E('span', { class: 'dke-footer-info' },
                            (self._configPath || '') + ' · ' + _('Auto reload on save')),
                    ]),
                ])
            ])
        ]);
    },

    handleSave:  null,
    handleReset: null,
});
