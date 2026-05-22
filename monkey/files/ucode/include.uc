'use strict';

import { cursor } from 'uci';

export function uci_bool(val) {
	if (type(val) != 'string') return false;
	return val == '1' || val == 'true' || val == 'yes' || val == 'on';
}

export function uci_array(val) {
	if (type(val) != 'array') return [val];
	return val;
}

export function load_profile() {
	const fs = require('fs');
	const path = '/etc/monkey/run/config.yaml';

	try {
		const content = fs.readfile(path);
		if (!content) return {};
		return json(content);
	} catch (e) {
		return {};
	}
}

export function get_tproxy_port() {
	const uci = cursor();
	return uci.get('monkey', 'mixin', 'tproxy_port') || '7892';
}
