#!/bin/bash

# BCH MCP Server - Digital Ocean Deployment Script
# This script sets up and runs the MCP server with optional SSL/DNS configuration

set -e

# ============================================
# CONFIGURATION - EDIT THESE VALUES
# ============================================
DOMAIN=""                           # Your domain (e.g., mcp.yourdomain.com)
EMAIL=""                            # Email for Let's Encrypt certificates
APP_PORT=8081                       # Internal port for the app
PUBLIC_PORT=80                      # Public HTTP port
PUBLIC_SSL_PORT=443                 # Public HTTPS port
APP_NAME="bch-mcp-server"           # Docker container name
DEBUG="false"                       # Enable debug mode

# ============================================
# COLORS FOR OUTPUT
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# DEPENDENCY CHECKS
# ============================================
check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Installing..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        log_success "Docker installed successfully"
    else
        log_success "Docker is installed"
    fi

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Installing..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        log_success "Docker Compose installed successfully"
    else
        log_success "Docker Compose is installed"
    fi
}

# ============================================
# FIREWALL CONFIGURATION
# ============================================
setup_firewall() {
    log_info "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        sudo ufw allow ssh
        sudo ufw allow http
        sudo ufw allow https
        sudo ufw allow $APP_PORT/tcp
        sudo ufw --force enable
        log_success "Firewall configured"
    else
        log_warning "UFW not found, skipping firewall configuration"
    fi
}

# ============================================
# CREATE DOCKER COMPOSE FILE
# ============================================
create_docker_compose() {
    log_info "Creating Docker Compose configuration..."
    
    cat > docker-compose.yml << 'COMPOSE_EOF'
version: '3.8'

services:
  bch-mcp:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: bch-mcp-server
    restart: unless-stopped
    ports:
      - "${APP_PORT:-8081}:8081"
    environment:
      - PORT=8081
      - DEBUG=${DEBUG:-false}
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Nginx reverse proxy (only if DOMAIN is set)
  nginx:
    image: nginx:alpine
    container_name: nginx-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - bch-mcp
    profiles:
      - with-nginx

  # Certbot for SSL (only if DOMAIN is set)
  certbot:
    image: certbot/certbot
    container_name: certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    profiles:
      - with-nginx
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
COMPOSE_EOF

    log_success "Docker Compose file created"
}

# ============================================
# CREATE NGINX CONFIGURATION
# ============================================
create_nginx_config() {
    if [ -z "$DOMAIN" ]; then
        log_warning "No domain configured, skipping Nginx setup"
        return
    fi
    
    log_info "Creating Nginx configuration for $DOMAIN..."
    
    mkdir -p certbot/conf certbot/www
    
    cat > nginx.conf << NGINX_EOF
events {
    worker_connections 1024;
}

http {
    # Logging
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Upstreams
    upstream mcp_backend {
        server bch-mcp:8081;
        keepalive 32;
    }

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;

    # HTTP server (redirect to HTTPS)
    server {
        listen 80;
        listen [::]:80;
        server_name $DOMAIN;

        # ACME challenge for Let's Encrypt
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # Redirect all other traffic to HTTPS
        location / {
            return 301 https://\$server_name\$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name $DOMAIN;

        # SSL configuration
        ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
        
        # SSL security settings
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        
        # HSTS
        add_header Strict-Transport-Security "max-age=63072000" always;

        # Proxy settings
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";

        # Health check endpoint
        location /health {
            proxy_pass http://mcp_backend;
        }

        # MCP endpoint
        location /mcp {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://mcp_backend;
            
            # Allow larger request bodies for MCP
            client_max_body_size 10M;
            
            # Timeout settings
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Well-known endpoints
        location /.well-known/ {
            proxy_pass http://mcp_backend;
        }

        # Root endpoint
        location / {
            proxy_pass http://mcp_backend;
        }
    }
}
NGINX_EOF

    log_success "Nginx configuration created"
}

# ============================================
# SSL CERTIFICATE SETUP
# ============================================
setup_ssl() {
    if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
        log_warning "Domain or email not configured, skipping SSL setup"
        return
    fi
    
    log_info "Setting up SSL certificate for $DOMAIN..."
    
    # Create directories with proper permissions
    mkdir -p certbot/conf certbot/www/.well-known/acme-challenge
    chmod -R 755 certbot/www
    
    # Create temporary nginx config for initial certificate
    cat > nginx-temp.conf << NGINX_TEMP_EOF
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        listen [::]:80;
        server_name $DOMAIN;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
            try_files \$uri =404;
        }

        location / {
            return 200 'Waiting for SSL certificate...';
            add_header Content-Type text/plain;
        }
    }
}
NGINX_TEMP_EOF

    # Stop any existing nginx-temp container
    docker stop nginx-temp 2>/dev/null || true
    docker rm nginx-temp 2>/dev/null || true

    # Start temporary nginx - NOTE: certbot/www is NOT read-only so certbot can write
    docker run -d --name nginx-temp \
        -p 80:80 \
        -v $(pwd)/nginx-temp.conf:/etc/nginx/nginx.conf:ro \
        -v $(pwd)/certbot/www:/var/www/certbot \
        nginx:alpine
    
    # Wait for nginx to start
    log_info "Waiting for nginx to start..."
    sleep 5
    
    # Verify nginx is serving correctly
    log_info "Testing ACME challenge path..."
    echo "test" > certbot/www/.well-known/acme-challenge/test.txt
    if curl -sf "http://localhost/.well-known/acme-challenge/test.txt" > /dev/null 2>&1; then
        log_success "ACME challenge path is accessible"
        rm certbot/www/.well-known/acme-challenge/test.txt
    else
        log_warning "Could not verify ACME challenge path locally, proceeding anyway..."
    fi
    
    # Get certificate
    log_info "Requesting certificate from Let's Encrypt..."
    docker run --rm \
        -v $(pwd)/certbot/conf:/etc/letsencrypt \
        -v $(pwd)/certbot/www:/var/www/certbot \
        certbot/certbot certonly --webroot \
        -w /var/www/certbot \
        -d $DOMAIN \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --non-interactive
    
    # Check if certificate was obtained
    if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
        log_success "SSL certificate obtained successfully!"
    else
        log_error "Failed to obtain SSL certificate"
        log_info "Check that your domain $DOMAIN points to this server's IP address"
        docker logs nginx-temp
        docker stop nginx-temp && docker rm nginx-temp
        rm nginx-temp.conf
        exit 1
    fi
    
    # Stop temporary nginx
    docker stop nginx-temp && docker rm nginx-temp
    rm nginx-temp.conf
    
    log_success "SSL certificate setup complete"
}

