# Manual server backups

Automatic backups are not used. Administrators can download `production.db`
and `.env` separately, restore them separately, or save a manual server copy
from **Admin → Security**.

To retain the optional **Save separate server backups** button, configure a
private directory in `/var/www/chopra-capital/.env`:

```dotenv
SERVER_BACKUP_DIR=/var/backups/chopra-capital
SERVER_BACKUP_RETENTION=50
```

Create it for the same user that runs the website:

```bash
SERVICE_USER="$(systemctl show chopra-capital --property=User --value)"
SERVICE_USER="${SERVICE_USER:-root}"
SERVICE_GROUP="$(id -gn "$SERVICE_USER")"
sudo install -d -m 700 -o "$SERVICE_USER" -g "$SERVICE_GROUP" /var/backups/chopra-capital
```

## Disable a previously installed automatic timer

Run these commands once on any server where the old timer was installed:

```bash
sudo systemctl disable --now chopra-capital-backup.timer
sudo systemctl stop chopra-capital-backup.service
sudo rm -f /etc/systemd/system/chopra-capital-backup.timer
sudo rm -f /etc/systemd/system/chopra-capital-backup.service
sudo systemctl daemon-reload
```

Verify that it is gone:

```bash
systemctl is-enabled chopra-capital-backup.timer
systemctl is-active chopra-capital-backup.timer
systemctl list-timers chopra-capital-backup.timer --no-pager
```

Disabling the timer does not delete existing backup files. Copy any manual
backup to separate storage; a backup kept only on the same VPS will not survive
complete VPS or disk loss.
