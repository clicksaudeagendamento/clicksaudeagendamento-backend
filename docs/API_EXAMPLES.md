# API Examples - Sistema de Agendamento com Múltiplos Endereços

## Variáveis de Ambiente
```bash
BASE_URL="http://localhost:4000"
TOKEN="seu_token_jwt_aqui"
USER_ID="id_do_usuario"
PROFESSIONAL_ID="id_do_profissional"
ADDRESS_ID="id_do_endereco"
SCHEDULE_ID="id_da_agenda"
```

---

## 1. Autenticação

### 1.1 Registrar Usuário
```bash
curl -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. João Silva",
    "email": "joao.silva@example.com",
    "password": "senha123",
    "phone": "11999999999",
    "role": "professional"
  }'
```

### 1.2 Login
```bash
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao.silva@example.com",
    "password": "senha123"
  }'
```

Resposta:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Dr. João Silva",
    "email": "joao.silva@example.com",
    "role": "professional"
  }
}
```

---

## 2. Gestão de Endereços do Profissional

### 2.1 Criar Endereço (Profissional)
```bash
curl -X POST "${BASE_URL}/addresses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Clínica Centro",
    "street": "Rua das Flores",
    "number": "123",
    "complement": "Sala 45",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-100"
  }'
```

### 2.2 Criar Segundo Endereço
```bash
curl -X POST "${BASE_URL}/addresses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Consultório Jardins",
    "street": "Avenida Paulista",
    "number": "1000",
    "complement": "Conjunto 301",
    "neighborhood": "Jardins",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-200"
  }'
```

### 2.3 Listar Endereços do Profissional (Autenticado)
```bash
curl -X GET "${BASE_URL}/addresses" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 2.4 Obter Endereços Públicos de um Profissional
```bash
curl -X GET "${BASE_URL}/addresses/user/${PROFESSIONAL_ID}"
```

### 2.5 Obter Endereços de um Profissional (via endpoint de schedules)
```bash
curl -X GET "${BASE_URL}/schedules/public/addresses/${PROFESSIONAL_ID}"
```

### 2.6 Atualizar Endereço
```bash
curl -X PUT "${BASE_URL}/addresses/${ADDRESS_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Clínica Centro - Atualizado",
    "street": "Rua das Flores",
    "number": "123",
    "complement": "Sala 50",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-100"
  }'
```

### 2.7 Deletar Endereço
```bash
curl -X DELETE "${BASE_URL}/addresses/${ADDRESS_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 3. Gestão de Agenda com Endereços

### 3.1 Criar Agenda para Endereço Específico
```bash
curl -X POST "${BASE_URL}/schedules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "date": "2025-11-15",
    "address": "507f1f77bcf86cd799439011",
    "timeSlots": [
      "08:00",
      "08:30",
      "09:00",
      "09:30",
      "10:00",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00"
    ]
  }'
```

### 3.2 Criar Agenda para Outro Endereço (mesmo dia)
```bash
curl -X POST "${BASE_URL}/schedules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "date": "2025-11-15",
    "address": "507f1f77bcf86cd799439012",
    "timeSlots": [
      "16:00",
      "16:30",
      "17:00",
      "17:30",
      "18:00"
    ]
  }'
```

### 3.3 Listar Minhas Agendas (Profissional)
```bash
curl -X GET "${BASE_URL}/schedules" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 3.4 Listar Agendas por Mês
```bash
curl -X GET "${BASE_URL}/schedules?month=11" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 3.5 Listar Agendas por Data
```bash
curl -X GET "${BASE_URL}/schedules?date=15-11-2025" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 3.6 Deletar Agenda Específica
```bash
curl -X DELETE "${BASE_URL}/schedules/${SCHEDULE_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 3.7 Deletar Todas Agendas de uma Data
```bash
curl -X DELETE "${BASE_URL}/schedules?date=15-11-2025" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 4. Visualização Pública de Agendas (Cliente)

### 4.1 Listar Endereços do Profissional (PASSO 1)
```bash
# O cliente acessa a página pública e primeiro vê os endereços disponíveis
curl -X GET "${BASE_URL}/schedules/public/addresses/${PROFESSIONAL_ID}"
```

