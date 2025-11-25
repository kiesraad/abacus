# Abacus deployment on Linux with systemd

Copy the Abacus binary and service file to the system, reload systemd, enable the Abacus service to start on system boot and start it right away:
```
sudo cp abacus /usr/local/bin/abacus
sudo cp abacus.service /etc/systemd/system/abacus.service
sudo chmod +x /usr/local/bin/abacus
sudo systemctl daemon-reload
sudo systemctl enable --now abacus.service
```

View Abacus service status:
```
sudo systemctl status abacus.service
```

View Abacus service logs:
```
sudo journalctl -u abacus.service
```

Stop Abacus service:
```
sudo systemctl stop abacus.service
```

Start Abacus service:
```
sudo systemctl start abacus.service
```

The database is located in `/var/lib/abacus/`.
