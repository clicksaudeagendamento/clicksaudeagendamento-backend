#!/bin/bash

# Script de Deploy para VPS - clicksaudeagendamento-backend
# Este script configura e faz deploy da aplicação na VPS

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

# 3. Criar diretórios necessários
print_info "Criando diretórios necessários..."
mkdir -p nginx/certbot/conf
mkdir -p nginx/certbot/www

# 4. Verificar qual arquivo nginx usar
if [ ! -d "nginx/certbot/conf/live/api.clicksaudeagendamento.com.br" ]; then
    print_warning "Certificados SSL não encontrados!"
    print_info "Usando configuração inicial do nginx (HTTP apenas)"

    # Backup do nginx.conf se existir
    if [ -f "nginx/nginx.conf" ]; then
        cp nginx/nginx.conf nginx/nginx.conf.backup
    fi

    # Copiar arquivo inicial
    cp nginx/nginx-initial.conf nginx/nginx.conf

    print_warning "ATENÇÃO: Após o deploy, execute os seguintes comandos para obter SSL:"
    echo ""
    echo "  docker compose -f docker-compose.yml exec certbot certbot certonly \\"
    echo "    --webroot --webroot-path=/var/www/certbot \\"
    echo "    --email SEU_EMAIL@example.com \\"
    echo "    --agree-tos --no-eff-email \\"
    echo "    -d api.clicksaudeagendamento.com.br"
    echo ""
    echo "  # Depois restaure o nginx.conf:"
    echo "  cp nginx/nginx.conf.backup nginx/nginx.conf"
    echo "  docker compose -f docker-compose.yml restart nginx"
    echo ""
else
    print_info "Certificados SSL encontrados! Usando configuração completa."
fi

# 5. Parar containers antigos se existirem
print_info "Parando containers antigos..."
docker compose -f docker-compose.yml down || true

# 6. Limpar recursos não utilizados
print_info "Limpando recursos Docker não utilizados..."
docker system prune -f

# 7. Build da imagem
print_info "Construindo imagem Docker..."
docker compose -f docker-compose.yml build --no-cache

# 8. Subir os serviços
print_info "Iniciando serviços..."
docker compose -f docker-compose.yml up -d

# 9. Verificar status dos containers
print_info "Verificando status dos containers..."
sleep 5
docker compose -f docker-compose.yml ps

# 10. Mostrar logs
print_info "Últimas linhas dos logs:"
docker compose -f docker-compose.yml logs --tail=50

echo ""
print_info "================================="
print_info "  Deploy concluído com sucesso!"
print_info "================================="
echo ""
print_info "Comandos úteis:"
echo "  Ver logs:           docker compose -f docker-compose.yml logs -f"
echo "  Ver logs do app:    docker compose -f docker-compose.yml logs -f app"
echo "  Ver logs do nginx:  docker compose -f docker-compose.yml logs -f nginx"
echo "  Parar serviços:     docker compose -f docker-compose.yml down"
echo "  Reiniciar:          docker compose -f docker-compose.yml restart"
echo ""

# Se não tiver SSL, mostrar instruções novamente
if [ ! -d "nginx/certbot/conf/live/api.clicksaudeagendamento.com.br" ]; then
    print_warning "Não esqueça de configurar o SSL!"
    echo "Execute o comando certbot conforme mostrado acima."
fi
