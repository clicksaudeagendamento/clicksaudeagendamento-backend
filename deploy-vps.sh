#!/bin/bash

# Script de Deploy para VPS - clicksaudeagendamento-backend
# Este script configura e faz deploy da aplicação na VPS com NGINX global

set -e

echo "==================================="
echo "  clicksaudeagendamento-backend - Deploy VPS"
echo "==================================="

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para print colorido
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

# 1. Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    print_error "Arquivo .env não encontrado!"
    print_info "Copie o arquivo .env.production.example para .env e configure as variáveis"
    echo "cp .env.production.example .env"
    exit 1
fi

# 2. Verificar variáveis críticas
print_info "Verificando variáveis de ambiente..."
if grep -q "TROQUE_POR" .env; then
    print_warning "Algumas variáveis ainda possuem valores de exemplo!"
    print_warning "Por favor, edite o arquivo .env antes de continuar"
    read -p "Deseja continuar mesmo assim? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

# 3. Parar containers antigos se existirem
print_info "Parando containers antigos..."
docker compose down || true

# 4. Limpar recursos não utilizados
print_info "Limpando recursos Docker não utilizados..."
docker system prune -f

# 5. Build da imagem
print_info "Construindo imagem Docker..."
docker compose build --no-cache

# 6. Subir os serviços
print_info "Iniciando serviços..."
docker compose up -d

# 7. Verificar status dos containers
print_info "Verificando status dos containers..."
sleep 5
docker compose ps

# 8. Mostrar logs
print_info "Últimas linhas dos logs:"
docker compose logs --tail=50

echo ""
print_info "================================="
print_info "  Deploy concluído com sucesso!"
print_info "================================="
echo ""
print_info "Comandos úteis:"
echo "  Ver logs:        docker compose logs -f"
echo "  Parar serviços:  docker compose down"
echo "  Reiniciar:       docker compose restart"
echo ""
print_warning "Não esqueça de configurar o NGINX global da VPS!"
echo "Arquivo de configuração disponível em: nginx/vps-site.conf"
echo ""
print_info "Copie para o NGINX global:"
echo "  sudo cp nginx/vps-site.conf /etc/nginx/sites-available/clicksaudeagendamento-backend"
echo "  sudo ln -sf /etc/nginx/sites-available/clicksaudeagendamento-backend /etc/nginx/sites-enabled/"
echo "  sudo nginx -t"
echo "  sudo systemctl reload nginx"
echo ""
