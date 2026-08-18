# Daily server backups

The administrator can save a backup manually from **Admin → Security**. The
timer in this directory calls the same backup implementation every day at
midnight in `Asia/Kolkata`.

Backups contain `production.db` and `.env`. They are compressed and
checksummed, but not encrypted.

## Configure Ubuntu

Add these settings to `/var/www/chopra-capital/.env`:

```dotenv
SERVER_BACKUP_DIR=/var/backups/chopra-capital
SERVER_BACKUP_RETENTION=50
BACKUP_CRON_SECRET=replace-with-the-output-of-openssl-rand-hex-32
```

Create a secret:

```bash
openssl rand -hex 32
```

Create the private backup directory for the same user that runs the website:

```bash
SERVICE_USER="$(systemctl show chopra-capital --property=User --value)"
SERVICE_USER="${SERVICE_USER:-root}"
SERVICE_GROUP="$(id -gn "$SERVICE_USER")"
sudo install -d -m 700 -o "$SERVICE_USER" -g "$SERVICE_GROUP" /var/backups/chopra-capital
```

Install and start the timer:

```bash
cd /var/www/chopra-capital
sudo cp deploy/systemd/chopra-capital-backup.service /etc/systemd/system/
sudo cp deploy/systemd/chopra-capital-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart chopra-capital
sudo systemctl enable --now chopra-capital-backup.timer
```

Run one scheduled backup immediately and verify it:

```bash
sudo systemctl start chopra-capital-backup.service
sudo systemctl status chopra-capital-backup.service --no-pager
sudo systemctl list-timers chopra-capital-backup.timer --no-pager
sudo ls -lah /var/backups/chopra-capital
```

Change the paths or website service name in the unit files if the deployment
uses different values. Copy the backup directory to separate storage
periodically; a backup kept only on the same VPS will not survive complete VPS
or disk loss.