Resposta:
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Clínica Centro",
    "street": "Rua das Flores",
    "number": "123",
    "complement": "Sala 45",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-100"
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Consultório Jardins",
    "street": "Avenida Paulista",
    "number": "1000",
    "complement": "Conjunto 301",
    "neighborhood": "Jardins",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-200"
  }
]
```

### 4.2 Ver Agendas Disponíveis SEM Filtro de Endereço (SE TIVER APENAS 1 ENDEREÇO)
```bash
# Se o profissional tem apenas 1 endereço, pode buscar direto
curl -X GET "${BASE_URL}/schedules/public?userId=${PROFESSIONAL_ID}&month=11"
```

### 4.3 Ver Agendas Disponíveis COM Filtro de Endereço (PASSO 2 - SE TIVER MÚLTIPLOS)
```bash
# Cliente seleciona um endereço e então vê os horários disponíveis
curl -X GET "${BASE_URL}/schedules/public?userId=${PROFESSIONAL_ID}&month=11&addressId=507f1f77bcf86cd799439011"
```

Resposta:
```json
[
  {
    "_id": "507f191e810c19729de860ea",
    "date": "2025-11-15",
    "time": "08:00",
    "status": "open",
    "dateTime": "2025-11-15T08:00:00.000Z",
    "address": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Clínica Centro",
      "street": "Rua das Flores",
      "number": "123",
      "complement": "Sala 45",
      "neighborhood": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01310-100"
    }
  },
  {
    "_id": "507f191e810c19729de860eb",
    "date": "2025-11-15",
    "time": "08:30",
    "status": "open",
    "dateTime": "2025-11-15T08:30:00.000Z",
    "address": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Clínica Centro",
      "street": "Rua das Flores",
      "number": "123",
      "complement": "Sala 45",
      "neighborhood": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01310-100"
    }
  }
]
```

### 4.4 Ver Agendas de Outro Endereço
```bash
curl -X GET "${BASE_URL}/schedules/public?userId=${PROFESSIONAL_ID}&month=11&addressId=507f1f77bcf86cd799439012"
```

---

## 5. Agendamento (Cliente)

### 5.1 Criar Agendamento
```bash
curl -X POST "${BASE_URL}/appointments" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduleId": "507f191e810c19729de860ea",
    "patientName": "Maria Santos",
    "patientPhone": "11988888888",
    "patientEmail": "maria.santos@example.com",
    "notes": "Primeira consulta"
  }'
```

### 5.2 Listar Agendamentos do Profissional
```bash
curl -X GET "${BASE_URL}/appointments" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 5.3 Filtrar Agendamentos por Status
```bash
curl -X GET "${BASE_URL}/appointments?status=pending" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 5.4 Filtrar Agendamentos por Data
```bash
curl -X GET "${BASE_URL}/appointments?date=2025-11-15" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 5.5 Atualizar Status do Agendamento
```bash
curl -X PATCH "${BASE_URL}/appointments/${APPOINTMENT_ID}/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "status": "confirmed"
  }'
```

Possíveis status: `pending`, `confirmed`, `cancelled`, `completed`

### 5.6 Cancelar Agendamento
```bash
curl -X PATCH "${BASE_URL}/appointments/${APPOINTMENT_ID}/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "status": "cancelled"
  }'
```

### 5.7 Deletar Agendamento
```bash
curl -X DELETE "${BASE_URL}/appointments/${APPOINTMENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 6. Fluxo Completo de Uso

### FLUXO DO PROFISSIONAL:

```bash
# 1. Login
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "joao.silva@example.com", "password": "senha123"}'

# 2. Cadastrar primeiro endereço
curl -X POST "${BASE_URL}/addresses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Clínica Centro",
    "street": "Rua das Flores",
    "number": "123",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-100"
  }'

# 3. Cadastrar segundo endereço
curl -X POST "${BASE_URL}/addresses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Consultório Jardins",
    "street": "Avenida Paulista",
    "number": "1000",
    "neighborhood": "Jardins",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-200"
  }'

