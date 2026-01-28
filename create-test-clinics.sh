#!/bin/bash

# Script para criar clínicas de teste no ClinicOS
# Substitua "Teste123!" pela senha do seu usuário teste@clinicos.com

echo "🏥 Criando clínicas de teste..."
echo ""

# 1. Login
echo "1️⃣ Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@clinicos.com",
    "password": "Teste123!"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Erro ao fazer login. Verifique email/senha."
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login realizado com sucesso!"
echo ""

# 2. Criar Clínica 1
echo "2️⃣ Criando Clínica Saúde Total..."
CLINIC1=$(curl -s -X POST http://localhost:3000/clinics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Clínica Saúde Total",
    "slug": "saude-total",
    "cnpj": "12.345.678/0001-90",
    "phone": "(11) 98765-4321",
    "email": "contato@saudetotal.com.br",
    "address": "Rua das Flores, 123",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234-567"
  }')

echo "✅ Clínica 1 criada!"
echo "$CLINIC1"
echo ""

# 3. Criar Clínica 2
echo "3️⃣ Criando Clínica Bem Estar..."
CLINIC2=$(curl -s -X POST http://localhost:3000/clinics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Clínica Bem Estar",
    "slug": "bem-estar",
    "cnpj": "98.765.432/0001-10",
    "phone": "(11) 91234-5678",
    "email": "contato@bemestar.com.br",
    "address": "Av. Paulista, 1000",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-100"
  }')

echo "✅ Clínica 2 criada!"
echo "$CLINIC2"
echo ""

echo "🎉 Clínicas criadas com sucesso!"
echo ""
echo "📝 Próximos passos:"
echo "1. Faça logout no frontend (se estiver logado)"
echo "2. Faça login novamente com teste@clinicos.com"
echo "3. Você verá o seletor de clínicas!"
