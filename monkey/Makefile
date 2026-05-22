include $(TOPDIR)/rules.mk

PKG_NAME:=monkey
PKG_VERSION:=0.7.6
PKG_RELEASE:=1

PKG_LICENSE:=GPL-3.0+
PKG_MAINTAINER:=Monkey Maintainer

include $(INCLUDE_DIR)/package.mk

# ── 架构映射 ──────────────────────────────────────────
# mihomo-rust releases 提供 x86_64 + aarch64 musl 静态二进制
ifeq ($(ARCH),x86_64)
  MH_ARCH := x86_64-unknown-linux-musl
else ifeq ($(ARCH),aarch64)
  MH_ARCH := aarch64-unknown-linux-musl
else
  MH_ARCH :=
endif

MH_TARBALL := mihomo-$(PKG_VERSION)-$(MH_ARCH).tar.gz
MH_DL_URL  := https://github.com/madeye/mihomo-rust/releases/download/v$(PKG_VERSION)/$(MH_TARBALL)

define Package/monkey
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Transparent Proxy with Mihomo-Rust on OpenWrt
  URL:=https://github.com/qaz69s
  DEPENDS:=+ca-bundle +curl +nftables +kmod-nft-socket +kmod-nft-tproxy
endef

define Package/monkey/description
  Monkey — 基于 mihomo-rust 的透明代理。
  Rust 实现的高性能 Clash Meta 内核，支持 Shadowsocks/Trojan/VLESS，
  TCP TProxy 透明代理和 Clash Meta 规则集。
endef

define Package/monkey/conffiles
/etc/config/monkey
/etc/monkey/mixin.yaml
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	[ -n "$(MH_ARCH)" ] || { \
		echo "Monkey: 不支持的架构 $(ARCH)，支持：x86_64 aarch64" >&2; \
		exit 1; \
	}
	if [ ! -f "$(DL_DIR)/$(MH_TARBALL)" ]; then \
		echo "Monkey: 下载 $(MH_DL_URL)"; \
		curl -fsSL --retry 3 \
			-o "$(DL_DIR)/$(MH_TARBALL).tmp" \
			"$(MH_DL_URL)" \
			&& mv "$(DL_DIR)/$(MH_TARBALL).tmp" "$(DL_DIR)/$(MH_TARBALL)"; \
	fi
	tar -xzf "$(DL_DIR)/$(MH_TARBALL)" -C "$(PKG_BUILD_DIR)"
	mv "$(PKG_BUILD_DIR)/mihomo-$(PKG_VERSION)-$(MH_ARCH)/mihomo" \
	   "$(PKG_BUILD_DIR)/monkey"
endef

define Build/Compile
endef

define Package/monkey/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/monkey $(1)/usr/bin/monkey

	$(INSTALL_DIR) $(1)/etc/monkey
	$(INSTALL_DIR) $(1)/etc/monkey/ucode
	$(INSTALL_DIR) $(1)/etc/monkey/scripts
	$(INSTALL_DIR) $(1)/etc/monkey/nftables
	$(INSTALL_DIR) $(1)/etc/monkey/profiles
	$(INSTALL_DIR) $(1)/etc/monkey/run
	$(INSTALL_DIR) $(1)/etc/monkey/run/providers
	$(INSTALL_DIR) $(1)/etc/monkey/run/providers/rule
	$(INSTALL_DIR) $(1)/etc/monkey/run/providers/proxy

	$(INSTALL_DATA) $(CURDIR)/files/mixin.yaml $(1)/etc/monkey/mixin.yaml

	$(INSTALL_BIN) $(CURDIR)/files/ucode/include.uc $(1)/etc/monkey/ucode/include.uc
	$(INSTALL_BIN) $(CURDIR)/files/ucode/hijack.ut $(1)/etc/monkey/ucode/hijack.ut

	$(INSTALL_BIN) $(CURDIR)/files/scripts/include.sh $(1)/etc/monkey/scripts/include.sh

	$(INSTALL_BIN) $(CURDIR)/files/nftables/geoip_cn.nft $(1)/etc/monkey/nftables/geoip_cn.nft
	$(INSTALL_BIN) $(CURDIR)/files/nftables/geoip6_cn.nft $(1)/etc/monkey/nftables/geoip6_cn.nft

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) $(CURDIR)/files/monkey.conf $(1)/etc/config/monkey

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) $(CURDIR)/files/monkey.init $(1)/etc/init.d/monkey

	$(INSTALL_DIR) $(1)/lib/upgrade/keep.d
	$(INSTALL_DATA) $(CURDIR)/files/monkey.upgrade $(1)/lib/upgrade/keep.d/monkey
endef

define Package/monkey/postrm
#!/bin/sh
if [ -z $${IPKG_INSTROOT} ]; then
	uci -q batch <<-EOF > /dev/null
		del firewall.monkey
		commit firewall
	EOF
	nft delete table inet monkey 2>/dev/null || true
fi
endef

$(eval $(call BuildPackage,monkey))
