# Configuração NGINX Global da VPS

Este projeto está configurado para usar o NGINX global da VPS ao invés de um container NGINX dedicado.

## Estrutura de Arquivos

- `vps-site.conf` - Configuração para o NGINX global da VPS (use este!)
- `nginx.conf` - (OBSOLETO) Configuração antiga do container NGINX
- `nginx-initial.conf` - (OBSOLETO) Configuração inicial antiga

## Como Configurar

### 1. Deploy da Aplicação

```bash
./deploy-vps.sh
```

Isso irá:
- Construir e iniciar o container Docker da aplicação
- Expor a aplicação na porta 4000 (localhost apenas)

### 2. Configurar NGINX Global

```bash
# Copiar configuração para o NGINX
sudo cp nginx/vps-site.conf /etc/nginx/sites-available/clicksaudeagendamento-backend

# Criar link simbólico
sudo ln -sf /etc/nginx/sites-available/clicksaudeagendamento-backend /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar NGINX
sudo systemctl reload nginx
```

### 3. Configurar SSL (se ainda não tiver)

```bash
# Instalar Certbot (se necessário)
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d api.clicksaudeagendamento.com.br

# Certbot irá configurar automaticamente o SSL
```

### 4. Renovação Automática do SSL

O Certbot cria um cron job automaticamente. Verifique:

```bash
sudo systemctl status certbot.timer
```

## Verificações

```bash
# Status do container
docker compose ps

# Logs da aplicação
docker compose logs -f

# Status do NGINX
sudo systemctl status nginx

# Testar porta local
curl http://localhost:4000
```

## Troubleshooting

### Aplicação não responde
```bash
docker compose logs -f
docker compose restart
```

### NGINX com erro
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/clicksaudeagendamento-backend-error.log
```

### SSL não funciona
```bash
sudo certbot renew --dry-run
sudo certbot certificates
```