# 4. Criar agenda para Clínica Centro
curl -X POST "${BASE_URL}/schedules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "date": "2025-11-15",
    "address": "ADDRESS_ID_1",
    "timeSlots": ["08:00", "08:30", "09:00", "09:30", "10:00"]
  }'

# 5. Criar agenda para Consultório Jardins
curl -X POST "${BASE_URL}/schedules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "date": "2025-11-15",
    "address": "ADDRESS_ID_2",
    "timeSlots": ["14:00", "14:30", "15:00", "15:30", "16:00"]
  }'
```

### FLUXO DO CLIENTE:

```bash
# 1. Ver endereços disponíveis do profissional
curl -X GET "${BASE_URL}/schedules/public/addresses/${PROFESSIONAL_ID}"

# 2. Selecionar endereço e ver horários disponíveis
curl -X GET "${BASE_URL}/schedules/public?userId=${PROFESSIONAL_ID}&month=11&addressId=${ADDRESS_ID}"

# 3. Fazer agendamento em horário específico
curl -X POST "${BASE_URL}/appointments" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduleId": "SCHEDULE_ID",
    "patientName": "Maria Santos",
    "patientPhone": "11988888888",
    "patientEmail": "maria.santos@example.com"
  }'
```

---

## 7. Administração e Filas

### 7.1 Processar Lembretes do Próximo Dia
```bash
curl -X POST "${BASE_URL}/appointment-queue/process-next-day" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 7.2 Processar Lembretes de Data Específica
```bash
curl -X POST "${BASE_URL}/appointment-queue/process-date" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "date": "2025-11-15"
  }'
```

### 7.3 Ver Estatísticas da Fila
```bash
curl -X GET "${BASE_URL}/appointment-queue/stats" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 7.4 Ver Estatísticas de Respostas
```bash
curl -X GET "${BASE_URL}/appointment-queue/response-stats" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 7.5 Enviar Mensagem de Teste
```bash
curl -X POST "${BASE_URL}/appointment-queue/test-message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "phone": "11999999999",
    "message": "Teste de mensagem WhatsApp"
  }'
```

---

## 8. WhatsApp

### 8.1 Obter QR Code
```bash
curl -X GET "${BASE_URL}/whatsapp/qr" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 8.2 Verificar Status da Conexão
```bash
curl -X GET "${BASE_URL}/whatsapp/status" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 8.3 Desconectar WhatsApp
```bash
curl -X POST "${BASE_URL}/whatsapp/disconnect" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 9. Dashboards de Monitoramento

### 9.1 Bull Board (Filas)
```
Acessar no navegador: http://localhost:4000/admin/queues
Usuário: admin
Senha: admin (ou valor definido em BULL_BOARD_PASSWORD)
```

### 9.2 Swagger Stats
```
Acessar no navegador: http://localhost:4000/swagger-stats
Usuário: admin
Senha: admin
```

---

## Observações Importantes

1. **Múltiplos Endereços**: O profissional pode cadastrar vários endereços e criar agendas específicas para cada um.

2. **Filtro Obrigatório**: Na página pública, se o profissional tem mais de um endereço, o cliente deve primeiro selecionar o endereço para então ver os horários disponíveis.

3. **Validação de Endereço**: Ao criar uma agenda, o sistema valida se o endereço pertence ao profissional autenticado.

4. **Timezone**: Todas as datas/horas são processadas com timezone -03:00 (Brasília).

5. **Status de Agenda**: 
   - `open`: Horário disponível para agendamento
   - `closed`: Horário já agendado

6. **Status de Agendamento**:
   - `pending`: Aguardando confirmação
   - `confirmed`: Confirmado
   - `cancelled`: Cancelado
   - `completed`: Realizado

7. **Autenticação**: Todos os endpoints protegidos requerem o header `Authorization: Bearer ${TOKEN}`

8. **IDs**: Todos os IDs de exemplo (507f...) devem ser substituídos pelos IDs reais retornados pela API.
