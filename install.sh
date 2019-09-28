systemctl --user disable bbox.service
cp bbox.service ~/.config/systemd/user/
systemctl --user enable bbox.service
systemctl --user start bbox.service
systemctl --user status bbox.service
