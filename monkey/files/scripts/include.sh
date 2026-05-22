#!/bin/sh

. "$IPKG_INSTROOT/usr/share/libubox/jshn.sh"

HOME_DIR="/etc/monkey"
PROFILES_DIR="$HOME_DIR/profiles"
RUN_DIR="$HOME_DIR/run"
RUN_PROFILE_PATH="$RUN_DIR/config.yaml"
UCODE_DIR="$HOME_DIR/ucode"
INCLUDE_UC="$UCODE_DIR/include.uc"
HIJACK_UT="$UCODE_DIR/hijack.ut"
SH_DIR="$HOME_DIR/scripts"
NFT_DIR="$HOME_DIR/nftables"
GEOIP_CN_NFT="$NFT_DIR/geoip_cn.nft"
GEOIP6_CN_NFT="$NFT_DIR/geoip6_cn.nft"
LOG_DIR="/var/log/monkey"
APP_LOG_PATH="$LOG_DIR/app.log"
CORE_LOG_PATH="$LOG_DIR/core.log"
TEMP_DIR="/var/run/monkey"
PID_FILE_PATH="$TEMP_DIR/monkey.pid"
STARTED_FLAG_PATH="$TEMP_DIR/started.flag"
BRIDGE_NF_CALL_IPTABLES_FLAG_PATH="$TEMP_DIR/bridge_nf_call_iptables.flag"
BRIDGE_NF_CALL_IP6TABLES_FLAG_PATH="$TEMP_DIR/bridge_nf_call_ip6tables.flag"

prepare_files() {
	mkdir -p "$LOG_DIR" 2>/dev/null
	mkdir -p "$TEMP_DIR" 2>/dev/null
	touch "$APP_LOG_PATH" 2>/dev/null
	touch "$CORE_LOG_PATH" 2>/dev/null
}

clear_log() {
	: > "$APP_LOG_PATH"
	: > "$CORE_LOG_PATH"
}

log() {
	echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$1] $2" >> "$APP_LOG_PATH"
}

del_routing() {
	config_load monkey
	local tproxy_route_table tun_route_table
	config_get tproxy_route_table "routing" "tproxy_route_table" "80"
	config_get tun_route_table "routing" "tun_route_table" "81"
	ip -4 rule del table "$tproxy_route_table" 2>/dev/null
	ip -4 rule del table "$tun_route_table" 2>/dev/null
	ip -6 rule del table "$tproxy_route_table" 2>/dev/null
	ip -6 rule del table "$tun_route_table" 2>/dev/null
	ip -4 route flush table "$tproxy_route_table" 2>/dev/null
	ip -4 route flush table "$tun_route_table" 2>/dev/null
	ip -6 route flush table "$tproxy_route_table" 2>/dev/null
	ip -6 route flush table "$tun_route_table" 2>/dev/null
}

del_hijack() {
	nft delete table inet monkey 2>/dev/null || true
}
