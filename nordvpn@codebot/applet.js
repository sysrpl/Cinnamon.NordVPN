const Lang = imports.lang;
const Applet = imports.ui.applet;
const GLib = imports.gi.GLib;
const Settings = imports.ui.settings;
const MainLoop = imports.mainloop;
const UUID = "nordvpn@codebot";

function NordVPNApplet(metadata, orientation, instance_id) {
    this._init(metadata, orientation, instance_id);
}

NordVPNApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(metadata, orientation, instance_id) {
		Applet.IconApplet.prototype._init.call(this, orientation);

		this.is_connected = null;
		this.process = null;
		this.icon_changing = metadata.path + '/icon-changing.png';
		this.icon_connected = metadata.path + '/icon-connected.png';
		this.icon_disconnected = metadata.path + '/icon-disconnected.png';
		this.service_is_installed = false;
		this.set_applet_icon_path(this.icon_changing);
		this.actor.connect('button-release-event', Lang.bind(this, this._onButtonReleaseEvent));
		this._run();
    },

    _onButtonReleaseEvent: function(actor, event) {
        if (this._applet_enabled && this.process == null) {
            if (event.get_button() == 1) {
                if (!this._draggable.inhibit)
                    return false;
				if (!this.service_is_installed) {
					this._getConnectionStatus();
					if (!this.service_is_installed)
						return false;
				}
				this.set_applet_icon_path(this.icon_changing);
				this.set_applet_tooltip("Status: Changing\nPlease wait...");
				let command = "nordvpn " + (this.is_connected ? "d" : "c");
				this.process = MainLoop.timeout_add(2500, Lang.bind(this, this._onTimerAction));
				GLib.spawn_command_line_async(command, this._getConnectionStatus);
            }
        }
        return true;
    },

    _onTimerAction: function() {
        if (this._getConnectionStatus()) {
            MainLoop.source_remove(this.process);
            this.process = null;
        } else
            this.process = MainLoop.timeout_add(2500, Lang.bind(this, this._onTimerAction));
    },

    _getConnectionStatus: function() {
        let status;
        let location = GLib.spawn_command_line_sync("which nordvpn").toString();
		this.service_is_installed = location.indexOf("nordvpn") > -1;
		if (!this.service_is_installed) {
			this.set_applet_icon_path(this.icon_disconnected);
			this.set_applet_tooltip("You need to install nordvpn to use this applet");
			return false;
		}
		status = GLib.spawn_command_line_sync("nordvpn status").toString();
        let is_connected = status.indexOf("Disconnected") == -1;
        if (is_connected === this.is_connected)
            return false;
        this.is_connected = is_connected;
        if (is_connected) {
            this.set_applet_tooltip("Status: Connected\nClick to disconnect");
            this.set_applet_icon_path(this.icon_connected);
        } else {
            this.set_applet_tooltip("Status: Disconnected\nClick to connect");
			this.set_applet_icon_path(this.icon_disconnected);
        }
        return true;
    },

    _run: function() {
        if (this.process == null)
            this._getConnectionStatus();
        MainLoop.timeout_add(60000, Lang.bind(this, this._run));
    }
};

function main(metadata, orientation, panel_height, instance_id) {
    return new NordVPNApplet(metadata, orientation, instance_id);
}
