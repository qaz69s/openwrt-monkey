// SPDX-License-Identifier: GPL-3.0+
// Monkey — 日志页

'use strict';
'require dom';
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
		'  background:var(--bs-tertiary-bg,rgba(127,127,127,.06));',
		'  color:inherit;',
		'  border:1px solid var(--bs-border-color,rgba(127,127,127,.15));',
		'  border-radius:.375rem;',
		'  max-height:68vh;overflow:auto;',
		'}',
		'.monkey-log .log-pane pre{',
		'  padding:.5rem .75rem;margin:0;',
		'  white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;',
		'  font-size:.8125rem;line-height:1.35;',
		'  color:inherit;',
		'}',
		'.monkey-log .log-toolbar{',
		'  display:flex;gap:.5rem;align-items:center;margin-bottom:.5rem;flex-wrap:wrap;',
		'}',
		'.monkey-log .log-toolbar select{width:auto;min-width:120px}',
	].join('\n');
	document.head.appendChild(el);
}

const callLog = rpc.declare({
	object: 'luci.monkey',
	method: 'getLog',
	params: ['type', 'lines'],
	expect: { log: '' }
});

const callClearLog = rpc.declare({
	object: 'luci.monkey',
	method: 'clearLog',
	expect: {}
});

return view.extend({
	render: function() {
		injectCSS();

		var currentType = 'app';

		function getLog(type) {
			return L.resolveDefault(callLog(type, 500), { log: '' });
		}

		function renderLog(content) {
			var pre = document.getElementById('monkey-log-content');
			if (pre) pre.textContent = content || '（无日志）';
		}

		function refreshLog() {
			getLog(currentType).then(function(res) {
				renderLog(res.log || '');
				var pane = document.getElementById('monkey-log-pane');
				if (pane) pane.scrollTop = pane.scrollHeight;
			});
		}

		poll.add(function() {
			return getLog(currentType).then(function(res) {
				renderLog(res.log || '');
			});
		}, 5);

		return E('div', { 'class': 'monkey-log' }, [
			E('div', { 'class': 'log-toolbar' }, [
				E('strong', {}, '日志类型：'),
				E('select', {
					'change': function(ev) {
						currentType = ev.target.value;
						refreshLog();
					}
				}, [
					E('option', { value: 'app' }, '应用日志'),
					E('option', { value: 'core' }, '核心日志'),
				]),
				E('button', {
					'class': 'btn cbi-button cbi-button-action',
					'click': refreshLog
				}, '刷新'),
				E('button', {
					'class': 'btn cbi-button cbi-button-negative',
					'click': function() {
						if (confirm('确定清空日志？')) {
							callClearLog().then(function() { refreshLog(); });
						}
					}
				}, '清空'),
			]),
			E('div', { id: 'monkey-log-pane', 'class': 'log-pane' }, [
				E('pre', { id: 'monkey-log-content' }, '加载中…')
			])
		]);
	}
});
