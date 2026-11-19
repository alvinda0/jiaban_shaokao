# PowerShell script untuk restore PostgreSQL custom-format dump

$env:PGPASSWORD = "YOUR_PASSWORD"  # Ganti dengan password Render
$env:PGSSLMODE = "require"

pg_restore -h singapore-postgres.render.com `
  -U db_jiaban_shaokao_user `
  -d db_jiaban_shaokao `
  -v src/migrations/shaokaoo.sql

Write-Host "✅ Restore completed"