# ============================================
# BUILD AND START
# ============================================
build_and_start() {
    log_info "Building and starting the application..."
    
    if [ -n "$DOMAIN" ]; then
        # With nginx proxy
        docker-compose --profile with-nginx build
        docker-compose --profile with-nginx up -d
    else
        # Direct mode (no nginx)
        docker-compose build
        docker-compose up -d
    fi
    
    log_success "Application started"
}

# ============================================
# HEALTH CHECK
# ============================================
check_health() {
    log_info "Checking application health..."
    
    sleep 5
    
    local health_url="http://localhost:$APP_PORT/health"
    if [ -n "$DOMAIN" ]; then
        health_url="http://localhost/health"
    fi
    
    if curl -sf "$health_url" > /dev/null; then
        log_success "Application is healthy!"
    else
        log_error "Application health check failed"
        log_info "Checking logs..."
        docker-compose logs --tail=50 bch-mcp
        exit 1
    fi
}

# ============================================
# PRINT INFO
# ============================================
print_info() {
    echo ""
    echo "================================================"
    echo -e "${GREEN}BCH MCP Server Deployment Complete!${NC}"
    echo "================================================"
    echo ""
    
    if [ -n "$DOMAIN" ]; then
        echo "Your server is now available at:"
        echo -e "  ${BLUE}https://$DOMAIN${NC}"
        echo ""
        echo "Endpoints:"
        echo -e "  MCP:    ${BLUE}https://$DOMAIN/mcp${NC}"
        echo -e "  Health: ${BLUE}https://$DOMAIN/health${NC}"
        echo -e "  Card:   ${BLUE}https://$DOMAIN/.well-known/mcp.json${NC}"
    else
        echo "Your server is now available at:"
        echo -e "  ${BLUE}http://YOUR_DROPLET_IP:$APP_PORT${NC}"
        echo ""
        echo "Endpoints:"
        echo -e "  MCP:    ${BLUE}http://YOUR_DROPLET_IP:$APP_PORT/mcp${NC}"
        echo -e "  Health: ${BLUE}http://YOUR_DROPLET_IP:$APP_PORT/health${NC}"
        echo -e "  Card:   ${BLUE}http://YOUR_DROPLET_IP:$APP_PORT/.well-known/mcp.json${NC}"
    fi
    
    echo ""
    echo "Useful commands:"
    echo "  View logs:     docker-compose logs -f bch-mcp"
    echo "  Restart:       docker-compose restart"
    echo "  Stop:          docker-compose down"
    echo "  Rebuild:       docker-compose up -d --build"
    echo ""
    echo "================================================"
}

# ============================================
# MAIN MENU
# ============================================
show_menu() {
    echo ""
    echo "================================================"
    echo "   BCH MCP Server - Deployment Options"
    echo "================================================"
    echo ""
    echo "1) Deploy without SSL (HTTP only)"
    echo "2) Deploy with SSL and custom domain"
    echo "3) Stop the server"
    echo "4) View logs"
    echo "5) Rebuild and restart"
    echo "6) Exit"
    echo ""
    read -p "Enter your choice [1-6]: " choice
    
    case $choice in
        1)
            DOMAIN=""
            deploy_simple
            ;;
        2)
            read -p "Enter your domain (e.g., mcp.yourdomain.com): " DOMAIN
            read -p "Enter your email for SSL certificate: " EMAIL
            deploy_with_ssl
            ;;
        3)
            docker-compose down
            log_success "Server stopped"
            ;;
        4)
            docker-compose logs -f bch-mcp
            ;;
        5)
            docker-compose up -d --build
            log_success "Server rebuilt and restarted"
            ;;
        6)
            exit 0
            ;;
        *)
            log_error "Invalid option"
            show_menu
            ;;
    esac
}

deploy_simple() {
    check_dependencies
    setup_firewall
    create_docker_compose
    build_and_start
    check_health
    print_info
}

deploy_with_ssl() {
    check_dependencies
    setup_firewall
    create_docker_compose
    create_nginx_config
    setup_ssl
    build_and_start
    check_health
    print_info
}

# ============================================
# SCRIPT ENTRY POINT
# ============================================
main() {
    echo ""
    echo "================================================"
    echo "   BCH MCP Server - Production Deployment"
    echo "================================================"
    echo ""
    
    # Check if running as root or with sudo
    if [ "$EUID" -ne 0 ]; then
        log_warning "This script may require sudo for some operations"
    fi
    
    # Check for command line arguments
    if [ "$1" == "--simple" ]; then
        deploy_simple
    elif [ "$1" == "--ssl" ]; then
        if [ -z "$2" ] || [ -z "$3" ]; then
            log_error "Usage: ./run.sh --ssl <domain> <email>"
            exit 1
        fi
        DOMAIN=$2
        EMAIL=$3
        deploy_with_ssl
    else
        show_menu
    fi
}

main "$@"
