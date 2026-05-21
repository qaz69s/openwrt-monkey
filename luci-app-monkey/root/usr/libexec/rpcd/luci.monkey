#!/bin/sh
# luci.monkey — rpcd RPC handler

readonly NAME="monkey"
. /usr/share/libubox/jshn.sh

getStatus() {
	local running=0 pid="" uptime=""
	pid=$(pgrep -f "/usr/bin/monkey" 2>/dev/null | head -1)
	[ -n "$pid" ] && running=1
	if [ -n "$pid" ]; then
		local start_time now hz elapsed d h m
		start_time=$(awk '{print $22}' /proc/"$pid"/stat 2>/dev/null)
		now=$(awk '{print int($1)}' /proc/uptime 2>/dev/null)
		if [ -n "$start_time" ] && [ -n "$now" ]; then
			hz=$(getconf CLK_TCK 2>/dev/null || echo 100)
			elapsed=$(( now - start_time / hz ))
			[ "$elapsed" -lt 0 ] && elapsed=0
			d=$(( elapsed / 86400 ))
			h=$(( (elapsed % 86400) / 3600 ))
			m=$(( (elapsed % 3600) / 60 ))
			if [ "$d" -gt 0 ]; then
				uptime="${d}d ${h}h ${m}m"
			elif [ "$h" -gt 0 ]; then
				uptime="${h}h ${m}m"
			else
				uptime="${m}m"
			fi
		fi
	fi

	json_init
	json_add_int running "$running"
	[ -n "$pid" ] && json_add_int pid "$pid"
	[ -n "$uptime" ] && json_add_string uptime "$uptime"

	local mem
	mem=$(awk '/^VmRSS:/{print $2}' /proc/"$pid"/status 2>/dev/null)
	[ -n "$mem" ] && json_add_int memory "${mem%% *}"

	json_dump
	json_cleanup
}

getLog() {
	local lines type
	json_get_var lines "lines"
	json_get_var type "type"
	[ -z "$lines" ] && lines=200
	[ -z "$type" ] && type="app"

	local logfile="/var/log/monkey/${type}.log"
	[ -f "$logfile" ] || logfile="/dev/null"

	json_init
	json_add_string log "$(tail -n "$lines" "$logfile" 2>/dev/null)"
	json_dump
	json_cleanup
}

clearLog() {
	: > /var/log/monkey/app.log 2>/dev/null
	: > /var/log/monkey/core.log 2>/dev/null
	json_init
	json_add_string log ""
	json_dump
	json_cleanup
}

getVersion() {
	local ver=""
	[ -x /usr/bin/monkey ] && ver=$(/usr/bin/monkey version 2>/dev/null | head -1)
	json_init
	json_add_string version "${ver:-unknown}"
	json_dump
	json_cleanup
}

start() {
	/etc/init.d/monkey start
	getStatus
}

stop() {
	/etc/init.d/monkey stop
	getStatus
}

restart() {
	/etc/init.d/monkey restart
	getStatus
}
