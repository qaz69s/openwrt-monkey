// SPDX-License-Identifier: GPL-3.0+
// Monkey — 配置页

'use strict';
'require form';
'require poll';
'require rpc';
'require ui';
'require uci';
'require view';

const callGetStatus = rpc.declare({
	object: 'luci.monkey',
	method: 'getStatus',
	expect: {}
});

const callRestart = rpc.declare({
	object: 'luci.monkey',
	method: 'restart',
	expect: {}
});

return view.extend({
	render: function() {
		var m, s, o;

		m = new form.Map('monkey', 'Monkey',
			'基于 mihomo-rust 的透明代理。');

		// ── 状态栏 ──
		s = m.section(form.TypedSection);
		s.anonymous = true;
		s.render = function() {
			function renderStatusHTML(st) {
				var spanTemp = '<em><span style="color:%s"><strong>%s</strong></span></em>';
				var memInfo = '';
				if (st.memory) {
					memInfo = ' | 内存: ' + st.memory + ' KB';
				}
				if (st.uptime) {
					memInfo += ' | 运行: ' + st.uptime;
				}
				return st.running
					? String.format(spanTemp, 'green', 'Monkey 运行中') + memInfo
					: String.format(spanTemp, 'red', 'Monkey 未运行');
			}
			function checkStatus() {
				return L.resolveDefault(callGetStatus(), {}).then(function(st) {
					var el = document.getElementById('monkey-cfg-status');
					if (el) el.innerHTML = renderStatusHTML(st);
				});
			}
			poll.add(checkStatus, 5);
			checkStatus();
			return E('div', { 'class': 'cbi-section' }, [
				E('p', { id: 'monkey-cfg-status' }, '收集状态中…'),
				E('div', { 'class': 'right' }, [
					E('button', {
						'class': 'btn cbi-button cbi-button-apply',
						'click': function() { callRestart().then(function() { checkStatus(); }); }
					}, '重启服务')
				])
			]);
		};

		// ── 基础设置 ──
		s = m.section(form.NamedSection, 'config', 'config', '基础设置');
		s.anonymous = false;
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', '启用服务',
			'开启后 Monkey 将随系统启动。');
		o.default = '0';
		o.rmempty = false;

		o = s.option(form.Button, 'open_dashboard', '仪表盘');
		o.inputtitle = '打开 Web 面板';
		o.inputstyle = 'action';
		o.onclick = function() {
			var apiPort = '9090';
			try {
				var m = uci.get('monkey', 'mixin', 'api_listen');
				if (m) {
					var parts = m.split(':');
					apiPort = parts[parts.length - 1];
				}
			} catch(e) {}
			window.open('http://' + window.location.hostname + ':' + apiPort + '/ui', '_blank');
		};

		// ── Mixin 配置 ──
		s = m.section(form.NamedSection, 'mixin', 'mixin', '内核配置');
		s.anonymous = false;
		s.addremove = false;

		o = s.option(form.Value, 'tproxy_port', 'TProxy 端口');
		o.datatype = 'range(1,65535)';
		o.default = '7892';
		o.rmempty = false;

		o = s.option(form.Value, 'mixed_port', 'Mixed 端口');
		o.datatype = 'range(1,65535)';
		o.default = '7890';
		o.rmempty = false;

		o = s.option(form.Value, 'api_listen', 'API 监听地址');
		o.default = '[::]:9090';
		o.datatype = 'string';

		o = s.option(form.Value, 'log_level', '日志级别');
		o.datatype = 'list(silent,error,warning,info,debug)';
		o.default = 'warning';

		o = s.option(form.Flag, 'ipv6', 'IPv6 支持');
		o.default = '1';

		// ── 代理设置 ──
		s = m.section(form.NamedSection, 'proxy', 'proxy', '透明代理');
		s.anonymous = false;
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', '启用透明代理');
		o.default = '1';

		o = s.option(form.Flag, 'ipv4_proxy', 'IPv4 代理');
		o.default = '1';

		o = s.option(form.Flag, 'ipv6_proxy', 'IPv6 代理');
		o.default = '1';

		return m.render();
	}
});
